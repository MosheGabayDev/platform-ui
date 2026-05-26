"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchBillingSkus } from "@/lib/api/billing-automation";

const fmt = (n: number, ccy: string) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: ccy, maximumFractionDigits: 2 }).format(n);

export default function BillingPricingPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["billing-automation", "skus"],
    queryFn: fetchBillingSkus,
  });
  const [search, setSearch] = useState("");
  const rows = (data ?? []).filter((s) => !search || s.sku.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">תעריפים — סטטיסטיקות</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {data?.length ?? "..."} שירותים שונים. min/max/ממוצע מחושבים על פני {data ? data.reduce((s, x) => s + x.customers, 0) : "..."} עסקאות פר-לקוח.
        </p>
      </div>

      <Input
        placeholder="חיפוש לפי קוד SKU..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>קוד SKU</TableHead>
              <TableHead>מטבע</TableHead>
              <TableHead className="text-right">לקוחות</TableHead>
              <TableHead className="text-right">מחיר מינ&apos;</TableHead>
              <TableHead className="text-right">ממוצע</TableHead>
              <TableHead className="text-right">מחיר מקס&apos;</TableHead>
              <TableHead className="text-right">פיזור</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-5" /></TableCell></TableRow>
            ))}
            {rows.map((s) => {
              const spread = s.max > 0 ? ((s.max - s.min) / s.max) * 100 : 0;
              const colorClass = spread > 50 ? "text-orange-500" : spread > 20 ? "text-yellow-600" : "text-muted-foreground";
              return (
                <TableRow key={`${s.sku}|${s.currency}`}>
                  <TableCell className="font-mono text-xs">{s.sku}</TableCell>
                  <TableCell>{s.currency}</TableCell>
                  <TableCell className="text-right">{s.customers}</TableCell>
                  <TableCell className="text-right">{fmt(s.min, s.currency)}</TableCell>
                  <TableCell className="text-right font-medium">{fmt(s.avg, s.currency)}</TableCell>
                  <TableCell className="text-right">{fmt(s.max, s.currency)}</TableCell>
                  <TableCell className={`text-right ${colorClass}`}>{spread > 0 ? `${spread.toFixed(0)}%` : "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <p className="text-xs text-muted-foreground">
        💡 פיזור גבוה = לקוחות שונים משלמים מחירים שונים מאוד עבור אותו שירות. דורש סקירה.
      </p>
    </div>
  );
}
