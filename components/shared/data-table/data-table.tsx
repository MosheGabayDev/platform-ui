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
  selection,
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
  const colCount = columns.length + (selection ? 1 : 0);

  // Selection helpers — only meaningful when `selection` is provided.
  const pageRowIds = selection ? data.map((d) => selection.getRowId(d)) : [];
  const selectedOnPage = selection
    ? pageRowIds.filter((id) => selection.value.has(id)).length
    : 0;
  const allOnPageSelected =
    selection && pageRowIds.length > 0 && selectedOnPage === pageRowIds.length;

  const togglePage = () => {
    if (!selection) return;
    const next = new Set(selection.value);
    if (allOnPageSelected) {
      pageRowIds.forEach((id) => next.delete(id));
    } else {
      pageRowIds.forEach((id) => next.add(id));
    }
    selection.onChange(next);
  };

  const toggleRow = (id: string | number) => {
    if (!selection) return;
    const next = new Set(selection.value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selection.onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="bg-muted/30 hover:bg-muted/30">
                {selection && (
                  <TableHead className="w-9 text-xs font-medium">
                    <input
                      type="checkbox"
                      aria-label="Select all on page"
                      checked={!!allOnPageSelected}
                      onChange={togglePage}
                      onClick={(e) => e.stopPropagation()}
                      className="size-4 cursor-pointer accent-primary"
                    />
                  </TableHead>
                )}
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
              {rows.map((row) => {
                const rowId = selection
                  ? selection.getRowId(row.original)
                  : null;
                const isSelected =
                  selection && rowId !== null && selection.value.has(rowId);
                return (
                  <TableRow
                    key={row.id}
                    onClick={() => onRowClick?.(row.original)}
                    data-selected={isSelected || undefined}
                    className={cn(
                      onRowClick && "cursor-pointer",
                      isSelected && "bg-primary/5",
                    )}
                  >
                    {selection && rowId !== null && (
                      <TableCell className="py-2.5 w-9">
                        <input
                          type="checkbox"
                          aria-label={`Select row ${rowId}`}
                          checked={!!isSelected}
                          onChange={() => toggleRow(rowId)}
                          onClick={(e) => e.stopPropagation()}
                          className="size-4 cursor-pointer accent-primary"
                        />
                      </TableCell>
                    )}
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-2.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
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
