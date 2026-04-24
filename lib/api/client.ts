import type { DashboardStats, TimeSeriesData, HealthData } from "./types";

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

/* Dashboard KPI stats */
export const fetchDashboardStats = () =>
  apiFetch<DashboardStats>("/ai-settings/stats");

/* Activity time series — default last 30 days */
export const fetchTimeSeries = (days = 30) =>
  apiFetch<TimeSeriesData>(`/ai-settings/stats/timeseries?days=${days}`);

/* Service health */
export const fetchServiceHealth = () =>
  apiFetch<HealthData>("/monitoring/health");
