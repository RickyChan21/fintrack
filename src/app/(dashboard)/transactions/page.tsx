"use client";

import { useState, useEffect, useCallback } from "react";
import { Filters } from "@/components/dashboard/filters";
import { TransactionTable } from "@/components/dashboard/transaction-table";

export default function TransactionsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<string[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (category && category !== "all") params.set("category", category);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    params.set("page", page.toString());
    params.set("take", "25");

    const [txRes, catRes] = await Promise.all([
      fetch(`/api/transactions?${params}`),
      fetch("/api/categories"),
    ]);

    const txData = await txRes.json();
    setTransactions(txData.transactions || txData);
    setTotal(txData.total || txData.length || 0);

    const cats = await catRes.json();
    setCategories(Array.isArray(cats) ? cats.map((c: any) => typeof c === "string" ? c : c.name) : []);
  }, [search, category, dateFrom, dateTo, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function handlePageChange(newPage: number) {
    setPage(newPage);
  }

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
        dateFrom={dateFrom}
        dateTo={dateTo}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        onCategoryChange={(v) => { setCategory(v); setPage(1); }}
        onDateChange={(from, to) => { setDateFrom(from); setDateTo(to); setPage(1); }}
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
        page={page}
        total={total}
        take={25}
        onPageChange={handlePageChange}
        onUpdate={fetchData}
      />
    </div>
  );
}
