"use client";
/**
 * @module app/(dashboard)/audit-log/page
 * Platform-wide audit log viewer (R046 surface).
 *
 * Auth: protected by middleware. RBAC: admin/system_admin only — backend
 * enforces independently. UI gates with PermissionGate as a hint.
 *
 * MOCK MODE returns ~17 fixture entries spanning the last 5 days. Flips to
 * false once R046-min AuditLog backend lands.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { motion, LazyMotion, domAnimation } from "framer-motion";
import {
  ClipboardList,
  AlertCircle,
  Activity,
  Users as UsersIcon,
  Bot,
  Shield,
  Download,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { PermissionGate } from "@/components/shared/permission-gate";
import { PageShell } from "@/components/shared/page-shell";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { exportToCsv } from "@/lib/utils/csv";
import { AuditCategoryBadge } from "@/components/modules/audit/category-badge";
import { fetchAuditLog, fetchAuditLogStats } from "@/lib/api/audit";
import { queryKeys } from "@/lib/api/query-keys";
import { useRegisterPageContext } from "@/lib/hooks/use-register-page-context";
import { PAGE_EASE } from "@/lib/ui/motion";
import type { AuditLogEntry, AuditCategory } from "@/lib/modules/audit/types";

const CATEGORY_OPTIONS: Array<{ value: AuditCategory | "all"; label: string }> = [
  { value: "all", label: "All categories" },
  { value: "login", label: "Login" },
  { value: "create", label: "Create" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
  { value: "admin", label: "Admin" },
  { value: "ai", label: "AI" },
  { value: "security", label: "Security" },
];

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function AuditLogInner() {
  const t = useTranslations("admin.auditLog");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<AuditCategory | "all">("all");

  const params = useMemo(
    () => ({
      page,
      per_page: 25,
      search: search || undefined,
      category: category === "all" ? undefined : category,
    }),
    [page, search, category],
  );

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.audit.list(params),
    queryFn: () => fetchAuditLog(params),
  });

  const { data: stats } = useQuery({
    queryKey: queryKeys.audit.stats(),
    queryFn: fetchAuditLogStats,
  });

  const entries = data?.data?.entries ?? [];
  const total = data?.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 25));

  useRegisterPageContext({
    pageKey: "platform.audit-log",
    route: "/audit-log",
    summary: stats?.data
      ? `Audit log: ${stats.data.total_24h} events in last 24h, ${stats.data.unique_actors_24h} unique actors. Showing ${entries.length}/${total} matching current filters.`
      : "Platform-wide audit log",
    availableActions: ["audit.export"],
  });

  const columns = useMemo<ColumnDef<AuditLogEntry>[]>(
    () => [
      {
        accessorKey: "timestamp",
        header: "When",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-xs">{formatRelative(row.original.timestamp)}</span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {new Date(row.original.timestamp).toLocaleString()}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => <AuditCategoryBadge category={row.original.category} />,
      },
      {
        accessorKey: "action",
        header: "Action",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.action}</span>
        ),
      },
      {
        accessorKey: "actor_name",
        header: "Actor",
        cell: ({ row }) =>
          row.original.actor_name ? (
            <div className="flex flex-col">
              <span className="text-sm">{row.original.actor_name}</span>
              <span className="text-[10px] text-muted-foreground font-mono">
                #{row.original.actor_id}
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground italic">anonymous</span>
          ),
      },
      {
        accessorKey: "resource_type",
        header: "Resource",
        cell: ({ row }) =>
          row.original.resource_type ? (
            <span className="text-xs">
              <span className="text-muted-foreground">{row.original.resource_type}</span>
              {row.original.resource_id && (
                <>
                  {" "}
                  <span className="font-mono">#{row.original.resource_id}</span>
                </>
              )}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "ip",
        header: "IP",
        cell: ({ row }) =>
          row.original.ip ? (
            <span className="font-mono text-xs">{row.original.ip}</span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
    ],
    [],
  );

  return (
    <LazyMotion features={domAnimation}>
      <PageShell icon={ClipboardList} title={t("title")} subtitle={t("subtitle")}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: PAGE_EASE } }}
          className="space-y-4 pb-20 md:pb-0"
        >
          {/* KPI tiles */}
          {stats?.data && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass border-border/50 rounded-xl p-4 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Last 24h</span>
                  <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </div>
                <span className="text-2xl font-semibold">{stats.data.total_24h}</span>
              </div>
              <div className="glass border-border/50 rounded-xl p-4 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Last 7d</span>
                  <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </div>
                <span className="text-2xl font-semibold">{stats.data.total_7d}</span>
              </div>
              <div className="glass border-border/50 rounded-xl p-4 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Unique actors (24h)</span>
                  <UsersIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </div>
                <span className="text-2xl font-semibold">{stats.data.unique_actors_24h}</span>
              </div>
              <div className="glass border-border/50 rounded-xl p-4 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">AI events (24h)</span>
                  <Bot className="h-4 w-4 text-violet-500" aria-hidden="true" />
                </div>
                <span className="text-2xl font-semibold text-violet-600 dark:text-violet-400">
                  {stats.data.by_category_24h.ai ?? 0}
                </span>
              </div>
            </div>
          )}

          {/* Security alert banner if any security events in 24h */}
          {stats?.data && (stats.data.by_category_24h.security ?? 0) > 0 && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" aria-hidden="true" />
              <span>
                <strong className="text-red-700 dark:text-red-400">
                  {stats.data.by_category_24h.security}
                </strong>{" "}
                security event(s) in the last 24h — review the security category for details.
              </span>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <Input
              type="search"
              placeholder="Search action, resource, or actor…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="sm:max-w-xs"
              aria-label="Search audit entries"
            />
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value as AuditCategory | "all");
                setPage(1);
              }}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm sm:w-44"
              aria-label="Filter by category"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                exportToCsv(
                  entries.map((e) => ({
                    timestamp: e.timestamp,
                    category: e.category,
                    action: e.action,
                    actor_id: e.actor_id ?? "",
                    actor_name: e.actor_name ?? "",
                    resource_type: e.resource_type ?? "",
                    resource_id: e.resource_id ?? "",
                    ip: e.ip ?? "",
                    metadata: JSON.stringify(e.metadata ?? {}),
                  })),
                  [
                    { key: "timestamp", label: "When" },
                    { key: "category", label: "Category" },
                    { key: "action", label: "Action" },
                    { key: "actor_id", label: "Actor ID" },
                    { key: "actor_name", label: "Actor name" },
                    { key: "resource_type", label: "Resource type" },
                    { key: "resource_id", label: "Resource ID" },
                    { key: "ip", label: "IP" },
                    { key: "metadata", label: "Metadata" },
                  ],
                  "audit-log",
                );
              }}
              disabled={entries.length === 0}
              className="ms-auto"
              aria-label="Export current view to CSV"
            >
              <Download className="h-4 w-4 me-1.5" aria-hidden="true" />
              Export CSV
            </Button>
          </div>

          <DataTable
            columns={columns}
            data={entries}
            isLoading={isLoading}
            error={error as Error | null}
            emptyMessage="No audit entries match your filters"
            pagination={{
              page,
              totalPages,
              total,
              perPage: 25,
              onPageChange: setPage,
            }}
          />
        </motion.div>
      </PageShell>
    </LazyMotion>
  );
}

function AuditLogRestrictedFallback() {
  const t = useTranslations("admin.auditLog");
  const tCommon = useTranslations("admin.common");
  return (
    <PageShell icon={ClipboardList} title={t("title")} subtitle={tCommon("restricted")}>
      <EmptyState
        icon={AlertCircle}
        title={tCommon("permissionRequired")}
        description="You need admin or system_admin role to view the audit log."
      />
    </PageShell>
  );
}

export default function AuditLogPage() {
  return (
    <PermissionGate role={["admin", "system_admin"]} fallback={<AuditLogRestrictedFallback />}>
      <AuditLogInner />
    </PermissionGate>
  );
}
