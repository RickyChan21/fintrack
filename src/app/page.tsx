"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Filters } from "@/components/dashboard/filters";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { CategoryChart } from "@/components/dashboard/category-chart";
import { MerchantList } from "@/components/dashboard/merchant-list";
import { SpendingChart } from "@/components/dashboard/spending-chart";
import { MonthlyBreakdown } from "@/components/dashboard/monthly-breakdown";
import { TransactionTable } from "@/components/dashboard/transaction-table";

export default function Dashboard() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [days, setDays] = useState<number | null>(null);
  const [resolution, setResolution] = useState("Monthly");
  const [categories, setCategories] = useState<string[]>([]);
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
  const categoryData = Object.entries(catTotals)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
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
    <div className="min-h-screen">
      <div className="border-b">
        <div className="flex h-16 items-center px-8 gap-4">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-lg font-bold">Fintrack</span>
        </div>
      </div>
      <div className="px-8 py-6 space-y-6">
        <Filters
          categories={categories}
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
        <div className="grid grid-cols-2 gap-6">
          <MonthlyBreakdown data={monthlyData} />
          <TransactionTable
            transactions={transactions.map((t: any) => ({
              id: t.id,
              merchant: t.merchant,
              amount: t.amount,
              category: t.categoryName,
              bank: t.bank,
              type: t.transactionType,
              confidence: t.confidenceScore,
              date: t.transactionDate ? new Date(t.transactionDate).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : null,
            }))}
          />
        </div>

        <AddCategory onAdded={fetchData} />
      </div>
    </div>
  );
}

function AddCategory({ onAdded }: { onAdded: () => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAdd() {
    if (!name.trim()) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to add category");
    } else {
      setName("");
      onAdded();
    }
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Categories</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Input
            placeholder="New category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button onClick={handleAdd} disabled={loading || !name.trim()}>
            Add
          </Button>
        </div>
        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
      </CardContent>
    </Card>
  );
}
