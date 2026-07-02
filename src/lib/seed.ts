import { prisma } from "./db";

const categories = [
  "Groceries", "Dining", "Transportation", "Utilities",
  "Subscriptions", "Shopping", "Health", "Entertainment",
  "Travel", "Transfers", "Income", "Miscellaneous",
];

async function main() {
  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log("Seeded categories");
  await prisma.$disconnect();
}

main();
