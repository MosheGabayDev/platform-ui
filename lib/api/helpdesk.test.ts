import { describe, it, expect } from "vitest";
import {
  fetchHelpdeskStats,
  fetchTickets,
  fetchTicket,
  takeTicket,
  resolveTicket,
  commentOnTicket,
  fetchTechnicians,
  fetchTechnicianUtilization,
  fetchSLAPolicies,
  fetchSLACompliance,
  bulkReassignTickets,
  bulkStatusChange,
  MOCK_MODE,
} from "./helpdesk";

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

  // -------------------------------------------------------------------------
  // Phase B mutations + technicians
  // -------------------------------------------------------------------------

  it("takeTicket transitions ticket to in_progress + appends assigned event", async () => {
    const res = await takeTicket({ ticketId: 1002 });
    expect(res.success).toBe(true);
    const detail = await fetchTicket(1002);
    expect(detail.data.ticket.status).toBe("in_progress");
    expect(detail.data.ticket.assignee_id).toBe(7);
    expect(detail.data.events.some((e) => e.type === "assigned")).toBe(true);
  });

  it("resolveTicket transitions ticket to resolved + appends resolution event", async () => {
    const res = await resolveTicket({ ticketId: 1002, resolution: "Fixed by reset" });
    expect(res.success).toBe(true);
    const detail = await fetchTicket(1002);
    expect(detail.data.ticket.status).toBe("resolved");
    const resolved = detail.data.events.find((e) => e.type === "resolved");
    expect(resolved?.description).toContain("Fixed by reset");
  });

  it("commentOnTicket appends a comment event", async () => {
    const before = await fetchTicket(1005);
    const beforeCount = before.data.events.length;
    await commentOnTicket({ ticketId: 1005, content: "Looking into this" });
    const after = await fetchTicket(1005);
    expect(after.data.events.length).toBe(beforeCount + 1);
    expect(after.data.events[after.data.events.length - 1].type).toBe("comment_added");
  });

  it("fetchTechnicians returns 3 mock technicians", async () => {
    const res = await fetchTechnicians();
    expect(res.success).toBe(true);
    expect(res.data.technicians.length).toBe(3);
    expect(res.data.technicians[0].name).toBe("Tech Tim");
  });

  it("fetchTechnicians availableOnly filters off-shift", async () => {
    const res = await fetchTechnicians(true);
    expect(res.data.technicians.every((t) => t.is_available)).toBe(true);
    expect(res.data.technicians.length).toBeLessThan(3);
  });

  it("fetchTechnicianUtilization computes per-tech and avg utilization", async () => {
    const res = await fetchTechnicianUtilization();
    expect(res.success).toBe(true);
    expect(
      res.data.technicians.every((t) => t.utilization_pct >= 0 && t.utilization_pct <= 100),
    ).toBe(true);
    expect(res.data.avg_utilization_pct).toBeGreaterThanOrEqual(0);
  });

  // -------------------------------------------------------------------------
  // SLA (Phase C)
  // -------------------------------------------------------------------------

  it("fetchSLAPolicies returns 4 fixture policies (P1-P4)", async () => {
    const res = await fetchSLAPolicies();
    expect(res.success).toBe(true);
    expect(res.data.policies.length).toBe(4);
    const priorities = res.data.policies.map((p) => p.priority).sort();
    expect(priorities).toEqual(["P1", "P2", "P3", "P4"]);
  });

  it("fetchSLAPolicies critical policy is 24/7", async () => {
    const res = await fetchSLAPolicies();
    const p1 = res.data.policies.find((p) => p.priority === "P1");
    expect(p1?.business_hours_only).toBe(false);
    expect(p1?.business_days.length).toBe(7);
  });

  it("fetchSLAPolicies has exactly one default", async () => {
    const res = await fetchSLAPolicies();
    const defaults = res.data.policies.filter((p) => p.is_default);
    expect(defaults.length).toBe(1);
  });

  it("fetchSLACompliance breakdown covers all 4 priorities", async () => {
    const res = await fetchSLACompliance();
    expect(res.success).toBe(true);
    expect(res.data.by_priority.length).toBe(4);
    expect(res.data.overall_compliance_pct).toBeGreaterThanOrEqual(0);
    expect(res.data.overall_compliance_pct).toBeLessThanOrEqual(100);
  });

  it("fetchSLACompliance per-priority compliance is bounded [0, 100]", async () => {
    const res = await fetchSLACompliance();
    for (const row of res.data.by_priority) {
      expect(row.compliance_pct).toBeGreaterThanOrEqual(0);
      expect(row.compliance_pct).toBeLessThanOrEqual(100);
      expect(row.on_track + row.breached_response + row.breached_resolution).toBe(row.total);
    }
  });

  // -------------------------------------------------------------------------
  // Bulk operations (Phase C row 21)
  // -------------------------------------------------------------------------

  it("bulkReassignTickets returns succeeded list for valid IDs", async () => {
    const res = await bulkReassignTickets({
      ticketIds: [1001, 1002],
      assigneeId: 3,
      reason: "Bulk shift cover",
    });
    expect(res.success).toBe(true);
    expect(res.data.succeeded).toEqual(expect.arrayContaining([1001, 1002]));
    expect(res.data.failed.length).toBe(0);

    // Verify both tickets reflect the new assignee
    const t1 = await fetchTicket(1001);
    const t2 = await fetchTicket(1002);
    expect(t1.data.ticket.assignee_id).toBe(3);
    expect(t2.data.ticket.assignee_id).toBe(3);
  });

  it("bulkReassignTickets reports failed entries for unknown IDs", async () => {
    const res = await bulkReassignTickets({
      ticketIds: [99998, 99999],
      assigneeId: 3,
    });
    expect(res.data.succeeded.length).toBe(0);
    expect(res.data.failed.length).toBe(2);
    expect(res.data.failed[0].error).toBe("ticket not found");
  });

  it("bulkStatusChange flips status + appends timeline events", async () => {
    const res = await bulkStatusChange({
      ticketIds: [1005],
      status: "resolved",
      reason: "Sweep close stale onboarding tickets",
    });
    expect(res.success).toBe(true);
    expect(res.data.succeeded).toContain(1005);

    const detail = await fetchTicket(1005);
    expect(detail.data.ticket.status).toBe("resolved");
    const lastEvent = detail.data.events[detail.data.events.length - 1];
    expect(lastEvent.type).toBe("status_changed");
    expect(lastEvent.description).toContain("Bulk status change");
  });

  it("bulkReassignTickets partial-failure: some valid + some unknown", async () => {
    const res = await bulkReassignTickets({
      ticketIds: [1003, 99999],
      assigneeId: 7,
    });
    expect(res.data.succeeded).toContain(1003);
    expect(res.data.failed.map((f) => f.id)).toContain(99999);
  });
});
