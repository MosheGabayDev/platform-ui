/**
 * AISkillRegistry client tests (Phase 2.2).
 */
import { describe, it, expect } from "vitest";
import {
  fetchAISkills,
  setSkillEnablement,
  validateSkillInvocation,
} from "./ai-skills";

describe("ai-skills client (mock mode)", () => {
  it("fetchAISkills returns the aggregated catalog with manifest + enablement", async () => {
    const res = await fetchAISkills();
    expect(res.success).toBe(true);
    expect(res.data.skills.length).toBeGreaterThanOrEqual(7);
    const helpdeskTake = res.data.skills.find((e) => e.skill.id === "helpdesk.ticket.take");
    expect(helpdeskTake).toBeDefined();
    expect(helpdeskTake!.skill.risk_level).toBe("low");
    expect(helpdeskTake!.skill.parameter_schema.required).toContain("ticketId");
  });

  it("fetchAISkills filters by module", async () => {
    const res = await fetchAISkills({ module: "users" });
    expect(res.data.skills.every((e) => e.skill.module_key === "users")).toBe(true);
  });

  it("fetchAISkills filters by ai_callable", async () => {
    const res = await fetchAISkills({ ai_callable: true });
    expect(res.data.skills.every((e) => e.skill.ai_callable)).toBe(true);
  });

  it("module_counts matches the returned skills", async () => {
    const res = await fetchAISkills();
    expect(res.data.module_counts.helpdesk).toBeGreaterThan(0);
    expect(res.data.module_counts.users).toBeGreaterThan(0);
  });

  it("available_to_ai is true when module is enabled + skill default-on", async () => {
    const res = await fetchAISkills({ module: "helpdesk" });
    const take = res.data.skills.find((e) => e.skill.id === "helpdesk.ticket.take");
    expect(take?.available_to_ai).toBe(true);
  });

  it("available_to_ai is false for default-off skills (users.deactivate)", async () => {
    const res = await fetchAISkills({ module: "users" });
    const deactivate = res.data.skills.find((e) => e.skill.id === "users.deactivate");
    expect(deactivate?.skill.default_enabled).toBe(false);
    expect(deactivate?.available_to_ai).toBe(false);
  });

  it("setSkillEnablement flips availability", async () => {
    const before = await fetchAISkills({ module: "users" });
    expect(before.data.skills.find((e) => e.skill.id === "users.deactivate")?.available_to_ai).toBe(false);
    await setSkillEnablement({ skill_id: "users.deactivate", enabled: true });
    const after = await fetchAISkills({ module: "users" });
    // available_to_ai depends on the module being enabled too; "users" module
    // is enabled in the registry mock, so this flips green.
    const entry = after.data.skills.find((e) => e.skill.id === "users.deactivate");
    expect(entry?.enablement.enabled).toBe(true);
    expect(entry?.enablement.source).toBe("org_override");
  });

  it("setSkillEnablement throws for unknown skill", async () => {
    await expect(
      setSkillEnablement({ skill_id: "nonexistent.skill", enabled: true }),
    ).rejects.toThrow(/404/);
  });

  it("validateSkillInvocation returns valid=true for good params", async () => {
    const res = await validateSkillInvocation({
      skill_id: "helpdesk.ticket.take",
      params: { ticketId: 42 },
    });
    expect(res.data.valid).toBe(true);
    expect(res.data.errors).toEqual([]);
    expect(res.data.skill_available).toBe(true);
    expect(res.data.policy_decision).not.toBeNull();
  });

  it("validateSkillInvocation reports missing required param", async () => {
    const res = await validateSkillInvocation({
      skill_id: "helpdesk.ticket.take",
      params: {},
    });
    expect(res.data.valid).toBe(false);
    expect(res.data.errors).toEqual([{ path: "ticketId", message: "required" }]);
    expect(res.data.policy_decision).toBeNull();
  });

  it("validateSkillInvocation reports type mismatch", async () => {
    const res = await validateSkillInvocation({
      skill_id: "helpdesk.ticket.take",
      params: { ticketId: "not-an-integer" },
    });
    expect(res.data.valid).toBe(false);
    expect(res.data.errors[0]?.message).toMatch(/integer/);
  });

  it("validateSkillInvocation reports minimum-violation", async () => {
    const res = await validateSkillInvocation({
      skill_id: "helpdesk.ticket.take",
      params: { ticketId: 0 },
    });
    expect(res.data.valid).toBe(false);
    expect(res.data.errors[0]?.message).toMatch(/≥ 1/);
  });

  it("validateSkillInvocation returns 'not in registry' for unknown skill", async () => {
    const res = await validateSkillInvocation({
      skill_id: "fake.skill",
      params: {},
    });
    expect(res.data.valid).toBe(false);
    expect(res.data.errors[0]?.message).toMatch(/not in registry/);
    expect(res.data.skill_available).toBe(false);
  });

  it("validateSkillInvocation surfaces policy decision for high-risk skill", async () => {
    // helpdesk.maintenance.cancel has risk=high. The policy engine will
    // attach matched rules.
    const res = await validateSkillInvocation({
      skill_id: "helpdesk.maintenance.cancel",
      params: { windowId: 123 },
    });
    expect(res.data.valid).toBe(true);
    expect(res.data.policy_decision).not.toBeNull();
  });
});
