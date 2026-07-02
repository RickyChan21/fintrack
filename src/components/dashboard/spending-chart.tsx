"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SpendingChartProps {
  data: Record<string, Record<string, number>>;
  resolution: string;
  onResolutionChange: (r: string) => void;
}

export function SpendingChart({ data, resolution, onResolutionChange }: SpendingChartProps) {
  const resolutions = ["Daily", "Weekly", "Monthly", "Yearly"];
  const colors = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16"];

  const chartData = Object.entries(data).map(([date, cats]) => ({
    date,
    ...cats,
  }));

  const allCategories = [...new Set(chartData.flatMap((d) => Object.keys(d).filter((k) => k !== "date")))];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Spending Timeline</CardTitle>
          <div className="flex gap-1.5">
            {resolutions.map((r) => (
              <Button
                key={r}
                variant={resolution === r ? "default" : "outline"}
                size="sm"
                onClick={() => onResolutionChange(r)}
              >
                {r}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${v}`} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  fontSize: "13px",
                }}
                labelStyle={{ fontWeight: 600, marginBottom: 4, color: "hsl(var(--foreground))" }}
              />
              {allCategories.map((cat, i) => (
                <Bar key={cat} dataKey={cat} stackId="a" fill={colors[i % colors.length]} radius={[2, 2, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
