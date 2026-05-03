/**
 * Approval queue client (Phase C — backed by `tool_invocations` table).
 *
 * Why a separate file: the helpdesk client is already large and approvals are
 * the platform-wide approval surface (cap 13 PlatformApprovalFlow). Helpdesk
 * filters this view by `module='helpdesk'` but the data model is platform-
 * level. When `/approvals` (platform-wide) ships, the same client serves it.
 *
 * MOCK MODE shares state with the helpdesk MOCK_TICKETS — same flag.
 */
import { MOCK_MODE } from "./helpdesk";
import type {
  ToolInvocation,
  ApprovalsListParams,
  ApprovalsListResponse,
  ApprovalActionResponse,
} from "@/lib/modules/helpdesk/types";

// ---------------------------------------------------------------------------
// Mock fixtures
// ---------------------------------------------------------------------------

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
}
function minutesAgo(m: number): string {
  return new Date(Date.now() - m * 60 * 1000).toISOString();
}

const MOCK_APPROVALS: ToolInvocation[] = [
  {
    id: 5001,
    org_id: 1,
    session_id: 8821,
    tool_name: "deactivate_user",
    input_params: {
      user_id: 31,
      reason: "Termination per HR ticket TKT-2026-01007",
    },
    output_data: null,
    status: "pending_approval",
    error_message: null,
    duration_ms: null,
    approval_required: true,
    tool_snapshot: {
      handler_type: "platform_action",
      handler_config: { module: "users", action: "deactivate" },
      timeout_seconds: 30,
      risk_level: "high",
      captured_at: hoursAgo(8),
    },
    created_at: hoursAgo(8),
    requested_by_name: "AI Agent (Claude)",
    ticket_id: null,
  },
  {
    id: 5002,
    org_id: 1,
    session_id: 8829,
    tool_name: "ticket.bulk_reassign",
    input_params: {
      from_user_id: 12,
      to_user_id: 7,
      ticket_count: 14,
      filter: "off-shift cover",
    },
    output_data: null,
    status: "pending_approval",
    error_message: null,
    duration_ms: null,
    approval_required: true,
    tool_snapshot: {
      handler_type: "platform_action",
      handler_config: { module: "helpdesk", action: "bulk_reassign" },
      timeout_seconds: 60,
      risk_level: "medium",
      captured_at: minutesAgo(35),
    },
    created_at: minutesAgo(35),
    requested_by_name: "OnCall Olivia",
    ticket_id: null,
  },
  {
    id: 5003,
    org_id: 1,
    session_id: 8830,
    tool_name: "execute_remote_command",
    input_params: {
      target: "prod-app-02",
      command: "systemctl restart nginx",
    },
    output_data: null,
    status: "pending_approval",
    error_message: null,
    duration_ms: null,
    approval_required: true,
    tool_snapshot: {
      handler_type: "ssh_runner",
      handler_config: { connector_id: 4, allowlist: ["systemctl"] },
      timeout_seconds: 15,
      risk_level: "critical",
      captured_at: minutesAgo(12),
    },
    created_at: minutesAgo(12),
    requested_by_name: "AI Agent (Claude)",
    ticket_id: 1004,
  },
  {
    id: 5004,
    org_id: 1,
    session_id: 8830,
    tool_name: "lookup_endpoint",
    input_params: { phone: "+972-50-XXXX-XXXX" },
    output_data: { endpoint_id: 22, agent_server: "tlv-1" },
    status: "success",
    error_message: null,
    duration_ms: 87,
    approval_required: false,
    tool_snapshot: null,
    created_at: minutesAgo(13),
    requested_by_name: "AI Agent (Claude)",
    ticket_id: 1004,
  },
  {
    id: 5005,
    org_id: 1,
    session_id: 8745,
    tool_name: "send_notification",
    input_params: {
      recipient_id: 42,
      template: "ticket_resolved",
      ticket_id: 1003,
    },
    output_data: { delivered: true },
    status: "approved",
    error_message: null,
    duration_ms: 234,
    approval_required: true,
    tool_snapshot: {
      handler_type: "platform_action",
      handler_config: { module: "notifications", action: "send" },
      timeout_seconds: 30,
      risk_level: "low",
      captured_at: hoursAgo(26),
    },
    created_at: hoursAgo(26),
    requested_by_name: "Tech Tim",
    ticket_id: 1003,
  },
  {
    id: 5006,
    org_id: 1,
    session_id: 8201,
    tool_name: "drop_database_table",
    input_params: { table: "user_preferences_old" },
    output_data: null,
    status: "rejected",
    error_message: "User rejected: too risky without backup",
    duration_ms: null,
    approval_required: true,
    tool_snapshot: {
      handler_type: "platform_action",
      handler_config: { module: "admin", action: "drop_table" },
      timeout_seconds: 120,
      risk_level: "critical",
      captured_at: hoursAgo(72),
    },
    created_at: hoursAgo(72),
    requested_by_name: "AI Agent (Claude)",
    ticket_id: null,
  },
];

function applyApprovalFilters(
  invocations: ToolInvocation[],
  params: ApprovalsListParams,
): ToolInvocation[] {
  let result = invocations;
  if (params.status) {
    result = result.filter((i) => i.status === params.status);
  }
  if (params.search) {
    const q = params.search.toLowerCase();
    result = result.filter(
      (i) =>
        i.tool_name.toLowerCase().includes(q) ||
        String(i.ticket_id ?? "").toLowerCase().includes(q),
    );
  }
  return [...result].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function fetchApprovals(
  params: ApprovalsListParams,
): Promise<ApprovalsListResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 150));
    const filtered = applyApprovalFilters(MOCK_APPROVALS, params);
    const start = (params.page - 1) * params.per_page;
    const pendingCount = MOCK_APPROVALS.filter(
      (i) => i.status === "pending_approval",
    ).length;
    return {
      success: true,
      data: {
        invocations: filtered.slice(start, start + params.per_page),
        total: filtered.length,
        pending_count: pendingCount,
        page: params.page,
        per_page: params.per_page,
      },
    };
  }
  const qs = new URLSearchParams();
  qs.set("page", String(params.page));
  qs.set("per_page", String(params.per_page));
  if (params.status) qs.set("status", params.status);
  if (params.search) qs.set("search", params.search);
  const res = await fetch(`/api/proxy/helpdesk/api/approvals?${qs.toString()}`);
  if (!res.ok) throw new Error(`fetchApprovals failed: ${res.status}`);
  return res.json();
}

export interface ApprovalDecisionInput {
  invocationId: number;
  /** Optional reason; required when rejecting per ConfirmActionDialog UX. */
  reason?: string;
}

export async function approveInvocation(
  input: ApprovalDecisionInput,
): Promise<ApprovalActionResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 200));
    const idx = MOCK_APPROVALS.findIndex((i) => i.id === input.invocationId);
    if (idx >= 0) {
      MOCK_APPROVALS[idx] = { ...MOCK_APPROVALS[idx], status: "approved" };
    }
    return {
      success: true,
      message: `(mock) Invocation #${input.invocationId} approved.`,
    };
  }
  const res = await fetch(
    `/api/proxy/helpdesk/api/approvals/${input.invocationId}/approve`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: input.reason }),
    },
  );
  if (!res.ok) throw new Error(`approveInvocation failed: ${res.status}`);
  return res.json();
}

export async function rejectInvocation(
  input: ApprovalDecisionInput,
): Promise<ApprovalActionResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 200));
    const idx = MOCK_APPROVALS.findIndex((i) => i.id === input.invocationId);
    if (idx >= 0) {
      const reasonMsg = input.reason
        ? `User rejected: ${input.reason}`
        : "User rejected";
      MOCK_APPROVALS[idx] = {
        ...MOCK_APPROVALS[idx],
        status: "rejected",
        error_message: reasonMsg,
      };
    }
    return {
      success: true,
      message: `(mock) Invocation #${input.invocationId} rejected.`,
    };
  }
  const res = await fetch(
    `/api/proxy/helpdesk/api/approvals/${input.invocationId}/reject`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: input.reason }),
    },
  );
  if (!res.ok) throw new Error(`rejectInvocation failed: ${res.status}`);
  return res.json();
}
