import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";
import { readFileSync } from "fs";

// Load env from /data/.env if running in container
try {
  const env = readFileSync("/data/.env", "utf-8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^"(.*)"$/, "$1");
  }
} catch {}

// If DATABASE_URL still not set, construct from individual vars (supervised container)
if (!process.env.DATABASE_URL) {
  const user = process.env.POSTGRES_USER || "fintrack";
  const pass = process.env.POSTGRES_PASSWORD || "fintrack";
  const db = process.env.POSTGRES_DB || "fintrack";
  process.env.DATABASE_URL = `postgresql://${user}:${pass}@localhost:5432/${db}`;
}

const prisma = new PrismaClient();
const openai = new OpenAI({
  baseURL: process.env.LLM_BASE_URL || "http://localhost:11434/v1",
  apiKey: process.env.OPENAI_API_KEY || "not-needed",
});
const LLM_MODEL = process.env.LLM_MODEL || "deepseek-chat";

async function main() {
  const txns = await prisma.transaction.findMany({ where: { merchantId: null }, distinct: ["merchant"] });
  const categories = (await prisma.category.findMany()).map((c) => c.name);
  let created = 0;

  for (const row of txns) {
    const existing = await prisma.merchantAlias.findUnique({ where: { rawName: row.merchant } });
    if (existing) continue;

    const prompt = [
      `From this list of categories: [${categories.join(", ")}]`,
      `Categorize this merchant: "${row.merchant}"`,
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
    const cleanName = result.name || row.merchant;
    const catName = categories.find((c) => c.toLowerCase() === result.category?.toLowerCase()) || "Miscellaneous";
    const category = await prisma.category.findUnique({ where: { name: catName } });

    let merchant = await prisma.merchant.findFirst({ where: { name: cleanName } });
    if (!merchant) {
      merchant = await prisma.merchant.create({ data: { name: cleanName, categoryId: category?.id || null } });
    }

    await prisma.merchantAlias.create({ data: { rawName: row.merchant, merchantId: merchant.id } }).catch(() => {});
    await prisma.transaction.updateMany({
      where: { merchant: row.merchant },
      data: { merchantId: merchant.id, merchant: cleanName, categoryId: category?.id || null, categoryName: catName },
    });

    created++;
    console.log(`  ${row.merchant} → ${cleanName} [${catName}]`);
  }

  console.log(`Done. Processed ${created} unique merchants.`);
  await prisma.$disconnect();
}

main();
