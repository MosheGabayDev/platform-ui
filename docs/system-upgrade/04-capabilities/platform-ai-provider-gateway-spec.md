# PlatformAIProviderGateway — Backend Contract Spec

> **Status:** spec drafted 2026-05-06 (Phase 2.1 of GENERIC_AI_PLATFORM_PROGRESS).
> Backend MUST adopt this contract verbatim before MOCK flip.
>
> **Why this matters:** the gateway is THE orchestration layer for "generic AI for businesses". Without it, every module talks to its own LLM client, every tenant pays the platform's API key, and there's no consistent place to enforce per-org routing, cost caps, or fallback. The gateway makes provider choice a per-org configuration, not a code decision.

---

## 1. Concept

A **provider** is a logical LLM source (OpenAI, Anthropic, Bedrock, Azure OpenAI, local Ollama). A **provider config** is a per-org binding of a provider to credentials + default model + routing rules. A **routing rule** says "for this kind of request, use this provider/model" — it lets an org route cheap requests to Haiku and expensive ones to Opus, or fail over to a local model when the cloud is down.

```
┌────────────────────────────────────────────────────────────┐
│                   AIProviderGateway                         │
│                                                              │
│  Request → Routing → Selected Provider+Model → Cost meter   │
│              ↓ (rule miss)                       ↓           │
│         Default config                       Audit log       │
└────────────────────────────────────────────────────────────┘
```

Frontend's job: list providers, expose admin UI to set per-org configs (which provider, which model, which keys), test connections, surface routing rules. Actual LLM calls happen server-side (Flask) via `AIProviderGateway.call()` — frontend never sees plaintext keys after they're written.

---

## 2. Provider catalog (system-wide)

Defined at the platform level — every tenant sees the same catalog and picks which to enable.

```ts
interface AIProvider {
  id: string;                          // "openai", "anthropic", "bedrock", "azure_openai", "ollama"
  name: string;                        // "OpenAI"
  description: string;
  category: "cloud" | "local" | "hosted";
  // Model catalog this provider supports
  models: ProviderModel[];
  // Auth requirements
  auth: {
    type: "api_key" | "iam" | "oauth" | "none";
    fields: AuthField[];               // e.g. [{key: "api_key", label: "API Key", sensitive: true}]
  };
  // Endpoint base (for local providers, settable per-org)
  endpoint_default: string | null;
  endpoint_overridable: boolean;
  // Per-platform availability
  enabled_globally: boolean;
  introduced_in_version: string;
  status: "stable" | "beta" | "experimental" | "deprecated";
}

interface ProviderModel {
  id: string;                          // "claude-opus-4-7"
  display_name: string;                // "Claude Opus 4.7"
  context_window: number;              // tokens
  cost_per_million_input_tokens: number;   // USD
  cost_per_million_output_tokens: number;
  capabilities: ("chat" | "tools" | "vision" | "thinking" | "embeddings")[];
  introduced_in: string;
  deprecated: boolean;
}

interface AuthField {
  key: string;                         // "api_key"
  label: string;
  label_he?: string;
  type: "text" | "password" | "select";
  sensitive: boolean;                  // true → stored encrypted, masked on read
  required: boolean;
  placeholder?: string;
}
```

---

## 3. Per-org provider config

```ts
interface ProviderConfig {
  org_id: number;
  provider_id: string;
  enabled: boolean;
  // Stored values for the auth fields. Sensitive values come back masked.
  credentials: Record<string, string | { has_value: true; masked: string }>;
  // Override the platform default endpoint (Ollama, Azure, etc).
  endpoint: string | null;
  // Default model for this provider when no routing rule matches.
  default_model: string;
  // Routing rules — applied in priority order; first match wins.
  routing_rules: RoutingRule[];
  // Per-org budget caps (delegated to cap 26 PlatformBilling — referenced here).
  monthly_budget_usd: number | null;
  // Last successful test connection, used by admin UI for the green-dot indicator.
  last_test_at: string | null;
  last_test_ok: boolean;
  created_at: string;
  updated_at: string;
}

interface RoutingRule {
  id: string;
  description: string;                 // "Cheap reads → Haiku"
  // Conditions evaluated against an AIRequest envelope:
  //   match_purpose: "chat" | "summarize" | "embedding" | "tool_call" | "*"
  //   match_action_id: glob (uses cap 27 policy syntax)
  //   max_estimated_cost_usd: number | null
  match: {
    purpose?: "chat" | "summarize" | "embedding" | "tool_call" | "*";
    action_id_pattern?: string;
    max_estimated_cost_usd?: number;
    min_context_tokens?: number;
  };
  // Where the request goes if matched.
  target: { provider_id: string; model: string };
  enabled: boolean;
  priority: number;                    // higher = evaluated first
}
```

---

## 4. Endpoints

### 4.1 — List providers (catalog)

```
GET /api/proxy/ai-providers/catalog
```

Returns the platform-wide provider catalog. Static — same for every tenant.

### 4.2 — Get all configs for the caller's org

```
GET /api/proxy/ai-providers/configs
```

Returns one `ProviderConfig` per provider the org has touched. Providers without a row return as "not configured" in the admin UI.

### 4.3 — Get a single config

```
GET /api/proxy/ai-providers/configs/<provider_id>
```

### 4.4 — Save a config (create or update)

```
PUT /api/proxy/ai-providers/configs/<provider_id>
```

Request body: `Partial<ProviderConfig>`. Sensitive credentials accepted in plaintext; backend encrypts at rest. To replace a key, send the new plaintext. To clear, send `null`. Audit emission per cap 10: `category=admin`, `action=ai_provider.config.update`.

### 4.5 — Test connection

```
POST /api/proxy/ai-providers/configs/<provider_id>/test
```

Server pings the provider (model list / hello prompt, cheap call). Returns:
```jsonc
{
  "success": true,
  "data": {
    "ok": true,
    "latency_ms": 234,
    "tested_model": "claude-haiku-4-5",
    "tested_at": "2026-05-06T12:00:00Z"
  }
}
```
On failure: `success: true, data.ok: false, data.error: "..."`. (Don't 500 on auth errors — distinguishable surface for the admin UI.)

### 4.6 — Resolve a routing decision (read-only, used by ActionPreviewCard for cost preview)

```
POST /api/proxy/ai-providers/resolve
```

Body: `{ purpose, action_id?, estimated_input_tokens?, estimated_output_tokens? }`.
Returns the would-be `{ provider_id, model, estimated_cost_usd, matched_rule_id? }` without making the LLM call. Useful for pre-confirm cost displays.

---

## 5. Multi-tenant safety

- `org_id` derived from session.
- Cross-tenant config writes (org A admin trying to set scope=org_B) MUST 403.
- Sensitive `credentials.*` values are stored encrypted; reads return `{ has_value, masked }`. Plaintext exists only on PUT and inside the gateway's `call()` path.
- Routing rules are per-org — system-wide platform rules (e.g. fallback ordering) are evaluated AFTER org rules.

---

## 6. Performance budget

- `GET /catalog` p95 ≤ 50ms (static — heavily cached at the edge).
- `GET /configs` p95 ≤ 80ms.
- `POST /test` is allowed up to 5s (calls a real provider). Frontend shows loading spinner.
- `POST /resolve` p95 ≤ 30ms (logic only, no LLM call).

---

## 7. Initial provider catalog (seeded)

| ID | Name | Category | Default models | Auth |
|---|---|---|---|---|
| `anthropic` | Anthropic | cloud | claude-opus-4-7, claude-sonnet-4-6, claude-haiku-4-5 | api_key |
| `openai` | OpenAI | cloud | gpt-5, gpt-5-mini | api_key |
| `bedrock` | AWS Bedrock | hosted | claude-sonnet-4-6 (via Bedrock), llama-3-70b | iam |
| `azure_openai` | Azure OpenAI | hosted | gpt-5, gpt-4o | api_key + endpoint |
| `ollama` | Ollama (local) | local | llama-3-8b, mistral-7b | none + endpoint (default http://localhost:11434) |

System default: `anthropic` with `claude-sonnet-4-6` (matches the Settings Engine `ai.default_model`).

---

## 8. Schema (Postgres)

```sql
CREATE TABLE ai_provider_configs (
  org_id BIGINT NOT NULL,
  provider_id VARCHAR(40) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  credentials JSONB NOT NULL DEFAULT '{}',         -- non-sensitive only
  encrypted_credentials BYTEA,                      -- KMS-wrapped sensitive blob
  endpoint TEXT,
  default_model VARCHAR(80) NOT NULL,
  routing_rules JSONB NOT NULL DEFAULT '[]',
  monthly_budget_usd NUMERIC(10, 2),
  last_test_at TIMESTAMPTZ,
  last_test_ok BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, provider_id)
);

CREATE INDEX idx_ai_provider_configs_org ON ai_provider_configs (org_id);
```

---

## 9. MOCK_MODE flip checklist

- [ ] Migration applied
- [ ] `/api/ai-providers/catalog` registered with seeded catalog
- [ ] CRUD endpoints registered
- [ ] KMS encryption wired for credentials
- [ ] `POST /test` actually pings the providers (graceful fail per provider)
- [ ] `POST /resolve` returns deterministic routing decisions
- [ ] Cross-tenant write guard tested
- [ ] Audit emission verified
- [ ] Frontend: flip `MOCK_MODE = false` in `lib/api/ai-providers.ts`

---

## 10. Open questions (Q-AIP-*)

- **Q-AIP-1** — Should the gateway support OpenAI-compatible providers (e.g. Together, Groq, Fireworks)? Recommendation: yes, model them as `category: "openai_compatible"` with an `endpoint` override. Defer the catalog entries until requested.
- **Q-AIP-2** — How are tool-use schemas surfaced when the provider doesn't support them natively? Recommendation: server-side prompt-engineered fallback (Skill registry cap 27 / 28 owns this).
- **Q-AIP-3** — Per-user override of org provider config (developer wants Opus while org default is Sonnet)? Recommendation: defer — overrides via Settings Engine (cap 16) `ai.default_model` at user scope.
- **Q-AIP-4** — Routing-rule simulator UI? Recommendation: spec'd here as `POST /resolve`. Admin UI shows a "test routing" inline tester similar to the policy tester.

---

## 11. Frontend wiring (this commit)

- `lib/modules/ai-providers/types.ts` — `AIProvider`, `ProviderConfig`, `ProviderModel`, `RoutingRule`, `AuthField`, response envelopes.
- `lib/api/ai-providers.ts` — mock client implementing all 6 endpoints with the 5-provider catalog.
- `lib/hooks/use-ai-provider-configs.ts` — list + per-provider config + resolver.
- `app/(dashboard)/admin/ai-providers/page.tsx` — catalog cards, per-provider status indicator, edit form (auth fields type-aware, default-model dropdown, routing rules table), Test Connection button.
- `tests/e2e/smoke/admin-pages.spec.ts` extended with AI Providers smoke specs.
- Tests: client, hook, admin UI render via E2E.
