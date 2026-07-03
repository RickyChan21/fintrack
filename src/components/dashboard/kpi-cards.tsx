import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardsProps {
  totalSpent: number;
  txCount: number;
  avgAmount: number;
  topCategory: string;
  previousPeriodSpent?: number;
  totalIncome?: number;
}

function TrendBadge({ current, previous }: { current: number; previous: number }) {
  if (!previous) return null;
  const diff = current - previous;
  const pct = ((diff / previous) * 100).toFixed(1);
  const isUp = diff > 0;

  return (
    <div className="flex items-center gap-1.5 mt-1">
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
          isUp ? "bg-red-500/10 text-red-600" : "bg-green-500/10 text-green-600"
        )}
      >
        {isUp ? "↑" : "↓"} {Math.abs(Number(pct))}%
      </span>
      <span className="text-xs text-muted-foreground">vs prev period</span>
    </div>
  );
}

export function KpiCards({ totalSpent, txCount, avgAmount, topCategory, previousPeriodSpent, totalIncome }: KpiCardsProps) {
  const netCashflow = (totalIncome || 0) - totalSpent;

  const items = [
    {
      label: "Total Spent",
      value: `$${totalSpent.toFixed(2)}`,
      trend: previousPeriodSpent != null ? (
        <TrendBadge current={totalSpent} previous={previousPeriodSpent} />
      ) : null,
    },
    {
      label: "Total Income",
      value: `$${(totalIncome || 0).toFixed(2)}`,
      valueClass: "text-green-500",
    },
    {
      label: "Cash Flow",
      value: `${netCashflow >= 0 ? "+" : ""}$${netCashflow.toFixed(2)}`,
      valueClass: netCashflow >= 0 ? "text-green-500" : "text-red-500",
    },
    { label: "Transactions", value: txCount.toString() },
  ];

  return (
    <div className="grid grid-cols-4 gap-6">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
            <p className={cn("text-3xl font-bold mt-1", item.valueClass)}>{item.value}</p>
            {item.trend}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
