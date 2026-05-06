"use client";
/**
 * @module app/(dashboard)/helpdesk/approvals/page
 *
 * Phase C — approval queue (PlatformApprovalFlow capability, cap 13).
 * Backed by `tool_invocations` table; helpdesk view filters by module='helpdesk'.
 *
 * MOCK MODE returns 6 fixture invocations across all statuses. Flips to false
 * once R046-min audit + tool_invocations write path lands.
 */
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { motion, LazyMotion, domAnimation } from "framer-motion";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  ShieldAlert,
  Skull,
  ShieldCheck,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { FeatureGate } from "@/components/shared/feature-gate";
import { PageShell } from "@/components/shared/page-shell";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ActionButton } from "@/components/shared/action-button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  fetchApprovals,
  approveInvocation,
  rejectInvocation,
} from "@/lib/api/helpdesk.approvals";
import { queryKeys } from "@/lib/api/query-keys";
import { usePlatformMutation } from "@/lib/hooks/use-platform-mutation";
import { useRegisterPageContext } from "@/lib/hooks/use-register-page-context";
import { PAGE_EASE } from "@/lib/ui/motion";
import type {
  ToolInvocation,
  ToolInvocationStatus,
} from "@/lib/modules/helpdesk/types";

// Risk level visual mapping (matches ActionPreviewCard color tones)
const RISK_META: Record<string, { icon: LucideIcon; tone: string; label: string }> = {
  low: {
    icon: ShieldCheck,
    tone: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    label: "Low",
  },
  medium: {
    icon: ShieldCheck,
    tone: "border-cyan-500/30 bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
    label: "Medium",
  },
  high: {
    icon: ShieldAlert,
    tone: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400",
    label: "High",
  },
  critical: {
    icon: Skull,
    tone: "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-400",
    label: "Critical",
  },
};

const STATUS_OPTIONS: Array<{ value: ToolInvocationStatus | "all"; label: string }> = [
  { value: "pending_approval", label: "Pending approval" },
  { value: "all", label: "All statuses" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "success", label: "Success (auto)" },
  { value: "error", label: "Error" },
];

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function StatusBadge({ status }: { status: ToolInvocationStatus }) {
  if (status === "pending_approval") {
    return (
      <Badge
        variant="outline"
        className="border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400"
      >
        <Clock className="h-3 w-3 me-1" aria-hidden="true" />
        Pending
      </Badge>
    );
  }
  if (status === "approved" || status === "success") {
    return (
      <Badge
        variant="outline"
        className="border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
      >
        <CheckCircle className="h-3 w-3 me-1" aria-hidden="true" />
        {status === "approved" ? "Approved" : "Success"}
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge
        variant="outline"
        className="border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-400"
      >
        <XCircle className="h-3 w-3 me-1" aria-hidden="true" />
        Rejected
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-muted text-muted-foreground">
      {status}
    </Badge>
  );
}

function ApprovalsInner() {
  const t = useTranslations("helpdesk.approvals");
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ToolInvocationStatus | "all">(
    "pending_approval",
  );

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
    queryKey: queryKeys.helpdesk.approvals(params),
    queryFn: () => fetchApprovals(params),
  });

  const invocations = data?.data?.invocations ?? [];
  const total = data?.data?.total ?? 0;
  const pendingCount = data?.data?.pending_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 25));

  useRegisterPageContext({
    pageKey: "helpdesk.approvals",
    route: "/helpdesk/approvals",
    summary: `Approval queue: ${pendingCount} pending invocations awaiting human approval. Showing ${invocations.length}/${total}.`,
    availableActions: [
      "helpdesk.approval.approve",
      "helpdesk.approval.reject",
    ],
  });

  const approve = usePlatformMutation({
    mutationFn: approveInvocation,
    invalidateKeys: [queryKeys.helpdesk.approvals(params), queryKeys.helpdesk.all()],
    onSuccess: (d) => toast.success(d.message),
  });

  const reject = usePlatformMutation({
    mutationFn: rejectInvocation,
    invalidateKeys: [queryKeys.helpdesk.approvals(params), queryKeys.helpdesk.all()],
    onSuccess: (d) => toast.success(d.message),
  });

  const columns = useMemo<ColumnDef<ToolInvocation>[]>(
    () => [
      {
        accessorKey: "tool_name",
        header: "Tool",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-mono text-xs">{row.original.tool_name}</span>
            <span className="text-[10px] text-muted-foreground">
              session #{row.original.session_id}
              {row.original.ticket_id !== null && row.original.ticket_id !== undefined ? (
                <> · ticket #{row.original.ticket_id}</>
              ) : null}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "tool_snapshot",
        header: "Risk",
        cell: ({ row }) => {
          const risk = row.original.tool_snapshot?.risk_level ?? "low";
          const meta = RISK_META[risk] ?? RISK_META.low;
          const Icon = meta.icon;
          return (
            <Badge variant="outline" className={meta.tone}>
              <Icon className="h-3 w-3 me-1" aria-hidden="true" />
              {meta.label}
            </Badge>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "requested_by_name",
        header: "Requested by",
        cell: ({ row }) =>
          row.original.requested_by_name ? (
            <span className="text-sm">{row.original.requested_by_name}</span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "created_at",
        header: "When",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatRelative(row.original.created_at)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const i = row.original;
          if (i.status !== "pending_approval") {
            return null;
          }
          return (
            <div className="flex gap-1 justify-end">
              <ActionButton
                onClick={() => approve.mutate({ invocationId: i.id })}
                isLoading={approve.isPending}
                size="sm"
                variant="default"
              >
                <CheckCircle className="h-3.5 w-3.5 me-1" aria-hidden="true" />
                Approve
              </ActionButton>
              <Button
                onClick={() => {
                  const reason = window.prompt("Rejection reason (optional)?") ?? "";
                  reject.mutate({ invocationId: i.id, reason });
                }}
                disabled={reject.isPending}
                size="sm"
                variant="outline"
              >
                <XCircle className="h-3.5 w-3.5 me-1" aria-hidden="true" />
                Reject
              </Button>
            </div>
          );
        },
      },
    ],
    [approve, reject],
  );

  return (
    <LazyMotion features={domAnimation}>
      <PageShell icon={ShieldAlert} title={t("title")} subtitle={t("subtitle")}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: PAGE_EASE } }}
          className="space-y-4 pb-20 md:pb-0"
        >
          {/* KPI banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="glass border-border/50 rounded-xl p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Pending</span>
                <Clock
                  className={`h-4 w-4 ${
                    pendingCount > 0
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-muted-foreground"
                  }`}
                  aria-hidden="true"
                />
              </div>
              <span
                className={`text-2xl font-semibold ${
                  pendingCount > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-foreground"
                }`}
              >
                {pendingCount}
              </span>
            </div>
            <div className="glass border-border/50 rounded-xl p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Showing</span>
                <ShieldAlert className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
              <span className="text-2xl font-semibold">{total}</span>
            </div>
            <div className="glass border-border/50 rounded-xl p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Filter</span>
                <ShieldCheck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
              <span className="text-sm font-medium">
                {STATUS_OPTIONS.find((o) => o.value === status)?.label}
              </span>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="search"
              placeholder="Search tool name or ticket ID…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="sm:max-w-xs"
              aria-label="Search invocations"
            />
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as ToolInvocationStatus | "all");
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
            data={invocations}
            isLoading={isLoading}
            error={error as Error | null}
            emptyMessage={
              status === "pending_approval"
                ? "No invocations awaiting approval — queue clear ✨"
                : "No invocations match your filters"
            }
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

export default function HelpdeskApprovalsPage() {
  return (
    <FeatureGate
      flag="helpdesk.enabled"
      fallback={
        <PageShell icon={ShieldAlert} title="Approvals" subtitle="Coming soon">
          <EmptyState
            icon={AlertCircle}
            title="Helpdesk not enabled"
            description="The Helpdesk module is not enabled for your organization."
          />
        </PageShell>
      }
    >
      <ApprovalsInner />
    </FeatureGate>
  );
}
