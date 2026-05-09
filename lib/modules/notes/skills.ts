/**
 * @module lib/modules/notes/skills
 * AI skill manifest for the Notes vertical.
 *
 * Spec: docs/system-upgrade/PRODUCT_LAUNCH_PLAN.md §1 task 5B.15.
 *
 * Single skill (`notes.create`) — keeps the surface tight for the
 * vertical-2 contract. Edit + delete skills are deferred until the
 * page-level features land.
 *
 * Tags are intentionally omitted from the parameter_schema — the strict
 * ParameterDef type doesn't model arrays today. When the schema gains
 * array support (cap PlatformAISkillRegistry follow-up), add a `tags`
 * param. For now an AI caller passes `title + body` only.
 */
import type { AISkill } from "@/lib/modules/ai-skills/types";

export const notesSkills: AISkill[] = [
  {
    id: "notes.create",
    module_key: "notes",
    label: "Create note",
    label_he: "צור פתק",
    description: "Create a personal note with title + body.",
    category: "mutate",
    risk_level: "low",
    parameter_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Note title (1–200 chars)" },
        body: { type: "string", description: "Note body (1–10 000 chars)" },
      },
      required: ["title", "body"],
    },
    required_permissions: ["notes.create"],
    policy_action_id: "notes.create",
    ai_callable: true,
    default_enabled: true,
    estimated_cost_class: "cheap",
    introduced_in: "0.50.0",
    deprecated: false,
  },
];
