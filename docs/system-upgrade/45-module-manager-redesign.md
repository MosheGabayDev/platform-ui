# 45 — Module Manager Redesign (R038)

_Created: 2026-04-25 | Status: Design / Pre-Implementation_

---

## Overview

The current Module Manager (`apps/module_manager/`) was built as a single-tenant platform
administration tool. Now that the platform is a multi-tenant SaaS (ResolveAI), the model
has critical gaps that prevent full functionality:

- Modules can only be enabled/disabled **system-wide** — no per-org control
- `ModulePurchase.organization` is a loose string, not linked to the `orgs` table
- Audit fields (`ModuleLog.user`, `ScriptExecution.executed_by`) are untyped strings, no FK
- Module dependencies are a JSON blob — no referential integrity
- Routes use Flask-Login (`@login_required`) — violates ADR-028 BE-01/BE-03
- No `org_id` on any model — multi-tenant queries are structurally impossible

**Goal:** Redesign the DB models to support full multi-tenant functionality while preserving
all existing capabilities. Code is secondary to correct schema design.

---

## §01 — Current Model Inventory

| Model | Table | Key Problem |
|-------|-------|-------------|
| `Module` | `modules` | `is_installed`, `is_enabled` are global — no per-org state |
| `ModulePermission` | `module_permissions` | No role FK, no org scoping |
| `ModuleSettings` | `module_settings` | Overlaps with `Module.config_data`; no org scoping |
| `ModuleLog` | `module_logs` | `user` is `String(255)`, no FK; no `org_id` |
| `ModulePurchase` | `module_purchases` | `organization` is `String(255)`, no FK to `orgs` |
| `ScriptExecution` | `script_executions` | `executed_by` is `String(255)`, no FK |
| `ModuleChangelog` | `module_changelogs` | OK — no structural problems |

**JSON blobs that need refactoring:**

| Column | Current | Problem | Solution |
|--------|---------|---------|----------|
| `Module.dependencies` | `Text` JSON array of module names | No FK, no version constraints, no cascade | → `ModuleDependency` table |
| `Module.config_data` | `Text` JSON | Redundant with `ModuleSettings` | → Merge into `ModuleSettings` |
| `Module.menu_items` | `Text` JSON | Acceptable as JSON — keep as `JSONB` | → Keep, type as JSONB |
| `Module.config_schema` | `Text` JSON | Acceptable as JSON schema — keep | → Keep, type as JSONB |
| `ModuleSettings.validation_rules` | `Text` JSON | Acceptable — keep | → Keep, type as JSONB |
| `ScriptExecution.result_data` | `Text` JSON | Should be queryable | → JSONB |
| `ScriptExecution.arguments` | `Text` JSON | Should be queryable | → JSONB |
| `ModuleLog.details` | `Text` JSON | Should be queryable | → JSONB |

---

## §02 — Design Goals

1. **Multi-tenant module state** — each org independently enables/disables/configures modules
2. **License enforcement** — `ModuleLicense` (renamed from `ModulePurchase`) with hard `org_id` FK
3. **Proper audit trail** — all user references are `Integer FK → users.id`; all org context has `Integer FK → orgs.id`
4. **Referential integrity for dependencies** — `ModuleDependency` join table replaces JSON blob
5. **ADR-028 compliance** — all routes use `@jwt_required + g.jwt_user`, no Flask-Login
6. **No functional regression** — all 40+ existing route operations must work after migration

---

## §03 — New Model Design

### 3.1 — `Module` (system catalog — unchanged shape, improved types)

Represents a module that exists on the platform. System-global. Only system-admins write this.

```python
class Module(db.Model):
    __tablename__ = 'modules'

    id               = Integer PK
    name             = String(100) UNIQUE NOT NULL  -- e.g. 'helpdesk', 'ai_agents'
    display_name     = String(200) NOT NULL
    description      = Text

    # Version (system-level, not per-org)
    version          = String(50) NOT NULL   -- latest available from manifest
    min_system_version = String(50)

    # Status (system-level only)
    is_system_installed = Boolean DEFAULT False  -- renamed from is_installed
    is_core          = Boolean DEFAULT False     -- core modules cannot be uninstalled
    installed_at     = DateTime
    installed_by     = Integer FK → users.id    -- WAS: String(255)

    # Module metadata
    module_type      = String(50) NOT NULL   -- 'core', 'optional', 'integration', 'custom'
    category         = String(100)
    author           = String(255)
    homepage         = String(500)
    icon             = String(100)

    # Config (system-level schema definition)
    config_schema    = JSONB                 -- WAS: Text JSON string
    menu_items       = JSONB                 -- WAS: Text JSON string

    created_at       = DateTime NOT NULL
    updated_at       = DateTime onupdate

    # Relationships
    org_modules      → OrgModule[]           -- NEW: per-org state
    permissions      → ModulePermission[]
    changelogs       → ModuleChangelog[]
    dependencies     → ModuleDependency[]    -- NEW: replaces JSON blob
    dependents       → ModuleDependency[]    -- reverse: modules that depend on this
```

**Removed from Module:**
- `is_enabled` → moved to `OrgModule.is_enabled`
- `installed_version` → moved to `OrgModule.installed_version`
- `config_data` → merged into `OrgModuleSettings` (per-org)
- `dependencies` (JSON Text) → replaced by `ModuleDependency` table

---

### 3.2 — `OrgModule` (per-org module state) — **NEW**

One row per (org, module) pair. Created when an org enables or licenses a module.

```python
class OrgModule(db.Model):
    __tablename__ = 'org_modules'

    id               = Integer PK
    org_id           = Integer FK → orgs.id NOT NULL
    module_id        = Integer FK → modules.id NOT NULL

    # State
    is_enabled       = Boolean DEFAULT False NOT NULL
    installed_version = String(50)           -- which version this org is on

    # License link (optional — core modules don't need one)
    license_id       = Integer FK → module_licenses.id NULLABLE

    # Audit
    enabled_at       = DateTime
    enabled_by       = Integer FK → users.id
    disabled_at      = DateTime
    disabled_by      = Integer FK → users.id
    updated_at       = DateTime onupdate

    created_at       = DateTime NOT NULL

    __table_args__ = UniqueConstraint('org_id', 'module_id', name='uq_org_module')

    # Relationships
    settings         → OrgModuleSettings[]  -- org-specific config
    license          → ModuleLicense
```

**Resolution pattern for "is this module available to this org?"**

```python
def is_module_available(org_id: int, module_name: str) -> bool:
    om = OrgModule.query.join(Module).filter(
        Module.name == module_name,
        OrgModule.org_id == org_id,
        OrgModule.is_enabled == True
    ).first()
    if not om:
        return False
    if om.license_id:
        return om.license.is_valid()
    return True  # core/no-license modules
```

---

### 3.3 — `OrgModuleSettings` (per-org, per-module settings) — **NEW**

Replaces `ModuleSettings` with proper org scoping. Bound to `OrgModule`, not `Module`.

```python
class OrgModuleSettings(db.Model):
    __tablename__ = 'org_module_settings'

    id               = Integer PK
    org_module_id    = Integer FK → org_modules.id NOT NULL

    setting_key      = String(100) NOT NULL
    setting_group    = String(100)           -- 'api', 'ui', 'security'

    setting_value    = Text                  -- actual value
    default_value    = Text                  -- fallback
    value_type       = String(50) NOT NULL   -- 'string','integer','boolean','json','password','url'

    display_name     = String(200)
    description      = Text
    validation_rules = JSONB                 -- WAS: Text JSON

    is_required      = Boolean DEFAULT False NOT NULL
    is_secret        = Boolean DEFAULT False NOT NULL  -- mask in UI; encrypt at rest
    is_editable      = Boolean DEFAULT True NOT NULL

    updated_by       = Integer FK → users.id
    updated_at       = DateTime onupdate
    created_at       = DateTime NOT NULL

    __table_args__ = UniqueConstraint('org_module_id', 'setting_key',
                                      name='uq_org_module_setting_key')
```

**What happens to the old `ModuleSettings.environment` column?**
Removed. Environment-specific config is handled by env vars and K8s ConfigMaps, not the DB.

---

### 3.4 — `ModuleDependency` (dependency graph) — **NEW**

Replaces `Module.dependencies` JSON array with a proper join table.

```python
class ModuleDependency(db.Model):
    __tablename__ = 'module_dependencies'

    id               = Integer PK
    module_id        = Integer FK → modules.id NOT NULL   -- the module that has the dep
    required_module_id = Integer FK → modules.id NOT NULL -- the module it depends on

    version_constraint = String(50)   -- e.g. '>=1.0.0', '~2.3', None = any
    is_optional      = Boolean DEFAULT False NOT NULL

    __table_args__ = UniqueConstraint('module_id', 'required_module_id',
                                      name='uq_module_dependency')
```

---

### 3.5 — `ModuleLicense` (renamed + fixed from `ModulePurchase`)

Critical fix: `organization` string → `org_id FK → orgs.id`.

```python
class ModuleLicense(db.Model):
    __tablename__ = 'module_licenses'   # WAS: module_purchases

    id               = Integer PK
    module_id        = Integer FK → modules.id NOT NULL
    org_id           = Integer FK → orgs.id NOT NULL    # WAS: organization String(255)

    # Purchase identification
    purchase_code    = String(100) UNIQUE NOT NULL
    license_key      = String(255)   -- encrypted at rest (Fernet)

    # Purchase details
    purchase_type    = String(50) NOT NULL  -- 'one_time','monthly','yearly','lifetime','trial'
    purchase_date    = DateTime NOT NULL

    # Pricing
    price            = Numeric(10, 2)
    currency         = String(10) DEFAULT 'USD'

    # Validity
    valid_from       = DateTime
    valid_until      = DateTime  -- NULL = lifetime

    # Status
    is_active        = Boolean DEFAULT True NOT NULL
    is_trial         = Boolean DEFAULT False NOT NULL

    # Usage limits
    max_users        = Integer   -- NULL = unlimited
    max_installations = Integer
    current_installations = Integer DEFAULT 0 NOT NULL

    # Payment
    payment_method   = String(50)
    payment_status   = String(50) DEFAULT 'pending' NOT NULL
    transaction_id   = String(255)

    # Subscription
    subscription_id  = String(255)
    auto_renew       = Boolean DEFAULT False NOT NULL
    next_billing_date = DateTime

    notes            = Text

    # Audit (FK instead of strings)
    activated_at     = DateTime
    activated_by     = Integer FK → users.id   # WAS: String(255)
    deactivated_at   = DateTime
    deactivated_by   = Integer FK → users.id   # WAS: String(255)
    deactivation_reason = Text

    purchaser_name   = String(255)  -- denormalized for historical record
    purchaser_email  = String(255)  -- denormalized

    created_at       = DateTime NOT NULL
    updated_at       = DateTime onupdate

    # Relationships
    org_modules      → OrgModule[]
```

---

### 3.6 — `ModulePermission` (minor fix)

No structural change needed. `permission_type` values (`required`, `provided`, `optional`) are
correct. The permission names (e.g., `modules.helpdesk.view`) align with the platform RBAC
system. No FK to roles needed — permissions are resolved via the RBAC `roles_permissions` table,
not directly from here.

```python
class ModulePermission(db.Model):
    __tablename__ = 'module_permissions'
    # Unchanged except:
    # - No functional change needed
    # - Keep as-is
```

---

### 3.7 — `ModuleLog` (add FK, add org_id)

```python
class ModuleLog(db.Model):
    __tablename__ = 'module_logs'

    id               = Integer PK
    module_id        = Integer FK → modules.id NULLABLE   -- nullable: module may be deleted
    org_id           = Integer FK → orgs.id NULLABLE      # NEW: org context for audit
    module_name      = String(100) NOT NULL               -- denormalized for orphan safety
    user_id          = Integer FK → users.id NULLABLE     # WAS: user String(255)
    user_display     = String(255)                        -- denormalized display name

    action           = String(50) NOT NULL   -- 'install','uninstall','enable','disable','update','configure'
    status           = String(50) NOT NULL   -- 'success','failed','pending'

    ip_address       = String(45)
    details          = JSONB                 # WAS: Text JSON string
    error_message    = Text

    created_at       = DateTime NOT NULL
```

---

### 3.8 — `ScriptExecution` (add FK, JSONB columns)

```python
class ScriptExecution(db.Model):
    __tablename__ = 'script_executions'

    id               = Integer PK
    script_name      = String(100) NOT NULL

    status           = String(50) NOT NULL   -- 'running','success','failed','cancelled'
    started_at       = DateTime NOT NULL
    completed_at     = DateTime
    duration_seconds = Float

    executed_by      = Integer FK → users.id NULLABLE   # WAS: String(255)
    executor_display = String(255)                       -- denormalized
    ip_address       = String(45)

    output           = Text
    error_output     = Text
    result_data      = JSONB                 # WAS: Text JSON string
    error_message    = Text
    traceback        = Text

    command          = String(500)
    arguments        = JSONB                 # WAS: Text JSON string

    created_at       = DateTime NOT NULL
```

---

### 3.9 — `ModuleChangelog` (no change)

`ModuleChangelog` is structurally correct. The JSON array fields (`added`, `changed`, etc.)
can be typed as JSONB at migration time. No functional changes.

---

## §04 — Schema Diagram

```
orgs ─────────────────────────────────────────┐
   │                                          │
   │ 1:N                                      │ 1:N
   ▼                                          ▼
OrgModule ──────────────────── Module ──── ModuleChangelog
   │  │                          │  │
   │  └── ModuleLicense          │  └── ModuleDependency
   │                             │         (module ↔ module)
   └── OrgModuleSettings         └── ModulePermission
                                 └── ScriptExecution (system-only)

users ──── ModuleLog.user_id
      ──── OrgModule.enabled_by / disabled_by
      ──── OrgModuleSettings.updated_by
      ──── ModuleLicense.activated_by / deactivated_by
      ──── Module.installed_by
      ──── ScriptExecution.executed_by
```

---

## §05 — API Redesign (JWT Migration)

Current routes use `@login_required + current_user.is_admin` (Flask-Login). All routes must
migrate to ADR-028-compliant pattern.

### 5.1 — Auth pattern after migration

```python
# Before (Flask-Login — WRONG)
@module_manager_bp.route('/toggle', methods=['POST'])
@login_required
def toggle_module():
    if not current_user.is_admin:
        return jsonify({"error": "Admin required"}), 403

# After (JWT — CORRECT per ADR-028)
@module_manager_bp.route('/api/modules/<name>/toggle', methods=['POST'])
@jwt_required
@role_required('system_admin')
def toggle_module(name):
    # g.jwt_user is the authenticated user
    # For org-scoped operations: org_id = g.jwt_user.org_id
```

### 5.2 — New endpoint groups

| Group | Prefix | Auth | Scope |
|-------|--------|------|-------|
| System catalog | `GET /api/modules/` | `@jwt_required` | system_admin list all |
| System install/update | `POST /api/modules/<name>/install` | `@role_required('system_admin')` | system only |
| Org modules | `GET /api/org/modules/` | `@jwt_required` | scoped to `g.jwt_user.org_id` |
| Org enable/disable | `POST /api/org/modules/<name>/enable` | `@role_required('org_admin')` | scoped to org |
| Org settings | `GET/PUT /api/org/modules/<name>/settings` | `@role_required('org_admin')` | scoped to org |
| License management | `GET/POST /api/modules/<name>/licenses` | `@role_required('system_admin')` | system only |
| Scripts | `POST /api/modules/scripts/<name>/run` | `@role_required('system_admin')` | system only |
| Audit | `GET /api/modules/logs` | `@jwt_required` | system_admin: all; org_admin: own org |

### 5.3 — Backward compatibility

The existing `/modules/*` Jinja2 routes served by Flask-Login stay in place until
platform-ui has a `/modules` page. The new `/api/modules/*` JWT routes are additive.

---

## §06 — New Permissions

Following ADR-028 permission naming convention (`resource.scope.action`):

| Permission | Description | Default role |
|------------|-------------|--------------|
| `modules.system.view` | View system module catalog | system_admin |
| `modules.system.manage` | Install / uninstall / update system modules | system_admin |
| `modules.system.scripts` | Run system scripts (generate_registry, etc.) | system_admin |
| `modules.org.view` | View org's enabled modules | org_admin, manager |
| `modules.org.manage` | Enable / disable modules for org | org_admin |
| `modules.org.settings` | Configure per-org module settings | org_admin |
| `modules.licenses.view` | View license records | system_admin |
| `modules.licenses.manage` | Create / activate / deactivate licenses | system_admin |

---

## §07 — Migration Strategy

### Phase 1 — Schema additions (non-breaking)

1. Add `OrgModule` table
2. Add `OrgModuleSettings` table
3. Add `ModuleDependency` table
4. Add `ModuleLicense` table (copy of `module_purchases` with `org_id` FK)
5. Add `module_logs.org_id` + `module_logs.user_id` (nullable)
6. Add `module_logs.user_display` (copy from `user` string)
7. Add `script_executions.executor_display` (copy from `executed_by` string)
8. Rename `modules.is_installed` → `modules.is_system_installed`
9. Change JSONB columns (config_schema, menu_items, etc.)

### Phase 2 — Data migration

10. Seed `OrgModule` rows from `Module.is_enabled` for all orgs (all orgs get the same modules
    the system currently has enabled — conservative: enabled = True for core, False for optional)
11. Migrate `ModuleSettings` rows to `OrgModuleSettings` — associate with org 1 (system org)
    as baseline; replicate to all other orgs if settings are not org-specific
12. Parse `Module.dependencies` JSON → insert `ModuleDependency` rows
13. Set `module_logs.user_id` via `SELECT id FROM users WHERE username = module_logs.user`
14. Set `script_executions.executed_by` (FK) via same lookup
15. Populate `ModuleLicense.org_id` via lookup on `organization` string → `orgs.name`

### Phase 3 — Route migration

16. Create `apps/module_manager/api_routes.py` — JWT routes for all operations
17. Register alongside existing Flask-Login blueprint
18. Update platform-ui proxy to include `/api/modules/*` and `/api/org/modules/*`
19. Deprecate old Jinja2 routes (keep until platform-ui page exists)

### Phase 4 — Cleanup

20. Remove `ModuleSettings` (after confirming all data migrated to `OrgModuleSettings`)
21. Remove `module_purchases` (after confirming `module_licenses` is in use)
22. Remove `Module.config_data` column
23. Remove `Module.dependencies` column (JSON blob replaced by `ModuleDependency`)
24. Remove Flask-Login routes (`apps/module_manager/routes.py`) once platform-ui page ships

---

## §08 — Open Questions

| ID | Question | Decision needed by |
|----|----------|--------------------|
| OQ-01 | Should the system seed `OrgModule` rows for ALL orgs during Phase 2, or only on first login per org? | R038 planning |
| OQ-02 | Should `ModuleSettings` → `OrgModuleSettings` migration copy settings to all orgs or only org 1? | R038 planning |
| OQ-03 | Should licenses be required for optional modules, or only for paid/premium modules? | Product decision |
| OQ-04 | Is there an existing `orgs` table in `platformengineer`? (Must confirm before adding FK) | Before R038 implementation |
| OQ-05 | Should script execution be org-scoped at all, or remain system-only? | R038 planning |

---

## §09 — Acceptance Criteria

- [ ] `OrgModule` row exists for every (org_id, module_id) pair where module is relevant
- [ ] `OrgModule.org_id` has FK constraint to `orgs.id`
- [ ] `ModuleLicense.org_id` has FK constraint to `orgs.id`
- [ ] `ModuleLog.user_id` resolves to a real user for all new writes
- [ ] `Module.dependencies` JSON blob column is removed after `ModuleDependency` data is seeded
- [ ] All new `/api/modules/*` routes use `@jwt_required`; no `@login_required` on new routes
- [ ] `is_module_available(org_id, module_name)` returns correct result for all test orgs
- [ ] All existing 40+ route operations work end-to-end after migration
- [ ] No raw `str(exc)` in error responses
- [ ] All write endpoints call `record_activity()`

---

## §10 — ADR-031

**ADR-031: Module Manager Multi-Tenant Model Split**

- **Context:** Module Manager was designed single-tenant. ResolveAI SaaS requires per-org
  module state (enable/disable, settings, licenses) independent of system installation.
- **Decision:** Split `Module` (system catalog) from `OrgModule` (per-org state). Rename
  `ModulePurchase` to `ModuleLicense` with hard `org_id` FK. Replace `Module.dependencies`
  JSON blob with `ModuleDependency` join table. Migrate all audit string fields to FK.
- **Alternatives:**
  - **Add `org_id` columns to existing `Module` model** — rejected: creates one row per
    (module, org) duplication, making system catalog queries ugly and index-heavy.
  - **JSON `enabled_orgs` array in `Module`** — rejected: no referential integrity, no
    per-org settings, not queryable.
- **Consequences:**
  - All module-related queries must now join through `OrgModule` for org context.
  - `ModuleSettings` table becomes deprecated; new code uses `OrgModuleSettings`.
  - Data migration required for all existing `Module.is_enabled` and `ModuleSettings` rows.
  - Routes that previously checked `current_user.is_admin` must be rewritten to use
    `@jwt_required + @role_required`.
- **Affected modules:** `apps/module_manager/`, `apps/authentication/rbac.py`,
  `scripts/migrations/`, `deployment/kubernetes/`

---

## §11 — Backlog Items (R038)

### R038-A — Schema Migrations (platformengineer)

| Task | File | Est. |
|------|------|------|
| Migration: `OrgModule` table | `scripts/migrations/versions/20260425_add_org_module.py` | 1 hr |
| Migration: `OrgModuleSettings` table | `scripts/migrations/versions/20260425_add_org_module_settings.py` | 30 min |
| Migration: `ModuleDependency` table | `scripts/migrations/versions/20260425_add_module_dependency.py` | 30 min |
| Migration: `ModuleLicense` table (copy + `org_id` FK) | `scripts/migrations/versions/20260425_add_module_license.py` | 1 hr |
| Migration: `module_logs` — add `org_id`, `user_id`, `user_display` | `scripts/migrations/versions/20260425_extend_module_logs.py` | 30 min |
| Migration: rename `modules.is_installed` → `is_system_installed` | `scripts/migrations/versions/20260425_rename_module_installed.py` | 15 min |
| Migration: convert Text JSON → JSONB (config_schema, menu_items, details, result_data, arguments) | `scripts/migrations/versions/20260425_module_jsonb_columns.py` | 45 min |
| Data seed: `ModuleDependency` rows from `Module.dependencies` JSON | `scripts/seeds/module_dependencies.py` | 30 min |
| Data seed: `OrgModule` baseline rows for all orgs | `scripts/seeds/org_modules.py` | 1 hr |
| Add `modules.*` permissions to DB | `scripts/migrations/versions/20260425_add_module_permissions.py` | 30 min |

### R038-B — Model Updates (platformengineer)

| Task | File | Est. |
|------|------|------|
| Rewrite `apps/module_manager/models.py` per new schema | `apps/module_manager/models.py` | 2 hr |
| Add `OrgModule`, `OrgModuleSettings`, `ModuleDependency`, `ModuleLicense` models | `apps/module_manager/models.py` | (included above) |
| Add `is_module_available(org_id, module_name)` helper | `apps/module_manager/services.py` | 30 min |

### R038-C — JWT API Routes (platformengineer)

| Task | File | Est. |
|------|------|------|
| Create `apps/module_manager/api_routes.py` — 20 JWT endpoints | `apps/module_manager/api_routes.py` | 3 hr |
| Register `module_manager_api_bp` in `apps/__init__.py` | `apps/__init__.py` | 15 min |

### R038-D — Platform-UI (platform-ui, after R038-C ships)

| Task | File | Est. |
|------|------|------|
| TypeScript: `OrgModule`, `Module`, `ModuleLicense`, `ModuleLog` types | `lib/api/types.ts` | 30 min |
| Zod schemas: module forms | `lib/modules/modules/schemas.ts` | 30 min |
| Query keys: `queryKeys.modules.*` | `lib/api/query-keys.ts` | 15 min |
| Modules list page (org view) | `app/(dashboard)/modules/page.tsx` | 1.5 hr |
| Module detail page | `app/(dashboard)/modules/[name]/page.tsx` | 1.5 hr |
| System catalog page (system_admin only) | `app/(dashboard)/modules/catalog/page.tsx` | 1.5 hr |

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2026-04-25 | Platform Eng | Initial design — R038 Module Manager redesign |
