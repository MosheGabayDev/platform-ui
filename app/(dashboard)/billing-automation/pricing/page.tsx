"use client";

export default function PricingPage() {
  const rules = [
    { id: 1, customer: "ADI Systems", product: "M365 Business Basic", unit_price: "5.50", currency: "USD", valid_from: "2026-01-01" },
    { id: 2, customer: "A.Y+Zemach", product: "Acronis Backup", markup_pct: "20", currency: "ILS", valid_from: "2026-01-01" },
  ];

  return (
    <main className="p-6 space-y-6" data-testid="ba-pricing-page">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">כללי תמחור</h1>
        <button className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90">
          כלל חדש
        </button>
      </header>
      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-right">
            <tr>
              <th className="px-4 py-2">לקוח</th>
              <th className="px-4 py-2">מוצר</th>
              <th className="px-4 py-2">מחיר ליחידה</th>
              <th className="px-4 py-2">תוספת %</th>
              <th className="px-4 py-2">מטבע</th>
              <th className="px-4 py-2">תקף מ-</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2">{r.customer}</td>
                <td className="px-4 py-2">{r.product}</td>
                <td className="px-4 py-2 font-mono">{r.unit_price ?? "—"}</td>
                <td className="px-4 py-2 font-mono">{r.markup_pct ? `${r.markup_pct}%` : "—"}</td>
                <td className="px-4 py-2">{r.currency}</td>
                <td className="px-4 py-2 font-mono">{r.valid_from}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
