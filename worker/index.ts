import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";
import { createWorker } from "../src/lib/queue";

const LLM_BASE_URL = process.env.LLM_BASE_URL || "http://localhost:11434/v1";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "not-needed";
const LLM_MODEL = process.env.LLM_MODEL || "llama3";

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

async function processMessage(data: { id: string; snippet: string }) {
  const { id, snippet } = data;

  if (!id || !snippet) {
    console.log(`Invalid message, skipping: ${id}`);
    return;
  }

  const existing = await prisma.transaction.findUnique({ where: { id } });
  if (existing) {
    console.log(`ID ${id} already exists, skipping.`);
    return;
  }

  const categories = (await prisma.category.findMany()).map((c) => c.name);
  const extracted = await extract(snippet, categories);

  let catName = categories.find((c) => c.toLowerCase() === extracted.category.toLowerCase());
  if (!catName) {
    catName = categories.find(
      (c) => extracted.category.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(extracted.category.toLowerCase())
    );
  }
  if (!catName) catName = "Miscellaneous";

  const category = await prisma.category.findUnique({ where: { name: catName } });
  const txDate = extracted.date ? new Date(extracted.date) : null;

  await prisma.transaction.create({
    data: {
      id,
      merchant: extracted.merchant,
      amount: extracted.amount,
      currency: extracted.currency,
      categoryId: category?.id || null,
      categoryName: catName,
      bank: extracted.bank,
      transactionType: extracted.transaction_type,
      transactionDate: txDate,
      confidenceScore: extracted.confidence,
    },
  });

  console.log(`Processed: ${id} - ${extracted.merchant} $${extracted.amount}`);
}

async function main() {
  console.log("Worker started");
  const worker = createWorker(processMessage);
  worker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed: ${err.message}`);
  });
}

main();
