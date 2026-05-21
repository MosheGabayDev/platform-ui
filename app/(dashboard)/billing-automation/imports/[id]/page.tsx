"use client";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { fetchPendingMatches, resolvePendingMatch } from "@/lib/api/billing-automation";

type TabKey = "summary" | "matches" | "anomalies" | "invoices";

export default function ImportDetailPage() {
  const params = useParams<{ id: string }>();
  const importId = Number(params.id);
  const { data: pending = [], refetch } = useQuery({
    queryKey: ["billing-automation", "pending", importId],
    queryFn: () => fetchPendingMatches(importId),
  });
  const [tab, setTab] = useState<TabKey>("summary");

  return (
    <main className="p-6 space-y-6" data-testid="import-detail-page">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ייבוא חודשי #{importId}</h1>
      </header>

      <nav className="flex gap-1 border-b">
        {([
          ["summary", "סיכום"],
          ["matches", `התאמות ממתינות (${pending.length})`],
          ["anomalies", "חריגות"],
          ["invoices", "טיוטות חשבונית"],
        ] as Array<[TabKey, string]>).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm ${tab === k ? "border-b-2 border-primary font-medium" : "text-muted-foreground"}`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "summary" && (
        <div className="rounded-xl border bg-card p-6">
          <p className="text-muted-foreground">
            אזור העלאת קבצים. גרור קבצי xlsx/csv או לחץ לבחירה.
          </p>
          <div className="mt-4 rounded border-2 border-dashed p-8 text-center">
            <input type="file" multiple accept=".xlsx,.csv,.xls" className="block mx-auto" />
            <p className="text-xs text-muted-foreground mt-2">נתמך: xlsx, csv, xls (מרובה)</p>
          </div>
        </div>
      )}

      {tab === "matches" && (
        <div className="space-y-3">
          {pending.length === 0 && <p className="text-muted-foreground">אין התאמות ממתינות 🎉</p>}
          {pending.map((p) => (
            <div key={p.id} className="rounded-xl border bg-card p-4">
              <div className="font-semibold mb-2">{p.alias_raw}</div>
              {p.external_id && (
                <div className="text-xs text-muted-foreground font-mono mb-2">ID: {p.external_id}</div>
              )}
              <div className="space-y-1">
                {p.suggestions.map((s) => (
                  <button
                    key={s.customer_id}
                    onClick={async () => {
                      await resolvePendingMatch(p.id, s.customer_id);
                      refetch();
                    }}
                    className="w-full text-right flex items-center justify-between rounded border px-3 py-2 hover:bg-accent"
                  >
                    <span>{s.name}</span>
                    <span className="text-xs text-muted-foreground">דמיון {(s.score * 100).toFixed(0)}%</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "anomalies" && <p className="text-muted-foreground">רשימת חריגות (placeholder).</p>}
      {tab === "invoices" && <p className="text-muted-foreground">תצוגה מקדימה של טיוטות חשבונית (placeholder).</p>}
    </main>
  );
}
