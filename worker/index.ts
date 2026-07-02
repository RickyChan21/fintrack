import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";
import { createWorker } from "../src/lib/queue";

const LLM_BASE_URL = process.env.LLM_BASE_URL || "http://localhost:11434/v1";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "not-needed";
const LLM_MODEL = process.env.LLM_MODEL || "deepseek-chat";

const prisma = new PrismaClient();
const openai = new OpenAI({ baseURL: LLM_BASE_URL, apiKey: OPENAI_API_KEY });

const categoryCache = new Map<string, { name: string; id: number | null; cleanMerchant: string }>();

function parseBACEmail(text: string) {
  const lines = text.split("\n").map((l) => l.trim());
  const merchant = extractField(lines, "Comercio");
  const amountRaw = extractField(lines, "Monto");
  const dateRaw = extractField(lines, "Fecha y hora");
  const txType = extractField(lines, "Tipo de compra");
  const status = extractField(lines, "Estado");
  const cardMatch = text.match(/tarjeta\s+(\w+)\s+terminada en\s+(\d+)/);
  const amount = amountRaw ? parseFloat(amountRaw.replace(/[^0-9.]/g, "")) : null;
  const currency = amountRaw?.includes("USD") ? "USD" : amountRaw?.includes("PAB") ? "PAB" : "USD";
  const date = dateRaw ? new Date(dateRaw.replace("-", "T").replace(/(\d{4}\/\d{2}\/\d{2})-(\d{2}:\d{2}:\d{2})/, "$1T$2")) : null;
  const bank = "BAC";
  const transactionType = cardMatch ? cardMatch[1] : txType;
  return { merchant, amount, currency, date, bank, transactionType, status };
}

function extractField(lines: string[], label: string): string | null {
  for (const line of lines) {
    if (line.startsWith(label + ":")) return line.slice(label.length + 1).trim() || null;
    if (line.startsWith(label + "=")) return line.slice(label.length + 1).trim() || null;
  }
  return null;
}

async function categorizeMerchant(merchant: string, categories: string[]) {
  const cached = categoryCache.get(merchant);
  if (cached) return cached;

  const prompt = [
    `From this list of categories: [${categories.join(", ")}]`,
    `Clean up and categorize this merchant: "${merchant}"`,
    `- Remove gateway prefixes (PEDIDOSYA*, PAGUELOFA*, etc.)`,
    `- Remove POS/suffix codes like (PS), (WEB), etc.`,
    `Respond with JSON: { "clean_merchant": "...", "category": "...", "confidence": 0.0-1.0 }`,
  ].join("\n");

  const response = await openai.chat.completions.create({
    model: LLM_MODEL,
    messages: [
      { role: "system", content: "You categorize merchants into budget categories." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");
  const cleanMerchant = result.clean_merchant || merchant;
  let catName = categories.find((c) => c.toLowerCase() === result.category?.toLowerCase());
  if (!catName) {
    catName = categories.find(
      (c) => result.category?.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(result.category?.toLowerCase() || "")
    );
  }
  if (!catName) catName = "Miscellaneous";

  const category = await prisma.category.findUnique({ where: { name: catName } });
  const entry = { name: catName, id: category?.id || null, cleanMerchant };
  categoryCache.set(merchant, entry);
  return entry;
}

async function processMessage(data: { id: string; snippet: string }) {
  const { id, snippet } = data;
  if (!id || !snippet) return;

  const existing = await prisma.transaction.findUnique({ where: { id } });
  if (existing) return;

  const parsed = parseBACEmail(snippet);
  if (!parsed.merchant || !parsed.amount) {
    console.log(`Could not parse: ${id}`);
    return;
  }

  const categories = (await prisma.category.findMany()).map((c) => c.name);
  const { name: catName, id: catId, cleanMerchant } = await categorizeMerchant(parsed.merchant, categories);

  await prisma.transaction.create({
    data: {
      id,
      merchant: cleanMerchant,
      amount: parsed.amount,
      currency: parsed.currency,
      categoryId: catId,
      categoryName: catName,
      bank: parsed.bank,
      transactionType: parsed.transactionType,
      transactionDate: parsed.date,
      confidenceScore: 1.0,
    },
  });

  console.log(`Processed: ${id} - ${parsed.merchant} $${parsed.amount} [${catName}]`);
}

async function main() {
  console.log("Worker started");
  const worker = createWorker(processMessage);
  worker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed: ${err.message}`);
  });
}

main();
