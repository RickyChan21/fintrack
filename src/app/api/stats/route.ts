import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!prisma) return NextResponse.json({ totalSpent: 0, txCount: 0, avgAmount: 0, topCategory: "N/A", categoryNames: [] });

  const transactions = await prisma.transaction.findMany();

  const totalSpent = transactions.reduce((s, t) => s + t.amount, 0);
  const txCount = transactions.length;
  const avgAmount = txCount > 0 ? totalSpent / txCount : 0;

  const catTotals: Record<string, number> = {};
  const merchTotals: Record<string, number> = {};
  const monthlyTotals: Record<string, { count: number; total: number }> = {};
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  transactions.forEach((t) => {
    if (t.categoryName) catTotals[t.categoryName] = (catTotals[t.categoryName] || 0) + t.amount;
    if (t.merchant) merchTotals[t.merchant] = (merchTotals[t.merchant] || 0) + t.amount;

    if (t.transactionDate) {
      const d = new Date(t.transactionDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyTotals[key]) monthlyTotals[key] = { count: 0, total: 0 };
      monthlyTotals[key].count += 1;
      monthlyTotals[key].total += t.amount;
    }
  });

  const topCategory = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

  const timelineData: Record<string, Record<string, number>> = {};
  transactions.forEach((t) => {
    if (!t.transactionDate) return;
    const d = new Date(t.transactionDate);
    const key = d.toISOString().slice(0, 7);
    if (!timelineData[key]) timelineData[key] = {};
    timelineData[key][t.categoryName || "Uncategorized"] = (timelineData[key][t.categoryName || "Uncategorized"] || 0) + t.amount;
  });

  return NextResponse.json({
    totalSpent: Math.round(totalSpent * 100) / 100,
    txCount,
    avgAmount: Math.round(avgAmount * 100) / 100,
    topCategory,
    categoryNames: categories.map((c) => c.name),
    categoryData: Object.entries(catTotals).map(([name, value]) => ({
      name,
      value: Math.round(value * 100) / 100,
      color: categories.find((c) => c.name === name)?.color || "#6b7280",
    })),
    merchantData: Object.entries(merchTotals)
      .map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100 }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10),
    monthlyData: Object.entries(monthlyTotals)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, val]) => {
        const [y, m] = key.split("-");
        return { month: `${months[parseInt(m) - 1]} ${y}`, count: val.count, total: Math.round(val.total * 100) / 100 };
      }),
    timelineData,
  });
}
