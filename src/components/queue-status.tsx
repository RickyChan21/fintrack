"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export function QueueStatus() {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [ingesterOn, setIngesterOn] = useState(true);

  async function fetchAll() {
    try {
      const [s, q] = await Promise.all([
        fetch("/api/status").then((r) => r.json()),
        fetch("/api/queue").then((r) => r.json()),
      ]);
      setIngesterOn(s.ingester);
      setStats(q);
    } catch {}
  }

  async function toggle() {
    const next = !ingesterOn;
    await fetch("/api/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingester: next }),
    });
    setIngesterOn(next);
  }

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) return null;

  return (
    <div className="px-3 pb-2 border-t border-border pt-2 space-y-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={toggle}
        className="w-full justify-between text-xs font-medium h-8 px-2"
      >
        <span className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Ingester
          {stats.waiting > 0 && <span className="text-amber-500 ml-1">({stats.waiting})</span>}
        </span>
        <span className={`text-xs font-semibold flex items-center gap-1.5 ${ingesterOn ? "text-emerald-600" : "text-muted-foreground"}`}>
          {stats.waiting === 0 && stats.failed === 0 && ingesterOn && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
          {stats.failed > 0 && <span className="w-1.5 h-1.5 rounded-full bg-destructive" />}
          {ingesterOn ? "ON" : "OFF"}
        </span>
      </Button>
    </div>
  );
}
