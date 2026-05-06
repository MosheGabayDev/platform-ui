/**
 * @module lib/api/feature-flags
 * Typed API contract for the PlatformFeatureFlags capability (cap 17).
 *
 * Spec: docs/system-upgrade/04-capabilities/platform-feature-flags-spec.md
 * Backend: R045 FeatureFlagService (not yet implemented).
 *
 * Resolution hierarchy (first match wins):
 *   user override → org override → plan default → system default → STATIC false
 *
 * MOCK MODE is currently true. Flips to false once R045-min Feature Flag
 * Service backend lands per the spec's flip checklist (§7).
 *
 * Even in non-mock mode, `useFeatureFlag` catches errors and returns
 * fail-closed defaults — so an unreachable backend never opens a flag.
 */

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/proxy";

/** All known capability flag keys. Extend here as capabilities are added. */
export type FlagKey =
  | "data_sources.enabled"
  | "ai_agents.enabled"
  | "global_assistant.enabled"
  | "voice_agent.enabled"
  | "integrations.enabled"
  | "settings.capabilities.enabled"
  | "helpdesk.enabled"
  | "ai_providers.enabled"
  | "knowledge.enabled"
  | "policy_engine.enabled"
  | "wizard.enabled";

export type FlagSource = "user" | "org" | "plan" | "system" | "default";

export interface ResolutionChainEntry {
  source: FlagSource;
  value: boolean | null;
  matched: boolean;
  /** Set on org / user matches — for audit display in admin UI. */
  set_by_user_id?: number | null;
  set_at?: string | null;
  /** Set on plan matches. */
  plan_id?: string | null;
}

/** Shape of the response from GET /api/proxy/feature-flags/<key>. */
export interface FlagResponse {
  key: string;
  enabled: boolean;
  source: FlagSource;
  /** Optional — only returned when `?include=chain` is passed. */
  resolution_chain?: ResolutionChainEntry[];
}

export interface FlagDefinition {
  key: FlagKey;
  label: string;
  description: string;
  category: "ai" | "modules" | "integrations" | "platform" | "experimental";
  system_default: boolean;
  introduced_in_version: string;
  deprecated: boolean;
}

export interface FlagDefinitionsResponse {
  success: boolean;
  data: { definitions: FlagDefinition[]; total: number };
}

export interface SetOverrideInput {
  key: FlagKey;
  scope: "org" | "user";
  scope_id: number;
  /** null clears the override. */
  value: boolean | null;
  reason?: string;
}

export interface SetOverrideResponse {
  success: boolean;
  message: string;
  data: { flag: FlagResponse };
}

/**
 * Static defaults used when the backend is unavailable.
 * All false — fail-closed. These are not overrideable at call sites;
 * they exist only so the hook returns a typed default instead of undefined.
 */
export const STATIC_FLAG_DEFAULTS: Record<FlagKey, false> = {
  "data_sources.enabled": false,
  "ai_agents.enabled": false,
  "global_assistant.enabled": false,
  "voice_agent.enabled": false,
  "integrations.enabled": false,
  "settings.capabilities.enabled": false,
  "helpdesk.enabled": false,
  "ai_providers.enabled": false,
  "knowledge.enabled": false,
  "policy_engine.enabled": false,
  "wizard.enabled": false,
};

export const MOCK_MODE = true;

// Track A: localStorage-backed persistence for mock state.
import {
  loadMockState,
  saveMockState,
  clearMockState,
} from "@/lib/api/_mock-storage";
const STORAGE_KEY = "mock:feature-flags:org-overrides";
const STORAGE_VERSION = 1;

// ---------------------------------------------------------------------------
// Mock state
// ---------------------------------------------------------------------------

const MOCK_DEFINITIONS: FlagDefinition[] = [
  {
    key: "helpdesk.enabled",
    label: "Helpdesk",
    description: "Enables the Helpdesk module (tickets, technicians, SLA, approvals, maintenance, batch tasks).",
    category: "modules",
    system_default: false,
    introduced_in_version: "0.42.0",
    deprecated: false,
  },
  {
    key: "ai_agents.enabled",
    label: "AI Agents",
    description: "Enables the AI Agents module — autonomous investigations, scheduled runs.",
    category: "ai",
    system_default: false,
    introduced_in_version: "0.45.0",
    deprecated: false,
  },
  {
    key: "global_assistant.enabled",
    label: "Global AI Assistant",
    description: "Floating AI shell available on every page. Currently in private beta.",
    category: "ai",
    system_default: false,
    introduced_in_version: "0.44.0",
    deprecated: false,
  },
  {
    key: "ai_providers.enabled",
    label: "AI Providers Hub",
    description: "Per-org LLM provider configuration (OpenAI, Anthropic, Bedrock, local).",
    category: "ai",
    system_default: false,
    introduced_in_version: "0.46.0",
    deprecated: false,
  },
  {
    key: "voice_agent.enabled",
    label: "Voice Agent",
    description: "Phone-based AI agent for inbound support calls.",
    category: "modules",
    system_default: false,
    introduced_in_version: "0.50.0",
    deprecated: false,
  },
  {
    key: "knowledge.enabled",
    label: "Knowledge / RAG",
    description: "Knowledge base with vector retrieval for AI grounding.",
    category: "modules",
    system_default: false,
    introduced_in_version: "0.47.0",
    deprecated: false,
  },
  {
    key: "data_sources.enabled",
    label: "Data Sources",
    description: "Generic data-source connectors (databases, files, APIs).",
    category: "integrations",
    system_default: false,
    introduced_in_version: "0.43.0",
    deprecated: false,
  },
  {
    key: "integrations.enabled",
    label: "Integrations Hub",
    description: "Third-party app integrations (Slack, GitHub, Jira, etc).",
    category: "integrations",
    system_default: false,
    introduced_in_version: "0.43.0",
    deprecated: false,
  },
  {
    key: "settings.capabilities.enabled",
    label: "Settings Engine",
    description: "Per-org configuration surface for AI behavior, branding, rate limits.",
    category: "platform",
    system_default: false,
    introduced_in_version: "0.45.0",
    deprecated: false,
  },
  {
    key: "policy_engine.enabled",
    label: "Policy Engine",
    description: "Guardrails for AI actions — allow/deny rules with conditions.",
    category: "platform",
    system_default: false,
    introduced_in_version: "0.46.0",
    deprecated: false,
  },
  {
    key: "wizard.enabled",
    label: "Onboarding Wizard",
    description: "Self-service tenant onboarding flow.",
    category: "platform",
    system_default: false,
    introduced_in_version: "0.48.0",
    deprecated: false,
  },
];

/** Mock per-org state. Mutated by setFeatureFlagOverride in mock mode. */
const FIXTURE_OVERRIDES: Array<[FlagKey, boolean]> = [
  ["helpdesk.enabled", true],
  ["global_assistant.enabled", true],
];

const MOCK_ORG_OVERRIDES: Map<FlagKey, boolean> = new Map(
  loadMockState<Array<[FlagKey, boolean]>>(STORAGE_KEY, STORAGE_VERSION, FIXTURE_OVERRIDES),
);

function persistOverrides(): void {
  saveMockState(STORAGE_KEY, STORAGE_VERSION, Array.from(MOCK_ORG_OVERRIDES.entries()));
}

/** Test helper — restores fixtures + clears localStorage. */
export function _resetFeatureFlagsMockState(): void {
  MOCK_ORG_OVERRIDES.clear();
  for (const [k, v] of FIXTURE_OVERRIDES) MOCK_ORG_OVERRIDES.set(k, v);
  clearMockState("mock:feature-flags:");
}

/** Mock plan defaults — pretend the current org is on "pro". */
const MOCK_PLAN_FEATURES: Record<FlagKey, boolean | undefined> = {
  "data_sources.enabled": false,
  "ai_agents.enabled": undefined,
  "global_assistant.enabled": undefined,
  "voice_agent.enabled": false,
  "integrations.enabled": undefined,
  "settings.capabilities.enabled": true,
  "helpdesk.enabled": undefined,
  "ai_providers.enabled": false,
  "knowledge.enabled": false,
  "policy_engine.enabled": false,
  "wizard.enabled": true,
};

function resolveMockFlag(key: FlagKey): {
  enabled: boolean;
  source: FlagSource;
  chain: ResolutionChainEntry[];
} {
  const def = MOCK_DEFINITIONS.find((d) => d.key === key);
  const systemDefault = def?.system_default ?? false;
  const planValue = MOCK_PLAN_FEATURES[key];
  const orgValue = MOCK_ORG_OVERRIDES.get(key);

  const chain: ResolutionChainEntry[] = [
    { source: "system", value: systemDefault, matched: false },
    {
      source: "plan",
      value: planValue ?? null,
      matched: false,
      plan_id: "pro",
    },
    {
      source: "org",
      value: orgValue ?? null,
      matched: false,
      set_by_user_id: orgValue !== undefined ? 1 : null,
      set_at: orgValue !== undefined ? new Date().toISOString() : null,
    },
    { source: "user", value: null, matched: false },
  ];

  // Resolve in reverse priority — user → org → plan → system.
  if (orgValue !== undefined) {
    chain[2].matched = true;
    return { enabled: orgValue, source: "org", chain };
  }
  if (planValue !== undefined) {
    chain[1].matched = true;
    return { enabled: planValue, source: "plan", chain };
  }
  chain[0].matched = true;
  return { enabled: systemDefault, source: "system", chain };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function fetchFeatureFlag(
  key: FlagKey,
  options: { includeChain?: boolean } = {},
): Promise<FlagResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 50));
    const { enabled, source, chain } = resolveMockFlag(key);
    return {
      key,
      enabled,
      source,
      ...(options.includeChain ? { resolution_chain: chain } : {}),
    };
  }
  const qs = new URLSearchParams();
  if (options.includeChain) qs.set("include", "chain");
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await fetch(
    `${BASE}/feature-flags/${encodeURIComponent(key)}${suffix}`,
    { credentials: "include" },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  // Backend returns { success, data: { ... } } — unwrap.
  return (json.data ?? json) as FlagResponse;
}

export async function fetchFeatureFlagDefinitions(): Promise<FlagDefinitionsResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 80));
    return {
      success: true,
      data: { definitions: MOCK_DEFINITIONS, total: MOCK_DEFINITIONS.length },
    };
  }
  const res = await fetch(`${BASE}/feature-flags/definitions`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function setFeatureFlagOverride(
  input: SetOverrideInput,
): Promise<SetOverrideResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 150));
    if (input.scope !== "org") {
      // User-scope writes are out-of-scope for the initial admin UI; backend
      // will support them later (Q-FF-2).
      throw new Error("user-scope overrides not supported in mock mode");
    }
    if (input.value === null) {
      MOCK_ORG_OVERRIDES.delete(input.key);
    } else {
      MOCK_ORG_OVERRIDES.set(input.key, input.value);
    }
    persistOverrides();
    const { enabled, source } = resolveMockFlag(input.key);
    return {
      success: true,
      message:
        input.value === null
          ? `(mock) Cleared org override for ${input.key}.`
          : `(mock) Set ${input.key} = ${input.value} for org #${input.scope_id}.`,
      data: { flag: { key: input.key, enabled, source } },
    };
  }
  const res = await fetch(
    `${BASE}/feature-flags/${encodeURIComponent(input.key)}/override`,
    {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scope: input.scope,
        scope_id: input.scope_id,
        value: input.value,
        reason: input.reason,
      }),
    },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
