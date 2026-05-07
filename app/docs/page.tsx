"use client";
/**
 * @module app/docs/page
 * Documentation landing page — public, scaffolded as a routing skeleton
 * for tech-writing to fill during the pilot programme.
 *
 * Spec: docs/system-upgrade/PRODUCT_LAUNCH_PLAN.md §7 task 10.07.
 *
 * Sits at /docs, outside the (dashboard) group so it works without
 * auth (anonymous browsing). Each section card links to a future
 * sub-route — those routes don't exist yet and will fall through to
 * the (dashboard) catch-all once we add MDX rendering.
 *
 * The actual content is owned by the tech-writing track (10.07 +
 * 10.08); this file is the entry point + structure. Updating a
 * section's title/description goes through the i18n catalog only.
 */

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Rocket,
  ShieldCheck,
  Bot,
  Code,
  Sparkles,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const SECTIONS: Array<{ key: string; href: string; icon: LucideIcon }> = [
  { key: "gettingStarted", href: "/docs/getting-started", icon: Rocket },
  { key: "adminGuide", href: "/docs/admin", icon: ShieldCheck },
  { key: "aiGuide", href: "/docs/ai", icon: Bot },
  { key: "apiReference", href: "/docs/api", icon: Code },
  { key: "releaseNotes", href: "/docs/releases", icon: Sparkles },
];

export default function DocsLandingPage() {
  const t = useTranslations("docs");
  const tSections = useTranslations("docs.sections");

  return (
    <main className="min-h-screen bg-background py-12 px-4 md:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Platform Engineer
        </Link>

        <header className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-base text-muted-foreground max-w-2xl">{t("subtitle")}</p>
        </header>

        <p className="text-sm leading-relaxed max-w-2xl">{t("intro")}</p>

        <div className="grid gap-3 md:grid-cols-2">
          {SECTIONS.map(({ key, href, icon: Icon }) => (
            <Link
              key={key}
              href={href}
              className="group rounded-xl border border-border/60 px-5 py-4 hover:border-primary/40 hover:bg-muted/30 transition-colors"
              data-testid={`docs-section-${key}`}
            >
              <div className="flex items-start gap-3">
                <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="size-4 text-primary" aria-hidden />
                </div>
                <div className="flex-1 space-y-1 min-w-0">
                  <h2 className="text-sm font-semibold flex items-center gap-1.5">
                    {tSections(`${key}.title`)}
                    {/* RTL-safe slide; see /legal/page.tsx comment. */}
                    <ArrowRight className="size-3 opacity-0 -translate-x-1 rtl:translate-x-1 rtl:-scale-x-100 group-hover:opacity-50 group-hover:translate-x-0 rtl:group-hover:translate-x-0 transition-all" />
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {tSections(`${key}.description`)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
          {t("comingSoon")}
        </div>

        <p className="text-xs text-muted-foreground/70 max-w-2xl">{t("footer")}</p>
      </div>
    </main>
  );
}
