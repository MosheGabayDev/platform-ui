"use client";
/**
 * @module components/modules/roles/roles-table
 * Roles module DataTable — columns for name, description, counts, actions.
 * Calls no APIs — receives data via props.
 */

import { type ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/shared/data-table";
import { formatDate } from "@/lib/utils/format";
import type { RoleSummary } from "@/lib/modules/roles/types";

interface RolesTableProps {
  roles: RoleSummary[];
  total: number;
  isLoading?: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  onRowClick?: (role: RoleSummary) => void;
  onEditClick?: (role: RoleSummary) => void;
  canEdit?: boolean;
}

function buildColumns(
  onEditClick?: (role: RoleSummary) => void,
  canEdit?: boolean,
): ColumnDef<RoleSummary>[] {
  const cols: ColumnDef<RoleSummary>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-me-3 h-8 font-medium"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          שם תפקיד
          <ArrowUpDown className="me-2 size-3.5 opacity-50" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-sm">{row.original.name}</span>
          {row.original.description && (
            <span className="text-xs text-muted-foreground truncate max-w-48">
              {row.original.description}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "permission_count",
      header: "הרשאות",
      cell: ({ row }) => (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-violet-500/15 text-violet-600 border border-violet-500/30">
          {row.original.permission_count}
        </span>
      ),
    },
    {
      accessorKey: "user_count",
      header: "משתמשים",
      cell: ({ row }) => (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-500/15 text-blue-600 border border-blue-500/30">
          {row.original.user_count}
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

  if (canEdit && onEditClick) {
    cols.push({
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          className="size-7 opacity-60 hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onEditClick(row.original);
          }}
        >
          <Pencil className="size-3.5" />
        </Button>
      ),
    });
  }

  return cols;
}

export function RolesTable({
  roles,
  total,
  isLoading,
  search,
  onSearchChange,
  onRowClick,
  onEditClick,
  canEdit,
}: RolesTableProps) {
  const columns = buildColumns(onEditClick, canEdit);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Input
          placeholder="חיפוש לפי שם תפקיד..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="max-w-xs h-8 text-sm"
          dir="rtl"
        />
        <span className="text-xs text-muted-foreground me-auto">
          {total} תפקידים סה״כ
        </span>
      </div>

      <DataTable
        columns={columns}
        data={roles}
        isLoading={isLoading}
        onRowClick={onRowClick}
        emptyMessage="לא נמצאו תפקידים"
        loadingRows={5}
      />
    </div>
  );
}
