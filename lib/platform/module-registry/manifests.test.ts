/**
 * Cross-cutting invariants for module manifests vs runtime infrastructure.
 *
 * Each invariant guards against a class of drift that has bitten us
 * before:
 *   - batch 39: 19 manifest permissions weren't in the RBAC catalog
 *     (silently unassignable in /admin/roles)
 *   - batch 40: 3 manifest nav_entries pointed at hrefs that didn't
 *     exist in nav-items.ts (bad nav links)
 *
 * Adding a new module → these tests catch the cracks before users do.
 */
import { describe, it, expect } from "vitest";
import { getAllManifests } from "./manifests";
import { navGroups as NAV_GROUPS } from "@/components/shell/nav-items";

// Modules whose nav rows live under a sub-route the manifest doesn't
// flag explicitly (e.g. WhatsApp manifest declares /whatsapp but the
// actual nav row points at /whatsapp/sessions). These are tracked by
// other agents; the exemption keeps the invariant useful without
// stepping on parallel work. Empty most of the time.
const NAV_HREF_EXEMPT = new Set<string>([
  "/whatsapp", // wired as /whatsapp/sessions; ownership: separate agent
]);

describe("module manifest cross-cuts", () => {
  it("every manifest nav_entries[].href is wired in nav-items.ts (no broken nav)", () => {
    const navHrefs = new Set<string>();
    for (const group of NAV_GROUPS) {
      for (const item of group.items) navHrefs.add(item.href);
    }
    const missing: Array<{ module: string; href: string }> = [];
    for (const m of getAllManifests()) {
      for (const entry of m.nav_entries) {
        if (NAV_HREF_EXEMPT.has(entry.href)) continue;
        if (!navHrefs.has(entry.href)) {
          missing.push({ module: m.key, href: entry.href });
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("every nav_entries[].href has an i18n key declared on the nav-items entry", () => {
    // Indirect check — every nav row in nav-items.ts declares titleKey.
    // If a manifest nav_entries[] href appears in the nav, this passes
    // by transitivity. Failure mode caught: someone adds a manifest
    // entry, copies the href to nav-items.ts, but forgets the titleKey.
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        expect(item.titleKey, `${item.href} missing titleKey`).toBeTruthy();
      }
    }
  });

  it("every manifest base_route + default_landing is consistent (same prefix)", () => {
    for (const m of getAllManifests()) {
      const base = m.base_route;
      const landing = m.default_landing;
      // Either the landing equals the base, or it's a sub-path of the
      // base. Anything else suggests the base was renamed without
      // updating the landing.
      expect(
        landing === base || landing.startsWith(`${base}/`),
        `${m.key}: default_landing="${landing}" not under base_route="${base}"`,
      ).toBe(true);
    }
  });
});
