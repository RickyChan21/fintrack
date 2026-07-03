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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [resolution, setResolution] = useState("Monthly");
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [stats, setStats] = useState<any>(null);

  const fetchData = useCallback(async () => {
    const [statsRes, catRes] = await Promise.all([
      fetch("/api/stats"),
      fetch("/api/categories"),
    ]);

    setStats(await statsRes.json());
    setCategories(await catRes.json());
  }, []);

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
        onSearchChange={setSearch}
        onCategoryChange={setCategory}
        onDateChange={(from, to) => { setDateFrom(from); setDateTo(to); }}
      />
      <KpiCards
        totalSpent={stats.totalSpent}
        txCount={stats.txCount}
        avgAmount={stats.avgAmount}
        topCategory={stats.topCategory}
      />
      <div className="grid grid-cols-2 gap-6">
        <CategoryChart data={stats.categoryData || []} />
        <MerchantList merchants={stats.merchantData || []} />
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
