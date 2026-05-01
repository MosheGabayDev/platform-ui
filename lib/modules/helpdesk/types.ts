/**
 * @module lib/modules/helpdesk/types
 * TypeScript types for the Helpdesk module.
 *
 * **Schema decision (2026-05-01, post-review):** the FRONTEND uses semantic field
 * names and enums; the FLASK BACKEND keeps its existing schema. Translation happens
 * at the API boundary in `lib/api/helpdesk.ts` (frontend-side until backend
 * transforms move into Flask `to_dict()`).
 *
 * Field-name mapping (frontend ↔ Flask `Ticket.to_dict()` per
 * platformengineer/apps/helpdesk/models.py):
 *
 *   FRONTEND               FLASK
 *   ----------------       ----------------
 *   id                     id
 *   ticket_number          ticket_number              (e.g. "TKT-2026-00042")
 *   title                  subject
 *   status                 status                     (no change)
 *   priority               priority                   (semantic ↔ P1-P4 — see below)
 *   assignee_id            assigned_to
 *   requester_id           requester_user_id
 *   requester_email        requester_email            (PII — masked unless permitted)
 *   created_at             created_at
 *   updated_at             updated_at
 *   response_due_at        response_due_at
 *   resolution_due_at      resolution_due_at
 *   sla_response_breached  sla_response_breached
 *   sla_resolution_breached sla_resolution_breached
 *   sla_breached           computed: response_breached OR resolution_breached
 *   category, subcategory, tags, source_type, ai_*  — Phase B+ surfaces
 *
 * Priority enum mapping (Flask P1–P4 ↔ frontend semantic):
 *   P1 ↔ "critical"
 *   P2 ↔ "high"
 *   P3 ↔ "medium"
 *   P4 ↔ "low"
 *
 * Open questions tracked in docs/system-upgrade/08-decisions/open-questions.md
 * (Q-HD-1 priority enum, Q-HD-2 SLA tracking, Q-HD-3 availableActions RBAC).
 *
 * Do NOT add UI state here. Do NOT import React or component libraries here.
 */

export type TicketStatus = "new" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "critical";

/** Flask priority codes — used at the API boundary only. */
export type FlaskPriorityCode = "P1" | "P2" | "P3" | "P4";

export interface TicketSummary {
  id: number;
  /** User-facing ticket identifier — e.g. "TKT-2026-00042". Primary display ID. */
  ticket_number: string;
  /** Mapped from Flask `subject`. */
  title: string;
  status: TicketStatus;
  /** Mapped from Flask `priority` (P1–P4) — see header comment. */
  priority: TicketPriority;
  /** Mapped from Flask `assigned_to`. */
  assignee_id: number | null;
  /** Mapped from Flask `requester_user_id`. */
  requester_id: number;
  /** From Flask `requester_email` — PII; mask in UI unless caller has permission. */
  requester_email: string | null;
  created_at: string;
  updated_at: string;

  // SLA — separate response and resolution tracks (matches Flask schema)
  /** ISO-8601 deadline for first response; null when no SLA applies. */
  response_due_at: string | null;
  /** ISO-8601 deadline for resolution; null when no SLA applies. */
  resolution_due_at: string | null;
  /** True when first-response SLA breached. */
  sla_response_breached: boolean;
  /** True when resolution SLA breached. */
  sla_resolution_breached: boolean;
  /**
   * Computed convenience flag — true when EITHER SLA track is breached.
   * Use this for at-a-glance UI; use the two specific flags for detailed views.
   */
  sla_breached: boolean;
}

export interface TicketDetail extends TicketSummary {
  description: string;
  /** User IDs who have viewed this ticket recently (for "watching" UX). */
  watchers: number[];
  /** Comment count for badge display. */
  comment_count: number;
  /** Free-form taxonomy from Flask. */
  category: string | null;
  subcategory: string | null;
  tags: string[];
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
