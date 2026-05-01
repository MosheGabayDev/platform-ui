# 46 — Module Manager Implementation Inventory (R038B0)

_Created: 2026-04-25 (R038B0) | Status: Verified — Gate for R038B_

---

## 1. Executive Summary

This document provides verified answers to the 7 open questions from doc 45 §18,
plus 3 additional scoping decisions required before R038B migrations begin.

All findings are based on direct code inspection of the live codebase.

**Key surprises discovered:**

- Manifest files are `manifest.json` / `manifest.v2.json` — NOT `module.manifest.json` as doc 45 §01 specifies. **This is a terminology correction required before R038B.**
- The `module_key` concept from doc 45 maps directly to `Module.name` (already exists; no new field needed for identity — only denormalization onto `OrgModule`).
- 37+ modules already have manifests; they use `manifest.v2.json` format with `menu_items` array (already serving nav data).
- The `Organization` model is a **stub** — `__tablename__ = 'organizations'`, single `id` column. FK target confirmed: `organizations.id`.
- `apps/__init__.py` already has partial org-scoped module filtering via `OrgFeatureFlag` (line 193) — this is the compatibility layer hook point.
- Migration framework is Alembic with custom runner; migrations are in `scripts/migrations/versions/` (project-level) and `migrations/versions/` (Alembic root).
- `ModuleVersion` must be included in R038B to avoid a breaking migration later when `OrgModule.installed_version_id` FK is added.

---

## 2. Open Questions — Answered

### OQ-01: OrgModule seed scope

**Decision: Lazy-create on first org module access, pre-seed core modules for all orgs.**

Rationale:
- `Organization` is a stub model with only `id`. We do not know how many orgs exist or their state.
- A big-bang seed migration (`INSERT INTO org_modules SELECT ... FROM modules CROSS JOIN organizations`) is risky on a live shared DB with unknown org count.
- Safest strategy:

```
R038B migration seeds OrgModule rows for:
  - All is_core=True modules × all orgs (org_status='enabled')

R038C ModuleCompatLayer lazy-creates OrgModule for non-core modules:
  - org_status = 'enabled' if Module.is_enabled=True
  - org_status = 'available' if Module.is_enabled=False
```

This maps the current global `is_enabled` state to each org's initial state,
avoiding a cross-join while ensuring core modules are always available.

### OQ-02: ModuleSettings → OrgModuleSettings seed

**Decision: Do not seed ModuleSettings to orgs in R038B.**

`ModuleSettings` records are currently system-level (no `org_id`). They will continue
to be read as system defaults via `ModuleCompatLayer`. Org-specific setting overrides
(`OrgModuleSettings`) are lazy-created in R038F (write APIs). No seed migration needed.

### OQ-03: Licenses required?

**Decision: No. Licenses are not required until R038I (marketplace/billing integration).**

The `ModuleLicense` model will be created in R038B as an empty scaffold (so `OrgModule.license_id`
FK can exist). No license enforcement until R038F/I.

### OQ-04: Org table FK target

**VERIFIED: `organizations.id` (Integer PK).**

```python
# apps/authentication/models.py lines 20-30
class Organization(db.Model):
    __tablename__ = 'organizations'
    id = db.Column(db.Integer, primary_key=True)
```

The `Organization` model is a lightweight stub. All org-scoped FK references
in R038B migrations must target `organizations.id`.

Note: `users.org_id` (FK to organizations.id) is how the existing code finds the org
for a logged-in user. Verify `users` table has `org_id` column before writing
`OrgModule.enabled_by FK → users.id` with org_id join.

### OQ-05: Script execution — system-only or org-scoped?

**Decision: System-only. `ScriptExecution` remains unscoped.**

Scripts (`generate_registry`, `generate_manifests`) are system-administration operations.
`ScriptExecution.executed_by` stays as `String(255)` (username string, not FK) in R038B.
A future round may add `user_id FK → users.id` if needed for audit hardening.

### OQ-06: Existing manifest files and module_key values

**CRITICAL CORRECTION REQUIRED: Manifest filename is NOT `module.manifest.json`.**

Doc 45 §01 specifies `apps/<module>/module.manifest.json` as the manifest path.
**Actual convention in codebase:**
- `apps/<module>/manifest.json` (v1 format)
- `apps/<module>/manifest.v2.json` (v2 format, preferred)

The validator (`manifest_validator.py` line 80-82) loads `manifest.v2.json` first,
then falls back to `manifest.json`. Neither file is named `module.manifest.json`.

**Modules with manifests found:** 37+ modules (75 total manifest files across v1+v2).

Sample modules WITH manifests:
`admin`, `agents`, `ai_agents`, `ai_settings`, `api`, `authentication`, `automation`,
`billing`, `charts`, `cicd_assistant`, `clinic`, `disk_cleanup`, `documentation`,
`security`, `sefaria_integration`, `server_permissions`, `services`, `services_manager`,
`service_manager`, `setup_wizard`, `smart_home`, `smart_home_test`, `testing`,
`voice_support`

Modules WITHOUT `manifest.v2.json` (partial list, may have `manifest.json` only):
`helpdesk`, `ala`, `life_assistant`, `mobile_voice`, `ai_providers`, `fitness_nutrition`,
`helpdesk`, `knowledge_ingestion`, `rag`, `ops_intelligence`, `infrastructure`

**`module_key` mapping:**
The `name` field in `manifest.v2.json` IS the `module_key`.
`Module.name` in the DB already stores this value.
No new column needed — `OrgModule.module_key` is a denormalized copy of `Module.name`.

**v2 manifest nav fields (verified from `apps/admin/manifest.v2.json`):**
```json
"menu_items": [
  {
    "id": "admin_organizations",
    "label": {"en": "Organizations", "he": "ארגונים"},
    "url": "/admin/organizations",
    "icon": "building",
    "order": 1,
    "permission": "admin",
    "match_prefix": "/admin/organizations"
  }
]
```

**R038B action:** Correct doc 45 §01 to use `manifest.v2.json` / `manifest.json`.
Add migration path: `manifest.v2.json` → `module.manifest.json` is a FUTURE rename (R038G).

### OQ-07: Deprecated modules — block new org enables?

**Decision: Yes. `system_status='deprecated'` blocks new org enables.**

`ModuleEnforcementService.check_enable_preconditions()` step 2 must reject
`enable` when `Module.system_status = 'deprecated'`. Existing enabled orgs
may remain enabled but receive a deprecation warning in the UI.

---

## 3. Current Schema Inventory

### Table: `modules`

| Column | Type | Keep/Deprecate/Migrate |
|--------|------|----------------------|
| `id` | Integer PK | Keep |
| `name` | String(100) UNIQUE | Keep — becomes `module_key` reference |
| `display_name` | String(200) | Keep (system catalog) |
| `description` | Text | Keep |
| `version` | String(50) | Keep (latest available from manifest) |
| `installed_version` | String(50) | **Deprecate** after R038B adds `OrgModule.installed_version` |
| `min_system_version` | String(50) | Keep |
| `is_installed` | Boolean | **Deprecate** after R038C compat layer → R038G drop |
| `is_enabled` | Boolean | **Deprecate** after R038C compat layer → R038G drop |
| `is_core` | Boolean | Keep |
| `module_type` | String(50) | Keep |
| `category` | String(100) | Keep |
| `installed_at` | DateTime | **Deprecate** (move to OrgModule) |
| `installed_by` | String(255) | **Deprecate** (String, not FK — move to OrgModule.enabled_by FK) |
| `updated_at` | DateTime | Keep |
| `config_schema` | Text | Keep (system catalog) |
| `config_data` | Text | Keep (system-level default config) |
| `dependencies` | Text (JSON blob) | **Deprecate** → `ModuleDependency` table in R038B |
| `author` | String(255) | Keep |
| `homepage` | String(500) | Keep |
| `icon` | String(100) | Keep |
| `menu_items` | Text (JSON) | **Deprecate** → manifest nav system (R038E) |
| `created_at` | DateTime | Keep |
| `system_status` | **MISSING** | **Add in R038B** — `registered/beta/active/deprecated/removed` |
| `module_key` | **MISSING** | Not needed as separate column; `name` IS the module_key |

**Risky fields:** `installed_version` (currently global/single-tenant, all writes will break
multi-tenancy if left in place during R038B-F transition).

### Table: `module_permissions`

| Column | Status |
|--------|--------|
| `id`, `module_id` FK, `permission_name`, `permission_type`, `description`, `created_at` | Keep as-is |

No org-scoping needed. Permissions are system-level declarations from manifests.

### Table: `module_settings`

| Column | Status |
|--------|--------|
| `id`, `module_id` FK | Keep |
| `setting_key`, `setting_group`, `setting_value`, `default_value`, `value_type` | Keep (system defaults) |
| `display_name`, `description`, `validation_rules` | Keep |
| `is_required`, `is_secret`, `is_editable`, `environment` | Keep |
| `updated_by` | String(255) — soft deprecate (not FK) |
| `updated_at`, `created_at` | Keep |
| `org_id` | **MISSING** — add in R038B to enable per-org settings (`OrgModuleSettings`) |

UNIQUE: `(module_id, setting_key, environment)` — will become `(module_id, org_id, setting_key, environment)` in R038B.

### Table: `module_logs`

| Column | Status |
|--------|--------|
| `id`, `module_id` FK (nullable), `module_name` | Keep |
| `action`, `status`, `ip_address`, `details`, `error_message`, `created_at` | Keep |
| `user` | String(255) — **Migrate** to `user_id FK → users.id` + `org_id FK → organizations.id` in R038B |

### Table: `module_purchases`

| Column | Status |
|--------|--------|
| `id`, `module_id` FK | Keep |
| `purchase_code`, `license_key`, `purchaser_email`, `purchaser_name` | Keep |
| `organization` | String(255) — **CRITICAL: NOT FK** — migrate to `org_id FK → organizations.id` in R038B |
| `purchase_type`, `purchase_date`, `price`, `currency` | Keep |
| `valid_from`, `valid_until`, `is_active`, `is_trial` | Keep |
| `max_users`, `max_installations`, `current_installations` | Keep |
| `payment_method`, `payment_status`, `transaction_id` | Keep |
| `subscription_id`, `auto_renew`, `next_billing_date` | Keep |
| `notes`, `custom_data` | Keep |
| `activated_at`, `activated_by`, `deactivated_at`, `deactivated_by`, `deactivation_reason` | Keep (activated_by String — soft deprecate) |
| `created_at`, `updated_at` | Keep |

### Table: `script_executions`

| Column | Status |
|--------|--------|
| All columns | Keep as-is |
| `executed_by` | String(255) — system-only, no FK needed (OQ-05 decision) |

### Table: `module_changelogs`

| Column | Status |
|--------|--------|
| All columns | Keep as-is |
| UNIQUE `(module_id, version)` | Keep |

System-level. No org-scoping needed.

---

## 4. Current Module Manifest Inventory

**Location convention (actual, not doc 45 spec):**
- `apps/<module>/manifest.v2.json` — v2 format (preferred)
- `apps/<module>/manifest.json` — v1 format (fallback)
- Validator: `apps/module_manager/manifest_validator.py`

**Count:** 75 manifest files (v1 + v2) across 37+ modules.

**v2 Manifest fields (verified from `apps/admin/manifest.v2.json`):**
```
manifest_version, name, display_name, version, category, type, author,
license, summary, description, depends, external_dependencies,
installable, auto_install, application, web, requires_migration,
permissions, blueprint_name, icon, menu_items (with id, label, url, icon, order, permission, match_prefix),
database.tables, database.migrations,
i18n.directory/languages/default_language/merge_to_central/namespace,
templates.directory/location/namespace/files,
static.directory/location/namespace/files,
api.endpoints/webhooks,
background_tasks.enabled/tasks,
hooks.pre_install/post_install/pre_uninstall/post_uninstall/pre_update/post_update,
export_config, import_config
```

**v2 nav fields vs doc 45 proposed `nav_items` spec:**

| doc 45 field | Actual manifest field | Status |
|---|---|---|
| `nav_id` | `id` | Rename or alias |
| `label` | `label` (i18n dict `{en, he}`) | Compatible |
| `path` | `url` | Rename |
| `icon` | `icon` | Compatible |
| `group` | Not present | Add in R038B manifest v2 spec |
| `order` | `order` | Compatible |
| `required_permission` | `permission` | Rename |
| `is_core` | Not per nav-item | Derive from parent module `is_core` |
| `badge/count` | Not present | Future |
| `feature_flag` | Not present | Add in R038B manifest v2 spec |
| `match_prefix` | `match_prefix` | Keep |
| `visibility_rule` | Not present | Future |

**Modules without any manifest (partial list — no `manifest.json` or `manifest.v2.json`):**
`helpdesk`, `ala`, `life_assistant`, `mobile_voice`, `ai_providers`, `fitness_nutrition`,
`knowledge_ingestion`, `rag`, `ops_intelligence`, `infrastructure`

These modules are registered differently (hardcoded in `apps/__init__.py`). They need
manifests created in R038B as part of the manifest-first migration.

---

## 5. Legacy Field Usage Inventory

### `Module.is_enabled` callers

| Location | Usage | Classification |
|----------|-------|---------------|
| `apps/module_manager/routes.py:36` | `filter_by(is_enabled=True, is_installed=True)` in index stats | Read, route |
| `apps/module_manager/routes.py:100` | `sum(1 for m in modules if m.is_enabled)` stats | Read |
| `apps/module_manager/routes.py:284` | `module.is_enabled = new_status` (toggle write) | **Write path** |
| `apps/module_manager/routes.py:2036` | `filter_by(is_enabled=True, is_installed=True)` (menu endpoint) | Read, API |
| `apps/__init__.py:171` | `filter_by(is_enabled=True, is_installed=True)` (context processor) | Read, background |
| `apps/__init__.py:703` | `filter_by(is_enabled=True, is_installed=True)` (blueprint auto-register) | Read, startup |
| `apps/__init__.py:193-200` | Partial org-scoped filter via `OrgFeatureFlag` | Read, partial compat |

### `Module.is_installed` callers

| Location | Usage | Classification |
|----------|-------|---------------|
| `apps/module_manager/routes.py:69` | `modules_count = Module.query.count()` (auto-sync gate) | Read |
| `apps/module_manager/routes.py:87` | `Module.query.all()` (load all) | Read |
| `apps/module_manager/routes.py:99` | `sum(1 for m in modules if m.is_installed)` stats | Read |
| `apps/module_manager/routes.py:240` | `if not module.is_installed` (install gate) | Read, route |
| `apps/module_manager/routes.py:474` | `if module.is_installed` | Read |
| `apps/module_manager/routes.py:573` | `if not module.is_installed` | Read |
| `apps/module_manager/routes.py:1159` | `if not module.is_installed` | Read |
| `apps/module_manager/routes.py:1238` | `if not module.is_installed` | Read |
| `apps/__init__.py:703` | startup blueprint filter | Read, startup |

### `Module.installed_version` callers

| Location | Usage | Classification |
|----------|-------|---------------|
| `apps/module_manager/models.py:126` | `has_update_available()` comparison | Read, model method |
| `apps/module_manager/models.py:144-186` | `get_version_info()` comparison | Read, model method |
| `apps/module_manager/routes.py:1254` | `module.installed_version` guard | Read |
| `apps/module_manager/routes.py:1296` | `module.installed_version = target_version` | **Write path** |
| `apps/module_manager/routes.py:1381` | `if not module.installed_version` | Read |

### `Module.dependencies` callers

| Location | Usage | Classification |
|----------|-------|---------------|
| `apps/module_manager/routes.py:667-679` | JSON parse dependency names | Read, API |
| `apps/module_manager/services.py` (inferred) | `check_module_dependencies()` | Read |

### `ModuleSettings` callers

| Location | Usage | Classification |
|----------|-------|---------------|
| `apps/module_manager/routes.py` (not directly accessed in routes inspected) | Via model relationship | Read |
| `Module.settings` relationship | Cascade read | Read |

### `ModulePurchase.organization` (String field)

| Location | Usage | Classification |
|----------|-------|---------------|
| `apps/module_manager/models.py:406` | Set on purchase creation | Write path |
| `apps/module_manager/routes.py` | Not directly accessed | — |

### `ModuleLog.user` (String field)

| Location | Usage | Classification |
|----------|-------|---------------|
| `apps/module_manager/routes.py:296` | `user=current_user.username` | Write path |
| `apps/module_manager/routes.py:349` | `user=current_user.username` | Write path |
| Multiple other toggle/install/uninstall handlers | Same pattern | Write path |

### `ScriptExecution.executed_by` (String field)

| Location | Usage | Classification |
|----------|-------|---------------|
| `apps/module_manager/routes.py:859` | `executed_by=current_user.username` | Write path |

**All `@login_required` instead of `@jwt_required` (ADR-028 violation):**
Every route in `apps/module_manager/routes.py` uses `@login_required` and
`current_user.username`. In R038D these will be replaced with `@jwt_required + g.jwt_user`.

---

## 6. Migration Framework Findings

**Framework:** Alembic with custom runner (`scripts/migrations/run_migration.py`).

**Migration locations:**
- `scripts/migrations/versions/` — project-level migration scripts (130+ files)
- `migrations/versions/` — Alembic root location (referenced by `alembic.ini`)

**Naming convention:** `YYYYMMDD_description.py` (e.g., `20260424_extend_ai_usage_log.py`)

**Run command:**
```bash
python scripts/migrations/run_migration.py <revision_id>
python scripts/migrations/run_migration.py <revision_id> --verify-table <table_name>
```

**Migration style:** Alembic `op.add_column()`, `op.create_table()`, etc. Standard patterns.

**Idempotency:** Migrations use `IF NOT EXISTS` via Alembic's `checkfirst=True` on
`op.create_table()`. Nullable columns added with `op.add_column()` are safe to re-run
(Alembic skips if column exists on PostgreSQL via `IF NOT EXISTS`).

**JSONB availability:** PostgreSQL only (confirmed — platform uses PostgreSQL exclusively).
Use `sa.dialects.postgresql.JSONB` for JSONB columns in R038B.

**29 parallel migration heads by design** (many files with `down_revision=None`).
This is expected in this project — not corruption. The custom runner handles it.

**R038B migration filename target:** `20260425_module_manager_multitenant_base.py`

---

## 7. Org/User FK Verification

### organizations table

```
Class: Organization (apps/authentication/models.py:20)
Table: organizations
PK:    id (Integer)
```

**FK syntax for R038B migrations:**
```python
sa.Column("org_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False)
```

### users table

```
Class: User (apps/authentication/models.py:67)
Table: users
PK:    id (Integer)
```

**FK syntax for audit columns:**
```python
sa.Column("enabled_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True)
```

### Consistency check

`users.org_id` FK → `organizations.id` is how existing code scopes per-org queries.
This pattern must be preserved and enforced in all R038B+ APIs.

---

## 8. Recommended R038B Scope (Updated)

Based on the inventory, the following adjustments to R038B scope are recommended:

### Include in R038B

1. **New tables (additive only):**
   - `org_modules` — core multi-tenancy table
   - `module_versions` — include now (not R038H) to avoid breaking migration on `installed_version_id`
   - `module_licenses` — empty scaffold (so FK from `org_modules.license_id` resolves)
   - `module_dependencies` — structured replacement for `Module.dependencies` JSON blob

2. **Additive columns to existing tables:**
   - `modules.system_status` VARCHAR(30) NOT NULL DEFAULT 'active'
   - `module_logs.user_id` INTEGER FK → users.id NULLABLE
   - `module_logs.org_id` INTEGER FK → organizations.id NULLABLE
   - `module_purchases.org_id` INTEGER FK → organizations.id NULLABLE (alongside existing `organization` String column — do not drop yet)

3. **Seed data:**
   - `OrgModule` rows for `is_core=True` modules × all `organizations.id` values
   - `ModuleVersion` row for each `Module` (version = `Module.version`, status = 'published')

### Defer from R038B

- `ModuleUpgradeJob` — defer to R038H
- `ModulePackage` — defer to R038H
- `ModuleStoreListing` — defer to R038I
- Drop of `Module.is_enabled`, `Module.is_installed` — defer to R038G
- `OrgModuleSettings` — defer to R038F

### NOT in R038B (confirmed by this inventory)

- No route changes
- No model method changes
- No UI changes
- No `@login_required` → `@jwt_required` migration
- No manifest file renames

---

## 9. ModuleVersion Timing Decision

**Decision: Include `ModuleVersion` in R038B.**

Reason: `OrgModule.installed_version_id FK → module_versions.id` is part of the core
per-org versioning design. If R038B adds `OrgModule` with only `installed_version VARCHAR`
(string), then R038H would need to:
1. Add `module_versions` table
2. Back-fill `installed_version_id` from the string
3. Drop `installed_version` string column

Step 3 is a destructive migration — risky on a live production DB.

**Safer approach (recommended):** Add `ModuleVersion` in R038B with minimal fields.
Seed one `ModuleVersion` row per existing `Module`. `OrgModule.installed_version_id`
FK is added in R038B pointing to this seeded row.

`ModuleVersion` R038B minimal schema:
```python
module_versions:
  id, module_id FK, module_key, version, release_channel='stable', status='published',
  rollback_supported=False, manifest_snapshot=NULL, published_at, created_at
  UNIQUE(module_id, version)
```

Full `ModuleVersion` fields (from doc 45 §22) can be added as nullable columns in R038H
without breaking the FK.

---

## 10. ModulePackage / Marketplace Timing Decision

**Decision: Defer ModulePackage and ModuleStoreListing to R038H/I.**

Reason:
- No existing data to migrate
- No callers to break
- Purely additive tables
- Marketplace requires billing integration decision (still pending)

**R038B:** No `module_packages` or `module_store_listings` tables.
**R038H:** Add `module_packages`, `module_upgrade_jobs`, full `ModuleVersion` columns.
**R038I:** Add `module_store_listings`, marketplace APIs.

---

## 11. Compatibility Layer Requirements

`ModuleCompatLayer` must be implemented in R038C with the following read-through support:

| Legacy access | Compat resolution |
|---|---|
| `Module.is_enabled` | Read `OrgModule.is_enabled` for `g.jwt_user.org_id`; fall back to global value if no `OrgModule` row |
| `Module.is_installed` | Read `OrgModule.org_status` in ('installed','enabled'); fall back to global value |
| `Module.installed_version` | Read `OrgModule.installed_version_id → ModuleVersion.version`; fall back to `Module.version` |
| `Module.query.filter_by(is_enabled=True)` | Replace with `is_module_available(org_id, module_key)` |
| `inject_enabled_modules_global` context processor | Replace with `get_enabled_modules_for_org(org_id)` in R038E |

The context processor at `apps/__init__.py:164-207` already has partial org filtering via
`OrgFeatureFlag` (line 193). This is the migration hook point. R038E replaces this
entirely with the `OrgModule`-based resolution.

---

## 12. Risks Before Migration

| Risk | Severity | Mitigation |
|------|----------|------------|
| `Organization` table is a stub — may have no rows or unknown count | Medium | Pre-migration `SELECT COUNT(*) FROM organizations` check |
| `Module.is_enabled` write at `routes.py:284` bypasses org context | High | Compat layer must intercept writes in R038C; mark field as deprecated immediately |
| `inject_enabled_modules_global` has 60s cache — mixed old/new state during migration | Low | Cache is per-process; rolling deploys reset it |
| `ModulePurchase.organization` string may contain org names that don't match `organizations.id` | Medium | Add nullable `org_id` column; do NOT try to back-fill from string; leave manual cleanup |
| `ModuleLog.user` strings don't have FK constraints — may reference non-existent users | Low | Add nullable `user_id`; do NOT back-fill |
| 37+ modules already have `manifest.v2.json` with `menu_items` — doc 45 says `nav_items` | Medium | Rename field in doc 45 to match actual convention, or plan v3 manifest format migration |
| `apps/__init__.py` auto-registers blueprints by `Module.is_enabled=True` at startup — multi-tenant blueprints cannot be dynamically registered per-org | Low | Blueprint registration remains system-level; org visibility is enforced at route/middleware level, not blueprint level |
| `ModuleVersion` seed requires one row per existing `Module` — must run inside migration | Low | Use Alembic `op.execute()` for seed in upgrade() |

---

## 13. Navigation Source of Truth — Pre-Implementation Findings

The existing nav system (relevant to the navigation hardening request) works as:

1. `manifest.v2.json` → `menu_items` array (static, per module)
2. `Module.menu_items` DB column (JSON text, synced from manifest on startup)
3. `inject_enabled_modules_global()` context processor injects `enabled_modules` + `enabled_module_names` into every Jinja2 template
4. Partial org filtering at `apps/__init__.py:193`: uses `OrgFeatureFlag` with `feature_key = 'module_<name>'`
5. `GET /api/modules/enabled-menu` returns menu items for enabled+installed modules (no auth — **ADR-028 violation**)

**Gap:** The endpoint `/api/modules/enabled-menu` has no `@login_required` and no `@jwt_required`. It leaks enabled module names to unauthenticated callers.

**Gap:** Nav is scoped by `is_enabled=True AND is_installed=True` globally — not per-org (partially patched via `OrgFeatureFlag` but incomplete).

**The `GET /api/org/modules/navigation` endpoint** planned in doc 45 §33 (to be added) will be the replacement: JWT-required, org-scoped, per-user-permission-filtered, short-TTL cacheable.

---

## 14. Acceptance Criteria Before R038B

All of the following must be confirmed before R038B migration is written:

- [x] **OQ-01:** OrgModule seed strategy decided (lazy for non-core, pre-seed for core)
- [x] **OQ-02:** ModuleSettings seeding strategy decided (no seed; lazy in R038F)
- [x] **OQ-03:** License requirement decision (deferred to R038I)
- [x] **OQ-04:** FK target verified (`organizations.id`, `users.id`)
- [x] **OQ-05:** ScriptExecution scope decided (system-only)
- [x] **OQ-06:** Manifest filename corrected (`manifest.v2.json` not `module.manifest.json`); module_key = `Module.name`
- [x] **OQ-07:** Deprecated module enable policy decided (block new enables)
- [x] **ModuleVersion timing:** Include in R038B (minimal schema)
- [x] **ModulePackage/Store timing:** Defer to R038H/I
- [x] **Navigation source of truth:** Documented in §33 of doc 45 (requires doc update)
- [ ] **Pre-migration check:** Verify `SELECT COUNT(*) FROM organizations` > 0
- [ ] **Doc 45 header fix:** Update to v3.0
- [ ] **Doc 45 §01 correction:** Rename `module.manifest.json` → `manifest.v2.json` in spec

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2026-04-25 | Platform Eng | v1.0 — R038B0 inventory, all OQs answered, schema inventoried |
