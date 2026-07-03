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

function parseEmail(text: string) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const HEADERS = new Set(["Comercio", "Monto", "Fecha y hora", "Tipo de compra", "Estado"]);
  const vals: string[] = [];
  let found = false;
  for (const line of lines) {
    if (HEADERS.has(line)) { found = true; continue; }
    if (found) vals.push(line);
  }
  const merchant = vals[0];
  const amountRaw = vals[1];
  const dateRaw = vals[2];
  const txType = vals[3];
  const status = vals[4];
  const cardMatch = text.match(/tarjeta\s+(\w+)\s+terminada en\s+(\d+)/);
  const amount = amountRaw ? parseFloat(amountRaw.replace(/[^0-9.]/g, "")) : null;
  const currency = amountRaw?.includes("USD") ? "USD" : amountRaw?.includes("PAB") ? "PAB" : "USD";
  const date = dateRaw ? new Date(dateRaw.replace(/-/g, "T").replace(/\//g, "-").replace("TT", "T")) : null;
  const bank = null;
  const transactionType = cardMatch ? cardMatch[1] : txType;
  return { merchant, amount, currency, date, bank, transactionType, status };
}

async function resolveMerchant(rawName: string, categories: string[]) {
  if (!rawName) return null;

  // Look up existing alias
  const existing = await prisma.merchantAlias.findUnique({
    where: { rawName },
    include: { merchant: { include: { category: true } } },
  });
  if (existing) return existing.merchant;

  // First encounter — call LLM
  const prompt = [
    `From this list of categories: [${categories.join(", ")}]`,
    `Categorize this merchant: "${rawName}"`,
    `Respond with JSON: { "name": "...", "category": "..." }`,
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
  const cleanName = result.name || rawName;
  let catName = categories.find((c) => c.toLowerCase() === result.category?.toLowerCase());
  if (!catName) {
    catName = categories.find(
      (c) => result.category?.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(result.category?.toLowerCase() || "")
    );
  }

  // Find or create merchant
  let merchant = await prisma.merchant.findFirst({ where: { name: cleanName } });
  if (!merchant) {
    const category = catName ? await prisma.category.findUnique({ where: { name: catName } }) : null;
    merchant = await prisma.merchant.create({
      data: { name: cleanName, categoryId: category?.id || null },
    });
  }

  // Create alias
  await prisma.merchantAlias.create({ data: { rawName, merchantId: merchant.id } }).catch(() => {});

  return merchant;
}

async function processMessage(data: { id: string; snippet: string; gmailId?: string; labelId?: string }) {
  const { id, snippet, gmailId, labelId } = data;
  if (!id || !snippet) return;

  const existing = await prisma.transaction.findUnique({ where: { id } });
  if (existing) return;

  const parsed = parseEmail(snippet);
  if (!parsed.merchant || !parsed.amount) {
    console.log(`Could not parse: ${id}`);
    return;
  }

  const categories = (await prisma.category.findMany()).map((c) => c.name);
  const merchant = await resolveMerchant(parsed.merchant, categories);

  let confidence = 1.0;
  let catName: string | null = merchant?.category?.name || null;
  if (!catName) {
    catName = "Miscellaneous";
    confidence = 0.5;
  }

  await prisma.transaction.create({
    data: {
      id,
      merchant: merchant?.name || parsed.merchant,
      merchantId: merchant?.id || null,
      amount: parsed.amount,
      currency: parsed.currency,
      categoryId: merchant?.categoryId || null,
      categoryName: catName,
      bank: parsed.bank,
      transactionType: parsed.transactionType,
      transactionDate: parsed.date,
      confidenceScore: confidence,
    },
  });

  if (gmailId && labelId) {
    const gmail = gmailAuth();
    if (gmail) {
      await gmail.users.messages.modify({ userId: "me", id: gmailId, requestBody: { addLabelIds: [labelId] } }).catch(() => {});
    }
  }

  console.log(`Processed: ${id} - ${merchant?.name || parsed.merchant} $${parsed.amount} [${catName}]`);
}

async function main() {
  console.log("Worker started");
  const worker = createWorker(processMessage);
  worker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed: ${err.message}`);
  });
}

main();
