"use client";

import { useState, useMemo, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronUp, ChevronDown, ChevronsUpDown,
  Search, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (value: unknown, row: T) => ReactNode;
}

interface DataTableProps<T extends Record<string, unknown>> {
  data: T[];
  columns: Column<T>[];
  pageSize?: number;
  searchable?: boolean;
  searchKeys?: (keyof T)[];
  emptyState?: ReactNode;
  className?: string;
}

type SortDir = "asc" | "desc" | null;

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  pageSize = 10,
  searchable = true,
  searchKeys,
  emptyState,
  className,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(1);

  const handleSort = useCallback((key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      setSortKey(null);
      setSortDir(null);
    }
    setPage(1);
  }, [sortKey, sortDir]);

  const filtered = useMemo(() => {
    if (!query.trim()) return data;
    const q = query.toLowerCase();
    const keys = searchKeys ?? (columns.map(c => c.key) as (keyof T)[]);
    return data.filter(row =>
      keys.some(k => String(row[k] ?? "").toLowerCase().includes(q))
    );
  }, [data, query, searchKeys, columns]);

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      const cmp = String(av).localeCompare(String(bv), "he", { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const SortIcon = ({ col }: { col: Column<T> }) => {
    if (!col.sortable) return null;
    const key = String(col.key);
    if (sortKey !== key) return <ChevronsUpDown className="size-3 opacity-40" />;
    return sortDir === "asc"
      ? <ChevronUp className="size-3 text-primary" />
      : <ChevronDown className="size-3 text-primary" />;
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Toolbar */}
      {searchable && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => { setQuery(e.target.value); setPage(1); }}
              placeholder="חיפוש..."
              className="ps-8 h-8 text-sm bg-muted/30 border-border/50 focus:border-primary/50"
            />
          </div>
          {filtered.length !== data.length && (
            <Badge variant="secondary" className="text-xs">
              {filtered.length} / {data.length}
            </Badge>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border/40 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/40 hover:bg-transparent">
              {columns.map(col => (
                <TableHead
                  key={String(col.key)}
                  className={cn(
                    "text-xs font-medium text-muted-foreground h-9",
                    col.width,
                    col.sortable && "cursor-pointer select-none hover:text-foreground transition-colors"
                  )}
                  onClick={col.sortable ? () => handleSort(String(col.key)) : undefined}
                >
                  <div className="flex items-center gap-1.5">
                    {col.label}
                    <SortIcon col={col} />
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence mode="wait" initial={false}>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-12">
                    {emptyState ?? (
                      <p className="text-sm text-muted-foreground">אין תוצאות</p>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((row, i) => (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.25 }}
                    className="border-border/30 hover:bg-muted/20 transition-colors"
                  >
                    {columns.map(col => (
                      <TableCell key={String(col.key)} className="py-2.5 text-sm">
                        {col.render
                          ? col.render(row[col.key as keyof T], row)
                          : String(row[col.key as keyof T] ?? "—")}
                      </TableCell>
                    ))}
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            שורות {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)} מתוך {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost" size="icon"
              className="size-7"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronRight className="size-3.5" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = totalPages <= 5 ? i + 1 : Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
              return (
                <Button
                  key={p} variant={page === p ? "default" : "ghost"}
                  size="icon" className="size-7 text-xs"
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              );
            })}
            <Button
              variant="ghost" size="icon"
              className="size-7"
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
