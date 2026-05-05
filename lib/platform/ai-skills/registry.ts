/**
 * @module lib/platform/ai-skills/registry
 * Central skill registry — aggregates per-module skill manifests.
 *
 * Mirrors the pattern of `lib/platform/module-registry/manifests.ts`.
 * Each module exports a `skills: AISkill[]` and the registry aggregates them.
 *
 * Backend imports this same shape via the `ai_skill_definitions` table seed.
 */
import type { AISkill } from "@/lib/modules/ai-skills/types";
import { helpdeskSkills } from "@/lib/modules/helpdesk/skills";
import { usersSkills } from "@/lib/modules/users/skills";

const ALL_SKILLS: AISkill[] = [...helpdeskSkills, ...usersSkills];

export function getAllSkills(): AISkill[] {
  return ALL_SKILLS;
}

export function getSkill(id: string): AISkill | undefined {
  return ALL_SKILLS.find((s) => s.id === id);
}

export function getSkillsByModule(moduleKey: string): AISkill[] {
  return ALL_SKILLS.filter((s) => s.module_key === moduleKey);
}
