"use client";
/**
 * @module app/legal/subprocessors/page
 * Public subprocessor list — DPA / GDPR transparency requirement.
 *
 * Spec: docs/system-upgrade/PRODUCT_LAUNCH_PLAN.md §4 task 7.13.
 *
 * Route is OUTSIDE the (dashboard) group so unauthenticated visitors
 * (and search engines) can read it. Inherits only the root layout.
 *
 * Data lives in i18n catalogs so legal team can adjust copy per locale
 * without touching code; structure of providers is data, not copy, so
 * the keys list is the source of truth.
 */

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Mail } from "lucide-react";

const PROVIDER_KEYS = ["openai", "anthropic", "aws", "stripe", "sentry", "postmark"] as const;

const PROVIDER_NAMES: Record<(typeof PROVIDER_KEYS)[number], string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  aws: "Amazon Web Services",
  stripe: "Stripe",
  sentry: "Sentry",
  postmark: "Postmark",
};

export default function SubprocessorsPage() {
  const t = useTranslations("legal.subprocessors");
  const tHeaders = useTranslations("legal.subprocessors.headers");
  const tProviders = useTranslations("legal.subprocessors.providers");

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
          <p className="text-xs text-muted-foreground/70">{t("lastUpdated")}</p>
        </header>

        <p className="text-sm leading-relaxed">{t("intro")}</p>

        <div className="rounded-xl border border-border/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-start px-4 py-3 font-semibold">{tHeaders("name")}</th>
                <th className="text-start px-4 py-3 font-semibold">{tHeaders("purpose")}</th>
                <th className="text-start px-4 py-3 font-semibold">{tHeaders("dataTypes")}</th>
                <th className="text-start px-4 py-3 font-semibold">{tHeaders("region")}</th>
              </tr>
            </thead>
            <tbody>
              {PROVIDER_KEYS.map((key) => (
                <tr key={key} className="border-t border-border/40">
                  <td className="px-4 py-3 font-medium">{PROVIDER_NAMES[key]}</td>
                  <td className="px-4 py-3 text-muted-foreground">{tProviders(`${key}.purpose`)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{tProviders(`${key}.dataTypes`)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{tProviders(`${key}.region`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5 pt-2">
          <Mail className="size-3.5" aria-hidden />
          {t("contact")}
        </p>
      </div>
    </main>
  );
}
