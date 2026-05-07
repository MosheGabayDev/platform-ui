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

import type { BillingOverviewResponse } from "@/lib/modules/billing/types";

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
