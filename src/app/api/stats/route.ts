import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const transactions = await prisma.transaction.findMany();

  const totalSpent = transactions.reduce((s, t) => s + t.amount, 0);
  const txCount = transactions.length;
  const avgAmount = txCount > 0 ? totalSpent / txCount : 0;

  const catTotals: Record<string, number> = {};
  transactions.forEach((t) => {
    if (t.categoryName) catTotals[t.categoryName] = (catTotals[t.categoryName] || 0) + t.amount;
  });
  const topCategory = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

  return NextResponse.json({
    totalSpent: Math.round(totalSpent * 100) / 100,
    txCount,
    avgAmount: Math.round(avgAmount * 100) / 100,
    topCategory,
    categoryNames: categories.map((c) => c.name),
  });
}
