"use client";
/**
 * @module components/modules/users/users-table
 * Users module DataTable — defines columns, search bar, delegates rendering to shared DataTable.
 *
 * Owns: Users-specific column definitions, search input, row click behavior.
 * Does NOT own: table shell, skeleton rows, pagination (all in components/shared/data-table).
 * Calls no APIs — receives data from parent via props.
 *
 * RTL-first: all layout uses logical properties.
 */

import { useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/shared/data-table";
import {
  RecordActionsMenu,
  type RecordAction,
} from "@/components/shared/record-detail";
import { UserStatusBadge } from "./user-status-badge";
import { UserRoleBadge } from "./user-role-badge";
import { formatDate } from "@/lib/utils/format";
import type { UserSummary } from "@/lib/modules/users/types";

interface UsersTableProps {
  users: UserSummary[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  isLoading?: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  onPageChange: (p: number) => void;
  onRowClick?: (user: UserSummary) => void;
  /**
   * Optional row-level RecordActions. When provided, an Actions column
   * is appended that surfaces them via the shared RecordActionsMenu
   * primitive (Track C). RBAC + visibleWhen + destructive-confirm are
   * owned by the primitive — pass the bare actions here.
   */
  actions?: RecordAction<UserSummary>[];
}

function buildColumns(tCols: (k: string) => string, tActionsAria: string, actions?: RecordAction<UserSummary>[]): ColumnDef<UserSummary>[] {
  const cols: ColumnDef<UserSummary>[] = [
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
          <span className="text-xs text-muted-foreground">{row.original.email}</span>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: tCols("role"),
      cell: ({ row }) => (
        <UserRoleBadge role={row.original.role} isAdmin={row.original.is_admin} />
      ),
    },
    {
      accessorKey: "is_active",
      header: tCols("status"),
      cell: ({ row }) => (
        <UserStatusBadge
          isActive={row.original.is_active}
          isApproved={row.original.is_approved}
        />
      ),
    },
    {
      accessorKey: "last_login",
      header: tCols("lastLogin"),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {formatDate(row.original.last_login)}
        </span>
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

  if (actions && actions.length > 0) {
    cols.push({
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div
          className="flex justify-end"
          onClick={(e) => e.stopPropagation()}
        >
          <RecordActionsMenu
            record={row.original}
            actions={actions}
            triggerAriaLabel={tActionsAria}
          />
        </div>
      ),
    });
  }

  return cols;
}

export function UsersTable({
  users,
  total,
  page,
  perPage,
  totalPages,
  isLoading,
  search,
  onSearchChange,
  onPageChange,
  onRowClick,
  actions,
}: UsersTableProps) {
  const tCols = useTranslations("users.table.columns");
  const tSearch = useTranslations("users.table.search");
  const tTable = useTranslations("users.table");
  // useTranslations returns a stable function across renders for the same namespace,
  // but TS doesn't model that — useMemo on the deps it actually consumes.
  const columns = useMemo(
    () => buildColumns((k) => tCols(k), tTable("actionsAria"), actions),
    [tCols, tTable, actions],
  );

  return (
    <div className="space-y-3">
      {/* Search bar — Users-specific, stays in this component */}
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
        data={users}
        isLoading={isLoading}
        pagination={{ page, totalPages, total, perPage, onPageChange }}
        onRowClick={onRowClick}
        emptyMessage={tSearch("empty")}
        loadingRows={6}
      />
    </div>
  );
}
