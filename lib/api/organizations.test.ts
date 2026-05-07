/**
 * Organizations client tests (mock mode).
 */
import { describe, it, expect } from "vitest";
import {
  fetchOrgs,
  fetchOrgStats,
  fetchOrg,
  createOrg,
  updateOrg,
  setOrgActive,
} from "./organizations";

describe("organizations client (mock mode)", () => {
  it("fetchOrgs returns paginated list", async () => {
    const res = await fetchOrgs({ page: 1, per_page: 50 });
    expect(res.success).toBe(true);
    expect(Array.isArray(res.data.orgs)).toBe(true);
    expect(res.data.orgs.length).toBeGreaterThan(0);
  });

  it("fetchOrgs respects pagination per_page", async () => {
    const res = await fetchOrgs({ page: 1, per_page: 1 });
    expect(res.data.orgs.length).toBeLessThanOrEqual(1);
  });

  it("fetchOrgStats returns counters", async () => {
    const res = await fetchOrgStats();
    expect(res.success).toBe(true);
    expect(typeof res.data.total).toBe("number");
  });

  it("fetchOrg returns a single detail", async () => {
    const list = await fetchOrgs({ page: 1, per_page: 50 });
    const target = list.data.orgs[0]!;
    const res = await fetchOrg(target.id);
    expect(res.data.org.id).toBe(target.id);
  });

  it("fetchOrg throws for unknown id", async () => {
    await expect(fetchOrg(99999)).rejects.toBeTruthy();
  });

  it("createOrg returns success with shape", async () => {
    const res = await createOrg({
      name: "E2E Test Org",
      slug: "e2e-test",
      is_active: true,
    });
    expect(res.success).toBe(true);
  });

  it("updateOrg returns success", async () => {
    const list = await fetchOrgs({ page: 1, per_page: 50 });
    const target = list.data.orgs[0]!;
    const res = await updateOrg(target.id, {
      name: "Renamed",
      is_active: true,
    });
    expect(res.success).toBe(true);
  });

  it("setOrgActive returns success", async () => {
    const list = await fetchOrgs({ page: 1, per_page: 50 });
    const target = list.data.orgs[0]!;
    const res = await setOrgActive(target.id, false);
    expect(res.success).toBe(true);
  });

  it("setOrgActive accepts a reason and unknown id falls back to first org", async () => {
    const res = await setOrgActive(99999, true, "compliance");
    expect(res.success).toBe(true);
    expect(res.data.org.is_active).toBe(true);
  });

  it("fetchOrgs filters by is_active=true", async () => {
    const res = await fetchOrgs({ is_active: true });
    expect(res.data.orgs.every((o) => o.is_active === true)).toBe(true);
  });

  it("fetchOrgs filters by is_active=false (returns empty for current fixture)", async () => {
    const res = await fetchOrgs({ is_active: false });
    expect(res.data.orgs).toHaveLength(0);
    expect(res.data.total).toBe(0);
  });

  it("fetchOrgs search matches name (case-insensitive)", async () => {
    const res = await fetchOrgs({ search: "PLATFORM" });
    expect(res.data.orgs.length).toBeGreaterThan(0);
  });

  it("fetchOrgs search returns empty when no match", async () => {
    const res = await fetchOrgs({ search: "no-match-zzz" });
    expect(res.data.orgs).toHaveLength(0);
  });

  it("fetchOrgs default pagination", async () => {
    const res = await fetchOrgs();
    expect(res.data.page).toBe(1);
    expect(res.data.per_page).toBe(25);
  });

  it("updateOrg unknown id falls back to first org", async () => {
    const res = await updateOrg(99999, { name: "Renamed" } as never);
    expect(res.success).toBe(true);
    expect(res.data.org.name).toBe("Renamed");
  });

  it("createOrg without explicit slug uses fallback", async () => {
    const res = await createOrg({ name: "No Slug Org" } as never);
    expect(res.success).toBe(true);
    expect(typeof res.data.org.slug).toBe("string");
  });
});
