"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface SpendingChartProps {
  data: Record<string, Record<string, number>>;
  resolution: string;
  onResolutionChange: (r: string) => void;
}

export function SpendingChart({ data, resolution, onResolutionChange }: SpendingChartProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && (theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches));

  const borderColor = isDark ? "#333" : "#e5e7eb";
  const textColor = isDark ? "#999" : "#6b7280";
  const tooltipBg = isDark ? "#1a1a1a" : "#fff";
  const tooltipBorder = isDark ? "#333" : "#e5e7eb";

  const resolutions = ["Daily", "Weekly", "Monthly", "Yearly"];

  const chartData = Object.entries(data).map(([date, cats]) => {
    const total = Object.values(cats).reduce((s, v) => s + v, 0);
    return { date, total: Math.round(total * 100) / 100 };
  }).sort((a, b) => a.date.localeCompare(b.date));

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
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={borderColor} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: textColor }} tickLine={false} axisLine={{ stroke: borderColor }} />
              <YAxis tick={{ fontSize: 11, fill: textColor }} tickLine={false} axisLine={{ stroke: borderColor }} tickFormatter={(v: number) => `$${v}`} />
              <Tooltip
                contentStyle={{
                  background: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: "var(--radius)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  fontSize: "13px",
                  color: isDark ? "#fff" : "#111",
                }}
                labelStyle={{ fontWeight: 600, marginBottom: 4 }}
              />
              <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={48} background={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
