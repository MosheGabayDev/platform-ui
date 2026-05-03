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

/**
 * Ticket timeline event types.
 *
 * **Backend reality:** Flask `TicketTimeline.event_type` is `String(30)` — an
 * open enum. Investigation flows in legacy emit values like `tool_invoked`,
 * `escalated`, `kb_referenced`, `command_executed`. Frontend canonicals
 * cover the 8 well-known cases; consumers MUST fall back gracefully on
 * unknown strings (do NOT index a `Record<TicketEventType, …>` without `?? default`).
 *
 * Tracked in `08-decisions/open-questions.md` Q-HD-7.
 */
export type CanonicalTicketEventType =
  | "created"
  | "assigned"
  | "status_changed"
  | "comment_added"
  | "priority_changed"
  | "resolved"
  | "closed"
  | "reopened";

/** Open string with autocomplete for the 8 canonical values. */
export type TicketEventType = CanonicalTicketEventType | (string & {});

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

/**
 * TechnicianProfile — mirrors platformengineer/apps/helpdesk/models.py
 * TechnicianProfile.to_dict(). user_id joins to the Users module for name+email.
 */
export interface TechnicianProfile {
  id: number;
  org_id: number;
  user_id: number;
  /** Display fields joined from Users module (mock includes them inline). */
  name: string;
  email: string;
  skills: string[];
  is_available: boolean;
  max_concurrent: number;
  active_tickets: number;
  shift_start: string | null;
  shift_end: string | null;
  shift_days: number[];
  created_at: string | null;
  updated_at: string | null;
}

export interface TechniciansListResponse {
  success: boolean;
  data: {
    technicians: TechnicianProfile[];
    total: number;
  };
}

export interface TechnicianUtilization {
  user_id: number;
  name: string;
  active_tickets: number;
  max_concurrent: number;
  utilization_pct: number;
  is_available: boolean;
}

export interface TechnicianUtilizationResponse {
  success: boolean;
  data: {
    technicians: TechnicianUtilization[];
    avg_utilization_pct: number;
  };
}

/**
 * SLA policies — mirrors apps/helpdesk/models.py SLAPolicy.to_dict().
 * Per-org, per-priority response/resolution targets with optional business-hours window.
 */
export interface SLAPolicy {
  id: number;
  org_id: number;
  name: string;
  /** Flask priority code (P1-P4) — semantic translation handled at the boundary. */
  priority: FlaskPriorityCode;
  /** Semantic priority for UI display. */
  priority_label: TicketPriority;
  response_minutes: number;
  resolution_minutes: number;
  business_hours_only: boolean;
  business_start: string | null;
  business_end: string | null;
  business_days: number[];
  is_default: boolean;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface SLAPoliciesResponse {
  success: boolean;
  data: {
    policies: SLAPolicy[];
    total: number;
  };
}

export interface SLAComplianceBreakdown {
  priority: TicketPriority;
  total: number;
  on_track: number;
  breached_response: number;
  breached_resolution: number;
  compliance_pct: number;
}

export interface SLAComplianceResponse {
  success: boolean;
  data: {
    overall_compliance_pct: number;
    response_compliance_pct: number;
    resolution_compliance_pct: number;
    by_priority: SLAComplianceBreakdown[];
    /** Tickets currently breached (not yet resolved). */
    active_breaches: number;
  };
}

// ---------------------------------------------------------------------------
// Platform Approval Flow (cap 13) — backed by `tool_invocations` table
// ---------------------------------------------------------------------------

/**
 * ToolInvocation — mirrors `apps/helpdesk/models.py ToolInvocation.to_dict()`.
 * Each row is one AI tool/action call. When `approval_required=true` and
 * `status='pending_approval'`, it appears in the approval queue UI.
 *
 * Status values (open enum, String(30) in Flask):
 *   queued | running | success | error | timed_out | cancelled |
 *   pending_approval | approved | rejected
 */
export type ToolInvocationStatus =
  | "queued"
  | "running"
  | "success"
  | "error"
  | "timed_out"
  | "cancelled"
  | "pending_approval"
  | "approved"
  | "rejected"
  | (string & {});

/**
 * Frozen snapshot of the tool registration at approval time — prevents
 * registry drift between the orchestrator's plan and the resumed execution.
 */
export interface ToolSnapshot {
  handler_type: string;
  handler_config: Record<string, unknown>;
  timeout_seconds: number;
  risk_level: "low" | "medium" | "high" | "critical" | (string & {});
  captured_at: string;
}

export interface ToolInvocation {
  id: number;
  org_id: number;
  session_id: number;
  tool_name: string;
  input_params: Record<string, unknown>;
  output_data: Record<string, unknown> | null;
  status: ToolInvocationStatus;
  error_message: string | null;
  duration_ms: number | null;
  approval_required: boolean;
  tool_snapshot: ToolSnapshot | null;
  created_at: string;
  /**
   * Display fields not in the Flask `to_dict()` — joined or computed.
   * `requested_by_name` joins through session → user; `ticket_id` joins through
   * the helpdesk_session that owns the invocation. Both are optional because
   * they require server-side joins on the eventual live endpoint.
   */
  requested_by_name?: string | null;
  ticket_id?: number | null;
}

export interface ApprovalsListParams {
  page: number;
  per_page: number;
  /** Defaults to `pending_approval` on the page; admin can widen. */
  status?: ToolInvocationStatus;
  /** Free-text search across tool_name + ticket_id. */
  search?: string;
}

export interface ApprovalsListResponse {
  success: boolean;
  data: {
    invocations: ToolInvocation[];
    total: number;
    pending_count: number;
    page: number;
    per_page: number;
  };
}

export interface ApprovalActionResponse {
  success: boolean;
  message: string;
}
