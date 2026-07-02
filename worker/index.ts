import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";
import { google } from "googleapis";
import { createWorker } from "../src/lib/queue";

const LLM_BASE_URL = process.env.LLM_BASE_URL || "http://localhost:11434/v1";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "not-needed";
const LLM_MODEL = process.env.LLM_MODEL || "deepseek-chat";

const prisma = new PrismaClient();
const openai = new OpenAI({ baseURL: LLM_BASE_URL, apiKey: OPENAI_API_KEY });

function gmailAuth() {
  const client_id = process.env.GMAIL_CLIENT_ID;
  const client_secret = process.env.GMAIL_CLIENT_SECRET;
  const refresh_token = process.env.GMAIL_REFRESH_TOKEN;
  if (!client_id || !client_secret || !refresh_token) return null;
  const o = new google.auth.OAuth2(client_id, client_secret, "urn:ietf:wg:oauth:2.0:oob");
  o.setCredentials({ refresh_token });
  return google.gmail({ version: "v1", auth: o });
}

const categoryCache = new Map<string, { name: string; id: number | null; cleanMerchant: string; confidence: number }>();

function parseBACEmail(text: string) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  const BAC_HEADERS = new Set(["Comercio", "Monto", "Fecha y hora", "Tipo de compra", "Estado"]);
  const values: string[] = [];
  let found = false;

  for (const line of lines) {
    if (BAC_HEADERS.has(line)) { found = true; continue; }
    if (found) values.push(line);
  }

  function nth(n: number): string | null { return n < values.length ? values[n] : null; }

  // After filtering headers, values are in order: ENSA (PS), USD 151.81, 2026/..., Internet, Aprobada
  const merchant = nth(0);
  const amountRaw = nth(1);
  const dateRaw = nth(2);
  const txType = nth(3);
  const status = nth(4);
  const cardMatch = text.match(/tarjeta\s+(\w+)\s+terminada en\s+(\d+)/);
  const amount = amountRaw ? parseFloat(amountRaw.replace(/[^0-9.]/g, "")) : null;
  const currency = amountRaw?.includes("USD") ? "USD" : amountRaw?.includes("PAB") ? "PAB" : "USD";
  const date = dateRaw ? new Date(dateRaw.replace(/-/g, "T").replace(/\//g, "-").replace("TT", "T")) : null;
  const bank = "BAC";
  const transactionType = cardMatch ? cardMatch[1] : txType;
  return { merchant, amount, currency, date, bank, transactionType, status };
}

async function categorizeMerchant(merchant: string, categories: string[]) {
  const cached = categoryCache.get(merchant);
  if (cached) return cached;

  const prompt = [
    `From this list of categories: [${categories.join(", ")}]`,
    `Clean up and categorize this merchant: "${merchant}"`,
    `- Remove gateway prefixes (PEDIDOSYA*, PAGUELOFA*, etc.)`,
    `- Remove POS/suffix codes like (PS), (WEB), etc.`,
    `- Normalize common merchants: "AMAZON MKTPLACE PMTS" → "Amazon", "BB Q CHICKEN" → "BBQ Chicken", etc.`,
    `- Merge similar names so the same store always has the same clean name`,
    `Respond with JSON: { "clean_merchant": "...", "category": "..." }`,
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
  let confidence = 1.0;

  if (!catName) {
    catName = categories.find(
      (c) => result.category?.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(result.category?.toLowerCase() || "")
    );
    confidence = 0.85;
  }
  if (!catName) {
    catName = "Miscellaneous";
    confidence = 0.5;
  }

  const category = await prisma.category.findUnique({ where: { name: catName } });
  const entry = { name: catName, id: category?.id || null, cleanMerchant, confidence };
  categoryCache.set(merchant, entry);
  return entry;
}

async function processMessage(data: { id: string; snippet: string; gmailId?: string; labelId?: string }) {
  const { id, snippet, gmailId, labelId } = data;
  if (!id || !snippet) return;

  const existing = await prisma.transaction.findUnique({ where: { id } });
  if (existing) return;

  const parsed = parseBACEmail(snippet);
  if (!parsed.merchant || !parsed.amount) {
    console.log(`Could not parse: ${id}`);
    return;
  }

  const categories = (await prisma.category.findMany()).map((c) => c.name);
  const { name: catName, id: catId, cleanMerchant, confidence } = await categorizeMerchant(parsed.merchant, categories);

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
      confidenceScore: confidence,
    },
  });

  // Label in Gmail after successful DB save
  if (gmailId && labelId) {
    const gmail = gmailAuth();
    if (gmail) {
      await gmail.users.messages.modify({
        userId: "me",
        id: gmailId,
        requestBody: { addLabelIds: [labelId] },
      }).catch(() => {});
    }
  }

  console.log(`Processed: ${id} - ${cleanMerchant} $${parsed.amount} [${catName}]`);
}

async function main() {
  console.log("Worker started");
  const worker = createWorker(processMessage);
  worker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed: ${err.message}`);
  });
}

main();
