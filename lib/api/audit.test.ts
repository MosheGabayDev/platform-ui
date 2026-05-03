import { describe, it, expect } from "vitest";
import { fetchAuditLog, fetchAuditLogStats, MOCK_MODE } from "./audit";

describe("audit log client (mock mode)", () => {
  it("MOCK_MODE is enabled until R046-min lands", () => {
    expect(MOCK_MODE).toBe(true);
  });

  it("fetchAuditLog returns paginated entries newest-first", async () => {
    const res = await fetchAuditLog({ page: 1, per_page: 50 });
    expect(res.success).toBe(true);
    expect(res.data.entries.length).toBeGreaterThan(0);
    // Newest first
    for (let i = 1; i < res.data.entries.length; i++) {
      const a = new Date(res.data.entries[i - 1].timestamp).getTime();
      const b = new Date(res.data.entries[i].timestamp).getTime();
      expect(a).toBeGreaterThanOrEqual(b);
    }
  });

  it("fetchAuditLog filters by category", async () => {
    const res = await fetchAuditLog({ page: 1, per_page: 50, category: "ai" });
    expect(res.data.entries.every((e) => e.category === "ai")).toBe(true);
    expect(res.data.entries.length).toBeGreaterThan(0);
  });

  it("fetchAuditLog filters by actor_id", async () => {
    const res = await fetchAuditLog({ page: 1, per_page: 50, actor_id: 7 });
    expect(res.data.entries.every((e) => e.actor_id === 7)).toBe(true);
    expect(res.data.entries.length).toBeGreaterThan(0);
  });

  it("fetchAuditLog search matches action / resource / actor", async () => {
    const res = await fetchAuditLog({
      page: 1,
      per_page: 50,
      search: "ticket",
    });
    expect(res.data.entries.length).toBeGreaterThan(0);
    expect(
      res.data.entries.every(
        (e) =>
          e.action.toLowerCase().includes("ticket") ||
          (e.resource_type ?? "").toLowerCase().includes("ticket") ||
          (e.actor_name ?? "").toLowerCase().includes("ticket"),
      ),
    ).toBe(true);
  });

  it("fetchAuditLog from/to bounds filter timestamps", async () => {
    const fromIso = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const res = await fetchAuditLog({
      page: 1,
      per_page: 50,
      from: fromIso,
    });
    const fromTs = new Date(fromIso).getTime();
    expect(
      res.data.entries.every((e) => new Date(e.timestamp).getTime() >= fromTs),
    ).toBe(true);
  });

  it("fetchAuditLog pagination respects per_page", async () => {
    const res = await fetchAuditLog({ page: 1, per_page: 5 });
    expect(res.data.entries.length).toBeLessThanOrEqual(5);
    expect(res.data.total).toBeGreaterThan(5);
  });

  it("fetchAuditLogStats returns counts by category", async () => {
    const res = await fetchAuditLogStats();
    expect(res.success).toBe(true);
    expect(res.data.total_24h).toBeGreaterThan(0);
    expect(res.data.total_7d).toBeGreaterThanOrEqual(res.data.total_24h);
    // Sum of by_category counts must equal total_24h
    const sum = Object.values(res.data.by_category_24h).reduce((a, b) => a + b, 0);
    expect(sum).toBe(res.data.total_24h);
  });
});
