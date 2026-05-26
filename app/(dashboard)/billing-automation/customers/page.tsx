"use client";
/**
 * @module app/(dashboard)/billing-automation/customers/page
 * Meteorit billing-automation — Customers list.
 */
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchBillingCustomers } from "@/lib/api/billing-automation";

const ils = (n: number) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 2 }).format(n);

export default function BillingCustomersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["billing-automation", "customers"],
    queryFn: fetchBillingCustomers,
  });
  const [search, setSearch] = useState("");
  const rows = (data ?? []).filter(
    (c) => !search || c.number.includes(search) || (c.name && c.name.includes(search)),
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">לקוחות</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {data?.length ?? "..."} לקוחות עם תעריפים שחולצו מהחשבוניות
        </p>
      </div>

      <Input
        placeholder="חיפוש לפי מספר/שם לקוח..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>מס&apos; לקוח</TableHead>
              <TableHead>שם</TableHead>
              <TableHead className="text-right"># שירותים</TableHead>
              <TableHead className="text-right"># חשבוניות</TableHead>
              <TableHead className="text-right">סה&quot;כ חודשי</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={6}><Skeleton className="h-5 w-full" /></TableCell>
              </TableRow>
            ))}
            {!isLoading && rows.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">אין תוצאות</TableCell></TableRow>
            )}
            {rows.map((c) => (
              <TableRow key={c.number}>
                <TableCell className="font-mono">{c.number}</TableCell>
                <TableCell>{c.name || <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell className="text-right">{c.sku_count}</TableCell>
                <TableCell className="text-right">{c.invoice_count}</TableCell>
                <TableCell className="text-right font-medium">{c.total_ils > 0 ? ils(c.total_ils) : "—"}</TableCell>
                <TableCell>
                  <Link href={`/billing-automation/customers/${c.number}`} className="text-primary hover:underline text-sm">
                    פתח →
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
