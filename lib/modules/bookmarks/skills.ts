/**
 * @module lib/modules/bookmarks/skills
 * AI skill manifest for the Bookmarks (lite) vertical.
 *
 * Spec: docs/system-upgrade/PRODUCT_LAUNCH_PLAN.md §1 task 5B.16.
 *
 * Single skill (`bookmarks.create`) — matches the lite contract's
 * one-mutation surface.
 */
import type { AISkill } from "@/lib/modules/ai-skills/types";

export const bookmarksSkills: AISkill[] = [
  {
    id: "bookmarks.create",
    module_key: "bookmarks",
    label: "Add bookmark",
    label_he: "הוסף סימנייה",
    description:
      "Add a shared bookmark with a title and an http(s):// URL. Backend re-validates the URL.",
    category: "mutate",
    risk_level: "low",
    parameter_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Bookmark title (1–200 chars)" },
        url: {
          type: "string",
          pattern: "^https?://",
          description: "Full URL — must start with http:// or https://",
        },
      },
      required: ["title", "url"],
    },
    required_permissions: ["bookmarks.create"],
    policy_action_id: "bookmarks.create",
    ai_callable: true,
    default_enabled: true,
    estimated_cost_class: "cheap",
    introduced_in: "0.50.0",
    deprecated: false,
  },
];
