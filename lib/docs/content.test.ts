/**
 * Catalog invariants for the help surface (Phase 3.3).
 */
import { describe, it, expect } from "vitest";
import { DOCS_CATALOG, searchCatalog } from "@/lib/docs/content";
import { getAllManifests } from "@/lib/platform/module-registry/manifests";
import { getAllSkills } from "@/lib/platform/ai-skills/registry";

describe("DOCS_CATALOG invariants", () => {
  it("article ids are unique", () => {
    const ids = DOCS_CATALOG.articles.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every registered module has at least one quick-start article", () => {
    const moduleKeys = getAllManifests().map((m) => m.key);
    const quickStartModules = new Set(
      DOCS_CATALOG.articles
        .filter((a) => a.category === "quick-start")
        .map((a) => a.module_key)
        .filter(Boolean) as string[],
    );
    for (const key of moduleKeys) {
      expect(quickStartModules.has(key)).toBe(true);
    }
  });

  it("every aiShortcut.action_id matches a registered skill", () => {
    const skillIds = new Set(getAllSkills().map((s) => s.id));
    for (const sc of DOCS_CATALOG.aiShortcuts) {
      expect(skillIds.has(sc.action_id)).toBe(true);
    }
  });

  it("each category has at least one article", () => {
    const counts = new Map<string, number>();
    for (const a of DOCS_CATALOG.articles) {
      counts.set(a.category, (counts.get(a.category) ?? 0) + 1);
    }
    expect(counts.get("quick-start")).toBeGreaterThan(0);
    expect(counts.get("platform")).toBeGreaterThan(0);
  });

  it("aiShortcuts and keyboardShortcuts are non-empty", () => {
    expect(DOCS_CATALOG.aiShortcuts.length).toBeGreaterThan(0);
    expect(DOCS_CATALOG.keyboardShortcuts.length).toBeGreaterThan(0);
  });

  it("aiShortcut capability_level is one of the four allowed values", () => {
    const allowed = new Set(["READ", "WRITE_LOW", "WRITE_HIGH", "DESTRUCTIVE"]);
    for (const sc of DOCS_CATALOG.aiShortcuts) {
      expect(allowed.has(sc.capability_level)).toBe(true);
    }
  });
});

describe("searchCatalog", () => {
  it("returns the full catalog on empty query", () => {
    const res = searchCatalog("");
    expect(res.articles.length).toBe(DOCS_CATALOG.articles.length);
    expect(res.aiShortcuts.length).toBe(DOCS_CATALOG.aiShortcuts.length);
    expect(res.keyboardShortcuts.length).toBe(DOCS_CATALOG.keyboardShortcuts.length);
  });

  it("filters articles by case-insensitive title substring", () => {
    const res = searchCatalog("HELPDESK");
    expect(res.articles.some((a) => a.id === "quick-start-helpdesk")).toBe(true);
    // Unrelated article should be filtered out.
    expect(res.articles.some((a) => a.id === "quick-start-billing")).toBe(false);
  });

  it("filters articles by tag", () => {
    const res = searchCatalog("rag");
    expect(res.articles.some((a) => a.id === "quick-start-knowledge")).toBe(true);
  });

  it("filters AI shortcuts by phrase", () => {
    const res = searchCatalog("take ticket");
    expect(res.aiShortcuts.some((s) => s.action_id === "helpdesk.ticket.take")).toBe(true);
  });

  it("filters keyboard shortcuts by label or key", () => {
    const res = searchCatalog("palette");
    expect(res.keyboardShortcuts.some((k) => k.label.toLowerCase().includes("palette"))).toBe(true);
  });

  it("returns empty results for nonsense query", () => {
    const res = searchCatalog("zzzz-nonsense-zzzz");
    expect(res.articles.length).toBe(0);
    expect(res.aiShortcuts.length).toBe(0);
    expect(res.keyboardShortcuts.length).toBe(0);
  });
});
