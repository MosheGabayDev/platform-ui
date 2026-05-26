"use client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchSampleInvoices } from "@/lib/api/billing-automation";

export default function SampleInvoicesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["billing-automation", "sample-invoices"],
    queryFn: fetchSampleInvoices,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">חשבוניות דוגמה</h1>
        <p className="text-sm text-muted-foreground mt-1">
          הפלט שבוריס מצפה שהמערכת תפיק - SKU פנימי + כמות + קוד Priority. דוגמאות מ-26/05/2026 לאישור הפורמט.
        </p>
      </div>

      {isLoading && <Skeleton className="h-64" />}

      <div className="space-y-4">
        {(data ?? []).map((inv) => (
          <Card key={inv.customer_number}>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
              <div>
                <span className="font-mono font-semibold text-primary">{inv.customer_number}</span>
                <span className="font-semibold mr-3">{inv.customer_name}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-mono mr-3">{inv.date}</span>
                <span>{inv.lines.length} פריטים</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU פנימי</TableHead>
                    <TableHead className="text-right">כמות</TableHead>
                    <TableHead>קוד Priority</TableHead>
                    <TableHead>סטטוס</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inv.lines.map((l, i) => {
                    const mapped = l.priority_sku && !l.priority_sku.includes(" ") && /^\d{3}-/.test(l.priority_sku);
                    return (
                      <TableRow key={i}>
                        <TableCell>{l.sku}</TableCell>
                        <TableCell className="text-right font-mono">{l.quantity}</TableCell>
                        <TableCell className="font-mono text-xs">{l.priority_sku ?? "—"}</TableCell>
                        <TableCell>
                          {mapped
                            ? <Badge variant="outline" className="text-green-600 border-green-500">מופה</Badge>
                            : <Badge variant="outline" className="text-orange-500 border-orange-500">חסר קוד</Badge>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
