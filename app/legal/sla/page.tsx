"use client";
/**
 * @module app/legal/sla/page
 * Service Level Agreement — public, unauthenticated.
 *
 * Spec: docs/system-upgrade/PRODUCT_LAUNCH_PLAN.md §6 task 9.07.
 *
 * Sales-facing page: prospects + procurement teams visit this directly
 * during enterprise evaluation. Document is a baseline that Legal team
 * finalises before launch — DRAFT banner makes that explicit so we
 * don't accidentally ship un-reviewed legal commitments.
 */

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, ShieldCheck, Mail, AlertCircle } from "lucide-react";

const SECTIONS = ["uptime", "response", "credits", "exclusions"] as const;
const TIER_ROWS = ["free", "pro", "enterprise"] as const;

export default function SlaPage() {
  const t = useTranslations("legal.sla");
  const tCols = useTranslations("legal.sla.table.columns");
  const tRows = useTranslations("legal.sla.table.rows");

  return (
    <main className="min-h-screen bg-background py-12 px-4 md:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Platform Engineer
        </Link>

        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <ShieldCheck className="size-7 text-primary" aria-hidden />
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          <p className="text-xs text-muted-foreground/70">{t("lastUpdated")}</p>
        </header>

        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400"
        >
          <AlertCircle className="size-4 shrink-0 mt-0.5" aria-hidden />
          <p>{t("draftNotice")}</p>
        </div>

        <p className="text-sm leading-relaxed">{t("intro")}</p>

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

        <div className="space-y-4">
          {SECTIONS.map((key) => (
            <section key={key} className="rounded-xl border border-border/60 px-5 py-4 space-y-2">
              <h2 className="text-base font-semibold">{t(`sections.${key}.title`)}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t(`sections.${key}.body`)}
              </p>
            </section>
          ))}
        </div>

        <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
          <Mail className="size-3.5" aria-hidden />
          {t("contact")}
        </p>
      </div>
    </main>
  );
}
