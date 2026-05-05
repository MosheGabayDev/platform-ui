/**
 * AIUsage client tests (Phase 2.3).
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  fetchUsageStats,
  fetchUsageEvents,
  setUsageBudget,
  _resetMockBudget,
} from "./ai-usage";

beforeEach(() => _resetMockBudget(100));

describe("ai-usage client (mock mode)", () => {
  it("fetchUsageStats returns aggregated totals + breakdowns", async () => {
    const res = await fetchUsageStats("mtd");
    expect(res.success).toBe(true);
    expect(res.data.range).toBe("mtd");
    expect(res.data.totals.events).toBeGreaterThan(0);
    expect(res.data.totals.cost_usd).toBeGreaterThan(0);
    expect(res.data.by_provider.length).toBeGreaterThan(0);
    expect(res.data.by_model.length).toBeGreaterThan(0);
    expect(res.data.daily_series.length).toBeGreaterThan(0);
    expect(res.data.top_users.length).toBeGreaterThan(0);
  });

  it("by_provider buckets sum to total events", async () => {
    const res = await fetchUsageStats("mtd");
    const sumEvents = res.data.by_provider.reduce((s, b) => s + b.events, 0);
    expect(sumEvents).toBe(res.data.totals.events);
  });

  it("daily_series length matches the requested range", async () => {
    const res7 = await fetchUsageStats("7d");
    expect(res7.data.daily_series.length).toBe(7);
    const res30 = await fetchUsageStats("30d");
    expect(res30.data.daily_series.length).toBe(30);
  });

  it("budget status flips to 'warning' at ≥80% and 'exceeded' at ≥100%", async () => {
    const baseline = await fetchUsageStats("mtd");
    const mtdSpend = baseline.data.budget.spent_mtd_usd;
    expect(mtdSpend).toBeGreaterThan(0);

    // Tight budget = warning
    await setUsageBudget({ monthly_budget_usd: mtdSpend * 1.2 });
    const warn = await fetchUsageStats("mtd");
    expect(warn.data.budget.status).toBe("warning");

    // Exceeded
    await setUsageBudget({ monthly_budget_usd: mtdSpend * 0.9 });
    const exc = await fetchUsageStats("mtd");
    expect(exc.data.budget.status).toBe("exceeded");

    // OK
    await setUsageBudget({ monthly_budget_usd: mtdSpend * 100 });
    const ok = await fetchUsageStats("mtd");
    expect(ok.data.budget.status).toBe("ok");

    // Unset
    await setUsageBudget({ monthly_budget_usd: null });
    const unset = await fetchUsageStats("mtd");
    expect(unset.data.budget.status).toBe("unset");
  });

  it("setUsageBudget rejects negative values", async () => {
    await expect(
      setUsageBudget({ monthly_budget_usd: -10 }),
    ).rejects.toThrow(/must be/);
  });

  it("fetchUsageEvents paginates", async () => {
    const res = await fetchUsageEvents({ page: 1, per_page: 25 });
    expect(res.data.events.length).toBeLessThanOrEqual(25);
    expect(res.data.total).toBeGreaterThanOrEqual(res.data.events.length);
  });

  it("fetchUsageEvents filters by provider", async () => {
    const res = await fetchUsageEvents({ page: 1, per_page: 50, provider: "anthropic" });
    expect(res.data.events.every((e) => e.provider_id === "anthropic")).toBe(true);
    expect(res.data.events.length).toBeGreaterThan(0);
  });

  it("fetchUsageEvents filters by user_id", async () => {
    const res = await fetchUsageEvents({ page: 1, per_page: 50, user_id: 7 });
    expect(res.data.events.every((e) => e.user_id === 7)).toBe(true);
  });

  it("fetchUsageEvents filters by outcome (error)", async () => {
    const res = await fetchUsageEvents({ page: 1, per_page: 100, outcome: "error" });
    expect(res.data.events.every((e) => e.outcome === "error")).toBe(true);
  });

  it("top_users is capped at 5 and sorted by cost desc", async () => {
    const res = await fetchUsageStats("30d");
    expect(res.data.top_users.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < res.data.top_users.length; i += 1) {
      expect(res.data.top_users[i - 1]!.cost_usd).toBeGreaterThanOrEqual(
        res.data.top_users[i]!.cost_usd,
      );
    }
  });

  it("totals.errors matches events filtered by outcome=error in same range", async () => {
    const stats = await fetchUsageStats("30d");
    const errEvents = await fetchUsageEvents({
      page: 1,
      per_page: 1000,
      outcome: "error",
      range: "30d",
    });
    expect(errEvents.data.events.length).toBe(stats.data.totals.errors);
  });

  it("by_provider cost_usd values are positive numbers", async () => {
    const res = await fetchUsageStats("mtd");
    for (const b of res.data.by_provider) {
      expect(b.cost_usd).toBeGreaterThanOrEqual(0);
    }
  });

  it("setUsageBudget(null) returns status='unset'", async () => {
    const res = await setUsageBudget({ monthly_budget_usd: null });
    expect(res.data.budget.status).toBe("unset");
    expect(res.data.budget.monthly_budget_usd).toBeNull();
  });
});
