/**
 * Tests for lib/api/sample-data.ts (Phase 3.1).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { seedSampleData, getSampleDataStatus } from "@/lib/api/sample-data";
import { setSetting, fetchSetting } from "@/lib/api/settings";
import { fetchAuditLog, _mockEntryCount } from "@/lib/api/audit";

beforeEach(async () => {
  // Clear the markers before each test so seeded state doesn't leak.
  await setSetting({
    key: "onboarding.sample_data",
    scope: "org",
    scope_id: 1,
    value: {},
  });
});

describe("seedSampleData", () => {
  it("returns expected counts for known modules", async () => {
    const res = await seedSampleData({ modules: ["helpdesk", "users"] });
    expect(res.success).toBe(true);
    expect(res.data.seeded).toHaveLength(2);
    const helpdesk = res.data.seeded.find((s) => s.module_key === "helpdesk");
    expect(helpdesk?.count).toBeGreaterThan(0);
    expect(helpdesk?.not_seedable).toBeUndefined();
    expect(res.data.total_resources).toBe(
      res.data.seeded.reduce((acc, s) => acc + s.count, 0),
    );
  });

  it("flags unknown modules as not_seedable with count 0", async () => {
    const res = await seedSampleData({ modules: ["nonexistent-mod"] });
    expect(res.data.seeded[0]).toEqual({
      module_key: "nonexistent-mod",
      count: 0,
      not_seedable: true,
    });
    expect(res.data.total_resources).toBe(0);
  });

  it("writes markers readable via getSampleDataStatus", async () => {
    await seedSampleData({ modules: ["helpdesk"] });
    const status = await getSampleDataStatus();
    const helpdesk = status.data.statuses.find((s) => s.module_key === "helpdesk");
    expect(helpdesk?.seeded_at).toBeTruthy();
    expect(typeof helpdesk?.seeded_at).toBe("string");
  });

  it("writes audit entry with action=onboarding.sample_data.seed and category=admin", async () => {
    const before = _mockEntryCount();
    await seedSampleData({ modules: ["helpdesk"] });
    // Audit emit is async (`void recordAuditEntry`) — let it settle.
    await new Promise((r) => setTimeout(r, 60));
    expect(_mockEntryCount()).toBeGreaterThan(before);
    const recent = await fetchAuditLog({ page: 1, per_page: 10, category: "admin" });
    const entry = recent.data.entries.find(
      (e) =>
        e.action === "onboarding.sample_data.seed" &&
        e.resource_id === "helpdesk",
    );
    expect(entry).toBeDefined();
    expect(entry?.category).toBe("admin");
    expect(entry?.metadata.kind).toBe("sample_data_seed");
  });

  it("idempotent: second seed updates timestamp without adding fixtures count", async () => {
    const first = await seedSampleData({ modules: ["helpdesk"] });
    const t1 = (await fetchSetting("onboarding.sample_data")).data.value as Record<
      string,
      string
    >;
    await new Promise((r) => setTimeout(r, 25));
    const second = await seedSampleData({ modules: ["helpdesk"] });
    const t2 = (await fetchSetting("onboarding.sample_data")).data.value as Record<
      string,
      string
    >;
    expect(first.data.seeded[0].count).toBe(second.data.seeded[0].count);
    expect(t2.helpdesk).not.toBe(t1.helpdesk);
  });

  it("does NOT write markers when only unknown modules are passed", async () => {
    await seedSampleData({ modules: ["unknown-x"] });
    const markers = (await fetchSetting("onboarding.sample_data")).data.value as Record<
      string,
      string
    >;
    expect(markers["unknown-x"]).toBeUndefined();
  });
});

describe("getSampleDataStatus", () => {
  it("returns one entry per seedable module", async () => {
    const res = await getSampleDataStatus();
    expect(res.data.statuses.length).toBeGreaterThanOrEqual(5);
    for (const s of res.data.statuses) {
      expect(typeof s.module_key).toBe("string");
      expect(s.seeded_at === null || typeof s.seeded_at === "string").toBe(true);
    }
  });

  it("seeded_at is null before any seeding", async () => {
    const res = await getSampleDataStatus();
    const helpdesk = res.data.statuses.find((s) => s.module_key === "helpdesk");
    expect(helpdesk?.seeded_at).toBeNull();
  });
});
