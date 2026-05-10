"use client";
/**
 * @module app/(dashboard)/helpdesk/tickets/page
 * Tickets list page (Phase A).
 *
 * Auth: protected by middleware.
 * Feature flag: gated by 'helpdesk.enabled'.
 * Data: useQuery → fetchTickets() → /api/proxy/helpdesk/api/tickets (mock until R042-BE-min).
 *
 * Spec: docs/modules/04-helpdesk/PLAN.md
 */
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, LazyMotion, domAnimation } from "framer-motion";
import {
  HeadphonesIcon,
  AlertTriangle,
  AlertCircle,
  Users as UsersIcon,
  CheckCircle,
  X,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Hand, CheckSquare } from "lucide-react";
import {
  RecordActionsMenu,
  type RecordAction,
} from "@/components/shared/record-detail";
import { takeTicket, resolveTicket } from "@/lib/api/helpdesk";
import { toast } from "sonner";
import { FeatureGate } from "@/components/shared/feature-gate";
import { PageShell } from "@/components/shared/page-shell";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ActionButton } from "@/components/shared/action-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TicketStatusBadge } from "@/components/modules/helpdesk/ticket-status-badge";
import { TicketPriorityBadge } from "@/components/modules/helpdesk/ticket-priority-badge";
import {
  fetchTickets,
  bulkReassignTickets,
  bulkStatusChange,
} from "@/lib/api/helpdesk";
import { queryKeys } from "@/lib/api/query-keys";
import { usePlatformMutation } from "@/lib/hooks/use-platform-mutation";
import { useRegisterPageContext } from "@/lib/hooks/use-register-page-context";
import { PAGE_EASE } from "@/lib/ui/motion";
import type {
  TicketSummary,
  TicketStatus,
  TicketPriority,
} from "@/lib/modules/helpdesk/types";

const STATUS_VALUES: Array<TicketStatus | "all"> = [
  "all",
  "new",
  "in_progress",
  "resolved",
  "closed",
];

const PRIORITY_VALUES: Array<TicketPriority | "all"> = [
  "all",
  "low",
  "medium",
  "high",
  "critical",
];

function TicketsListInner() {
  const t = useTranslations("helpdesk.tickets");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TicketStatus | "all">("all");
  const [priority, setPriority] = useState<TicketPriority | "all">("all");

  // Bulk selection — survives pagination because it's keyed on ticket.id
  const [selected, setSelected] = useState<Set<string | number>>(new Set());

  const params = useMemo(
    () => ({
      page,
      per_page: 25,
      search: search || undefined,
      status: status === "all" ? undefined : status,
      priority: priority === "all" ? undefined : priority,
    }),
    [page, search, status, priority],
  );

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.helpdesk.tickets(params),
    queryFn: () => fetchTickets(params),
  });

  const tickets = data?.data?.tickets ?? [];

  const bulkReassign = usePlatformMutation({
    mutationFn: bulkReassignTickets,
    invalidateKeys: [queryKeys.helpdesk.all()],
    onSuccess: (res) => {
      toast.success(res.message);
      if (res.data.failed.length > 0) {
        toast.error(t("toasts.bulkFailed", { count: res.data.failed.length }));
      }
      setSelected(new Set());
    },
  });

  const bulkStatus = usePlatformMutation({
    mutationFn: bulkStatusChange,
    invalidateKeys: [queryKeys.helpdesk.all()],
    onSuccess: (res) => {
      toast.success(res.message);
      if (res.data.failed.length > 0) {
        toast.error(t("toasts.bulkFailed", { count: res.data.failed.length }));
      }
      setSelected(new Set());
    },
  });

  const selectedIds = useMemo(
    () => Array.from(selected).map((id) => Number(id)).filter((n) => !Number.isNaN(n)),
    [selected],
  );
  const total = data?.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 25));

  useRegisterPageContext({
    pageKey: "helpdesk.tickets.list",
    route: "/helpdesk/tickets",
    entityType: "ticket",
    summary:
      `Helpdesk tickets list, ${total} tickets` +
      (status !== "all" ? `, status=${status}` : "") +
      (priority !== "all" ? `, priority=${priority}` : "") +
      (search ? `, search="${search}"` : "") +
      ".",
    availableActions: [],
  });

  // C7 — RecordActions for /helpdesk/tickets. View navigates to the
  // detail page; Take + Resolve call the existing helpdesk APIs and
  // invalidate the list query. Take is hidden when ticket is already
  // resolved/closed; Resolve is hidden when ticket is closed.
  const ticketActions = useMemo<RecordAction<TicketSummary>[]>(
    () => [
      {
        id: "view",
        kind: "view",
        label: t("actions.view"),
        onInvoke: (tk) => router.push(`/helpdesk/tickets/${tk.id}`),
      },
      {
        id: "take",
        kind: "custom",
        label: t("actions.take"),
        icon: Hand,
        visibleWhen: (tk) => tk.status !== "resolved" && tk.status !== "closed",
        onInvoke: async (tk) => {
          await takeTicket({ ticketId: tk.id });
          toast.success(t("toasts.taken", { ticket: tk.ticket_number }));
          await queryClient.invalidateQueries({ queryKey: queryKeys.helpdesk.all() });
        },
      },
      {
        id: "resolve",
        kind: "custom",
        label: t("actions.resolve"),
        icon: CheckSquare,
        visibleWhen: (tk) => tk.status !== "resolved" && tk.status !== "closed",
        destructive: true,
        confirmTitle: t("resolveConfirm.title"),
        confirmDescription: t("resolveConfirm.description"),
        onInvoke: async (tk) => {
          await resolveTicket({
            ticketId: tk.id,
            resolution: t("resolutions.rowAction"),
          });
          toast.success(t("toasts.resolved", { ticket: tk.ticket_number }));
          await queryClient.invalidateQueries({ queryKey: queryKeys.helpdesk.all() });
        },
      },
    ],
    [router, queryClient, t],
  );

  const columns = useMemo<ColumnDef<TicketSummary>[]>(
    () => [
      {
        accessorKey: "ticket_number",
        header: t("columns.ticketNumber"),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.ticket_number}</span>
        ),
      },
      {
        accessorKey: "title",
        header: t("columns.title"),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.title}</span>
        ),
      },
      {
        accessorKey: "status",
        header: t("columns.status"),
        cell: ({ row }) => <TicketStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "priority",
        header: t("columns.priority"),
        cell: ({ row }) => <TicketPriorityBadge priority={row.original.priority} />,
      },
      {
        accessorKey: "sla_breached",
        header: t("columns.sla"),
        cell: ({ row }) =>
          row.original.sla_breached ? (
            <span
              className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 text-xs"
              title={t("sla.breachedTitle")}
            >
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              {t("sla.breached")}
            </span>
          ) : (
            <span className="text-muted-foreground text-xs">{t("sla.onTrack")}</span>
          ),
      },
      // C7 — RecordActionsMenu column. Actions are filtered server-side
      // by helpdesk RBAC + per-ticket assignment; the menu's RBAC gate
      // is a UI hint, not the security boundary.
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div
            className="flex justify-end"
            onClick={(e) => e.stopPropagation()}
          >
            <RecordActionsMenu
              record={row.original}
              actions={ticketActions}
              triggerAriaLabel={t("actions.triggerAria")}
            />
          </div>
        ),
      },
    ],
    // Re-build the column when the actions array re-renders (e.g. after
    // a ticket changes status and `visibleWhen` predicates flip).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ticketActions, t],
  );

  return (
    <LazyMotion features={domAnimation}>
      <PageShell icon={HeadphonesIcon} title={t("title")} subtitle={t("subtitle")}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: PAGE_EASE } }}
          className="space-y-4 pb-20 md:pb-0"
        >
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
                setStatus(e.target.value as TicketStatus | "all");
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
            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value as TicketPriority | "all");
                setPage(1);
              }}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm sm:w-44"
              aria-label={t("filters.priorityAria")}
            >
              {PRIORITY_VALUES.map((value) => (
                <option key={value} value={value}>
                  {t(`priority.${value}` as never)}
                </option>
              ))}
            </select>
          </div>

          {/* Bulk action toolbar — only visible when ≥1 row selected */}
          {selectedIds.length > 0 && (
            <div
              className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm"
              role="toolbar"
              aria-label={t("bulk.toolbarAria")}
            >
              <span className="font-medium">
                {t("bulk.selectedCount", { count: selectedIds.length })}
              </span>
              <span className="text-muted-foreground">·</span>
              <ActionButton
                onClick={() =>
                  bulkReassign.mutate({
                    ticketIds: selectedIds,
                    assigneeId: 3, // mock target: OnCall Olivia
                    reason: t("bulk.reassignReason"),
                  })
                }
                isLoading={bulkReassign.isPending}
                size="sm"
                variant="default"
              >
                <UsersIcon className="h-3.5 w-3.5 me-1" aria-hidden="true" />
                {t("bulk.reassignTo")}
              </ActionButton>
              <ActionButton
                onClick={() =>
                  bulkStatus.mutate({
                    ticketIds: selectedIds,
                    status: "resolved",
                    reason: t("bulk.resolveReason"),
                  })
                }
                isLoading={bulkStatus.isPending}
                size="sm"
                variant="default"
              >
                <CheckCircle className="h-3.5 w-3.5 me-1" aria-hidden="true" />
                {t("bulk.markResolved")}
              </ActionButton>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelected(new Set())}
                className="ms-auto"
                aria-label={t("bulk.clearAria")}
              >
                <X className="h-3.5 w-3.5 me-1" aria-hidden="true" />
                {t("bulk.clear")}
              </Button>
            </div>
          )}

          <DataTable
            columns={columns}
            data={tickets}
            isLoading={isLoading}
            error={error as Error | null}
            onRowClick={(row) => router.push(`/helpdesk/tickets/${row.id}`)}
            emptyMessage={t("empty")}
            pagination={{
              page,
              totalPages,
              total,
              perPage: 25,
              onPageChange: setPage,
            }}
            selection={{
              value: selected,
              onChange: setSelected,
              getRowId: (row) => row.id,
            }}
          />
        </motion.div>
      </PageShell>
    </LazyMotion>
  );
}

function TicketsDisabledFallback() {
  const t = useTranslations("helpdesk.tickets");
  return (
    <PageShell icon={HeadphonesIcon} title={t("title")} subtitle={t("comingSoon")}>
      <EmptyState
        icon={AlertCircle}
        title={t("notEnabled")}
        description={t("disabled.description")}
      />
    </PageShell>
  );
}

export default function HelpdeskTicketsPage() {
  return (
    <FeatureGate flag="helpdesk.enabled" fallback={<TicketsDisabledFallback />}>
      <TicketsListInner />
    </FeatureGate>
  );
}
