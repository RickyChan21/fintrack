import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Transaction {
  id: string;
  merchant: string;
  amount: number;
  category: string | null;
  date: string | null;
}

interface TransactionTableProps {
  transactions: Transaction[];
}

const categoryColors: Record<string, string> = {
  Groceries: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  Dining: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  Transportation: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  Utilities: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  Subscriptions: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
  Shopping: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
  Health: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  Entertainment: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  Travel: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
  Transfers: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  Income: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
};

export function TransactionTable({ transactions }: TransactionTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-80 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead className="text-right">Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="text-muted-foreground">{tx.date || "—"}</TableCell>
                  <TableCell className="font-medium">{tx.merchant}</TableCell>
                  <TableCell className="text-right">
                    {tx.category && (
                      <Badge variant="outline" className={categoryColors[tx.category] || ""}>
                        {tx.category}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">${tx.amount.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
