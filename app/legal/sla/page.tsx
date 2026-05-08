"use client";
/**
 * @module app/legal/sla/page
 * SLA contract. Spec: PRODUCT_LAUNCH_PLAN.md §6 task 9.07.
 *
 * Refactored 2026-05-08 to use the shared <LegalPage> scaffold.
 * The 3-tier availability matrix is the only SLA-specific content
 * and lives in `extraBeforeSections`.
 */

import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { LegalPage } from "@/components/shared/legal-page";

const SECTIONS = ["uptime", "response", "credits", "exclusions"] as const;
const TIER_ROWS = ["free", "pro", "enterprise"] as const;

function AvailabilityMatrix() {
  const t = useTranslations("legal.sla");
  const tCols = useTranslations("legal.sla.table.columns");
  const tRows = useTranslations("legal.sla.table.rows");
  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      <div className="px-5 py-3 border-b border-border/40">
        <h2 className="text-sm font-semibold">{t("table.title")}</h2>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="text-start px-4 py-2 font-semibold">{tCols("tier")}</th>
            <th className="text-start px-4 py-2 font-semibold">{tCols("uptime")}</th>
            <th className="text-start px-4 py-2 font-semibold">{tCols("credits")}</th>
            <th className="text-start px-4 py-2 font-semibold">{tCols("responseP1")}</th>
          </tr>
        </thead>
        <tbody>
          {TIER_ROWS.map((tier) => (
            <tr key={tier} className="border-t border-border/40">
              <td className="px-4 py-3 font-medium">{tRows(`${tier}.tier`)}</td>
              <td className="px-4 py-3 text-muted-foreground">{tRows(`${tier}.uptime`)}</td>
              <td className="px-4 py-3 text-muted-foreground">{tRows(`${tier}.credits`)}</td>
              <td className="px-4 py-3 text-muted-foreground">{tRows(`${tier}.responseP1`)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SlaPage() {
  return (
    <LegalPage
      namespace="legal.sla"
      icon={ShieldCheck}
      sectionKeys={SECTIONS}
      draft
      extraBeforeSections={<AvailabilityMatrix />}
    />
  );
}
