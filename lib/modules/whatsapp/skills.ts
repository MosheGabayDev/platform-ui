/**
 * @module lib/modules/whatsapp/skills
 * AI skill manifests for the WhatsApp self-service module.
 *
 * Spec: docs/system-upgrade/PRODUCT_LAUNCH_PLAN.md (whatsapp parity).
 *
 * All three skills are zero-arg from the user's POV — the owner is
 * derived from session.user.id; sessionId for relink/unlink is the
 * caller's currently active session, validated server-side.
 */
import type { AISkill } from "@/lib/modules/ai-skills/types";

export const whatsappSkills: AISkill[] = [
  {
    id: "whatsapp.session.link",
    module_key: "whatsapp",
    label: "Link WhatsApp",
    label_he: "חבר WhatsApp",
    description: "Start a personal WhatsApp QR linking flow.",
    category: "mutate",
    risk_level: "low",
    parameter_schema: {
      type: "object",
      properties: {},
      required: [],
    },
    required_permissions: ["whatsapp.session.manage"],
    policy_action_id: "whatsapp.session.link",
    ai_callable: true,
    default_enabled: false,
    estimated_cost_class: "free",
    introduced_in: "0.50.0",
    deprecated: false,
  },
  {
    id: "whatsapp.session.relink",
    module_key: "whatsapp",
    label: "Re-link WhatsApp",
    label_he: "חבר מחדש",
    description: "Generate a fresh QR for an existing WhatsApp session.",
    category: "mutate",
    risk_level: "low",
    parameter_schema: {
      type: "object",
      properties: {
        sessionId: { type: "integer", minimum: 1, description: "Owned session id" },
      },
      required: ["sessionId"],
    },
    required_permissions: ["whatsapp.session.manage"],
    policy_action_id: "whatsapp.session.relink",
    ai_callable: true,
    default_enabled: false,
    estimated_cost_class: "free",
    introduced_in: "0.50.0",
    deprecated: false,
  },
  // Batch 168 — AI outbound send. Admin-only by default; admins can
  // grant `whatsapp.message.send` per-user via the roles UI. Policy
  // engine forces require_approval on every chat-driven proposal so
  // the user sees the recipient + body before anything goes out.
  {
    id: "whatsapp.message.send",
    module_key: "whatsapp",
    label: "Send WhatsApp message",
    label_he: "שלח הודעת WhatsApp",
    description:
      "Send a text message to one of your owned WhatsApp chats. Admin-only by default; can be granted per-user.",
    category: "external",
    risk_level: "high",
    parameter_schema: {
      type: "object",
      properties: {
        chat_id: {
          type: "integer",
          minimum: 1,
          description: "Resolved chat id (BE or AI typeahead).",
        },
        body: {
          type: "string",
          minimum: 1,
          maximum: 4096,
          description: "Message text (1–4096 chars).",
        },
      },
      required: ["chat_id", "body"],
    },
    required_permissions: ["whatsapp.message.send"],
    policy_action_id: "whatsapp.message.send",
    ai_callable: true,
    default_enabled: false,
    estimated_cost_class: "cheap",
    introduced_in: "0.61.0",
    deprecated: false,
  },
  {
    id: "whatsapp.session.unlink",
    module_key: "whatsapp",
    label: "Unlink WhatsApp",
    label_he: "נתק WhatsApp",
    description:
      "Unlink a WhatsApp session. Archived data is retained; only the live link is severed.",
    category: "destroy",
    risk_level: "medium",
    parameter_schema: {
      type: "object",
      properties: {
        sessionId: { type: "integer", minimum: 1, description: "Owned session id" },
      },
      required: ["sessionId"],
    },
    required_permissions: ["whatsapp.session.manage"],
    policy_action_id: "whatsapp.session.unlink",
    ai_callable: true,
    default_enabled: false,
    estimated_cost_class: "free",
    introduced_in: "0.50.0",
    deprecated: false,
  },
];
