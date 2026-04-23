"use client";
/**
 * @module components/shared/data-table/pagination
 * RTL-aware pagination controls for server-side paginated tables.
 *
 * Owns: previous/next buttons, page indicator, RTL direction flip.
 * Does NOT own: data fetching, page state (caller owns).
 * Used by: DataTable, any component needing standard pagination UI.
 *
 * RTL convention: in RTL layout, visual "previous page" is on the right (ChevronRight),
 * and visual "next page" is on the left (ChevronLeft). This matches Hebrew reading order.
 */

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TablePaginationProps {
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
  onPageChange: (page: number) => void;
}

export function TablePagination({
  page,
  totalPages,
  total,
  perPage,
  onPageChange,
}: TablePaginationProps) {
  if (totalPages <= 1) return null;

  const from = Math.min((page - 1) * perPage + 1, total);
  const to = Math.min(page * perPage, total);

  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground">
      <span>
        שורות {from}–{to} מתוך {total}
      </span>
      <div className="flex items-center gap-1">
        {/* RTL: ChevronRight = go to previous page */}
        <Button
          variant="outline"
          size="icon"
          className="size-7"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="עמוד קודם"
        >
          <ChevronRight className="size-3.5" />
        </Button>
        <span className="px-2 tabular-nums">
          {page} / {totalPages}
        </span>
        {/* RTL: ChevronLeft = go to next page */}
        <Button
          variant="outline"
          size="icon"
          className="size-7"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="עמוד הבא"
        >
          <ChevronLeft className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
