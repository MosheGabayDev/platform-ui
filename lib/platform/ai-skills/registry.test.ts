import { describe, it, expect } from "vitest";
import { getAllSkills, getSkill, getSkillsByModule } from "./registry";

describe("ai-skills registry", () => {
  it("getAllSkills returns non-empty array", () => {
    const all = getAllSkills();
    expect(Array.isArray(all)).toBe(true);
    expect(all.length).toBeGreaterThan(0);
  });

  it("each skill has id and module_key", () => {
    for (const s of getAllSkills()) {
      expect(typeof s.id).toBe("string");
      expect(typeof s.module_key).toBe("string");
    }
  });

  it("getSkill finds by id", () => {
    const all = getAllSkills();
    const first = all[0]!;
    expect(getSkill(first.id)).toEqual(first);
  });

  it("getSkill returns undefined for unknown id", () => {
    expect(getSkill("does-not-exist")).toBeUndefined();
  });

  it("getSkillsByModule filters by module_key", () => {
    const all = getAllSkills();
    const moduleKey = all[0]!.module_key;
    const filtered = getSkillsByModule(moduleKey);
    expect(filtered.length).toBeGreaterThan(0);
    for (const s of filtered) expect(s.module_key).toBe(moduleKey);
  });

  it("getSkillsByModule returns [] for unknown module", () => {
    expect(getSkillsByModule("nonexistent-module")).toEqual([]);
  });

  it("notes.create is registered for the Notes vertical", () => {
    const skill = getSkill("notes.create");
    expect(skill).toBeDefined();
    expect(skill!.module_key).toBe("notes");
    expect(skill!.ai_callable).toBe(true);
    expect(skill!.parameter_schema.required).toEqual(["title", "body"]);
  });

  it("bookmarks.create is registered for the Bookmarks vertical", () => {
    const skill = getSkill("bookmarks.create");
    expect(skill).toBeDefined();
    expect(skill!.module_key).toBe("bookmarks");
    expect(skill!.ai_callable).toBe(true);
    expect(skill!.parameter_schema.required).toEqual(["title", "url"]);
  });

  it("manifest ai_actions reference live skill ids (notes + bookmarks)", () => {
    expect(getSkill("notes.create")).toBeDefined();
    expect(getSkill("bookmarks.create")).toBeDefined();
  });

  it("every ai_callable skill has a non-empty label_he (batch 150)", () => {
    // ActionPreviewCard (batch 148) substitutes skill.label_he when
    // locale=he. A callable skill missing label_he falls back to the
    // English mock-LLM label — silently degrading the Hebrew UX.
    // Type-level `label_he?:` makes this optional; runtime contract
    // for callable skills requires it.
    const offenders = getAllSkills()
      .filter((s) => s.ai_callable)
      .filter((s) => !s.label_he?.trim())
      .map((s) => s.id);
    expect(offenders).toEqual([]);
  });
});
