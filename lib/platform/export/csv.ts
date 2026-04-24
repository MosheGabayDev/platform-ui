/**
 * @module lib/platform/export/csv
 * Pure CSV serialization utilities.
 *
 * @platform cross — no Blob, no document, no DOM, no browser APIs
 *
 * These functions generate CSV strings only.
 * Browser download (Blob + URL.createObjectURL) lives in lib/utils/csv.ts (web-only).
 *
 * BOM (\uFEFF) is prepended for Excel Hebrew UTF-8 compatibility.
 * Safe to use in Node.js, React Native file writers, or Electron filesystem APIs.
 */

/** Escape a CSV cell value (wrap in quotes if it contains comma, quote, or newline). */
export function escapeCsvCell(value: unknown): string {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Convert an array of objects to a CSV string with BOM prefix.
 * BOM (\uFEFF) is required for Excel on Windows to correctly read Hebrew UTF-8.
 */
export function rowsToCsv<T extends Record<string, unknown>>(
  rows: T[],
  /** Column headers in order. Keys must match row object keys. */
  columns: { key: keyof T; label: string }[]
): string {
  const header = columns.map((c) => escapeCsvCell(c.label)).join(",");
  const body = rows
    .map((row) => columns.map((c) => escapeCsvCell(row[c.key])).join(","))
    .join("\n");
  return "\uFEFF" + header + "\n" + body;
}
