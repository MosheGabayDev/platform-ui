/**
 * @module lib/modules/users/skills
 * Users module skill manifests (cap PlatformAISkillRegistry, Phase 2.2).
 */
import type { AISkill } from "@/lib/modules/ai-skills/types";

export const usersSkills: AISkill[] = [
  {
    id: "users.search",
    module_key: "users",
    label: "Search users",
    label_he: "חיפוש משתמשים",
    description: "Find users by email, username, or role.",
    category: "read",
    risk_level: "low",
    parameter_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search term" },
      },
      required: ["query"],
    },
    required_permissions: ["users.view"],
    policy_action_id: "users.search",
    ai_callable: true,
    default_enabled: true,
    estimated_cost_class: "cheap",
    introduced_in: "0.46.0",
    deprecated: false,
  },
  {
    id: "users.deactivate",
    module_key: "users",
    label: "Deactivate user",
    label_he: "השבת משתמש",
    description:
      "Deactivate a user account. Sessions are terminated and login is blocked. Reversible by reactivation.",
    category: "destroy",
    risk_level: "high",
    parameter_schema: {
      type: "object",
      properties: {
        userId: { type: "integer", minimum: 1 },
        reason: { type: "string" },
      },
      required: ["userId"],
    },
    required_permissions: ["users.edit"],
    policy_action_id: "users.deactivate",
    ai_callable: true,
    default_enabled: false,
    estimated_cost_class: "free",
    introduced_in: "0.46.0",
    deprecated: false,
  },
  {
    id: "users.reset_password",
    module_key: "users",
    label: "Send password reset",
    label_he: "שלח איפוס סיסמה",
    description: "Email a password-reset link to a user.",
    category: "external",
    risk_level: "medium",
    parameter_schema: {
      type: "object",
      properties: {
        userId: { type: "integer", minimum: 1 },
      },
      required: ["userId"],
    },
    required_permissions: ["users.edit"],
    policy_action_id: "users.reset_password",
    ai_callable: true,
    default_enabled: true,
    estimated_cost_class: "cheap",
    introduced_in: "0.46.0",
    deprecated: false,
  },
];
