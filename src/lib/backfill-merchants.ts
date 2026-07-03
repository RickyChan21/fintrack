import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

try {
  const env = readFileSync("/data/.env", "utf-8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^"(.*)"$/, "$1");
  }
} catch {}

if (!process.env.DATABASE_URL) {
  const user = process.env.POSTGRES_USER || "fintrack";
  const pass = process.env.POSTGRES_PASSWORD || "fintrack";
  const db = process.env.POSTGRES_DB || "fintrack";
  process.env.DATABASE_URL = `postgresql://${user}:${pass}@localhost:5432/${db}`;
}

const prisma = new PrismaClient();

async function main() {
  const txns = await prisma.transaction.findMany({ where: { merchantId: null }, distinct: ["merchant"] });
  let created = 0;

  for (const row of txns) {
    const existing = await prisma.merchantAlias.findUnique({ where: { rawName: row.merchant } });
    if (existing) continue;

    let merchant = await prisma.merchant.findFirst({ where: { name: row.merchant } });
    if (!merchant) {
      merchant = await prisma.merchant.create({
        data: { name: row.merchant, categoryId: row.categoryId },
      });
    }

    await prisma.merchantAlias.create({ data: { rawName: row.merchant, merchantId: merchant.id } }).catch(() => {});
    await prisma.transaction.updateMany({
      where: { merchant: row.merchant },
      data: { merchantId: merchant.id },
    });

    created++;
    console.log(`  ${row.merchant} → merchant #${merchant.id}`);
  }

  console.log(`Done. Linked ${created} unique merchants.`);
  await prisma.$disconnect();
}

main();
