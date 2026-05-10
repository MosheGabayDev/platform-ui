"use client";
/**
 * @module app/(dashboard)/helpdesk/batch/page
 *
 * Phase C — async batch tasks queue (long-running ticket operations).
 * Distinct from synchronous bulk ops on the tickets list — those finish in
 * one request. Batch tasks return an ID and the UI polls.
 *
 * MOCK MODE returns 5 fixture tasks across all statuses. Polling is wired
 * (refetchInterval 5s) so a "running" task animates progress in real
 * deployment. Backend port pending — Q-HD-10.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { motion, LazyMotion, domAnimation } from "framer-motion";
import {
  Layers,
  AlertCircle,
  Clock,
  CircleDot,
  CircleSlash2,
  Download,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { FeatureGate } from "@/components/shared/feature-gate";
import { PageShell } from "@/components/shared/page-shell";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
import { JobStatusBadge } from "@/components/shared/job-runner/job-status-badge";
import { JobProgress } from "@/components/shared/job-runner/job-progress";
import { Button } from "@/components/ui/button";
import type { PlatformAction } from "@/lib/platform/actions";
import {
  fetchBatchTasks,
  cancelBatchTask,
} from "@/lib/api/helpdesk.batch";
import { queryKeys } from "@/lib/api/query-keys";
import { usePlatformMutation } from "@/lib/hooks/use-platform-mutation";
import { useRegisterPageContext } from "@/lib/hooks/use-register-page-context";
import { PAGE_EASE } from "@/lib/ui/motion";
import type {
  BatchTask,
  BatchTaskStatus,
} from "@/lib/modules/helpdesk/types";

const STATUS_VALUES: Array<BatchTaskStatus | "all"> = [
  "all",
  "running",
  "queued",
  "succeeded",
  "partial",
  "failed",
  "cancelled",
];

function formatRelative(
  iso: string | null,
  t: (key: string, params?: Record<string, string | number | Date>) => string,
): string {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return t("relative.justNow");
  if (mins < 60) return t("relative.minutesAgo", { n: mins });
  const hours = Math.round(mins / 60);
  if (hours < 24) return t("relative.hoursAgo", { n: hours });
  return t("relative.daysAgo", { n: Math.round(hours / 24) });
}

function BatchInner() {
  const t = useTranslations("helpdesk.batch");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<BatchTaskStatus | "all">("all");
  const [cancelTarget, setCancelTarget] = useState<BatchTask | null>(null);

  const params = useMemo(
    () => ({
      page,
      per_page: 25,
      status: status === "all" ? undefined : status,
    }),
    [page, status],
  );

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.helpdesk.batch(params),
    queryFn: () => fetchBatchTasks(params),
    // Poll while there's work in flight — running/queued progress matters in real time.
    refetchInterval: 5_000,
  });

  const tasks = data?.data?.tasks ?? [];
  const total = data?.data?.total ?? 0;
  const runningCount = data?.data?.running_count ?? 0;
  const queuedCount = data?.data?.queued_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 25));

  useRegisterPageContext({
    pageKey: "helpdesk.batch",
    route: "/helpdesk/batch",
    summary: `Batch tasks: ${runningCount} running, ${queuedCount} queued. Showing ${tasks.length}/${total}.`,
    availableActions: ["helpdesk.batch.cancel"],
  });

  const cancel = usePlatformMutation({
    mutationFn: cancelBatchTask,
    invalidateKeys: [queryKeys.helpdesk.batch(params), queryKeys.helpdesk.all()],
    onSuccess: (d) => toast.success(d.message),
  });

  const columns = useMemo<ColumnDef<BatchTask>[]>(
    () => [
      {
        accessorKey: "label",
        header: t("columns.task"),
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5 max-w-md">
            <span className="text-sm font-medium">{row.original.label}</span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {row.original.task_type} · #{row.original.id}
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
        accessorKey: "progress",
        header: t("columns.progress"),
        cell: ({ row }) => (
          <JobProgress
            progress={row.original.progress}
            status={row.original.status}
          />
        ),
      },
      {
        accessorKey: "created_at",
        header: t("columns.when"),
        cell: ({ row }) => (
          <div className="flex flex-col text-xs">
            <span>{formatRelative(row.original.created_at, t)}</span>
            {row.original.completed_at && (
              <span className="text-[10px] text-muted-foreground">
                {t("rowMeta.done", {
                  when: formatRelative(row.original.completed_at, t),
                })}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "created_by_name",
        header: t("columns.by"),
        cell: ({ row }) =>
          row.original.created_by_name ? (
            <span className="text-xs">{row.original.created_by_name}</span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const task = row.original;
          const isCancellable = task.status === "queued" || task.status === "running";
          const hasArtifact = task.result?.artifact_url;
          if (!isCancellable && !hasArtifact && !task.error_message) {
            return null;
          }
          return (
            <div className="flex justify-end gap-1">
              {hasArtifact && (
                <a
                  href={task.result!.artifact_url!}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-border/60 hover:bg-muted/60"
                  aria-label={t("actions.downloadAria", { id: task.id })}
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("actions.download")}
                </a>
              )}
              {isCancellable && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={cancel.isPending}
                  onClick={() => setCancelTarget(task)}
                  aria-label={t("actions.cancelAria", { id: task.id })}
                >
                  <CircleSlash2 className="h-3.5 w-3.5 me-1" aria-hidden="true" />
                  {t("actions.cancel")}
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [cancel, t],
  );

  return (
    <LazyMotion features={domAnimation}>
      <PageShell icon={Layers} title={t("title")} subtitle={t("subtitle")}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: PAGE_EASE } }}
          className="space-y-4 pb-20 md:pb-0"
        >
          {/* KPI banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass border-border/50 rounded-xl p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t("kpi.running")}</span>
                <CircleDot
                  className={`h-4 w-4 ${
                    runningCount > 0
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-muted-foreground"
                  }`}
                  aria-hidden="true"
                />
              </div>
              <span
                className={`text-2xl font-semibold ${
                  runningCount > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-foreground"
                }`}
              >
                {runningCount}
              </span>
            </div>
            <div className="glass border-border/50 rounded-xl p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t("kpi.queued")}</span>
                <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
              <span className="text-2xl font-semibold">{queuedCount}</span>
            </div>
            <div className="glass border-border/50 rounded-xl p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t("kpi.total")}</span>
                <Layers className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
              <span className="text-2xl font-semibold">{total}</span>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as BatchTaskStatus | "all");
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
            data={tasks}
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

          {/* Failure detail expansion — surface error_message + failures inline.
              Kept as a static section under the table to avoid drawer/modal
              complexity for now. Filters by `partial` or `failed` to focus. */}
          {(status === "partial" || status === "failed") &&
            tasks.length > 0 && (
              <div className="space-y-2">
                {tasks.map((task) =>
                  task.error_message || (task.result?.failures.length ?? 0) > 0 ? (
                    <details
                      key={task.id}
                      className="glass border-border/50 rounded-xl p-3 text-sm"
                    >
                      <summary className="cursor-pointer font-medium">
                        #{task.id} {task.label} —{" "}
                        <span className="text-muted-foreground">
                          {task.error_message
                            ? t("failures.taskError")
                            : t("failures.itemFailures", {
                                n: task.result?.failures.length ?? 0,
                              })}
                        </span>
                      </summary>
                      <div className="mt-2 space-y-1 text-xs">
                        {task.error_message && (
                          <p className="text-rose-600 dark:text-rose-400">
                            <strong>{t("failures.taskErrorPrefix")}</strong>{" "}
                            {task.error_message}
                          </p>
                        )}
                        {task.result?.failures.map((f) => (
                          <div
                            key={f.id}
                            className="flex gap-2 font-mono text-[11px]"
                          >
                            <span className="text-muted-foreground">#{f.id}</span>
                            <span>{f.error}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  ) : null,
                )}
              </div>
            )}
        </motion.div>

        {cancelTarget && (
          <ConfirmActionDialog
            open={cancelTarget !== null}
            action={
              {
                id: "helpdesk.batch.cancel",
                label: t("cancelDialog.label", { label: cancelTarget.label }),
                description: t("cancelDialog.description", { id: cancelTarget.id }),
                dangerLevel: "medium",
                requiresConfirmation: true,
                requiresReason: false,
                auditEvent: "helpdesk.batch.cancel",
                resourceType: "batch_task",
              } as PlatformAction
            }
            isPending={cancel.isPending}
            serverError={cancel.serverError}
            onConfirm={async (payload) => {
              try {
                await cancel.mutateAsync({
                  taskId: cancelTarget.id,
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

function BatchDisabledFallback() {
  const t = useTranslations("helpdesk.batch");
  return (
    <PageShell icon={Layers} title={t("title")} subtitle={t("disabled.subtitle")}>
      <EmptyState
        icon={AlertCircle}
        title={t("disabled.title")}
        description={t("disabled.description")}
      />
    </PageShell>
  );
}

export default function HelpdeskBatchPage() {
  return (
    <FeatureGate flag="helpdesk.enabled" fallback={<BatchDisabledFallback />}>
      <BatchInner />
    </FeatureGate>
  );
}
