"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchCustomers } from "@/lib/api/billing-automation";

export default function CustomersPage() {
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["billing-automation", "customers"],
    queryFn: fetchCustomers,
  });

  return (
    <main className="p-6 space-y-6" data-testid="ba-customers-page">
      <h1 className="text-2xl font-bold">לקוחות (אוטומציית חיוב)</h1>
      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-right">
            <tr>
              <th className="px-4 py-2">קוד Priority</th>
              <th className="px-4 py-2">שם</th>
              <th className="px-4 py-2">שם בעברית</th>
              <th className="px-4 py-2">מטבע</th>
              <th className="px-4 py-2">מע"מ</th>
              <th className="px-4 py-2">סטטוס</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">טוען…</td></tr>
            )}
            {customers.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="px-4 py-2 font-mono">{c.priority_customer_code ?? "—"}</td>
                <td className="px-4 py-2">{c.name_canonical}</td>
                <td className="px-4 py-2">{c.name_hebrew ?? "—"}</td>
                <td className="px-4 py-2">{c.billing_currency}</td>
                <td className="px-4 py-2">{c.vat_rate}%</td>
                <td className="px-4 py-2">{c.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
