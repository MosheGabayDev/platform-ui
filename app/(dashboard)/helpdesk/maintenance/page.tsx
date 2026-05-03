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
import { motion, LazyMotion, domAnimation } from "framer-motion";
import {
  Wrench,
  AlertCircle,
  Clock,
  CalendarClock,
  CircleSlash2,
  CheckCircle2,
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

const STATUS_OPTIONS: Array<{ value: MaintenanceStatus | "all"; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "in_progress", label: "In progress" },
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const IMPACT_TONES: Record<MaintenanceImpact, string> = {
  none: "border-muted text-muted-foreground",
  low: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  medium: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400",
  high: "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-400",
};

function formatRelative(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const mins = Math.round(abs / 60_000);
  const direction = diffMs >= 0 ? "in" : "ago";
  if (mins < 60) return `${direction === "in" ? "in " : ""}${mins}m${direction === "ago" ? " ago" : ""}`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${direction === "in" ? "in " : ""}${hours}h${direction === "ago" ? " ago" : ""}`;
  const days = Math.round(hours / 24);
  return `${direction === "in" ? "in " : ""}${days}d${direction === "ago" ? " ago" : ""}`;
}

function StatusBadge({ status }: { status: MaintenanceStatus }) {
  const meta = {
    in_progress: {
      icon: CircleDot,
      tone: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400",
      label: "In progress",
    },
    scheduled: {
      icon: CalendarClock,
      tone: "border-cyan-500/30 bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
      label: "Scheduled",
    },
    completed: {
      icon: CheckCircle2,
      tone: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
      label: "Completed",
    },
    cancelled: {
      icon: CircleSlash2,
      tone: "border-muted text-muted-foreground",
      label: "Cancelled",
    },
  }[status];
  const Icon = meta.icon;
  return (
    <Badge variant="outline" className={meta.tone}>
      <Icon className="h-3 w-3 me-1" aria-hidden="true" />
      {meta.label}
    </Badge>
  );
}

function MaintenanceInner() {
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
        header: "Window",
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
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "impact",
        header: "Impact",
        cell: ({ row }) => (
          <Badge variant="outline" className={IMPACT_TONES[row.original.impact]}>
            {row.original.impact}
          </Badge>
        ),
      },
      {
        accessorKey: "starts_at",
        header: "Window",
        cell: ({ row }) => (
          <div className="flex flex-col text-xs">
            <span>
              <span className="text-muted-foreground">starts</span>{" "}
              {formatRelative(row.original.starts_at)}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {new Date(row.original.starts_at).toLocaleString()}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "affected_services",
        header: "Services",
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
        header: "Alerts",
        cell: ({ row }) =>
          row.original.suppress_alerts ? (
            <Badge
              variant="outline"
              className="border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-400"
            >
              <BellOff className="h-3 w-3 me-1" aria-hidden="true" />
              Suppressed
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
                aria-label={`Cancel maintenance window ${w.title}`}
              >
                <CircleSlash2 className="h-3.5 w-3.5 me-1" aria-hidden="true" />
                Cancel
              </Button>
            </div>
          );
        },
      },
    ],
    [cancel],
  );

  return (
    <LazyMotion features={domAnimation}>
      <PageShell
        icon={Wrench}
        title="Maintenance"
        subtitle="Planned change windows + alert suppression"
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: PAGE_EASE } }}
          className="space-y-4 pb-20 md:pb-0"
        >
          {/* KPI banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass border-border/50 rounded-xl p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">In progress</span>
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
                <span className="text-xs text-muted-foreground">Upcoming</span>
                <CalendarClock
                  className="h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
              <span className="text-2xl font-semibold">{upcomingCount}</span>
            </div>
            <div className="glass border-border/50 rounded-xl p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Total in view</span>
                <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
              <span className="text-2xl font-semibold">{total}</span>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="search"
              placeholder="Search title, description, or service…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="sm:max-w-xs"
              aria-label="Search maintenance windows"
            />
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as MaintenanceStatus | "all");
                setPage(1);
              }}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm sm:w-44"
              aria-label="Filter by status"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <DataTable
            columns={columns}
            data={windows}
            isLoading={isLoading}
            error={error as Error | null}
            emptyMessage="No maintenance windows match your filters"
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
                label: `Cancel "${cancelTarget.title}"`,
                description:
                  cancelTarget.impact === "high"
                    ? `This window has HIGH impact (services: ${cancelTarget.affected_services.join(", ")}). Cancelling cannot be undone — provide a reason for the audit log.`
                    : `Cancel maintenance window #${cancelTarget.id}? This cannot be undone.`,
                dangerLevel: cancelTarget.impact === "high" ? "high" : "medium",
                requiresConfirmation: true,
                requiresReason: cancelTarget.impact === "high",
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

export default function HelpdeskMaintenancePage() {
  return (
    <FeatureGate
      flag="helpdesk.enabled"
      fallback={
        <PageShell icon={Wrench} title="Maintenance" subtitle="Coming soon">
          <EmptyState
            icon={AlertCircle}
            title="Helpdesk not enabled"
            description="The Helpdesk module is not enabled for your organization."
          />
        </PageShell>
      }
    >
      <MaintenanceInner />
    </FeatureGate>
  );
}
