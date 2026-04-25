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

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2026-04-25 | Platform Eng | v1.0 — initial design |
| 2026-04-25 | Platform Eng | v2.0 — R038 Follow-up: added source of truth, lifecycle model, manifest integration, permission model, dependency enforcement, route/nav enforcement, audit requirements, testing strategy, backward compatibility, AI integration, split R038A-G |
