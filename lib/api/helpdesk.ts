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
