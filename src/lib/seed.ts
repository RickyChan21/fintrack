import { prisma } from "./db";

const categories = [
  { name: "Groceries", color: "#10b981" },
  { name: "Dining", color: "#f59e0b" },
  { name: "Transportation", color: "#3b82f6" },
  { name: "Utilities", color: "#6366f1" },
  { name: "Subscriptions", color: "#ec4899" },
  { name: "Shopping", color: "#8b5cf6" },
  { name: "Health", color: "#ef4444" },
  { name: "Entertainment", color: "#f97316" },
  { name: "Travel", color: "#14b8a6" },
  { name: "Transfers", color: "#06b6d4" },
  { name: "Income", color: "#84cc16" },
  { name: "Miscellaneous", color: "#6b7280" },
];

async function main() {
  if (!prisma) { console.error("DATABASE_URL not set"); return; }
  for (const { name, color } of categories) {
    await prisma.category.upsert({
      where: { name },
      update: { color },
      create: { name, color },
    });
  }
  console.log("Seeded categories");
  await prisma.$disconnect();
}

main();
