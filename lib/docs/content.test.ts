/**
 * Catalog invariants for the help surface (Phase 3.3, Track E).
 */
import { describe, it, expect } from "vitest";
import { DOCS_CATALOG, searchCatalog } from "@/lib/docs/content";
import { getAllManifests } from "@/lib/platform/module-registry/manifests";
import { getAllSkills } from "@/lib/platform/ai-skills/registry";
import heMessages from "@/i18n/messages/he.json";
import enMessages from "@/i18n/messages/en.json";

function getByKey(messages: Record<string, unknown>, key: string): string | undefined {
  const parts = key.split(".");
  let cur: unknown = messages;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return typeof cur === "string" ? cur : undefined;
}

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

  it("every article.module_key resolves to a real manifest key (reverse)", () => {
    // Batch 86 — reverse direction of "every module has an article".
    // An article tagged with a typo'd / removed manifest key would
    // show up in /help with no per-module routing — clicking through
    // could land on a stub.
    const manifestKeys = new Set(getAllManifests().map((m) => m.key));
    const orphans: string[] = [];
    for (const a of DOCS_CATALOG.articles) {
      if (a.module_key && !manifestKeys.has(a.module_key)) {
        orphans.push(`${a.id} → ${a.module_key}`);
      }
    }
    expect(orphans).toEqual([]);
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
    // 2026-05-07 §7 task 10.08 — KB scaffolding categories.
    expect(counts.get("troubleshooting")).toBeGreaterThanOrEqual(3);
    expect(counts.get("best-practices")).toBeGreaterThanOrEqual(3);
    expect(counts.get("faq")).toBeGreaterThanOrEqual(3);
  });

  it("KB scaffolding articles all have body keys (full content, not just summary)", () => {
    for (const a of DOCS_CATALOG.articles) {
      if (a.category === "troubleshooting" || a.category === "best-practices" || a.category === "faq") {
        expect(a.bodyKey, `article ${a.id} missing bodyKey`).toBeTruthy();
      }
    }
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

  it("aiShortcut capability_level matches the mock LLM's actual emission (batch 149)", async () => {
    // Drift caught: the help page advertised "take ticket" as
    // WRITE_HIGH and "cancel batch" as DESTRUCTIVE, but the mock LLM
    // (lib/api/ai.ts) emits WRITE_LOW and WRITE_HIGH respectively.
    // Users would see one risk badge in the help dialog and a
    // different one on the action preview card — eroding trust.
    // Lock the help shortcut's `capability_level` to whatever
    // sendChatMessage actually produces for the matching phrase.
    const { sendChatMessage } = await import("@/lib/api/ai");
    const phraseFor: Record<string, string> = {
      "helpdesk.ticket.take": "take ticket 1001",
      "helpdesk.ticket.resolve": "resolve ticket 1002",
      "helpdesk.maintenance.cancel": "cancel maintenance 1003",
      "helpdesk.batch.cancel": "cancel batch 1004",
      "users.search": "search users for alice",
      "users.deactivate": "deactivate user 7",
      "users.reset_password": "reset password for user 9",
      "notes.create": "create note T | B",
      "bookmarks.create": "add bookmark T https://example.com/x",
      "whatsapp.session.link": "link whatsapp",
      "whatsapp.session.relink": "relink whatsapp 3",
      "whatsapp.session.unlink": "unlink whatsapp session 4",
    };
    const mismatches: string[] = [];
    for (const sc of DOCS_CATALOG.aiShortcuts) {
      const phrase = phraseFor[sc.action_id];
      if (!phrase) continue;
      const res = await sendChatMessage({ message: phrase, context: null });
      const actual = res.actionProposal?.capabilityLevel;
      if (actual && actual !== sc.capability_level) {
        mismatches.push(
          `${sc.action_id}: help=${sc.capability_level}, mock LLM=${actual}`,
        );
      }
    }
    expect(mismatches).toEqual([]);
  }, 15_000);
});

describe("DOCS_CATALOG translation coverage", () => {
  // Track E: every key referenced by the catalog MUST resolve in BOTH
  // locales we ship today. Adding a new locale later means adding the
  // strings; this test catches the gap immediately.
  const allKeys: string[] = [];
  for (const a of DOCS_CATALOG.articles) {
    allKeys.push(a.titleKey, a.summaryKey);
    if (a.bodyKey) allKeys.push(a.bodyKey);
    for (const k of a.stepKeys ?? []) allKeys.push(k);
  }
  for (const s of DOCS_CATALOG.aiShortcuts) allKeys.push(s.descriptionKey);
  for (const k of DOCS_CATALOG.keyboardShortcuts) allKeys.push(k.labelKey);

  it("every catalog key resolves in he.json", () => {
    for (const k of allKeys) {
      expect(getByKey(heMessages, k), `missing he: ${k}`).toBeTruthy();
    }
  });

  it("every catalog key resolves in en.json", () => {
    for (const k of allKeys) {
      expect(getByKey(enMessages, k), `missing en: ${k}`).toBeTruthy();
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

  it("filters articles by case-insensitive title-key substring", () => {
    const res = searchCatalog("HELPDESK");
    expect(res.articles.some((a) => a.id === "quick-start-helpdesk")).toBe(true);
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

  it("Notes + Bookmarks AI shortcuts are registered (cross-vertical AI surface)", () => {
    const ids = new Set(DOCS_CATALOG.aiShortcuts.map((s) => s.action_id));
    expect(ids.has("notes.create")).toBe(true);
    expect(ids.has("bookmarks.create")).toBe(true);
  });

  it("filters keyboard shortcuts by labelKey or key", () => {
    const res = searchCatalog("openCommandPalette");
    expect(res.keyboardShortcuts.length).toBeGreaterThan(0);
  });

  it("returns empty results for nonsense query", () => {
    const res = searchCatalog("zzzz-nonsense-zzzz");
    expect(res.articles.length).toBe(0);
    expect(res.aiShortcuts.length).toBe(0);
    expect(res.keyboardShortcuts.length).toBe(0);
  });
});
