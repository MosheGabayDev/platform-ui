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

const STATUS_OPTIONS: Array<{ value: BatchTaskStatus | "all"; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "running", label: "Running" },
  { value: "queued", label: "Queued" },
  { value: "succeeded", label: "Succeeded" },
  { value: "partial", label: "Partial success" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
];

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
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
        header: "Task",
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
        header: "Status",
        cell: ({ row }) => <JobStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "progress",
        header: "Progress",
        cell: ({ row }) => (
          <JobProgress
            progress={row.original.progress}
            status={row.original.status}
          />
        ),
      },
      {
        accessorKey: "created_at",
        header: "When",
        cell: ({ row }) => (
          <div className="flex flex-col text-xs">
            <span>{formatRelative(row.original.created_at)}</span>
            {row.original.completed_at && (
              <span className="text-[10px] text-muted-foreground">
                done {formatRelative(row.original.completed_at)}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "created_by_name",
        header: "By",
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
          const t = row.original;
          const isCancellable = t.status === "queued" || t.status === "running";
          const hasArtifact = t.result?.artifact_url;
          if (!isCancellable && !hasArtifact && !t.error_message) {
            return null;
          }
          return (
            <div className="flex justify-end gap-1">
              {hasArtifact && (
                <a
                  href={t.result!.artifact_url!}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-border/60 hover:bg-muted/60"
                  aria-label={`Download artifact for batch task ${t.id}`}
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  Download
                </a>
              )}
              {isCancellable && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={cancel.isPending}
                  onClick={() => setCancelTarget(t)}
                  aria-label={`Cancel batch task ${t.id}`}
                >
                  <CircleSlash2 className="h-3.5 w-3.5 me-1" aria-hidden="true" />
                  Cancel
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [cancel],
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
                <span className="text-xs text-muted-foreground">Running</span>
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
                <span className="text-xs text-muted-foreground">Queued</span>
                <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
              <span className="text-2xl font-semibold">{queuedCount}</span>
            </div>
            <div className="glass border-border/50 rounded-xl p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Total in view</span>
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
            data={tasks}
            isLoading={isLoading}
            error={error as Error | null}
            emptyMessage="No batch tasks match your filter"
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
                {tasks.map((t) =>
                  t.error_message || (t.result?.failures.length ?? 0) > 0 ? (
                    <details
                      key={t.id}
                      className="glass border-border/50 rounded-xl p-3 text-sm"
                    >
                      <summary className="cursor-pointer font-medium">
                        #{t.id} {t.label} —{" "}
                        <span className="text-muted-foreground">
                          {t.error_message ? "task error" : `${t.result?.failures.length} item failures`}
                        </span>
                      </summary>
                      <div className="mt-2 space-y-1 text-xs">
                        {t.error_message && (
                          <p className="text-rose-600 dark:text-rose-400">
                            <strong>Task error:</strong> {t.error_message}
                          </p>
                        )}
                        {t.result?.failures.map((f) => (
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
                label: `Cancel "${cancelTarget.label}"`,
                description: `Cancel batch task #${cancelTarget.id}? In-flight items will halt at the next checkpoint; processed items remain.`,
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

export default function HelpdeskBatchPage() {
  return (
    <FeatureGate
      flag="helpdesk.enabled"
      fallback={
        <PageShell icon={Layers} title="Batch tasks" subtitle="Coming soon">
          <EmptyState
            icon={AlertCircle}
            title="Helpdesk not enabled"
            description="The Helpdesk module is not enabled for your organization."
          />
        </PageShell>
      }
    >
      <BatchInner />
    </FeatureGate>
  );
}
