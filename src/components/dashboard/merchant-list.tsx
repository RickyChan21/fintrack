import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MerchantListProps {
  merchants: { name: string; amount: number; color?: string }[];
}

export function MerchantList({ merchants }: MerchantListProps) {
  const maxAmount = merchants.length > 0 ? merchants[0].amount : 1;
  const total = merchants.reduce((s, m) => s + m.amount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Merchants</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {merchants.map((m) => (
          <div key={m.name}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium truncate">{m.name}</span>
              <span className="ml-2">${m.amount.toFixed(2)}</span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(m.amount / maxAmount) * 100}%`, background: m.color || "hsl(var(--primary))" }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {((m.amount / total) * 100).toFixed(1)}% of spend
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
