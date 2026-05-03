/**
 * Maintenance windows client (Phase C row 4 — extends helpdesk inventory).
 *
 * Why a separate file: keeps `helpdesk.ts` focused on tickets + technicians +
 * SLA. Maintenance is a distinct change-management surface that intersects
 * helpdesk (linked tickets) but also monitoring (alert suppression) — natural
 * candidate for its own client.
 *
 * MOCK MODE shares the master flag from helpdesk.ts. Flips false with the
 * helpdesk backend wave (R042-BE-min + maintenance routes).
 *
 * Schema: see `lib/modules/helpdesk/types.ts MaintenanceWindow`. Tracked as
 * Q-HD-9 in `08-decisions/open-questions.md`.
 */
import { MOCK_MODE } from "./helpdesk";
import type {
  MaintenanceWindow,
  MaintenanceListParams,
  MaintenanceListResponse,
  MaintenanceActionResponse,
} from "@/lib/modules/helpdesk/types";

// ---------------------------------------------------------------------------
// Mock fixtures
// ---------------------------------------------------------------------------

function hoursFromNow(h: number): string {
  return new Date(Date.now() + h * 60 * 60 * 1000).toISOString();
}

const MOCK_WINDOWS: MaintenanceWindow[] = [
  {
    id: 9001,
    org_id: 1,
    title: "Production firewall ruleset upgrade",
    description:
      "Quarterly firewall hardening — replace legacy v6 ruleset with v7. Brief connectivity blips expected during failover.",
    starts_at: hoursFromNow(-1),
    ends_at: hoursFromNow(2),
    status: "in_progress",
    impact: "medium",
    affected_services: ["VPN", "Internal API gateway"],
    suppress_alerts: true,
    ticket_ids: [1004],
    created_by: 7,
    created_by_name: "Tech Tim",
    created_at: hoursFromNow(-72),
    updated_at: hoursFromNow(-1),
  },
  {
    id: 9002,
    org_id: 1,
    title: "Database failover drill",
    description:
      "Planned primary→replica failover rehearsal. Read-only mode for ~10 min.",
    starts_at: hoursFromNow(20),
    ends_at: hoursFromNow(22),
    status: "scheduled",
    impact: "high",
    affected_services: ["Postgres primary", "Helpdesk API", "Auth service"],
    suppress_alerts: true,
    ticket_ids: [],
    created_by: 7,
    created_by_name: "Tech Tim",
    created_at: hoursFromNow(-48),
    updated_at: hoursFromNow(-48),
  },
  {
    id: 9003,
    org_id: 1,
    title: "TLS certificate rotation",
    description:
      "Rotate Let's Encrypt certs for *.platform.example.com. Zero-downtime via blue/green.",
    starts_at: hoursFromNow(72),
    ends_at: hoursFromNow(73),
    status: "scheduled",
    impact: "low",
    affected_services: ["HTTPS edge"],
    suppress_alerts: false,
    ticket_ids: [],
    created_by: 9,
    created_by_name: "OnCall Olivia",
    created_at: hoursFromNow(-12),
    updated_at: hoursFromNow(-12),
  },
  {
    id: 9004,
    org_id: 1,
    title: "Office switch firmware bump",
    description:
      "Cisco Meraki firmware update. WiFi may drop briefly during reboot cycle.",
    starts_at: hoursFromNow(-168),
    ends_at: hoursFromNow(-166),
    status: "completed",
    impact: "low",
    affected_services: ["Office WiFi"],
    suppress_alerts: false,
    ticket_ids: [],
    created_by: 9,
    created_by_name: "OnCall Olivia",
    created_at: hoursFromNow(-200),
    updated_at: hoursFromNow(-166),
  },
];

function applyFilters(
  windows: MaintenanceWindow[],
  params: MaintenanceListParams,
): MaintenanceWindow[] {
  let result = windows;
  if (params.status) {
    result = result.filter((w) => w.status === params.status);
  }
  if (params.search) {
    const q = params.search.toLowerCase();
    result = result.filter(
      (w) =>
        w.title.toLowerCase().includes(q) ||
        w.description.toLowerCase().includes(q) ||
        w.affected_services.some((s) => s.toLowerCase().includes(q)),
    );
  }
  // Most recent first by starts_at
  return [...result].sort(
    (a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime(),
  );
}

function deriveCounts(now: number): { active: number; upcoming: number } {
  let active = 0;
  let upcoming = 0;
  for (const w of MOCK_WINDOWS) {
    if (w.status === "in_progress") {
      active += 1;
      continue;
    }
    if (w.status === "scheduled" && new Date(w.starts_at).getTime() > now) {
      upcoming += 1;
    }
  }
  return { active, upcoming };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function fetchMaintenanceWindows(
  params: MaintenanceListParams,
): Promise<MaintenanceListResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 120));
    const filtered = applyFilters(MOCK_WINDOWS, params);
    const start = (params.page - 1) * params.per_page;
    const counts = deriveCounts(Date.now());
    return {
      success: true,
      data: {
        windows: filtered.slice(start, start + params.per_page),
        total: filtered.length,
        active_count: counts.active,
        upcoming_count: counts.upcoming,
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
  const res = await fetch(`/api/proxy/helpdesk/api/maintenance?${qs.toString()}`);
  if (!res.ok) throw new Error(`fetchMaintenanceWindows failed: ${res.status}`);
  return res.json();
}

export interface CancelMaintenanceInput {
  windowId: number;
  reason?: string;
}

export async function cancelMaintenanceWindow(
  input: CancelMaintenanceInput,
): Promise<MaintenanceActionResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 180));
    const idx = MOCK_WINDOWS.findIndex((w) => w.id === input.windowId);
    if (idx < 0) throw new Error(`404: window ${input.windowId} not found`);
    if (MOCK_WINDOWS[idx].status === "completed") {
      throw new Error("Cannot cancel a completed window");
    }
    MOCK_WINDOWS[idx] = {
      ...MOCK_WINDOWS[idx],
      status: "cancelled",
      updated_at: new Date().toISOString(),
    };
    return {
      success: true,
      message: `(mock) Maintenance window #${input.windowId} cancelled.`,
      data: { window: MOCK_WINDOWS[idx] },
    };
  }
  const res = await fetch(
    `/api/proxy/helpdesk/api/maintenance/${input.windowId}/cancel`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: input.reason }),
    },
  );
  if (!res.ok) throw new Error(`cancelMaintenanceWindow failed: ${res.status}`);
  return res.json();
}

export interface CreateMaintenanceInput {
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  impact: MaintenanceWindow["impact"];
  affected_services: string[];
  suppress_alerts: boolean;
}

export async function createMaintenanceWindow(
  input: CreateMaintenanceInput,
): Promise<MaintenanceActionResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 220));
    const startsMs = new Date(input.starts_at).getTime();
    const endsMs = new Date(input.ends_at).getTime();
    if (!Number.isFinite(startsMs) || !Number.isFinite(endsMs)) {
      throw new Error("Invalid start/end timestamp");
    }
    if (endsMs <= startsMs) {
      throw new Error("End must be after start");
    }
    const now = Date.now();
    const status: MaintenanceWindow["status"] =
      now >= startsMs && now < endsMs ? "in_progress" : "scheduled";
    const newId =
      MOCK_WINDOWS.reduce((max, w) => (w.id > max ? w.id : max), 9000) + 1;
    const created: MaintenanceWindow = {
      id: newId,
      org_id: 1,
      title: input.title,
      description: input.description,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      status,
      impact: input.impact,
      affected_services: input.affected_services,
      suppress_alerts: input.suppress_alerts,
      ticket_ids: [],
      created_by: 7,
      created_by_name: "Tech Tim",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    MOCK_WINDOWS.push(created);
    return {
      success: true,
      message: `(mock) Maintenance window #${newId} scheduled.`,
      data: { window: created },
    };
  }
  const res = await fetch(`/api/proxy/helpdesk/api/maintenance`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`createMaintenanceWindow failed: ${res.status}`);
  return res.json();
}
