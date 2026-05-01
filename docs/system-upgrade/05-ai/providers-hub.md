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
4. **Service-level routing gap:** Existing `AIModuleOverride` resolves at `(module_name, capability)` — two features in the same module cannot have different providers. No registry of AI-consuming services exists. `GatewayRequest` currently accepts `provider_id`/`model` overrides, allowing service code to hardcode routing. Two new models required: `AIServiceDefinition` + `AIServiceProviderRoute`. See §16–§28.

**Implementation sequence:**
1. **Phase 1 (R034):** Architecture doc (this file) + ADR-029
2. **Phase 2 (R035):** Backend JWT routes (`apps/ai_providers/api_routes.py`)
3. **Phase 3 (R036):** platform-ui Hub UI (sections 1–5: overview, providers, defaults, module overrides, usage)
4. **Phase 4 (R037):** Quotas, health monitor UI, fallback chain editor, migration status
5. **Phase 5 (R037+):** Service Routing Matrix UI (Sections 11–13: service list, detail, edit route)

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
7. **Eliminate all hardcoded provider/model routing in service code.** Every AI-consuming service must declare its `module_id`, `feature_id`, and `capability` — provider/model resolution is configuration, not code. The Service Routing Matrix (Sections 11–13) is the operational view of that configuration.

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
| `/api/ai-providers/services` | GET | `ai_routes.view` | List all service definitions + effective routes |
| `/api/ai-providers/services/<service_id>` | GET | `ai_routes.view` | Service detail + current route |
| `/api/ai-providers/services/<service_id>/usage` | GET | `ai_routes.usage.view` | Per-service usage/cost |
| `/api/ai-providers/services/<service_id>/audit` | GET | `ai_routes.view` | Route change audit history |
| `/api/ai-providers/services/<service_id>/route` | POST | `ai_routes.manage` | Create service route override |
| `/api/ai-providers/services/<service_id>/route` | PUT | `ai_routes.manage` | Update service route |
| `/api/ai-providers/services/<service_id>/route` | DELETE | `ai_routes.manage` | Delete route (revert to parent scope) |
| `/api/ai-providers/services/<service_id>/test` | POST | `ai_routes.test` | Dry-run test for resolved route |
| `/api/ai-providers/services/<service_id>/disable` | POST | `ai_routes.disable` | Disable route with reason |
| `/api/ai-providers/services/<service_id>/migration-status` | PUT | `ai_routes.system.manage` | Update migration_status |

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
('ai_routes.view',          'AI Routing', 'View service routing matrix and effective routes'),
('ai_routes.manage',        'AI Routing', 'Create and modify service route overrides'),
('ai_routes.test',          'AI Routing', 'Test a service route with a dry-run request'),
('ai_routes.disable',       'AI Routing', 'Disable a service route'),
('ai_routes.usage.view',    'AI Routing', 'View per-service usage and cost data'),
('ai_routes.system.manage', 'AI Routing', 'Manage system-scope routes and migration status'),
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

**Service routing permissions (see §23 for full table):**

| Permission | system-admin | org-admin |
|------------|:---:|:---:|
| `ai_routes.view` | ✅ | ✅ |
| `ai_routes.manage` | ✅ | org scope only |
| `ai_routes.test` | ✅ | ✅ |
| `ai_routes.disable` | ✅ | org scope only |
| `ai_routes.usage.view` | ✅ | ✅ |
| `ai_routes.system.manage` | ✅ | ❌ |

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

### Phase 2 — Backend JWT Routes + Service Routing Models (R035)
- [ ] `apps/ai_providers/api_routes.py` — all endpoints with `@jwt_required + g.jwt_user`
- [ ] Register `api_blueprint` in `apps/__init__.py`
- [ ] Add proxy mapping to `app/api/proxy/[...path]/route.ts`
- [ ] `scripts/migrations/versions/YYYYMMDD_add_ai_providers_permissions.py` — ai_providers.* + ai_routes.* permissions
- [ ] `scripts/migrations/versions/YYYYMMDD_add_ai_service_definitions.py` — `AIServiceDefinition` + `AIServiceProviderRoute` tables + seed data (27 services)
- [ ] `scripts/migrations/versions/YYYYMMDD_extend_ai_usage_log_routing.py` — `service_id`, `route_id`, `resolution_source`, `fallback_used`, `routing_scope` columns
- [ ] Update `registry.py` — add `resolve_service_route(org_id, module_id, feature_id, capability)` function with 9-step hierarchy
- [ ] Remove `provider_id`/`model` from public `GatewayRequest` fields; add `migration_mode` flag for admin use
- [ ] `GatewayResponse` — add `route_debug: RouteDebugInfo | None` field
- [ ] Service routing API endpoints in `api_routes.py` (10 new endpoints)
- [ ] Integration tests for all new endpoints
- [ ] `docs/system-upgrade/14-decision-log.md` — ADR-030 confirmed

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
- [ ] `app/(dashboard)/ai-providers/services/page.tsx` — Service Routing Matrix list (Section 11)
- [ ] `app/(dashboard)/ai-providers/services/[serviceId]/page.tsx` — Service route detail (Section 12)
- [ ] `app/(dashboard)/ai-providers/services/[serviceId]/edit/page.tsx` — Edit route (Section 13)
- [ ] TypeScript: `AIServiceDefinition`, `AIServiceProviderRoute`, `RouteDebugInfo`, `AIServiceUsage` in `lib/api/types.ts`
- [ ] Zod: `serviceRouteFormSchema` in `lib/modules/ai-providers/schemas.ts`
- [ ] Query keys: `queryKeys.aiRoutes.*` in `lib/api/query-keys.ts`
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

export interface AIServiceDefinition {
  service_id: string;
  module_id: string;
  feature_id: string;
  display_name: string;
  description: string | null;
  capability: string;
  owner_module: string | null;
  default_quota_bucket: string | null;
  pii_policy: "none" | "low" | "medium" | "high" | "critical";
  supports_streaming: boolean;
  supports_fallback: boolean;
  supports_user_override: boolean;
  migration_status: "gateway-routed" | "legacy-bypass" | "partially-migrated" | "pending" | "blocked";
  legacy_file: string | null;
  // Resolved effective route (joined at query time):
  effective_provider_id: number | null;
  effective_model: string | null;
  effective_scope: "system" | "org" | "module" | "feature" | "user" | null;
  route_id: number | null;
}

export interface AIServiceProviderRoute {
  id: number;
  service_id: string;
  scope: "system" | "org" | "module" | "feature" | "user";
  org_id: number | null;
  user_id: number | null;
  provider_id: number;
  model: string;
  fallback_provider_id: number | null;
  fallback_model: string | null;
  priority: number;
  is_enabled: boolean;
  temperature: number | null;
  max_tokens: number | null;
  timeout_seconds: number | null;
  retry_count: number;
  quota_bucket: string | null;
  billing_policy: "platform" | "byok" | "metered" | "free" | null;
  pii_policy: string | null;
  reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface RouteDebugInfo {
  service_id: string;
  route_id: number | null;
  resolution_source: "user_override" | "org_service" | "org_module" | "org_default" | "system_service" | "system_default" | "fallback_chain";
  provider_id: number;
  model: string;
  fallback_used: boolean;
  fallback_reason: string | null;
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

export const serviceRouteFormSchema = z.object({
  provider_id: z.number().positive(),
  model: z.string().min(1),
  fallback_provider_id: z.number().positive().optional(),
  fallback_model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().positive().int().optional(),
  timeout_seconds: z.number().positive().int().optional(),
  retry_count: z.number().min(0).max(5).int().default(1),
  quota_bucket: z.string().optional(),
  billing_policy: z.enum(["platform", "byok", "metered", "free"]).optional(),
  pii_policy: z.enum(["inherit", "none", "low", "medium", "high", "critical"]).default("inherit"),
  scope: z.enum(["system", "org"]), // frontend only shows scopes user can set
  is_enabled: z.boolean().default(true),
  reason: z.string().min(1, "Reason is required for production service route changes"),
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

---

## §16 — Service Routing Matrix: Core Rule

> **Rule R1:** No AI-consuming service may hardcode a provider, model, or API key in application code. Service code calls the gateway with `module_id`, `feature_id`, `capability`, and attribution fields only. Everything else is resolved from configuration.

> **Rule R2:** The `provider` and `model` fields of `GatewayRequest` are disabled by default. Override is only allowed in the admin test endpoint or during an explicitly audited migration mode. Any call that sets these fields outside of those contexts is rejected and logged as a violation.

This is the architectural principle that makes the Service Routing Matrix possible. Without it, the matrix is documentation only — with it, it is the enforced source of truth.

---

## §17 — Gap Analysis: Do Existing Models Support Service-Level Routing?

### Current model coverage

| Routing dimension | Current model | Key | Covers feature_id? |
|-------------------|---------------|-----|--------------------|
| Org-level capability default | `AIProviderDefault` | `(org_id, capability)` | ❌ |
| Module-level override | `AIModuleOverride` | `(org_id, module_name, capability)` | ❌ |
| User-level override | `AIUserOverride` | `(org_id, user_id, capability)` | ❌ |
| Fallback chain | `AIFallbackChain` | `(org_id, capability, priority)` | ❌ |
| Usage attribution | `AIUsageLog.feature_id` | free-form String(60) | no FK — not enforced |

### What is missing

1. **No service/feature registry.** `feature_id` in `AIUsageLog` is a free-form string — there is no table that declares what services exist, what capabilities they use, or what their default routing should be. No PII policy, migration status, or streaming flag exists anywhere per service.

2. **`AIModuleOverride` resolves at `(module_name, capability)` — not `(module_name, feature_id, capability)`.** This means all features within the same module+capability share one provider. Example: `helpdesk.ticket_summarization` and `helpdesk.screen_analysis` both use `chat` capability — they cannot have different providers today.

3. **No model parameters per service.** `config_override` JSONB on `AIModuleOverride` can hold temperature/max_tokens, but it is unvalidated free-form JSON, not a typed schema.

4. **`AIFallbackChain` scoped to `(org_id, capability)` only.** Feature-level fallback chains do not exist.

5. **Resolution in `registry.py` currently ignores `feature_id`.** The `resolve_provider(org_id, capability, module_name)` function has no `feature_id` parameter.

### Verdict

The existing models support **module-level** routing but not **feature/service-level** routing. Two new models are required.

`AIModuleOverride` is NOT replaced — it remains as the coarser-grained fallback level. The new `AIServiceProviderRoute` adds a finer-grained resolution step above it in the hierarchy.

---

## §18 — New Backend Models

### Model A: `AIServiceDefinition`

Registry of every AI-consuming service/feature in the platform. Authoritative source for the Service Routing Matrix. Populated at deploy time from a seed file; editable by system-admin via Hub.

**Table:** `ai_service_definitions`

| Column | Type | Notes |
|--------|------|-------|
| `id` | BigInteger PK | |
| `service_id` | String(100) UNIQUE | e.g. `helpdesk.ticket_summarization`, `voice.reply_generation` |
| `module_id` | String(60) NOT NULL | e.g. `helpdesk`, `voice_support` |
| `feature_id` | String(60) NOT NULL | e.g. `ticket_summarization`, `reply_generation` |
| `display_name` | String(120) NOT NULL | Human-readable e.g. "Helpdesk Ticket Summarization" |
| `description` | Text | What this service does |
| `capability` | String(40) NOT NULL | `chat`, `embedding`, `transcription`, `tts`, `vision`, `rerank` |
| `owner_module` | String(60) | Module responsible for maintaining this service |
| `default_quota_bucket` | String(60) | Default quota bucket for billing (e.g. `helpdesk_ai`, `voice_ai`) |
| `pii_policy` | String(30) | `none`, `low`, `medium`, `high`, `critical` |
| `supports_streaming` | Boolean DEFAULT false | Whether this service uses streaming responses |
| `supports_fallback` | Boolean DEFAULT true | Whether fallback chain applies |
| `supports_user_override` | Boolean DEFAULT false | Whether per-user routing is allowed |
| `migration_status` | String(30) DEFAULT `pending` | `gateway-routed`, `legacy-bypass`, `partially-migrated`, `pending`, `blocked` |
| `legacy_file` | String(200) | Path to legacy bypass file, if any (for migration tracking) |
| `created_at` | DateTime | |
| `updated_at` | DateTime | |

Unique constraint: `(module_id, feature_id)`.

**Notes:**
- System-seeded — a `seeds/ai_service_definitions.py` file (or migration data fixture) populates all known services at deploy time.
- `migration_status` is managed by system-admins via Hub; updated as P0/P1/P2 migrations are completed.
- This table has no `org_id` — it is system-level. Org-specific routing is in `AIServiceProviderRoute`.

---

### Model B: `AIServiceProviderRoute`

Maps a service/feature to provider+model+params for a specific scope. This is the feature-level equivalent of `AIModuleOverride` + model parameters.

**Table:** `ai_service_routes`

| Column | Type | Notes |
|--------|------|-------|
| `id` | BigInteger PK | |
| `service_id` | String(100) NOT NULL FK → `ai_service_definitions.service_id` | |
| `scope` | String(20) NOT NULL | `system`, `org`, `module`, `feature`, `user` |
| `org_id` | Integer NULLABLE | NULL = system scope |
| `user_id` | Integer NULLABLE | Only for `user` scope |
| `provider_id` | BigInteger NOT NULL FK → `ai_providers.id` | |
| `model` | String(80) NOT NULL | |
| `fallback_provider_id` | BigInteger NULLABLE FK → `ai_providers.id` | First fallback (direct 1:1 override) |
| `fallback_model` | String(80) NULLABLE | |
| `priority` | Integer DEFAULT 0 | Lower = higher priority for same scope+service |
| `is_enabled` | Boolean DEFAULT true | |
| `temperature` | Float NULLABLE | Overrides provider default |
| `max_tokens` | Integer NULLABLE | Overrides provider default |
| `timeout_seconds` | Integer NULLABLE | Overrides gateway default |
| `retry_count` | Integer DEFAULT 1 | |
| `quota_bucket` | String(60) NULLABLE | Overrides service default_quota_bucket |
| `billing_policy` | String(30) NULLABLE | `platform`, `byok`, `metered`, `free` |
| `pii_policy` | String(30) NULLABLE | Overrides service pii_policy |
| `metadata` | JSON | Free-form extra config |
| `reason` | Text | Why this override was created |
| `created_at` | DateTime | |
| `updated_at` | DateTime | |

Unique constraint: `(service_id, scope, org_id, user_id)` — one active route per service+scope combination.

**Notes:**
- `scope = 'system'`: `org_id = NULL`, `user_id = NULL`. Managed by system-admin only.
- `scope = 'org'`: `org_id` set, `user_id = NULL`. Org-admin can manage if BYOK enabled.
- `scope = 'user'`: `org_id` + `user_id` set. Only allowed if `AIServiceDefinition.supports_user_override = true`.
- When `scope = 'system'` and `org_id = NULL`, this is the system default for that service — equivalent to what is currently hardcoded or resolved via `AIModuleOverride`.

### Relationship between new and existing models

```
AIServiceDefinition (service registry — system-level)
  ↕
AIServiceProviderRoute (feature-level routing — system or org scope)
  ↕
AIModuleOverride (module-level fallback — kept for backwards compat)
  ↕
AIProviderDefault (capability-level fallback)
  ↕
AIFallbackChain (multi-step fallback per capability)
```

`AIModuleOverride` is NOT deprecated. It remains the correct tool when an entire module (all its features) should use a different provider. `AIServiceProviderRoute` is used when a specific feature within a module needs distinct routing.

---

## §19 — Routing Resolution Order

When the gateway receives `GatewayRequest(org_id, module_id, feature_id, capability)`, it resolves the provider in this exact order. First match wins.

```
1. user override
   AIServiceProviderRoute WHERE scope='user' AND service_id={module_id}.{feature_id}
                            AND org_id={org_id} AND user_id={user_id}
   — Only if AIServiceDefinition.supports_user_override = true

2. org + service/feature override
   AIServiceProviderRoute WHERE scope='org' AND service_id={module_id}.{feature_id}
                            AND org_id={org_id}

3. org + module override
   AIModuleOverride WHERE org_id={org_id} AND module_name={module_id}
                      AND capability={capability}

4. org capability default
   AIProviderDefault WHERE org_id={org_id} AND capability={capability}

5. system service/feature override
   AIServiceProviderRoute WHERE scope='system' AND service_id={module_id}.{feature_id}

6. system module default (if system-scoped AIModuleOverride exists — future use)

7. system capability default
   AIProviderDefault WHERE org_id=SYSTEM_ORG AND capability={capability}
   — Uses system-level org_id (0 or special constant) for system defaults

8. fallback chain (if primary fails)
   AIFallbackChain WHERE org_id={org_id} AND capability={capability}
   — sorted by priority, skipping OPEN circuit breakers

9. fail closed
   — GatewayResponse.status = 'no_provider_configured'
   — Error logged; no silent fallback to hardcoded provider
```

**Important rules:**
- Step 9 (fail-closed) is never skipped. If no provider is configured for a service, the gateway raises a `NoProviderConfiguredError`, not a silent fallback to a hardcoded model.
- Steps 1–5 check `AIServiceProviderRoute.is_enabled = true` and circuit breaker CLOSED.
- Steps 3–4 check `AIModuleOverride` / `AIProviderDefault` as before (existing registry behavior unchanged for these steps).
- Routing decisions are logged in `AIUsageLog` (see §20 — new fields).
- Redis cache: resolved route cached for 60s per `(org_id, module_id, feature_id, capability)` key. Cache invalidated on any write to `AIServiceProviderRoute`, `AIModuleOverride`, `AIProviderDefault` for the affected org.

---

## §20 — Gateway Integration Changes

### GatewayRequest changes

```python
@dataclass
class GatewayRequest:
    org_id: int
    user_id: int
    module_id: str         # e.g. "helpdesk"
    feature_id: str        # e.g. "ticket_summarization"
    capability: str        # e.g. "chat"
    messages: list[dict]
    session_id: str | None = None
    conversation_id: str | None = None
    # Disabled by default — only allowed in admin test mode or migration mode:
    # provider_id: int | None = None  ← REMOVED from public API
    # model: str | None = None        ← REMOVED from public API
    non_billable: bool = False         # test environments only
```

**Breaking change from current design:** `provider_id` and `model` fields are removed from the public `GatewayRequest`. Callers that currently pass these are hardcoding routing — they must be refactored to use `module_id + feature_id`. A migration mode flag will exist for temporary use during P0 migrations.

### GatewayResponse additions

```python
@dataclass
class GatewayResponse:
    output_text: str
    usage_log_id: int
    # New fields:
    route_debug: RouteDebugInfo | None = None  # Only included if caller has ai_routes.view permission + debug=true param
```

```python
@dataclass
class RouteDebugInfo:
    service_id: str          # "helpdesk.ticket_summarization"
    route_id: int | None     # AIServiceProviderRoute.id used, if any
    resolution_source: str   # "user_override" | "org_service" | "org_module" | "org_default" | "system_service" | "system_default" | "fallback_chain"
    provider_id: int
    model: str
    fallback_used: bool
    fallback_reason: str | None
```

### AIUsageLog additions (migration required)

New columns for service routing attribution:

| Column | Type | Notes |
|--------|------|-------|
| `service_id` | String(100) NULLABLE | FK → `ai_service_definitions.service_id` |
| `route_id` | BigInteger NULLABLE | `AIServiceProviderRoute.id` used, if applicable |
| `resolution_source` | String(30) NULLABLE | Which level of hierarchy was used |
| `fallback_used` | Boolean DEFAULT false | Was a fallback provider used? |
| `fallback_reason` | String(80) NULLABLE | Circuit open / timeout / error |
| `routing_scope` | String(20) NULLABLE | `system`, `org`, `module`, `feature`, `user` |

These columns are additive — existing rows keep `NULL` values for these fields.

---

## §21 — Service Routing: Hub Sections (UI Design)

### Section 11 — Service Routing Matrix

**Route:** `app/(dashboard)/ai-providers/services/page.tsx`

**Data source:** `GET /api/ai-providers/services`

DataTable columns:

| Column | Notes |
|--------|-------|
| Service | `display_name` (service_id as subtitle) |
| Module | `module_id` |
| Feature | `feature_id` |
| Capability | Badge: chat / embedding / transcription / tts / vision |
| Provider / Model | Resolved effective route (primary) |
| Fallback | Fallback provider/model if configured |
| Scope | Badge: system / org / feature / user |
| Enabled | Toggle (manage permission required) |
| PII Policy | Badge: none / low / medium / high / critical |
| Streaming | Boolean badge |
| Monthly Usage | `total_calls` for current month |
| Monthly Cost | `cost_usd` for current month |
| Health | Provider circuit state dot |
| Migration | Badge: gateway-routed / legacy-bypass / partially-migrated / pending / blocked |
| Actions | View / Edit Route / Test Route / Disable / View Usage |

**Filters:** Module, Capability, Migration Status, Scope, PII Policy, Health

---

### Section 12 — Service Route Detail

**Route:** `app/(dashboard)/ai-providers/services/[serviceId]/page.tsx`

Layout: `PageShell` + `DetailView`

Panels:
1. **Service metadata** — `InfoRow` grid: service_id, module, feature, capability, owner, PII policy, streaming, fallback enabled
2. **Current effective route** — provider name, model, scope source (with resolution path trace)
3. **Active route configuration** — temperature, max_tokens, timeout, retry_count, quota_bucket, billing_policy
4. **Fallback chain** — direct fallback from route + capability-level fallback chain steps
5. **Usage & cost** — StatCard: calls this month / cost this month / avg latency; sparkline chart
6. **Recent errors** — last 10 error rows from `AIUsageLog WHERE service_id=...`
7. **Fallback events** — last 10 rows where `fallback_used=true`
8. **Audit history** — `record_activity()` entries for this service route
9. **Migration status** — current status badge + legacy file path (if any) + link to doc 41 migration plan

**API:** `GET /api/ai-providers/services/<service_id>`, `GET /api/ai-providers/services/<service_id>/usage`, `GET /api/ai-providers/services/<service_id>/audit`

---

### Section 13 — Edit Service Route

**Route:** `app/(dashboard)/ai-providers/services/[serviceId]/edit/page.tsx`

Layout: `PlatformForm` + Zod schema in `lib/modules/ai-providers/schemas.ts`

Form fields:

| Field | Input | Notes |
|-------|-------|-------|
| Provider | Select (from `/api/ai-providers/available?capability={cap}`) | Required |
| Model | Text/Select | Required |
| Fallback Provider | Select (optional) | |
| Fallback Model | Text/Select (optional) | |
| Temperature | Number 0.0–2.0 (optional) | |
| Max Tokens | Number (optional) | |
| Timeout (seconds) | Number (optional) | |
| Retry Count | Number 0–5 (optional) | |
| Quota Bucket | Text (optional) | |
| Billing Policy | Select: platform / byok / metered / free | |
| PII Policy Override | Select: inherit / none / low / medium / high / critical | |
| Scope | Select: system / org (system-admin chooses; org-admin gets org only) | |
| Enabled | Toggle | |
| Reason | Text area | Required for production services |

**Dangerous change rules:**
- Changing provider/model for a `gateway-routed` service → `ConfirmActionDialog` with service display_name shown
- Disabling a route → `ConfirmActionDialog`
- Setting scope to `system` → requires `ai_routes.system.manage`
- All mutations → `record_activity()` with before/after snapshot

---

## §22 — Service Routing API Additions

Add to `apps/ai_providers/api_routes.py` (R035):

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/ai-providers/services` | GET | `ai_routes.view` | List all service definitions + effective routes |
| `/api/ai-providers/services/<service_id>` | GET | `ai_routes.view` | Service detail + current route |
| `/api/ai-providers/services/<service_id>/usage` | GET | `ai_routes.usage.view` | Usage/cost for this service |
| `/api/ai-providers/services/<service_id>/audit` | GET | `ai_routes.view` | Audit history for route changes |
| `/api/ai-providers/services/<service_id>/route` | POST | `ai_routes.manage` | Create service route override |
| `/api/ai-providers/services/<service_id>/route` | PUT | `ai_routes.manage` | Update service route |
| `/api/ai-providers/services/<service_id>/route` | DELETE | `ai_routes.manage` | Delete service route (revert to parent scope) |
| `/api/ai-providers/services/<service_id>/test` | POST | `ai_routes.test` | Test route with dry-run request |
| `/api/ai-providers/services/<service_id>/disable` | POST | `ai_routes.disable` | Disable route with reason |
| `/api/ai-providers/services/<service_id>/migration-status` | PUT | `ai_routes.system.manage` | Update migration_status field |

Add to query-keys:
```ts
aiRoutes: {
  list: (orgId: string) => ["ai-routes", "list", orgId],
  detail: (serviceId: string) => ["ai-routes", "detail", serviceId],
  usage: (serviceId: string, period: string) => ["ai-routes", "usage", serviceId, period],
  audit: (serviceId: string) => ["ai-routes", "audit", serviceId],
}
```

---

## §23 — Service Routing Permissions

Add to `§07` permissions migration:

```sql
('ai_routes.view',          'AI Routing', 'View service routing matrix and effective routes'),
('ai_routes.manage',        'AI Routing', 'Create and modify service route overrides'),
('ai_routes.test',          'AI Routing', 'Test a service route with a dry-run request'),
('ai_routes.disable',       'AI Routing', 'Disable a service route'),
('ai_routes.usage.view',    'AI Routing', 'View per-service usage and cost data'),
('ai_routes.system.manage', 'AI Routing', 'Manage system-scope routes and migration status'),
```

| Permission | system-admin | org-admin | operator | technician |
|------------|:---:|:---:|:---:|:---:|
| `ai_routes.view` | ✅ | ✅ | ❌ | ❌ |
| `ai_routes.manage` | ✅ | org scope only | ❌ | ❌ |
| `ai_routes.test` | ✅ | ✅ | ❌ | ❌ |
| `ai_routes.disable` | ✅ | org scope only | ❌ | ❌ |
| `ai_routes.usage.view` | ✅ | ✅ | ❌ | ❌ |
| `ai_routes.system.manage` | ✅ | ❌ | ❌ | ❌ |

Rules:
- Org-admin can create `scope='org'` routes for their org only — cannot create `scope='system'` routes
- `ai_routes.system.manage` required to update `migration_status` field
- No one can set `provider_id` or `model` directly in `GatewayRequest` (it is removed from the public API)
- `ai_routes.test` allows sending a dry-run request through the resolved route — response is returned but not logged as billable

---

## §24 — Service Routing: Known Services (Seed Data)

Canonical list of all AI-consuming services in the platform. This is the seed file for `ai_service_definitions`. Migration status reflects the state as of doc 41 audit (2026-04-24).

| service_id | module_id | feature_id | capability | pii_policy | streaming | migration_status | legacy_file |
|------------|-----------|------------|------------|------------|-----------|-----------------|-------------|
| `helpdesk.ticket_summarization` | helpdesk | ticket_summarization | chat | medium | false | pending | — |
| `helpdesk.screen_analysis` | helpdesk | screen_analysis | vision | high | false | legacy-bypass | `apps/helpdesk/services/screen_analyzer.py` |
| `helpdesk.vision_description` | helpdesk | vision_description | vision | high | false | legacy-bypass | `apps/helpdesk/services/vision_service.py` |
| `helpdesk.incident_memory_embed` | helpdesk | incident_memory_embed | embedding | low | false | legacy-bypass | `apps/helpdesk/services/incident_memory_service.py` |
| `voice.reply_generation` | voice_support | reply_generation | chat | medium | true | legacy-bypass | `apps/voice_support/call_manager.py` |
| `voice.transcription` | voice_support | transcription | transcription | high | false | pending | — |
| `floating_assistant.page_explanation` | floating_assistant | page_explanation | chat | low | true | pending | — |
| `floating_assistant.action_planning` | floating_assistant | action_planning | chat | medium | false | pending | — |
| `ai_action.parameter_extraction` | ai_agents | parameter_extraction | chat | medium | false | pending | — |
| `ai_action.safe_result_summary` | ai_agents | safe_result_summary | chat | medium | false | legacy-bypass | `apps/ai_agents/engine/agent_runner.py` |
| `knowledge.embedding` | knowledge | embedding | embedding | low | false | pending | — |
| `knowledge.rag_answer` | knowledge | rag_answer | chat | medium | false | pending | — |
| `jira.issue_summary` | jira_integration | issue_summary | chat | medium | false | legacy-bypass | `apps/jira_integration/ai_service.py` |
| `jira.troubleshooting` | jira_integration | troubleshooting | chat | low | false | legacy-bypass | `apps/jira_integration/troubleshooting_service.py` |
| `jira.devops_analysis` | jira_integration | devops_analysis | chat | low | false | legacy-bypass | `apps/jira_integration/devops_ai_service.py` |
| `personal_info.chat` | personal_info | chat | chat | critical | true | legacy-bypass | `apps/personal_info/ai_chat/providers/openai_provider.py` |
| `personal_info.transcription` | personal_info | transcription | transcription | high | false | legacy-bypass | `apps/personal_info/services/transcription_service.py` |
| `personal_info.document_recognition` | personal_info | document_recognition | vision | critical | false | legacy-bypass | `apps/personal_info/document_recognition_service.py` |
| `personal_info.task_ai` | personal_info | task_ai | chat | high | false | legacy-bypass | `apps/personal_info/task_ai_service.py` |
| `personal_info.memory_embedding` | personal_info | memory_embedding | embedding | high | false | legacy-bypass | `apps/personal_info/services/memory_indexing_service.py` |
| `personal_info.secretary` | personal_info | secretary | chat | high | false | legacy-bypass | `apps/personal_info/services/secretary_service.py` |
| `personal_info.rag_answer` | personal_info | rag_answer | chat | high | false | legacy-bypass | `apps/personal_info/services/rag_answer_service.py` |
| `ala.commitment_extraction` | ala | commitment_extraction | chat | medium | false | legacy-bypass | `apps/ala/tasks/commitment_task.py` |
| `ala.text_session` | ala | text_session | chat | medium | false | partially-migrated | `apps/ala/text_session.py` |
| `ops_intelligence.rag_indexing` | ops_intelligence | rag_indexing | embedding | low | false | legacy-bypass | `apps/ops_intelligence/services/ops_rag_indexer.py` |
| `ops_intelligence.catalog_bootstrap` | ops_intelligence | catalog_bootstrap | chat | low | false | legacy-bypass | `apps/ops_intelligence/tools/bootstrap_catalog.py` |
| `life_assistant.transcription` | life_assistant | transcription | transcription | high | false | legacy-bypass | `apps/life_assistant/services/recording_transcriber.py` |

---

## §25 — Migration Status Linkage (doc 41 bridge)

The `migration_status` field in `AIServiceDefinition` is the canonical source of truth for migration tracking. It replaces the manual tracking table in doc 41 §09 as the system evolves.

**Status values and their meaning:**

| Status | Meaning |
|--------|---------|
| `gateway-routed` | Service calls `AIProviderGateway.call()` — fully migrated. Route managed from Hub. |
| `partially-migrated` | Some call sites migrated, some still bypass. |
| `legacy-bypass` | Service still calls provider SDK directly. Provider/model is hardcoded in code. |
| `pending` | Service not yet implemented (new service), or scheduled for migration. |
| `blocked` | Migration blocked by dependency (e.g., gateway doesn't support this capability yet). |

**Hub migration status page (`/ai-providers/migration`)** now shows this per-service table directly from `AIServiceDefinition`, not from a static scan report. The `check_no_direct_llm_imports.py` CI scan remains for enforcement — it detects code-level violations. The Hub page shows the operational state.

**Linkage rule:** When `check_no_direct_llm_imports.py` finds zero violations for a module's files, and the gateway is integrated, system-admin updates `migration_status → 'gateway-routed'` in the Hub. This closes the loop between CI enforcement and operational state.

---

## §26 — Updated Open Questions

_(Extends §13)_

| # | Question | Decision needed by | Owner |
|---|----------|--------------------|-------|
| OQ-08 | `AIServiceDefinition` seed file: where does it live? `scripts/seeds/ai_service_definitions.py` run at deploy, or as a migration data fixture? | R035 backend | Architecture |
| OQ-09 | `resolve_provider()` in `registry.py`: add `feature_id` parameter to existing function, or create a new `resolve_service_route()` function that calls the old function as fallback? Prefer new function for clean separation. | R035 backend | Architecture |
| OQ-10 | When a service is `legacy-bypass`, the gateway is not called at all — so `AIServiceDefinition` has no usage data. How does the Hub show usage for legacy-bypass services? Options: (a) show zero, (b) show `AIUsageLog` rows matched by `module_name + feature_id` string match (brittle), (c) require migration before showing usage. | R035 | Architecture |
| OQ-11 | `AIServiceProviderRoute` cache invalidation: invalidate per `(org_id, module_id, feature_id, capability)`. Redis key pattern? Suggest `svc_route:{org_id}:{module_id}:{feature_id}:{capability}`. | R035 backend | Architecture |
| OQ-12 | Admin test endpoint: what is the exact mechanism for allowing `provider_id`/`model` override during migration mode? Flag in request headers (`X-Migration-Mode: true`) + `ai_routes.system.manage` permission + full audit log. Confirm. | R035 | Security |

---

## §27 — Updated Acceptance Criteria for Service Routing

_(Extends §14)_

### R035 — Service routing backend complete when:
- [ ] `AIServiceDefinition` and `AIServiceProviderRoute` tables exist (migration)
- [ ] Seed data for all 27 known services is loaded at deploy
- [ ] `resolve_provider()` / new `resolve_service_route()` checks `AIServiceProviderRoute` before `AIModuleOverride`
- [ ] `GatewayRequest` no longer accepts `provider_id` or `model` fields (removed)
- [ ] `AIUsageLog` has `service_id`, `route_id`, `resolution_source`, `fallback_used`, `routing_scope` columns (migration)
- [ ] `GatewayResponse` includes `route_debug` for admin test endpoint only
- [ ] 9-level routing resolution order implemented in `registry.py`
- [ ] Step 9 (fail-closed) raises `NoProviderConfiguredError` — never silent fallback
- [ ] All service routing endpoints in `api_routes.py` respond to JWT auth
- [ ] All service route mutations call `record_activity()` with before/after snapshot

### R036 — Service routing UI core complete when:
- [ ] Service Routing Matrix page (`/ai-providers/services`) shows all 27 services with effective routes
- [ ] Service detail page shows resolution_source and route_debug fields for system-admin
- [ ] Migration status badges visible; system-admin can update status via dropdown
- [ ] Edit route form validates with Zod before submit
- [ ] Dangerous changes (provider change on gateway-routed service) use `ConfirmActionDialog`
- [ ] `PermissionGate` hides system-scope management from org-admins

---

## §28 — ADR-030: AI Service-to-Provider Routing Matrix

**Context:** The platform has 27+ AI-consuming services/features across 10+ modules. Provider/model selection is currently either hardcoded in service code (legacy-bypass) or resolved at module+capability granularity (`AIModuleOverride`). Features within the same module+capability cannot have different providers. Service code sometimes sets `provider_id`/`model` directly in `GatewayRequest`, which bypasses configuration and makes routing untraceable.

**Decision:** Introduce `AIServiceDefinition` (service registry) and `AIServiceProviderRoute` (feature-level routing) to enable configuration-driven provider/model resolution at the service/feature level. Remove `provider_id` and `model` from the public `GatewayRequest` API. Define a 9-step resolution hierarchy that consults service routes → module overrides → capability defaults → fallback chain → fail-closed.

**Rules:**
- Service code calls gateway with `module_id`, `feature_id`, `capability` only — never hardcodes provider/model.
- `GatewayRequest.provider_id` and `GatewayRequest.model` are removed from the public API.
- Exception: admin test endpoint + explicit migration mode (`X-Migration-Mode` header + `ai_routes.system.manage`) for temporary use during P0 migrations.
- Step 9 is non-negotiable: if no provider is configured, the gateway fails closed with `NoProviderConfiguredError`.

**Why not replace `AIModuleOverride`?** Module-level overrides remain valid for coarse-grained routing (all features in a module use the same provider). Service-level routes add granularity on top. Both coexist in the resolution hierarchy.

**Migration impact:** All 27 services in `AIServiceDefinition` seed data. Migration status tracked per service. `AIUsageLog` extended with 5 new attribution columns.

**Alternatives considered:**
- Extend `AIModuleOverride` to include `feature_id`: rejected — this changes the semantics of an existing model, risks breaking the existing registry resolution logic.
- Use `config_override` JSONB on `AIModuleOverride` to store per-feature model: rejected — unvalidated, invisible to the Hub UI, unindexable.
- Keep `provider_id`/`model` on `GatewayRequest` but add auditing: rejected — defeats the purpose of config-driven routing; code still determines routing.

**Affected modules:** `apps/ai_providers/` (models, registry, gateway, api_routes), all 10+ AI-consuming modules (must remove hardcoded provider/model params from GatewayRequest calls), `lib/api/ai-providers.ts`, `app/(dashboard)/ai-providers/services/`.

---

_Document version: 2.0 — Round 034 follow-up, 2026-04-25_
_Changes from v1.0: Added §16–§28 (Service Routing Matrix design, new backend models, routing resolution order, Gateway changes, UI sections, permissions, seed data, migration linkage, ADR-030)_
_Next update: after Phase 2 backend routes are written (R035)_
