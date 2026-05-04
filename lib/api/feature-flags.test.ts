/**
 * PlatformFeatureFlags client tests (cap 17, Phase 1.1).
 * Covers: 4-source resolution, definitions list, override set/clear,
 * resolution chain shape.
 */
import { describe, it, expect } from "vitest";
import {
  fetchFeatureFlag,
  fetchFeatureFlagDefinitions,
  setFeatureFlagOverride,
} from "./feature-flags";

describe("feature-flags client (mock mode)", () => {
  it("fetchFeatureFlagDefinitions returns the catalog with required fields", async () => {
    const res = await fetchFeatureFlagDefinitions();
    expect(res.success).toBe(true);
    expect(res.data.definitions.length).toBeGreaterThan(5);
    const helpdesk = res.data.definitions.find((d) => d.key === "helpdesk.enabled");
    expect(helpdesk).toBeDefined();
    expect(helpdesk!.category).toBe("modules");
    expect(typeof helpdesk!.system_default).toBe("boolean");
  });

  it("resolves a flag with org override (helpdesk.enabled → enabled)", async () => {
    const res = await fetchFeatureFlag("helpdesk.enabled");
    expect(res.enabled).toBe(true);
    expect(res.source).toBe("org");
  });

  it("includes resolution_chain when requested", async () => {
    const res = await fetchFeatureFlag("helpdesk.enabled", { includeChain: true });
    expect(res.resolution_chain).toBeDefined();
    expect(res.resolution_chain!.length).toBe(4);
    expect(res.resolution_chain!.map((c) => c.source)).toEqual([
      "system",
      "plan",
      "org",
      "user",
    ]);
    // Exactly one matched
    expect(res.resolution_chain!.filter((c) => c.matched).length).toBe(1);
  });

  it("omits resolution_chain by default (hot-path read)", async () => {
    const res = await fetchFeatureFlag("helpdesk.enabled");
    expect(res.resolution_chain).toBeUndefined();
  });

  it("setFeatureFlagOverride flips org-scope override and updates resolution", async () => {
    const before = await fetchFeatureFlag("ai_agents.enabled");
    expect(before.enabled).toBe(false);
    await setFeatureFlagOverride({
      key: "ai_agents.enabled",
      scope: "org",
      scope_id: 1,
      value: true,
      reason: "test",
    });
    const after = await fetchFeatureFlag("ai_agents.enabled");
    expect(after.enabled).toBe(true);
    expect(after.source).toBe("org");
  });

  it("clearing an org override (value=null) falls back to plan/system", async () => {
    // First set, then clear.
    await setFeatureFlagOverride({
      key: "voice_agent.enabled",
      scope: "org",
      scope_id: 1,
      value: true,
    });
    expect((await fetchFeatureFlag("voice_agent.enabled")).enabled).toBe(true);
    await setFeatureFlagOverride({
      key: "voice_agent.enabled",
      scope: "org",
      scope_id: 1,
      value: null,
    });
    const after = await fetchFeatureFlag("voice_agent.enabled");
    expect(after.enabled).toBe(false);
    expect(after.source).not.toBe("org");
  });

  it("plan-source resolution kicks in when no org override exists", async () => {
    // wizard.enabled has plan default true, no org override (in fresh state).
    // Clear any leftover override first.
    await setFeatureFlagOverride({
      key: "wizard.enabled",
      scope: "org",
      scope_id: 1,
      value: null,
    });
    const res = await fetchFeatureFlag("wizard.enabled");
    expect(res.source).toBe("plan");
    expect(res.enabled).toBe(true);
  });

  it("system-source resolution when neither org nor plan have a value", async () => {
    // ai_agents.enabled has plan=undefined → falls through to system.
    await setFeatureFlagOverride({
      key: "ai_agents.enabled",
      scope: "org",
      scope_id: 1,
      value: null,
    });
    const res = await fetchFeatureFlag("ai_agents.enabled", { includeChain: true });
    expect(res.source).toBe("system");
    const matched = res.resolution_chain!.find((c) => c.matched);
    expect(matched?.source).toBe("system");
  });

  it("rejects user-scope overrides in mock mode (Q-FF-2 deferred)", async () => {
    await expect(
      setFeatureFlagOverride({
        key: "helpdesk.enabled",
        scope: "user",
        scope_id: 7,
        value: true,
      }),
    ).rejects.toThrow(/user-scope/i);
  });
});
