/**
 * @module lib/api/ai-skills
 * PlatformAISkillRegistry client (Phase 2.2).
 *
 * Spec: docs/system-upgrade/04-capabilities/platform-ai-skill-registry-spec.md
 *
 * Mock mode: aggregates manifests from `lib/platform/ai-skills/registry`,
 * combines with per-org enablement (mutable in-memory), validates parameter
 * schemas against the JSON-Schema subset, and consults the policy engine
 * for the validate path.
 */
import { getAllSkills, getSkill } from "@/lib/platform/ai-skills/registry";
import { evaluatePolicy } from "@/lib/api/policies";
import { fetchModules } from "@/lib/api/module-registry";
import { emitSkillValidation } from "@/lib/platform/ai-actions/audit-emitter";
import type {
  AISkill,
  SkillEntry,
  SkillEnablement,
  SkillsListResponse,
  SetSkillEnablementInput,
  SkillEnablementResponse,
  ValidateSkillInput,
  ValidateSkillResponse,
  ValidationError,
  ParameterDef,
  SkillParameterSchema,
} from "@/lib/modules/ai-skills/types";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/proxy";
export const MOCK_MODE = true;

// Per-org override store. Keyed by `${org_id}:${skill_id}`.
const MOCK_ENABLEMENT = new Map<
  string,
  { enabled: boolean; set_by_user_id: number; set_at: string }
>();

const DEFAULT_ORG_ID = 1;

function enablementKey(org_id: number, skill_id: string) {
  return `${org_id}:${skill_id}`;
}

function resolveEnablement(skill: AISkill, org_id: number): SkillEnablement {
  const override = MOCK_ENABLEMENT.get(enablementKey(org_id, skill.id));
  if (override) {
    return {
      skill_id: skill.id,
      org_id,
      enabled: override.enabled,
      set_by_user_id: override.set_by_user_id,
      set_at: override.set_at,
      source: "org_override",
    };
  }
  return {
    skill_id: skill.id,
    org_id,
    enabled: skill.default_enabled,
    set_by_user_id: null,
    set_at: null,
    source: "default",
  };
}

interface ListFilter {
  module?: string;
  ai_callable?: boolean;
  enabled_for_org?: boolean;
}

// ---------------------------------------------------------------------------
// Parameter validation (JSON-Schema subset)
// ---------------------------------------------------------------------------

function validateOne(value: unknown, def: ParameterDef, path: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (def.type === "integer") {
    if (typeof value !== "number" || !Number.isInteger(value)) {
      errors.push({ path, message: "must be integer" });
    } else {
      if (def.minimum !== undefined && value < def.minimum)
        errors.push({ path, message: `must be ≥ ${def.minimum}` });
      if (def.maximum !== undefined && value > def.maximum)
        errors.push({ path, message: `must be ≤ ${def.maximum}` });
    }
  } else if (def.type === "number") {
    if (typeof value !== "number") errors.push({ path, message: "must be number" });
    else {
      if (def.minimum !== undefined && value < def.minimum)
        errors.push({ path, message: `must be ≥ ${def.minimum}` });
      if (def.maximum !== undefined && value > def.maximum)
        errors.push({ path, message: `must be ≤ ${def.maximum}` });
    }
  } else if (def.type === "string") {
    if (typeof value !== "string") errors.push({ path, message: "must be string" });
    else {
      if (def.enum && !def.enum.includes(value))
        errors.push({ path, message: `must be one of ${def.enum.join(", ")}` });
      if (def.pattern && !new RegExp(def.pattern).test(value))
        errors.push({ path, message: `must match pattern ${def.pattern}` });
    }
  } else if (def.type === "boolean") {
    if (typeof value !== "boolean") errors.push({ path, message: "must be boolean" });
  }
  return errors;
}

function validateParams(
  schema: SkillParameterSchema,
  params: Record<string, unknown>,
): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const required of schema.required) {
    if (params[required] === undefined) {
      errors.push({ path: required, message: "required" });
    }
  }
  for (const [key, def] of Object.entries(schema.properties)) {
    if (params[key] === undefined) continue;
    errors.push(...validateOne(params[key], def, key));
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function fetchAISkills(filter: ListFilter = {}): Promise<SkillsListResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 80));
    const moduleEntries = (await fetchModules()).data.modules;
    const enabledModuleKeys = new Set(
      moduleEntries.filter((m) => m.enablement.enabled && m.status === "healthy").map((m) => m.key),
    );

    let skills = getAllSkills();
    if (filter.module) skills = skills.filter((s) => s.module_key === filter.module);
    if (filter.ai_callable !== undefined)
      skills = skills.filter((s) => s.ai_callable === filter.ai_callable);

    const entries: SkillEntry[] = skills.map((skill) => {
      const enablement = resolveEnablement(skill, DEFAULT_ORG_ID);
      const moduleEnabled = enabledModuleKeys.has(skill.module_key);
      const available_to_ai = moduleEnabled && enablement.enabled && skill.ai_callable;
      return { skill, enablement, available_to_ai };
    });

    const filteredByOrg = filter.enabled_for_org
      ? entries.filter((e) => e.enablement.enabled)
      : entries;

    const moduleCounts: Record<string, number> = {};
    for (const e of filteredByOrg) {
      moduleCounts[e.skill.module_key] = (moduleCounts[e.skill.module_key] ?? 0) + 1;
    }

    return {
      success: true,
      data: {
        skills: filteredByOrg,
        total: filteredByOrg.length,
        module_counts: moduleCounts,
      },
    };
  }

  const qs = new URLSearchParams();
  if (filter.module) qs.set("module", filter.module);
  if (filter.ai_callable !== undefined) qs.set("ai_callable", String(filter.ai_callable));
  if (filter.enabled_for_org) qs.set("enabled_for_org", "true");
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await fetch(`${BASE}/ai-skills${suffix}`, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function setSkillEnablement(
  input: SetSkillEnablementInput,
): Promise<SkillEnablementResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 100));
    const skill = getSkill(input.skill_id);
    if (!skill) throw new Error(`404: skill '${input.skill_id}' not in registry`);
    MOCK_ENABLEMENT.set(enablementKey(DEFAULT_ORG_ID, input.skill_id), {
      enabled: input.enabled,
      set_by_user_id: 1,
      set_at: new Date().toISOString(),
    });
    const enablement = resolveEnablement(skill, DEFAULT_ORG_ID);
    const moduleEntries = (await fetchModules()).data.modules;
    const moduleEnabled = moduleEntries.some(
      (m) => m.key === skill.module_key && m.enablement.enabled && m.status === "healthy",
    );
    return {
      success: true,
      message: `(mock) Skill '${input.skill_id}' ${input.enabled ? "enabled" : "disabled"}`,
      data: {
        entry: {
          skill,
          enablement,
          available_to_ai: moduleEnabled && enablement.enabled && skill.ai_callable,
        },
      },
    };
  }
  const res = await fetch(
    `${BASE}/ai-skills/${encodeURIComponent(input.skill_id)}/enablement`,
    {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: input.enabled, reason: input.reason }),
    },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function validateSkillInvocation(
  input: ValidateSkillInput,
): Promise<ValidateSkillResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 60));
    const skill = getSkill(input.skill_id);
    if (!skill) {
      void emitSkillValidation({
        skill_id: input.skill_id,
        params: input.params,
        valid: false,
        skill_available: false,
        error_count: 1,
      });
      return {
        success: true,
        data: {
          valid: false,
          errors: [{ path: "", message: `skill '${input.skill_id}' not in registry` }],
          skill_available: false,
          policy_decision: null,
        },
      };
    }
    // Parameter validation
    const errors = validateParams(skill.parameter_schema, input.params);
    // Skill availability
    const moduleEntries = (await fetchModules()).data.modules;
    const moduleEntry = moduleEntries.find((m) => m.key === skill.module_key);
    const moduleEnabled = moduleEntry?.enablement.enabled === true && moduleEntry.status === "healthy";
    const enablement = resolveEnablement(skill, DEFAULT_ORG_ID);
    const skill_available = moduleEnabled && enablement.enabled && skill.ai_callable;

    // Policy decision (only when params valid + skill available)
    let policy_decision = null;
    if (errors.length === 0 && skill_available) {
      const policyRes = await evaluatePolicy({
        action_id: skill.policy_action_id,
        params: input.params,
      });
      policy_decision = policyRes.data.decision;
    }

    // Phase 2.4: emit AI audit entry per skill spec §11.
    void emitSkillValidation({
      skill_id: input.skill_id,
      params: input.params,
      valid: errors.length === 0,
      skill_available,
      error_count: errors.length,
    });

    return {
      success: true,
      data: {
        valid: errors.length === 0,
        errors,
        skill_available,
        policy_decision,
      },
    };
  }
  const res = await fetch(
    `${BASE}/ai-skills/${encodeURIComponent(input.skill_id)}/validate`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ params: input.params }),
    },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
