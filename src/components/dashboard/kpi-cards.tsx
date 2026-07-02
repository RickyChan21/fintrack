import { Card, CardContent } from "@/components/ui/card";

interface KpiCardsProps {
  totalSpent: number;
  txCount: number;
  avgAmount: number;
  topCategory: string;
}

export function KpiCards({ totalSpent, txCount, avgAmount, topCategory }: KpiCardsProps) {
  const items = [
    { label: "Total Spent", value: `$${totalSpent.toFixed(2)}` },
    { label: "Transactions", value: txCount.toString() },
    { label: "Avg per Transaction", value: `$${avgAmount.toFixed(2)}` },
    { label: "Top Category", value: topCategory },
  ];

  return (
    <div className="grid grid-cols-4 gap-6">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
            <p className="text-3xl font-bold mt-1">{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
