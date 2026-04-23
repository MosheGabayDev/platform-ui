/**
 * @module components/shared/data-table
 * Barrel exports for the shared server-side DataTable primitive.
 *
 * Import the full DataTable: import { DataTable } from "@/components/shared/data-table"
 * Import primitives: import { TablePagination, TableSkeleton } from "@/components/shared/data-table"
 */

export { DataTable } from "./data-table";
export { TablePagination } from "./pagination";
export { TableSkeleton } from "./table-skeleton";
export type { DataTableProps, PaginationState } from "./types";
