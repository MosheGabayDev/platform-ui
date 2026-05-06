/**
 * @module lib/platform/ai-actions/audit-emitter
 * AI audit emission helper (Phase 2.4).
 *
 * Wraps `recordAuditEntry` with shortcuts for the three AI-touchpoints
 * defined in cap 27 §12 + cap (skill registry) §11 + executor registry:
 *
 *   1. emitExecutorRun()   — every executor invocation (success or error)
 *   2. emitPolicyEvaluation() — every policy evaluate call (allow + deny + approval)
 *   3. emitSkillValidation()  — every validateSkillInvocation call
 *
 * All emissions write category=ai entries. Backend (R046) re-derives
 * actor_id from the session; client-supplied actor is a hint only.
 *
 * Errors during audit emission MUST be swallowed — never let an audit
 * write failure abort the action it was auditing. Backend has a fallback
 * queue; frontend logs the error and moves on.
 */
import { recordAuditEntry } from "@/lib/api/audit";
import type { PolicyDecision } from "@/lib/modules/policies/types";

interface ExecutorRunInput {
  action_id: string;
  params: Record<string, unknown>;
  outcome: "success" | "error";
  message?: string;
  error?: string;
  /** Optional resource hint — e.g. ticket_id for helpdesk actions. */
  resource_type?: string;
  resource_id?: string | number;
}

export async function emitExecutorRun(input: ExecutorRunInput): Promise<void> {
  try {
    await recordAuditEntry({
      action: input.action_id,
      category: "ai",
      resource_type: input.resource_type ?? null,
      resource_id:
        input.resource_id !== undefined ? String(input.resource_id) : null,
      metadata: {
        kind: "executor_run",
        outcome: input.outcome,
        params: input.params,
        ...(input.message ? { message: input.message } : {}),
        ...(input.error ? { error: input.error } : {}),
      },
    });
  } catch {
    // Audit failure must not break the executor flow.
  }
}

interface PolicyEvaluationInput {
  action_id: string;
  params: Record<string, unknown>;
  decision: PolicyDecision;
}

export async function emitPolicyEvaluation(input: PolicyEvaluationInput): Promise<void> {
  try {
    await recordAuditEntry({
      action: "policy.evaluate",
      category: "ai",
      resource_type: "policy_decision",
      resource_id: input.decision.decision_id,
      metadata: {
        kind: "policy_evaluation",
        evaluated_action_id: input.action_id,
        // Round-2 review HIGH #2: record KEYS only — full params can hold
        // user-supplied content (ticket descriptions, search queries) and
        // the audit log is admin-readable. Mirrors the PII-safe pattern
        // in emitSkillValidation.
        param_keys: Object.keys(input.params),
        allowed: input.decision.allowed,
        requires_approval: input.decision.requires_approval,
        matched_rules: input.decision.matched_rules.map((r) => ({
          policy_id: r.policy_id,
          rule_id: r.rule_id,
          effect: r.effect,
        })),
        // Reasons are short admin-readable; safe to record.
        reasons: input.decision.reasons,
      },
    });
  } catch {
    // swallow
  }
}

interface SkillValidationInput {
  skill_id: string;
  params: Record<string, unknown>;
  valid: boolean;
  skill_available: boolean;
  /** When invalid, the error count from validateSkillInvocation. */
  error_count?: number;
}

export async function emitSkillValidation(input: SkillValidationInput): Promise<void> {
  try {
    await recordAuditEntry({
      action: "ai_skill.validate",
      category: "ai",
      resource_type: "ai_skill",
      resource_id: input.skill_id,
      metadata: {
        kind: "skill_validation",
        valid: input.valid,
        skill_available: input.skill_available,
        error_count: input.error_count ?? 0,
        // Don't record full params — they may contain user content / PII.
        // Just record the keys so admins can see the shape attempted.
        param_keys: Object.keys(input.params),
      },
    });
  } catch {
    // swallow
  }
}
