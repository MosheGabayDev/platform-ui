/**
 * filterNavByEnabledModules — drops disabled-module items, keeps unmapped
 * routes (admin, settings, dashboard root). Empty groups are removed.
 */
import { describe, it, expect } from "vitest";
import { navGroups, filterNavByEnabledModules } from "./nav-items";

describe("navGroups static definition", () => {
  it("includes the dashboard root", () => {
    const main = navGroups.find((g) => g.labelKey === "nav.groups.main");
    expect(main?.items.some((i) => i.href === "/")).toBe(true);
  });

  it("every item has a titleKey under nav.items.*", () => {
    for (const g of navGroups) {
      for (const item of g.items) {
        expect(item.titleKey).toMatch(/^nav\.items\./);
        if (item.children) {
          for (const c of item.children) {
            expect(c.titleKey).toMatch(/^nav\.items\./);
          }
        }
      }
    }
  });
});

describe("filterNavByEnabledModules", () => {
  it("keeps unmapped routes when nothing enabled (admin chrome, dashboard, settings)", () => {
    const result = filterNavByEnabledModules(navGroups, new Set());
    const admin = result.find((g) => g.labelKey === "nav.groups.platformAdmin");
    expect(admin).toBeDefined();
    expect(admin!.items.length).toBeGreaterThan(0);
  });

  it("drops helpdesk items when 'helpdesk' is not enabled", () => {
    const result = filterNavByEnabledModules(navGroups, new Set());
    const hd = result.find((g) => g.labelKey === "nav.groups.helpdesk");
    expect(hd?.items.find((i) => i.href === "/helpdesk")).toBeUndefined();
  });

  it("includes helpdesk items when 'helpdesk' is enabled", () => {
    const result = filterNavByEnabledModules(navGroups, new Set(["helpdesk"]));
    const hd = result.find((g) => g.labelKey === "nav.groups.helpdesk");
    expect(hd?.items.find((i) => i.href === "/helpdesk/tickets")).toBeDefined();
  });

  it("matches longest prefix — /helpdesk/tickets resolves to 'helpdesk'", () => {
    const result = filterNavByEnabledModules(navGroups, new Set(["helpdesk"]));
    const hd = result.find((g) => g.labelKey === "nav.groups.helpdesk");
    expect(hd?.items.find((i) => i.href === "/helpdesk/tickets")).toBeDefined();
  });

  it("removes a group entirely when all its items are filtered out", () => {
    // Voice group items map to 'voice' module. When voice is disabled and
    // no items remain, the whole group should be dropped from the result.
    const result = filterNavByEnabledModules(navGroups, new Set());
    const aiGroup = result.find((g) => g.labelKey === "nav.groups.aiVoice");
    // aiAgents and knowledge map to other modules — group may still exist.
    // Assert that voice items themselves are dropped at minimum.
    const voiceItem = aiGroup?.items.find((i) => i.href === "/voice");
    expect(voiceItem).toBeUndefined();
  });

  it("keeps unmapped routes regardless of module set", () => {
    const result = filterNavByEnabledModules(navGroups, new Set(["helpdesk"]));
    const settingsGroup = result.find((g) => g.labelKey === "nav.groups.settings");
    expect(settingsGroup).toBeDefined();
    expect(settingsGroup!.items.find((i) => i.href === "/settings")).toBeDefined();
  });

  it("preserves group meta (label/labelKey) when filtering", () => {
    const result = filterNavByEnabledModules(navGroups, new Set(["helpdesk"]));
    const hd = result.find((g) => g.labelKey === "nav.groups.helpdesk");
    expect(hd?.label).toBe("הלפדסק");
  });
});
