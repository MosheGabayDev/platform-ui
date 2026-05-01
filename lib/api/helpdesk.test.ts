import { describe, it, expect } from "vitest";
import { fetchHelpdeskStats, fetchTickets, fetchTicket, MOCK_MODE } from "./helpdesk";

describe("helpdesk client (mock mode)", () => {
  it("MOCK_MODE is enabled until R042-BE-min + R044-min + R045-min + R046-min land", () => {
    expect(MOCK_MODE).toBe(true);
  });

  it("fetchHelpdeskStats returns stats shape", async () => {
    const res = await fetchHelpdeskStats();
    expect(res.success).toBe(true);
    expect(res.data.open_tickets).toBeGreaterThan(0);
    expect(res.data.sla_compliance_pct).toBeLessThanOrEqual(100);
  });

  it("fetchTickets returns paginated list", async () => {
    const res = await fetchTickets({ page: 1, per_page: 10 });
    expect(res.success).toBe(true);
    expect(Array.isArray(res.data.tickets)).toBe(true);
    expect(res.data.page).toBe(1);
    expect(res.data.total).toBeGreaterThan(0);
  });

  it("fetchTickets filters by status", async () => {
    const res = await fetchTickets({ page: 1, per_page: 10, status: "in_progress" });
    expect(res.data.tickets.every((t) => t.status === "in_progress")).toBe(true);
  });

  it("fetchTickets filters by priority", async () => {
    const res = await fetchTickets({ page: 1, per_page: 10, priority: "critical" });
    expect(res.data.tickets.every((t) => t.priority === "critical")).toBe(true);
  });

  it("fetchTickets search matches title (case-insensitive)", async () => {
    const res = await fetchTickets({ page: 1, per_page: 10, search: "VPN" });
    expect(res.data.tickets.length).toBeGreaterThan(0);
    expect(res.data.tickets[0].title.toLowerCase()).toContain("vpn");
  });

  it("fetchTickets pagination respects per_page", async () => {
    const res = await fetchTickets({ page: 1, per_page: 2 });
    expect(res.data.tickets.length).toBeLessThanOrEqual(2);
  });

  it("fetchTicket returns full ticket + events for a known id", async () => {
    const res = await fetchTicket(1001);
    expect(res.success).toBe(true);
    expect(res.data.ticket.id).toBe(1001);
    expect(res.data.ticket.description.length).toBeGreaterThan(0);
    expect(Array.isArray(res.data.events)).toBe(true);
    expect(res.data.events.length).toBeGreaterThan(0);
  });

  it("fetchTicket throws 404 for unknown id", async () => {
    await expect(fetchTicket(99999)).rejects.toThrow(/404/);
  });

  it("fetchTicket events include actor_name where applicable", async () => {
    const res = await fetchTicket(1004);
    const created = res.data.events.find((e) => e.type === "created");
    expect(created?.actor_name).toBe("Monitoring Bot");
  });
});
