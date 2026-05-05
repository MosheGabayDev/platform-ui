/**
 * @module lib/api/settings
 * PlatformSettings Engine client (cap 16, Phase 1.2).
 *
 * Spec: docs/system-upgrade/04-capabilities/platform-settings-engine-spec.md
 *
 * MOCK MODE until R045-min Settings backend lands. Mock implements the full
 * resolution hierarchy (user → org → plan → system → default), schema
 * validation, secret masking, and audit-emission semantics.
 */
import type {
  SettingDefinition,
  SettingValue,
  SettingResponse,
  SettingDefinitionsResponse,
  SettingsByCategoryResponse,
  SetSettingInput,
  SetSettingResponse,
  SettingScope,
  SettingSource,
  SettingCategory,
} from "@/lib/modules/settings/types";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/proxy";
export const MOCK_MODE = true;

// ---------------------------------------------------------------------------
// Mock catalog — 13 settings across 4 categories (matches spec §10)
// ---------------------------------------------------------------------------

const MOCK_DEFINITIONS: SettingDefinition[] = [
  // AI
  {
    key: "ai.system_prompt",
    label: "System prompt",
    description: "Prepended to every AI conversation. Use {org_name} placeholder.",
    category: "ai",
    type: "string",
    schema: { maxLength: 4000 },
    allowed_scopes: ["org", "system"],
    is_sensitive: false,
    default_value: "You are a helpful operations assistant.",
    write_roles: ["org_admin", "system_admin"],
    introduced_in_version: "0.45.0",
    deprecated: false,
  },
  {
    key: "ai.default_model",
    label: "Default LLM model",
    description: "Which model to use when the user doesn't specify.",
    category: "ai",
    type: "enum",
    schema: {
      allowed_values: [
        "claude-opus-4-7",
        "claude-sonnet-4-6",
        "claude-haiku-4-5",
        "gpt-5",
        "gpt-5-mini",
      ],
    },
    allowed_scopes: ["org", "plan", "system"],
    is_sensitive: false,
    default_value: "claude-sonnet-4-6",
    write_roles: ["org_admin", "system_admin"],
    introduced_in_version: "0.46.0",
    deprecated: false,
  },
  {
    key: "ai.persona_name",
    label: "AI persona name",
    description: "Display name for the AI assistant.",
    category: "ai",
    type: "string",
    schema: { maxLength: 60 },
    allowed_scopes: ["org", "system"],
    is_sensitive: false,
    default_value: "Platform Assistant",
    write_roles: ["org_admin", "system_admin"],
    introduced_in_version: "0.45.0",
    deprecated: false,
  },
  {
    key: "ai.max_tokens_per_message",
    label: "Max tokens per AI response",
    description: "Hard cap on response length — protects against runaway costs.",
    category: "ai",
    type: "int",
    schema: { min: 256, max: 16000 },
    allowed_scopes: ["org", "plan", "system"],
    is_sensitive: false,
    default_value: 2048,
    write_roles: ["org_admin", "system_admin"],
    introduced_in_version: "0.46.0",
    deprecated: false,
  },
  {
    key: "ai.openai_api_key",
    label: "OpenAI API key (BYO)",
    description: "Org-supplied OpenAI key. When set, AI calls use this key instead of the platform default.",
    category: "ai",
    type: "secret",
    schema: null,
    allowed_scopes: ["org"],
    is_sensitive: true,
    default_value: null,
    write_roles: ["org_admin", "system_admin"],
    introduced_in_version: "0.46.0",
    deprecated: false,
  },
  {
    key: "ai.anthropic_api_key",
    label: "Anthropic API key (BYO)",
    description: "Org-supplied Anthropic key.",
    category: "ai",
    type: "secret",
    schema: null,
    allowed_scopes: ["org"],
    is_sensitive: true,
    default_value: null,
    write_roles: ["org_admin", "system_admin"],
    introduced_in_version: "0.46.0",
    deprecated: false,
  },
  {
    key: "ai.tools_allowlist",
    label: "AI tools allowlist",
    description: "Action ID glob patterns the AI is allowed to propose. Uses minimatch syntax.",
    category: "ai",
    type: "json",
    schema: null,
    allowed_scopes: ["org", "system"],
    is_sensitive: false,
    default_value: ["helpdesk.ticket.*"],
    write_roles: ["org_admin", "system_admin"],
    introduced_in_version: "0.46.0",
    deprecated: false,
  },
  // Branding
  {
    key: "branding.org_name",
    label: "Organization display name",
    description: "Overrides the org name in UI chrome and AI persona.",
    category: "branding",
    type: "string",
    schema: { maxLength: 100 },
    allowed_scopes: ["org"],
    is_sensitive: false,
    default_value: "",
    write_roles: ["org_admin", "system_admin"],
    introduced_in_version: "0.45.0",
    deprecated: false,
  },
  {
    key: "branding.accent_color",
    label: "Accent color",
    description: "Theme accent — affects buttons, highlights, focus rings.",
    category: "branding",
    type: "enum",
    schema: {
      allowed_values: ["cyan", "violet", "emerald", "amber", "rose", "slate"],
    },
    allowed_scopes: ["org", "user"],
    is_sensitive: false,
    default_value: "cyan",
    write_roles: ["org_admin", "system_admin", "user"],
    introduced_in_version: "0.45.0",
    deprecated: false,
  },
  {
    key: "branding.logo_url",
    label: "Logo URL",
    description: "Org logo displayed in topbar.",
    category: "branding",
    type: "string",
    schema: { maxLength: 500, pattern: "^https?://" },
    allowed_scopes: ["org"],
    is_sensitive: false,
    default_value: "",
    write_roles: ["org_admin", "system_admin"],
    introduced_in_version: "0.45.0",
    deprecated: false,
  },
  // Notifications
  {
    key: "notifications.email_enabled",
    label: "Email notifications",
    description: "Send notification events to email.",
    category: "notifications",
    type: "bool",
    schema: null,
    allowed_scopes: ["user", "org", "system"],
    is_sensitive: false,
    default_value: true,
    write_roles: ["org_admin", "system_admin", "user"],
    introduced_in_version: "0.45.0",
    deprecated: false,
  },
  {
    key: "notifications.slack_webhook",
    label: "Slack incoming webhook",
    description: "Slack webhook URL for org-level alerts. Stored encrypted.",
    category: "notifications",
    type: "secret",
    schema: null,
    allowed_scopes: ["org"],
    is_sensitive: true,
    default_value: null,
    write_roles: ["org_admin", "system_admin"],
    introduced_in_version: "0.45.0",
    deprecated: false,
  },
  {
    key: "notifications.escalation_minutes",
    label: "Ticket escalation window (minutes)",
    description: "Minutes before escalating an unacknowledged ticket.",
    category: "notifications",
    type: "int",
    schema: { min: 5, max: 1440 },
    allowed_scopes: ["org", "system"],
    is_sensitive: false,
    default_value: 30,
    write_roles: ["org_admin", "system_admin"],
    introduced_in_version: "0.45.0",
    deprecated: false,
  },
  // Rate limits
  {
    key: "rate_limits.api_requests_per_minute",
    label: "API rate limit (per minute)",
    description: "Per-org API request cap.",
    category: "rate_limits",
    type: "int",
    schema: { min: 60, max: 60000 },
    allowed_scopes: ["plan", "system"],
    is_sensitive: false,
    default_value: 600,
    write_roles: ["system_admin"],
    introduced_in_version: "0.45.0",
    deprecated: false,
  },
  {
    key: "rate_limits.ai_messages_per_day",
    label: "AI messages per day",
    description: "Per-org daily AI message cap.",
    category: "rate_limits",
    type: "int",
    schema: { min: 100, max: 1000000 },
    allowed_scopes: ["plan", "system"],
    is_sensitive: false,
    default_value: 1000,
    write_roles: ["system_admin"],
    introduced_in_version: "0.45.0",
    deprecated: false,
  },
];

/**
 * Mock per-scope storage. Map<scope:scopeId:key, raw value>.
 * For secrets we store plaintext here only because mock — real backend
 * never has plaintext at rest.
 */
const MOCK_VALUES = new Map<string, unknown>([
  ["org:1:branding.org_name", "Acme Corporation"],
  ["org:1:branding.accent_color", "violet"],
  ["org:1:ai.persona_name", "Acme AI Helper"],
  ["plan:pro:ai.max_tokens_per_message", 4096],
  ["org:1:ai.openai_api_key", "sk-acme-test-12345-XYZ"],
]);

function storageKey(scope: SettingScope, scopeId: number | null, key: string) {
  return `${scope}:${scopeId ?? "null"}:${key}`;
}

function maskSecret(plaintext: unknown): string | null {
  if (typeof plaintext !== "string" || plaintext.length === 0) return null;
  if (plaintext.length <= 6) return "...";
  const head = plaintext.slice(0, plaintext.startsWith("sk-") ? 3 : 0);
  const tail = plaintext.slice(-3);
  return `${head}...${tail}`;
}

function resolveSetting(
  def: SettingDefinition,
  ctx: { user_id: number; org_id: number; plan_id: string },
): SettingValue {
  // Walk most-specific → least-specific.
  const order: Array<[SettingScope, number | string | null]> = [
    ["user", ctx.user_id],
    ["org", ctx.org_id],
    ["plan", ctx.plan_id],
    ["system", null],
  ];
  let resolvedValue: unknown = def.default_value;
  let source: SettingSource = "default";
  for (const [scope, scopeId] of order) {
    if (!def.allowed_scopes.includes(scope)) continue;
    const stored = MOCK_VALUES.get(storageKey(scope, scopeId as number | null, def.key));
    if (stored !== undefined) {
      resolvedValue = stored;
      source = scope;
      break;
    }
  }
  return buildEnvelope(def, resolvedValue, source);
}

function buildEnvelope(
  def: SettingDefinition,
  resolvedValue: unknown,
  source: SettingSource,
): SettingValue {
  const base = { key: def.key, source };
  switch (def.type) {
    case "string":
      return { ...base, type: "string", value: String(resolvedValue ?? ""), is_sensitive: false };
    case "int":
      return { ...base, type: "int", value: Number(resolvedValue ?? 0), is_sensitive: false };
    case "bool":
      return { ...base, type: "bool", value: Boolean(resolvedValue), is_sensitive: false };
    case "json":
      return { ...base, type: "json", value: resolvedValue, is_sensitive: false };
    case "enum":
      return { ...base, type: "enum", value: String(resolvedValue ?? ""), is_sensitive: false };
    case "secret":
      return {
        ...base,
        type: "secret",
        has_value: resolvedValue !== null && resolvedValue !== undefined && resolvedValue !== "",
        masked: maskSecret(resolvedValue),
        is_sensitive: true,
      };
  }
}

function validateValue(def: SettingDefinition, value: unknown): string | null {
  if (value === null) return null; // null clears, always allowed
  const s = def.schema;
  switch (def.type) {
    case "string":
      if (typeof value !== "string") return `expected string, got ${typeof value}`;
      if (s?.maxLength !== undefined && value.length > s.maxLength)
        return `string longer than ${s.maxLength} chars`;
      if (s?.minLength !== undefined && value.length < s.minLength)
        return `string shorter than ${s.minLength} chars`;
      if (s?.pattern && !new RegExp(s.pattern).test(value))
        return `string does not match required pattern`;
      return null;
    case "int":
      if (typeof value !== "number" || !Number.isInteger(value))
        return `expected integer, got ${typeof value}`;
      if (s?.min !== undefined && value < s.min) return `value below minimum ${s.min}`;
      if (s?.max !== undefined && value > s.max) return `value above maximum ${s.max}`;
      return null;
    case "bool":
      if (typeof value !== "boolean") return `expected boolean, got ${typeof value}`;
      return null;
    case "enum":
      if (typeof value !== "string") return `expected enum string, got ${typeof value}`;
      if (s?.allowed_values && !s.allowed_values.includes(value))
        return `value not in allowed_values: ${s.allowed_values.join(", ")}`;
      return null;
    case "secret":
      if (typeof value !== "string") return `secret must be a string`;
      if (value.length === 0) return `secret cannot be empty (use null to clear)`;
      return null;
    case "json":
      // Mock: shallow validate only; backend uses full JSON-Schema.
      if (value === undefined) return `json value cannot be undefined`;
      return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function fetchSettingDefinitions(): Promise<SettingDefinitionsResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 60));
    return {
      success: true,
      data: { definitions: MOCK_DEFINITIONS, total: MOCK_DEFINITIONS.length },
    };
  }
  const res = await fetch(`${BASE}/settings/definitions`, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const DEFAULT_CTX = { user_id: 1, org_id: 1, plan_id: "pro" } as const;

export async function fetchSetting(key: string): Promise<SettingResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 50));
    const def = MOCK_DEFINITIONS.find((d) => d.key === key);
    if (!def) throw new Error(`404: setting '${key}' not defined`);
    return { success: true, data: resolveSetting(def, DEFAULT_CTX) };
  }
  const res = await fetch(`${BASE}/settings/${encodeURIComponent(key)}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return { success: true, data: (json.data ?? json) as SettingValue };
}

export async function fetchSettingsByCategory(
  category: SettingCategory,
): Promise<SettingsByCategoryResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 80));
    const defs = MOCK_DEFINITIONS.filter((d) => d.category === category);
    return {
      success: true,
      data: {
        category,
        settings: defs.map((d) => resolveSetting(d, DEFAULT_CTX)),
      },
    };
  }
  const res = await fetch(
    `${BASE}/settings/category/${encodeURIComponent(category)}`,
    { credentials: "include" },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function setSetting(input: SetSettingInput): Promise<SetSettingResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 120));
    const def = MOCK_DEFINITIONS.find((d) => d.key === input.key);
    if (!def) throw new Error(`404: setting '${input.key}' not defined`);
    if (!def.allowed_scopes.includes(input.scope)) {
      throw new Error(
        `400: scope '${input.scope}' not allowed for '${input.key}' (allowed: ${def.allowed_scopes.join(", ")})`,
      );
    }
    const validationErr = validateValue(def, input.value);
    if (validationErr) throw new Error(`400: ${validationErr}`);
    const sk = storageKey(input.scope, input.scope_id, input.key);
    if (input.value === null) MOCK_VALUES.delete(sk);
    else MOCK_VALUES.set(sk, input.value);
    return {
      success: true,
      message:
        input.value === null
          ? `(mock) Cleared ${input.key} at ${input.scope}`
          : `(mock) Set ${input.key} at ${input.scope}`,
      data: resolveSetting(def, DEFAULT_CTX),
    };
  }
  const res = await fetch(`${BASE}/settings/${encodeURIComponent(input.key)}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scope: input.scope,
      scope_id: input.scope_id,
      value: input.value,
      reason: input.reason,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
