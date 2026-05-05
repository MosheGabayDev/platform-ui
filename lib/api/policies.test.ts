/**
 * PlatformPolicy Engine client tests (cap 27, Phase 1.4).
 * Covers: condition evaluator, deny precedence, default-allow, system
 * policies fire correctly, glob action_pattern matching, subject selectors.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  evaluateCondition,
  evaluatePoliciesAgainstContext,
  fetchPolicies,
  fetchPolicy,
  evaluatePolicy,
  setPolicyEnabled,
} from "./policies";
import type {
  PolicyEvaluationContext,
  Policy,
} from "@/lib/modules/policies/types";

function makeCtx(
  overrides: Partial<PolicyEvaluationContext> = {},
): PolicyEvaluationContext {
  return {
    action_id: "helpdesk.ticket.resolve",
    params: {},
    session: {
      user_id: 1,
      org_id: 1,
      role: "system_admin",
      roles: ["system_admin"],
      is_admin: true,
      is_system_admin: true,
      permissions: [],
    },
    resource: null,
    evaluated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("evaluateCondition (mock expression language)", () => {
  it("evaluates simple field comparison (==, !=)", () => {
    const ctx = makeCtx({ params: { affected_count: 60 } });
    expect(evaluateCondition("params.affected_count == 60", ctx)).toBe(true);
    expect(evaluateCondition("params.affected_count != 60", ctx)).toBe(false);
  });

  it("evaluates numeric comparison (>, >=)", () => {
    const ctx = makeCtx({ params: { affected_count: 100 } });
    expect(evaluateCondition("params.affected_count > 50", ctx)).toBe(true);
    expect(evaluateCondition("params.affected_count >= 100", ctx)).toBe(true);
    expect(evaluateCondition("params.affected_count > 100", ctx)).toBe(false);
  });

  it("evaluates string equality with double-quoted literals", () => {
    const ctx = makeCtx({ resource: { priority: "P1" } });
    expect(evaluateCondition('resource.priority == "P1"', ctx)).toBe(true);
    expect(evaluateCondition('resource.priority == "P3"', ctx)).toBe(false);
  });

  it("evaluates logical and / or / not", () => {
    const ctx = makeCtx({ params: { x: 5, y: 10 } });
    expect(evaluateCondition("params.x == 5 and params.y == 10", ctx)).toBe(true);
    expect(evaluateCondition("params.x == 5 and params.y == 11", ctx)).toBe(false);
    expect(evaluateCondition("params.x == 5 or params.y == 11", ctx)).toBe(true);
    expect(evaluateCondition("not (params.x == 99)", ctx)).toBe(true);
  });

  it("evaluates exists for missing field", () => {
    const ctx = makeCtx({ params: { foo: 1 } });
    expect(evaluateCondition("exists params.foo", ctx)).toBe(true);
    expect(evaluateCondition("exists params.bar", ctx)).toBe(false);
  });

  it("evaluates in / not_in lists", () => {
    const ctx = makeCtx({ session: { ...makeCtx().session, role: "technician" } });
    expect(
      evaluateCondition('session.role in ["technician", "agent"]', ctx),
    ).toBe(true);
    expect(
      evaluateCondition('session.role not_in ["admin", "viewer"]', ctx),
    ).toBe(true);
  });

  it("returns false for syntactically broken conditions (fail-safe)", () => {
    const ctx = makeCtx();
    // Unknown identifier inside throws → caught → false (rule does NOT match)
    expect(evaluateCondition("params.x ==", ctx)).toBe(false);
    expect(evaluateCondition(")(", ctx)).toBe(false);
  });

  it("returns true for empty / whitespace condition (no condition = always match)", () => {
    expect(evaluateCondition("", makeCtx())).toBe(true);
    expect(evaluateCondition("   ", makeCtx())).toBe(true);
  });
});

describe("evaluatePoliciesAgainstContext", () => {
  beforeEach(() => {
    // Force a deterministic "business hours" — Tuesday 14:00.
    // Only fake Date so async setTimeout in mock clients still resolves.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 4, 5, 14, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("default-allows when no rule matches", async () => {
    const policies = await fetchPolicies();
    const ctx = makeCtx({ action_id: "knowledge.article.view" });
    const decision = evaluatePoliciesAgainstContext(policies.data.policies, ctx);
    expect(decision.allowed).toBe(true);
    expect(decision.requires_approval).toBe(false);
    expect(decision.matched_rules).toEqual([]);
  });

  it("system policy: requires approval when batch action affects >50 items", async () => {
    const policies = await fetchPolicies();
    const ctx = makeCtx({
      action_id: "helpdesk.batch.bulk_status",
      params: { affected_count: 100 },
    });
    const decision = evaluatePoliciesAgainstContext(policies.data.policies, ctx);
    expect(decision.requires_approval).toBe(true);
    expect(decision.allowed).toBe(true);
    expect(decision.matched_rules.some((r) => r.rule_id === "rule.approval_large_batch")).toBe(true);
  });

  it("system policy: denies admin.* for non-admin user", async () => {
    const policies = await fetchPolicies();
    const ctx = makeCtx({
      action_id: "admin.users.delete",
      session: {
        ...makeCtx().session,
        is_admin: false,
        roles: ["technician"],
      },
    });
    const decision = evaluatePoliciesAgainstContext(policies.data.policies, ctx);
    expect(decision.allowed).toBe(false);
    expect(decision.reasons.length).toBeGreaterThan(0);
  });

  it("admin user is NOT blocked by the admin.* deny rule (subject selector)", async () => {
    const policies = await fetchPolicies();
    const ctx = makeCtx({ action_id: "admin.users.delete" }); // session is admin
    const decision = evaluatePoliciesAgainstContext(policies.data.policies, ctx);
    expect(decision.allowed).toBe(true);
  });

  it("deny precedence: a deny rule wins even when an approval rule also matches", () => {
    // Build a synthetic policy where both deny and require_approval would match.
    const synthetic: Policy = {
      id: "test.deny_precedence",
      name: "test",
      description: "",
      category: "ai_safety",
      org_id: null,
      enabled: true,
      created_at: "",
      updated_at: "",
      created_by_user_id: null,
      updated_by_user_id: null,
      rules: [
        {
          id: "approve",
          description: "approve",
          resource_pattern: "*",
          action_pattern: "test.*",
          subject: null,
          condition: null,
          active_from: null,
          active_until: null,
          effect: "require_approval",
          priority: 50,
          enabled: true,
        },
        {
          id: "deny",
          description: "deny",
          resource_pattern: "*",
          action_pattern: "test.*",
          subject: null,
          condition: null,
          active_from: null,
          active_until: null,
          effect: "deny",
          priority: 100,
          enabled: true,
        },
      ],
    };
    const decision = evaluatePoliciesAgainstContext(
      [synthetic],
      makeCtx({ action_id: "test.something" }),
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reasons).toContain("deny");
  });

  it("disabled policies are skipped", () => {
    const synthetic: Policy = {
      id: "test.disabled",
      name: "test",
      description: "",
      category: "ai_safety",
      org_id: null,
      enabled: false,
      created_at: "",
      updated_at: "",
      created_by_user_id: null,
      updated_by_user_id: null,
      rules: [
        {
          id: "x",
          description: "x",
          resource_pattern: "*",
          action_pattern: "*",
          subject: null,
          condition: null,
          active_from: null,
          active_until: null,
          effect: "deny",
          priority: 100,
          enabled: true,
        },
      ],
    };
    const decision = evaluatePoliciesAgainstContext(
      [synthetic],
      makeCtx({ action_id: "anything" }),
    );
    expect(decision.allowed).toBe(true);
  });

  it("cross-org isolation: org-scoped policy does not apply to a different org", () => {
    const synthetic: Policy = {
      id: "test.org_scoped",
      name: "test",
      description: "",
      category: "ai_safety",
      org_id: 99,
      enabled: true,
      created_at: "",
      updated_at: "",
      created_by_user_id: null,
      updated_by_user_id: null,
      rules: [
        {
          id: "x",
          description: "x",
          resource_pattern: "*",
          action_pattern: "*",
          subject: null,
          condition: null,
          active_from: null,
          active_until: null,
          effect: "deny",
          priority: 100,
          enabled: true,
        },
      ],
    };
    const decision = evaluatePoliciesAgainstContext(
      [synthetic],
      makeCtx({ action_id: "anything", session: { ...makeCtx().session, org_id: 1 } }),
    );
    expect(decision.allowed).toBe(true);
  });

  it("glob action pattern: helpdesk.* matches helpdesk.ticket.resolve", () => {
    const synthetic: Policy = {
      id: "t",
      name: "t",
      description: "",
      category: "ai_safety",
      org_id: null,
      enabled: true,
      created_at: "",
      updated_at: "",
      created_by_user_id: null,
      updated_by_user_id: null,
      rules: [
        {
          id: "r",
          description: "all helpdesk",
          resource_pattern: "*",
          action_pattern: "helpdesk.*",
          subject: null,
          condition: null,
          active_from: null,
          active_until: null,
          effect: "require_approval",
          priority: 1,
          enabled: true,
        },
      ],
    };
    const decision = evaluatePoliciesAgainstContext(
      [synthetic],
      makeCtx({ action_id: "helpdesk.ticket.resolve" }),
    );
    expect(decision.requires_approval).toBe(true);
  });
});

describe("policies API surface", () => {
  it("fetchPolicies returns the seeded system policies", async () => {
    const res = await fetchPolicies();
    expect(res.success).toBe(true);
    expect(res.data.policies.length).toBeGreaterThanOrEqual(3);
    const ids = res.data.policies.map((p) => p.id);
    expect(ids).toContain("policy.system.ai_safety_baseline");
  });

  it("fetchPolicy returns a single policy by id", async () => {
    const res = await fetchPolicy("policy.system.ai_safety_baseline");
    expect(res.data.policy.id).toBe("policy.system.ai_safety_baseline");
    expect(res.data.policy.rules.length).toBeGreaterThan(0);
  });

  it("fetchPolicy throws 404 for unknown id", async () => {
    await expect(fetchPolicy("does.not.exist")).rejects.toThrow(/404/);
  });

  it("setPolicyEnabled flips the flag", async () => {
    await setPolicyEnabled("policy.system.ai_safety_baseline", false);
    const res = await fetchPolicy("policy.system.ai_safety_baseline");
    expect(res.data.policy.enabled).toBe(false);
    await setPolicyEnabled("policy.system.ai_safety_baseline", true);
  });

  it("evaluatePolicy end-to-end: blast-radius rule fires for big batch", async () => {
    const res = await evaluatePolicy({
      action_id: "helpdesk.batch.bulk_status",
      params: { affected_count: 200 },
    });
    expect(res.data.decision.requires_approval).toBe(true);
  });
});
