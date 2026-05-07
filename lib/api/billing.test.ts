/**
 * Billing client (mock mode) — Stripe-shaped overview envelope.
 */
import { describe, it, expect } from "vitest";
import { fetchBillingOverview, MOCK_MODE } from "./billing";

describe("billing client (mock mode)", () => {
  it("MOCK_MODE is true until backend lands", () => {
    expect(MOCK_MODE).toBe(true);
  });

  it("fetchBillingOverview returns plan + usage + invoices", async () => {
    const res = await fetchBillingOverview();
    expect(res.success).toBe(true);
    expect(res.data.plan.tier).toBe("pro");
    expect(typeof res.data.plan.monthly_price).toBe("number");
    expect(res.data.plan.currency).toBe("USD");
    expect(Array.isArray(res.data.invoices)).toBe(true);
    expect(res.data.invoices.length).toBeGreaterThan(0);
  });

  it("plan.portal_url is null in mock (Stripe portal not wired yet)", async () => {
    const res = await fetchBillingOverview();
    expect(res.data.plan.portal_url).toBeNull();
  });

  it("each invoice has id, date, amount_cents, status, currency", async () => {
    const res = await fetchBillingOverview();
    for (const inv of res.data.invoices) {
      expect(typeof inv.id).toBe("string");
      expect(typeof inv.date).toBe("string");
      expect(typeof inv.amount_cents).toBe("number");
      expect(typeof inv.currency).toBe("string");
      expect(["paid", "pending", "failed"]).toContain(inv.status);
    }
  });

  it("usage exposes tokens / api_calls / seats with used + limit", async () => {
    const res = await fetchBillingOverview();
    for (const key of ["tokens", "api_calls", "seats"] as const) {
      const u = res.data.usage[key];
      expect(typeof u.used).toBe("number");
      expect(typeof u.limit).toBe("number");
      expect(u.limit).toBeGreaterThanOrEqual(u.used);
    }
  });
});
