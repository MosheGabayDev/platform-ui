"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createImport } from "@/lib/api/billing-automation";

export default function NewImportPage() {
  const router = useRouter();
  const today = new Date();
  const [period, setPeriod] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`,
  );
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const { id } = await createImport(period);
      router.push(`/billing-automation/imports/${id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl p-6 space-y-6" data-testid="new-import-page">
      <h1 className="text-2xl font-bold">ייבוא חודשי חדש</h1>
      <div className="space-y-2">
        <label className="block text-sm">חודש החיוב</label>
        <input
          type="date"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="w-full rounded border bg-background px-3 py-2"
        />
      </div>
      <button
        onClick={submit}
        disabled={busy}
        className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
      >
        {busy ? "יוצר…" : "צור ייבוא"}
      </button>
    </main>
  );
}
