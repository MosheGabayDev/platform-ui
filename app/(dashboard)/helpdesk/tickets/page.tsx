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
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { motion, LazyMotion, domAnimation } from "framer-motion";
import { HeadphonesIcon, AlertTriangle, AlertCircle } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { FeatureGate } from "@/components/shared/feature-gate";
import { PageShell } from "@/components/shared/page-shell";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { TicketStatusBadge } from "@/components/modules/helpdesk/ticket-status-badge";
import { TicketPriorityBadge } from "@/components/modules/helpdesk/ticket-priority-badge";
import { fetchTickets } from "@/lib/api/helpdesk";
import { queryKeys } from "@/lib/api/query-keys";
import { useRegisterPageContext } from "@/lib/hooks/use-register-page-context";
import { PAGE_EASE } from "@/lib/ui/motion";
import type {
  TicketSummary,
  TicketStatus,
  TicketPriority,
} from "@/lib/modules/helpdesk/types";

const STATUS_OPTIONS: Array<{ value: TicketStatus | "all"; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const PRIORITY_OPTIONS: Array<{ value: TicketPriority | "all"; label: string }> = [
  { value: "all", label: "All priorities" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

function TicketsListInner() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TicketStatus | "all">("all");
  const [priority, setPriority] = useState<TicketPriority | "all">("all");

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

  const columns = useMemo<ColumnDef<TicketSummary>[]>(
    () => [
      {
        accessorKey: "ticket_number",
        header: "Ticket #",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.ticket_number}</span>
        ),
      },
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.title}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <TicketStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ row }) => <TicketPriorityBadge priority={row.original.priority} />,
      },
      {
        accessorKey: "sla_breached",
        header: "SLA",
        cell: ({ row }) =>
          row.original.sla_breached ? (
            <span
              className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 text-xs"
              title="SLA breached"
            >
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              Breached
            </span>
          ) : (
            <span className="text-muted-foreground text-xs">On track</span>
          ),
      },
    ],
    [],
  );

  return (
    <LazyMotion features={domAnimation}>
      <PageShell icon={HeadphonesIcon} title="Tickets" subtitle="Helpdesk ticket queue">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: PAGE_EASE } }}
          className="space-y-4 pb-20 md:pb-0"
        >
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="search"
              placeholder="Search ticket title…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="sm:max-w-xs"
              aria-label="Search tickets"
            />
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as TicketStatus | "all");
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
            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value as TicketPriority | "all");
                setPage(1);
              }}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm sm:w-44"
              aria-label="Filter by priority"
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <DataTable
            columns={columns}
            data={tickets}
            isLoading={isLoading}
            error={error as Error | null}
            onRowClick={(row) => router.push(`/helpdesk/tickets/${row.id}`)}
            emptyMessage="No tickets match your filters"
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

export default function HelpdeskTicketsPage() {
  return (
    <FeatureGate
      flag="helpdesk.enabled"
      fallback={
        <PageShell icon={HeadphonesIcon} title="Tickets" subtitle="Coming soon">
          <EmptyState
            icon={AlertCircle}
            title="Helpdesk not enabled"
            description="The Helpdesk module is not enabled for your organization."
          />
        </PageShell>
      }
    >
      <TicketsListInner />
    </FeatureGate>
  );
}
