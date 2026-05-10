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
import { FeatureGate } from "@/components/shared/feature-gate";
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

// Order is canonical — labels resolved per-locale via t(`categories.${value}`).
const CATEGORY_VALUES: Array<AuditCategory | "all"> = [
  "all",
  "login",
  "create",
  "update",
  "delete",
  "admin",
  "ai",
  "security",
];

function formatRelative(
  iso: string,
  t: (key: string, params?: Record<string, string | number | Date>) => string,
): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return t("relative.justNow");
  if (mins < 60) return t("relative.minutesAgo", { n: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("relative.hoursAgo", { n: hours });
  return t("relative.daysAgo", { n: Math.floor(hours / 24) });
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
        header: t("table.timestamp"),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-xs">{formatRelative(row.original.timestamp, t)}</span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {new Date(row.original.timestamp).toLocaleString()}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "category",
        header: t("table.category"),
        cell: ({ row }) => <AuditCategoryBadge category={row.original.category} />,
      },
      {
        accessorKey: "action",
        header: t("table.action"),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.action}</span>
        ),
      },
      {
        accessorKey: "actor_name",
        header: t("table.actor"),
        cell: ({ row }) =>
          row.original.actor_name ? (
            <div className="flex flex-col">
              <span className="text-sm">{row.original.actor_name}</span>
              <span className="text-[10px] text-muted-foreground font-mono">
                #{row.original.actor_id}
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground italic">
              {t("actor.anonymous")}
            </span>
          ),
      },
      {
        accessorKey: "resource_type",
        header: t("table.resource"),
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
        header: t("table.ip"),
        cell: ({ row }) =>
          row.original.ip ? (
            <span className="font-mono text-xs">{row.original.ip}</span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
    ],
    [t],
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
                  <span className="text-xs text-muted-foreground">{t("kpi.last24h")}</span>
                  <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </div>
                <span className="text-2xl font-semibold">{stats.data.total_24h}</span>
              </div>
              <div className="glass border-border/50 rounded-xl p-4 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{t("kpi.last7d")}</span>
                  <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </div>
                <span className="text-2xl font-semibold">{stats.data.total_7d}</span>
              </div>
              <div className="glass border-border/50 rounded-xl p-4 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {t("kpi.uniqueActors24h")}
                  </span>
                  <UsersIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </div>
                <span className="text-2xl font-semibold">{stats.data.unique_actors_24h}</span>
              </div>
              <div className="glass border-border/50 rounded-xl p-4 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{t("kpi.aiActions")}</span>
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
                {t("securityBanner", {
                  count: stats.data.by_category_24h.security ?? 0,
                })}
              </span>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <Input
              type="search"
              placeholder={t("filters.searchPlaceholder")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="sm:max-w-xs"
              aria-label={t("filters.searchAria")}
            />
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value as AuditCategory | "all");
                setPage(1);
              }}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm sm:w-44"
              aria-label={t("filters.categoryAria")}
            >
              {CATEGORY_VALUES.map((value) => (
                <option key={value} value={value}>
                  {t(`categories.${value}` as never)}
                </option>
              ))}
            </select>

            {/*
              Audit-log export is a Pro+ tier feature per
              docs/system-upgrade/04-capabilities/pricing-tiers-spec.md.
              FeatureGate fail-closes when the flag is missing or loading,
              so Free-tier orgs simply do not see this button.
            */}
            <FeatureGate flag="audit_log.export">
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
                      { key: "timestamp", label: t("exportCsv.columns.when") },
                      { key: "category", label: t("exportCsv.columns.category") },
                      { key: "action", label: t("exportCsv.columns.action") },
                      { key: "actor_id", label: t("exportCsv.columns.actorId") },
                      { key: "actor_name", label: t("exportCsv.columns.actorName") },
                      { key: "resource_type", label: t("exportCsv.columns.resourceType") },
                      { key: "resource_id", label: t("exportCsv.columns.resourceId") },
                      { key: "ip", label: t("exportCsv.columns.ip") },
                      { key: "metadata", label: t("exportCsv.columns.metadata") },
                    ],
                    "audit-log",
                  );
                }}
                disabled={entries.length === 0}
                className="ms-auto"
                aria-label={t("exportCsv.aria")}
              >
                <Download className="h-4 w-4 me-1.5" aria-hidden="true" />
                {t("exportCsv.cta")}
              </Button>
            </FeatureGate>
          </div>

          <DataTable
            columns={columns}
            data={entries}
            isLoading={isLoading}
            error={error as Error | null}
            emptyMessage={t("empty")}
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
        description={t("restricted.description")}
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
