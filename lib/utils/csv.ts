/**
 * @module lib/utils/csv
 * Browser-side CSV export utilities for small, already-authorized data sets.
 *
 * Owns: CSV string generation, BOM prefix, browser download trigger.
 * Does NOT own: data authorization (backend responsibility), PII decisions,
 *   large/async exports (those are backend Celery jobs, see ADR-014).
 * Used by: module list pages with "Export CSV" buttons (helpdesk, users, billing).
 *
 * Limitations:
 * - In-memory only. Do not use for exports > ~5000 rows.
 * - Exports only the rows already loaded in the UI (backend-authorized).
 * - BOM (\uFEFF) is prepended for Excel Hebrew UTF-8 compatibility.
 *
 * Security note: only pass rows that the backend already authorized.
 * This utility does not filter by org_id or role.
 */

/** Escape a CSV cell value (wrap in quotes if it contains comma, quote, or newline). */
function escapeCsvCell(value: unknown): string {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Convert an array of objects to a CSV string with BOM. */
export function rowsToCsv<T extends Record<string, unknown>>(
  rows: T[],
  /** Column headers in order. Keys must match row object keys. */
  columns: { key: keyof T; label: string }[]
): string {
  const header = columns.map((c) => escapeCsvCell(c.label)).join(",");
  const body = rows
    .map((row) => columns.map((c) => escapeCsvCell(row[c.key])).join(","))
    .join("\n");
  // BOM required for Excel on Windows to correctly read Hebrew UTF-8
  return "\uFEFF" + header + "\n" + body;
}

/** Trigger a browser download of CSV content. */
export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * One-call convenience: convert rows to CSV and download.
 * Only use for data already authorized and loaded in the UI.
 */
export function exportToCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: { key: keyof T; label: string }[],
  filename: string
): void {
  downloadCsv(rowsToCsv(rows, columns), filename);
}
