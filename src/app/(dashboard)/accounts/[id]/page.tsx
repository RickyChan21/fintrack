"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useTheme } from "next-themes";

export default function AccountDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [account, setAccount] = useState<any>(null);
  const [balances, setBalances] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [positionOpen, setPositionOpen] = useState(false);
  const [posForm, setPosForm] = useState({ ticker: "", shares: "" });

  const instLogos: Record<string, string> = {
    BAC: "https://play-lh.googleusercontent.com/nzQ90hWQhyl5uXf3gpHau8TLIZ54542Ie-Z8zSVIShlYPPvMo94LoU0164bONPUXRsIfxWkgWh0H3NKVwTfwgg=s128-rw",
    "Banco General": "https://play-lh.googleusercontent.com/xaqqt0XOd-V3tKDbGUP06eeydX5b_eZPfVQmaMVGEqDZHL9UVGd4tnRHb6ONsDXOIS_fey1D6o5RFcNRtjnk=w480-h480-rw",
    UniBank: "https://play-lh.googleusercontent.com/4OnYhmXJ6FhtWOPBa4KikPzDCL9XZtDEyAEAShk1CM0k9xP61VXl96eltcqdXoVm--E3pbfaDrlLUme_2e9-Nw=w480-h480-rw",
    "Interactive Brokers": "https://unavatar.io/interactivebrokers.com",
    ProFuturo: "https://play-lh.googleusercontent.com/xaqqt0XOd-V3tKDbGUP06eeydX5b_eZPfVQmaMVGEqDZHL9UVGd4tnRHb6ONsDXOIS_fey1D6o5RFcNRtjnk=w480-h480-rw",
  };

  const isDark = mounted && (theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches));
  const borderColor = isDark ? "#333" : "#e5e7eb";
  const textColor = isDark ? "#999" : "#6b7280";
  const tooltipBg = isDark ? "#1a1a1a" : "#fff";
  const tooltipBorder = isDark ? "#333" : "#e5e7eb";

  const fetchAccount = useCallback(async () => {
    const [accRes, balRes, posRes] = await Promise.all([
      fetch(`/api/accounts`),
      fetch(`/api/accounts/${id}/balances`),
      id ? fetch(`/api/accounts/${id}/positions`).catch(() => null) : null,
    ]);
    const accounts = await accRes.json();
    setAccount(accounts.find((a: any) => a.id === parseInt(id)));
    setBalances(await balRes.json());
    if (posRes) {
      const posData = await posRes.json();
      setPositions(posData || []);
    }
  }, [id]);

  useEffect(() => { fetchAccount(); }, [fetchAccount]);

  const handleUpdateBalance = async () => {
    await fetch(`/api/accounts/${id}/balances`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: parseFloat(amount) }),
    });
    setUpdateOpen(false);
    setAmount("");
    fetchAccount();
  };

  const handleAddPosition = async () => {
    await fetch(`/api/accounts/${id}/positions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker: posForm.ticker.toUpperCase(), shares: parseFloat(posForm.shares) }),
    });
    setPositionOpen(false);
    setPosForm({ ticker: "", shares: "" });
    fetchAccount();
  };

  const handleDeletePosition = async (ticker: string) => {
    await fetch(`/api/accounts/${id}/positions?ticker=${ticker}`, { method: "DELETE" });
    fetchAccount();
  };

  if (!account) return <div className="px-8 py-6" />;

  const isLiability = account.type === "credit";
  const currentBalance = balances.length > 0 ? balances[balances.length - 1].amount : 0;
  const displayBalance = isLiability ? -currentBalance : currentBalance;

  const chartData = balances.map((b: any) => ({
    date: format(new Date(b.date), "MMM d"),
    amount: isLiability ? -b.amount : b.amount,
  }));

  return (
    <div className="px-8 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
            {instLogos[account.institution] ? (
              <img src={instLogos[account.institution]} alt={account.institution} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
            ) : (
              <div className="w-6 h-6 text-muted-foreground">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v12"/><path d="M6 12h12"/></svg>
              </div>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{account.name}</h1>
            <p className="text-muted-foreground">{account.network ? `${account.institution} · ${account.network.charAt(0).toUpperCase() + account.network.slice(1)}` : account.institution || account.type}</p>
          </div>
        </div>
        <Button onClick={() => setUpdateOpen(true)}>Update Balance</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Balance History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={borderColor} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: textColor }} tickLine={false} axisLine={{ stroke: borderColor }} />
                  <YAxis tick={{ fontSize: 11, fill: textColor }} tickLine={false} axisLine={{ stroke: borderColor }} tickFormatter={(v: number) => `$${v}`} />
                  <Tooltip
                    formatter={(value) => `$${Number(value).toFixed(2)}`}
                    contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: "var(--radius)", fontSize: "13px", color: isDark ? "#fff" : "#111" }}
                    labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                  />
                  <Bar dataKey="amount" fill={account.color || "#3b82f6"} radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="font-medium capitalize">{account.type}</p>
            </div>
            {account.subtype && (
              <div>
                <p className="text-sm text-muted-foreground">Subtype</p>
                <p className="font-medium">{account.subtype}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Currency</p>
              <p className="font-medium">{account.currency}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Balance</p>
              <p className={`text-2xl font-bold ${displayBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                ${Math.abs(currentBalance).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Balance entries</p>
              <p className="font-medium">{balances.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {account.type === "investment" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Positions</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setPositionOpen(true)}>Add Position</Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticker</TableHead>
                  <TableHead className="text-right">Shares</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((p: any) => (
                  <TableRow key={p.ticker}>
                    <TableCell className="font-medium">{p.ticker}</TableCell>
                    <TableCell className="text-right">{p.shares}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-red-600" onClick={() => handleDeletePosition(p.ticker)}>Del</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {positions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-4">No positions yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Balance</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Amount</label>
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            <p className="text-xs text-muted-foreground">Positive for assets, negative for credit/loan balances</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateBalance} disabled={!amount}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={positionOpen} onOpenChange={setPositionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Position</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Ticker</label>
              <Input value={posForm.ticker} onChange={(e) => setPosForm({ ...posForm, ticker: e.target.value })} placeholder="AAPL" className="uppercase" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Shares</label>
              <Input type="number" step="0.01" value={posForm.shares} onChange={(e) => setPosForm({ ...posForm, shares: e.target.value })} placeholder="10" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPositionOpen(false)}>Cancel</Button>
            <Button onClick={handleAddPosition} disabled={!posForm.ticker.trim() || !posForm.shares}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
