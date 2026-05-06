/**
 * @module i18n/config
 * Locale registry — the platform's single source of truth for which
 * languages exist, which is the default, and which are RTL.
 *
 * Spec: docs/system-upgrade/PLATFORM_HARDENING_PLAN.md Track E
 */

export const LOCALES = ["he", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "he";

/** Right-to-left locales — drives `<html dir>`. */
const RTL_LOCALES = new Set<Locale>(["he"]);

export function isRtl(locale: Locale): boolean {
  return RTL_LOCALES.has(locale);
}

/** Display name for the language switcher (always rendered in its own script). */
export const LOCALE_LABELS: Record<Locale, string> = {
  he: "עברית",
  en: "English",
};

/** Short tag for compact UI (e.g. topbar pill). */
export const LOCALE_TAGS: Record<Locale, string> = {
  he: "HE",
  en: "EN",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
