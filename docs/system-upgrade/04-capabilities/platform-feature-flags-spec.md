# PlatformFeatureFlags — Backend Contract Spec (cap 17)

> **Status:** spec drafted 2026-05-04 (Phase 1.1 of GENERIC_AI_PLATFORM_PROGRESS).
> Backend MUST adopt this contract verbatim before MOCK flip.
>
> **Why this matters:** every horizontal capability and every module gates its UI on a feature flag. Without a real backend resolver, every tenant sees the same defaults — there is no path to "this org has AI Agents but not Voice." This is the prerequisite for being a generic platform for businesses.

---

## 1. Resolution hierarchy

A flag's effective value is resolved in this order — first match wins:

```
user override   →   org override   →   plan default   →   system default   →   STATIC false
```

| Source | Who sets it | Where it lives | When it applies |
|---|---|---|---|
| `user` | system_admin overrides for a single user (debug / support) | `feature_flag_user_overrides` table | rare; for incident response |
| `org` | org admin or system_admin for the whole tenant | `feature_flag_org_overrides` table | per-tenant capability rollout |
| `plan` | billing plan grant (Free / Pro / Enterprise) | `plan_features` table | capability gating by plan |
| `system` | platform-level default per flag key | `feature_flag_definitions` table | default-on/off for all tenants |
| `STATIC` | hard-coded fail-closed default | `STATIC_FLAG_DEFAULTS` in code | only when backend unreachable |

The frontend reports the matched source via `FlagResponse.source`. Admin UI shows resolution as a chain ("plan grants this; org has not overridden; user has not overridden").

---

## 2. Endpoints

### 2.1 — Get a single flag (read path)

```
GET /api/proxy/feature-flags/<key>
```

**Response (200):**
```jsonc
{
  "success": true,
  "data": {
    "key": "ai_agents.enabled",
    "enabled": true,
    "source": "org",
    "resolution_chain": [
      { "source": "system", "value": false, "matched": false },
      { "source": "plan", "value": false, "matched": false, "plan_id": "pro" },
      { "source": "org", "value": true, "matched": true, "set_by_user_id": 7, "set_at": "2026-04-30T12:00:00Z" },
      { "source": "user", "value": null, "matched": false }
    ]
  }
}
```

`resolution_chain` is OPTIONAL on hot-path reads (omit for performance). The hook only reads `enabled` + `source`. Admin UI requests `?include=chain=true` to show the chain.

**Error responses:**
- `404` — unknown flag key. Frontend treats as `enabled: false`.
- `403` — caller is not authenticated. Middleware redirects to /login before this path.
- `503` — backend degraded. Frontend falls back to `STATIC_FLAG_DEFAULTS[key]` (all false).

### 2.2 — Bulk resolve (warm-up)

```
GET /api/proxy/feature-flags/bulk?keys=<csv>
```

Returns up to 50 flags in one round-trip. Same shape as single, but `data` is an object keyed by flag key. Used at app boot to populate the React Query cache.

### 2.3 — Set an override (write path, system_admin only)

```
PUT /api/proxy/feature-flags/<key>/override
```

**Request body:**
```jsonc
{
  "scope": "org",                  // "org" | "user"
  "scope_id": 1,                   // org_id or user_id
  "value": true,                   // true | false | null  (null = clear override)
  "reason": "Enrolled in Q2 AI Agents pilot"
}
```

**Response (200):** the new effective `FlagResponse` for the affected scope. Backend MUST emit a PlatformAuditLog entry with `category=admin`, `action=feature_flag.override.set`, `resource_type=feature_flag`, `resource_id=<key>`, and `metadata={scope, scope_id, old_value, new_value, reason}`.

**Errors:**
- `403` — caller is not system_admin or (for `scope=org`) not org admin.
- `400` — `scope_id` doesn't match the caller's org (cross-tenant write attempt — must reject).
- `404` — unknown flag key.

### 2.4 — List flag definitions (admin only)

```
GET /api/proxy/feature-flags/definitions
```

Returns:
```jsonc
{
  "success": true,
  "data": {
    "definitions": [
      {
        "key": "ai_agents.enabled",
        "label": "AI Agents",
        "description": "Enables the AI Agents module and its associated capabilities.",
        "category": "ai",
        "system_default": false,
        "introduced_in_version": "0.42.0",
        "deprecated": false
      }
    ],
    "total": 18
  }
}
```

Admin UI uses this to render the categorized flag tree.

---

## 3. Multi-tenant safety

- `org_id` derived server-side from the authenticated session. Never trust an `org_id` in the URL or body for READ paths.
- Override write at `scope=org`: the `scope_id` MUST match `g.org_id` unless caller is system_admin. System admins can write any org.
- Override write at `scope=user`: the target user's `org_id` MUST match `g.org_id`.
- Cross-tenant test: org A admin attempting `PUT /override` with `scope=org, scope_id=<orgB>` MUST 403. Captured as test `tests/e2e/security/tenant-isolation-flags.spec.ts` (scaffolded).

---

## 4. Performance budget

- `GET /<key>` p95 ≤ 30ms (hot path; every page in the app calls this).
- Bulk resolve up to 50 keys p95 ≤ 100ms.
- Override write p95 ≤ 200ms (acceptable — admin UI only).
- Cache: frontend uses TanStack Query `staleTime: 5 * 60_000` (5 min). Backend MAY add a 30s in-memory cache per (key, org_id) tuple.
- Cache invalidation: when an override is written, backend SHOULD broadcast a `feature_flag.changed` event (cap 23 SSE) so connected clients invalidate. Until SSE ships, clients refetch on focus / 5-min stale.

---

## 5. Schema (Postgres)

```sql
CREATE TABLE feature_flag_definitions (
  key VARCHAR(120) PRIMARY KEY,
  label VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(60) NOT NULL,
  system_default BOOLEAN NOT NULL DEFAULT false,
  introduced_in_version VARCHAR(40),
  deprecated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE plan_features (
  plan_id VARCHAR(40) NOT NULL,
  flag_key VARCHAR(120) NOT NULL REFERENCES feature_flag_definitions(key),
  value BOOLEAN NOT NULL,
  PRIMARY KEY (plan_id, flag_key)
);

CREATE TABLE feature_flag_org_overrides (
  org_id BIGINT NOT NULL,
  flag_key VARCHAR(120) NOT NULL REFERENCES feature_flag_definitions(key),
  value BOOLEAN NOT NULL,
  set_by_user_id BIGINT NOT NULL,
  set_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT,
  PRIMARY KEY (org_id, flag_key)
);

CREATE TABLE feature_flag_user_overrides (
  user_id BIGINT NOT NULL,
  flag_key VARCHAR(120) NOT NULL REFERENCES feature_flag_definitions(key),
  value BOOLEAN NOT NULL,
  set_by_user_id BIGINT NOT NULL,
  set_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  reason TEXT,
  PRIMARY KEY (user_id, flag_key)
);

CREATE INDEX idx_org_overrides_lookup ON feature_flag_org_overrides (org_id, flag_key);
CREATE INDEX idx_user_overrides_lookup ON feature_flag_user_overrides (user_id, flag_key) WHERE expires_at IS NULL OR expires_at > now();
```

---

## 6. Audit & observability

Every override write emits to PlatformAuditLog (cap 10):
- `category`: `"admin"`
- `action`: `"feature_flag.override.set"` | `"feature_flag.override.clear"`
- `resource_type`: `"feature_flag"`
- `resource_id`: flag key
- `metadata`: `{ scope, scope_id, old_value, new_value, reason }`

Reads are NOT audited (too high-volume).

---

## 7. MOCK_MODE flip checklist

- [ ] Migrations applied (4 tables)
- [ ] System defaults seeded for all known flag keys
- [ ] `/api/feature-flags/<key>` and `/bulk` endpoints registered with the response shape above
- [ ] Override write path enforces RBAC + cross-tenant guard
- [ ] Audit emission verified for override writes
- [ ] Cross-tenant test green
- [ ] p95 latency measured ≤ 30ms on prod-shaped data
- [ ] Frontend: flip `MOCK_MODE = false` in `lib/api/feature-flags.ts`
- [ ] Admin UI tested against live backend

---

## 8. Open questions (Q-FF-*)

- **Q-FF-1** — Should plans grant `enabled: true` only, or also `enabled: false` (active denial)? Recommendation: only `enabled: true`. Defaults handle the false case.
- **Q-FF-2** — User overrides need an expiry — debug overrides shouldn't outlive the support call. `expires_at` column added to schema; no API path to set yet. Defer until needed.
- **Q-FF-3** — Should the resolution chain be returned by default or behind a query param? Recommendation: query param (`?include=chain`) to keep hot-path light.
- **Q-FF-4** — Bulk resolve cap (50 keys) — is this enough for app boot? Current frontend has 7 known keys; even with 5x growth we're under 50. Capture if we approach the limit.

---

## 9. Frontend wiring (this commit)

- `lib/api/feature-flags.ts` extended with:
  - `setFeatureFlagOverride()` mutation
  - `fetchFeatureFlagDefinitions()` for admin
  - `FlagResponse.resolution_chain` optional field
- `/admin/feature-flags` page — list flags by category, see resolution source, set/clear overrides (system_admin only).
- `useFeatureFlagDefinitions()` hook for admin UI.
