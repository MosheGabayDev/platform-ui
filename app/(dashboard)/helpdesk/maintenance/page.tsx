"use client";
/**
 * @module app/(dashboard)/helpdesk/maintenance/page
 *
 * Phase C — maintenance windows surface (extends Helpdesk inventory row 4).
 *
 * Operational change-management view: scheduled/in-progress/completed windows,
 * affected services, alert-suppression flag, and linked tickets. Cancel action
 * is mutation-driven via usePlatformMutation.
 *
 * MOCK MODE returns 4 fixture windows. Flips to false once the backend
 * /api/helpdesk/maintenance routes land (Q-HD-9).
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { motion, LazyMotion, domAnimation } from "framer-motion";
import {
  Wrench,
  AlertCircle,
  Clock,
  CalendarClock,
  CircleSlash2,
  CircleDot,
  BellOff,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { FeatureGate } from "@/components/shared/feature-gate";
import { PageShell } from "@/components/shared/page-shell";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
import { JobStatusBadge } from "@/components/shared/job-runner/job-status-badge";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { PlatformAction } from "@/lib/platform/actions";
import {
  fetchMaintenanceWindows,
  cancelMaintenanceWindow,
} from "@/lib/api/helpdesk.maintenance";
import { queryKeys } from "@/lib/api/query-keys";
import { usePlatformMutation } from "@/lib/hooks/use-platform-mutation";
import { useRegisterPageContext } from "@/lib/hooks/use-register-page-context";
import { PAGE_EASE } from "@/lib/ui/motion";
import type {
  MaintenanceStatus,
  MaintenanceWindow,
  MaintenanceImpact,
} from "@/lib/modules/helpdesk/types";

const STATUS_VALUES: Array<MaintenanceStatus | "all"> = [
  "all",
  "in_progress",
  "scheduled",
  "completed",
  "cancelled",
];

const IMPACT_TONES: Record<MaintenanceImpact, string> = {
  none: "border-muted text-muted-foreground",
  low: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  medium: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400",
  high: "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-400",
};

function formatRelative(
  iso: string,
  t: (key: string, params?: Record<string, string | number | Date>) => string,
): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const mins = Math.round(abs / 60_000);
  const future = diffMs >= 0;
  if (mins < 60) {
    return t(future ? "relative.inMinutes" : "relative.minutesAgo", { n: mins });
  }
  const hours = Math.round(mins / 60);
  if (hours < 24) {
    return t(future ? "relative.inHours" : "relative.hoursAgo", { n: hours });
  }
  const days = Math.round(hours / 24);
  return t(future ? "relative.inDays" : "relative.daysAgo", { n: days });
}

// Maintenance status rendering uses the shared JobStatusBadge (Phase 4) —
// scheduled / in_progress / completed / cancelled are all covered by the
// shared meta map.

function MaintenanceInner() {
  const t = useTranslations("helpdesk.maintenance");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<MaintenanceStatus | "all">("all");
  const [cancelTarget, setCancelTarget] = useState<MaintenanceWindow | null>(null);

  const params = useMemo(
    () => ({
      page,
      per_page: 25,
      search: search || undefined,
      status: status === "all" ? undefined : status,
    }),
    [page, search, status],
  );

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.helpdesk.maintenance(params),
    queryFn: () => fetchMaintenanceWindows(params),
  });

  const windows = data?.data?.windows ?? [];
  const total = data?.data?.total ?? 0;
  const activeCount = data?.data?.active_count ?? 0;
  const upcomingCount = data?.data?.upcoming_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 25));

  useRegisterPageContext({
    pageKey: "helpdesk.maintenance",
    route: "/helpdesk/maintenance",
    summary: `Maintenance windows: ${activeCount} active, ${upcomingCount} upcoming. Showing ${windows.length}/${total}.`,
    availableActions: ["helpdesk.maintenance.cancel"],
  });

  const cancel = usePlatformMutation({
    mutationFn: cancelMaintenanceWindow,
    invalidateKeys: [queryKeys.helpdesk.maintenance(params), queryKeys.helpdesk.all()],
    onSuccess: (d) => toast.success(d.message),
  });

  const columns = useMemo<ColumnDef<MaintenanceWindow>[]>(
    () => [
      {
        accessorKey: "title",
        header: t("columns.window"),
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5 max-w-md">
            <span className="text-sm font-medium">{row.original.title}</span>
            <span className="text-[11px] text-muted-foreground line-clamp-1">
              {row.original.description}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: t("columns.status"),
        cell: ({ row }) => <JobStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "impact",
        header: t("columns.impact"),
        cell: ({ row }) => (
          <Badge variant="outline" className={IMPACT_TONES[row.original.impact]}>
            {t(`impact.${row.original.impact}` as never)}
          </Badge>
        ),
      },
      {
        accessorKey: "starts_at",
        header: t("columns.starts"),
        cell: ({ row }) => (
          <div className="flex flex-col text-xs">
            <span>
              <span className="text-muted-foreground">{t("rowMeta.startsLabel")}</span>{" "}
              {formatRelative(row.original.starts_at, t)}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {new Date(row.original.starts_at).toLocaleString()}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "affected_services",
        header: t("columns.services"),
        cell: ({ row }) =>
          row.original.affected_services.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {row.original.affected_services.map((s) => (
                <Badge
                  key={s}
                  variant="outline"
                  className="text-[10px] border-border/60"
                >
                  {s}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "suppress_alerts",
        header: t("columns.alerts"),
        cell: ({ row }) =>
          row.original.suppress_alerts ? (
            <Badge
              variant="outline"
              className="border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-400"
            >
              <BellOff className="h-3 w-3 me-1" aria-hidden="true" />
              {t("alerts.suppressed")}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const w = row.original;
          if (w.status === "completed" || w.status === "cancelled") return null;
          return (
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                disabled={cancel.isPending}
                onClick={() => setCancelTarget(w)}
                aria-label={t("actions.cancelAria", { title: w.title })}
              >
                <CircleSlash2 className="h-3.5 w-3.5 me-1" aria-hidden="true" />
                {t("actions.cancel")}
              </Button>
            </div>
          );
        },
      },
    ],
    [cancel, t],
  );

  return (
    <LazyMotion features={domAnimation}>
      <PageShell icon={Wrench} title={t("title")} subtitle={t("subtitle")}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: PAGE_EASE } }}
          className="space-y-4 pb-20 md:pb-0"
        >
          {/* KPI banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass border-border/50 rounded-xl p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t("kpi.inProgress")}</span>
                <CircleDot
                  className={`h-4 w-4 ${
                    activeCount > 0
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-muted-foreground"
                  }`}
                  aria-hidden="true"
                />
              </div>
              <span
                className={`text-2xl font-semibold ${
                  activeCount > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-foreground"
                }`}
              >
                {activeCount}
              </span>
            </div>
            <div className="glass border-border/50 rounded-xl p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t("kpi.upcoming")}</span>
                <CalendarClock
                  className="h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
              <span className="text-2xl font-semibold">{upcomingCount}</span>
            </div>
            <div className="glass border-border/50 rounded-xl p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t("kpi.total")}</span>
                <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
              <span className="text-2xl font-semibold">{total}</span>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
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
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as MaintenanceStatus | "all");
                setPage(1);
              }}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm sm:w-44"
              aria-label={t("filters.statusAria")}
            >
              {STATUS_VALUES.map((value) => (
                <option key={value} value={value}>
                  {t(`status.${value}` as never)}
                </option>
              ))}
            </select>
          </div>

          <DataTable
            columns={columns}
            data={windows}
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

        {cancelTarget && (
          <ConfirmActionDialog
            open={cancelTarget !== null}
            action={
              {
                id: "helpdesk.maintenance.cancel",
                label: t("cancelDialog.label", { title: cancelTarget.title }),
                description:
                  cancelTarget.impact === "high"
                    ? t("cancelDialog.descriptionHigh", {
                        services: cancelTarget.affected_services.join(", "),
                      })
                    : t("cancelDialog.descriptionLow", { id: cancelTarget.id }),
                // dangerLevel: "high" alone forces requiresReason via DANGER_LEVEL_CONFIG
                // (see lib/platform/actions/danger-level.ts). The explicit prop
                // below is a no-op for "high" but load-bearing for "medium" —
                // medium impact keeps the reason field optional. (Round 3 MED #6.)
                dangerLevel: cancelTarget.impact === "high" ? "high" : "medium",
                requiresConfirmation: true,
                auditEvent: "helpdesk.maintenance.cancel",
                resourceType: "maintenance_window",
              } as PlatformAction
            }
            isPending={cancel.isPending}
            serverError={cancel.serverError}
            onConfirm={async (payload) => {
              try {
                await cancel.mutateAsync({
                  windowId: cancelTarget.id,
                  reason: payload.reason ?? undefined,
                });
                setCancelTarget(null);
              } catch {
                // serverError surfaces in dialog
              }
            }}
            onCancel={() => setCancelTarget(null)}
          />
        )}
      </PageShell>
    </LazyMotion>
  );
}

function MaintenanceDisabledFallback() {
  const t = useTranslations("helpdesk.maintenance");
  return (
    <PageShell icon={Wrench} title={t("title")} subtitle={t("disabled.subtitle")}>
      <EmptyState
        icon={AlertCircle}
        title={t("disabled.title")}
        description={t("disabled.description")}
      />
    </PageShell>
  );
}

export default function HelpdeskMaintenancePage() {
  return (
    <FeatureGate flag="helpdesk.enabled" fallback={<MaintenanceDisabledFallback />}>
      <MaintenanceInner />
    </FeatureGate>
  );
}
