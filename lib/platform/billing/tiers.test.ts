import { describe, it, expect } from "vitest";
import {
  getTierEntitlements,
  isUnlimited,
  isOverLimit,
  utilizationPct,
  UNLIMITED,
} from "./tiers";

describe("getTierEntitlements", () => {
  it("returns the free tier shape", () => {
    const t = getTierEntitlements("free");
    expect(t.monthly_usd).toBe(0);
    expect(t.limits.seats).toBe(1);
    expect(t.features.sso_saml).toBe(false);
  });

  it("returns the pro tier shape", () => {
    const t = getTierEntitlements("pro");
    expect(t.monthly_usd).toBe(99);
    expect(t.limits.seats).toBe(25);
    expect(t.limits.tokens_per_month).toBe(5_000_000);
    expect(t.features.audit_log_export).toBe(true);
    expect(t.features.priority_support).toBe(true);
    expect(t.features.sso_saml).toBe(false);
  });

  it("returns the enterprise tier shape with unlimited quotas", () => {
    const t = getTierEntitlements("enterprise");
    expect(t.monthly_usd).toBe("custom");
    expect(t.limits.seats).toBe(UNLIMITED);
    expect(t.limits.tokens_per_month).toBe(UNLIMITED);
    expect(t.features.sso_saml).toBe(true);
    expect(t.features.byok).toBe(true);
    expect(t.features.sla_uptime_99_9).toBe(true);
  });

  it("audit_log_retention_days monotonically increases with tier", () => {
    expect(getTierEntitlements("free").limits.audit_log_retention_days).toBe(30);
    expect(getTierEntitlements("pro").limits.audit_log_retention_days).toBe(90);
    expect(getTierEntitlements("enterprise").limits.audit_log_retention_days).toBe(365);
  });

  it("every Pro feature is also enabled at Enterprise (no downgrades)", () => {
    const pro = getTierEntitlements("pro").features;
    const ent = getTierEntitlements("enterprise").features;
    for (const key of Object.keys(pro) as Array<keyof typeof pro>) {
      if (pro[key]) expect(ent[key]).toBe(true);
    }
  });
});

describe("isUnlimited", () => {
  it("returns true for the sentinel -1", () => {
    expect(isUnlimited(UNLIMITED)).toBe(true);
    expect(isUnlimited(-1)).toBe(true);
  });
  it("returns false for any concrete number", () => {
    expect(isUnlimited(0)).toBe(false);
    expect(isUnlimited(1)).toBe(false);
    expect(isUnlimited(1_000_000)).toBe(false);
  });
});

describe("isOverLimit", () => {
  it("returns false when used < limit", () => {
    expect(isOverLimit(50, 100)).toBe(false);
  });
  it("returns true at exactly limit (treats limit as exclusive cap)", () => {
    expect(isOverLimit(100, 100)).toBe(true);
  });
  it("returns true when over limit", () => {
    expect(isOverLimit(101, 100)).toBe(true);
  });
  it("returns false for unlimited (-1) regardless of usage", () => {
    expect(isOverLimit(999_999_999, UNLIMITED)).toBe(false);
  });
});

describe("utilizationPct", () => {
  it("returns 0 for unlimited", () => {
    expect(utilizationPct(500, UNLIMITED)).toBe(0);
  });
  it("rounds to nearest integer", () => {
    expect(utilizationPct(33, 100)).toBe(33);
    expect(utilizationPct(666, 1000)).toBe(67);
  });
  it("returns 100 at the cap", () => {
    expect(utilizationPct(100, 100)).toBe(100);
  });
  it("returns >100 when over (does not clamp)", () => {
    expect(utilizationPct(150, 100)).toBe(150);
  });
  it("returns 999 sentinel when limit is 0 (avoids Infinity)", () => {
    expect(utilizationPct(5, 0)).toBe(999);
  });
});
