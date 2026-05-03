/**
 * Audit log API client (platform-wide, R046).
 *
 * MOCK MODE returns ~17 fixture entries spanning the last 5 days. Flips to
 * false once R046-min AuditLog backend lands. Proxy path `/api/proxy/audit-log/*`.
 *
 * **Contract.** The shape returned here is authoritative for what the backend
 * MUST emit on flip. See `docs/system-upgrade/05-ai/audit-log.md` for the
 * canonical SQLAlchemy schema, the 7-category enum (login/create/update/
 * delete/admin/ai/security), retention rules, PII redaction rules, and the
 * `UserActivity` → `audit_log` backfill SQL. Review #2 Q-AU-1 resolved this
 * doc gap; do NOT change the wire shape here without updating that spec in
 * lockstep.
 */
import type {
  AuditLogParams,
  AuditLogResponse,
  AuditLogStatsResponse,
  AuditLogEntry,
  AuditCategory,
} from "@/lib/modules/audit/types";

export const MOCK_MODE = true;

// ---------------------------------------------------------------------------
// Mock fixtures
// ---------------------------------------------------------------------------

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
}

const MOCK_ENTRIES: AuditLogEntry[] = [
  {
    id: 1001,
    org_id: 1,
    action: "auth.login",
    category: "login",
    actor_id: 1,
    actor_name: "System Admin",
    resource_type: "session",
    resource_id: "sess-2026-05-01-001",
    timestamp: hoursAgo(0.5),
    metadata: { method: "password", mfa: false },
    ip: "10.0.0.42",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; ...)",
  },
  {
    id: 1002,
    org_id: 1,
    action: "helpdesk.ticket.create",
    category: "create",
    actor_id: 1,
    actor_name: "Monitoring Bot",
    resource_type: "ticket",
    resource_id: "1004",
    timestamp: hoursAgo(2),
    metadata: { source: "prometheus_alert", priority: "P1" },
    ip: null,
    user_agent: "AlertManager/0.27",
  },
  {
    id: 1003,
    org_id: 1,
    action: "helpdesk.ticket.assigned",
    category: "update",
    actor_id: 3,
    actor_name: "OnCall Olivia",
    resource_type: "ticket",
    resource_id: "1004",
    timestamp: hoursAgo(2.0),
    metadata: { assignee_id: 3, previous_assignee: null },
    ip: "10.0.0.18",
    user_agent: "Mozilla/5.0",
  },
  {
    id: 1004,
    org_id: 1,
    action: "helpdesk.ticket.priority_changed",
    category: "update",
    actor_id: 3,
    actor_name: "OnCall Olivia",
    resource_type: "ticket",
    resource_id: "1004",
    timestamp: hoursAgo(2.1),
    metadata: { from: "P2", to: "P1" },
    ip: "10.0.0.18",
    user_agent: "Mozilla/5.0",
  },
  {
    id: 1005,
    org_id: 1,
    action: "helpdesk.ticket.status_changed",
    category: "update",
    actor_id: 3,
    actor_name: "OnCall Olivia",
    resource_type: "ticket",
    resource_id: "1004",
    timestamp: hoursAgo(2.2),
    metadata: { from: "new", to: "in_progress" },
    ip: "10.0.0.18",
    user_agent: "Mozilla/5.0",
  },
  {
    id: 1006,
    org_id: 1,
    action: "helpdesk.ticket.create",
    category: "create",
    actor_id: 42,
    actor_name: "Daisy Doe",
    resource_type: "ticket",
    resource_id: "1001",
    timestamp: hoursAgo(28),
    metadata: { source: "web_form", priority: "P2" },
    ip: "10.0.0.55",
    user_agent: "Mozilla/5.0",
  },
  {
    id: 1007,
    org_id: 1,
    action: "users.create",
    category: "create",
    actor_id: 1,
    actor_name: "System Admin",
    resource_type: "user",
    resource_id: "47",
    timestamp: hoursAgo(50),
    metadata: { email: "[redacted]", role: "technician" },
    ip: "10.0.0.42",
    user_agent: "Mozilla/5.0",
  },
  {
    id: 1008,
    org_id: 1,
    action: "ai.chat.message",
    category: "ai",
    actor_id: 7,
    actor_name: "Tech Tim",
    resource_type: "ai_session",
    resource_id: "sess-ai-12",
    timestamp: hoursAgo(1.5),
    metadata: { model: "claude-opus-4-7", input_tokens: 234, output_tokens: 87 },
    ip: "10.0.0.18",
    user_agent: "Mozilla/5.0",
  },
  {
    id: 1009,
    org_id: 1,
    action: "ai.action.proposed",
    category: "ai",
    actor_id: 7,
    actor_name: "Tech Tim",
    resource_type: "ai_action_token",
    resource_id: "tok-mock-12345",
    timestamp: hoursAgo(1.5),
    metadata: { action_id: "helpdesk.ticket.take", capability_level: "WRITE_LOW" },
    ip: "10.0.0.18",
    user_agent: "Mozilla/5.0",
  },
  {
    id: 1010,
    org_id: 1,
    action: "ai.action.confirmed",
    category: "ai",
    actor_id: 7,
    actor_name: "Tech Tim",
    resource_type: "ai_action_token",
    resource_id: "tok-mock-12345",
    timestamp: hoursAgo(1.49),
    metadata: { action_id: "helpdesk.ticket.take", target_id: "1002" },
    ip: "10.0.0.18",
    user_agent: "Mozilla/5.0",
  },
  {
    id: 1011,
    org_id: 1,
    action: "auth.login",
    category: "login",
    actor_id: 7,
    actor_name: "Tech Tim",
    resource_type: "session",
    resource_id: "sess-2026-05-01-014",
    timestamp: hoursAgo(8),
    metadata: { method: "password", mfa: false },
    ip: "10.0.0.18",
    user_agent: "Mozilla/5.0",
  },
  {
    id: 1012,
    org_id: 1,
    action: "auth.login.failed",
    category: "security",
    actor_id: null,
    actor_name: null,
    resource_type: "session",
    resource_id: null,
    timestamp: hoursAgo(36),
    metadata: { email: "[redacted]", reason: "invalid_password", attempts: 3 },
    ip: "203.0.113.42",
    user_agent: "curl/7.88.1",
  },
  {
    id: 1013,
    org_id: 1,
    action: "helpdesk.sla.policy_updated",
    category: "admin",
    actor_id: 1,
    actor_name: "System Admin",
    resource_type: "sla_policy",
    resource_id: "3",
    timestamp: hoursAgo(72),
    metadata: { fields: ["resolution_minutes"], from: 2880, to: 1440 },
    ip: "10.0.0.42",
    user_agent: "Mozilla/5.0",
  },
  {
    id: 1014,
    org_id: 1,
    action: "users.deactivate",
    category: "delete",
    actor_id: 1,
    actor_name: "System Admin",
    resource_type: "user",
    resource_id: "31",
    timestamp: hoursAgo(96),
    metadata: { reason: "terminated", soft_delete: true },
    ip: "10.0.0.42",
    user_agent: "Mozilla/5.0",
  },
  {
    id: 1015,
    org_id: 1,
    action: "roles.permissions_updated",
    category: "admin",
    actor_id: 1,
    actor_name: "System Admin",
    resource_type: "role",
    resource_id: "3",
    timestamp: hoursAgo(120),
    metadata: { added: ["helpdesk.assign"], removed: [] },
    ip: "10.0.0.42",
    user_agent: "Mozilla/5.0",
  },
  {
    id: 1016,
    org_id: 1,
    action: "helpdesk.ticket.resolve",
    category: "update",
    actor_id: 7,
    actor_name: "Tech Tim",
    resource_type: "ticket",
    resource_id: "1003",
    timestamp: hoursAgo(20),
    metadata: { resolution: "Pushed updated email signature template" },
    ip: "10.0.0.18",
    user_agent: "Mozilla/5.0",
  },
  {
    id: 1017,
    org_id: 1,
    action: "ai.action.rejected",
    category: "ai",
    actor_id: 7,
    actor_name: "Tech Tim",
    resource_type: "ai_action_token",
    resource_id: "tok-mock-99999",
    timestamp: hoursAgo(4),
    metadata: { action_id: "users.deactivate", reason: "user_clicked_reject" },
    ip: "10.0.0.18",
    user_agent: "Mozilla/5.0",
  },
];

function applyAuditFilters(
  entries: AuditLogEntry[],
  params: AuditLogParams,
): AuditLogEntry[] {
  let result = entries;
  if (params.category) result = result.filter((e) => e.category === params.category);
  if (params.actor_id !== undefined) {
    result = result.filter((e) => e.actor_id === params.actor_id);
  }
  if (params.from) {
    const fromTs = new Date(params.from).getTime();
    result = result.filter((e) => new Date(e.timestamp).getTime() >= fromTs);
  }
  if (params.to) {
    const toTs = new Date(params.to).getTime();
    result = result.filter((e) => new Date(e.timestamp).getTime() <= toTs);
  }
  if (params.search) {
    const q = params.search.toLowerCase();
    result = result.filter(
      (e) =>
        e.action.toLowerCase().includes(q) ||
        (e.resource_type ?? "").toLowerCase().includes(q) ||
        (e.actor_name ?? "").toLowerCase().includes(q),
    );
  }
  // Newest first
  return [...result].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function fetchAuditLog(
  params: AuditLogParams,
): Promise<AuditLogResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 150));
    const filtered = applyAuditFilters(MOCK_ENTRIES, params);
    const start = (params.page - 1) * params.per_page;
    return {
      success: true,
      data: {
        entries: filtered.slice(start, start + params.per_page),
        total: filtered.length,
        page: params.page,
        per_page: params.per_page,
      },
    };
  }
  const qs = new URLSearchParams();
  qs.set("page", String(params.page));
  qs.set("per_page", String(params.per_page));
  if (params.category) qs.set("category", params.category);
  if (params.actor_id !== undefined) qs.set("actor_id", String(params.actor_id));
  if (params.search) qs.set("search", params.search);
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  const res = await fetch(`/api/proxy/audit-log?${qs.toString()}`);
  if (!res.ok) throw new Error(`fetchAuditLog failed: ${res.status}`);
  return res.json();
}

export async function fetchAuditLogStats(): Promise<AuditLogStatsResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 100));
    const now = Date.now();
    const last24h = MOCK_ENTRIES.filter(
      (e) => now - new Date(e.timestamp).getTime() <= 24 * 60 * 60 * 1000,
    );
    const last7d = MOCK_ENTRIES.filter(
      (e) => now - new Date(e.timestamp).getTime() <= 7 * 24 * 60 * 60 * 1000,
    );
    const byCategory: Record<AuditCategory, number> = {
      login: 0,
      create: 0,
      update: 0,
      delete: 0,
      admin: 0,
      ai: 0,
      security: 0,
    };
    for (const e of last24h) {
      byCategory[e.category]++;
    }
    const uniqueActors = new Set(
      last24h.filter((e) => e.actor_id !== null).map((e) => e.actor_id),
    );
    return {
      success: true,
      data: {
        total_24h: last24h.length,
        total_7d: last7d.length,
        by_category_24h: byCategory,
        unique_actors_24h: uniqueActors.size,
      },
    };
  }
  const res = await fetch("/api/proxy/audit-log/stats");
  if (!res.ok) throw new Error(`fetchAuditLogStats failed: ${res.status}`);
  return res.json();
}
