"use client";

import { useState, useEffect, useCallback } from "react";
import { Filters } from "@/components/dashboard/filters";
import { TransactionTable } from "@/components/dashboard/transaction-table";

export default function TransactionsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [days, setDays] = useState<number | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (category && category !== "all") params.set("category", category);
    if (days) params.set("days", days.toString());

    const [txRes, catRes] = await Promise.all([
      fetch(`/api/transactions?${params}&take=200`),
      fetch("/api/categories"),
    ]);

    setTransactions(await txRes.json());
    const cats = await catRes.json();
    setCategories(Array.isArray(cats) ? cats.map((c: any) => typeof c === "string" ? c : c.name) : []);
  }, [search, category, days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="px-8 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
        <p className="text-muted-foreground">All processed transactions with search and filters.</p>
      </div>
      <Filters
        categories={categories}
        search={search}
        category={category}
        days={days}
        onSearchChange={setSearch}
        onCategoryChange={setCategory}
        onDaysChange={setDays}
      />
      <TransactionTable
        transactions={transactions.map((t: any) => ({
          id: t.id,
          merchant: t.merchant,
          amount: t.amount,
          category: t.categoryName,
          bank: t.bank,
          type: t.transactionType,
          confidence: t.confidenceScore,
          date: t.transactionDate
            ? new Date(t.transactionDate).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
            : null,
        }))}
      />
    </div>
  );
}
