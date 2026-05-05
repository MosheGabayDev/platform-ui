/**
 * @module lib/modules/policies/types
 * Types for PlatformPolicy Engine (cap 27).
 *
 * Spec: docs/system-upgrade/04-capabilities/platform-policy-engine-spec.md
 */

export type PolicyEffect = "allow" | "deny" | "require_approval";

export type PolicyCategory =
  | "ai_safety"
  | "compliance"
  | "operational"
  | "experimental";

export interface SubjectSelector {
  roles?: string[];
  user_id?: number;
  is_admin?: boolean;
  is_system_admin?: boolean;
  org_id?: number;
}

export interface PolicyRule {
  id: string;
  description: string;
  resource_pattern: string;
  action_pattern: string;
  subject: SubjectSelector | null;
  condition: string | null;
  active_from: string | null;
  active_until: string | null;
  effect: PolicyEffect;
  priority: number;
  enabled: boolean;
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  category: PolicyCategory;
  org_id: number | null;
  rules: PolicyRule[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
  created_by_user_id: number | null;
  updated_by_user_id: number | null;
}

export interface PolicyEvaluationContextSession {
  user_id: number;
  org_id: number;
  role: string;
  roles: string[];
  is_admin: boolean;
  is_system_admin: boolean;
  permissions: string[];
}

export interface PolicyEvaluationContext {
  action_id: string;
  params: Record<string, unknown>;
  session: PolicyEvaluationContextSession;
  resource: Record<string, unknown> | null;
  evaluated_at: string;
}

export interface PolicyRuleMatch {
  policy_id: string;
  rule_id: string;
  effect: PolicyEffect;
  description: string;
}

export interface PolicyDecision {
  allowed: boolean;
  requires_approval: boolean;
  matched_rules: PolicyRuleMatch[];
  reasons: string[];
  decision_id: string;
}

export interface PolicyListResponse {
  success: boolean;
  data: { policies: Policy[]; total: number };
}

export interface PolicyResponse {
  success: boolean;
  data: { policy: Policy };
}

export interface EvaluateInput {
  action_id: string;
  params?: Record<string, unknown>;
  resource?: Record<string, unknown> | null;
}

export interface EvaluateResponse {
  success: boolean;
  data: { decision: PolicyDecision };
}
