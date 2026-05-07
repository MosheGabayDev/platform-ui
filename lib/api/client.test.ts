/**
 * Dashboard client tests (mock mode). Covers stats, timeseries shape
 * across multiple windows, and service health shape.
 */
import { describe, it, expect } from "vitest";
import {
  fetchDashboardStats,
  fetchTimeSeries,
  fetchServiceHealth,
  MOCK_MODE,
} from "./client";

describe("dashboard client", () => {
  it("MOCK_MODE is true until backend lands", () => {
    expect(MOCK_MODE).toBe(true);
  });

  it("fetchDashboardStats returns the full KPI envelope", async () => {
    const res = await fetchDashboardStats();
    expect(typeof res.generated_at).toBe("string");
    expect(res.sessions.total).toBeGreaterThan(0);
    expect(typeof res.sessions.by_channel.web).toBe("number");
    expect(res.actions.total).toBeGreaterThan(0);
    expect(res.actions.error_rate_pct).toBeGreaterThanOrEqual(0);
    expect(res.knowledge.total).toBeGreaterThan(0);
    expect(typeof res.profiles.active).toBe("number");
  });

  it("fetchTimeSeries default 30 days yields 30 entries", async () => {
    const res = await fetchTimeSeries();
    expect(res.days).toBe(30);
    expect(res.labels).toHaveLength(30);
    expect(res.sessions).toHaveLength(30);
    expect(res.actions).toHaveLength(30);
    expect(res.series).toHaveLength(30);
  });

  it("fetchTimeSeries respects custom days", async () => {
    const res = await fetchTimeSeries(7);
    expect(res.days).toBe(7);
    expect(res.labels).toHaveLength(7);
    expect(res.series.every((p) => typeof p.date === "string")).toBe(true);
    expect(res.series.every((p) => p.sessions >= 0 && p.actions >= 0)).toBe(true);
  });

  it("fetchTimeSeries labels are ISO date prefixes", async () => {
    const res = await fetchTimeSeries(3);
    for (const lbl of res.labels) {
      expect(lbl).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("fetchServiceHealth returns service health map", async () => {
    const res = await fetchServiceHealth();
    expect(res.services).toBeDefined();
    expect(res.services["platform-api"]?.status).toBe("ok");
    expect(typeof res.services["platform-api"]?.latency_ms).toBe("number");
    expect(res.services["rag-db"]?.status).toBe("degraded");
    expect(typeof res.services["rag-db"]?.detail).toBe("string");
  });
});
