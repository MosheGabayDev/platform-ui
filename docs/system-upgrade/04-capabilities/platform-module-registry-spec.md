# PlatformModuleRegistry — Backend Contract Spec (cap 18)

> **Status:** spec drafted 2026-05-05 (Phase 1.3 of GENERIC_AI_PLATFORM_PROGRESS).
> Backend MUST adopt this contract verbatim before MOCK flip.
>
> **Why this matters:** the registry is what makes the platform multi-tenant in shape, not just data. Different orgs need different modules. Without a registry, the sidebar shows everything to everyone, the AI tries to call tools that don't exist for the tenant, and onboarding is impossible to scope. Drives:
> - Dynamic sidebar nav (replaces static `nav-items.ts`)
> - AI capability scoping (`availableActions` per org)
> - Dashboard tile visibility
> - Search result type filtering (cap 11)
> - Permission scoping (cap 03)

---

## 1. Concept

A **module** is a coherent surface (Helpdesk, Knowledge, AI Agents, Voice, Billing, etc.) bundled with:

- A **manifest** — static metadata declared by the module's source code
- An **enablement** — per-org boolean indicating whether this org has access
- A **status** — runtime info (healthy / degraded / disabled-by-flag)

Sources of truth:

| What | Where |
|---|---|
| Manifests | Code — every module exports a `manifest.ts` consumed at app boot |
| Enablement (per org) | Postgres `module_enablement` table |
| Status (runtime) | Computed on read — feature-flag + plan grants + module health |

Manifests are static (versioned with the code); enablements are dynamic (set per org via admin UI). The registry endpoint returns the resolved view for the current session's org.

---

## 2. Module manifest shape

```ts
interface ModuleManifest {
  // Identity
  key: string;                       // "helpdesk", "knowledge", "ai-agents"
  label: string;                     // "Helpdesk"
  label_he: string;                  // "הלפדסק"
  description: string;
  category: "core" | "ai" | "operations" | "growth" | "experimental";
  icon: string;                      // lucide icon name, e.g. "HeadphonesIcon"

  // Routing
  base_route: string;                // "/helpdesk"
  nav_entries: NavEntry[];           // [{ label, href, icon, order, badge_query? }]

  // Capabilities
  ai_actions: string[];              // ["helpdesk.ticket.take", ...]
  permissions: string[];             // ["helpdesk.view", "helpdesk.assign", ...]
  search_types: string[];            // ["ticket", "kb"] — cap 11 result types

  // Lifecycle
  introduced_in_version: string;
  status: "stable" | "beta" | "experimental" | "deprecated";

  // Dependencies
  required_flags: string[];          // ["helpdesk.enabled"] — must all be true
  required_plans: string[];          // ["pro", "enterprise"] — empty = any plan
  conflicts_with: string[];          // module keys that cannot be enabled together

  // UI
  dashboard_tile: { enabled: boolean; size: "sm" | "md" | "lg" } | null;
  default_landing: string;           // "/helpdesk" — where g+<key> shortcut lands
}

interface NavEntry {
  label: string;
  label_he: string;
  href: string;
  icon: string;
  order: number;
  // Optional dynamic badge (e.g. "5 open tickets")
  badge_query?: { module: string; metric: string };
}
```

Manifests are bundled per-module in `lib/modules/<key>/manifest.ts` and aggregated by `lib/platform/module-registry/manifests.ts`.

---

## 3. Endpoints

### 3.1 — List modules for current session

```
GET /api/proxy/modules
```

**Response (200):**
```jsonc
{
  "success": true,
  "data": {
    "modules": [
      {
        "key": "helpdesk",
        "manifest": { /* ModuleManifest */ },
        "enablement": {
          "enabled": true,
          "enabled_at": "2026-04-01T12:00:00Z",
          "enabled_by_user_id": 1,
          "source": "org_override"   // "org_override" | "plan_default" | "system_default"
        },
        "status": "healthy",         // "healthy" | "degraded" | "disabled_by_flag" | "unavailable"
        "blocked_reason": null       // string when status != healthy
      }
    ],
    "total": 12
  }
}
```

`status` is computed:
- `disabled_by_flag` — `required_flags` evaluation returned false on at least one
- `unavailable` — caller's plan doesn't grant any of `required_plans`
- `degraded` — module-level health check failed (deferred until cap 23)
- `healthy` — all green

Frontend uses `enablement.enabled && status === "healthy"` as the gate for nav rendering.

### 3.2 — Set enablement (admin only)

```
PUT /api/proxy/modules/<key>/enablement
```

**Request:**
```jsonc
{
  "enabled": true,
  "reason": "Q2 rollout to TLV office"
}
```

**Authorization:** `system_admin` always. `org_admin` may toggle modules whose manifest declares `org_admin_can_toggle: true`. Critical modules (auth, audit) are system_admin-only.

**Audit:** every write emits `category=admin`, `action=module.enable` or `module.disable`.

### 3.3 — Module health (deferred — cap 23 SSE)

```
GET /api/proxy/modules/<key>/health
```

Out-of-scope for v1. Frontend MAY poll, MAY subscribe via SSE later. For now `status: "healthy"` is hard-coded for enabled modules.

---

## 4. Multi-tenant safety

- `org_id` derived from session (never URL/body).
- Enablement reads return only modules visible to the caller's org.
- Cross-tenant write attempt: `org_admin` of org A trying to flip enablement for org B MUST 403.
- A module disabled at the org level MUST NOT appear in:
  - Sidebar nav
  - Command palette navigation suggestions (cap 11)
  - AI shell `availableActions` (executor registry)
  - Search result types (cap 11)

---

## 5. Schema (Postgres)

```sql
CREATE TABLE module_definitions (
  key VARCHAR(60) PRIMARY KEY,
  manifest JSONB NOT NULL,                -- snapshot of code-level manifest
  manifest_version VARCHAR(40) NOT NULL,  -- matches introduced_in_version
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE module_enablement (
  org_id BIGINT NOT NULL,
  module_key VARCHAR(60) NOT NULL REFERENCES module_definitions(key),
  enabled BOOLEAN NOT NULL,
  enabled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  enabled_by_user_id BIGINT,
  reason TEXT,
  PRIMARY KEY (org_id, module_key)
);

CREATE INDEX idx_enablement_lookup ON module_enablement (org_id, module_key);
```

Manifest sync: backend re-imports manifests from code at boot or via `/admin/modules/sync` admin call. Adding a new module without explicit enablement defaults to disabled (fail-closed for new caps).

---

## 6. Performance budget

- `GET /modules` p95 ≤ 50ms (called once per session — frontend caches in React Query for 10 min).
- Bulk read pattern only — no per-key lookup endpoint (registry is small, full list is cheaper than N round-trips).

---

## 7. MOCK_MODE flip checklist

- [ ] Migrations applied (2 tables)
- [ ] Manifest sync mechanism (boot-time import from code)
- [ ] All known modules registered with manifests
- [ ] `/api/modules` and `/api/modules/<key>/enablement` endpoints registered
- [ ] Cross-tenant write guard tested
- [ ] Audit emission verified
- [ ] Frontend: flip `MOCK_MODE = false` in `lib/api/module-registry.ts`
- [ ] Sidebar `nav-items.ts` replaced by `useEnabledModules()` consumer

---

## 8. Open questions (Q-MR-*)

- **Q-MR-1** — Should disabling a module hide its data forever or pause access? Recommendation: **pause** — data persists, UI removed. Re-enabling restores the experience. Hard delete requires explicit data-export action.
- **Q-MR-2** — When a manifest's `required_flags` evaluation flips from true to false, does the module auto-disable? Recommendation: **yes** — `status` becomes `disabled_by_flag`, but the persisted `enablement.enabled` doesn't change. Flag flip back restores.
- **Q-MR-3** — Module versioning during upgrades? Recommendation: defer. v1 assumes manifest is monotonic — old code paths handle missing fields with defaults.
- **Q-MR-4** — Conflicts (`conflicts_with`) — should the API enforce this on write or just warn? Recommendation: **enforce** — return 409 Conflict if enabling X would activate while Y is enabled.

---

## 9. Frontend wiring (this commit)

- `lib/modules/module-registry/types.ts` — `ModuleManifest`, `ModuleEnablement`, `ModuleStatus`, response envelopes.
- `lib/platform/module-registry/manifests.ts` — central manifests for all known modules (helpdesk, audit, AI agents, knowledge, voice, etc.)
- `lib/api/module-registry.ts` — mock client implementing list + enablement-write.
- `lib/hooks/use-enabled-modules.ts` — `useEnabledModules()`, `useModuleStatus(key)`.
- `app/(dashboard)/admin/modules/page.tsx` — list modules with current enablement, toggle per module (system_admin only), show status + blocked reason + dependency chain.
- Tests: client (resolution, write, conflicts, dependencies), hook, admin UI render.
- Nav integration: `nav-items.ts` extended to support per-module visibility — disabled modules' groups don't render. Full migration to manifest-driven nav is a v2 task; this commit ensures disabled modules are filtered out of the existing static groups.
