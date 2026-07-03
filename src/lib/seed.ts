import { prisma } from "./db";
import { v4 as uuid } from "uuid";

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
  { name: "Miscellaneous", color: "#6b7280" },
];

const merchants: Record<string, { name: string; amountRange: [number, number]; freq: number }[]> = {
  Groceries: [
    { name: "Trader Joe's", amountRange: [25, 120], freq: 3 },
    { name: "Whole Foods", amountRange: [40, 200], freq: 2 },
    { name: "Costco", amountRange: [80, 300], freq: 1 },
    { name: "Safeway", amountRange: [30, 150], freq: 2 },
    { name: "Aldi", amountRange: [20, 80], freq: 2 },
  ],
  Dining: [
    { name: "Chipotle", amountRange: [12, 25], freq: 4 },
    { name: "Sweetgreen", amountRange: [14, 22], freq: 3 },
    { name: "Local Italian", amountRange: [35, 80], freq: 1 },
    { name: "Starbucks", amountRange: [5, 15], freq: 6 },
    { name: "Sushi Bar", amountRange: [25, 60], freq: 1 },
    { name: "Pizza Place", amountRange: [15, 40], freq: 2 },
  ],
  Transportation: [
    { name: "Shell Gas", amountRange: [35, 70], freq: 3 },
    { name: "Uber", amountRange: [10, 45], freq: 4 },
    { name: "Lyft", amountRange: [12, 40], freq: 2 },
    { name: "Chevron", amountRange: [30, 65], freq: 2 },
    { name: "Parking Garage", amountRange: [8, 25], freq: 3 },
  ],
  Utilities: [
    { name: "PG&E", amountRange: [85, 200], freq: 1 },
    { name: "Verizon", amountRange: [65, 85], freq: 1 },
    { name: "Water Co", amountRange: [30, 55], freq: 1 },
    { name: "Internet Co", amountRange: [50, 80], freq: 1 },
  ],
  Subscriptions: [
    { name: "Netflix", amountRange: [15, 23], freq: 1 },
    { name: "Spotify", amountRange: [10, 17], freq: 1 },
    { name: "iCloud", amountRange: [3, 13], freq: 1 },
    { name: "Amazon Prime", amountRange: [15, 15], freq: 0.25 },
    { name: "YouTube Premium", amountRange: [14, 14], freq: 1 },
    { name: "ChatGPT Plus", amountRange: [20, 20], freq: 1 },
  ],
  Shopping: [
    { name: "Amazon", amountRange: [20, 150], freq: 3 },
    { name: "Target", amountRange: [25, 100], freq: 2 },
    { name: "Walmart", amountRange: [20, 80], freq: 2 },
    { name: "IKEA", amountRange: [50, 400], freq: 0.3 },
    { name: "Nike", amountRange: [60, 200], freq: 0.3 },
  ],
  Health: [
    { name: "CVS Pharmacy", amountRange: [10, 60], freq: 1 },
    { name: "Walgreens", amountRange: [8, 45], freq: 1 },
    { name: "Gym Membership", amountRange: [40, 80], freq: 1 },
    { name: "Doctor Visit", amountRange: [25, 150], freq: 0.2 },
  ],
  Entertainment: [
    { name: "AMC Theaters", amountRange: [12, 30], freq: 1 },
    { name: "Ticketmaster", amountRange: [50, 200], freq: 0.2 },
    { name: "Steam", amountRange: [10, 60], freq: 0.5 },
    { name: "Bowling Alley", amountRange: [20, 50], freq: 0.3 },
  ],
  Travel: [
    { name: "Delta Airlines", amountRange: [200, 600], freq: 0.15 },
    { name: "Marriott", amountRange: [150, 400], freq: 0.1 },
    { name: "Airbnb", amountRange: [100, 500], freq: 0.1 },
    { name: "Hertz", amountRange: [80, 250], freq: 0.08 },
  ],
  Transfers: [
    { name: "Venmo Transfer", amountRange: [20, 200], freq: 2 },
    { name: "Zelle Transfer", amountRange: [50, 500], freq: 1 },
    { name: "ACH Transfer", amountRange: [100, 1000], freq: 0.5 },
  ],
  Miscellaneous: [
    { name: "ATM Withdrawal", amountRange: [40, 200], freq: 2 },
    { name: "Post Office", amountRange: [5, 30], freq: 0.5 },
    { name: "Dry Cleaner", amountRange: [10, 30], freq: 1 },
  ],
};

function rand(min: number, max: number) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateTransactions(
  categoryName: string,
  categoryId: number,
  merchants: { name: string; amountRange: [number, number]; freq: number }[],
  startDate: Date,
  endDate: Date
) {
  const txns: {
    id: string;
    merchant: string;
    amount: number;
    currency: string;
    categoryId: number;
    categoryName: string;
    bank: string;
    transactionType: string;
    transactionDate: Date;
    rawSnippet: string;
  }[] = [];

  const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + endDate.getMonth() - startDate.getMonth();

  for (const m of merchants) {
    const occurrences = Math.max(1, Math.round(m.freq * months));
    for (let i = 0; i < occurrences; i++) {
      const dayOffset = Math.floor(Math.random() * daysDiff);
      const date = new Date(startDate);
      date.setDate(date.getDate() + dayOffset);
      date.setHours(8 + Math.floor(Math.random() * 13), Math.floor(Math.random() * 60));

      const amount = rand(m.amountRange[0], m.amountRange[1]);

      txns.push({
        id: uuid(),
        merchant: m.name,
        amount,
        currency: "USD",
        categoryId,
        categoryName,
        bank: "Chase Checking",
        transactionType: categoryName === "Income" ? "credit" : "debit",
        transactionDate: date,
        rawSnippet: `${m.name} on ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} $${Math.abs(amount).toFixed(2)}`,
      });
    }
  }

  return txns;
}

async function main() {
  if (!prisma) {
    console.error("DATABASE_URL not set");
    return;
  }

  console.log("Clearing existing data...");
  await prisma.transaction.deleteMany();
  await prisma.merchantAlias.deleteMany();
  await prisma.merchant.deleteMany();
  await prisma.category.deleteMany();

  console.log("Seeding categories...");
  const createdCategories: { id: number; name: string }[] = [];
  for (const { name, color } of categories) {
    const cat = await prisma.category.create({ data: { name, color } });
    createdCategories.push(cat);
  }

  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(endDate.getFullYear() - 1);
  startDate.setDate(1);

  console.log(`Seeding transactions from ${startDate.toISOString().slice(0, 10)} to ${endDate.toISOString().slice(0, 10)}...`);

  let totalTxns = 0;
  for (const cat of createdCategories) {
    const catMerchants = merchants[cat.name];
    if (!catMerchants) continue;

    let catAmount = 0;
    if (cat.name === "Income") {
      catAmount = rand(4000, 8000);
    }

    const txns = generateTransactions(cat.name, cat.id, catMerchants, startDate, endDate);

    for (let i = 0; i < txns.length; i += 100) {
      const batch = txns.slice(i, i + 100);
      await prisma.transaction.createMany({ data: batch });
    }
    totalTxns += txns.length;
    console.log(`  ${cat.name}: ${txns.length} transactions`);
  }

  console.log("Seeding income entries...");
  const incomeEntries = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(endDate.getFullYear(), endDate.getMonth() - i, 15);
    incomeEntries.push(
      { amount: 5200 + Math.round(Math.random() * 400), source: "Salary", category: "Salary", incomeDate: d, notes: null },
      { amount: Math.round(Math.random() * 1500), source: "Freelance", category: "Freelance", incomeDate: d, notes: null },
    );
    if (i % 3 === 0) incomeEntries.push({ amount: Math.round(Math.random() * 50 + 5), source: "Interest", category: "Interest", incomeDate: d, notes: null });
  }
  await prisma.income.createMany({ data: incomeEntries });

  console.log(`\nDone! Seeded ${totalTxns} transactions across ${createdCategories.length} categories and ${incomeEntries.length} income entries.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma?.$disconnect();
  process.exit(1);
});
