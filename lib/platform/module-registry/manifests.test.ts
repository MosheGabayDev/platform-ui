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
import fs from "node:fs";
import path from "node:path";
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

  it("every skill.policy_action_id equals its skill.id (consistency)", () => {
    // Cross-cut: a skill's `policy_action_id` is what the policy
    // engine receives when validating the action. If it diverges
    // from `skill.id`, policy rules written against the skill id
    // won't match, and operators get a confusing "policy says allow
    // but action ID differs" debugging session.
    //
    // Convention: they MUST be identical. Same string, one source.
    // (If a future skill genuinely needs to evaluate against a
    // different policy-action key, document the exception here and
    // narrow the assertion — but no current skill does.)
    const drift: string[] = [];
    for (const skill of getAllSkills()) {
      if (skill.policy_action_id !== skill.id) {
        drift.push(`${skill.id} → policy_action_id="${skill.policy_action_id}"`);
      }
    }
    expect(drift).toEqual([]);
  });

  it("every skill.required_permissions entry is in the RBAC catalog", async () => {
    // Cross-cut: required_permissions are what the validate-skill
    // pipeline checks before AI can call. A permission that isn't
    // in the RBAC catalog (lib/api/roles.ts MOCK_PERMISSIONS) can
    // never be granted to a role → the skill is permanently
    // un-callable for any user. Silent failure — UI shows
    // "permission denied" with no hint that the permission itself
    // is the typo.
    const { fetchAllPermissions } = await import("@/lib/api/roles");
    const res = await fetchAllPermissions();
    const known = new Set(res.data.permissions.map((p) => p.name));
    const orphans: string[] = [];
    for (const skill of getAllSkills()) {
      for (const perm of skill.required_permissions) {
        if (!known.has(perm)) {
          orphans.push(`${skill.id} → "${perm}"`);
        }
      }
    }
    expect(orphans).toEqual([]);
  });

  it("every RBAC catalog permission is referenced by some manifest or skill", async () => {
    // Reverse direction of the roles.test.ts invariant (which checks
    // every manifest perm is in the catalog). This one fails if a
    // permission exists in `MOCK_PERMISSIONS` but no manifest declares
    // it and no skill requires it.
    //
    // Orphan permissions are admin-grantable but never checked at
    // runtime — UI rows that intend to gate on them remain visible
    // to everyone, and operators waste time toggling a permission
    // that does nothing.
    //
    // Caught batch 79: `helpdesk.approve` was orphaned (catalog only)
    // → added to helpdesk manifest permissions.
    const { fetchAllPermissions } = await import("@/lib/api/roles");
    const res = await fetchAllPermissions();

    // Aggregate all permissions referenced by any manifest OR any skill.
    const referenced = new Set<string>();
    for (const m of getAllManifests()) for (const p of m.permissions) referenced.add(p);
    for (const skill of getAllSkills())
      for (const p of skill.required_permissions) referenced.add(p);

    const orphans = res.data.permissions
      .map((p) => p.name)
      .filter((name) => !referenced.has(name));
    expect(orphans).toEqual([]);
  });

    it("every manifest.required_plans entry is a known PlanTier", () => {
    // Cross-cut: manifest `required_plans` is typed `string[]` (open
    // enum), but every value MUST be a known `PlanTier`. Unknown plan
    // gates the module behind a tier no tenant can be on → permanently
    // locked with no signal. Mirrors batch 76's required_flags invariant.
    const KNOWN: ReadonlySet<string> = new Set(["free", "pro", "enterprise"]);
    const orphans: string[] = [];
    for (const m of getAllManifests()) {
      for (const plan of m.required_plans) {
        if (!KNOWN.has(plan)) orphans.push(`${m.key} → ${plan}`);
      }
    }
    expect(orphans).toEqual([]);
  });

  it("every manifest icon (top-level + nav_entries[]) is a real lucide-react export", async () => {
    // Cross-cut: icon strings on the manifest (`m.icon`) and on
    // `nav_entries[].icon` are intended to be resolved to lucide-react
    // components by future synthesized chrome. A typo today fails
    // silently — no icon renders OR a default fallback hides the bug.
    // Validate now against the actual lucide-react module exports.
    //
    // Catches: "HeadphoneIcon" vs "HeadphonesIcon" / "Trash" vs "Trash2".
    const lucide = await import("lucide-react");
    const exported = new Set(Object.keys(lucide));
    const orphans: string[] = [];
    for (const m of getAllManifests()) {
      if (!exported.has(m.icon)) orphans.push(`${m.key} → ${m.icon}`);
      for (const e of m.nav_entries) {
        if (!exported.has(e.icon)) {
          orphans.push(`${m.key} nav "${e.label}" → ${e.icon}`);
        }
      }
    }
    expect(orphans).toEqual([]);
  });

  it("stable module default_landing must resolve to a real (dashboard) page", () => {
    // Cross-cut: a `status: stable` manifest is the contract that the
    // module is fully shipped. If `default_landing` resolves only via
    // the catch-all `[...slug]` stub, clicking "Open module" lands the
    // user on a placeholder — broken expectation. beta/experimental
    // modules are explicitly allowed to land on stubs.
    //
    // Caught batch 82: monitoring was status:"stable" with
    // default_landing:"/monitoring" but no page existed → demoted to
    // beta.
    const pageRoutes = new Set<string>();
    function walk(dir: string) {
      if (!fs.existsSync(dir)) return;
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (e.name.startsWith("[...")) continue; // skip catch-all
          walk(p);
        } else if (e.name === "page.tsx") {
          const route = p
            .replace(/\\/g, "/")
            .replace(/^.*app\/\(dashboard\)/, "")
            .replace(/\/page\.tsx$/, "")
            .replace(/\/\[[^\]]+\]/g, ""); // strip [id] segments
          pageRoutes.add(route === "" ? "/" : route);
        }
      }
    }
    walk("app/(dashboard)");
    const broken: string[] = [];
    for (const m of getAllManifests()) {
      if (m.status !== "stable") continue;
      // default_landing might point at /<base>/<sub> — accept exact match.
      if (!pageRoutes.has(m.default_landing)) {
        broken.push(`${m.key} (stable) → ${m.default_landing}`);
      }
    }
    expect(broken).toEqual([]);
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
