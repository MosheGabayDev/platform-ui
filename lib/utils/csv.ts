/**
 * @module lib/utils/csv
 * Browser-side CSV export utilities.
 *
 * @platform web — uses Blob, URL.createObjectURL, document.createElement
 *
 * Pure CSV serialization (rowsToCsv, escapeCsvCell) lives in:
 *   lib/platform/export/csv.ts  ← safe for React Native, Node.js, Electron
 *
 * This file adds the browser download layer on top.
 *
 * Security note: only pass rows that the backend already authorized.
 * This utility does not filter by org_id or role.
 * In-memory only: do not use for exports > ~5000 rows.
 */

// Re-export pure serialization from platform layer (also usable in non-browser contexts)
export { escapeCsvCell, rowsToCsv } from "@/lib/platform/export/csv";

import { rowsToCsv } from "@/lib/platform/export/csv";

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
