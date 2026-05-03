/**
 * @module components/shared/data-table/types
 * Shared type contracts for the ServerDataTable primitive.
 *
 * Owns: DataTable prop interfaces, pagination state shape.
 * Does NOT own: column definitions (module responsibility), API fetch logic.
 * Used by: all module list pages that need server-side paginated tables.
 *
 * Security note: DataTable visibility is NOT security enforcement.
 * Backend must enforce org_id scoping. This component only renders what it receives.
 */

import type { ColumnDef } from "@tanstack/react-table";

export interface PaginationState {
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
  onPageChange: (page: number) => void;
}

/**
 * Bulk-selection state. When provided, DataTable renders a leading checkbox
 * column with a "select all on this page" header checkbox.
 *
 * Selection is row-id-based (not index) so it survives pagination, sorting,
 * and refetches. Caller owns the Set.
 */
export interface SelectionState<TData> {
  /** Currently-selected row IDs (across all pages, caller-managed). */
  value: ReadonlySet<string | number>;
  /** Update selection. Called with the next Set on every checkbox click. */
  onChange: (next: Set<string | number>) => void;
  /** Stable row identifier — typically `row.id`. */
  getRowId: (row: TData) => string | number;
}

export interface DataTableProps<TData> {
  /** Column definitions — caller owns all column logic. */
  columns: ColumnDef<TData>[];
  /** Row data — must be authorized by backend before reaching this component. */
  data: TData[];
  /** Show skeleton rows instead of data. */
  isLoading?: boolean;
  /** Show error row when non-null. */
  error?: Error | null;
  /** Server-side pagination. Omit for unpaginated tables. */
  pagination?: PaginationState;
  /** Row click handler. Adds cursor-pointer when provided. */
  onRowClick?: (row: TData) => void;
  /** Message shown in empty row (no data, no loading, no error). */
  emptyMessage?: string;
  /** Number of skeleton rows during loading. Default: 5. */
  loadingRows?: number;
  /** Optional bulk selection. Adds a leading checkbox column. */
  selection?: SelectionState<TData>;
}
