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
import { getAllSkills } from "@/lib/platform/ai-skills/registry";
import { STATIC_FLAG_DEFAULTS } from "@/lib/api/feature-flags";
import { navGroups as NAV_GROUPS } from "@/components/shell/nav-items";

// Temporary escape hatch for parallel module work. Keep empty in normal use.
const NAV_HREF_EXEMPT = new Set<string>();

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

  it("manifest.ai_actions matches the skill registry per-module (both directions)", () => {
    // Cross-cut: the manifest is the public contract ("this module
    // exposes these AI actions"). The skill registry is what the AI
    // shell actually calls. Drift either way is a bug:
    //   - manifest declares an action but no skill exists → AI says
    //     it can do it, request fails at runtime.
    //   - skill exists but manifest doesn't list it → action is
    //     reachable but admin UIs that introspect manifests miss it.
    //
    // Caught batch 74: users manifest declared 0 ai_actions while
    // users/skills.ts shipped 3 (search/deactivate/reset_password).
    const skillsByModule = new Map<string, string[]>();
    for (const skill of getAllSkills()) {
      const arr = skillsByModule.get(skill.module_key) ?? [];
      arr.push(skill.id);
      skillsByModule.set(skill.module_key, arr);
    }
    const drift: string[] = [];
    for (const m of getAllManifests()) {
      const declared = new Set(m.ai_actions);
      const registered = new Set(skillsByModule.get(m.key) ?? []);
      for (const id of declared) {
        if (!registered.has(id)) {
          drift.push(`${m.key}: declared "${id}" but no skill registered`);
        }
      }
      for (const id of registered) {
        if (!declared.has(id)) {
          drift.push(`${m.key}: skill "${id}" registered but not in manifest`);
        }
      }
    }
    expect(drift).toEqual([]);
  });

  it("every search result type is declared by at least one manifest", async () => {
    // Cross-cut: PlatformSearch (cap 11) returns results carrying a
    // `type` discriminator. UIs (command palette, /search) render an
    // icon + module label per type. If the search backend returns a
    // type no manifest claims to surface, the palette falls back to a
    // generic icon and loses the per-module routing — a silent UX
    // regression.
    //
    // Walk every result the mock client can produce and check that at
    // least one manifest's `search_types` declares it.
    const { searchGlobal } = await import("@/lib/api/search");
    const allTypes = new Set<string>();
    // Use broad queries + a high limit so the mock returns every
    // fixture type across its categories.
    for (const q of ["a", "e", "i", "o", "u", "r"]) {
      const res = await searchGlobal({ q, limit: 25 });
      for (const r of res.data.results) allTypes.add(r.type);
    }
    expect(allTypes.size).toBeGreaterThan(0);

    const declared = new Set<string>();
    for (const m of getAllManifests()) {
      for (const t of m.search_types) declared.add(t);
    }
    const orphans = [...allTypes].filter((t) => !declared.has(t));
    expect(orphans).toEqual([]);
  });

  it("every manifest.required_flags entry is a known FlagKey", () => {
    // Cross-cut: manifest `required_flags` is typed `string[]` (open
    // enum so it could one day source from backend), but every value
    // MUST resolve through the FlagKey union — otherwise the module
    // is permanently locked: the feature-flag resolver returns false
    // for unknown keys, blocking the module from ever loading. Silent
    // failure mode.
    const known = new Set(Object.keys(STATIC_FLAG_DEFAULTS));
    const orphans: string[] = [];
    for (const m of getAllManifests()) {
      for (const flag of m.required_flags) {
        if (!known.has(flag)) orphans.push(`${m.key} → ${flag}`);
      }
    }
    expect(orphans).toEqual([]);
  });

  it("every action executor maps to a registered ai-callable skill", async () => {
    // Cross-cut: the executor registry in lib/platform/ai-actions/executors.ts
    // is the run-side of the AI action pipeline. Every registered
    // executor MUST correspond to an `ai_callable` skill — otherwise
    // there's no UI path that can trigger it (dead code on the
    // executor side) and it never gets audit-wired through the AI
    // shell's confirmation flow.
    //
    // The reverse direction (skill without executor) is INTENTIONALLY
    // not failed — the AI shell handles missing executors gracefully
    // (toast + fail), and several skills are recognized by the mock
    // LLM grammar before their executor lands. That gap is tracked
    // in the executor file's roadmap, not here.
    const { _registeredActions } = await import(
      "@/lib/platform/ai-actions/executors"
    );
    const aiCallable = new Set(
      getAllSkills().filter((s) => s.ai_callable).map((s) => s.id),
    );
    const orphans = _registeredActions().filter((a) => !aiCallable.has(a));
    expect(orphans).toEqual([]);
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
