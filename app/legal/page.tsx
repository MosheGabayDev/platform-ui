"use client";
/**
 * @module app/legal/page
 * Legal index — public landing for /legal/*. Lists every legal page in
 * one place so footers / DPA reviewers / procurement teams can find
 * them all without guessing URLs.
 *
 * Spec: PRODUCT_LAUNCH_PLAN.md §4 (cross-cutting; not a numbered task,
 * but a natural completion of the legal-pages family from 7.04 / 7.10
 * / 7.13 / 7.01 / 7.02 / 9.07).
 */

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  ShieldCheck,
  ShieldAlert,
  Network,
  Mail,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const CARDS: Array<{ key: string; href: string; icon: LucideIcon }> = [
  { key: "terms", href: "/legal/terms", icon: FileText },
  { key: "privacy", href: "/legal/privacy", icon: ShieldCheck },
  { key: "sla", href: "/legal/sla", icon: ShieldCheck },
  { key: "security", href: "/legal/security", icon: ShieldAlert },
  { key: "subprocessors", href: "/legal/subprocessors", icon: Network },
];

export default function LegalIndexPage() {
  const t = useTranslations("legal.index");
  const tCards = useTranslations("legal.index.cards");

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
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </header>

        <p className="text-sm leading-relaxed">{t("intro")}</p>

        <div className="grid gap-3 md:grid-cols-2">
          {CARDS.map(({ key, href, icon: Icon }) => (
            <Link
              key={key}
              href={href}
              className="group rounded-xl border border-border/60 px-5 py-4 hover:border-primary/40 hover:bg-muted/30 transition-colors"
              data-testid={`legal-card-${key}`}
            >
              <div className="flex items-start gap-3">
                <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="size-4 text-primary" aria-hidden />
                </div>
                <div className="flex-1 space-y-1 min-w-0">
                  <h2 className="text-sm font-semibold flex items-center gap-1.5">
                    {tCards(`${key}.title`)}
                    {/*
                      RTL-safe hover: ArrowRight slides toward the end
                      (right in LTR, left in RTL). `rtl:-scale-x-100`
                      flips the arrowhead so it points correctly per
                      direction; the rtl:translate-* pair re-anchors
                      the resting + hover positions to the start side.
                    */}
                    <ArrowRight className="size-3 opacity-0 -translate-x-1 rtl:translate-x-1 rtl:-scale-x-100 group-hover:opacity-50 group-hover:translate-x-0 rtl:group-hover:translate-x-0 transition-all" />
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {tCards(`${key}.description`)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
          <Mail className="size-3.5" aria-hidden />
          {t("generalContact")}
        </p>
      </div>
    </main>
  );
}
