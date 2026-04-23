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

import { type ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/shared/data-table";
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
}

const columns: ColumnDef<UserSummary>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-me-3 h-8 font-medium"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        שם
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
    header: "תפקיד",
    cell: ({ row }) => (
      <UserRoleBadge role={row.original.role} isAdmin={row.original.is_admin} />
    ),
  },
  {
    accessorKey: "is_active",
    header: "סטטוס",
    cell: ({ row }) => (
      <UserStatusBadge
        isActive={row.original.is_active}
        isApproved={row.original.is_approved}
      />
    ),
  },
  {
    accessorKey: "last_login",
    header: "כניסה אחרונה",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {formatDate(row.original.last_login)}
      </span>
    ),
  },
  {
    accessorKey: "created_at",
    header: "נוצר",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {formatDate(row.original.created_at)}
      </span>
    ),
  },
];

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
}: UsersTableProps) {
  return (
    <div className="space-y-3">
      {/* Search bar — Users-specific, stays in this component */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="חיפוש לפי שם, אימייל..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="max-w-xs h-8 text-sm"
          dir="rtl"
        />
        <span className="text-xs text-muted-foreground me-auto">
          {total} משתמשים סה״כ
        </span>
      </div>

      <DataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        pagination={{ page, totalPages, total, perPage, onPageChange }}
        onRowClick={onRowClick}
        emptyMessage="לא נמצאו משתמשים"
        loadingRows={6}
      />
    </div>
  );
}
