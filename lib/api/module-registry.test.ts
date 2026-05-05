/**
 * PlatformModuleRegistry client tests (cap 18, Phase 1.3).
 */
import { describe, it, expect } from "vitest";
import { fetchModules, setModuleEnablement } from "./module-registry";

describe("module-registry client (mock mode)", () => {
  it("fetchModules returns all known modules with manifest + enablement + status", async () => {
    const res = await fetchModules();
    expect(res.success).toBe(true);
    expect(res.data.modules.length).toBeGreaterThanOrEqual(10);
    const helpdesk = res.data.modules.find((m) => m.key === "helpdesk");
    expect(helpdesk).toBeDefined();
    expect(helpdesk!.manifest.label_he).toBe("הלפדסק");
    expect(helpdesk!.manifest.ai_actions).toContain("helpdesk.ticket.take");
    expect(helpdesk!.enablement.enabled).toBe(true);
    expect(helpdesk!.status).toBe("healthy");
  });

  it("disables modules whose required_flags evaluate false", async () => {
    const res = await fetchModules();
    // ai-agents requires "ai_agents.enabled" flag — not on by default.
    const aiAgents = res.data.modules.find((m) => m.key === "ai-agents");
    expect(aiAgents).toBeDefined();
    expect(aiAgents!.status).toBe("disabled_by_flag");
    expect(aiAgents!.blocked_reason).toMatch(/feature flag/i);
  });

  it("marks modules unavailable when plan does not grant required tier", async () => {
    const res = await fetchModules();
    // voice requires plan "enterprise" — mock is on "pro".
    const voice = res.data.modules.find((m) => m.key === "voice");
    expect(voice).toBeDefined();
    expect(voice!.status).toBe("unavailable");
    expect(voice!.blocked_reason).toMatch(/plan does not include/i);
  });

  it("setModuleEnablement flips a module on/off", async () => {
    const before = await fetchModules();
    const automation = before.data.modules.find((m) => m.key === "automation");
    expect(automation!.enablement.enabled).toBe(false);

    await setModuleEnablement({ key: "automation", enabled: true });
    const after = await fetchModules();
    const automationAfter = after.data.modules.find((m) => m.key === "automation");
    expect(automationAfter!.enablement.enabled).toBe(true);
  });

  it("setModuleEnablement throws 404 on unknown key", async () => {
    await expect(
      setModuleEnablement({ key: "nonexistent", enabled: true }),
    ).rejects.toThrow(/404/);
  });

  it("manifest exposes nav_entries with stable ordering", async () => {
    const res = await fetchModules();
    const helpdesk = res.data.modules.find((m) => m.key === "helpdesk");
    const orders = helpdesk!.manifest.nav_entries.map((n) => n.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it("manifest declares search_types so cap 11 can scope results", async () => {
    const res = await fetchModules();
    const helpdesk = res.data.modules.find((m) => m.key === "helpdesk");
    expect(helpdesk!.manifest.search_types).toContain("ticket");
    const users = res.data.modules.find((m) => m.key === "users");
    expect(users!.manifest.search_types).toContain("user");
  });

  it("manifest declares ai_actions so executor registry can scope to enabled modules", async () => {
    const res = await fetchModules();
    const allActions = res.data.modules.flatMap((m) => m.manifest.ai_actions);
    expect(allActions).toContain("helpdesk.ticket.resolve");
    expect(allActions).toContain("helpdesk.maintenance.cancel");
  });
});
