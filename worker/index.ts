import Redis from "ioredis";
import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";

const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "16379");
const REDIS_QUEUE = process.env.REDIS_QUEUE || "fintrack_queue";
const PROCESSING_QUEUE = `${REDIS_QUEUE}_processing`;
const DLQ_QUEUE = `${REDIS_QUEUE}_dead_letter`;

const LLM_BASE_URL = process.env.LLM_BASE_URL || "http://localhost:11434/v1";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "not-needed";
const LLM_MODEL = process.env.LLM_MODEL || "llama3";

const r = new Redis(REDIS_PORT, REDIS_HOST, { enableOfflineQueue: false });
const prisma = new PrismaClient();
const openai = new OpenAI({ baseURL: LLM_BASE_URL, apiKey: OPENAI_API_KEY });

interface Extraction {
  category: string;
  amount: number;
  currency: string;
  merchant: string;
  bank: string | null;
  transaction_type: string | null;
  date: string | null;
  confidence: number;
}

async function extract(snippet: string, categories: string[]): Promise<Extraction> {
  const prompt = [
    `Analyze this Spanish bank transaction from Panama and extract details in JSON format.`,
    `Valid Categories: [${categories.join(", ")}]`,
    `Extract:`,
    `- category: (Choose the best match from the list above)`,
    `- amount: (Numeric value)`,
    `- currency: (Usually USD or PAB)`,
    `- merchant: (Summarize the store name)`,
    `- bank: (The bank name)`,
    `- transaction_type: (How it was paid)`,
    `- date: (ISO format YYYY-MM-DD if found)`,
    `- confidence: (Float 0.0 to 1.0)`,
    `Snippet: "${snippet}"`,
    `Respond ONLY with valid JSON.`,
  ].join("\n");

  const response = await openai.chat.completions.create({
    model: LLM_MODEL,
    messages: [
      { role: "system", content: "You are an expert financial assistant specialized in Panamanian commerce and Spanish banking notifications." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content || "{}");
}

async function getEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await openai.embeddings.create({
      model: process.env.EMBEDDING_MODEL || "all-minilm",
      input: text,
    });
    return response.data[0].embedding;
  } catch {
    return null;
  }
}

async function processMessage(messageJson: string) {
  try {
    const data = JSON.parse(messageJson);
    const { id, snippet } = data;
    if (!id || !snippet) {
      console.log(`Invalid message, skipping: ${id}`);
      return true;
    }

    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (existing) {
      console.log(`ID ${id} already exists, skipping.`);
      return true;
    }

    const categories = (await prisma.category.findMany()).map((c) => c.name);
    const extracted = await extract(snippet, categories);

    const catMatch = categories.find((c) => c.toLowerCase() === extracted.category.toLowerCase());
    const category = catMatch ? await prisma.category.findUnique({ where: { name: catMatch } }) : null;

    const txDate = extracted.date ? new Date(extracted.date) : null;
    const emb = await getEmbedding(snippet);

    await prisma.transaction.create({
      data: {
        id,
        merchant: extracted.merchant,
        amount: extracted.amount,
        currency: extracted.currency,
        categoryId: category?.id || null,
        categoryName: extracted.category,
        bank: extracted.bank,
        transactionType: extracted.transaction_type,
        transactionDate: txDate,
        confidenceScore: extracted.confidence,
      },
    });

    console.log(`Processed: ${id} - ${extracted.merchant} $${extracted.amount}`);
    return true;
  } catch (err) {
    console.error("Error processing message:", err);
    return false;
  }
}

async function main() {
  console.log("Worker started");

  while (true) {
    try {
      const messageJson = await r.brpoplpush(REDIS_QUEUE, PROCESSING_QUEUE, 30);
      if (!messageJson) continue;

      const success = await processMessage(messageJson);
      if (success) {
        await r.lrem(PROCESSING_QUEUE, 0, messageJson);
      } else {
        console.error("Moving to DLQ");
        await r.rpush(DLQ_QUEUE, messageJson);
        await r.lrem(PROCESSING_QUEUE, 0, messageJson);
      }
    } catch (err) {
      console.error("Worker loop error:", err);
    }
  }
}

main();
