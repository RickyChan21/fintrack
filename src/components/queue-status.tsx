"use client";

import { useEffect, useState } from "react";

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

interface Status {
  worker: boolean;
  ingester: boolean;
}

export function QueueStatus() {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [status, setStatus] = useState<Status>({ worker: true, ingester: true });

  async function fetchAll() {
    try {
      const [s, q] = await Promise.all([
        fetch("/api/status").then((r) => r.json()),
        fetch("/api/queue").then((r) => r.json()),
      ]);
      setStatus(s);
      setStats(q);
    } catch {}
  }

  async function toggle(type: "worker" | "ingester") {
    const next = { ...status, [type]: !status[type] };
    await fetch("/api/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    setStatus(next);
  }

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) return null;

  return (
    <div className="px-3 pb-2 space-y-1.5">
      <div className="flex items-center gap-3 text-xs text-muted-foreground border-t pt-2">
        {stats.waiting > 0 && <span className="text-amber-500">{stats.waiting} pending</span>}
        {stats.failed > 0 && <span className="text-destructive">{stats.failed} failed</span>}
        {stats.waiting === 0 && stats.failed === 0 && <span className="text-emerald-500">Idle</span>}
      </div>
      <div className="flex items-center gap-3 text-xs">
        <button
          onClick={async () => {
            const next = !status.ingester;
            await fetch("/api/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ingester: next }) });
            setStatus((s) => ({ ...s, ingester: next }));
          }}
          className={`px-2 py-0.5 rounded text-xs font-medium ${status.ingester ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}
        >
          Ingester {status.ingester ? "ON" : "OFF"}
        </button>
      </div>
    </div>
  );
}
