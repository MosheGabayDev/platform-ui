"use client";
/**
 * @module app/legal/security/page
 * Vulnerability disclosure policy — public, unauthenticated.
 *
 * Spec: docs/system-upgrade/PRODUCT_LAUNCH_PLAN.md §4 task 7.10.
 *
 * Living at /legal/security so security researchers can find it via
 * the conventional `security.txt` redirect (when 8.10 ops task lands)
 * and via the public site footer. Deliberately outside the (dashboard)
 * group — no auth gating.
 */

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Shield, Mail } from "lucide-react";

const SECTIONS = ["report", "scope", "outOfScope", "safeHarbor"] as const;

export default function SecurityPage() {
  const t = useTranslations("legal.security");

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
            <Shield className="size-7 text-primary" aria-hidden />
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          <p className="text-xs text-muted-foreground/70">{t("lastUpdated")}</p>
        </header>

        <p className="text-sm leading-relaxed">{t("intro")}</p>

        <div className="space-y-6">
          {SECTIONS.map((key) => (
            <section key={key} className="rounded-xl border border-border/60 px-5 py-4 space-y-2">
              <h2 className="text-base font-semibold">{t(`sections.${key}.title`)}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t(`sections.${key}.body`)}
              </p>
            </section>
          ))}
        </div>

        <div className="rounded-lg border border-border/40 bg-muted/30 px-4 py-3 space-y-1.5">
          <p className="text-xs font-mono">{t("pgp")}</p>
          <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
            <Mail className="size-3.5" aria-hidden />
            <a href="mailto:security@platform.local" className="text-primary hover:underline">
              security@platform.local
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
