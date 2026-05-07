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
});
