"use client";
/**
 * @module components/shared/legal-page
 * Shared scaffold for the public /legal/* pages (terms, privacy, sla,
 * security). All four pages had ~90% structural duplication; this
 * primitive collapses them to a config object.
 *
 * Spec: PRODUCT_LAUNCH_PLAN.md §4 (cross-cutting refactor).
 *
 * Adding a new legal page now = `<LegalPage namespace="legal.foo"
 * sectionKeys={[...]} icon={Foo} />` plus the matching i18n catalog
 * entries. Per-page custom content (e.g. SLA's tier matrix) goes in
 * `extraBeforeSections` / `extraAfterSections`.
 */

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Mail, AlertCircle } from "lucide-react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export interface LegalPageProps {
  /** Top-level i18n namespace (e.g. "legal.terms"). */
  namespace: string;
  /** Section keys rendered in order under `<namespace>.sections.*`. */
  sectionKeys: readonly string[];
  /** Header icon (defaults to ShieldCheck). */
  icon: LucideIcon;
  /**
   * When true, renders the standard amber DRAFT banner. Pages with
   * unfinalised legal copy MUST set this; the banner is the visible
   * cue for Legal team to remove on sign-off.
   */
  draft?: boolean;
  /** Optional content rendered between intro paragraph and section list. */
  extraBeforeSections?: ReactNode;
  /** Optional content rendered after the section list. */
  extraAfterSections?: ReactNode;
}

export function LegalPage({
  namespace,
  sectionKeys,
  icon: Icon,
  draft = false,
  extraBeforeSections,
  extraAfterSections,
}: LegalPageProps) {
  const t = useTranslations(namespace);

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
            <Icon className="size-7 text-primary" aria-hidden />
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          <p className="text-xs text-muted-foreground/70">{t("lastUpdated")}</p>
        </header>

        {draft && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400"
          >
            <AlertCircle className="size-4 shrink-0 mt-0.5" aria-hidden />
            <p>{t("draftNotice")}</p>
          </div>
        )}

        <p className="text-sm leading-relaxed">{t("intro")}</p>

        {extraBeforeSections}

        <div className="space-y-4">
          {sectionKeys.map((key) => (
            <section key={key} className="rounded-xl border border-border/60 px-5 py-4 space-y-2">
              <h2 className="text-base font-semibold">{t(`sections.${key}.title`)}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t(`sections.${key}.body`)}
              </p>
            </section>
          ))}
        </div>

        {extraAfterSections}

        <ContactLine namespace={namespace} />
      </div>
    </main>
  );
}

/**
 * Optional contact-mailto line. Renders nothing if the namespace does
 * not declare a `contact` key (e.g. /legal/security uses its PGP block
 * instead via `extraAfterSections`).
 */
function ContactLine({ namespace }: { namespace: string }) {
  const t = useTranslations(namespace);
  // next-intl throws on missing keys when the IntlProvider is configured
  // with `onError: throw` (test mode). Wrap with `t.has` if available;
  // otherwise check via raw JSON traversal upstream — for now we expose
  // an explicit `contact` opt-in pattern: if a page does not need the
  // line, omit the catalog key AND skip <ContactLine>. To keep the
  // scaffold universal we render only when `contact` is non-empty —
  // controlled by the page passing namespaces that include `contact`.
  let value: string | null = null;
  try {
    value = t("contact");
  } catch {
    return null;
  }
  if (!value) return null;
  return (
    <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
      <Mail className="size-3.5" aria-hidden />
      {value}
    </p>
  );
}
