/**
 * Helpdesk API client.
 *
 * MOCK MODE until backend rounds R042-BE-min + R044-min + R045-min + R046-min
 * land per ADR-040 Helpdesk-validated foundation slicing. The proxy path
 * `/api/proxy/helpdesk/*` is reserved; flip MOCK_MODE to false once live.
 *
 * **Schema mapping (post-review 2026-05-01):**
 * Frontend types use semantic names (title, assignee_id, priority enum); Flask
 * uses different conventions (subject, assigned_to, P1-P4). Translation lives
 * in `transformFlaskTicket()` below — this is the single source of truth for
 * the boundary mapping until backend serializers move into the new shape.
 *
 * Spec: docs/modules/04-helpdesk/{PLAN,LEGACY_INVENTORY,E2E_COVERAGE,AI_READINESS}.md
 * Decision log: docs/system-upgrade/08-decisions/open-questions.md (Q-HD-1, Q-HD-2)
 */
import type {
  TicketsListParams,
  TicketsListResponse,
  HelpdeskStatsResponse,
  TicketSummary,
  HelpdeskStats,
  TicketDetail,
  TicketDetailResponse,
  TicketEvent,
  TicketPriority,
  FlaskPriorityCode,
  TechnicianProfile,
  TechniciansListResponse,
  TechnicianUtilizationResponse,
  SLAPolicy,
  SLAPoliciesResponse,
  SLAComplianceResponse,
} from "@/lib/modules/helpdesk/types";

export const MOCK_MODE = true;

// ---------------------------------------------------------------------------
// Schema mapping — Flask ↔ Frontend boundary
// ---------------------------------------------------------------------------

/** Flask Ticket.to_dict() shape (subset — only fields we currently use). */
interface FlaskTicket {
  id: number;
  ticket_number: string;
  subject: string;
  status: TicketSummary["status"];
  priority: FlaskPriorityCode;
  assigned_to: number | null;
  requester_user_id: number;
  requester_email: string | null;
  created_at: string;
  updated_at: string;
  response_due_at: string | null;
  resolution_due_at: string | null;
  sla_response_breached: boolean;
  sla_resolution_breached: boolean;
}

interface FlaskTicketDetail extends FlaskTicket {
  description: string;
  watchers: number[];
  comment_count: number;
  category: string | null;
  subcategory: string | null;
  tags: string[];
}

const FLASK_TO_SEMANTIC_PRIORITY: Record<FlaskPriorityCode, TicketPriority> = {
  P1: "critical",
  P2: "high",
  P3: "medium",
  P4: "low",
};

const SEMANTIC_TO_FLASK_PRIORITY: Record<TicketPriority, FlaskPriorityCode> = {
  critical: "P1",
  high: "P2",
  medium: "P3",
  low: "P4",
};

export function transformFlaskTicket(raw: FlaskTicket): TicketSummary {
  return {
    id: raw.id,
    ticket_number: raw.ticket_number,
    title: raw.subject,
    status: raw.status,
    priority: FLASK_TO_SEMANTIC_PRIORITY[raw.priority],
    assignee_id: raw.assigned_to,
    requester_id: raw.requester_user_id,
    requester_email: raw.requester_email,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    response_due_at: raw.response_due_at,
    resolution_due_at: raw.resolution_due_at,
    sla_response_breached: raw.sla_response_breached,
    sla_resolution_breached: raw.sla_resolution_breached,
    sla_breached: raw.sla_response_breached || raw.sla_resolution_breached,
  };
}

export function transformFlaskTicketDetail(raw: FlaskTicketDetail): TicketDetail {
  return {
    ...transformFlaskTicket(raw),
    description: raw.description,
    watchers: raw.watchers,
    comment_count: raw.comment_count,
    category: raw.category,
    subcategory: raw.subcategory,
    tags: raw.tags,
  };
}

// ---------------------------------------------------------------------------
// Mock fixtures (in frontend shape — the transform applies only to live data)
// ---------------------------------------------------------------------------

const MOCK_STATS: HelpdeskStats = {
  open_tickets: 47,
  resolved_today: 12,
  avg_resolution_hours: 6.4,
  sla_compliance_pct: 92.3,
};

const MOCK_TICKETS: TicketSummary[] = [
  {
    id: 1001,
    ticket_number: "TKT-2026-01001",
    title: "VPN connection drops every 30 minutes",
    status: "in_progress",
    priority: "high",
    assignee_id: 7,
    requester_id: 42,
    requester_email: null, // PII redacted in fixture
    created_at: "2026-04-30T09:15:00Z",
    updated_at: "2026-05-01T08:00:00Z",
    response_due_at: "2026-04-30T10:15:00Z",
    resolution_due_at: "2026-05-01T15:15:00Z",
    sla_response_breached: false,
    sla_resolution_breached: false,
    sla_breached: false,
  },
  {
    id: 1002,
    ticket_number: "TKT-2026-01002",
    title: "Cannot access shared drive on new laptop",
    status: "new",
    priority: "medium",
    assignee_id: null,
    requester_id: 15,
    requester_email: null,
    created_at: "2026-05-01T07:30:00Z",
    updated_at: "2026-05-01T07:30:00Z",
    response_due_at: "2026-05-01T11:30:00Z",
    resolution_due_at: "2026-05-01T19:30:00Z",
    sla_response_breached: false,
    sla_resolution_breached: false,
    sla_breached: false,
  },
  {
    id: 1003,
    ticket_number: "TKT-2026-01003",
    title: "Email signature missing company logo",
    status: "resolved",
    priority: "low",
    assignee_id: 7,
    requester_id: 23,
    requester_email: null,
    created_at: "2026-04-29T14:00:00Z",
    updated_at: "2026-04-30T10:00:00Z",
    response_due_at: null,
    resolution_due_at: null,
    sla_response_breached: false,
    sla_resolution_breached: false,
    sla_breached: false,
  },
  {
    id: 1004,
    ticket_number: "TKT-2026-01004",
    title: "Server CPU at 95% on prod-app-02",
    status: "in_progress",
    priority: "critical",
    assignee_id: 3,
    requester_id: 1,
    requester_email: null,
    created_at: "2026-05-01T06:00:00Z",
    updated_at: "2026-05-01T06:30:00Z",
    response_due_at: "2026-05-01T06:30:00Z",
    resolution_due_at: "2026-05-01T08:00:00Z",
    sla_response_breached: false,
    sla_resolution_breached: true,
    sla_breached: true,
  },
  {
    id: 1005,
    ticket_number: "TKT-2026-01005",
    title: "New employee onboarding — laptop setup",
    status: "new",
    priority: "medium",
    assignee_id: null,
    requester_id: 8,
    requester_email: null,
    created_at: "2026-05-01T05:00:00Z",
    updated_at: "2026-05-01T05:00:00Z",
    response_due_at: null,
    resolution_due_at: null,
    sla_response_breached: false,
    sla_resolution_breached: false,
    sla_breached: false,
  },
];

function applyFilters(
  tickets: TicketSummary[],
  params: TicketsListParams,
): TicketSummary[] {
  let filtered = tickets;
  if (params.status) filtered = filtered.filter((t) => t.status === params.status);
  if (params.priority) filtered = filtered.filter((t) => t.priority === params.priority);
  if (params.assignee_id !== undefined) {
    filtered = filtered.filter((t) => t.assignee_id === params.assignee_id);
  }
  if (params.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.ticket_number.toLowerCase().includes(q),
    );
  }
  return filtered;
}

// ---------------------------------------------------------------------------
// Public API — fetch* functions
// ---------------------------------------------------------------------------

export async function fetchHelpdeskStats(): Promise<HelpdeskStatsResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 200));
    return { success: true, data: MOCK_STATS };
  }

  const res = await fetch("/api/proxy/helpdesk/dashboard/stats");
  if (!res.ok) throw new Error(`fetchHelpdeskStats failed: ${res.status}`);
  return res.json();
}

export async function fetchTickets(
  params: TicketsListParams,
): Promise<TicketsListResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 250));
    const filtered = applyFilters(MOCK_TICKETS, params);
    const start = (params.page - 1) * params.per_page;
    const paged = filtered.slice(start, start + params.per_page);
    return {
      success: true,
      data: {
        tickets: paged,
        page: params.page,
        per_page: params.per_page,
        total: filtered.length,
      },
    };
  }

  const qs = new URLSearchParams();
  qs.set("page", String(params.page));
  qs.set("per_page", String(params.per_page));
  if (params.status) qs.set("status", params.status);
  // Translate semantic priority back to Flask P-codes when calling backend
  if (params.priority) qs.set("priority", SEMANTIC_TO_FLASK_PRIORITY[params.priority]);
  if (params.assignee_id !== undefined) qs.set("assignee_id", String(params.assignee_id));
  if (params.search) qs.set("search", params.search);

  const res = await fetch(`/api/proxy/helpdesk/api/tickets?${qs.toString()}`);
  if (!res.ok) throw new Error(`fetchTickets failed: ${res.status}`);
  const raw = (await res.json()) as {
    success: boolean;
    data: { tickets: FlaskTicket[]; page: number; per_page: number; total: number };
  };
  return {
    success: raw.success,
    data: {
      ...raw.data,
      tickets: raw.data.tickets.map(transformFlaskTicket),
    },
  };
}

const MOCK_EVENTS_BY_TICKET: Record<number, TicketEvent[]> = {
  1001: [
    { id: 1, type: "created", timestamp: "2026-04-30T09:15:00Z", actor_id: 42, actor_name: "Daisy Doe", description: "Ticket opened" },
    { id: 2, type: "assigned", timestamp: "2026-04-30T09:30:00Z", actor_id: 1, actor_name: "Manager Bot", description: "Assigned to Tech Tim", detail: "Auto-assigned by VPN-issue rule" },
    { id: 3, type: "comment_added", timestamp: "2026-04-30T11:00:00Z", actor_id: 7, actor_name: "Tech Tim", description: "Reproduced — checking firewall logs" },
    { id: 4, type: "status_changed", timestamp: "2026-04-30T14:00:00Z", actor_id: 7, actor_name: "Tech Tim", description: "Status: new → in_progress" },
  ],
  1002: [
    { id: 1, type: "created", timestamp: "2026-05-01T07:30:00Z", actor_id: 15, actor_name: "Eve Engineer", description: "Ticket opened" },
  ],
  1003: [
    { id: 1, type: "created", timestamp: "2026-04-29T14:00:00Z", actor_id: 23, actor_name: "Sam Sales", description: "Ticket opened" },
    { id: 2, type: "assigned", timestamp: "2026-04-29T14:10:00Z", actor_id: 1, actor_name: "Manager Bot", description: "Assigned to Tech Tim" },
    { id: 3, type: "resolved", timestamp: "2026-04-30T10:00:00Z", actor_id: 7, actor_name: "Tech Tim", description: "Resolved — pushed updated email signature template" },
  ],
  1004: [
    { id: 1, type: "created", timestamp: "2026-05-01T06:00:00Z", actor_id: 1, actor_name: "Monitoring Bot", description: "Auto-created from Prometheus alert", detail: "cpu_usage > 95% for 5m on prod-app-02" },
    { id: 2, type: "priority_changed", timestamp: "2026-05-01T06:05:00Z", actor_id: 3, actor_name: "OnCall Olivia", description: "Priority: high → critical" },
    { id: 3, type: "assigned", timestamp: "2026-05-01T06:10:00Z", actor_id: 3, actor_name: "OnCall Olivia", description: "Assigned to OnCall Olivia (self)" },
    { id: 4, type: "status_changed", timestamp: "2026-05-01T06:30:00Z", actor_id: 3, actor_name: "OnCall Olivia", description: "Status: new → in_progress", detail: "Triaging — likely runaway process" },
  ],
  1005: [
    { id: 1, type: "created", timestamp: "2026-05-01T05:00:00Z", actor_id: 8, actor_name: "HR Hannah", description: "Ticket opened" },
  ],
};

const MOCK_DETAILS: Record<
  number,
  Pick<TicketDetail, "description" | "watchers" | "comment_count" | "category" | "subcategory" | "tags">
> = {
  1001: {
    description:
      "User reports the corporate VPN client disconnects every ~30 minutes when working from home. Issue persists across multiple networks. Reconnection is automatic but breaks long-running SSH sessions.",
    watchers: [42, 7],
    comment_count: 1,
    category: "Network",
    subcategory: "VPN",
    tags: ["vpn", "remote-work"],
  },
  1002: {
    description:
      "Newly issued laptop cannot reach the shared drive at \\\\fileserver\\common. Other resources (Wi-Fi, email, SSO) all work. Suspect missing AD group membership or DNS cache.",
    watchers: [15],
    comment_count: 0,
    category: "Access",
    subcategory: "File share",
    tags: ["onboarding", "ad"],
  },
  1003: {
    description:
      "Email signature does not show the new company logo after the rebrand. Affects all outgoing mail from this user. Other users on the same template look correct.",
    watchers: [23, 7],
    comment_count: 0,
    category: "Email",
    subcategory: "Signature",
    tags: ["rebrand"],
  },
  1004: {
    description:
      "Production application server prod-app-02 is sustained at 95%+ CPU usage. User-facing latency degrading. Auto-paged via Prometheus alert.",
    watchers: [1, 3],
    comment_count: 0,
    category: "Infrastructure",
    subcategory: "Performance",
    tags: ["prod", "alert", "p1-incident"],
  },
  1005: {
    description:
      "New employee starting Monday — needs laptop, email account, slack invite, and standard onboarding documentation. Please complete by EOD Friday.",
    watchers: [8],
    comment_count: 0,
    category: "Onboarding",
    subcategory: "New hire",
    tags: ["onboarding"],
  },
};

// ---------------------------------------------------------------------------
// Phase B mutations (mock — actual writes need R046-min audit + notifications)
// ---------------------------------------------------------------------------

export interface TicketActionResponse {
  success: boolean;
  message: string;
}

export interface TakeTicketInput {
  ticketId: number;
}

export interface ResolveTicketInput {
  ticketId: number;
  resolution: string;
}

export interface ReassignTicketInput {
  ticketId: number;
  assigneeId: number;
  reason?: string;
}

export interface CommentTicketInput {
  ticketId: number;
  content: string;
}

/** In-mock-mode mutation tracker so detail page re-renders after a take/resolve. */
function applyMockTransition(id: number, change: Partial<TicketSummary>): void {
  const idx = MOCK_TICKETS.findIndex((t) => t.id === id);
  if (idx >= 0) {
    MOCK_TICKETS[idx] = {
      ...MOCK_TICKETS[idx],
      ...change,
      updated_at: new Date().toISOString(),
    };
  }
}

function appendMockEvent(id: number, event: Omit<TicketEvent, "id">): void {
  const events = MOCK_EVENTS_BY_TICKET[id] ?? [];
  const nextId = (events[events.length - 1]?.id ?? 0) + 1;
  MOCK_EVENTS_BY_TICKET[id] = [...events, { ...event, id: nextId }];
}

export async function takeTicket(input: TakeTicketInput): Promise<TicketActionResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 200));
    applyMockTransition(input.ticketId, { assignee_id: 7, status: "in_progress" });
    appendMockEvent(input.ticketId, {
      type: "assigned",
      timestamp: new Date().toISOString(),
      actor_id: 7,
      actor_name: "Tech Tim",
      description: "Assigned to Tech Tim (self)",
    });
    return { success: true, message: "(mock) Ticket assigned to you." };
  }
  const res = await fetch(`/api/proxy/helpdesk/api/tickets/${input.ticketId}/take`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`takeTicket failed: ${res.status}`);
  return res.json();
}

export async function resolveTicket(input: ResolveTicketInput): Promise<TicketActionResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 250));
    applyMockTransition(input.ticketId, { status: "resolved" });
    appendMockEvent(input.ticketId, {
      type: "resolved",
      timestamp: new Date().toISOString(),
      actor_id: 7,
      actor_name: "Tech Tim",
      description: `Resolved: ${input.resolution}`,
    });
    return { success: true, message: "(mock) Ticket resolved." };
  }
  const res = await fetch(`/api/proxy/helpdesk/api/tickets/${input.ticketId}/resolve`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resolution: input.resolution }),
  });
  if (!res.ok) throw new Error(`resolveTicket failed: ${res.status}`);
  return res.json();
}

export async function reassignTicket(input: ReassignTicketInput): Promise<TicketActionResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 200));
    applyMockTransition(input.ticketId, {
      assignee_id: input.assigneeId,
      status: "in_progress",
    });
    appendMockEvent(input.ticketId, {
      type: "assigned",
      timestamp: new Date().toISOString(),
      actor_id: 1,
      actor_name: "Manager Bot",
      description: `Reassigned to user #${input.assigneeId}`,
      detail: input.reason,
    });
    return { success: true, message: "(mock) Ticket reassigned." };
  }
  const res = await fetch(`/api/proxy/helpdesk/api/tickets/${input.ticketId}/reassign`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assignee_id: input.assigneeId, reason: input.reason }),
  });
  if (!res.ok) throw new Error(`reassignTicket failed: ${res.status}`);
  return res.json();
}

export async function commentOnTicket(
  input: CommentTicketInput,
): Promise<TicketActionResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 150));
    appendMockEvent(input.ticketId, {
      type: "comment_added",
      timestamp: new Date().toISOString(),
      actor_id: 7,
      actor_name: "Tech Tim",
      description: input.content,
    });
    return { success: true, message: "(mock) Comment added." };
  }
  const res = await fetch(`/api/proxy/helpdesk/api/tickets/${input.ticketId}/comments`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: input.content }),
  });
  if (!res.ok) throw new Error(`commentOnTicket failed: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------

export async function fetchTicket(id: number): Promise<TicketDetailResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 200));
    const summary = MOCK_TICKETS.find((t) => t.id === id);
    if (!summary) {
      throw new Error(`fetchTicket failed: 404 — ticket ${id} not found`);
    }
    const extra = MOCK_DETAILS[id] ?? {
      description: "(no description available)",
      watchers: [],
      comment_count: 0,
      category: null,
      subcategory: null,
      tags: [],
    };
    const events = MOCK_EVENTS_BY_TICKET[id] ?? [];
    return {
      success: true,
      data: {
        ticket: { ...summary, ...extra },
        events,
      },
    };
  }

  const res = await fetch(`/api/proxy/helpdesk/api/tickets/${id}`);
  if (!res.ok) throw new Error(`fetchTicket failed: ${res.status}`);
  const raw = (await res.json()) as {
    success: boolean;
    data: { ticket: FlaskTicketDetail; events: TicketEvent[] };
  };
  return {
    success: raw.success,
    data: {
      ticket: transformFlaskTicketDetail(raw.data.ticket),
      events: raw.data.events,
    },
  };
}

// ---------------------------------------------------------------------------
// Technicians (Phase B)
// ---------------------------------------------------------------------------

const MOCK_TECHNICIANS: TechnicianProfile[] = [
  {
    id: 1,
    org_id: 1,
    user_id: 7,
    name: "Tech Tim",
    email: "tim@platform.local",
    skills: ["VPN", "Network", "Linux", "Active Directory"],
    is_available: true,
    max_concurrent: 8,
    active_tickets: 3,
    shift_start: "08:00",
    shift_end: "17:00",
    shift_days: [1, 2, 3, 4, 5],
    created_at: "2026-02-01T00:00:00Z",
    updated_at: "2026-05-01T07:15:00Z",
  },
  {
    id: 2,
    org_id: 1,
    user_id: 3,
    name: "OnCall Olivia",
    email: "olivia@platform.local",
    skills: ["Infrastructure", "Performance", "Kubernetes", "Incident Response"],
    is_available: true,
    max_concurrent: 6,
    active_tickets: 5,
    shift_start: "00:00",
    shift_end: "23:59",
    shift_days: [1, 2, 3, 4, 5, 6, 7],
    created_at: "2026-01-15T00:00:00Z",
    updated_at: "2026-05-01T06:30:00Z",
  },
  {
    id: 3,
    org_id: 1,
    user_id: 12,
    name: "Help Hilda",
    email: "hilda@platform.local",
    skills: ["Email", "Office", "Endpoint"],
    is_available: false,
    max_concurrent: 5,
    active_tickets: 0,
    shift_start: "09:00",
    shift_end: "18:00",
    shift_days: [1, 2, 3, 4, 5],
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-04-29T18:00:00Z",
  },
];

export async function fetchTechnicians(
  availableOnly = false,
): Promise<TechniciansListResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 150));
    const filtered = availableOnly
      ? MOCK_TECHNICIANS.filter((t) => t.is_available)
      : MOCK_TECHNICIANS;
    return { success: true, data: { technicians: filtered, total: filtered.length } };
  }
  const qs = availableOnly ? "?available=true" : "";
  const res = await fetch(`/api/proxy/helpdesk/api/technicians${qs}`);
  if (!res.ok) throw new Error(`fetchTechnicians failed: ${res.status}`);
  return res.json();
}

export async function fetchTechnicianUtilization(): Promise<TechnicianUtilizationResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 100));
    const technicians = MOCK_TECHNICIANS.map((t) => ({
      user_id: t.user_id,
      name: t.name,
      active_tickets: t.active_tickets,
      max_concurrent: t.max_concurrent,
      utilization_pct:
        t.max_concurrent > 0
          ? Math.round((t.active_tickets / t.max_concurrent) * 1000) / 10
          : 0,
      is_available: t.is_available,
    }));
    const avg =
      technicians.reduce((sum, t) => sum + t.utilization_pct, 0) /
      Math.max(1, technicians.length);
    return {
      success: true,
      data: {
        technicians,
        avg_utilization_pct: Math.round(avg * 10) / 10,
      },
    };
  }
  const res = await fetch("/api/proxy/helpdesk/api/technicians/utilization");
  if (!res.ok) throw new Error(`fetchTechnicianUtilization failed: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// SLA (Phase C)
// ---------------------------------------------------------------------------

const MOCK_SLA_POLICIES: SLAPolicy[] = [
  {
    id: 1,
    org_id: 1,
    name: "Critical incident — 24/7",
    priority: "P1",
    priority_label: "critical",
    response_minutes: 15,
    resolution_minutes: 240,
    business_hours_only: false,
    business_start: null,
    business_end: null,
    business_days: [1, 2, 3, 4, 5, 6, 7],
    is_default: false,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: 2,
    org_id: 1,
    name: "High priority — business hours",
    priority: "P2",
    priority_label: "high",
    response_minutes: 60,
    resolution_minutes: 480,
    business_hours_only: true,
    business_start: "08:00",
    business_end: "18:00",
    business_days: [1, 2, 3, 4, 5],
    is_default: false,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: 3,
    org_id: 1,
    name: "Standard — business hours",
    priority: "P3",
    priority_label: "medium",
    response_minutes: 240,
    resolution_minutes: 1440,
    business_hours_only: true,
    business_start: "08:00",
    business_end: "18:00",
    business_days: [1, 2, 3, 4, 5],
    is_default: true,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-03-15T00:00:00Z",
  },
  {
    id: 4,
    org_id: 1,
    name: "Low priority — best effort",
    priority: "P4",
    priority_label: "low",
    response_minutes: 1440,
    resolution_minutes: 4320,
    business_hours_only: true,
    business_start: "08:00",
    business_end: "18:00",
    business_days: [1, 2, 3, 4, 5],
    is_default: false,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

export async function fetchSLAPolicies(): Promise<SLAPoliciesResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 150));
    return {
      success: true,
      data: { policies: MOCK_SLA_POLICIES, total: MOCK_SLA_POLICIES.length },
    };
  }
  const res = await fetch("/api/proxy/helpdesk/api/sla/policies");
  if (!res.ok) throw new Error(`fetchSLAPolicies failed: ${res.status}`);
  return res.json();
}

export async function fetchSLACompliance(): Promise<SLAComplianceResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 200));
    // Derive compliance from current MOCK_TICKETS state.
    const breakdown = (["critical", "high", "medium", "low"] as const).map(
      (priority) => {
        const tickets = MOCK_TICKETS.filter((t) => t.priority === priority);
        const breachedResponse = tickets.filter((t) => t.sla_response_breached).length;
        const breachedResolution = tickets.filter((t) => t.sla_resolution_breached).length;
        const onTrack = tickets.length - breachedResponse - breachedResolution;
        const compliance =
          tickets.length === 0
            ? 100
            : Math.round((onTrack / tickets.length) * 1000) / 10;
        return {
          priority,
          total: tickets.length,
          on_track: onTrack,
          breached_response: breachedResponse,
          breached_resolution: breachedResolution,
          compliance_pct: compliance,
        };
      },
    );
    const totalTickets = MOCK_TICKETS.length;
    const totalBreaches = MOCK_TICKETS.filter(
      (t) => t.sla_response_breached || t.sla_resolution_breached,
    ).length;
    const totalResponseBreaches = MOCK_TICKETS.filter(
      (t) => t.sla_response_breached,
    ).length;
    const totalResolutionBreaches = MOCK_TICKETS.filter(
      (t) => t.sla_resolution_breached,
    ).length;
    return {
      success: true,
      data: {
        overall_compliance_pct:
          totalTickets === 0
            ? 100
            : Math.round(((totalTickets - totalBreaches) / totalTickets) * 1000) / 10,
        response_compliance_pct:
          totalTickets === 0
            ? 100
            : Math.round(
                ((totalTickets - totalResponseBreaches) / totalTickets) * 1000,
              ) / 10,
        resolution_compliance_pct:
          totalTickets === 0
            ? 100
            : Math.round(
                ((totalTickets - totalResolutionBreaches) / totalTickets) * 1000,
              ) / 10,
        by_priority: breakdown,
        active_breaches: MOCK_TICKETS.filter(
          (t) =>
            (t.sla_response_breached || t.sla_resolution_breached) &&
            t.status !== "resolved" &&
            t.status !== "closed",
        ).length,
      },
    };
  }
  const res = await fetch("/api/proxy/helpdesk/api/sla/compliance");
  if (!res.ok) throw new Error(`fetchSLACompliance failed: ${res.status}`);
  return res.json();
}
