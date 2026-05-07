/**
 * @module lib/api/billing
 * API client for the Billing module. Mock-mode shipping with Stripe-shaped
 * fixtures so the page renders end-to-end pre-backend.
 *
 * Spec: docs/system-upgrade/PRODUCT_LAUNCH_PLAN.md §3 task 6.05.
 *
 * MOCK_MODE flip checklist (when Stripe BE lands per §3 tasks 6.03/6.04):
 *   1. Set NEXT_PUBLIC_MOCK_API=false in env.
 *   2. Backend serves GET /api/proxy/billing/overview with the
 *      BillingOverviewResponse shape.
 *   3. plan.portal_url returns Stripe Billing Portal redirect URL.
 *   4. invoices[].pdf_url returns Stripe-hosted PDF link.
 *   5. Webhooks (invoice.paid / payment_failed / subscription.updated)
 *      mutate plan + usage; frontend just refetches via TanStack Query.
 */

import type { BillingOverviewResponse, UsageSeriesResponse, UsagePoint } from "@/lib/modules/billing/types";

export const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_API !== "false";

const BASE = "/api/proxy/billing";

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

const MOCK_OVERVIEW: BillingOverviewResponse = {
  success: true,
  data: {
    plan: {
      tier: "pro",
      monthly_price: 99,
      currency: "USD",
      portal_url: null,
      next_billing_at: "2026-06-01T00:00:00Z",
    },
    usage: {
      tokens: { used: 1_240_000, limit: 5_000_000 },
      api_calls: { used: 18_320, limit: 100_000 },
      seats: { used: 7, limit: 25 },
    },
    invoices: [
      { id: "inv_2026_05", date: "2026-05-01T00:00:00Z", amount_cents: 9900, currency: "USD", status: "paid", pdf_url: null },
      { id: "inv_2026_04", date: "2026-04-01T00:00:00Z", amount_cents: 9900, currency: "USD", status: "paid", pdf_url: null },
      { id: "inv_2026_03", date: "2026-03-01T00:00:00Z", amount_cents: 9900, currency: "USD", status: "paid", pdf_url: null },
    ],
  },
};

/** Fetch the org's current plan, usage, and recent invoices. */
export async function fetchBillingOverview(): Promise<BillingOverviewResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 100));
    return MOCK_OVERVIEW;
  }
  return apiFetch<BillingOverviewResponse>("/overview");
}

/**
 * Generate a deterministic-ish daily usage series over `days` days,
 * trending up so the chart looks plausible. Pure function — exported
 * for tests.
 */
export function buildMockUsageSeries(days = 30): UsagePoint[] {
  const out: UsagePoint[] = [];
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 86_400_000);
    const date = d.toISOString().slice(0, 10);
    const trend = 1 + (days - i) / days;
    // Sine-wave wobble so weekend dips show in the chart.
    const wobble = 0.85 + 0.3 * Math.sin((days - i) / 2.5);
    out.push({
      date,
      tokens: Math.round(38_000 * trend * wobble),
      api_calls: Math.round(450 * trend * wobble),
    });
  }
  return out;
}

/**
 * Fetch the per-day usage series for the per-org metering chart on
 * the /billing page. Defaults to a 30-day window.
 *
 * MOCK_MODE: returns a deterministic-ish trending series so the chart
 * looks plausible in demos.
 */
export async function fetchUsageSeries(days = 30): Promise<UsageSeriesResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 80));
    return { success: true, data: { series: buildMockUsageSeries(days) } };
  }
  return apiFetch<UsageSeriesResponse>(`/usage/series?days=${days}`);
}
