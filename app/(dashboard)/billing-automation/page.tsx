"use client";
/**
 * @module app/(dashboard)/billing-automation/page
 * Meteorit billing-automation — Dashboard.
 *
 * Mounted under the platform-ui chrome (NextAuth + RBAC + i18n).
 * Data comes from the standalone Flask backend at
 * billing-automation.platform.svc.cluster.local:5001 via the auth proxy.
 *
 * Module gating: requires "billing-automation" enabled for the user's org.
 */

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { FileText, Users, DollarSign, ListChecks, Tag, Receipt } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchBillingDashboard } from "@/lib/api/billing-automation";

const ils = (n: number) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);

function Kpi({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

const QUICK_LINKS = [
  { href: "/billing-automation/customers", icon: Users, label: "לקוחות", desc: "תעריפים פר-לקוח וחשבוניות היסטוריות" },
  { href: "/billing-automation/sku-mapping", icon: Tag, label: "מיפוי SKU → Priority", desc: "טבלת המאסטר של בוריס" },
  { href: "/billing-automation/sample-invoices", icon: Receipt, label: "חשבוניות דוגמה", desc: "הפלט שבוריס מצפה לקבל" },
  { href: "/billing-automation/pricing", icon: ListChecks, label: "תעריפים", desc: "סטטיסטיקות פיזור מחירים פר-SKU" },
];

export default function BillingAutomationDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["billing-automation", "dashboard"],
    queryFn: fetchBillingDashboard,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">אוטומציית חיוב — Meteorit MSP</h1>
        <p className="text-sm text-muted-foreground mt-1">
          נתונים שחולצו מ-{data?.invoices ?? "..."} חשבוניות היסטוריות. החל מהחודש הבא ימולאו אוטומטית מקבצי הספקים.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
          </>
        ) : data ? (
          <>
            <Kpi icon={FileText} label="חשבוניות בחודש" value={String(data.invoices)} sub={`${data.invoices_with_lines} עם פריטים`} />
            <Kpi icon={Users} label="לקוחות פעילים" value={String(data.customers)} sub={`${data.tariff_entries} תעריפים`} />
            <Kpi icon={DollarSign} label="הכנסות חודשיות" value={ils(data.total_ils)} sub={`${data.total_line_items} פריטי חיוב`} />
            <Kpi icon={ListChecks} label="ממוצע פר לקוח" value={ils(data.avg_per_customer_ils)} sub={`${data.unique_skus} שירותים שונים`} />
          </>
        ) : null}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">קיצורי דרך</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="block">
              <Card className="hover:border-primary/50 transition cursor-pointer h-full">
                <CardHeader>
                  <l.icon className="h-6 w-6 text-primary mb-2" />
                  <CardTitle className="text-base">{l.label}</CardTitle>
                  <CardDescription className="text-xs">{l.desc}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">מקור הנתונים</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <div>📄 חשבוניות היסטוריות — 401 עמודי PDF מבוריס מטאורית</div>
          <div>🔧 חולץ אוטומטית עם <code className="text-xs bg-muted px-1 rounded">scripts/extraction/extract_invoices_pdf.py</code></div>
          <div>🏷️ מיפוי SKU → Priority — <code className="text-xs bg-muted px-1 rounded">billing-skus.xlsx</code> של בוריס (187 שורות)</div>
          <div>💾 שמירה: 15 טבלאות <code className="text-xs bg-muted px-1 rounded">meteorit_*</code> ב-<code className="text-xs bg-muted px-1 rounded">platform_db</code></div>
        </CardContent>
      </Card>
    </div>
  );
}
