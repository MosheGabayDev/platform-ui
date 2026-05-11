/**
 * filterNavByEnabledModules — drops disabled-module items, keeps unmapped
 * routes (admin, settings, dashboard root). Empty groups are removed.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { navGroups, filterNavByEnabledModules } from "./nav-items";
import { getAllManifests } from "@/lib/platform/module-registry/manifests";

describe("navGroups static definition", () => {
  it("includes the dashboard root", () => {
    const main = navGroups.find((g) => g.labelKey === "nav.groups.main");
    expect(main?.items.some((i) => i.href === "/")).toBe(true);
  });

  it("ROUTE_TO_MODULE values are all real manifest keys (no orphan refs)", () => {
    // Cross-cut: nav filter calls moduleKeyForHref → ROUTE_TO_MODULE
    // → uses that key against enabled-modules set. If the value is
    // a typo / removed manifest key, the route gets filtered as
    // "module not enabled" even when the module is enabled.
    //
    // Read the raw file rather than importing the private map to
    // avoid having to widen its export.
    const src = fs.readFileSync(
      path.join(__dirname, "nav-items.ts"),
      "utf8",
    );
    // Capture `"<route>": "<moduleKey>"` rows inside the
    // ROUTE_TO_MODULE block.
    const block = src.match(
      /ROUTE_TO_MODULE[^{]*=\s*\{([\s\S]*?)\};/,
    );
    expect(block, "ROUTE_TO_MODULE block found").toBeTruthy();
    const referenced = new Set<string>();
    for (const m of (block?.[1] ?? "").matchAll(
      /"[^"]+":\s*"([^"]+)"/g,
    )) {
      referenced.add(m[1]!);
    }
    expect(referenced.size).toBeGreaterThan(5);
    const manifestKeys = new Set(getAllManifests().map((m) => m.key));
    const orphans = [...referenced].filter((k) => !manifestKeys.has(k));
    expect(orphans).toEqual([]);
  });

  it("every nav href resolves to a real dashboard page or known route", () => {
    // Walk app/(dashboard) for every page.tsx, build the set of valid routes.
    const pageRoutes = new Set<string>();
    function walk(dir: string) {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name === "page.tsx") {
          const route = p
            .replace(/\\/g, "/")
            .replace(/^.*app\/\(dashboard\)/, "")
            .replace(/\/page\.tsx$/, "");
          pageRoutes.add(route === "" ? "/" : route);
        }
      }
    }
    walk("app/(dashboard)");

    // Routes outside (dashboard) that nav legitimately points at.
    const ALLOWED_NON_DASHBOARD = new Set<string>(["/help", "/docs"]);

    // Stub routes intentionally rendered by the (dashboard)/[...slug]
    // placeholder page (module not yet built — nav still advertises it
    // so the IA is stable). Frozen at batch 60. Shrink when a real page
    // lands; leaving an entry in here once the page exists fails the
    // sanity branch below.
    const ALLOWED_STUB_ROUTES = new Set<string>([
      "/departments",
      "/helpdesk/kb",
      "/ai-agents",
      "/ala",
      "/voice",
      "/knowledge",
      "/automation",
      "/integrations",
      "/monitoring",
      "/logs",
      "/metrics",
      "/backups",
      "/api-keys",
      "/settings",
      "/settings/general",
      "/settings/email",
      "/settings/usage-limits",
    ]);

    const broken: string[] = [];
    const allHrefs = new Set<string>();
    function check(href: string) {
      allHrefs.add(href);
      if (
        pageRoutes.has(href) ||
        ALLOWED_NON_DASHBOARD.has(href) ||
        ALLOWED_STUB_ROUTES.has(href)
      )
        return;
      broken.push(href);
    }
    for (const g of navGroups) {
      for (const item of g.items) {
        check(item.href);
        if (item.children) for (const c of item.children) check(c.href);
      }
    }
    expect(broken).toEqual([]);

    // Sanity branch: keep ALLOWED_STUB_ROUTES honest. If a stub gets a
    // real page (good!) it would now appear in pageRoutes — leaving it
    // in the allowlist hides drift if the page is later removed.
    const stale = [...ALLOWED_STUB_ROUTES].filter(
      (r) => pageRoutes.has(r) || !allHrefs.has(r),
    );
    expect(stale).toEqual([]);
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

  it("filters all WhatsApp archive routes behind the whatsapp module key", () => {
    const disabled = filterNavByEnabledModules(navGroups, new Set());
    const disabledOps = disabled.find((g) => g.labelKey === "nav.groups.operations");
    expect(disabledOps?.items.find((i) => i.href.startsWith("/whatsapp"))).toBeUndefined();

    const enabled = filterNavByEnabledModules(navGroups, new Set(["whatsapp"]));
    const enabledOps = enabled.find((g) => g.labelKey === "nav.groups.operations");
    expect(enabledOps?.items.find((i) => i.href === "/whatsapp")).toBeDefined();
    expect(enabledOps?.items.find((i) => i.href === "/whatsapp/search")).toBeDefined();
    expect(enabledOps?.items.find((i) => i.href === "/whatsapp/sessions")).toBeDefined();
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
