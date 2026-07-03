import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!prisma) return NextResponse.json({ totalSpent: 0, txCount: 0, avgAmount: 0, topCategory: "N/A", categoryNames: [] });

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.toLowerCase();
  const category = searchParams.get("category");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const resolution = searchParams.get("resolution") || "monthly";

  const where: any = {};

  if (category && category !== "all") {
    where.categoryName = category;
  }

  if (dateFrom || dateTo) {
    where.transactionDate = {};
    if (dateFrom) where.transactionDate.gte = new Date(dateFrom);
    if (dateTo) where.transactionDate.lte = new Date(dateTo + "T23:59:59");
  }

  if (query) {
    where.OR = [
      { merchant: { contains: query, mode: "insensitive" } },
      { categoryName: { contains: query, mode: "insensitive" } },
      { bank: { contains: query, mode: "insensitive" } },
      { transactionType: { contains: query, mode: "insensitive" } },
    ];
  }

  const transactions = await prisma.transaction.findMany({ where });

  const incomeWhere: any = {};
  if (dateFrom || dateTo) {
    incomeWhere.incomeDate = {};
    if (dateFrom) incomeWhere.incomeDate.gte = new Date(dateFrom);
    if (dateTo) incomeWhere.incomeDate.lte = new Date(dateTo + "T23:59:59");
  }
  const incomeEntries = await prisma.income.findMany({ where: incomeWhere });
  const totalIncome = incomeEntries.reduce((s, i) => s + i.amount, 0);
  const incomeBySource: Record<string, number> = {};
  incomeEntries.forEach((i) => {
    incomeBySource[i.source] = (incomeBySource[i.source] || 0) + i.amount;
  });

  let previousPeriodSpent = 0;
  if (dateFrom && dateTo) {
    const from = new Date(dateFrom);
    const to = new Date(dateTo + "T23:59:59");
    const periodMs = to.getTime() - from.getTime();
    const prevTo = new Date(from.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - periodMs);
    const prevWhere = { ...where };
    prevWhere.transactionDate = { gte: prevFrom, lte: prevTo };
    const prevTxns = await prisma.transaction.findMany({ where: prevWhere });
    previousPeriodSpent = prevTxns.reduce((s, t) => s + t.amount, 0);
  }

  const totalSpent = transactions.reduce((s, t) => s + t.amount, 0);
  const txCount = transactions.length;
  const avgAmount = txCount > 0 ? totalSpent / txCount : 0;

  const catTotals: Record<string, number> = {};
  const merchTotals: Record<string, number> = {};
  const merchCategories: Record<string, string> = {};
  const monthlyTotals: Record<string, { count: number; total: number }> = {};
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  transactions.forEach((t) => {
    if (t.categoryName) catTotals[t.categoryName] = (catTotals[t.categoryName] || 0) + t.amount;
    if (t.merchant) {
      merchTotals[t.merchant] = (merchTotals[t.merchant] || 0) + t.amount;
      if (t.categoryName && !merchCategories[t.merchant]) {
        merchCategories[t.merchant] = t.categoryName;
      }
    }

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
    let key: string;
    if (resolution === "daily") {
      key = d.toISOString().slice(0, 10);
    } else if (resolution === "yearly") {
      key = d.getFullYear().toString();
    } else if (resolution === "weekly") {
      const startOfYear = new Date(d.getFullYear(), 0, 1);
      const week = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
      key = `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
    } else {
      key = d.toISOString().slice(0, 7);
    }
    if (!timelineData[key]) timelineData[key] = {};
    timelineData[key][t.categoryName || "Uncategorized"] = (timelineData[key][t.categoryName || "Uncategorized"] || 0) + t.amount;
  });

  return NextResponse.json({
    previousPeriodSpent: Math.round(previousPeriodSpent * 100) / 100,
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
      .map(([name, amount]) => ({
        name,
        amount: Math.round(amount * 100) / 100,
        color: categories.find((c) => c.name === merchCategories[name])?.color || "#6b7280",
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10),
    monthlyData: Object.entries(monthlyTotals)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, val]) => {
        const [y, m] = key.split("-");
        return { month: `${months[parseInt(m) - 1]} ${y}`, count: val.count, total: Math.round(val.total * 100) / 100 };
      }),
    timelineData,
    totalIncome: Math.round(totalIncome * 100) / 100,
    incomeBySource: Object.entries(incomeBySource)
      .map(([name, value]) => ({
        name,
        value: Math.round(value * 100) / 100,
      }))
      .sort((a, b) => b.value - a.value),
  });
}
