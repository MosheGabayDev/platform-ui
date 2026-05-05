# PlatformSettings Engine — Backend Contract Spec (cap 16)

> **Status:** spec drafted 2026-05-05 (Phase 1.2 of GENERIC_AI_PLATFORM_PROGRESS).
> Backend MUST adopt this contract verbatim before MOCK flip.
>
> **Why this matters:** Settings Engine is where every tenant configures their AI behavior — system prompt, default model, rate limits, branding, integration credentials. Without it, every tenant is on the same defaults and the platform is not multi-tenant in any meaningful sense. This is the highest-priority cap for "generic AI for businesses".

---

## 1. Concept

A **setting** is a single configuration value scoped to a level (system / plan / org / user). Each setting has:

- A **definition** — schema-validated key with type, label, category, scopes-it-applies-to, sensitivity flag.
- **Stored values** at one or more scope levels.
- A **resolver** that walks the scope hierarchy (most-specific first) to compute the effective value.

This is the *settings cousin* of feature flags (cap 17). Differences:
- Settings carry typed values (string, int, bool, JSON, secret), not just booleans.
- Settings have schemas (Zod / JSON-Schema) that the backend enforces on write.
- Settings can be sensitive (API keys, OAuth tokens) — these MUST be redacted on read.

---

## 2. Resolution hierarchy

Same shape as feature flags:

```
user override   →   org override   →   plan default   →   system default
```

| Source | Set by | When it applies |
|---|---|---|
| `user` | end user (preferences) or system_admin (debug) | Per-user UI choices: theme, locale, notification prefs |
| `org` | org admin or system_admin | Per-tenant config: AI provider, system prompt, rate limits |
| `plan` | platform team | Plan-tier limits: max API keys, max users |
| `system` | platform team | Hard defaults |

Not every setting applies at every scope. Each `SettingDefinition` declares which scopes are valid (`allowed_scopes: ("user" | "org" | "plan" | "system")[]`).

---

## 3. Setting types

| `type` | TypeScript shape | Storage | Notes |
|---|---|---|---|
| `string` | `string` | text column | Max length per-definition. |
| `int` | `number` | int column | Optional min/max. |
| `bool` | `boolean` | bool column | Strict — `null` means "no override". |
| `json` | `Record<string, unknown>` or array | jsonb column | Schema validated against `definition.schema`. |
| `secret` | `string` (input only) | encrypted text column | NEVER returned in plaintext. Read returns `{ has_value: true, masked: "sk-...XYZ" }`. |
| `enum` | `string` from a list | text column | `definition.allowed_values: string[]`. |

Frontend `SettingValue` is a discriminated union by `type`.

---

## 4. Endpoints

### 4.1 — Get a single setting (read path)

```
GET /api/proxy/settings/<key>
```

**Response (200):**
```jsonc
{
  "success": true,
  "data": {
    "key": "ai.system_prompt",
    "type": "string",
    "value": "You are a helpful operations assistant for {org_name}.",
    "source": "org",
    "is_sensitive": false
  }
}
```

For `type: "secret"`:
```jsonc
{
  "success": true,
  "data": {
    "key": "ai.openai_api_key",
    "type": "secret",
    "has_value": true,
    "masked": "sk-...XYZ",
    "source": "org",
    "is_sensitive": true
  }
}
```

### 4.2 — Bulk get by category

```
GET /api/proxy/settings/category/<category>
```

Returns all settings in a category in one round-trip. Used by admin UIs.

### 4.3 — List definitions

```
GET /api/proxy/settings/definitions
```

Returns every defined setting key with its schema, allowed scopes, category, etc. Admin UI uses this to render the form tree.

### 4.4 — Set a value

```
PUT /api/proxy/settings/<key>
```

**Request body:**
```jsonc
{
  "scope": "org",         // "user" | "org" | "plan" | "system"
  "scope_id": 1,
  "value": "You are a helpful operations assistant.",
  "reason": "Updated tone for Q2 enablement"
}
```

For `secret`: `value` is the new plaintext (server encrypts at rest). Pass `null` to clear.

**Response:** the new effective `SettingResponse` for the affected scope.

**Audit:** every write emits a PlatformAuditLog entry with `category=admin`, `action=setting.set` or `setting.clear`. For sensitive values, `metadata.value_changed: true` (the value itself is NEVER in the audit log).

### 4.5 — Clear an override

`PUT /<key>` with `value: null` — falls back to the next scope down.

---

## 5. Multi-tenant safety

- `org_id` derived from session.
- Cross-tenant write attempts (org A admin writing scope=org, scope_id=orgB) MUST 403.
- Sensitive setting writes are restricted to roles declared in `definition.write_roles`. Default: `["org_admin", "system_admin"]`.
- Read of a sensitive setting returns `masked` only; full plaintext is **never** transmitted to the frontend.

---

## 6. Schema (Postgres)

```sql
CREATE TABLE setting_definitions (
  key VARCHAR(120) PRIMARY KEY,
  label VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(60) NOT NULL,
  type VARCHAR(20) NOT NULL,
  -- JSON schema for validation; null for primitive types with no extra constraints
  schema JSONB,
  allowed_scopes TEXT[] NOT NULL,
  is_sensitive BOOLEAN NOT NULL DEFAULT false,
  default_value JSONB,
  write_roles TEXT[] NOT NULL DEFAULT ARRAY['org_admin','system_admin'],
  introduced_in_version VARCHAR(40),
  deprecated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE setting_values (
  scope VARCHAR(10) NOT NULL,        -- 'user' | 'org' | 'plan' | 'system'
  scope_id BIGINT,                    -- nullable for 'system'
  setting_key VARCHAR(120) NOT NULL REFERENCES setting_definitions(key),
  value JSONB,                        -- non-secret values
  encrypted_value BYTEA,              -- secret values (KMS-wrapped)
  set_by_user_id BIGINT,
  set_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT,
  PRIMARY KEY (scope, scope_id, setting_key)
);

CREATE INDEX idx_setting_values_lookup
  ON setting_values (setting_key, scope, scope_id);
```

---

## 7. Performance budget

- `GET /<key>` p95 ≤ 30ms.
- Bulk by category p95 ≤ 100ms (up to ~30 settings per category).
- Frontend cache: TanStack Query `staleTime: 5 * 60_000`.
- Cache invalidation: same as feature-flags — emit `setting.changed` SSE event when cap 23 ships; until then, refetch on focus.

---

## 8. Schema validation

- `type=string` definitions MAY include `schema: { maxLength, minLength, pattern }`.
- `type=int`: `{ min, max }`.
- `type=enum`: `{ allowed_values: string[] }`.
- `type=json`: full JSON-Schema (limited to draft-07).
- Frontend uses Zod schemas built from `definition.schema` for client-side validation; backend validates again as authoritative.
- Validation failures return `400 { success: false, message, errors: [...] }`.

---

## 9. Sensitive value handling

- Server uses KMS-wrapped envelope encryption for secrets.
- Plaintext exists only at the moment of write (PUT) and at the moment the AI gateway uses the secret to call an external API. Never serialized to logs.
- Read returns `{ has_value, masked }` — masked is the last 4 chars prefixed with type-appropriate hint (`sk-...XYZ`, `Bearer ...XYZ`, etc).
- Admin UI shows the masked value with a "Replace" button that clears the field for re-entry. There is no "reveal" affordance.

---

## 10. Initial setting catalog (Phase 1)

These ship with the platform. More can be added per-cap as needed.

### Category: `ai`

| Key | Type | Scopes | Default | Description |
|---|---|---|---|---|
| `ai.system_prompt` | string | org, system | "You are a helpful operations assistant." | Prepended to every AI conversation. |
| `ai.default_model` | enum | org, plan, system | `claude-sonnet-4-6` | Which LLM model to use. allowed_values from cap 25. |
| `ai.persona_name` | string | org, system | "Platform Assistant" | Display name for the AI. |
| `ai.max_tokens_per_message` | int | org, plan, system | 2048 | Hard cap per response. |
| `ai.openai_api_key` | secret | org | — | Org-supplied OpenAI key (when using BYO-key). |
| `ai.anthropic_api_key` | secret | org | — | Org-supplied Anthropic key. |
| `ai.tools_allowlist` | json | org, system | `["helpdesk.ticket.*"]` | Action ID glob patterns the AI is allowed to propose. |

### Category: `branding`

| Key | Type | Scopes | Default | Description |
|---|---|---|---|---|
| `branding.org_name` | string | org | — | Display name (overrides org.name for UI). |
| `branding.accent_color` | enum | org, user | `cyan` | Theme accent color. |
| `branding.logo_url` | string | org | — | URL of the org logo. |

### Category: `notifications`

| Key | Type | Scopes | Default | Description |
|---|---|---|---|---|
| `notifications.email_enabled` | bool | user, org, system | true | Email notification opt-in. |
| `notifications.slack_webhook` | secret | org | — | Slack incoming webhook URL. |
| `notifications.escalation_minutes` | int | org, system | 30 | Minutes before escalating an unacknowledged ticket. |

### Category: `rate_limits`

| Key | Type | Scopes | Default | Description |
|---|---|---|---|---|
| `rate_limits.api_requests_per_minute` | int | plan, system | 600 | Per-org API rate limit. |
| `rate_limits.ai_messages_per_day` | int | plan, system | 1000 | Per-org daily AI message cap. |

---

## 11. MOCK_MODE flip checklist

- [ ] Migrations applied (2 tables + 4 indexes)
- [ ] Definitions seeded for the 13 settings above
- [ ] CRUD endpoints registered with the response shapes
- [ ] Encryption / KMS wired for secret values
- [ ] Cross-tenant write guard tested
- [ ] Audit emission for every write verified (NEVER includes plaintext for secrets)
- [ ] p95 latency measured ≤ 30ms
- [ ] Frontend: flip `MOCK_MODE = false` in `lib/api/settings.ts`

---

## 12. Open questions (Q-S-*)

- **Q-S-1** — Should setting changes be scheduled (apply at a future timestamp)? Recommendation: NO for v1. Add `effective_at` later if a tenant needs scheduled rollouts.
- **Q-S-2** — Bulk write (PATCH multiple settings atomically)? Recommendation: defer; admin UI today is one-setting-at-a-time and that's fine.
- **Q-S-3** — Setting templates ("AI Persona: Friendly" applies a bundle of 5 settings)? Recommendation: defer to onboarding wizard (cap 15) which can call individual PUTs.
- **Q-S-4** — `secret` value rotation visibility — how do we audit "key replaced" without ever logging the key? Recommendation: emit two audit events on replace — `setting.cleared` then `setting.set` — both with `value_changed: true`, no plaintext.

---

## 13. Frontend wiring (this commit)

- `lib/modules/settings/types.ts` — `SettingDefinition`, `SettingValue` (discriminated by type), `SettingScope`, response envelopes.
- `lib/api/settings.ts` — mock client implementing all endpoints with the 13 fixture settings.
- `lib/hooks/use-setting.ts` — `useSetting(key)` and `useSettingsByCategory(category)`.
- `app/(dashboard)/admin/settings/page.tsx` — categorized settings tree, edit form per setting with type-aware controls (string textarea, int number input, bool switch, enum select, secret with masked display + Replace button), org-scope writes via system_admin gate.
- Tests: client (resolution, mutation, secret masking, validation rejection), hook, admin UI render + edit flow.
