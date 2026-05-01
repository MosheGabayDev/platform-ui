/**
 * Helpdesk API client.
 *
 * MOCK MODE until backend rounds R042-BE-min + R044-min + R045-min + R046-min
 * land per ADR-040 Helpdesk-validated foundation slicing. The proxy path
 * `/api/proxy/helpdesk/*` is reserved; flip MOCK_MODE to false once live.
 *
 * Spec: docs/modules/04-helpdesk/{PLAN,LEGACY_INVENTORY,E2E_COVERAGE,AI_READINESS}.md
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
} from "@/lib/modules/helpdesk/types";

export const MOCK_MODE = true;

// ---------------------------------------------------------------------------
// Mock fixtures
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
    title: "VPN connection drops every 30 minutes",
    status: "in_progress",
    priority: "high",
    assignee_id: 7,
    requester_id: 42,
    created_at: "2026-04-30T09:15:00Z",
    updated_at: "2026-05-01T08:00:00Z",
    sla_breach_at: "2026-05-01T15:15:00Z",
    sla_breached: false,
  },
  {
    id: 1002,
    title: "Cannot access shared drive on new laptop",
    status: "new",
    priority: "medium",
    assignee_id: null,
    requester_id: 15,
    created_at: "2026-05-01T07:30:00Z",
    updated_at: "2026-05-01T07:30:00Z",
    sla_breach_at: "2026-05-01T19:30:00Z",
    sla_breached: false,
  },
  {
    id: 1003,
    title: "Email signature missing company logo",
    status: "resolved",
    priority: "low",
    assignee_id: 7,
    requester_id: 23,
    created_at: "2026-04-29T14:00:00Z",
    updated_at: "2026-04-30T10:00:00Z",
    sla_breach_at: null,
    sla_breached: false,
  },
  {
    id: 1004,
    title: "Server CPU at 95% on prod-app-02",
    status: "in_progress",
    priority: "critical",
    assignee_id: 3,
    requester_id: 1,
    created_at: "2026-05-01T06:00:00Z",
    updated_at: "2026-05-01T06:30:00Z",
    sla_breach_at: "2026-05-01T08:00:00Z",
    sla_breached: true,
  },
  {
    id: 1005,
    title: "New employee onboarding — laptop setup",
    status: "new",
    priority: "medium",
    assignee_id: null,
    requester_id: 8,
    created_at: "2026-05-01T05:00:00Z",
    updated_at: "2026-05-01T05:00:00Z",
    sla_breach_at: null,
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
    filtered = filtered.filter((t) => t.title.toLowerCase().includes(q));
  }
  return filtered;
}

// ---------------------------------------------------------------------------
// Public API
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
  if (params.priority) qs.set("priority", params.priority);
  if (params.assignee_id !== undefined) qs.set("assignee_id", String(params.assignee_id));
  if (params.search) qs.set("search", params.search);

  const res = await fetch(`/api/proxy/helpdesk/api/tickets?${qs.toString()}`);
  if (!res.ok) throw new Error(`fetchTickets failed: ${res.status}`);
  return res.json();
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

const MOCK_DETAILS: Record<number, Pick<TicketDetail, "description" | "watchers" | "comment_count">> = {
  1001: {
    description: "User reports the corporate VPN client disconnects every ~30 minutes when working from home. Issue persists across multiple networks. Reconnection is automatic but breaks long-running SSH sessions.",
    watchers: [42, 7],
    comment_count: 1,
  },
  1002: {
    description: "Newly issued laptop cannot reach the shared drive at \\\\fileserver\\common. Other resources (Wi-Fi, email, SSO) all work. Suspect missing AD group membership or DNS cache.",
    watchers: [15],
    comment_count: 0,
  },
  1003: {
    description: "Email signature does not show the new company logo after the rebrand. Affects all outgoing mail from this user. Other users on the same template look correct.",
    watchers: [23, 7],
    comment_count: 0,
  },
  1004: {
    description: "Production application server prod-app-02 is sustained at 95%+ CPU usage. User-facing latency degrading. Auto-paged via Prometheus alert.",
    watchers: [1, 3],
    comment_count: 0,
  },
  1005: {
    description: "New employee starting Monday — needs laptop, email account, slack invite, and standard onboarding documentation. Please complete by EOD Friday.",
    watchers: [8],
    comment_count: 0,
  },
};

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
  return res.json();
}
