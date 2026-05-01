"use client";
/**
 * @module app/(dashboard)/helpdesk/tickets/[id]/page
 * Ticket detail page (Phase B scaffold — read-only).
 *
 * Mock mode: same MOCK_MODE flag as lib/api/helpdesk.ts. Phase B actions
 * (take, resolve, reassign, comment) land in subsequent rounds; this page
 * is the read-only foundation.
 */
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, LazyMotion, domAnimation } from "framer-motion";
import {
  HeadphonesIcon,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  UserPlus,
  Flag,
  RefreshCw,
  PlusCircle,
  MinusCircle,
  User,
  Clock,
  Calendar,
  Eye,
  Tag,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FeatureGate } from "@/components/shared/feature-gate";
import { PageShell } from "@/components/shared/page-shell";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import {
  DetailBackButton,
  DetailHeaderCard,
  DetailLoadingSkeleton,
  DetailSection,
  InfoRow,
} from "@/components/shared/detail-view";
import { PlatformTimeline } from "@/components/shared/timeline";
import type { TimelineEvent } from "@/components/shared/timeline/types";
import { TicketStatusBadge } from "@/components/modules/helpdesk/ticket-status-badge";
import { TicketPriorityBadge } from "@/components/modules/helpdesk/ticket-priority-badge";
import { fetchTicket } from "@/lib/api/helpdesk";
import { queryKeys } from "@/lib/api/query-keys";
import { useRegisterPageContext } from "@/lib/hooks/use-register-page-context";
import { useSession } from "next-auth/react";
import { hasRole } from "@/lib/auth/rbac";
import { TicketActions } from "@/components/modules/helpdesk/ticket-actions";
import { PAGE_EASE } from "@/lib/ui/motion";
import type { TicketEvent, TicketEventType } from "@/lib/modules/helpdesk/types";

const EVENT_ICONS: Record<TicketEventType, LucideIcon> = {
  created: PlusCircle,
  assigned: UserPlus,
  status_changed: RefreshCw,
  comment_added: MessageSquare,
  priority_changed: Flag,
  resolved: CheckCircle,
  closed: MinusCircle,
  reopened: RefreshCw,
};

function toTimelineEvents(events: TicketEvent[]): TimelineEvent[] {
  return events.map((e) => ({
    id: String(e.id),
    type: e.type,
    timestamp: e.timestamp,
    actor: e.actor_name ?? undefined,
    description: e.description,
    detail: e.detail,
    icon: EVENT_ICONS[e.type],
  }));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

interface TicketDetailInnerProps {
  id: string;
}

function TicketDetailInner({ id }: TicketDetailInnerProps) {
  const ticketId = Number(id);
  const { data: session } = useSession();
  const isAdmin = hasRole(session, "admin", "system_admin", "manager");
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.helpdesk.ticket(ticketId),
    queryFn: () => fetchTicket(ticketId),
    enabled: !Number.isNaN(ticketId),
  });

  const ticket = data?.data?.ticket;
  const events = data?.data?.events ?? [];

  useRegisterPageContext({
    pageKey: "helpdesk.ticket.detail",
    route: `/helpdesk/tickets/${id}`,
    entityType: "ticket",
    entityId: id,
    summary: ticket
      ? `Ticket ${ticket.ticket_number}: ${ticket.title}. Status: ${ticket.status}. Priority: ${ticket.priority}. SLA: ${ticket.sla_breached ? "BREACHED" : "on track"}.`
      : `Ticket detail page (loading ticket #${id}).`,
    availableActions: ticket
      ? ticket.status === "resolved" || ticket.status === "closed"
        ? ["helpdesk.ticket.comment"]
        : [
            "helpdesk.ticket.take",
            "helpdesk.ticket.resolve",
            "helpdesk.ticket.reassign",
            "helpdesk.ticket.comment",
          ]
      : [],
  });

  if (Number.isNaN(ticketId)) {
    return (
      <PageShell icon={HeadphonesIcon} title="Ticket" subtitle="Invalid ticket ID">
        <EmptyState icon={AlertCircle} title="Invalid ticket ID" />
      </PageShell>
    );
  }

  if (isLoading) {
    return (
      <PageShell icon={HeadphonesIcon} title="Ticket" subtitle="Loading…">
        <DetailLoadingSkeleton />
      </PageShell>
    );
  }

  if (error || !ticket) {
    return (
      <PageShell icon={HeadphonesIcon} title="Ticket">
        <ErrorState error={error} />
      </PageShell>
    );
  }

  return (
    <LazyMotion features={domAnimation}>
      <PageShell
        icon={HeadphonesIcon}
        title={`Ticket ${ticket.ticket_number}`}
        subtitle={ticket.title}
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: PAGE_EASE } }}
          className="space-y-6 pb-20 md:pb-0"
        >
          <DetailBackButton href="/helpdesk/tickets" label="Back to tickets" />

          <DetailHeaderCard
            title={ticket.title}
            subtitle={`${ticket.ticket_number} • opened ${formatDate(ticket.created_at)}`}
            badges={
              <div className="flex flex-wrap gap-2">
                <TicketStatusBadge status={ticket.status} />
                <TicketPriorityBadge priority={ticket.priority} />
                {ticket.sla_breached && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/15 px-2 py-0.5 text-xs text-rose-700 dark:text-rose-400">
                    <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                    SLA breached
                  </span>
                )}
              </div>
            }
            avatar={
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <HeadphonesIcon className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
            }
          />

          <DetailSection title="Description">
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {ticket.description}
            </p>
          </DetailSection>

          <DetailSection title="Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              <InfoRow icon={User} label="Requester ID" value={ticket.requester_id} />
              <InfoRow
                icon={UserPlus}
                label="Assignee ID"
                value={ticket.assignee_id ?? "Unassigned"}
              />
              <InfoRow icon={Calendar} label="Created" value={formatDate(ticket.created_at)} />
              <InfoRow icon={Clock} label="Last update" value={formatDate(ticket.updated_at)} />
              <InfoRow
                icon={AlertTriangle}
                label="Response SLA"
                value={
                  ticket.response_due_at
                    ? `${formatDate(ticket.response_due_at)}${ticket.sla_response_breached ? " (BREACHED)" : ""}`
                    : "—"
                }
              />
              <InfoRow
                icon={AlertTriangle}
                label="Resolution SLA"
                value={
                  ticket.resolution_due_at
                    ? `${formatDate(ticket.resolution_due_at)}${ticket.sla_resolution_breached ? " (BREACHED)" : ""}`
                    : "—"
                }
              />
              <InfoRow
                icon={Tag}
                label="Category"
                value={
                  ticket.category
                    ? ticket.subcategory
                      ? `${ticket.category} / ${ticket.subcategory}`
                      : ticket.category
                    : "—"
                }
              />
              <InfoRow icon={MessageSquare} label="Comments" value={ticket.comment_count} />
              <InfoRow icon={Eye} label="Watchers" value={ticket.watchers.length} />
              {ticket.tags.length > 0 && (
                <InfoRow icon={Tag} label="Tags" value={ticket.tags.join(", ")} />
              )}
            </div>
          </DetailSection>

          <DetailSection title="Timeline">
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No timeline events yet.</p>
            ) : (
              <PlatformTimeline events={toTimelineEvents(events)} />
            )}
          </DetailSection>

          <DetailSection title="Actions">
            <TicketActions ticket={ticket} canManage={isAdmin} />
          </DetailSection>
        </motion.div>
      </PageShell>
    </LazyMotion>
  );
}

export default function HelpdeskTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <FeatureGate
      flag="helpdesk.enabled"
      fallback={
        <PageShell icon={HeadphonesIcon} title="Ticket" subtitle="Coming soon">
          <EmptyState
            icon={AlertCircle}
            title="Helpdesk not enabled"
            description="The Helpdesk module is not enabled for your organization."
          />
        </PageShell>
      }
    >
      <TicketDetailInner id={id} />
    </FeatureGate>
  );
}
