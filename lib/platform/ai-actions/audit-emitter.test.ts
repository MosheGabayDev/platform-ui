/**
 * Audit emission tests (Phase 2.4) — verify that AI touchpoints write
 * category=ai entries to the audit log.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  fetchAuditLog,
  _mockEntryCount,
} from "@/lib/api/audit";
import { evaluatePolicy } from "@/lib/api/policies";
import {
  validateSkillInvocation,
  setSkillEnablement,
} from "@/lib/api/ai-skills";
import { runActionExecutor } from "@/lib/platform/ai-actions/executors";

// Allow async-emit (`void emit*`) microtasks to settle before assertions.
async function flushAsync() {
  await new Promise((r) => setTimeout(r, 50));
}

beforeEach(async () => {
  await flushAsync();
});

describe("Phase 2.4 — AI audit emission", () => {
  it("policy evaluation writes an entry with category=ai and action=policy.evaluate", async () => {
    const before = _mockEntryCount();
    await evaluatePolicy({
      action_id: "helpdesk.batch.bulk_status",
      params: { affected_count: 100 },
    });
    await flushAsync();
    expect(_mockEntryCount()).toBeGreaterThan(before);
    const recent = await fetchAuditLog({ page: 1, per_page: 5, category: "ai" });
    const policyEntry = recent.data.entries.find(
      (e) => e.action === "policy.evaluate",
    );
    expect(policyEntry).toBeDefined();
    expect(policyEntry!.category).toBe("ai");
    expect(policyEntry!.metadata.kind).toBe("policy_evaluation");
    expect(policyEntry!.metadata.evaluated_action_id).toBe(
      "helpdesk.batch.bulk_status",
    );
    // Round-2 review HIGH #2: param_keys recorded, full params NOT.
    expect(policyEntry!.metadata.param_keys).toEqual(["affected_count"]);
    expect(policyEntry!.metadata.params).toBeUndefined();
  });

  it("policy evaluation never records full params (PII safety)", async () => {
    await evaluatePolicy({
      action_id: "helpdesk.ticket.resolve",
      params: { ticketId: 1, resolution: "PROBE-RESOLUTION-PROBE-XYZ" },
    });
    await flushAsync();
    const recent = await fetchAuditLog({ page: 1, per_page: 20, category: "ai" });
    const all = recent.data.entries.filter((e) => e.action === "policy.evaluate");
    for (const e of all) {
      expect(JSON.stringify(e)).not.toContain("PROBE-RESOLUTION-PROBE-XYZ");
    }
  });

  it("skill validation writes an entry with action=ai_skill.validate", async () => {
    const before = _mockEntryCount();
    await validateSkillInvocation({
      skill_id: "helpdesk.ticket.take",
      params: { ticketId: 42 },
    });
    await flushAsync();
    expect(_mockEntryCount()).toBeGreaterThan(before);
    const recent = await fetchAuditLog({ page: 1, per_page: 10, category: "ai" });
    const validationEntry = recent.data.entries.find(
      (e) =>
        e.action === "ai_skill.validate" &&
        e.resource_id === "helpdesk.ticket.take",
    );
    expect(validationEntry).toBeDefined();
    expect(validationEntry!.metadata.valid).toBe(true);
    expect(validationEntry!.metadata.skill_available).toBe(true);
  });

  it("skill validation records invalid params with error_count > 0", async () => {
    await validateSkillInvocation({
      skill_id: "helpdesk.ticket.take",
      params: {},
    });
    await flushAsync();
    const recent = await fetchAuditLog({ page: 1, per_page: 10, category: "ai" });
    const last = recent.data.entries.find(
      (e) => e.action === "ai_skill.validate",
    );
    expect(last).toBeDefined();
    // Most recent matching entry has error_count >= 1
    expect(last!.metadata.valid).toBe(false);
    expect(Number(last!.metadata.error_count)).toBeGreaterThan(0);
  });

  it("skill validation never records full params (PII safety)", async () => {
    await validateSkillInvocation({
      skill_id: "helpdesk.ticket.take",
      params: { ticketId: 42, secret_user_input: "PROBE-PROBE-PROBE" },
    });
    await flushAsync();
    const recent = await fetchAuditLog({ page: 1, per_page: 20, category: "ai" });
    const all = recent.data.entries.filter((e) => e.action === "ai_skill.validate");
    for (const e of all) {
      expect(JSON.stringify(e)).not.toContain("PROBE-PROBE-PROBE");
    }
  });

  it("runActionExecutor records success entry with resource_type ticket", async () => {
    const qc = new QueryClient();
    await runActionExecutor("helpdesk.ticket.take", { ticketId: 1002 }, qc);
    await flushAsync();
    const recent = await fetchAuditLog({ page: 1, per_page: 5, category: "ai" });
    const exec = recent.data.entries.find(
      (e) => e.action === "helpdesk.ticket.take",
    );
    expect(exec).toBeDefined();
    expect(exec!.resource_type).toBe("ticket");
    expect(exec!.resource_id).toBe("1002");
    expect(exec!.metadata.outcome).toBe("success");
  });

  it("runActionExecutor records error when executor throws", async () => {
    const qc = new QueryClient();
    await expect(
      runActionExecutor("helpdesk.ticket.take", { ticketId: "bad" }, qc),
    ).rejects.toBeTruthy();
    await flushAsync();
    const recent = await fetchAuditLog({ page: 1, per_page: 10, category: "ai" });
    const errored = recent.data.entries.find(
      (e) =>
        e.action === "helpdesk.ticket.take" &&
        e.metadata.outcome === "error",
    );
    expect(errored).toBeDefined();
  });

  it("runActionExecutor with unknown actionId records and rejects", async () => {
    const qc = new QueryClient();
    await expect(
      runActionExecutor("does.not.exist", {}, qc),
    ).rejects.toThrow(/No executor registered/);
    await flushAsync();
    const recent = await fetchAuditLog({ page: 1, per_page: 10, category: "ai" });
    const missing = recent.data.entries.find(
      (e) => e.action === "does.not.exist" && e.metadata.error === "executor not registered",
    );
    expect(missing).toBeDefined();
  });

  it("setSkillEnablement does NOT write a skill_validation audit entry", async () => {
    // Sanity: the enablement write path is admin-category not ai.validate.
    const before = _mockEntryCount();
    await setSkillEnablement({ skill_id: "helpdesk.ticket.take", enabled: true });
    await flushAsync();
    // setSkillEnablement is silent in mock (audit emitted server-side per spec)
    // — we just confirm no validate entry was created here.
    const recent = await fetchAuditLog({ page: 1, per_page: 5, category: "ai" });
    const validateForTake = recent.data.entries
      .filter((e) => e.action === "ai_skill.validate" && e.resource_id === "helpdesk.ticket.take")
      .filter((e) => new Date(e.timestamp).getTime() > Date.now() - 1000);
    // None should have been written by THIS call (setSkillEnablement doesn't validate)
    expect(_mockEntryCount()).toBeGreaterThanOrEqual(before);
    expect(validateForTake.length).toBe(0);
  });

  it("audit category=ai count grows after multiple emissions", async () => {
    const baseline = await fetchAuditLog({ page: 1, per_page: 1000, category: "ai" });
    const baselineCount = baseline.data.total;

    await evaluatePolicy({ action_id: "k.k", params: {} });
    await validateSkillInvocation({ skill_id: "helpdesk.ticket.take", params: { ticketId: 1 } });
    await flushAsync();

    const after = await fetchAuditLog({ page: 1, per_page: 1000, category: "ai" });
    expect(after.data.total).toBeGreaterThan(baselineCount);
  });
});
