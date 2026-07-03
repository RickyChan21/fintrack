"use client";

import { useState, useEffect, useCallback } from "react";
import { Filters } from "@/components/dashboard/filters";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { CategoryChart } from "@/components/dashboard/category-chart";
import { IncomeChart } from "@/components/dashboard/income-chart";
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
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10); });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [resolution, setResolution] = useState("Monthly");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [stats, setStats] = useState<any>(null);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const availableMonths = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  });

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    if (month && month !== "all") {
      const [mName, y] = month.split(" ");
      const m = months.indexOf(mName) + 1;
      const from = `${y}-${String(m).padStart(2, "0")}-01`;
      const lastDay = new Date(parseInt(y), m, 0).getDate();
      const to = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      setDateFrom(from);
      setDateTo(to);
    }
    if (month === "all") {
      setDateFrom("");
      setDateTo("");
    }
  };

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (category && category !== "all") params.set("category", category);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    params.set("resolution", resolution.toLowerCase());
    const qs = params.toString();

    const [statsRes, catRes] = await Promise.all([
      fetch(`/api/stats${qs ? `?${qs}` : ""}`),
      fetch("/api/categories"),
    ]);

    setStats(await statsRes.json());
    setCategories(await catRes.json());
  }, [search, category, dateFrom, dateTo, resolution]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!stats) return <div className="px-8 py-6" />;

  return (
    <div className="px-8 py-6 space-y-6">
      <Filters
        categories={categories.map((c) => c.name)}
        search={search}
        category={category}
        dateFrom={dateFrom}
        dateTo={dateTo}
        availableMonths={availableMonths}
        selectedMonth={selectedMonth}
        onSearchChange={setSearch}
        onCategoryChange={setCategory}
        onDateChange={(from, to) => { setDateFrom(from); setDateTo(to); if (!from) setSelectedMonth(""); }}
        onMonthChange={handleMonthChange}
      />
      <KpiCards
        totalSpent={stats.totalSpent}
        txCount={stats.txCount}
        avgAmount={stats.avgAmount}
        topCategory={stats.topCategory}
        previousPeriodSpent={stats.previousPeriodSpent}
        totalIncome={stats.totalIncome}
      />
      <div className="grid grid-cols-2 gap-6">
        <CategoryChart data={stats.categoryData || []} />
        <IncomeChart data={stats.incomeBySource || []} totalIncome={stats.totalIncome || 0} />
      </div>
      <SpendingChart
        data={stats.timelineData || {}}
        resolution={resolution}
        onResolutionChange={setResolution}
      />
      <MonthlyBreakdown data={stats.monthlyData || []} />
    </div>
  );
}
