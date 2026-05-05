/**
 * @module lib/modules/helpdesk/skills
 * Helpdesk module skill manifests (cap PlatformAISkillRegistry, Phase 2.2).
 *
 * Each entry MUST match an executor in lib/platform/ai-actions/executors.ts
 * by `id`. The skill manifest is the declarative input; the executor is the
 * runtime side. When backend ships, the registry becomes the canonical
 * source — executors MUST refuse unknown action IDs.
 */
import type { AISkill } from "@/lib/modules/ai-skills/types";

export const helpdeskSkills: AISkill[] = [
  {
    id: "helpdesk.ticket.take",
    module_key: "helpdesk",
    label: "Take ticket",
    label_he: "קח כרטיס",
    description:
      "Assign a helpdesk ticket to the current user. Used by the AI shell to act on a single unassigned ticket.",
    category: "mutate",
    risk_level: "low",
    parameter_schema: {
      type: "object",
      properties: {
        ticketId: { type: "integer", description: "Ticket ID to take", minimum: 1 },
      },
      required: ["ticketId"],
    },
    required_permissions: ["helpdesk.assign"],
    policy_action_id: "helpdesk.ticket.take",
    ai_callable: true,
    default_enabled: true,
    estimated_cost_class: "free",
    introduced_in: "0.42.0",
    deprecated: false,
  },
  {
    id: "helpdesk.ticket.resolve",
    module_key: "helpdesk",
    label: "Resolve ticket",
    label_he: "פתור כרטיס",
    description:
      "Mark a helpdesk ticket as resolved with a resolution summary. Triggers SLA recompute and notification.",
    category: "mutate",
    risk_level: "medium",
    parameter_schema: {
      type: "object",
      properties: {
        ticketId: { type: "integer", minimum: 1 },
        resolution: { type: "string", description: "Resolution summary" },
      },
      required: ["ticketId"],
    },
    required_permissions: ["helpdesk.resolve"],
    policy_action_id: "helpdesk.ticket.resolve",
    ai_callable: true,
    default_enabled: true,
    estimated_cost_class: "free",
    introduced_in: "0.42.0",
    deprecated: false,
  },
  {
    id: "helpdesk.maintenance.cancel",
    module_key: "helpdesk",
    label: "Cancel maintenance window",
    label_he: "בטל חלון תחזוקה",
    description:
      "Cancel a scheduled or in-progress maintenance window. High impact when affected services are critical.",
    category: "destroy",
    risk_level: "high",
    parameter_schema: {
      type: "object",
      properties: {
        windowId: { type: "integer", minimum: 1 },
        reason: { type: "string" },
      },
      required: ["windowId"],
    },
    required_permissions: ["helpdesk.maintenance.manage"],
    policy_action_id: "helpdesk.maintenance.cancel",
    ai_callable: true,
    default_enabled: true,
    estimated_cost_class: "free",
    introduced_in: "0.45.0",
    deprecated: false,
  },
  {
    id: "helpdesk.batch.cancel",
    module_key: "helpdesk",
    label: "Cancel batch task",
    label_he: "בטל משימת אצווה",
    description:
      "Cancel a queued or running batch task. Processed items remain; in-flight items halt at the next checkpoint.",
    category: "destroy",
    risk_level: "medium",
    parameter_schema: {
      type: "object",
      properties: {
        taskId: { type: "integer", minimum: 1 },
        reason: { type: "string" },
      },
      required: ["taskId"],
    },
    required_permissions: ["helpdesk.batch.manage"],
    policy_action_id: "helpdesk.batch.cancel",
    ai_callable: true,
    default_enabled: true,
    estimated_cost_class: "free",
    introduced_in: "0.45.0",
    deprecated: false,
  },
];
