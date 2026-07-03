"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

const categoryOptions = ["Salary", "Freelance", "Interest", "Refund", "Gift", "Investment", "Bonus", "Other"];

export default function IncomePage() {
  const [income, setIncome] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [take] = useState(25);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ amount: "", source: "", category: "Salary", incomeDate: new Date().toISOString().slice(0, 10), notes: "" });

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/income?page=${page}&take=${take}`);
    const data = await res.json();
    setIncome(data.income || []);
    setTotal(data.total || 0);
  }, [page, take]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => {
    setEditing(null);
    setError("");
    setForm({ amount: "", source: "", category: "Salary", incomeDate: new Date().toISOString().slice(0, 10), notes: "" });
    setDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setEditing(item);
    setForm({
      amount: item.amount.toString(),
      source: item.source,
      category: item.category,
      incomeDate: item.incomeDate.slice(0, 10),
      notes: item.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.source.trim()) { setError("Please enter a source"); return; }
    setError("");
    const body = {
      ...(editing ? { id: editing.id } : {}),
      amount: parseFloat(form.amount),
      source: form.source.trim(),
      category: form.category,
      incomeDate: form.incomeDate,
      notes: form.notes || null,
    };

    const res = await fetch("/api/income", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setDialogOpen(false);
      fetchData();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to save");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this income entry?")) return;
    await fetch(`/api/income?id=${id}`, { method: "DELETE" });
    fetchData();
  };

  const totalPages = Math.ceil(total / take);

  return (
    <div className="px-8 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Income</h1>
          <p className="text-muted-foreground">Track your income sources manually.</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Add Income
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Income Entries {total > 0 ? `(${total})` : ""}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {income.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {new Date(item.incomeDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </TableCell>
                  <TableCell className="font-medium">{item.source}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell className="text-right font-medium text-green-600">+${item.amount.toFixed(2)}</TableCell>
                  <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">{item.notes || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => openEdit(item)}>Edit</Button>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-red-500 hover:text-red-700" onClick={() => handleDelete(item.id)}>Del</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {income.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No income entries yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 mt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>←</Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Button key={p} variant={p === page ? "default" : "outline"} size="sm" onClick={() => setPage(p)} className="w-8">{p}</Button>
              ))}
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>→</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Income" : "Add Income"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount</label>
                <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !form.incomeDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      {form.incomeDate ? format(new Date(form.incomeDate), "MMM d, yyyy") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.incomeDate ? new Date(form.incomeDate) : undefined}
                      onSelect={(date) => setForm({ ...form, incomeDate: date ? format(date, "yyyy-MM-dd") : form.incomeDate })}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Source</label>
                <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="e.g. Acme Corp" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.amount || !form.incomeDate}>
              {editing ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
