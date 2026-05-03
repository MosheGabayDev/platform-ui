import { describe, it, expect } from "vitest";
import {
  fetchMaintenanceWindows,
  cancelMaintenanceWindow,
  createMaintenanceWindow,
} from "./helpdesk.maintenance";

describe("helpdesk maintenance client (mock mode)", () => {
  it("fetchMaintenanceWindows returns paginated list", async () => {
    const res = await fetchMaintenanceWindows({ page: 1, per_page: 50 });
    expect(res.success).toBe(true);
    expect(res.data.windows.length).toBeGreaterThan(0);
    expect(res.data.total).toBeGreaterThan(0);
    expect(res.data.windows[0].title.length).toBeGreaterThan(0);
  });

  it("fetchMaintenanceWindows filters by status", async () => {
    const res = await fetchMaintenanceWindows({
      page: 1,
      per_page: 50,
      status: "completed",
    });
    expect(res.data.windows.every((w) => w.status === "completed")).toBe(true);
  });

  it("fetchMaintenanceWindows search matches title or service", async () => {
    const res = await fetchMaintenanceWindows({
      page: 1,
      per_page: 50,
      search: "VPN",
    });
    expect(res.data.windows.length).toBeGreaterThan(0);
    expect(
      res.data.windows[0].affected_services.some((s) => /vpn/i.test(s)) ||
        /vpn/i.test(res.data.windows[0].title),
    ).toBe(true);
  });

  it("fetchMaintenanceWindows reports active + upcoming counts", async () => {
    const res = await fetchMaintenanceWindows({ page: 1, per_page: 50 });
    expect(res.data.active_count).toBeGreaterThanOrEqual(0);
    expect(res.data.upcoming_count).toBeGreaterThanOrEqual(0);
  });

  it("cancelMaintenanceWindow flips a scheduled window to cancelled", async () => {
    const res = await cancelMaintenanceWindow({ windowId: 9003 });
    expect(res.success).toBe(true);
    expect(res.data?.window.status).toBe("cancelled");
  });

  it("cancelMaintenanceWindow rejects unknown id with 404", async () => {
    await expect(
      cancelMaintenanceWindow({ windowId: 99999 }),
    ).rejects.toThrow(/404/);
  });

  it("cancelMaintenanceWindow refuses to cancel a completed window", async () => {
    await expect(
      cancelMaintenanceWindow({ windowId: 9004 }),
    ).rejects.toThrow(/completed/i);
  });

  it("createMaintenanceWindow appends a new window", async () => {
    const before = await fetchMaintenanceWindows({ page: 1, per_page: 50 });
    const startsAt = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString();
    const endsAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
    const res = await createMaintenanceWindow({
      title: "Pager rotation test",
      description: "Synthetic alert fire to validate paging chain.",
      starts_at: startsAt,
      ends_at: endsAt,
      impact: "none",
      affected_services: ["pagerduty"],
      suppress_alerts: false,
    });
    expect(res.success).toBe(true);
    expect(res.data?.window.id).toBeGreaterThan(9000);
    const after = await fetchMaintenanceWindows({ page: 1, per_page: 50 });
    expect(after.data.total).toBe(before.data.total + 1);
  });

  it("createMaintenanceWindow rejects when end <= start", async () => {
    const t = new Date().toISOString();
    await expect(
      createMaintenanceWindow({
        title: "Bad",
        description: "",
        starts_at: t,
        ends_at: t,
        impact: "none",
        affected_services: [],
        suppress_alerts: false,
      }),
    ).rejects.toThrow(/end must be after start/i);
  });
});
