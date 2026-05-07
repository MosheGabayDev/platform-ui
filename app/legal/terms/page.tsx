"use client";
/**
 * @module app/legal/terms/page
 * Terms of Service — public, unauthenticated.
 *
 * Spec: docs/system-upgrade/PRODUCT_LAUNCH_PLAN.md §4 task 7.01.
 *
 * DRAFT banner is non-negotiable until Legal team finalises wording.
 * Structure mirrors /legal/sla so all four legal pages feel uniform.
 */

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, FileText, Mail, AlertCircle } from "lucide-react";

const SECTIONS = [
  "account",
  "acceptableUse",
  "payment",
  "ip",
  "ai",
  "termination",
  "governingLaw",
] as const;

export default function TermsPage() {
  const t = useTranslations("legal.terms");

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
            <FileText className="size-7 text-primary" aria-hidden />
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
