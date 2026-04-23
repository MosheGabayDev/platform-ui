"use client";
/**
 * @module components/shared/data-table/data-table
 * Generic server-side paginated DataTable built on @tanstack/react-table.
 *
 * Owns: table shell (border, header, body), loading skeleton, empty row, error row, pagination.
 * Does NOT own: column definitions (caller), data fetching (caller), search UI (caller).
 * Used by: all module list pages. Reference implementation: components/modules/users/users-table.tsx
 *
 * Security note: renders only what it receives. Backend must enforce org_id scoping.
 * Always use manualPagination=true — all pagination is server-side.
 */

import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type SortingState,
} from "@tanstack/react-table";
import { AlertCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { TableSkeleton } from "./table-skeleton";
import { TablePagination } from "./pagination";
import type { DataTableProps } from "./types";

export function DataTable<TData>({
  columns,
  data,
  isLoading = false,
  error = null,
  pagination,
  onRowClick,
  emptyMessage = "לא נמצאו תוצאות",
  loadingRows = 5,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: pagination?.totalPages ?? -1,
  });

  const rows = table.getRowModel().rows;
  const colCount = columns.length;

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="bg-muted/30 hover:bg-muted/30">
                {hg.headers.map((header) => (
                  <TableHead key={header.id} className="text-xs font-medium">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          {isLoading ? (
            <TableSkeleton columnCount={colCount} rows={loadingRows} />
          ) : error ? (
            <TableBody>
              <TableRow>
                <TableCell colSpan={colCount} className="h-24">
                  <div className="flex items-center justify-center gap-2 text-sm text-destructive">
                    <AlertCircle className="size-4 shrink-0" />
                    {error.message ?? "שגיאה בטעינת הנתונים"}
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          ) : rows.length === 0 ? (
            <TableBody>
              <TableRow>
                <TableCell
                  colSpan={colCount}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            </TableBody>
          ) : (
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn(onRowClick && "cursor-pointer")}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          )}
        </Table>
      </div>

      {pagination && (
        <TablePagination {...pagination} />
      )}
    </div>
  );
}
