import { describe, it, expect } from "vitest";
import {
  fetchApprovals,
  approveInvocation,
  rejectInvocation,
} from "./helpdesk.approvals";

describe("helpdesk approvals client (mock mode)", () => {
  it("fetchApprovals defaults to all entries newest-first", async () => {
    const res = await fetchApprovals({ page: 1, per_page: 50 });
    expect(res.success).toBe(true);
    expect(res.data.invocations.length).toBeGreaterThan(0);
    // Newest first
    for (let i = 1; i < res.data.invocations.length; i++) {
      const a = new Date(res.data.invocations[i - 1].created_at).getTime();
      const b = new Date(res.data.invocations[i].created_at).getTime();
      expect(a).toBeGreaterThanOrEqual(b);
    }
  });

  it("pending_count equals number of pending_approval entries", async () => {
    const all = await fetchApprovals({ page: 1, per_page: 50 });
    const pendingFiltered = await fetchApprovals({
      page: 1,
      per_page: 50,
      status: "pending_approval",
    });
    expect(pendingFiltered.data.invocations.length).toBe(all.data.pending_count);
  });

  it("status filter narrows to rejected only", async () => {
    const res = await fetchApprovals({
      page: 1,
      per_page: 50,
      status: "rejected",
    });
    expect(res.data.invocations.every((i) => i.status === "rejected")).toBe(true);
    expect(res.data.invocations.length).toBeGreaterThan(0);
  });

  it("search by tool_name fragment narrows results", async () => {
    const res = await fetchApprovals({
      page: 1,
      per_page: 50,
      search: "deactivate",
    });
    expect(res.data.invocations.length).toBeGreaterThan(0);
    expect(
      res.data.invocations.every((i) =>
        i.tool_name.toLowerCase().includes("deactivate"),
      ),
    ).toBe(true);
  });

  it("approveInvocation flips status to approved", async () => {
    // Pick a pending entry; approve it; verify state transition
    const before = await fetchApprovals({
      page: 1,
      per_page: 50,
      status: "pending_approval",
    });
    const target = before.data.invocations[0];
    expect(target).toBeDefined();
    const res = await approveInvocation({ invocationId: target.id });
    expect(res.success).toBe(true);

    const after = await fetchApprovals({ page: 1, per_page: 50 });
    const updated = after.data.invocations.find((i) => i.id === target.id);
    expect(updated?.status).toBe("approved");
  });

  it("rejectInvocation flips status + records reason", async () => {
    // Find another pending entry (after the approve test above)
    const before = await fetchApprovals({
      page: 1,
      per_page: 50,
      status: "pending_approval",
    });
    const target = before.data.invocations[0];
    if (!target) return; // queue may be empty
    const res = await rejectInvocation({
      invocationId: target.id,
      reason: "Not authorized for this resource",
    });
    expect(res.success).toBe(true);

    const after = await fetchApprovals({ page: 1, per_page: 50 });
    const updated = after.data.invocations.find((i) => i.id === target.id);
    expect(updated?.status).toBe("rejected");
    expect(updated?.error_message).toContain("Not authorized");
  });

  it("tool_snapshot risk_level present on pending approvals (frozen at issue time)", async () => {
    const res = await fetchApprovals({ page: 1, per_page: 50 });
    // At least one snapshot should be present somewhere across the queue
    const hasSnapshot = res.data.invocations.some(
      (i) => i.tool_snapshot !== null && i.tool_snapshot.risk_level !== undefined,
    );
    expect(hasSnapshot).toBe(true);
  });
});
