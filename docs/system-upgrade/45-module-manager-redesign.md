# 45 — Module Manager Redesign

_Created: 2026-04-25 (R038) | v2.0: 2026-04-25 (R038 Follow-up) | Status: Design / Pre-Implementation_

---

## Overview

The current Module Manager (`apps/module_manager/`) was built as a single-tenant platform
administration tool. Now that the platform is a multi-tenant SaaS (ResolveAI), the model has
critical structural gaps that make per-org module management impossible. This document defines the
complete redesign: source of truth, canonical model, lifecycle, permissions, enforcement, migration,
testing, and phased implementation plan.

**This document is the implementation contract for R038A–R038G. No code before R038B.**

---

## §01 — Source of Truth

Every piece of module data belongs in exactly one place.

### Manifest (code) owns:

| Data | Notes |
|------|-------|
| `module_key` | Stable identifier, never changes |
| `display_name`, `description` | Presentational defaults |
| `version` | Semantic version of the current build |
| `min_system_version` | Compatibility floor |
| `routes` | URL patterns registered by the module |
| `nav_items` | Sidebar/menu entries |
| `permissions` | Permission names the module declares |
| `dependencies` | Other module keys required |
| `feature_flags` | Gates that can be toggled per-org |
| `ai_actions` | AI action descriptors (see doc 36) |
| `ai_page_contexts` | `PageAIContext` registrations (see doc 38) |
| `ai_onboarding` | Onboarding questions metadata |
| `data_ownership` | Which data entities the module owns |
| `import_export` | Declared import/export handlers |
| `module_type` | `core` / `optional` / `integration` / `custom` |
| `category` | e.g. `helpdesk`, `analytics`, `ai`, `security` |
| `author`, `homepage`, `icon` | Static metadata |

**Location:** Each module's manifest lives at `apps/<module>/module.manifest.json`.
It is parsed at startup by `ModuleRegistry.sync_from_manifests()` and used to update DB catalog
records. The manifest is the ground truth; DB catalog records are derived state.

### DB owns:

| Data | Notes |
|------|-------|
| System install state | Is the module installed on this platform? |
| Per-org enable/disable state | `OrgModule.is_enabled` |
| Per-org settings | `OrgModuleSettings` |
| License records | `ModuleLicense` rows |
| Audit log | `ModuleLog` rows |
| Script execution history | `ScriptExecution` rows |
| Rollout state | Gradual per-org rollout percentage |
| Admin overrides | System-admin can override manifest defaults for an org |

**Rule:** DB must NOT store data that belongs in manifests. If a system-admin changes a module's
`display_name` for an org, that is an admin override (stored separately) — not a change to the
catalog record. The catalog record is always reset to the manifest value on next sync.

### Sync process:

`ModuleRegistry.sync_from_manifests()` runs at startup and on explicit admin trigger:
1. Scan `apps/*/module.manifest.json`
2. For each manifest: upsert `Module` catalog row from manifest fields
3. Upsert `ModuleDependency` rows from `dependencies[]` array
4. Upsert `ModulePermission` rows from `permissions[]` array
5. Log the sync as `ModuleLog(action='manifest_sync')`
6. Do NOT touch `OrgModule` rows — org state is independent of catalog sync

---

## §02 — Module Identity Terms

| Term | Type | Description | Example |
|------|------|-------------|---------|
| `module_key` | `String(60)` | Stable unique identifier. Never renamed. Defined in manifest. Used in all code/API/routes. | `helpdesk` |
| `module_id` | `Integer` | DB primary key. Used in FK relationships. Do not expose to external APIs. | `7` |
| `module_slug` | Derived | URL path segment. Defaults to `module_key`. May differ if key contains underscores. | `helpdesk` |
| `org_module_id` | `Integer` | PK of the `OrgModule` row. Used in FK to `OrgModuleSettings`. | `42` |
| `display_name` | Manifest | Human-readable name. May be overridden per-org by system-admin. | `Helpdesk` |

**Rule:** All route params, API paths, and service code references use `module_key`.
Never use `module_id` or `display_name` as identity.

---

## §03 — Lifecycle Model

### System Module Lifecycle

Controls whether the module is available on the platform at all. Managed by system-admin.

```
  registered
      │
      ▼
    beta ─────────────────────────────┐
      │                               │
      ▼                               │
    active                            │
      │                               │
      ▼                               ▼
  deprecated ──────────────────► removed
```

| State | Meaning | Who sets it |
|-------|---------|-------------|
| `registered` | Module known to DB but not yet deployed/tested | system-admin, manifest sync |
| `beta` | Available for select orgs (gated by feature flag or explicit org list) | system-admin |
| `active` | Generally available to all orgs that have a license/plan entitlement | system-admin |
| `deprecated` | No new orgs can enable; existing installs still work | system-admin |
| `removed` | Module is gone. All `OrgModule` rows for it must be `is_enabled=False` | system-admin only |

**Transition rules:**
- Only system-admin can advance/revert system module state
- `deprecated` → `removed` requires all org installs to be disabled first
- `removed` modules cannot be re-enabled by org-admins

### Org Module Lifecycle

Per-org state, independent of system catalog state. Managed by org-admin (within limits).

```
  available
      │   enable
      ▼
  installed ──────────────────────────────────────────────────────┐
      │                                                            │
      │ enable                                                     │ uninstall
      ▼                                                            ▼
   enabled ◄──── re-enable ──── disabled ◄──── suspend (system) uninstalled
      │                             │
      │ disable (org-admin)         │ re-enable
      └─────────────────────────────┘
```

| State | Meaning | Who sets it |
|-------|---------|-------------|
| `available` | Module exists in system catalog; org has not yet acted | system (implicit) |
| `installed` | Module config/settings created for org but not yet enabled | org-admin |
| `enabled` | Module fully active for org; routes/nav visible | org-admin |
| `disabled` | Org-admin turned it off; settings preserved | org-admin |
| `suspended` | System policy suspended for billing/security; org-admin cannot re-enable | system-admin |
| `uninstalled` | Org settings removed; data may be archived | org-admin (with confirmation) |

**Transition rules:**
- org-admin can: `available → installed`, `installed → enabled`, `enabled → disabled`, `disabled → enabled`
- org-admin cannot: enable a module where `system_status = 'removed'` or `'deprecated'`
- org-admin cannot: enable without a valid license if module requires one
- org-admin cannot: enable if dependencies are not enabled
- system-admin can: set `suspended` without org-admin consent
- system-admin can: set any state
- `uninstalled` is irreversible without explicit reinstall

---

## §04 — Manifest Integration

### Manifest file location

`apps/<module_key>/module.manifest.json`

### Canonical manifest schema (v1)

```json
{
  "moduleKey": "helpdesk",
  "version": "1.0.0",
  "displayName": "Helpdesk",
  "description": "AI-assisted helpdesk ticket management.",
  "moduleType": "optional",
  "category": "helpdesk",
  "author": "Platform Engineering",
  "homepage": "",
  "icon": "headset",
  "minSystemVersion": "1.0.0",
  "dependencies": [
    { "moduleKey": "users", "versionConstraint": ">=1.0.0", "optional": false }
  ],
  "permissions": [
    { "name": "helpdesk.tickets.view", "type": "provided", "description": "View tickets" },
    { "name": "helpdesk.tickets.manage", "type": "provided", "description": "Create/update tickets" }
  ],
  "routes": [
    { "path": "/helpdesk", "label": "Helpdesk", "component": "helpdesk/page" }
  ],
  "navItems": [
    { "label": "Helpdesk", "path": "/helpdesk", "icon": "headset", "permission": "helpdesk.tickets.view" }
  ],
  "featureFlags": [
    { "key": "helpdesk.ai_auto_triage", "default": false, "description": "Enable AI auto-triage" }
  ],
  "aiActions": [],
  "aiPageContexts": [],
  "aiOnboarding": {},
  "dataOwnership": {
    "owns": ["helpdesk_sessions", "tickets", "tool_invocations"]
  },
  "importExport": {
    "canExport": true,
    "canImport": false
  }
}
```

### Validation

`ModuleRegistry.validate_manifest(path)` checks:
- Required fields present: `moduleKey`, `version`, `displayName`, `moduleType`
- `moduleKey` matches directory name
- `dependencies[].moduleKey` references known modules
- `permissions[].name` matches pattern `<module_key>.<resource>.<action>`
- No duplicate permission names

### Version mismatch handling

If DB `Module.version` differs from manifest `version` on sync:
- Update DB version from manifest
- Log as `ModuleLog(action='manifest_sync', details={old_version, new_version})`
- Do NOT auto-update `OrgModule.installed_version` — org rollout is separate

### Deprecated manifest fields

Fields removed from the manifest schema must remain in the manifest parser with a
`DeprecationWarning` for one full release cycle before being dropped.

---

## §05 — Current Model Problems

| Model | Table | Problem |
|-------|-------|---------|
| `Module` | `modules` | `is_installed`/`is_enabled` global — no per-org state |
| `Module` | `modules` | `dependencies` JSON Text blob — no FK, no version constraints |
| `Module` | `modules` | `config_data` + `ModuleSettings` are redundant config stores |
| `ModulePermission` | `module_permissions` | No role FK, no org scoping |
| `ModuleSettings` | `module_settings` | No org scoping — settings are system-wide |
| `ModuleLog` | `module_logs` | `user` is `String(255)`, no FK; no `org_id` |
| `ModulePurchase` | `module_purchases` | `organization` is `String(255)`, no FK to `orgs` |
| `ScriptExecution` | `script_executions` | `executed_by` is `String(255)`, no FK |
| Routes (`routes.py`) | — | `@login_required + current_user.is_admin` — violates ADR-028 |

---

## §06 — Design Goals

1. **Multi-tenant module state** — each org independently enables/disables/configures modules
2. **Manifest-first** — code owns metadata; DB owns runtime state
3. **License enforcement** — `ModuleLicense` with hard `org_id FK → orgs.id`
4. **Proper audit trail** — all user references are `Integer FK → users.id`
5. **Referential integrity for dependencies** — `ModuleDependency` join table
6. **ADR-028 compliance** — all new routes use `@jwt_required + g.jwt_user`
7. **Backward compatibility** — old Jinja2 routes preserved until platform-ui page ships
8. **Additive-first migration** — new tables added first; old columns deprecated, not dropped

---

## §07 — New DB Model Design

### 7.1 — `Module` (system catalog, manifest-derived)

Represents a module known to the platform. Upserted from manifest on sync.

```
id                   Integer PK
module_key           String(60)  UNIQUE NOT NULL INDEX   ← primary identity
display_name         String(200) NOT NULL
description          Text
version              String(50)  NOT NULL                ← latest manifest version
min_system_version   String(50)
system_status        String(30)  NOT NULL DEFAULT 'registered'
                                 CHECK IN (registered, beta, active, deprecated, removed)
is_core              Boolean     DEFAULT False            ← core modules cannot be uninstalled
module_type          String(50)  NOT NULL
category             String(100)
author               String(255)
homepage             String(500)
icon                 String(100)
config_schema        JSONB                               ← WAS: Text JSON string
menu_items           JSONB                               ← WAS: Text JSON string
installed_at         DateTime
installed_by         Integer     FK → users.id            ← WAS: String(255)
created_at           DateTime    NOT NULL
updated_at           DateTime    onupdate
```

**Removed from Module:**
- `is_installed` → replaced by `system_status`
- `is_enabled` → moved to `OrgModule.is_enabled`
- `installed_version` → moved to `OrgModule.installed_version`
- `config_data` → merged into `OrgModuleSettings`
- `dependencies` (JSON Text) → replaced by `ModuleDependency` table

**Relationships:**
- `org_modules` → `OrgModule[]`
- `dependencies` → `ModuleDependency[]` (outgoing)
- `dependents` → `ModuleDependency[]` (incoming)
- `permissions` → `ModulePermission[]`
- `changelogs` → `ModuleChangelog[]`

---

### 7.2 — `OrgModule` (per-org state) — NEW

One row per `(org_id, module_id)` pair. Created when org first interacts with a module.

```
id                   Integer  PK
org_id               Integer  FK → orgs.id   NOT NULL   INDEX
module_id            Integer  FK → modules.id NOT NULL  INDEX
module_key           String(60) NOT NULL                 ← denormalized for query convenience

org_status           String(30) NOT NULL DEFAULT 'available'
                                CHECK IN (available, installed, enabled, disabled, suspended, uninstalled)
is_enabled           Boolean  NOT NULL  DEFAULT False    ← true only when org_status = 'enabled'
installed_version    String(50)                          ← which version this org is on

license_id           Integer  FK → module_licenses.id   NULLABLE
rollout_percentage   SmallInt DEFAULT 100                ← 0–100 for gradual rollout
is_admin_override    Boolean  DEFAULT False              ← system-admin bypassed plan/license check

enabled_at           DateTime
enabled_by           Integer  FK → users.id
disabled_at          DateTime
disabled_by          Integer  FK → users.id
suspended_at         DateTime
suspended_by         Integer  FK → users.id
suspension_reason    String(200)
updated_at           DateTime onupdate
created_at           DateTime NOT NULL

UNIQUE(org_id, module_id)
```

**`is_enabled` invariant:** `is_enabled` is always `True` IFF `org_status = 'enabled'`.
Never write `is_enabled` directly — update `org_status` and derive.

**Relationships:**
- `settings` → `OrgModuleSettings[]`
- `license` → `ModuleLicense`

---

### 7.3 — `OrgModuleSettings` (per-org, per-module config) — NEW

Replaces `ModuleSettings`. Bound to `OrgModule`.

```
id                   Integer PK
org_module_id        Integer FK → org_modules.id  NOT NULL  INDEX

setting_key          String(100) NOT NULL
setting_group        String(100)            ← 'api', 'ui', 'security', 'ai'

setting_value        Text                   ← encrypted if is_secret=True (Fernet)
default_value        Text
value_type           String(50) NOT NULL    ← 'string','integer','boolean','json','password','url'

display_name         String(200)
description          Text
validation_rules     JSONB

is_required          Boolean DEFAULT False NOT NULL
is_secret            Boolean DEFAULT False NOT NULL
is_editable          Boolean DEFAULT True  NOT NULL

updated_by           Integer FK → users.id
updated_at           DateTime onupdate
created_at           DateTime NOT NULL

UNIQUE(org_module_id, setting_key)
```

**Secret values** are Fernet-encrypted at write time. Frontend receives `"********"` when
`is_secret=True`. The plain value is only decrypted by the module's own service code, never
returned via API.

---

### 7.4 — `ModuleDependency` (dependency graph) — NEW

Replaces `Module.dependencies` JSON array.

```
id                     Integer PK
module_id              Integer FK → modules.id NOT NULL  ← the module that has the dependency
required_module_id     Integer FK → modules.id NOT NULL  ← the module it depends on

version_constraint     String(50)   ← '>=1.0.0', '~2.3', NULL = any
is_optional            Boolean DEFAULT False NOT NULL

UNIQUE(module_id, required_module_id)
```

---

### 7.5 — `ModuleLicense` (renamed + fixed from `ModulePurchase`)

Critical fix: `organization String(255)` → `org_id Integer FK → orgs.id`.

```
id                   Integer PK
module_id            Integer FK → modules.id  NOT NULL
org_id               Integer FK → orgs.id     NOT NULL    ← WAS: organization String(255)

purchase_code        String(100) UNIQUE NOT NULL
license_key          String(255)                           ← Fernet-encrypted

purchase_type        String(50) NOT NULL   ← 'one_time','monthly','yearly','lifetime','trial'
purchase_date        DateTime NOT NULL

price                Numeric(10,2)
currency             String(10) DEFAULT 'USD'

valid_from           DateTime
valid_until          DateTime              ← NULL = lifetime

is_active            Boolean DEFAULT True NOT NULL
is_trial             Boolean DEFAULT False NOT NULL

max_users            Integer               ← NULL = unlimited
max_installations    Integer
current_installations Integer DEFAULT 0 NOT NULL

payment_method       String(50)
payment_status       String(50) DEFAULT 'pending'
transaction_id       String(255)

subscription_id      String(255)
auto_renew           Boolean DEFAULT False NOT NULL
next_billing_date    DateTime

notes                Text
purchaser_name       String(255)           ← denormalized for historical record
purchaser_email      String(255)

activated_at         DateTime
activated_by         Integer FK → users.id  ← WAS: String(255)
deactivated_at       DateTime
deactivated_by       Integer FK → users.id  ← WAS: String(255)
deactivation_reason  Text

created_at           DateTime NOT NULL
updated_at           DateTime onupdate
```

---

### 7.6 — `ModulePermission` (minor update, no breaking change)

Permission names follow `<module_key>.<resource>.<action>` convention. No FK to roles table —
permission binding is resolved through the RBAC `roles_permissions` table at request time.

```
id               Integer PK
module_id        Integer FK → modules.id NOT NULL
permission_name  String(200) NOT NULL
permission_type  String(50) NOT NULL    ← 'required', 'provided', 'optional'
description      Text
created_at       DateTime NOT NULL
```

---

### 7.7 — `ModuleLog` (add FK columns)

```
id               Integer PK
module_id        Integer FK → modules.id NULLABLE    ← nullable: module may be deleted
org_id           Integer FK → orgs.id    NULLABLE    ← NEW: org context for audit
module_key       String(60) NOT NULL                 ← denormalized for orphan safety
user_id          Integer FK → users.id   NULLABLE    ← WAS: user String(255)
user_display     String(255)                         ← denormalized display name

action           String(50) NOT NULL
                 ← 'install','uninstall','enable','disable','update','configure',
                    'suspend','unsuspend','manifest_sync','license_assign','license_remove'
status           String(50) NOT NULL    ← 'success','failed','pending'

ip_address       String(45)
details          JSONB                  ← WAS: Text JSON string
error_message    Text

created_at       DateTime NOT NULL INDEX
```

---

### 7.8 — `ScriptExecution` (add FK, JSONB columns)

```
id               Integer PK
script_name      String(100) NOT NULL
status           String(50) NOT NULL   ← 'running','success','failed','cancelled'
started_at       DateTime NOT NULL
completed_at     DateTime
duration_seconds Float

executed_by      Integer FK → users.id NULLABLE    ← WAS: String(255)
executor_display String(255)                        ← denormalized
ip_address       String(45)

output           Text
error_output     Text
result_data      JSONB                  ← WAS: Text JSON string
error_message    Text
traceback        Text

command          String(500)
arguments        JSONB                  ← WAS: Text JSON string

created_at       DateTime NOT NULL
```

---

### 7.9 — `ModuleChangelog` (JSONB upgrade only)

No structural changes. JSON array columns (`added`, `changed`, `deprecated`, `removed`, `fixed`,
`security`) converted to JSONB at migration time.

---

## §08 — Schema Diagram

```
orgs ─────────────────────────────────────────────────────────────────┐
  │                                                                   │ 1:N
  │ 1:N                                                               ▼
  ▼                                                           ModuleLicense
OrgModule ──── module_id ──────────────────────► Module
  │  │                                             │
  │  └── license_id ──────────► ModuleLicense      ├── ModuleChangelog
  │                                                ├── ModulePermission
  └── OrgModuleSettings                            └── ModuleDependency
                                                         ├── module_id FK
                                                         └── required_module_id FK

users ──── ModuleLog.user_id
      ──── OrgModule.enabled_by / disabled_by / suspended_by
      ──── OrgModuleSettings.updated_by
      ──── ModuleLicense.activated_by / deactivated_by
      ──── Module.installed_by
      ──── ScriptExecution.executed_by

Manifests (apps/*/module.manifest.json) ──► Module (DB catalog, derived from manifest)
                                        ──► ModuleDependency (seeded from dependencies[])
                                        ──► ModulePermission (seeded from permissions[])
```

---

## §09 — Permission Model

Following ADR-028 `resource.scope.action` naming convention.

| Permission | Description | Default roles |
|------------|-------------|---------------|
| `modules.view` | View org's enabled modules | org_admin, manager, technician |
| `modules.enable` | Enable a module for org | org_admin |
| `modules.disable` | Disable a module for org | org_admin |
| `modules.configure` | Change org module settings | org_admin |
| `modules.audit.view` | View audit log for own org's modules | org_admin |
| `modules.license.view` | View license records for own org | org_admin |
| `modules.system.manage` | Install/uninstall/sync/deprecate system modules | system_admin |
| `modules.system.licenses` | Assign/revoke licenses across all orgs | system_admin |
| `modules.system.audit.view` | View audit log across all orgs | system_admin |

**Enforcement rules:**
- system-admin manages system catalog and all org states
- org-admin can view/enable/configure only within own org
- normal users see only modules explicitly listed in their nav (filtered by `modules.view` + org state)
- frontend nav visibility is UX-layer only — backend APIs still enforce module availability on every call
- a route existing in the app does not make it accessible — the backend module availability check is the gate

---

## §10 — Dependency & License Enforcement

`ModuleEnforcementService.check_enable_preconditions(org_id, module_key, actor_user_id)` must
run before any `OrgModule` state transitions to `enabled`. It checks in order:

1. **Module exists** in DB catalog (`system_status` is not `removed`)
2. **System status allows it** — `system_status IN ('beta', 'active')`. Deprecated modules
   may remain enabled but cannot be newly enabled.
3. **License valid** — if module has `purchase_type != 'free'`, a `ModuleLicense` row must
   exist for the org where `is_active=True`, `payment_status='completed'`, and not expired.
4. **Billing status** — check org's plan tier permits this module (Phase 2 — deferred until
   billing integration is complete)
5. **Dependencies enabled** — for every `ModuleDependency(is_optional=False)`, the required
   module must be `OrgModule.is_enabled=True` for this org
6. **No conflicting modules** — if manifest declares `conflicts[]`, none of those modules
   can be enabled simultaneously (Phase 2 — deferred)
7. **Feature flags** — if module is `system_status='beta'`, check org is in beta allowlist
8. **Actor permission** — `actor_user_id` must have `modules.enable` permission in org context

**Fail closed:** if any check raises an unexpected exception, the enable is blocked.

**Disable preconditions** (less strict, checked before `disable`):
1. Actor has `modules.disable` permission
2. No other enabled modules list this module as a **required** dependency
   - If dependents exist: return `{"blocked_by": ["<module_key>", ...]}` — caller decides to
     disable cascade or abort
   - Do NOT auto-cascade disable without explicit confirmation from org-admin

---

## §11 — Route & Nav Enforcement

### Nav visibility

The sidebar nav is built from the `ModuleRegistry` filtered by:
1. `OrgModule.is_enabled=True` for `g.jwt_user.org_id`
2. `g.jwt_user` has the required `permission` declared in the nav item

Both conditions must hold. If either fails, the nav item is hidden.

The nav registry is rebuilt per-request from the DB (with Redis cache, 60s TTL).

### Route availability

When a user navigates to a module route (e.g. `/helpdesk`):
- Backend: `@module_required('helpdesk')` decorator (new) checks `is_module_available(org_id, 'helpdesk')`
- If not available: return `{"success": false, "error": "module_unavailable", "module_key": "helpdesk"}` HTTP 403
- Frontend: receives 403 → shows `ModuleUnavailablePage` (not a raw error)

**Rule:** A route existing in the codebase does not make it accessible. The decorator is the gate.

### `is_module_available(org_id, module_key)` — the single check function

```python
# Returns True only if ALL conditions hold:
# - Module exists and system_status IN ('beta', 'active')
# - OrgModule row exists with is_enabled=True
# - (If module requires license) license.is_valid() == True
```

All module-aware services must call this before processing requests.

---

## §12 — Audit Requirements

Every state transition and sensitive operation must write a `ModuleLog` row.

| Event | `action` value | Required fields |
|-------|---------------|-----------------|
| Module registered in catalog | `manifest_sync` | `module_id`, `details.version` |
| Module installed on system | `install` | `module_id`, `user_id` |
| Module enabled for org | `enable` | `module_id`, `org_id`, `user_id` |
| Module disabled for org | `disable` | `module_id`, `org_id`, `user_id`, `details.reason` |
| Module suspended | `suspend` | `module_id`, `org_id`, `user_id`, `details.reason` |
| Module unsuspended | `unsuspend` | `module_id`, `org_id`, `user_id` |
| Module uninstalled for org | `uninstall` | `module_id`, `org_id`, `user_id` |
| Settings changed | `configure` | `module_id`, `org_id`, `user_id`, `details.setting_key` (no value — no secret in logs) |
| License assigned | `license_assign` | `module_id`, `org_id`, `user_id`, `details.license_id` |
| License removed/revoked | `license_remove` | `module_id`, `org_id`, `user_id`, `details.license_id` |
| Dependency override | `dependency_override` | `module_id`, `org_id`, `user_id`, `details.overridden_dep` |
| Manifest sync | `manifest_sync` | `module_id`, `details.{old_version, new_version}` |

**Audit safety rules:**
- Never include setting values in `details` (only setting keys)
- Never include license keys in `details`
- `user_display` is denormalized at write time (not FK-resolved later)
- `ip_address` from `request.remote_addr` for HTTP calls; `'system'` for Celery tasks

---

## §13 — API Contract Outline

New endpoints in `apps/module_manager/api_routes.py` using `@jwt_required`.
All responses use `{"success": bool, "data": {...}}` envelope.

### System catalog (system_admin only)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/modules/catalog` | List all system modules with `system_status` |
| `POST` | `/api/modules/catalog/sync` | Trigger manifest sync |
| `PATCH` | `/api/modules/catalog/<key>/status` | Set system_status |
| `GET` | `/api/modules/catalog/<key>` | Module detail + dependency graph |

### Org modules (org-scoped, auto-scoped to `g.jwt_user.org_id`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/org/modules` | `modules.view` | List enabled modules for org |
| `GET` | `/api/org/modules/<key>` | `modules.view` | Module detail for org |
| `POST` | `/api/org/modules/<key>/enable` | `modules.enable` | Enable module (runs preconditions) |
| `POST` | `/api/org/modules/<key>/disable` | `modules.disable` | Disable module (warns on dependents) |
| `GET` | `/api/org/modules/<key>/settings` | `modules.configure` | Get org module settings |
| `PUT` | `/api/org/modules/<key>/settings` | `modules.configure` | Update org module settings |
| `GET` | `/api/org/modules/<key>/audit` | `modules.audit.view` | Audit log for this module in org |

### Licenses (system_admin)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/modules/licenses` | List all licenses (all orgs) |
| `POST` | `/api/modules/licenses` | Create license |
| `GET` | `/api/modules/licenses/<id>` | License detail |
| `POST` | `/api/modules/licenses/<id>/activate` | Activate license |
| `POST` | `/api/modules/licenses/<id>/deactivate` | Deactivate license |

### Scripts (system_admin)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/modules/scripts/<name>/run` | Run named script |
| `GET` | `/api/modules/scripts/history` | Script execution history |

**Write rules (ADR-028 checklist):**
- Auth: `@jwt_required + g.jwt_user` — never Flask-Login
- Tenant: `org_id = g.jwt_user.org_id` — never from request body
- RBAC: `@permission_required('modules.enable')` etc.
- Audit: `record_activity()` on every write
- Response: `{"success": bool, "data": {...}}` — never raw dump

---

## §14 — Testing Strategy

Required tests before R038C can be merged:

| Test | Scope |
|------|-------|
| Org A has module enabled, org B disabled — each sees correct state | Integration |
| `is_module_available` returns True when enabled, False when disabled/unlicensed/dep-missing | Unit |
| org-admin cannot enable unlicensed module (no license row) | Integration |
| org-admin cannot enable module with `system_status='removed'` | Unit |
| Dependency missing blocks enable; returns `blocked_by` | Integration |
| Disabling module A when module B requires A → returns `dependent_modules: [B]` without auto-disabling | Integration |
| system-admin can view all org module states across orgs | Integration |
| org-admin cannot view another org's module state | Integration |
| Disabled module API route returns 403 with `module_unavailable` error code | Integration |
| Nav hides disabled modules (no nav item for `org_status != 'enabled'`) | Unit |
| Manifest sync is idempotent (run twice → same DB state) | Integration |
| Migration from old `Module.is_enabled=True` correctly seeds `OrgModule(is_enabled=True)` | Migration test |
| Audit event created for enable/disable/configure/license operations | Integration |
| Secret settings not returned in plain text via API | Unit |
| Secret settings not written to `ModuleLog.details` | Unit |

---

## §15 — Backward Compatibility Plan

The migration is additive-first. Old fields/rows are never dropped until all callers are migrated.

### Phase 1 — Add new tables (R038B)

- Add `org_modules`, `org_module_settings`, `module_dependencies`, `module_licenses` tables
- Add `module_logs.org_id`, `module_logs.user_id`, `module_logs.user_display` columns (nullable)
- Add `module_logs.module_key` column (backfill from `module_logs.module_name`)
- Add `script_executions.executor_display` column
- Add `modules.system_status` column (backfill: `is_installed=True → 'active'`, else `'registered'`)
- Add JSONB columns (keep old Text columns in parallel — backfill then drop in Phase 4)
- OLD columns remain: `modules.is_installed`, `modules.is_enabled`, `modules.dependencies`,
  `modules.config_data`, `module_logs.user`, `script_executions.executed_by` (all nullable after backfill)

### Phase 2 — Seed new tables from old data (R038B data migration)

- Read `Module.dependencies` JSON → insert `ModuleDependency` rows (idempotent)
- For each org: read `Module.is_enabled` → create `OrgModule(is_enabled=True)` rows (conservative seed)
- Read `ModuleSettings` → insert `OrgModuleSettings` for org 1 (system org), then replicate as needed
- Map `module_logs.user` string → `user_id` via `SELECT id FROM users WHERE username = ?`
- Map `module_purchases.organization` string → `org_id` via `SELECT id FROM orgs WHERE name = ?`
- Log unmapped rows (no match) to a migration report file

### Phase 3 — Read-through helper (R038C)

`ModuleCompatLayer.get_enabled_modules(org_id)` tries `OrgModule` first; if empty, falls back
to old `Module.is_enabled` global state. Allows gradual migration without breaking existing callers.

### Phase 4 — Deprecate and remove old fields (R038G)

Only after:
- All callers use new model
- All tests pass
- 30-day burn-in in production

Columns to remove: `modules.is_installed`, `modules.is_enabled`, `modules.dependencies`,
`modules.config_data`, `modules.installed_version`, `module_logs.user`, `script_executions.executed_by`
(string), `module_settings` table (superseded by `org_module_settings`),
`module_purchases` table (superseded by `module_licenses`)

---

## §16 — AI Integration

Module Manager exposes module metadata needed by AI subsystems. All AI execution still goes
through AI Action Platform (ADR-022) and AI Provider Gateway (ADR-027) — Module Manager only
provides registry data.

### What Module Manager provides to AI

| AI Subsystem | Data provided | How |
|---|---|---|
| AI Action Platform | Enabled AI actions per org | `ModuleRegistry.get_ai_actions_for_org(org_id)` |
| Floating AI Assistant | Enabled `aiPageContexts` per org | `ModuleRegistry.get_page_contexts_for_org(org_id)` |
| AI Onboarding | Onboarding question metadata | `ModuleRegistry.get_onboarding_for_org(org_id)` |
| AI Service Routing | Module availability for routing decisions | `is_module_available(org_id, module_key)` |

### Rules

- AI must not call `OrgModule` directly — use `ModuleRegistry` helpers
- AI must not infer module availability from nav state — use `is_module_available()`
- AI action availability: an AI action from a disabled module is excluded from the action registry
  for that org, even if the action descriptor exists in the manifest
- Module Manager does not execute AI actions — it only declares them

---

## §17 — Migration Strategy

### Phased approach

| Phase | Round | What | Reversible? |
|-------|-------|------|------------|
| A | R038A (this doc) | Contract + plan only | N/A |
| B | R038B | Add new tables, seed from old data | Yes (drop new tables) |
| C | R038C | Read model + availability helper + tests | Yes |
| D | R038D | JWT read-only APIs | Yes |
| E | R038E | platform-ui read-only Module Hub | Yes |
| F | R038F | Write APIs + enable/disable flow | Partial |
| G | R038G | Deprecate + remove old fields | No |

### Migration script rules

1. Always wrap column/table additions in `IF NOT EXISTS` checks (idempotent)
2. Backfill scripts must log unmapped rows (not silently skip)
3. Run `ANALYZE <table>` after large backfills
4. Each migration has a rollback plan documented in the migration file
5. Old columns are nullable after backfill (never forced NOT NULL until Phase 4)
6. Never run Phase 4 drops without a 30-day production observation window

---

## §18 — Open Questions

| ID | Question | Decision needed by |
|----|----------|--------------------|
| OQ-01 | Seed `OrgModule` rows for ALL orgs on R038B, or only on first org login? | R038B planning |
| OQ-02 | Should `ModuleSettings` → `OrgModuleSettings` seed to all orgs or only org 1? | R038B planning |
| OQ-03 | Are licenses required for optional modules now, or only when billing integration is added? | Product decision |
| OQ-04 | Confirm `orgs` table FK target: `orgs.id` — verify FK name before writing migration | Before R038B |
| OQ-05 | Should script execution remain system-only, or should org-admins be able to run org-scoped scripts? | R038A planning |
| OQ-06 | What is the `module_key` for each existing module under `apps/`? Audit needed before manifest sync. | Before R038B |
| OQ-07 | When a module is `deprecated`, should new orgs be blocked from enabling it? Or only prevented at system level? | R038A planning |

---

## §19 — Acceptance Criteria

This redesign is complete when:

- [ ] `OrgModule` row exists for every `(org_id, module_key)` pair where module is relevant
- [ ] `OrgModule.org_id` has FK constraint to `orgs.id` — verified in DB
- [ ] `ModuleLicense.org_id` has FK constraint to `orgs.id` — verified in DB
- [ ] `ModuleLog.user_id` resolves to a real user for all new writes
- [ ] `Module.dependencies` JSON blob column is removed (Phase 4 only) after `ModuleDependency` data is seeded and verified
- [ ] All new `/api/modules/*` and `/api/org/modules/*` routes use `@jwt_required` — no `@login_required` on new routes
- [ ] `is_module_available(org_id, module_key)` returns correct result for all test scenarios (§14)
- [ ] All existing 40+ route operations work end-to-end after migration (no regression)
- [ ] No raw `str(exc)` in error responses
- [ ] All write endpoints call `record_activity()` and write `ModuleLog`
- [ ] All required tests in §14 pass
- [ ] Old `/modules/*` Jinja2 routes still functional (backward compat)

---

## §20 — ADR-031

**ADR-031: Module Manager Multi-Tenant Model Split**

- **Context:** Module Manager was designed single-tenant. ResolveAI SaaS requires per-org
  module state (enable/disable, settings, licenses) independent of system installation.
  `Module.is_enabled` is system-wide; `ModulePurchase.organization` is a loose string;
  `Module.dependencies` is an unvalidated JSON blob; audit fields are untyped strings;
  routes use Flask-Login (ADR-028 violation).
- **Decision:** (1) Split `Module` (manifest-derived catalog) from `OrgModule` (per-org state).
  (2) Add `OrgModuleSettings` bound to `OrgModule`. (3) Rename `ModulePurchase` → `ModuleLicense`
  with hard `org_id FK`. (4) Replace `Module.dependencies` JSON blob with `ModuleDependency`
  join table. (5) All audit string fields become FK. (6) New routes use `@jwt_required`.
  (7) Manifest files are source of truth for module metadata; DB holds only runtime state.
- **Alternatives rejected:**
  - Add `org_id` columns to `Module` rows — creates (module × org) duplication in catalog
  - JSON `enabled_orgs` array in `Module` — no referential integrity, not queryable
- **Migration:** Additive-first (7 phases R038A–G). Old fields deprecated, not dropped
  until callers are migrated and 30-day burn-in passes.
- **Affected modules:** `apps/module_manager/` (models, routes, api_routes), `scripts/migrations/`,
  `platform-ui/app/(dashboard)/modules/`
- **Spec:** `docs/system-upgrade/45-module-manager-redesign.md`

---

## §21 — R038 Phase Split

The previous single large R038 is replaced by 7 focused phases.

### R038A — Module Manager Contract & Migration Plan (this document)

Documentation only. No code.

Deliverables: canonical terminology, source of truth, lifecycle model, data model contract,
migration strategy, test strategy, API contract outline, permission model, dependency enforcement,
backward compatibility plan, AI integration definition.

**Gate:** All open questions in §18 answered before R038B starts.

---

### R038B — Additive Schema Foundation

Backend only. No UI. No destructive changes.

Deliverables:
- Add `org_modules` table
- Add `org_module_settings` table
- Add `module_dependencies` table
- Add `module_licenses` table
- Add nullable FK columns to `module_logs` (`org_id`, `user_id`, `user_display`)
- Add `modules.system_status` column (backfill from `is_installed`)
- Add JSONB columns to `module_logs`, `script_executions`
- Seed `ModuleDependency` from `Module.dependencies` JSON
- Seed `OrgModule` from `Module.is_enabled` for all active orgs
- Add `modules.*` permissions to DB

Rollback: drop new tables and columns.

---

### R038C — Read Model + Availability Helper

Backend only. No UI.

Deliverables:
- `ModuleRegistry.sync_from_manifests()` — manifest → catalog sync
- `is_module_available(org_id, module_key)` — authoritative check
- `get_enabled_modules_for_org(org_id)` — returns list of enabled module keys
- `ModuleEnforcementService.check_enable_preconditions(org_id, module_key, actor_id)` — fail-closed
- `ModuleCompatLayer.get_enabled_modules(org_id)` — read-through (old + new)
- All tests from §14 (read-only tests)

---

### R038D — JWT Read APIs

Backend only. No UI.

Deliverables:
- `GET /api/org/modules` — list enabled modules for calling org
- `GET /api/org/modules/<key>` — module detail for calling org
- `GET /api/org/modules/<key>/settings` — org module settings
- `GET /api/modules/catalog` — system catalog (system_admin only)
- `GET /api/modules/catalog/<key>` — catalog detail + dependency graph
- `GET /api/modules/licenses` — license list (system_admin)
- All APIs use `@jwt_required`, scoped to `g.jwt_user.org_id`
- All tests from §14 (read-only API tests)

---

### R038E — platform-ui Read-Only Module Hub

Frontend only. Depends on R038D being deployed.

Deliverables:
- TypeScript types: `OrgModule`, `Module`, `ModuleLicense`
- Zod schemas
- Query keys: `queryKeys.modules.*`
- `GET /api/org/modules` fetch function
- `/modules` list page — org view of enabled modules
- `/modules/[key]` detail page — module detail + settings (read-only)
- `/modules/catalog` — system catalog page (system_admin only)

---

### R038F — Write APIs + Enable/Disable Flow

Backend + frontend.

Deliverables:
- `POST /api/org/modules/<key>/enable` with full precondition checks
- `POST /api/org/modules/<key>/disable` with dependent module warning
- `PUT /api/org/modules/<key>/settings` — settings update
- `POST /api/modules/catalog/sync` — manifest sync trigger
- `POST /api/modules/licenses` — license CRUD
- Enable/disable flow in platform-ui with `ConfirmActionDialog`
- Dependent module warning dialog
- All tests from §14 (write tests)

---

### R038G — Cleanup / Deprecation

Only after R038F is deployed and 30-day production observation passes.

Deliverables:
- Remove `modules.is_installed`, `modules.is_enabled`, `modules.dependencies`,
  `modules.config_data`, `modules.installed_version` columns
- Remove `module_logs.user` (string) column
- Remove `script_executions.executed_by` (string) column
- Drop `module_settings` table
- Drop `module_purchases` table
- Remove `ModuleCompatLayer` read-through (no longer needed)

---

---

## §22 — Per-Org Module Versioning

Each organization can run a different version of the same module. Version state is tracked
in `OrgModule` (which version is installed) and `ModuleVersion` (what versions exist).

### 22.1 — `ModuleVersion` (system-level version registry) — NEW

One row per released version of a module. Created by system-admin when a version is published.

```
id                           Integer PK
module_id                    Integer FK → modules.id NOT NULL
module_key                   String(60) NOT NULL               ← denormalized
version                      String(50) NOT NULL               ← semver
release_channel              String(20) NOT NULL               ← 'stable','beta','alpha','internal'
status                       String(20) NOT NULL DEFAULT 'draft'
                             CHECK IN (draft, published, deprecated, yanked, archived)

# Compatibility
compatibility_min_platform   String(50)                        ← min platform version required
compatibility_max_platform   String(50)                        ← max platform version (NULL = no ceiling)
migration_required           Boolean DEFAULT False NOT NULL    ← DB migration must run during upgrade
rollback_supported           Boolean DEFAULT False NOT NULL    ← safe to downgrade from this version

# Package
package_id                   Integer FK → module_packages.id NULLABLE

# Changelog + snapshot
changelog                    Text                              ← release notes (Markdown)
manifest_snapshot            JSONB                             ← frozen manifest at publish time

# Audit
published_at                 DateTime
published_by                 Integer FK → users.id NULLABLE
yanked_at                    DateTime
yanked_by                    Integer FK → users.id NULLABLE
yank_reason                  String(200)
created_at                   DateTime NOT NULL

UNIQUE(module_id, version)
```

**Status transitions:**
```
  draft → published → deprecated → archived
           │
           └── yanked (emergency pull: stops new installs, does not uninstall existing)
```

- Only system-admin can publish, deprecate, yank, or archive
- `yanked` blocks new upgrades to this version; existing orgs on this version get an alert
- `archived` is final; version data kept for historical audit

### 22.2 — `OrgModule` versioning additions

Add these fields to `OrgModule` (§7.2):

```
installed_version_id         Integer FK → module_versions.id NULLABLE
target_version_id            Integer FK → module_versions.id NULLABLE   ← pending upgrade target
rollback_version_id          Integer FK → module_versions.id NULLABLE   ← last known-good version

last_upgrade_status          String(30)                        ← see ModuleUpgradeJob.status values
last_upgrade_at              DateTime
last_upgrade_job_id          Integer FK → module_upgrade_jobs.id NULLABLE

auto_update_policy           String(20) DEFAULT 'manual'
                             CHECK IN (manual, patch_only, minor, disabled)
release_channel_allowed      String(20) DEFAULT 'stable'
                             CHECK IN (stable, beta, alpha, internal)
```

**Version resolution for an org:**
- `installed_version_id` → the version currently running for this org
- `target_version_id` → set when an upgrade is queued, cleared after success/failure
- `rollback_version_id` → the version to roll back to if the current upgrade fails (set before each upgrade)

---

## §23 — Upgrade Workflow

A safe, auditable upgrade process with dry-run validation.

### 23.1 — `ModuleUpgradeJob` model — NEW

```
id                           Integer PK
org_id                       Integer FK → orgs.id NOT NULL
module_id                    Integer FK → modules.id NOT NULL
module_key                   String(60) NOT NULL

from_version_id              Integer FK → module_versions.id NOT NULL
to_version_id                Integer FK → module_versions.id NOT NULL

status                       String(30) NOT NULL DEFAULT 'pending'
                             CHECK IN (pending, validating, validation_failed, ready,
                                       running, succeeded, failed, rolled_back)

# Validation + execution
dry_run_result               JSONB                             ← result of dry-run validation
migration_log                Text                              ← step-by-step migration output
error_code                   String(60)
error_message_safe           String(500)                       ← never raw exception; safe for display

# Approval
requires_approval            Boolean DEFAULT False NOT NULL
approved_by                  Integer FK → users.id NULLABLE
approved_at                  DateTime

# Timing
started_by                   Integer FK → users.id NOT NULL
started_at                   DateTime
completed_at                 DateTime

created_at                   DateTime NOT NULL
```

### 23.2 — Upgrade process (9 steps)

```
1. INITIATE
   - system-admin or org-admin triggers upgrade to target_version
   - ModuleUpgradeJob created (status='pending')
   - OrgModule.target_version_id set

2. PRE-FLIGHT CHECK
   - License valid for target version
   - Dependencies at compatible versions for target
   - Platform version within [compatibility_min, compatibility_max]
   - Target version status = 'published' (not yanked/deprecated/archived)
   - No active upgrade job for this (org, module) already running

3. DRY-RUN VALIDATION (status='validating')
   - Run migration scripts in dry-run mode (no DB writes)
   - Check for schema conflicts
   - Estimate data volume / time
   - Write dry_run_result to ModuleUpgradeJob

4. APPROVAL GATE (if required)
   - Destructive migration → requires org-admin confirmation
   - Permission changes → requires org-admin confirmation
   - Set status='ready' after approval (or immediately if no approval required)

5. UPGRADE EXECUTION (status='running')
   - OrgModule.rollback_version_id ← current installed_version_id (save before touching)
   - Run migrations
   - Apply new config schema defaults
   - Sync permissions from new manifest
   - Write migration_log

6. POST-UPGRADE VALIDATION
   - Smoke check: key module routes respond
   - Dependency integrity check
   - Settings schema validation

7. SUCCESS (status='succeeded')
   - OrgModule.installed_version_id ← to_version_id
   - OrgModule.target_version_id ← NULL
   - ModuleLog(action='upgrade', details={from, to})

8. FAILURE (status='failed')
   - OrgModule.installed_version_id unchanged (still points to from_version)
   - OrgModule.target_version_id ← NULL
   - error_code + error_message_safe written
   - Rollback triggered automatically if rollback_supported=True

9. AUDIT
   - ModuleLog written regardless of outcome
   - ModuleUpgradeJob.completed_at set
```

### 23.3 — Approval requirement matrix

| Migration type | Approval required |
|---------------|-------------------|
| Patch upgrade (no migration) | None |
| Minor upgrade (no destructive migration) | None |
| Major upgrade | org-admin confirmation |
| Destructive migration (DROP/TRUNCATE) | org-admin confirmation |
| Permission changes | org-admin confirmation |
| Breaking manifest changes | org-admin confirmation |

---

## §24 — Rollback Policy

| Rule | Detail |
|------|--------|
| Rollback allowed | Only if `ModuleVersion.rollback_supported=True` for the version being rolled back from |
| Rollback blocked | If irreversible migrations ran (detected via `dry_run_result.has_irreversible=True`) |
| Rollback audit | `ModuleLog(action='rollback')` written regardless of outcome |
| Rollback approval | Same matrix as upgrade — destructive rollback requires org-admin confirmation |
| Settings compatibility | Rollback must restore settings schema to prior version defaults; extra keys ignored |
| Dependency constraints | Rollback cannot leave dependencies pointing at incompatible versions |
| Rollback source | `OrgModule.rollback_version_id` is set before every upgrade; rollback targets this version |

**Irreversible migration detection:** Any migration step that runs `DROP COLUMN`, `DROP TABLE`,
`TRUNCATE`, or deletes rows without backup sets `dry_run_result.has_irreversible=True`.
Rollback is blocked for that job.

---

## §25 — Module Package Management

### 25.1 — `ModulePackage` model — NEW

Stores metadata about a module's package artifact. The file itself lives in object storage (S3).

```
id                           Integer PK
module_key                   String(60) NOT NULL
version                      String(50) NOT NULL

package_type                 String(30) NOT NULL
                             CHECK IN (manifest_only, frontend_bundle, backend_plugin,
                                       workflow_pack, template_pack, integration_pack)
storage_backend              String(20) NOT NULL
                             CHECK IN (s3, local, registry)
storage_key                  String(500)                       ← S3 key or local path
                             ← NEVER store file contents in DB

checksum_sha256              String(64) NOT NULL               ← hex SHA-256 of package file
signature                    Text                              ← GPG or RSA signature
size_bytes                   BigInteger

uploaded_by                  Integer FK → users.id NOT NULL
created_at                   DateTime NOT NULL

UNIQUE(module_key, version, package_type)
```

### 25.2 — Package security rules

| Rule | Detail |
|------|--------|
| Checksum required | `checksum_sha256` must be set before a version can be `published` |
| Signature optional now, required post-R038I | System-admin must sign packages before marketplace listing |
| Upload access | system-admin only (`modules.system.manage` permission) |
| File storage | Never in DB. Files go to S3 via presigned upload URL. Only metadata in DB. |
| No arbitrary execution | `backend_plugin` packages are not dynamically loaded at runtime — they require a reviewed deployment via CI/CD |
| Package deletion blocked | A package cannot be deleted if any org has an `OrgModule` installed at that version |
| Download access | Org with valid license can download their own installed version's package |
| Integrity check | On upgrade execution, the runner must verify `checksum_sha256` before applying |

### 25.3 — Package type semantics

| Type | Meaning | Runtime action |
|------|---------|----------------|
| `manifest_only` | Declares module metadata; no files | Manifest sync only |
| `frontend_bundle` | JS/CSS assets | Deployed via CDN / static build |
| `backend_plugin` | Python code extension | Requires CI/CD deploy — not hot-loaded |
| `workflow_pack` | Workflow definitions, templates | Imported via workflow engine |
| `template_pack` | Email/report/document templates | Imported into template store |
| `integration_pack` | Connector config + credentials schema | Imported into integration registry |

---

## §26 — Module Marketplace / Store

### 26.1 — `ModuleStoreListing` model — NEW

System-level store entry for a module. One per module (not per version). Presentation layer
for the marketplace.

```
id                           Integer PK
module_id                    Integer FK → modules.id UNIQUE NOT NULL
module_key                   String(60) UNIQUE NOT NULL

display_name                 String(200) NOT NULL
short_description            String(300)
long_description             Text                              ← Markdown
category                     String(100)
tags                         JSONB                             ← String array of searchable tags
screenshots                  JSONB                             ← Array of {url, caption}
documentation_url            String(500)
demo_url                     String(500)

pricing_model                String(20) NOT NULL DEFAULT 'free'
                             CHECK IN (free, included, paid, usage_based, enterprise)
trial_available              Boolean DEFAULT False NOT NULL
trial_duration_days          SmallInt
required_plan                String(50)                        ← 'starter','pro','enterprise', NULL = any
base_price_usd               Numeric(10,2)                    ← NULL for enterprise/custom pricing

publisher                    String(200) DEFAULT 'Platform Engineering'
support_contact              String(200)
support_url                  String(500)

listing_status               String(20) NOT NULL DEFAULT 'hidden'
                             CHECK IN (visible, hidden, private, deprecated)
is_featured                  Boolean DEFAULT False NOT NULL
sort_order                   Integer DEFAULT 0

latest_stable_version        String(50)                        ← denormalized from ModuleVersion
latest_beta_version          String(50)                        ← denormalized from ModuleVersion

created_at                   DateTime NOT NULL
updated_at                   DateTime onupdate
```

**Visibility rules:**
- `visible` — shown to all orgs meeting `required_plan` filter
- `hidden` — only system-admin can see; not shown in marketplace
- `private` — shown only to explicitly listed orgs (future: `listing_org_allowlist` table)
- `deprecated` — visible but marked as end-of-life

### 26.2 — Store flow

```
Browse store → Select module → View detail + pricing → Choose action:

  Free/Included:
    → Install → Enable → Done

  Trial:
    → Start Trial → ModuleLicense(license_type='trial') → Install → Enable

  Paid (Subscription):
    → Purchase → billing integration → ModuleLicense(license_type='subscription') → Install → Enable

  Enterprise:
    → Request quote → system-admin approval → ModuleLicense(license_type='enterprise') → Install → Enable
```

---

## §27 — License / Purchase Flow (Extended)

The `ModuleLicense` model from §7.5 is extended with a richer type system.

### 27.1 — Updated `ModuleLicense` fields

Add to the model defined in §7.5:

```
license_type                 String(20) NOT NULL DEFAULT 'perpetual'
                             CHECK IN (trial, subscription, perpetual, usage_based, enterprise, included)
                             ← replaces purchase_type

seats_limit                  Integer NULLABLE                  ← NULL = unlimited
usage_limit                  Integer NULLABLE                  ← NULL = unlimited (for usage_based)
billing_subscription_id      String(255)                       ← external Stripe/billing ref

purchased_by                 Integer FK → users.id NULLABLE    ← WAS: purchaser_email string
approved_by                  Integer FK → users.id NULLABLE    ← for enterprise license grants
```

### 27.2 — License enforcement rules

| Trigger | Action |
|---------|--------|
| License expired | Prevent new usage; existing enabled module: `suspended` state if grace period passed |
| License suspended (billing failure) | Module moves to `suspended` immediately |
| License cancelled | Module moves to `disabled`; org-admin notified |
| Seats exceeded | Block new user onboarding to module; existing users unaffected |
| Trial expired | License transitions to `expired`; org-admin notified; 7-day grace period |
| Enterprise license granted | system-admin creates `ModuleLicense(license_type='enterprise', approved_by=admin)` |

### 27.3 — License audit requirements

Every license state transition writes:
- `ModuleLog(action='license_*', org_id, user_id)`
- Never logs `license_key` value

---

## §28 — Store + Versioning UI Routes

Routes added to the platform-ui Module Hub (R038E + R038I).

| Route | Description | Auth |
|-------|-------------|------|
| `/modules/store` | Browse marketplace | `modules.view` |
| `/modules/store/[moduleKey]` | Module store detail + version history | `modules.view` |
| `/modules/installed` | Org's installed + enabled modules | `modules.view` |
| `/modules/installed/[moduleKey]` | Installed module detail + status | `modules.view` |
| `/modules/installed/[moduleKey]/versions` | Version history + available upgrades | `modules.view` |
| `/modules/installed/[moduleKey]/upgrade` | Start / review upgrade job | `modules.enable` |
| `/modules/licenses` | Org licenses list | `modules.license.view` |
| `/modules/upgrade-jobs` | Org upgrade job history | `modules.audit.view` |
| `/modules/catalog` | System module catalog | system_admin |
| `/modules/catalog/[moduleKey]/versions` | All versions for a module | system_admin |
| `/modules/catalog/[moduleKey]/packages` | Package management | system_admin |
| `/modules/store/manage` | Manage store listings | system_admin |

**Shared capabilities used:**
`PlatformPageShell`, `DataTable`, `DetailView`, `PlatformForm`, `PermissionGate`,
`ConfirmActionDialog`, `ActionButton`, `PlatformTimeline`, `PlatformAuditLog`, `PlatformJobRunner`

---

## §29 — Security Requirements (Versioning + Marketplace + Packages)

In addition to the general rules in §09:

| Requirement | Detail |
|-------------|--------|
| Package upload: system-admin only | `modules.system.manage` permission; no org-admin upload path |
| No hot-loading | `backend_plugin` packages require a CI/CD deploy; never `importlib.import_module()` on uploaded files |
| Checksum verification | Upgrade executor verifies `checksum_sha256` before applying any package |
| Cross-org isolation | An org can only see its own `OrgModule`, `ModuleUpgradeJob`, `ModuleLicense` rows |
| Store visibility | Org-scoped: `listing_status='private'` modules only visible to allowlisted orgs |
| Yanked version alert | Orgs running a yanked version receive a notification via platform outbox |
| Upgrade audit completeness | `ModuleUpgradeJob` row must exist before any migration SQL runs |
| Rollback authority | Only the org-admin who initiated the upgrade or a system-admin may trigger rollback |
| License key never in logs | `license_key` encrypted in DB; never in `ModuleLog.details`, API responses, or upgrade logs |
| Destructive migration gate | `dry_run_result.has_irreversible=True` requires explicit org-admin acknowledgement before `status` advances to `running` |

---

## §30 — AI Integration for Versioned Modules

Module versioning data surfaces to AI subsystems:

| AI Subsystem | Data exposed by Module Manager | Notes |
|---|---|---|
| AI Action Platform | `aiActions[]` from `manifest_snapshot` of installed version | Actions from non-installed or yanked versions excluded |
| Floating AI Assistant | `aiPageContexts[]` from installed version manifest | Context changes after upgrade detected via `installed_version_id` |
| AI Service Routing | `module_key` + `is_module_available()` | Routing matrix filters by enabled org modules |
| AI Onboarding | `aiOnboarding{}` from installed version manifest | Re-runs onboarding if major version bump |
| Cost Estimation | `manifest_snapshot.estimatedAiUsage` (future field) | Marketplace shows estimated AI spend per module |

**Rules:**
- AI actions from module version X are not available until `OrgModule.installed_version_id = X`
- Yanked version AI actions are disabled immediately on yank (action registry refresh)
- AI execution always routes through AI Action Platform + AI Provider Gateway — Module Manager provides metadata only

---

## §31 — Updated R038 Phase Split (including Versioning + Marketplace)

The original R038A-G phases are preserved. Two new phases are added.

| Phase | What | Notes |
|-------|------|-------|
| R038A | Contract doc ✅ | Done |
| R038B | Additive schema foundation | No destructive changes |
| R038C | Read model + availability helper + tests | |
| R038D | JWT read-only APIs | |
| R038E | platform-ui read-only Module Hub | `/modules/installed`, `/modules/catalog` |
| R038F | Write APIs + enable/disable flow | |
| R038G | Cleanup / deprecation | 30d after R038F |
| **R038H** | **Versioning + Upgrade** | `ModuleVersion`, `ModuleUpgradeJob`, `ModulePackage` tables + upgrade workflow + package security + store UI scaffolding |
| **R038I** | **Marketplace + Store** | `ModuleStoreListing` + store UI + purchase/trial/license flow |

**Gate for R038H:** R038F deployed + stable for 2 weeks.
**Gate for R038I:** Billing integration (Stripe) decision made (OQ-03 / product decision).

---

## §32 — ADR-032

**ADR-032: Module Versioning, Upgrade Jobs, Package Management, and Marketplace**

- **Context:** ADR-031 defined per-org module state but assumed all orgs run the same version.
  ResolveAI requires independent per-org version progression: Org A on v1.2.0, Org B on v1.4.0.
  Module upgrade is a high-risk operation requiring dry-run, approval gates, rollback, and full
  audit. Physical package files must be stored in object storage with checksum integrity, not
  code-executed from DB.
- **Decision:** (1) Add `ModuleVersion` as a system-level version registry. (2) Extend `OrgModule`
  with `installed_version_id`, `target_version_id`, `rollback_version_id`, `auto_update_policy`,
  `release_channel_allowed`. (3) Add `ModuleUpgradeJob` with 9-step workflow and approval gates.
  (4) Add `ModulePackage` for package metadata; files live in S3, never in DB. (5) Add
  `ModuleStoreListing` as the marketplace presentation layer. (6) Extend `ModuleLicense` with
  `license_type` and `seats_limit`. (7) No dynamic code loading from uploaded packages.
- **Alternatives rejected:**
  - All orgs always on latest version — rejected: too risky for production orgs, no rollback
  - Store package files as DB BLOBs — rejected: S3 is the right store for binary artifacts
  - Inline upgrade in the same transaction as enable — rejected: upgrade is a multi-step job, not an atomic operation
- **Consequences:**
  - `OrgModule` gains 7 new fields (all nullable, additive)
  - Upgrade is now a Job (async, auditable) not a synchronous API call
  - Package deletion is blocked if any org installed on that version
  - Marketplace/store is fully data-driven via `ModuleStoreListing`
- **Affected modules:** `apps/module_manager/` (models, services, api_routes), S3/storage layer,
  `platform-ui/app/(dashboard)/modules/`, billing integration (Phase I)
- **Spec:** `docs/system-upgrade/45-module-manager-redesign.md §22–§31`

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2026-04-25 | Platform Eng | v1.0 — initial design |
| 2026-04-25 | Platform Eng | v2.0 — R038 Follow-up: source of truth, lifecycle, manifest integration, permission model, enforcement, audit, testing, backward compat, AI integration, R038A-G split |
| 2026-04-25 | Platform Eng | v3.0 — R038A2: per-org versioning (§22), upgrade workflow (§23), rollback policy (§24), package management (§25), marketplace (§26), license/purchase flow (§27), store UI routes (§28), security (§29), AI integration v2 (§30), R038H-I phases (§31), ADR-032 (§32) |
