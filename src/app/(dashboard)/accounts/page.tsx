"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Wallet, CreditCard, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useTheme } from "next-themes";

const accountTypes = [
  { value: "savings", label: "Savings" },
  { value: "credit", label: "Credit Card" },
  { value: "investment", label: "Investment" },
];

const networkOptions = ["visa", "mastercard", "amex", "discover"];

const institutionOptions: Record<string, string[]> = {
  savings: ["BAC", "Banco General", "UniBank"],
  credit: ["BAC", "Banco General", "UniBank"],
  investment: ["Interactive Brokers", "ProFuturo"],
};

const sections: { key: string; label: string; types: string[]; icon: React.ReactNode }[] = [
  { key: "savings", label: "Savings", types: ["savings"], icon: <Wallet className="h-4 w-4" /> },
  { key: "credit", label: "Credit Cards", types: ["credit"], icon: <CreditCard className="h-4 w-4" /> },
  { key: "investment", label: "Investments", types: ["investment"], icon: <TrendingUp className="h-4 w-4" /> },
];

function fmt(n: number) {
  const s = n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return s;
}

export default function AccountsPage() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [accounts, setAccounts] = useState<any[]>([]);
  const [netWorthData, setNetWorthData] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "savings", institution: "", network: "", color: "#3b82f6", balance: "" });

  const isDark = mounted && (theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches));
  const borderColor = isDark ? "#333" : "#e5e7eb";
  const textColor = isDark ? "#999" : "#6b7280";
  const tooltipBg = isDark ? "#1a1a1a" : "#fff";
  const tooltipBorder = isDark ? "#333" : "#e5e7eb";

  const fetchAccounts = useCallback(async () => {
    const [accRes, nwRes] = await Promise.all([
      fetch("/api/accounts"),
      fetch("/api/accounts?type=net-worth"),
    ]);
    setAccounts(await accRes.json());
    setNetWorthData(await nwRes.json());
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const handleCreate = async () => {
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        type: form.type,
        institution: form.institution || null,
        network: form.type === "credit" ? form.network || null : null,
        color: form.color,
        balance: form.balance ? parseFloat(form.balance) : null,
      }),
    });
    if (res.ok) {
      setDialogOpen(false);
      setForm({ name: "", type: "savings", institution: "", network: "", color: "#3b82f6", balance: "" });
      fetchAccounts();
    }
  };

  const totalAssets = accounts.reduce((sum, a) => {
    if (a.type === "credit") return sum;
    return sum + (a.balances?.[0]?.amount || 0);
  }, 0);

  const totalLiabilities = accounts.reduce((sum, a) => {
    if (a.type !== "credit") return sum;
    return sum + Math.abs(a.balances?.[0]?.amount || 0);
  }, 0);

  const netWorth = totalAssets - totalLiabilities;

  const chartData = netWorthData.map((d: any) => ({
    date: format(new Date(d.date), "MMM d"),
    amount: d.amount,
    rawDate: d.date,
  }));

  const [nwFilter, setNwFilter] = useState("all");

  const filteredChartData = chartData.filter((d: any) => {
    if (nwFilter === "all") return true;
    const ms = parseInt(nwFilter) * 30 * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - ms;
    return new Date(d.rawDate).getTime() >= cutoff;
  });

  const lastNetWorth = chartData.length > 0 ? chartData[chartData.length - 1].amount : 0;
  const firstNetWorth = filteredChartData.length > 0 ? filteredChartData[0].amount : chartData.length > 0 ? chartData[0].amount : 0;
  const netWorthChange = lastNetWorth - firstNetWorth;

  const nwFilterOptions = [
    { value: "1", label: "1M" },
    { value: "3", label: "3M" },
    { value: "6", label: "6M" },
    { value: "12", label: "1Y" },
    { value: "all", label: "All" },
  ];

  const getSectionAccounts = (types: string[]) =>
    accounts.filter((a) => types.includes(a.type));

  return (
    <div className="px-8 py-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
          <p className="text-muted-foreground">Track your balances and net worth</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Account
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Net Worth</p>
               <p className={cn("text-4xl font-bold mt-1", netWorth < 0 && "text-red-600")}>
                ${fmt(Math.abs(netWorth))}
              </p>
              {filteredChartData.length > 1 && (
                <p className={cn("text-sm mt-1", netWorthChange < 0 ? "text-red-600" : "text-green-600")}>
                  {netWorthChange >= 0 ? "↑" : "↓"} ${fmt(Math.abs(netWorthChange))}
                </p>
              )}
            </div>
            <Select value={nwFilter} onValueChange={setNwFilter}>
              <SelectTrigger className="w-20 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {nwFilterOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredChartData.length > 1 ? (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredChartData}>
                  <defs>
                    <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={netWorth >= 0 ? "#16a34a" : "#dc2626"} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={netWorth >= 0 ? "#16a34a" : "#dc2626"} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={borderColor} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: textColor }} tickLine={false} axisLine={{ stroke: borderColor }} />
                  <YAxis tick={{ fontSize: 11, fill: textColor }} tickLine={false} axisLine={{ stroke: borderColor }} tickFormatter={(v: number) => `$${v}`} />
                  <Tooltip
                    formatter={(value) => [`$${Number(value).toFixed(2)}`, "Net Worth"]}
                    contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: "var(--radius)", fontSize: "13px", color: isDark ? "#fff" : "#111" }}
                    labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                  />
                  <Area type="monotone" dataKey="amount" stroke={netWorth >= 0 ? "#22c55e" : "#ef4444"} strokeWidth={2} fill="url(#netWorthGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Add balance history to see your net worth over time.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          {sections.map((section) => {
            const sectionAccounts = getSectionAccounts(section.types);
            if (sectionAccounts.length === 0) return null;

            const sectionTotal = sectionAccounts.reduce((sum, a) => {
              const bal = a.balances?.[0]?.amount || 0;
              const multiplier = a.type === "credit" ? -1 : 1;
              return sum + bal * multiplier;
            }, 0);

            const instLogo: Record<string, string> = {
          BAC: "https://play-lh.googleusercontent.com/nzQ90hWQhyl5uXf3gpHau8TLIZ54542Ie-Z8zSVIShlYPPvMo94LoU0164bONPUXRsIfxWkgWh0H3NKVwTfwgg=s128-rw",
          "Banco General": "https://play-lh.googleusercontent.com/xaqqt0XOd-V3tKDbGUP06eeydX5b_eZPfVQmaMVGEqDZHL9UVGd4tnRHb6ONsDXOIS_fey1D6o5RFcNRtjnk=w480-h480-rw",
              UniBank: "https://play-lh.googleusercontent.com/4OnYhmXJ6FhtWOPBa4KikPzDCL9XZtDEyAEAShk1CM0k9xP61VXl96eltcqdXoVm--E3pbfaDrlLUme_2e9-Nw=w480-h480-rw",
              "Interactive Brokers": "https://unavatar.io/interactivebrokers.com",
              ProFuturo: "https://play-lh.googleusercontent.com/xaqqt0XOd-V3tKDbGUP06eeydX5b_eZPfVQmaMVGEqDZHL9UVGd4tnRHb6ONsDXOIS_fey1D6o5RFcNRtjnk=w480-h480-rw",
            };

            return (
              <Card key={section.key}>
                <CardContent className="p-0">
                  <div className="flex items-center justify-between px-6 py-4 border-b">
                    <div className="flex items-center gap-3">
                      <div className="text-muted-foreground">{section.icon}</div>
                      <h2 className="text-base font-semibold">{section.label}</h2>
                      <span className="text-xs text-muted-foreground">{sectionAccounts.length} {sectionAccounts.length === 1 ? "account" : "accounts"}</span>
                    </div>
                    <p className={cn("text-lg font-bold ", sectionTotal < 0 && "text-red-600")}>
                      {sectionTotal >= 0 ? "" : "-"}${fmt(Math.abs(sectionTotal))}
                    </p>
                  </div>
                  <div>
                    {sectionAccounts.map((account, i) => {
                      const balance = account.balances?.[0]?.amount || 0;
                      const isLiability = account.type === "credit";

                      return (
                        <Link key={account.id} href={`/accounts/${account.id}`}>
                          <div className={cn(
                            "flex items-center gap-4 px-6 py-4 hover:bg-accent/50 transition-colors cursor-pointer",
                            i < sectionAccounts.length - 1 && "border-b"
                          )}>
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                          <img
                            src={instLogo[account.institution] || ""}
                            alt={account.institution}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                          />
                        </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{account.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{account.network ? `${account.institution} · ${account.network.charAt(0).toUpperCase() + account.network.slice(1)}` : account.institution}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-medium ">
                                ${fmt(Math.abs(balance))}
                              </p>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
            <div className="px-6 py-4 border-b">
              <h3 className="text-sm font-semibold">Summary</h3>
            </div>
            <div className="space-y-5 p-5">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <span className="text-sm font-semibold">Assets</span>
                </div>
                <span className="text-sm font-bold ">${fmt(totalAssets)}</span>
              </div>
              <div className="space-y-2.5">
                {accounts.filter(a => a.type !== "credit").sort((a, b) => (b.balances?.[0]?.amount || 0) - (a.balances?.[0]?.amount || 0)).map(a => {
                  const bal = a.balances?.[0]?.amount || 0;
                  const pct = totalAssets > 0 ? (bal / totalAssets) * 100 : 0;
                  return (
                    <div key={a.id}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground truncate">{a.name}</span>
                        <span className="text-muted-foreground ">
                          <span className="font-medium text-foreground">${fmt(bal)}</span> ({pct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: a.color || "#22c55e" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="h-px bg-border" />

            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground" />
                  <span className="text-sm font-semibold">Liabilities</span>
                </div>
                <span className="text-sm font-bold ">${fmt(totalLiabilities)}</span>
              </div>
              <div className="space-y-2.5">
                {accounts.filter(a => a.type === "credit").sort((a, b) => Math.abs(b.balances?.[0]?.amount || 0) - Math.abs(a.balances?.[0]?.amount || 0)).map(a => {
                  const bal = Math.abs(a.balances?.[0]?.amount || 0);
                  const pct = totalLiabilities > 0 ? (bal / totalLiabilities) * 100 : 0;
                  return (
                    <div key={a.id}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground truncate">{a.name}</span>
                        <span className="text-muted-foreground ">
                          <span className="font-medium">${fmt(bal)}</span> ({pct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: a.color || "#ef4444" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="h-px bg-border" />
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">Net Worth</span>
              <span className={cn("font-bold", netWorth < 0 && "text-red-600")}>
                ${fmt(Math.abs(netWorth))}
              </span>
            </div>
            </div>
          </div>
        </div>
      </div>
      {accounts.length === 0 && (
        <div className="text-center py-12 text-muted-foreground col-span-full">
          No accounts yet. Add your first account to start tracking your net worth.
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Chase Sapphire" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v, institution: "" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accountTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Institution</label>
                <Select
                  value={form.institution}
                  onValueChange={(v) => setForm({ ...form, institution: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select institution" />
                  </SelectTrigger>
                  <SelectContent>
                    {(institutionOptions[form.type] || []).map((inst) => (
                      <SelectItem key={inst} value={inst}>{inst}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.type === "credit" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Network</label>
                  <Select value={form.network} onValueChange={(v) => setForm({ ...form, network: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select network" />
                    </SelectTrigger>
                    <SelectContent>
                      {networkOptions.map((n) => (
                        <SelectItem key={n} value={n}>{n.charAt(0).toUpperCase() + n.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Balance</label>
              <Input type="number" step="0.01" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} placeholder="0.00" />
              <p className="text-xs text-muted-foreground">Positive for assets, negative for credit card/loan balances</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.name.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
