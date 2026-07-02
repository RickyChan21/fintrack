"use client";

import { useEffect, useState } from "react";

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export function QueueStatus() {
  const [stats, setStats] = useState<QueueStats | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/queue");
        setStats(await res.json());
      } catch {}
    }
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) return null;

  return (
    <div className="px-3 pb-2">
      <div className="flex items-center gap-3 text-xs text-muted-foreground border-t pt-2">
        {stats.waiting > 0 && <span className="text-amber-500">{stats.waiting} pending</span>}
        {stats.failed > 0 && <span className="text-destructive">{stats.failed} failed</span>}
        {stats.waiting === 0 && stats.failed === 0 && <span className="text-emerald-500">Idle</span>}
      </div>
    </div>
  );
}
