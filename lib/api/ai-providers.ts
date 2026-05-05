/**
 * @module lib/api/ai-providers
 * AIProviderGateway client (Phase 2.1).
 *
 * Spec: docs/system-upgrade/04-capabilities/platform-ai-provider-gateway-spec.md
 *
 * Mock implements the 5-provider catalog (anthropic, openai, bedrock,
 * azure_openai, ollama) with full models + auth fields. Per-org configs are
 * mutable in-memory; sensitive credentials returned masked. Test-connection
 * always returns ok with synthetic latency. Resolve routing walks rules in
 * priority order with default-fallback behavior.
 */
import type {
  AIProvider,
  ProviderConfig,
  ProviderCatalogResponse,
  ProviderConfigsResponse,
  ProviderConfigResponse,
  UpdateProviderConfigInput,
  TestConnectionResponse,
  ResolveRoutingInput,
  ResolveRoutingResponse,
  RoutingRule,
} from "@/lib/modules/ai-providers/types";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/proxy";
export const MOCK_MODE = true;

// ---------------------------------------------------------------------------
// Catalog (system-wide, static)
// ---------------------------------------------------------------------------

const CATALOG: AIProvider[] = [
  {
    id: "anthropic",
    name: "Anthropic",
    description:
      "Claude family — Opus, Sonnet, Haiku. Best-in-class for tool use and complex reasoning.",
    category: "cloud",
    models: [
      {
        id: "claude-opus-4-7",
        display_name: "Claude Opus 4.7",
        context_window: 1_000_000,
        cost_per_million_input_tokens: 15,
        cost_per_million_output_tokens: 75,
        capabilities: ["chat", "tools", "vision", "thinking"],
        introduced_in: "2026-04-01",
        deprecated: false,
      },
      {
        id: "claude-sonnet-4-6",
        display_name: "Claude Sonnet 4.6",
        context_window: 1_000_000,
        cost_per_million_input_tokens: 3,
        cost_per_million_output_tokens: 15,
        capabilities: ["chat", "tools", "vision"],
        introduced_in: "2026-03-01",
        deprecated: false,
      },
      {
        id: "claude-haiku-4-5",
        display_name: "Claude Haiku 4.5",
        context_window: 200_000,
        cost_per_million_input_tokens: 0.8,
        cost_per_million_output_tokens: 4,
        capabilities: ["chat", "tools"],
        introduced_in: "2026-02-01",
        deprecated: false,
      },
    ],
    auth: {
      type: "api_key",
      fields: [
        {
          key: "api_key",
          label: "API key",
          label_he: "מפתח API",
          type: "password",
          sensitive: true,
          required: true,
          placeholder: "sk-ant-...",
        },
      ],
    },
    endpoint_default: "https://api.anthropic.com",
    endpoint_overridable: false,
    enabled_globally: true,
    introduced_in_version: "0.46.0",
    status: "stable",
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT family — GPT-5 and GPT-5-mini.",
    category: "cloud",
    models: [
      {
        id: "gpt-5",
        display_name: "GPT-5",
        context_window: 400_000,
        cost_per_million_input_tokens: 5,
        cost_per_million_output_tokens: 20,
        capabilities: ["chat", "tools", "vision"],
        introduced_in: "2026-01-01",
        deprecated: false,
      },
      {
        id: "gpt-5-mini",
        display_name: "GPT-5 mini",
        context_window: 128_000,
        cost_per_million_input_tokens: 0.5,
        cost_per_million_output_tokens: 2,
        capabilities: ["chat", "tools"],
        introduced_in: "2026-01-01",
        deprecated: false,
      },
      {
        id: "text-embedding-3-large",
        display_name: "text-embedding-3-large",
        context_window: 8192,
        cost_per_million_input_tokens: 0.13,
        cost_per_million_output_tokens: 0,
        capabilities: ["embeddings"],
        introduced_in: "2025-01-01",
        deprecated: false,
      },
    ],
    auth: {
      type: "api_key",
      fields: [
        {
          key: "api_key",
          label: "API key",
          label_he: "מפתח API",
          type: "password",
          sensitive: true,
          required: true,
          placeholder: "sk-...",
        },
        {
          key: "organization_id",
          label: "Organization ID (optional)",
          type: "text",
          sensitive: false,
          required: false,
          placeholder: "org-...",
        },
      ],
    },
    endpoint_default: "https://api.openai.com/v1",
    endpoint_overridable: false,
    enabled_globally: true,
    introduced_in_version: "0.46.0",
    status: "stable",
  },
  {
    id: "bedrock",
    name: "AWS Bedrock",
    description:
      "Anthropic + Llama via AWS Bedrock. Uses IAM credentials from the host environment.",
    category: "hosted",
    models: [
      {
        id: "anthropic.claude-sonnet-4-6-bedrock",
        display_name: "Claude Sonnet 4.6 (Bedrock)",
        context_window: 200_000,
        cost_per_million_input_tokens: 3,
        cost_per_million_output_tokens: 15,
        capabilities: ["chat", "tools"],
        introduced_in: "2026-03-15",
        deprecated: false,
      },
      {
        id: "meta.llama-3-70b",
        display_name: "Llama 3 70B",
        context_window: 32_000,
        cost_per_million_input_tokens: 1,
        cost_per_million_output_tokens: 1,
        capabilities: ["chat"],
        introduced_in: "2025-08-01",
        deprecated: false,
      },
    ],
    auth: {
      type: "iam",
      fields: [
        {
          key: "aws_region",
          label: "AWS region",
          type: "text",
          sensitive: false,
          required: true,
          placeholder: "us-east-1",
        },
        {
          key: "aws_role_arn",
          label: "Assume-role ARN (optional)",
          type: "text",
          sensitive: false,
          required: false,
        },
      ],
    },
    endpoint_default: null,
    endpoint_overridable: false,
    enabled_globally: true,
    introduced_in_version: "0.46.0",
    status: "beta",
  },
  {
    id: "azure_openai",
    name: "Azure OpenAI",
    description: "Microsoft-hosted GPT with VPC + compliance options.",
    category: "hosted",
    models: [
      {
        id: "gpt-5-azure",
        display_name: "GPT-5 (Azure)",
        context_window: 128_000,
        cost_per_million_input_tokens: 5,
        cost_per_million_output_tokens: 20,
        capabilities: ["chat", "tools"],
        introduced_in: "2026-02-01",
        deprecated: false,
      },
      {
        id: "gpt-4o-azure",
        display_name: "GPT-4o (Azure)",
        context_window: 128_000,
        cost_per_million_input_tokens: 2.5,
        cost_per_million_output_tokens: 10,
        capabilities: ["chat", "tools", "vision"],
        introduced_in: "2025-08-01",
        deprecated: false,
      },
    ],
    auth: {
      type: "api_key",
      fields: [
        {
          key: "api_key",
          label: "API key",
          type: "password",
          sensitive: true,
          required: true,
        },
        {
          key: "deployment_name",
          label: "Deployment name",
          type: "text",
          sensitive: false,
          required: true,
        },
      ],
    },
    endpoint_default: null,
    endpoint_overridable: true,
    enabled_globally: true,
    introduced_in_version: "0.46.0",
    status: "beta",
  },
  {
    id: "ollama",
    name: "Ollama (local)",
    description: "Self-hosted models via Ollama. No external network required.",
    category: "local",
    models: [
      {
        id: "llama-3-8b",
        display_name: "Llama 3 8B",
        context_window: 8000,
        cost_per_million_input_tokens: 0,
        cost_per_million_output_tokens: 0,
        capabilities: ["chat"],
        introduced_in: "2025-05-01",
        deprecated: false,
      },
      {
        id: "mistral-7b",
        display_name: "Mistral 7B",
        context_window: 8000,
        cost_per_million_input_tokens: 0,
        cost_per_million_output_tokens: 0,
        capabilities: ["chat"],
        introduced_in: "2024-10-01",
        deprecated: false,
      },
    ],
    auth: { type: "none", fields: [] },
    endpoint_default: "http://localhost:11434",
    endpoint_overridable: true,
    enabled_globally: true,
    introduced_in_version: "0.46.0",
    status: "experimental",
  },
];

function maskCredential(plaintext: string | null | undefined): { has_value: true; masked: string } | "" {
  if (!plaintext) return "";
  const head = plaintext.slice(0, 3);
  const tail = plaintext.slice(-3);
  return { has_value: true, masked: `${head}...${tail}` };
}

// ---------------------------------------------------------------------------
// Mock per-org configs
// ---------------------------------------------------------------------------

function makeDefaultConfig(provider_id: string, org_id: number): ProviderConfig {
  const provider = CATALOG.find((p) => p.id === provider_id)!;
  return {
    org_id,
    provider_id,
    enabled: false,
    credentials: {},
    endpoint: provider.endpoint_default,
    default_model: provider.models[0]!.id,
    routing_rules: [],
    monthly_budget_usd: null,
    last_test_at: null,
    last_test_ok: false,
    created_at: new Date(2026, 4, 1).toISOString(),
    updated_at: new Date(2026, 4, 1).toISOString(),
  };
}

const MOCK_CONFIGS = new Map<string, ProviderConfig>();

// Seed: org 1 has anthropic enabled with a fake key + one routing rule.
{
  const cfg = makeDefaultConfig("anthropic", 1);
  cfg.enabled = true;
  cfg.credentials = {
    api_key: { has_value: true, masked: "sk-...XYZ" },
  };
  cfg.last_test_at = new Date().toISOString();
  cfg.last_test_ok = true;
  cfg.routing_rules = [
    {
      id: "rule-1",
      description: "Cheap chat → Haiku",
      match: { purpose: "chat", max_estimated_cost_usd: 0.005 },
      target: { provider_id: "anthropic", model: "claude-haiku-4-5" },
      enabled: true,
      priority: 100,
    },
  ];
  MOCK_CONFIGS.set("1:anthropic", cfg);
}

function configKey(org_id: number, provider_id: string) {
  return `${org_id}:${provider_id}`;
}

// ---------------------------------------------------------------------------
// Routing resolver
// ---------------------------------------------------------------------------

function patternMatches(pattern: string, value: string): boolean {
  if (pattern === "*" || pattern === value) return true;
  // Simple glob — '*' matches anything (including dots, action_id-style).
  const re = new RegExp(
    `^${pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`,
  );
  return re.test(value);
}

function ruleMatches(
  rule: RoutingRule,
  input: ResolveRoutingInput,
  estCost: number,
): boolean {
  if (!rule.enabled) return false;
  const m = rule.match;
  if (m.purpose && m.purpose !== "*" && m.purpose !== input.purpose) return false;
  if (m.action_id_pattern) {
    if (!input.action_id) return false;
    if (!patternMatches(m.action_id_pattern, input.action_id)) return false;
  }
  if (m.max_estimated_cost_usd !== undefined && estCost > m.max_estimated_cost_usd) return false;
  if (m.min_context_tokens !== undefined) {
    const tokens = (input.estimated_input_tokens ?? 0) + (input.estimated_output_tokens ?? 0);
    if (tokens < m.min_context_tokens) return false;
  }
  return true;
}

export function estimateCostUsd(
  providerId: string,
  modelId: string,
  inTokens: number,
  outTokens: number,
): number {
  const provider = CATALOG.find((p) => p.id === providerId);
  const model = provider?.models.find((m) => m.id === modelId);
  if (!model) return 0;
  return (
    (inTokens * model.cost_per_million_input_tokens) / 1_000_000 +
    (outTokens * model.cost_per_million_output_tokens) / 1_000_000
  );
}

const DEFAULT_ORG_ID = 1;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function fetchProviderCatalog(): Promise<ProviderCatalogResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 60));
    return { success: true, data: { providers: CATALOG, total: CATALOG.length } };
  }
  const res = await fetch(`${BASE}/ai-providers/catalog`, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchProviderConfigs(): Promise<ProviderConfigsResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 80));
    const configs: ProviderConfig[] = [];
    for (const provider of CATALOG) {
      const cfg = MOCK_CONFIGS.get(configKey(DEFAULT_ORG_ID, provider.id));
      configs.push(cfg ?? makeDefaultConfig(provider.id, DEFAULT_ORG_ID));
    }
    return { success: true, data: { configs } };
  }
  const res = await fetch(`${BASE}/ai-providers/configs`, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchProviderConfig(
  providerId: string,
): Promise<ProviderConfigResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 50));
    if (!CATALOG.some((p) => p.id === providerId)) {
      throw new Error(`404: provider '${providerId}' not in catalog`);
    }
    const cfg =
      MOCK_CONFIGS.get(configKey(DEFAULT_ORG_ID, providerId)) ??
      makeDefaultConfig(providerId, DEFAULT_ORG_ID);
    return { success: true, data: { config: cfg } };
  }
  const res = await fetch(
    `${BASE}/ai-providers/configs/${encodeURIComponent(providerId)}`,
    { credentials: "include" },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function updateProviderConfig(
  input: UpdateProviderConfigInput,
): Promise<ProviderConfigResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 150));
    const provider = CATALOG.find((p) => p.id === input.provider_id);
    if (!provider) throw new Error(`404: provider '${input.provider_id}'`);
    const key = configKey(DEFAULT_ORG_ID, input.provider_id);
    const existing =
      MOCK_CONFIGS.get(key) ?? makeDefaultConfig(input.provider_id, DEFAULT_ORG_ID);

    // Merge credentials with masking.
    const nextCreds = { ...existing.credentials };
    if (input.credentials) {
      for (const [k, v] of Object.entries(input.credentials)) {
        const field = provider.auth.fields.find((f) => f.key === k);
        if (v === null) {
          delete nextCreds[k];
        } else if (field?.sensitive) {
          const masked = maskCredential(v);
          if (masked !== "") nextCreds[k] = masked;
        } else {
          nextCreds[k] = v;
        }
      }
    }

    const next: ProviderConfig = {
      ...existing,
      enabled: input.enabled ?? existing.enabled,
      credentials: nextCreds,
      endpoint: input.endpoint !== undefined ? input.endpoint : existing.endpoint,
      default_model: input.default_model ?? existing.default_model,
      routing_rules: input.routing_rules ?? existing.routing_rules,
      monthly_budget_usd:
        input.monthly_budget_usd !== undefined
          ? input.monthly_budget_usd
          : existing.monthly_budget_usd,
      updated_at: new Date().toISOString(),
    };
    MOCK_CONFIGS.set(key, next);
    return { success: true, data: { config: next } };
  }
  const res = await fetch(
    `${BASE}/ai-providers/configs/${encodeURIComponent(input.provider_id)}`,
    {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function testProviderConnection(
  providerId: string,
): Promise<TestConnectionResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 400));
    const provider = CATALOG.find((p) => p.id === providerId);
    if (!provider) throw new Error(`404: provider '${providerId}'`);
    const cfg =
      MOCK_CONFIGS.get(configKey(DEFAULT_ORG_ID, providerId)) ??
      makeDefaultConfig(providerId, DEFAULT_ORG_ID);
    const hasRequiredCreds = provider.auth.fields
      .filter((f) => f.required)
      .every((f) => cfg.credentials[f.key]);
    if (provider.auth.type !== "none" && !hasRequiredCreds) {
      return {
        success: true,
        data: {
          ok: false,
          latency_ms: null,
          tested_model: null,
          tested_at: new Date().toISOString(),
          error: "Required credentials are missing.",
        },
      };
    }
    // Persist last-test result on the config.
    const next: ProviderConfig = {
      ...cfg,
      last_test_at: new Date().toISOString(),
      last_test_ok: true,
      updated_at: new Date().toISOString(),
    };
    MOCK_CONFIGS.set(configKey(DEFAULT_ORG_ID, providerId), next);
    return {
      success: true,
      data: {
        ok: true,
        latency_ms: 200 + Math.floor(Math.random() * 300),
        tested_model: cfg.default_model,
        tested_at: next.last_test_at!,
        error: null,
      },
    };
  }
  const res = await fetch(
    `${BASE}/ai-providers/configs/${encodeURIComponent(providerId)}/test`,
    { method: "POST", credentials: "include" },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function resolveRouting(
  input: ResolveRoutingInput,
): Promise<ResolveRoutingResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 30));
    // Walk all enabled configs for the org. Order: primary anthropic, then
    // others. Within a config, walk routing_rules in priority order.
    const configs: ProviderConfig[] = [];
    for (const p of CATALOG) {
      const c = MOCK_CONFIGS.get(configKey(DEFAULT_ORG_ID, p.id));
      if (c && c.enabled) configs.push(c);
    }
    if (configs.length === 0) {
      throw new Error("400: no provider enabled for this org");
    }
    const inTokens = input.estimated_input_tokens ?? 0;
    const outTokens = input.estimated_output_tokens ?? 0;
    // Try each config's rules.
    for (const cfg of configs) {
      const sortedRules = [...cfg.routing_rules].sort(
        (a, b) => b.priority - a.priority,
      );
      for (const rule of sortedRules) {
        const ruleCost = estimateCostUsd(
          rule.target.provider_id,
          rule.target.model,
          inTokens,
          outTokens,
        );
        if (ruleMatches(rule, input, ruleCost)) {
          return {
            success: true,
            data: {
              provider_id: rule.target.provider_id,
              model: rule.target.model,
              estimated_cost_usd: ruleCost,
              matched_rule_id: rule.id,
            },
          };
        }
      }
    }
    // Default fallback — first enabled config + its default model.
    const primary = configs[0]!;
    return {
      success: true,
      data: {
        provider_id: primary.provider_id,
        model: primary.default_model,
        estimated_cost_usd: estimateCostUsd(
          primary.provider_id,
          primary.default_model,
          inTokens,
          outTokens,
        ),
        matched_rule_id: null,
      },
    };
  }
  const res = await fetch(`${BASE}/ai-providers/resolve`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
