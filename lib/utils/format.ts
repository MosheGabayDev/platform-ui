/**
 * @module lib/utils/format
 * Date, number, and currency formatting utilities for platform-ui.
 *
 * Owns: display formatting using Intl.* APIs with Hebrew/RTL defaults.
 * Does NOT own: validation, parsing, business logic, timezone decisions.
 * Used by: all modules displaying dates, numbers, or currency.
 *
 * Timezone assumption: all ISO strings from backend are UTC.
 * Display timezone: Asia/Jerusalem (UTC+2/UTC+3 IDT).
 * Locale default: he-IL for all formatters.
 */

const LOCALE = "he-IL";
const TZ = "Asia/Jerusalem";

/** Format an ISO date string as a short date (e.g. "24 באפר׳ 2026"). */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(LOCALE, {
      dateStyle: "medium",
      timeZone: TZ,
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

/** Format an ISO date string as date + time (e.g. "24 באפר׳ 2026, 14:30"). */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(LOCALE, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: TZ,
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

/**
 * Format an ISO date string as a relative time (e.g. "לפני 3 שעות").
 * Falls back to formatDate for dates older than 7 days.
 */
export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffSec = Math.round(diffMs / 1000);

    if (diffSec < 0) return formatDateTime(iso); // future dates
    if (diffSec < 60) return "עכשיו";

    const rtf = new Intl.RelativeTimeFormat("he", { numeric: "auto" });
    const diffMin = Math.round(diffSec / 60);
    const diffHour = Math.round(diffSec / 3600);
    const diffDay = Math.round(diffSec / 86400);

    if (diffMin < 60) return rtf.format(-diffMin, "minute");
    if (diffHour < 24) return rtf.format(-diffHour, "hour");
    if (diffDay < 7) return rtf.format(-diffDay, "day");

    return formatDate(iso);
  } catch {
    return "—";
  }
}

/** Format an integer or float as a localized number string. */
export function formatNumber(
  value: number | null | undefined,
  options?: Intl.NumberFormatOptions
): string {
  if (value == null) return "—";
  try {
    return new Intl.NumberFormat(LOCALE, options).format(value);
  } catch {
    return String(value);
  }
}

/** Format a number as ILS currency (e.g. "₪ 1,234.56"). */
export function formatCurrency(
  value: number | null | undefined,
  currency = "ILS"
): string {
  if (value == null) return "—";
  try {
    return new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value}`;
  }
}

/** Format bytes as human-readable size (e.g. "1.2 MB"). */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return "—";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}
