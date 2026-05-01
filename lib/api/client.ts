/**
 * Dashboard API client (KPI stats, timeseries, service health).
 *
 * MOCK MODE is currently true — returns realistic fixture data so the
 * dashboard renders without 401/404 noise. Flips to false once R045-min
 * (feature flags) and the dashboard backend endpoints are live.
 */
import type {
  DashboardStats,
  TimeSeriesData,
  HealthData,
  TimeSeriesPoint,
} from "./types";

export const MOCK_MODE = true;

/**
 * API base URL.
 * Web default: "/api/proxy" (relative to Next.js app origin).
 * Override via NEXT_PUBLIC_API_BASE_URL for Electron, test runners, or mobile direct-connect.
 *
 * @platform web-default — behavior unchanged for existing web deployments
 */
const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/proxy";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? body.message ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Mock fixtures
// ---------------------------------------------------------------------------

const MOCK_STATS: DashboardStats = {
  generated_at: "2026-05-01T12:00:00Z",
  sessions: {
    total: 1284,
    last_24h: 47,
    last_7d: 312,
    by_channel: { web: 892, voice: 247, mobile: 145 },
    by_status: { active: 23, completed: 1198, failed: 63 },
  },
  actions: {
    total: 8421,
    last_24h: 312,
    success: 8203,
    error: 218,
    write_actions: 1842,
    by_risk_tier: { READ: 6579, WRITE_LOW: 1485, WRITE_HIGH: 327, DESTRUCTIVE: 30 },
    error_rate_pct: 2.6,
  },
  knowledge: {
    total: 247,
    ready: 234,
    error: 3,
    total_chunks: 4892,
  },
  profiles: { active: 89 },
};

function mockTimeSeries(days: number): TimeSeriesData {
  const labels: string[] = [];
  const sessions: number[] = [];
  const actions: number[] = [];
  const series: TimeSeriesPoint[] = [];
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000);
    const date = d.toISOString().slice(0, 10);
    // Realistic-looking smooth curve with noise
    const trend = 30 + Math.sin((days - i) / 4) * 12 + Math.random() * 8;
    const s = Math.max(0, Math.round(trend));
    const a = Math.max(0, Math.round(trend * (8 + Math.random() * 2)));
    labels.push(date);
    sessions.push(s);
    actions.push(a);
    series.push({ date, sessions: s, actions: a });
  }
  return { days, labels, sessions, actions, series };
}

const MOCK_HEALTH: HealthData = {
  services: {
    "platform-api": { status: "ok", latency_ms: 47 },
    "ai-gateway": { status: "ok", latency_ms: 124 },
    redis: { status: "ok", latency_ms: 3 },
    postgres: { status: "ok", latency_ms: 8 },
    "rag-db": { status: "degraded", latency_ms: 312, detail: "Slow query path" },
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/* Dashboard KPI stats */
export const fetchDashboardStats = async (): Promise<DashboardStats> => {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 150));
    return MOCK_STATS;
  }
  return apiFetch<DashboardStats>("/ai-settings/stats");
};

/* Activity time series — default last 30 days */
export const fetchTimeSeries = async (days = 30): Promise<TimeSeriesData> => {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 150));
    return mockTimeSeries(days);
  }
  return apiFetch<TimeSeriesData>(`/ai-settings/stats/timeseries?days=${days}`);
};

/* Service health */
export const fetchServiceHealth = async (): Promise<HealthData> => {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 100));
    return MOCK_HEALTH;
  }
  return apiFetch<HealthData>("/monitoring/health");
};
