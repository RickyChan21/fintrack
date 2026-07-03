"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Config {
  id: number; name: string; searchQuery: string; labelDone: string; pollInterval: number; enabled: boolean;
}

export default function SettingsPage() {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", searchQuery: "", labelDone: "fintrack_processed", pollInterval: 300 });

  async function fetchConfigs() { setConfigs(await (await fetch("/api/ingesters")).json()); }
  useEffect(() => { fetchConfigs(); }, []);

  async function handleSave(id?: number) {
    if (!form.name || !form.searchQuery) return;
    const method = id ? "PUT" : "POST";
    await fetch("/api/ingesters", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(id ? { id, ...form } : form) });
    setForm({ name: "", searchQuery: "", labelDone: "fintrack_processed", pollInterval: 300 });
    setEditingId(null);
    fetchConfigs();
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete?")) return;
    await fetch(`/api/ingesters?id=${id}`, { method: "DELETE" });
    fetchConfigs();
  }

  function toggleEnabled(c: Config) {
    fetch("/api/ingesters", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id, enabled: !c.enabled }) }).then(fetchConfigs);
  }

  return (
    <div className="px-8 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure email ingesters.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>{editingId ? "Edit" : "Add"} Ingester</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Name (e.g. BAC Panama)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Gmail search query" value={form.searchQuery} onChange={(e) => setForm({ ...form, searchQuery: e.target.value })} />
          <div className="flex gap-2">
            <Input placeholder="Label (default: fintrack_processed)" value={form.labelDone} onChange={(e) => setForm({ ...form, labelDone: e.target.value })} className="flex-1" />
            <Input placeholder="Interval (seconds)" type="number" value={form.pollInterval} onChange={(e) => setForm({ ...form, pollInterval: parseInt(e.target.value) || 300 })} className="w-40" />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => handleSave(editingId || undefined)} disabled={!form.name || !form.searchQuery}>{editingId ? "Save" : "Add"}</Button>
            {editingId && <Button variant="outline" onClick={() => { setEditingId(null); setForm({ name: "", searchQuery: "", labelDone: "fintrack_processed", pollInterval: 300 }); }}>Cancel</Button>}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Ingesters ({configs.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Search Query</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Interval</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">{c.searchQuery}</TableCell>
                  <TableCell className="text-xs">{c.labelDone}</TableCell>
                  <TableCell className="text-xs">{c.pollInterval}s</TableCell>
                  <TableCell><Button size="sm" variant={c.enabled ? "default" : "outline"} onClick={() => toggleEnabled(c)} className="h-7 text-xs">{c.enabled ? "ON" : "OFF"}</Button></TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="outline" onClick={() => { setEditingId(c.id); setForm({ name: c.name, searchQuery: c.searchQuery, labelDone: c.labelDone, pollInterval: c.pollInterval }); }}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(c.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
              {configs.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No ingesters configured.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
