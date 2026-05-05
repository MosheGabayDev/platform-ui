/**
 * @module lib/modules/ai-skills/types
 * Types for PlatformAISkillRegistry (Phase 2.2).
 *
 * Spec: docs/system-upgrade/04-capabilities/platform-ai-skill-registry-spec.md
 */
import type { PolicyDecision } from "@/lib/modules/policies/types";

export type SkillCategory =
  | "read"
  | "mutate"
  | "destroy"
  | "external"
  | "compute";

export type SkillRiskLevel = "low" | "medium" | "high" | "critical";

export type SkillCostClass = "free" | "cheap" | "moderate" | "expensive";

export interface ParameterDef {
  type: "string" | "number" | "boolean" | "integer";
  description?: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  pattern?: string;
}

export interface SkillParameterSchema {
  type: "object";
  properties: Record<string, ParameterDef>;
  required: string[];
}

export interface AISkill {
  id: string;
  module_key: string;
  label: string;
  label_he?: string;
  description: string;
  category: SkillCategory;
  risk_level: SkillRiskLevel;
  parameter_schema: SkillParameterSchema;
  required_permissions: string[];
  policy_action_id: string;
  ai_callable: boolean;
  default_enabled: boolean;
  estimated_cost_class: SkillCostClass;
  introduced_in: string;
  deprecated: boolean;
}

export interface SkillEnablement {
  skill_id: string;
  org_id: number;
  enabled: boolean;
  set_by_user_id: number | null;
  set_at: string | null;
  source: "default" | "org_override";
}

export interface SkillEntry {
  skill: AISkill;
  enablement: SkillEnablement;
  /** Computed: module enabled AND skill enabled AND ai_callable. */
  available_to_ai: boolean;
}

export interface SkillsListResponse {
  success: boolean;
  data: {
    skills: SkillEntry[];
    total: number;
    module_counts: Record<string, number>;
  };
}

export interface SetSkillEnablementInput {
  skill_id: string;
  enabled: boolean;
  reason?: string;
}

export interface SkillEnablementResponse {
  success: boolean;
  message: string;
  data: { entry: SkillEntry };
}

export interface ValidationError {
  path: string;
  message: string;
}

export interface ValidateSkillInput {
  skill_id: string;
  params: Record<string, unknown>;
}

export interface ValidateSkillResponse {
  success: boolean;
  data: {
    valid: boolean;
    errors: ValidationError[];
    skill_available: boolean;
    policy_decision: PolicyDecision | null;
  };
}
