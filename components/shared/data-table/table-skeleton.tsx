"use client";
/**
 * @module components/shared/data-table/table-skeleton
 * Animated skeleton rows for DataTable loading state.
 *
 * Owns: skeleton row rendering inside a <TableBody>.
 * Does NOT own: column count (received as prop), data, pagination.
 * Used by: DataTable (loading prop), any table that needs loading rows.
 *
 * RTL-safe: uses logical margin/padding. No directional CSS.
 */

import { TableBody, TableCell, TableRow } from "@/components/ui/table";

interface TableSkeletonProps {
  /** Number of columns determines how many cells per row. */
  columnCount: number;
  /** Number of skeleton rows to render. Default: 5. */
  rows?: number;
}

export function TableSkeleton({ columnCount, rows = 5 }: TableSkeletonProps) {
  return (
    <TableBody>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: columnCount }).map((_, j) => (
            <TableCell key={j}>
              <div
                className="h-4 rounded bg-muted animate-pulse"
                style={{ width: `${60 + ((i * 3 + j * 7) % 30)}%` }}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );
}
