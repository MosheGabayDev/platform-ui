"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { use } from "react";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchBillingCustomer } from "@/lib/api/billing-automation";

const fmt = (n: number, ccy: string) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: ccy, maximumFractionDigits: 2 }).format(n);

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useQuery({
    queryKey: ["billing-automation", "customer", id],
    queryFn: () => fetchBillingCustomer(id),
  });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-12 w-1/2" /><Skeleton className="h-96" /></div>;
  if (!data?.customer) return <div>לקוח לא נמצא</div>;

  const { customer, tariffs, invoices } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <Link href="/billing-automation/customers" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
            <ArrowRight className="h-3 w-3" /> חזרה ללקוחות
          </Link>
          <h1 className="text-2xl font-bold mt-2">{customer.name || `לקוח ${customer.number}`}</h1>
          <p className="text-sm text-muted-foreground mt-1">מספר לקוח: <span className="font-mono">{customer.number}</span></p>
        </div>
        <div className="text-right">
          {customer.total_ils > 0 && <div className="text-2xl font-bold">{fmt(customer.total_ils, "ILS")}</div>}
          <div className="text-xs text-muted-foreground">סה&quot;כ חודשי · {customer.invoice_count} חשבונית/ות</div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">תעריפים פר שירות ({tariffs.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>קוד Priority</TableHead>
                <TableHead>מטבע</TableHead>
                <TableHead className="text-right">מחיר ליחידה</TableHead>
                <TableHead className="text-right">כמות אחרונה</TableHead>
                <TableHead className="text-right">הנחה %</TableHead>
                <TableHead className="text-right">סה&quot;כ חודשי</TableHead>
                <TableHead>חשבונית אחרונה</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tariffs.map((t, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-xs">{t.sku}</TableCell>
                  <TableCell>{t.unit_price_currency ?? t.currency}</TableCell>
                  <TableCell className="text-right">{fmt(t.unit_price, t.unit_price_currency ?? t.currency)}</TableCell>
                  <TableCell className="text-right">{t.last_quantity}</TableCell>
                  <TableCell className="text-right">{t.discount_pct > 0 ? `${t.discount_pct}%` : "—"}</TableCell>
                  <TableCell className="text-right font-medium">{fmt(t.unit_price * t.last_quantity, t.unit_price_currency ?? t.currency)}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{t.last_invoice}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-3">חשבוניות ({invoices.length})</h2>
        <div className="space-y-3">
          {invoices.map((inv) => (
            <Card key={inv.invoice_id}>
              <CardHeader className="pb-3">
                <details>
                  <summary className="cursor-pointer flex items-center justify-between flex-wrap gap-2 list-none">
                    <div>
                      <span className="font-mono font-semibold text-primary">{inv.invoice_id}</span>
                      <span className="text-sm text-muted-foreground mr-3">{inv.date}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{inv.lines.length} פריטים</span>
                  </summary>
                  <Table className="mt-3">
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">כמות</TableHead>
                        <TableHead className="text-right">מחיר</TableHead>
                        <TableHead className="text-right">סה&quot;כ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inv.lines.map((l, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{l.sku}</TableCell>
                          <TableCell className="text-right">{l.quantity}</TableCell>
                          <TableCell className="text-right">{fmt(l.unit_price, l.unit_price_currency ?? l.currency)}</TableCell>
                          <TableCell className="text-right">{fmt(l.subtotal, l.currency)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </details>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
