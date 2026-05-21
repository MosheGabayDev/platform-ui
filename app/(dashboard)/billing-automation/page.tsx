"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { fetchDashboard, fetchImports } from "@/lib/api/billing-automation";

export default function BillingAutomationDashboard() {
  const { data: dash } = useQuery({
    queryKey: ["billing-automation", "dashboard"],
    queryFn: fetchDashboard,
  });
  const { data: imports } = useQuery({
    queryKey: ["billing-automation", "imports"],
    queryFn: fetchImports,
  });

  return (
    <main className="p-6 space-y-6" data-testid="billing-automation-dashboard">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">אוטומציית חיוב</h1>
        <Link
          href="/billing-automation/imports/new"
          className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
        >
          ייבוא חודשי חדש
        </Link>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="הכנסות החודש (ILS)" value={dash?.totals_by_currency?.ILS ?? "0"} />
        <Kpi label="הכנסות החודש (USD)" value={dash?.totals_by_currency?.USD ?? "0"} />
        <Kpi label="לקוחות מחויבים" value={String(dash?.customers_billed ?? 0)} />
        <Kpi label="חריגות פתוחות" value={String(dash?.anomalies_open ?? 0)} />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">ייבואים אחרונים</h2>
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-right">
              <tr>
                <th className="px-4 py-2">תקופה</th>
                <th className="px-4 py-2">סטטוס</th>
                <th className="px-4 py-2">קבצים</th>
                <th className="px-4 py-2">שורות</th>
                <th className="px-4 py-2">לא משויכים</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {(imports ?? []).map((imp) => (
                <tr key={imp.id} className="border-t">
                  <td className="px-4 py-2 font-mono">{imp.period}</td>
                  <td className="px-4 py-2">{imp.status}</td>
                  <td className="px-4 py-2">{imp.file_count}</td>
                  <td className="px-4 py-2">{imp.row_count_normalized}</td>
                  <td className="px-4 py-2">{imp.unmatched_customers}</td>
                  <td className="px-4 py-2">
                    <Link href={`/billing-automation/imports/${imp.id}`} className="text-primary hover:underline">
                      פתח →
                    </Link>
                  </td>
                </tr>
              ))}
              {imports?.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">אין ייבואים עדיין</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
