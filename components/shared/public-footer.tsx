"use client";
/**
 * @module components/shared/public-footer
 * Public footer for unauthenticated surfaces (login, signup, /legal/*,
 * /docs). Surfaces the legal index + per-page shortcuts so anonymous
 * visitors can find ToS / Privacy / Security without prior URL knowledge.
 *
 * Spec: PRODUCT_LAUNCH_PLAN.md §4 (cross-cutting; companion to legal
 * index page from batch 7).
 *
 * Deliberately NOT mounted in the (dashboard) layout — authenticated
 * users have the sidebar/topbar; the public footer is the landing for
 * the prospect funnel.
 */

import Link from "next/link";
import { useTranslations } from "next-intl";

const LINKS: Array<{ key: string; href: string }> = [
  { key: "legal", href: "/legal" },
  { key: "privacy", href: "/legal/privacy" },
  { key: "terms", href: "/legal/terms" },
  { key: "security", href: "/legal/security" },
  { key: "docs", href: "/docs" },
];

export function PublicFooter() {
  const t = useTranslations("footer");
  const tLinks = useTranslations("footer.links");

  return (
    <footer className="border-t border-border/40 mt-12 py-6 px-4">
      <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{t("copyright")}</span>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {LINKS.map(({ key, href }) => (
            <Link
              key={key}
              href={href}
              className="hover:text-foreground transition-colors"
              data-testid={`footer-link-${key}`}
            >
              {tLinks(key)}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
