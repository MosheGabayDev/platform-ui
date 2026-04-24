/**
 * @module lib/platform/data-grid/types
 * Pure data grid contracts shared across all platform clients.
 *
 * @platform cross — no React, no TanStack Table, no DOM
 *
 * These are domain-level types that describe grid behavior contracts.
 * TanStack Table-specific types (ColumnDef, etc.) live in components/shared/data-table/.
 * Use these types in API layers, state stores, and export utilities.
 */

/** Sort direction for a table column. */
export type SortDirection = "asc" | "desc";

/** A single column sort specification. */
export interface ColumnSort {
  id: string;
  desc: boolean;
}

/** A single active filter on a column. */
export interface TableFilter {
  id: string;
  value: unknown;
}

/** Column visibility map: columnId → visible. */
export interface ColumnVisibilityState {
  [columnId: string]: boolean;
}

/** Parameters for a table export request (passed to CSV or Excel exporter). */
export interface TableExportOptions<T extends Record<string, unknown>> {
  rows: T[];
  columns: { key: keyof T; label: string }[];
  filename: string;
}

/** Standard server-side pagination parameters sent with API list requests. */
export interface PaginationParams {
  page: number;
  per_page: number;
}

/** Standard paginated response envelope shape from Flask API list endpoints. */
export interface PaginatedEnvelope<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}
