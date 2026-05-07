import { describe, it, expect } from "vitest";
import { flagsForTier, isFlagAutoEnabledForTier, minTierForFlag } from "./tier-flags";

describe("flagsForTier", () => {
  it("free tier returns just helpdesk.enabled", () => {
    expect(flagsForTier("free")).toEqual(["helpdesk.enabled"]);
  });

  it("pro tier includes all free flags", () => {
    const pro = flagsForTier("pro");
    expect(pro).toContain("helpdesk.enabled");
    expect(pro).toContain("audit_log.export");
    expect(pro).toContain("ai_agents.enabled");
    expect(pro).toContain("automation.enabled");
    expect(pro).toContain("priority_support.enabled");
  });

  it("enterprise tier strictly supersets pro", () => {
    const pro = new Set(flagsForTier("pro"));
    const ent = flagsForTier("enterprise");
    for (const f of pro) expect(ent).toContain(f);
  });

  it("enterprise tier includes all enterprise-only flags", () => {
    const ent = flagsForTier("enterprise");
    for (const f of [
      "sso.enabled",
      "scim.enabled",
      "custom_domain.enabled",
      "byok.enabled",
      "ip_allowlist.enabled",
      "audit_log.long_retention",
    ]) {
      expect(ent).toContain(f);
    }
  });

  it("counts: free 1, pro 5, enterprise 11", () => {
    expect(flagsForTier("free")).toHaveLength(1);
    expect(flagsForTier("pro")).toHaveLength(5);
    expect(flagsForTier("enterprise")).toHaveLength(11);
  });

  it("returns a fresh array each call (mutating it does not leak)", () => {
    const a = flagsForTier("pro");
    a.push("mutated");
    expect(flagsForTier("pro")).not.toContain("mutated");
  });
});

describe("isFlagAutoEnabledForTier", () => {
  it("helpdesk.enabled is on at every tier", () => {
    for (const tier of ["free", "pro", "enterprise"] as const) {
      expect(isFlagAutoEnabledForTier("helpdesk.enabled", tier)).toBe(true);
    }
  });

  it("audit_log.export is on at pro and enterprise only", () => {
    expect(isFlagAutoEnabledForTier("audit_log.export", "free")).toBe(false);
    expect(isFlagAutoEnabledForTier("audit_log.export", "pro")).toBe(true);
    expect(isFlagAutoEnabledForTier("audit_log.export", "enterprise")).toBe(true);
  });

  it("sso.enabled is enterprise-only", () => {
    expect(isFlagAutoEnabledForTier("sso.enabled", "free")).toBe(false);
    expect(isFlagAutoEnabledForTier("sso.enabled", "pro")).toBe(false);
    expect(isFlagAutoEnabledForTier("sso.enabled", "enterprise")).toBe(true);
  });

  it("unknown flags are never auto-enabled", () => {
    for (const tier of ["free", "pro", "enterprise"] as const) {
      expect(isFlagAutoEnabledForTier("totally.unknown.flag", tier)).toBe(false);
    }
  });
});

describe("minTierForFlag", () => {
  it("returns 'free' for helpdesk.enabled", () => {
    expect(minTierForFlag("helpdesk.enabled")).toBe("free");
  });
  it("returns 'pro' for pro-only flags", () => {
    expect(minTierForFlag("audit_log.export")).toBe("pro");
    expect(minTierForFlag("ai_agents.enabled")).toBe("pro");
  });
  it("returns 'enterprise' for enterprise-only flags", () => {
    expect(minTierForFlag("sso.enabled")).toBe("enterprise");
    expect(minTierForFlag("byok.enabled")).toBe("enterprise");
  });
  it("returns null for unknown flags (env/org controlled)", () => {
    expect(minTierForFlag("not.a.real.flag")).toBeNull();
  });
});
