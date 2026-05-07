"use client";
/**
 * @module components/modules/organizations/orgs-table
 * Organizations module DataTable — defines columns, search bar, delegates rendering to shared DataTable.
 *
 * Owns: org-specific column definitions, search input, row click behavior.
 * Does NOT own: table shell, skeleton rows, pagination (all in components/shared/data-table).
 * Calls no APIs — receives data from parent via props.
 */

import { useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/shared/data-table";
import { OrgStatusBadge } from "./org-status-badge";
import { formatDate } from "@/lib/utils/format";
import type { OrgSummary } from "@/lib/modules/organizations/types";

interface OrgsTableProps {
  orgs: OrgSummary[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  isLoading?: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  onPageChange: (p: number) => void;
  onRowClick?: (org: OrgSummary) => void;
}

function buildColumns(tCols: (k: string) => string): ColumnDef<OrgSummary>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-me-3 h-8 font-medium"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {tCols("name")}
          <ArrowUpDown className="me-2 size-3.5 opacity-50" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-sm">{row.original.name}</span>
          <span className="text-xs text-muted-foreground font-mono">{row.original.slug}</span>
        </div>
      ),
    },
    {
      accessorKey: "is_active",
      header: tCols("status"),
      cell: ({ row }) => <OrgStatusBadge isActive={row.original.is_active} />,
    },
    {
      accessorKey: "user_count",
      header: tCols("users"),
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">{row.original.user_count}</span>
      ),
    },
    {
      accessorKey: "created_at",
      header: tCols("createdAt"),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {formatDate(row.original.created_at)}
        </span>
      ),
    },
  ];
}

export function OrgsTable({
  orgs,
  total,
  page,
  perPage,
  totalPages,
  isLoading,
  search,
  onSearchChange,
  onPageChange,
  onRowClick,
}: OrgsTableProps) {
  const tCols = useTranslations("organizations.table.columns");
  const tSearch = useTranslations("organizations.table.search");
  const columns = useMemo(() => buildColumns((k) => tCols(k)), [tCols]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Input
          placeholder={tSearch("placeholder")}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="max-w-xs h-8 text-sm"
          dir="rtl"
        />
        <span className="text-xs text-muted-foreground me-auto">
          {tSearch("total", { count: total })}
        </span>
      </div>

      <DataTable
        columns={columns}
        data={orgs}
        isLoading={isLoading}
        pagination={{ page, totalPages, total, perPage, onPageChange }}
        onRowClick={onRowClick}
        emptyMessage={tSearch("empty")}
        loadingRows={5}
      />
    </div>
  );
}
