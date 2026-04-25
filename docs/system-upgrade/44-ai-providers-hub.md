# 44 — AI Providers Hub: Architecture & UI Plan

_Round 034 — 2026-04-25_
_Status: Architecture design complete. Implementation not started._

> **Scope:** platform-ui React/Next.js hub for managing AI providers, models, usage, billing quotas, health, and fallback configuration. Backed by `apps/ai_providers/` (platformengineer). New backend JWT routes required before any UI work begins.

---

## §01 — Executive Summary

The platform has a mature AI Provider layer in `apps/ai_providers/` with 6 DB models, provider CRUD, fallback chains, circuit breakers, usage logging (30+ fields), and a gateway API. However:

1. **Existing backend routes use Flask-Login** (`@login_required` + `current_user`) — incompatible with platform-ui JWT auth. New routes at `/api/ai-providers/` with `@jwt_required + g.jwt_user` are required.
2. **No platform-ui pages exist** for AI provider management — `app/(dashboard)/` has no `ai-providers/` route yet.
3. **New APIs needed:** overview summary, provider health with circuit state, model registry, key rotation, migration status, quota management.

**Implementation sequence:**
1. **Phase 1 (R034):** Architecture doc (this file) + ADR-029
2. **Phase 2 (R035):** Backend JWT routes (`apps/ai_providers/api_routes.py`)
3. **Phase 3 (R036):** platform-ui Hub UI (sections 1–5: overview, providers, defaults, module overrides, usage)
4. **Phase 4 (R037):** Quotas, health monitor UI, fallback chain editor, migration status

---

## §02 — Current Backend Capability Assessment

### Q1: What DB models exist?

| Model | Table | Purpose |
|-------|-------|---------|
| `AIProvider` | `ai_providers` | Provider config (name, type, api_key_ref, capabilities, default_model) |
| `AIProviderDefault` | `ai_provider_defaults` | Per-capability default provider for an org |
| `AIFallbackChain` | `ai_fallback_chains` | Ordered fallback sequence per capability (priority, retries, timeout_ms) |
| `AIModuleOverride` | `ai_module_overrides` | Per-module provider override (module_name, capability, provider_id, model_override) |
| `AIUserOverride` | `ai_user_overrides` | Per-user provider preference (org_id, user_id, capability) |
| `AIUsageLog` | `ai_usage_logs` | 30+ field usage log, partitioned monthly |

`AIUsageLog` key fields: `org_id`, `provider_id`, `capability`, `module_name`, `model`, `input_tokens`, `output_tokens`, `audio_input_tokens`, `audio_output_tokens`, `latency_ms`, `cost_usd`, `billable_cost`, `quota_bucket`, `is_billable`, `feature_id`, `conversation_id`, `session_id`, `correlation_id`, `status`.

### Q2: What backend routes exist?

All in `apps/ai_providers/routes.py` (blueprint prefix `/ai-providers/`). **All use Flask-Login** — cannot be consumed by platform-ui directly.

| Existing route | Method | Notes |
|----------------|--------|-------|
| `/ai-providers/hub` | GET | Jinja2 page — not usable |
| `/ai-providers/api/providers` | GET, POST | Provider list + create |
| `/ai-providers/api/providers/<id>` | PUT, DELETE | Provider update/delete |
| `/ai-providers/api/providers/<id>/test` | POST | Test connection |
| `/ai-providers/api/defaults` | GET, POST | Per-capability defaults |
| `/ai-providers/api/module-overrides` | GET, POST, DELETE | Module override CRUD |
| `/ai-providers/api/fallback-chain` | GET, POST, PUT, DELETE | Fallback chain CRUD |
| `/ai-providers/api/usage/summary` | GET | Usage totals by capability/module |
| `/ai-providers/api/usage/breakdown` | GET | Granular usage (model, date, module) |
| `/ai-providers/api/available` | GET | Active providers for a capability |
| `/ai-providers/api/usage-limits` | GET, POST, PUT, DELETE | `org_usage_limits` CRUD |

### Q3: What settings are configurable per provider?

- `name`, `provider_type` (openai/anthropic/gemini/azure_openai/bedrock/ollama/custom)
- `api_key_ref` — Fernet-encrypted, write-only
- `base_url` — for Azure, Bedrock, Ollama, custom
- `default_model` — default model string for this provider
- `capabilities` — JSONB array of enabled capabilities
- `is_enabled` — soft disable without deleting
- `config` — JSONB free config (temperature, rate limit config, etc.)
- `billing_mode_config` — JSONB: `{"mode": "platform|byok|metered", "voice_pricing": {...}}`
- Per-module: `model_override`, `config_override`, `allow_paid_fallback`, `reason`
- Per-fallback: `priority`, `max_retries`, `timeout_ms`

### Q4: How are API keys handled?

- Stored encrypted in `api_key_ref` column (Fernet via `apps/ai_providers/_encryption.py`)
- Resolved via `key_resolver.py` → `get_api_key(org_id, capability)` — DB first, env var fallback
- Frontend never receives the key value — `has_api_key: bool` only
- Rotation: delete + re-create provider (no dedicated rotate endpoint yet)
- Env var fallbacks (system-level): in `platform-secrets` K8s secret → SSM

### Q5: Key scoping

- **Org-level providers:** each `AIProvider` row has `org_id` — orgs can have their own providers (BYOK)
- **System-level fallback:** `key_resolver.py` falls back to env vars (`OPENAI_API_KEY` etc.) in `platform-secrets`
- System-level providers are effectively shared across all orgs that don't have BYOK

### Q6: Fallback order

Yes — `AIFallbackChain` with `priority` column (lower = tried first). Redis-backed `ProviderCircuitBreaker` skips OPEN providers. States: `CLOSED` → `OPEN` (after 5 failures in 60s) → `HALF_OPEN` (after 30s cooldown) → `CLOSED`.

### Q7: Model overrides

Yes — three levels:
1. `AIProviderDefault.model_override` — per-capability default model
2. `AIModuleOverride.model_override` — per-module per-capability model
3. `AIUserOverride.model_override` — per-user per-capability model

Resolution hierarchy: `user_override → module_override → system_default`.

### Q8: Provider health

- `health_monitor.py` runs Celery Beat every 60s via `run_health_checks()`
- Health state is NOT stored in DB (was removed) — only in Redis circuit breaker
- Circuit breaker keys: `circuit:{org_id}:{provider_id}` (state + failure count + last failure ts)
- `HealthStatus` enum: `healthy`, `degraded`, `offline`, `unknown`
- No HTTP endpoint currently exposes live health state to the frontend

### Q9: Usage and cost data

Yes — `AIUsageLog` has full records. Two existing endpoints:
- `/api/usage/summary` — totals grouped by capability or module
- `/api/usage/breakdown` — granular rows with date, model, module, cost_usd

`org_usage_limits` table: `period_type` (daily/monthly), `limit_cents`, `action_on_limit` (block/warn/notify), `notify_at_pct`.

### Q10: Missing APIs (needed for Hub)

| Missing endpoint | Reason needed |
|-----------------|---------------|
| `GET /api/ai-providers/overview` | Dashboard summary card (provider count, active, health status counts) |
| `GET /api/ai-providers/health` | Live health + circuit breaker state per provider |
| `GET /api/ai-providers/models` | Model registry — list all known models per provider type |
| `POST /api/ai-providers/<id>/rotate-key` | Key rotation without full re-create |
| `GET /api/ai-providers/migration-status` | P0 migration progress (legacy direct calls remaining) |
| `GET /api/ai-providers/quota/status` | Current spend vs. limits for org |
| All existing routes re-exposed at `/api/ai-providers/` | Need `@jwt_required` versions |

### Q11: Who can manage providers?

- `ai_providers.admin` permission (default: system-admin)
- Org-admin can manage their own BYOK providers if `feature_flag.byok_enabled`
- Circuit breaker reset: system-admin only

### Q12: Who can view usage?

- `ai_providers.usage.view` (default: org-admin+)
- Org-admin sees own org; system-admin sees all orgs

### Q13: System-admin only capabilities

- System-level (cross-org) provider management
- Model registry management
- Migration status dashboard
- Cross-org usage view
- Manual circuit breaker reset
- Quota adjustment for specific orgs

### Q14: Org-admin capabilities

- View own org usage + costs
- Manage BYOK providers (if feature flag enabled)
- Set org usage limits (daily/monthly spend caps)
- Configure module overrides for own org
- Configure user overrides for own org users

### Q15: Hidden from regular users

Everything in the Hub. No AI provider config, cost data, API key status, or health state is visible to end-users. Hub is admin-only.

---

## §03 — Current Frontend Gap

| Gap | Detail |
|-----|--------|
| No AI providers pages | `app/(dashboard)/` has no `ai-providers/` route |
| No API client functions | `lib/api/client.ts` has no AI provider fetch functions |
| No query keys | `lib/api/query-keys.ts` has no AI provider keys |
| No TypeScript types | `lib/api/types.ts` has no AI provider response interfaces |
| Existing backend routes incompatible | All at `/ai-providers/api/*` with Flask-Login — cannot proxy through platform-ui JWT flow |
| No permission check component | `PermissionGate` exists but no `ai_providers.*` permission constants |

---

## §04 — Product Goals

1. Give org-admins a clear view of which AI providers are active, healthy, and how much they cost.
2. Let system-admins configure providers, fallback chains, and module overrides without editing code or DB.
3. Expose live circuit breaker health so operators know when a provider has failed over.
4. Show migration status: how many legacy direct LLM calls remain, progress toward zero.
5. Allow org-admins to set spend caps and receive notifications before billing surprises.
6. Provide a BYOK self-service flow for enterprise orgs (Phase 4).

---

## §05 — Hub Sections

### Section 1 — Overview Dashboard

**Route:** `app/(dashboard)/ai-providers/page.tsx`

Summary cards:
- Total providers (active / disabled)
- Active capabilities covered
- Provider health status (healthy / degraded / offline counts)
- Monthly spend (current month cost_usd sum)
- Gateway calls today (AIUsageLog count, last 24h)
- Migration status progress bar (legacy calls remaining → 0)

**API:** `GET /api/ai-providers/overview`

---

### Section 2 — Providers List

**Route:** `app/(dashboard)/ai-providers/providers/page.tsx`

Table columns: Name | Type | Capabilities | Default Model | Key Status | Health | Status | Actions

Features:
- Add provider (drawer form)
- Edit provider (drawer form)
- Delete provider (ConfirmActionDialog)
- Test connection (inline badge result)
- Toggle enabled/disabled

**API:** `GET/POST /api/ai-providers/providers`, `PUT/DELETE /api/ai-providers/providers/<id>`, `POST /api/ai-providers/providers/<id>/test`

---

### Section 3 — Provider Detail

**Route:** `app/(dashboard)/ai-providers/providers/[id]/page.tsx`

Sections:
- Provider info (name, type, base_url, capabilities)
- API key management (show `has_api_key`, rotate button)
- Config viewer (billing_mode_config, config JSONB — read-only JSON display)
- Health history (circuit breaker state, last failure, failure count)
- Usage sparkline (last 7d cost_usd from AIUsageLog)

**API:** `GET /api/ai-providers/providers/<id>`, `GET /api/ai-providers/health?provider_id=<id>`, `POST /api/ai-providers/providers/<id>/rotate-key`

---

### Section 4 — Defaults & Model Selection

**Route:** `app/(dashboard)/ai-providers/defaults/page.tsx`

Table: one row per capability. Columns: Capability | Active Provider | Model Override | Fallback Chain | Actions

Features:
- Set default provider per capability (select from active providers)
- Set model override per capability
- Quick link to fallback chain editor

**API:** `GET/POST /api/ai-providers/defaults`

---

### Section 5 — Module Overrides

**Route:** `app/(dashboard)/ai-providers/overrides/page.tsx`

Table columns: Module | Capability | Provider Override | Model Override | Reason | Actions

Features:
- Create/edit/delete module overrides
- Filter by module name
- Show which modules use system default vs. override

**API:** `GET/POST/DELETE /api/ai-providers/module-overrides`

---

### Section 6 — Fallback Chains

**Route:** `app/(dashboard)/ai-providers/fallback/page.tsx`

One accordion per capability. Each shows ordered list of fallback providers (priority, max_retries, timeout_ms, is_enabled).

Features:
- Drag-to-reorder (or explicit priority number)
- Add/remove providers from chain
- Toggle individual fallback entry

**API:** `GET/POST/PUT/DELETE /api/ai-providers/fallback-chain`

---

### Section 7 — Usage & Billing

**Route:** `app/(dashboard)/ai-providers/usage/page.tsx`

Tabs:
- **Summary** — totals by capability for current month
- **By Module** — cost breakdown per module (bar chart)
- **By Provider** — cost breakdown per provider (bar chart)
- **Timeline** — daily spend line chart (last 30d)

Date range filter. Export CSV button (Phase 4).

**API:** `GET /api/ai-providers/usage/summary`, `GET /api/ai-providers/usage/breakdown`

---

### Section 8 — Quotas & Limits

**Route:** `app/(dashboard)/ai-providers/quotas/page.tsx`

Cards per limit entry: Period | Limit | Current Spend | % Used | Action on Limit | Notify At %

Features:
- Create/edit/delete usage limits
- Visual progress bar (green → amber → red)
- `action_on_limit`: `block` shows red warning, `warn`/`notify` shows amber

**API:** `GET/POST/PUT/DELETE /api/ai-providers/usage-limits`, `GET /api/ai-providers/quota/status`

---

### Section 9 — Health & Circuit Breakers

**Route:** `app/(dashboard)/ai-providers/health/page.tsx`

Table: Provider | Status | Circuit State | Failure Count | Last Failure | Cooldown Remaining | Reset

Features:
- Live polling (30s refetch interval)
- Manual circuit breaker reset (system-admin only, `ConfirmActionDialog`)
- Status dot: green (CLOSED/healthy) / amber (HALF_OPEN/degraded) / red (OPEN/offline)

**API:** `GET /api/ai-providers/health`, `POST /api/ai-providers/health/<provider_id>/reset`

---

### Section 10 — Migration Status

**Route:** `app/(dashboard)/ai-providers/migration/page.tsx` (system-admin only)

Shows progress toward zero legacy direct LLM calls:
- Count of files with violations (from `check_no_direct_llm_imports.py` report)
- Per-module table: module / file count / violation count / status / assigned round
- P0/P1/P2 priority breakdown

**API:** `GET /api/ai-providers/migration-status` (reads from static report or DB if migration tracking table added)

---

## §06 — API Requirements

### New backend file: `apps/ai_providers/api_routes.py`

New Flask Blueprint at `/api/ai-providers/` using `@jwt_required + g.jwt_user`. Does NOT modify existing `routes.py` — the two blueprints coexist during migration.

```python
# apps/ai_providers/api_routes.py
from flask import Blueprint
api_blueprint = Blueprint("ai_providers_api", __name__, url_prefix="/api/ai-providers")
```

Register in `apps/__init__.py` alongside existing blueprint.

### Full API table

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/ai-providers/overview` | GET | `ai_providers.view` | Summary counts + spend + migration % |
| `/api/ai-providers/providers` | GET | `ai_providers.view` | List providers for org |
| `/api/ai-providers/providers` | POST | `ai_providers.manage` | Create provider |
| `/api/ai-providers/providers/<id>` | GET | `ai_providers.view` | Get single provider |
| `/api/ai-providers/providers/<id>` | PUT | `ai_providers.manage` | Update provider |
| `/api/ai-providers/providers/<id>` | DELETE | `ai_providers.manage` | Delete provider (ConfirmActionDialog guard) |
| `/api/ai-providers/providers/<id>/test` | POST | `ai_providers.manage` | Test provider connection |
| `/api/ai-providers/providers/<id>/rotate-key` | POST | `ai_providers.rotate_key` | Rotate API key |
| `/api/ai-providers/defaults` | GET | `ai_providers.view` | Get capability defaults |
| `/api/ai-providers/defaults` | POST | `ai_providers.manage` | Set capability default |
| `/api/ai-providers/module-overrides` | GET | `ai_providers.view` | List module overrides |
| `/api/ai-providers/module-overrides` | POST | `ai_providers.manage` | Create module override |
| `/api/ai-providers/module-overrides/<id>` | DELETE | `ai_providers.manage` | Delete module override |
| `/api/ai-providers/fallback-chain` | GET | `ai_providers.view` | List fallback chains |
| `/api/ai-providers/fallback-chain` | POST | `ai_providers.manage` | Create chain entry |
| `/api/ai-providers/fallback-chain/<id>` | PUT | `ai_providers.manage` | Update chain entry |
| `/api/ai-providers/fallback-chain/<id>` | DELETE | `ai_providers.manage` | Delete chain entry |
| `/api/ai-providers/usage/summary` | GET | `ai_providers.usage.view` | Usage totals |
| `/api/ai-providers/usage/breakdown` | GET | `ai_providers.usage.view` | Granular usage rows |
| `/api/ai-providers/usage-limits` | GET | `ai_providers.view` | List usage limits |
| `/api/ai-providers/usage-limits` | POST | `ai_providers.manage` | Create usage limit |
| `/api/ai-providers/usage-limits/<id>` | PUT | `ai_providers.manage` | Update usage limit |
| `/api/ai-providers/usage-limits/<id>` | DELETE | `ai_providers.manage` | Delete usage limit |
| `/api/ai-providers/quota/status` | GET | `ai_providers.usage.view` | Current spend vs. limits |
| `/api/ai-providers/health` | GET | `ai_providers.health.view` | Live health + circuit state per provider |
| `/api/ai-providers/health/<id>/reset` | POST | `ai_providers.system.manage` | Reset circuit breaker |
| `/api/ai-providers/models` | GET | `ai_providers.view` | Model registry (known models per type) |
| `/api/ai-providers/migration-status` | GET | `ai_providers.system.manage` | Legacy call violation counts |
| `/api/ai-providers/available` | GET | `ai_providers.view` | Active providers for a capability (for dropdowns) |

### Proxy route additions (`app/api/proxy/[...path]/route.ts`)

Add mapping:
```
/api/proxy/ai-providers/* → /api/ai-providers/*
```

### Query key additions (`lib/api/query-keys.ts`)

```ts
aiProviders: {
  overview: ["ai-providers", "overview"],
  list: (orgId: string) => ["ai-providers", "list", orgId],
  detail: (id: string) => ["ai-providers", "detail", id],
  defaults: (orgId: string) => ["ai-providers", "defaults", orgId],
  moduleOverrides: (orgId: string) => ["ai-providers", "overrides", orgId],
  fallbackChain: (orgId: string) => ["ai-providers", "fallback", orgId],
  usageSummary: (orgId: string, period: string) => ["ai-providers", "usage", "summary", orgId, period],
  usageBreakdown: (orgId: string, params: object) => ["ai-providers", "usage", "breakdown", orgId, params],
  usageLimits: (orgId: string) => ["ai-providers", "limits", orgId],
  quotaStatus: (orgId: string) => ["ai-providers", "quota", orgId],
  health: ["ai-providers", "health"],
  models: ["ai-providers", "models"],
  migrationStatus: ["ai-providers", "migration"],
}
```

---

## §07 — Permissions Model

### New permissions to add to DB

```sql
-- Add to permissions table (via migration)
('ai_providers.view',          'AI Providers', 'View provider list and configuration'),
('ai_providers.manage',        'AI Providers', 'Create, update, delete providers and configuration'),
('ai_providers.rotate_key',    'AI Providers', 'Rotate provider API keys'),
('ai_providers.usage.view',    'AI Providers', 'View usage logs and cost data'),
('ai_providers.billing.view',  'AI Providers', 'View billing metering and quota data'),
('ai_providers.health.view',   'AI Providers', 'View provider health and circuit breaker state'),
('ai_providers.quota.manage',  'AI Providers', 'Create and modify usage limits'),
('ai_providers.system.manage', 'AI Providers', 'System-admin: cross-org, migration status, circuit reset'),
```

### Default role assignments

| Permission | system-admin | org-admin | operator | technician |
|------------|:---:|:---:|:---:|:---:|
| `ai_providers.view` | ✅ | ✅ | ❌ | ❌ |
| `ai_providers.manage` | ✅ | BYOK only | ❌ | ❌ |
| `ai_providers.rotate_key` | ✅ | BYOK only | ❌ | ❌ |
| `ai_providers.usage.view` | ✅ | ✅ | ❌ | ❌ |
| `ai_providers.billing.view` | ✅ | ✅ | ❌ | ❌ |
| `ai_providers.health.view` | ✅ | ✅ | ❌ | ❌ |
| `ai_providers.quota.manage` | ✅ | ✅ | ❌ | ❌ |
| `ai_providers.system.manage` | ✅ | ❌ | ❌ | ❌ |

_BYOK only: org-admin can manage only if `feature_flag.byok_enabled` for their org._

### Frontend PermissionGate usage

```tsx
// View-only sections
<PermissionGate permission="ai_providers.view">
  <ProvidersList />
</PermissionGate>

// Management actions
<PermissionGate permission="ai_providers.manage">
  <Button onClick={openAddProvider}>Add Provider</Button>
</PermissionGate>

// System-admin only
<PermissionGate permission="ai_providers.system.manage">
  <MigrationStatusSection />
</PermissionGate>
```

---

## §08 — Security Rules

1. **Never expose `api_key_ref`** — `_provider_to_dict()` already enforces `has_api_key: bool` only. New routes must follow the same pattern.
2. **Org scoping mandatory** — every DB query in `api_routes.py` must include `WHERE org_id = g.jwt_user.org_id`. No exceptions.
3. **`audit_log` on all mutations** — call `record_activity()` on: create provider, update provider, delete provider, rotate key, change defaults, create/delete module override, change usage limits, reset circuit breaker.
4. **Rotate-key is destructive** — requires `ConfirmActionDialog` in frontend, `ai_providers.rotate_key` permission on backend.
5. **Delete provider** — must check for active references in `AIProviderDefault`, `AIFallbackChain`, `AIModuleOverride` before deleting. Return 409 + list of conflicts if in use.
6. **No raw exception strings in error responses** — use `{"success": false, "error": "human message"}` only.
7. **Circuit breaker reset** — system-admin only (`ai_providers.system.manage`), always audit-logged.

---

## §09 — Shared Capability Usage (ADR-028 Compliance)

Per `docs/system-upgrade/43-shared-services-enforcement.md`:

| Need | Required (not forbidden) |
|------|--------------------------|
| Provider list table | `DataTable<AIProvider>` from `components/shared/data-table/` |
| Provider form | `PlatformForm` + Zod schema in `lib/modules/ai-providers/schemas.ts` |
| Create/update mutations | `usePlatformMutation` |
| Delete/rotate confirmation | `ConfirmActionDialog` |
| Page headers | `PageShell` (`components/shared/page-shell/`) |
| Provider detail layout | `DetailView` + `InfoRow` (`components/shared/detail-view/`) |
| Permission checks | `PermissionGate` + `usePermission()` |
| Loading states | `StatCardSkeleton`, `TableSkeleton` from `components/shared/skeleton-card.tsx` |
| Error states | `ErrorState` + `ErrorBoundary` (`components/shared/error-state.tsx`) |
| API calls | `lib/api/ai-providers.ts` + `queryKeys.aiProviders.*` |
| org_id | From `session.user.org_id` — never form state |
| Action buttons (post-R034) | `ActionButton` — until R034 built: `Button + isPending from usePlatformMutation` |

---

## §10 — Phased Implementation Plan

### Phase 1 — Architecture (R034, this round)
- [x] `docs/system-upgrade/44-ai-providers-hub.md` (this file)
- [x] ADR-029 in `docs/system-upgrade/14-decision-log.md`
- [ ] Update docs 26, 35, 40, 41, 43, 15, 96, 98, ARCHITECTURE.md, CLAUDE.md

### Phase 2 — Backend JWT Routes (R035)
- [ ] `apps/ai_providers/api_routes.py` — all endpoints with `@jwt_required + g.jwt_user`
- [ ] Register `api_blueprint` in `apps/__init__.py`
- [ ] Add proxy mapping to `app/api/proxy/[...path]/route.ts`
- [ ] `scripts/migrations/versions/YYYYMMDD_add_ai_providers_permissions.py`
- [ ] Postman/curl integration test for all new endpoints
- [ ] `docs/system-upgrade/14-decision-log.md` — record auth migration decision

### Phase 3 — Hub UI Core (R036)
- [ ] `lib/api/ai-providers.ts` — typed fetch functions for all endpoints
- [ ] `lib/api/query-keys.ts` — `aiProviders.*` keys
- [ ] `lib/api/types.ts` — `AIProvider`, `AIProviderDefault`, `AIFallbackChain`, `AIUsageLog`, `AIUsageSummary`, `AIUsageLimit`, `AIProviderHealth`, `AIOverviewStats` interfaces
- [ ] `lib/modules/ai-providers/schemas.ts` — Zod schemas for all forms
- [ ] `app/(dashboard)/ai-providers/page.tsx` — Overview (Section 1)
- [ ] `app/(dashboard)/ai-providers/providers/page.tsx` — Providers list (Section 2)
- [ ] `app/(dashboard)/ai-providers/providers/[id]/page.tsx` — Provider detail (Section 3)
- [ ] `app/(dashboard)/ai-providers/defaults/page.tsx` — Defaults (Section 4)
- [ ] `app/(dashboard)/ai-providers/overrides/page.tsx` — Module overrides (Section 5)
- [ ] `app/(dashboard)/ai-providers/usage/page.tsx` — Usage & billing (Section 7)

### Phase 4 — Hub UI Advanced (R037)
- [ ] `app/(dashboard)/ai-providers/fallback/page.tsx` — Fallback chains (Section 6)
- [ ] `app/(dashboard)/ai-providers/quotas/page.tsx` — Quotas (Section 8)
- [ ] `app/(dashboard)/ai-providers/health/page.tsx` — Health monitor (Section 9)
- [ ] `app/(dashboard)/ai-providers/migration/page.tsx` — Migration status (Section 10, system-admin)
- [ ] Sidebar entry in `components/shell/app-sidebar.tsx`
- [ ] Command palette entries in `components/shell/command-palette.tsx`
- [ ] Keyboard shortcut: `g` + `i` → AI Providers

---

## §11 — TypeScript Interfaces (R036)

```ts
// lib/api/types.ts additions

export interface AIProvider {
  id: number;
  org_id: number;
  name: string;
  provider_type: "openai" | "anthropic" | "gemini" | "azure_openai" | "bedrock" | "ollama" | "custom";
  capabilities: string[];
  default_model: string | null;
  base_url: string | null;
  has_api_key: boolean;
  is_enabled: boolean;
  config: Record<string, unknown>;
  billing_mode_config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AIProviderDefault {
  id: number;
  org_id: number;
  capability: string;
  provider_id: number;
  model_override: string | null;
  config_override: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AIFallbackChain {
  id: number;
  org_id: number;
  capability: string;
  priority: number;
  provider_id: number;
  model_override: string | null;
  max_retries: number;
  timeout_ms: number;
  is_enabled: boolean;
}

export interface AIModuleOverride {
  id: number;
  org_id: number;
  module_name: string;
  capability: string;
  provider_id: number;
  model_override: string | null;
  config_override: Record<string, unknown>;
  reason: string | null;
}

export interface AIUsageLimit {
  id: number;
  org_id: number;
  period_type: "daily" | "monthly";
  limit_cents: number;
  action_on_limit: "block" | "warn" | "notify";
  notify_at_pct: number;
}

export interface AIUsageSummary {
  capability: string;
  module_name: string;
  total_calls: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  period: string;
}

export interface AIProviderHealth {
  provider_id: number;
  provider_name: string;
  status: "healthy" | "degraded" | "offline" | "unknown";
  circuit_state: "CLOSED" | "OPEN" | "HALF_OPEN";
  failure_count: number;
  last_failure_at: string | null;
  cooldown_remaining_ms: number;
}

export interface AIOverviewStats {
  total_providers: number;
  active_providers: number;
  capabilities_covered: string[];
  health_summary: { healthy: number; degraded: number; offline: number };
  monthly_spend_usd: number;
  gateway_calls_today: number;
  migration_violations_remaining: number;
}
```

---

## §12 — Zod Schemas (R036)

```ts
// lib/modules/ai-providers/schemas.ts

import { z } from "zod";

export const providerFormSchema = z.object({
  name: z.string().min(1).max(100),
  provider_type: z.enum(["openai", "anthropic", "gemini", "azure_openai", "bedrock", "ollama", "custom"]),
  api_key: z.string().optional(), // write-only; empty = keep existing
  base_url: z.string().url().optional().or(z.literal("")),
  default_model: z.string().optional(),
  capabilities: z.array(z.string()).min(1, "Select at least one capability"),
  is_enabled: z.boolean().default(true),
});

export const defaultFormSchema = z.object({
  capability: z.string().min(1),
  provider_id: z.number().positive(),
  model_override: z.string().optional(),
});

export const moduleOverrideFormSchema = z.object({
  module_name: z.string().min(1),
  capability: z.string().min(1),
  provider_id: z.number().positive(),
  model_override: z.string().optional(),
  reason: z.string().optional(),
});

export const usageLimitFormSchema = z.object({
  period_type: z.enum(["daily", "monthly"]),
  limit_cents: z.number().positive().int(),
  action_on_limit: z.enum(["block", "warn", "notify"]),
  notify_at_pct: z.number().min(1).max(100).default(80),
});
```

---

## §13 — Open Questions

| # | Question | Decision needed by | Owner |
|---|----------|--------------------|-------|
| OQ-01 | BYOK feature flag: which orgs get it? Define flag name + table | R035 backend | Moshe |
| OQ-02 | Model registry: hardcoded list per provider_type, or editable DB table? | R035 backend | Architecture |
| OQ-03 | Migration status API: serve from static `check_no_direct_llm_imports.py` JSON output, or write to DB on CI run? | R035 | Architecture |
| OQ-04 | Cross-org usage view for system-admin: same endpoint with no org filter, or separate endpoint? | R035 | Security |
| OQ-05 | Usage export CSV: Phase 4 or Phase 3? | R036 planning | Moshe |
| OQ-06 | Sidebar placement: under main nav or inside Settings group? | R036 UI | Moshe |
| OQ-07 | Voice provider resolution still via `/admin/api/internal/resolve-voice-provider` — does Hub manage voice providers too, or separate flow? | R035 | Architecture |

---

## §14 — Acceptance Criteria

### Phase 2 (R035) — backend complete when:
- [ ] All Hub routes respond to JWT auth (`Authorization: Bearer <token>`)
- [ ] All routes scope by `g.jwt_user.org_id` — no unscoped queries
- [ ] All mutations produce `record_activity()` row
- [ ] All responses use `{"success": bool, "data": {...}}` envelope
- [ ] No `api_key_ref` value appears in any response
- [ ] Delete provider returns 409 if referenced by active defaults/fallback
- [ ] Integration tests pass for all endpoints (pytest, real DB)

### Phase 3 (R036) — frontend complete when:
- [ ] Build passes with zero TypeScript errors
- [ ] Overview page loads with real data via TanStack Query
- [ ] Provider list shows skeleton on load, error state on failure
- [ ] Add/edit provider form validates with Zod before submit
- [ ] All mutations use `usePlatformMutation` — no inline `useState(loading)`
- [ ] All destructive actions use `ConfirmActionDialog`
- [ ] `PermissionGate` hides management UI from org-admins without `ai_providers.manage`
- [ ] RTL layout: no `pl-`/`pr-`/`ml-`/`mr-` classes
- [ ] `pb-20 md:pb-0` on all new dashboard pages
- [ ] `mounted` guard on all theme-dependent rendering

---

## §15 — ADR-029: AI Providers Hub

**Context:** The platform has a complete AI provider management system in `apps/ai_providers/` but no React UI, and all existing backend routes use Flask-Login (incompatible with platform-ui JWT auth).

**Decision:** Build a dedicated AI Providers Hub in platform-ui. Add a new `apps/ai_providers/api_routes.py` Blueprint at `/api/ai-providers/` using `@jwt_required + g.jwt_user`. Do not modify `apps/ai_providers/routes.py` (Jinja2-era, keep for backwards compat during migration). The new blueprint calls the same service layer and models.

**Alternatives considered:**
- Migrate existing routes to JWT: risky, breaks the Jinja2 admin hub still in use.
- Use Flask-Login routes via session cookie from Next.js: not supported — platform-ui uses JWT-only auth.
- Replace existing routes: too much churn; side-by-side coexistence is lower risk.

**Consequences:**
- Temporary duplication: two blueprints for AI providers (old Flask-Login, new JWT). Jinja2 routes can be removed once Hub is proven stable (Phase 5, unscheduled).
- New permission rows required in DB (migration).
- org_id scoping now enforced on every route (improvement over existing behavior).

**Affected modules:** `apps/ai_providers/`, `lib/api/`, `app/(dashboard)/ai-providers/`, proxy route.

---

_Document version: 1.0 — Round 034, 2026-04-25_
_Next update: after Phase 2 backend routes are written (R035)_
