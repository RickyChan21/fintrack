"use client";

"use client";

import { useState, useEffect, useCallback } from "react";
import { Filters } from "@/components/dashboard/filters";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { CategoryChart } from "@/components/dashboard/category-chart";
import { MerchantList } from "@/components/dashboard/merchant-list";
import { SpendingChart } from "@/components/dashboard/spending-chart";
import { MonthlyBreakdown } from "@/components/dashboard/monthly-breakdown";

interface CategoryInfo {
  id: number;
  name: string;
  color: string;
}

export default function Dashboard() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [days, setDays] = useState<number | null>(null);
  const [resolution, setResolution] = useState("Monthly");
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (category && category !== "all") params.set("category", category);
    if (days) params.set("days", days.toString());

    const [txRes, statsRes, catRes] = await Promise.all([
      fetch(`/api/transactions?${params}`),
      fetch("/api/stats"),
      fetch("/api/categories"),
    ]);

    setTransactions(await txRes.json());
    setStats(await statsRes.json());
    setCategories(await catRes.json());
  }, [search, category, days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalSpent = transactions.reduce((s: number, t: any) => s + t.amount, 0);
  const txCount = transactions.length;
  const avgAmount = txCount > 0 ? totalSpent / txCount : 0;

  const catTotals: Record<string, number> = {};
  transactions.forEach((t: any) => {
    if (t.categoryName) catTotals[t.categoryName] = (catTotals[t.categoryName] || 0) + t.amount;
  });
  const catColorMap = Object.fromEntries(categories.map((c) => [c.name, c.color]));
  const categoryData = Object.entries(catTotals)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100, color: catColorMap[name] || "#6b7280" }))
    .sort((a, b) => b.value - a.value);

  const merchTotals: Record<string, number> = {};
  transactions.forEach((t: any) => {
    merchTotals[t.merchant] = (merchTotals[t.merchant] || 0) + t.amount;
  });
  const merchantData = Object.entries(merchTotals)
    .map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100 }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  const monthlyTotals: Record<string, { count: number; total: number }> = {};
  transactions.forEach((t: any) => {
    if (!t.transactionDate) return;
    const d = new Date(t.transactionDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyTotals[key]) monthlyTotals[key] = { count: 0, total: 0 };
    monthlyTotals[key].count += 1;
    monthlyTotals[key].total += t.amount;
  });
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyData = Object.entries(monthlyTotals)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, val]) => {
      const [y, m] = key.split("-");
      return { month: `${months[parseInt(m) - 1]} ${y}`, count: val.count, total: Math.round(val.total * 100) / 100 };
    });

  const timelineData: Record<string, any> = {};
  transactions.forEach((t: any) => {
    if (!t.transactionDate) return;
    const d = new Date(t.transactionDate);
    let key: string;
    if (resolution === "Daily") key = d.toISOString().slice(0, 10);
    else if (resolution === "Weekly") {
      const start = new Date(d);
      start.setDate(d.getDate() - d.getDay());
      key = start.toISOString().slice(0, 10);
    } else if (resolution === "Monthly") key = d.toISOString().slice(0, 7);
    else key = d.getFullYear().toString();

    if (!timelineData[key]) timelineData[key] = {};
    const cat = t.categoryName || "Uncategorized";
    timelineData[key][cat] = (timelineData[key][cat] || 0) + t.amount;
  });

  const topCat = stats?.topCategory || "N/A";

  return (
    <div className="px-8 py-6 space-y-6">
      <Filters
        categories={categories.map((c) => c.name)}
        search={search}
        category={category}
        days={days}
        onSearchChange={setSearch}
        onCategoryChange={setCategory}
        onDaysChange={setDays}
      />
      <KpiCards
        totalSpent={totalSpent}
        txCount={txCount}
        avgAmount={avgAmount}
        topCategory={topCat}
      />
      <div className="grid grid-cols-2 gap-6">
        <CategoryChart data={categoryData} />
        <MerchantList merchants={merchantData} />
      </div>
      <SpendingChart
        data={timelineData}
        resolution={resolution}
        onResolutionChange={setResolution}
      />
      <MonthlyBreakdown data={monthlyData} />
    </div>
  );
}
