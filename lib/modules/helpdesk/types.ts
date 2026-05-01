/**
 * @module lib/modules/helpdesk/types
 * TypeScript types for the Helpdesk module.
 * Mirrors Flask `apps/helpdesk/` serializers (per docs/modules/04-helpdesk/PLAN.md).
 *
 * Do NOT add UI state here. Do NOT import React or component libraries here.
 */

export type TicketStatus = "new" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "critical";

export interface TicketSummary {
  id: number;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignee_id: number | null;
  requester_id: number;
  created_at: string;
  updated_at: string;
  /** ISO-8601 timestamp; null when no SLA deadline applies. */
  sla_breach_at: string | null;
  /** Whether the SLA deadline has been crossed. */
  sla_breached: boolean;
}

export interface TicketDetail extends TicketSummary {
  description: string;
  /** User IDs who have viewed this ticket recently (for "watching" UX). */
  watchers: number[];
  /** Comment count for badge display. */
  comment_count: number;
}

export interface HelpdeskStats {
  open_tickets: number;
  resolved_today: number;
  avg_resolution_hours: number;
  sla_compliance_pct: number;
}

export interface TicketsListParams {
  page: number;
  per_page: number;
  status?: TicketStatus;
  priority?: TicketPriority;
  assignee_id?: number;
  search?: string;
}

export interface TicketsListResponse {
  success: boolean;
  data: {
    tickets: TicketSummary[];
    page: number;
    per_page: number;
    total: number;
  };
}

export interface HelpdeskStatsResponse {
  success: boolean;
  data: HelpdeskStats;
}

export type TicketEventType =
  | "created"
  | "assigned"
  | "status_changed"
  | "comment_added"
  | "priority_changed"
  | "resolved"
  | "closed"
  | "reopened";

export interface TicketEvent {
  id: number;
  type: TicketEventType;
  timestamp: string;
  actor_id: number | null;
  actor_name: string | null;
  description: string;
  detail?: string;
}

export interface TicketDetailResponse {
  success: boolean;
  data: {
    ticket: TicketDetail;
    events: TicketEvent[];
  };
}
