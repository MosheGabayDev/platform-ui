# 24 — Core Platform and Module System

_Last updated: 2026-04-24 (Round 025 — AI Capability Context)_
_Source of truth for: module lifecycle, data ownership, export/import, data contracts_

---

## 1. Module System Overview

The platform uses a manageable module system where each module:

- Has a versioned manifest declaring its identity, capabilities, and data ownership
- Owns a set of database tables whose lifecycle follows the module
- References (but does not own) tables from other modules or the core platform
- Can be exported as a governed data package and imported into another tenant or environment
- Has explicitly declared permissions, feature flags, and configuration schema

---

## 2. Module Data Ownership

### Three table categories

Every table in the system must be classified into exactly one category:

#### A. Owned tables

Tables whose full lifecycle belongs to a single module. The module may:
- Create, read, update, delete rows
- Export all non-secret, non-excluded columns
- Import rows with ID remapping
- Define the migration path when the module schema changes

**Examples:**
- `helpdesk_sessions` → owned by `helpdesk`
- `tool_invocations` → owned by `helpdesk`
- `ai_usage_logs` → owned by `ai_providers`
- `billing_events` → owned by `billing`
- `knowledge_articles` → owned by `knowledge`

#### B. Referenced tables

Tables the module reads from but does not own. The module must not export their full content — only export the reference key (e.g. `org_id`, `user_id`, `role_id`) and the mapping requirements for import.

**Examples:**
- `users` — referenced by helpdesk, billing, agents; owned by `core`
- `roles` — referenced by all modules; owned by `core`
- `organizations` — referenced by all modules; owned by `core`
- `ai_providers` — referenced by helpdesk, agents, ALA; owned by `ai_providers` module

#### C. Core/shared tables

Tables owned by the core platform. No business module may overwrite them during import without explicit system-admin mapping authorization.

**Core tables (never overwrite on import):**
- `users`
- `organizations`
- `roles`
- `permissions`
- `role_permissions`
- `feature_flags`
- `platform_secrets`
- `audit_log`

### Rules

1. A module may only export rows from its **owned tables**.
2. A module must declare all **referenced tables** and the columns it depends on.
3. During import, **core table** references must be remapped via the `org-map.json` and `user-map.json` in the package — never overwritten.
4. If a referenced table no longer exists in the target system, the import must fail with a dependency error (not silently skip).
5. A module claiming ownership of a core table must be rejected at import validation.

---

## 3. Module Manifest — `dataContract` Section

Every module that supports export/import must declare a `dataContract` section in its manifest:

```json
{
  "moduleId": "helpdesk",
  "version": "2.4.0",
  "schemaVersion": 12,
  "dataContract": {
    "ownedTables": [
      {
        "table": "helpdesk_sessions",
        "exportable": true,
        "exportableColumns": ["id", "org_id", "status", "technician_user_id", "created_at", "updated_at"],
        "excludedColumns": [],
        "piiColumns": [],
        "secretColumns": [],
        "tenantColumn": "org_id",
        "partitionKey": "created_at",
        "foreignKeys": [
          { "column": "technician_user_id", "referencesTable": "users", "remapRequired": true }
        ]
      },
      {
        "table": "tool_invocations",
        "exportable": true,
        "exportableColumns": ["id", "session_id", "tool_name", "status", "created_at"],
        "excludedColumns": ["raw_response"],
        "piiColumns": [],
        "secretColumns": [],
        "tenantColumn": "org_id",
        "foreignKeys": [
          { "column": "session_id", "referencesTable": "helpdesk_sessions", "remapRequired": true }
        ]
      }
    ],
    "referencedTables": [
      { "table": "users", "columns": ["id", "email", "role_id"], "ownedBy": "core" },
      { "table": "organizations", "columns": ["id", "name"], "ownedBy": "core" }
    ],
    "importValidationRules": [
      "org_id must be remapped to target org before insert",
      "technician_user_id must exist in target users table after user-map applied",
      "helpdesk_sessions must be imported before tool_invocations (parent dependency)"
    ],
    "postImportHooks": ["rebuild_session_stats", "sync_sla_counters"],
    "rollbackHooks": ["truncate_imported_sessions"],
    "anonymizationRules": {
      "helpdesk_sessions": { "technician_user_id": "REPLACE_WITH_ANON_USER" }
    }
  }
}
```

### `dataContract` field reference

| Field | Type | Purpose |
|-------|------|---------|
| `ownedTables[]` | Array | Tables this module owns and may export/import |
| `ownedTables[].exportableColumns` | string[] | Explicit column whitelist — never export by default |
| `ownedTables[].excludedColumns` | string[] | Columns never exported (internal state, computed fields) |
| `ownedTables[].piiColumns` | string[] | PII columns — anonymized in non-full exports |
| `ownedTables[].secretColumns` | string[] | Secret columns — **always excluded**, never in package |
| `ownedTables[].tenantColumn` | string | Column name carrying `org_id` for tenant scoping |
| `ownedTables[].foreignKeys[]` | Array | FK columns that must be remapped on import |
| `referencedTables[]` | Array | Tables read but not owned — export key only |
| `importValidationRules` | string[] | Human-readable rules checked before write |
| `postImportHooks` | string[] | Registered hook names called after successful import |
| `rollbackHooks` | string[] | Hook names called if import is rolled back |
| `anonymizationRules` | object | Per-table column replacement rules for anonymized exports |

---

## 4. Export Package Format

### File structure

```
<module-id>-<org-id>-<timestamp>.zip
├── manifest.json           — module identity and version
├── export-metadata.json    — scope, timestamp, exporter, filters applied
├── schema.json             — table schemas at time of export
├── data/
│   ├── helpdesk_sessions.jsonl
│   ├── tool_invocations.jsonl
│   └── ...                 — one .jsonl file per owned table
├── files/
│   └── ...                 — blobs/attachments owned by the module (if any)
├── mappings/
│   ├── id-map.json         — original_id → export_id (stable within package)
│   ├── user-map.json       — user_id → email/handle (for target remapping)
│   └── org-map.json        — org_id → org_slug (for target remapping)
├── checksums.sha256         — SHA256 of every file in the package
└── signature.json          — package signature (system key, not user key)
```

### `manifest.json`

```json
{
  "moduleId": "helpdesk",
  "version": "2.4.0",
  "schemaVersion": 12,
  "platformVersion": "1.8.3",
  "exportedAt": "2026-04-24T14:00:00Z",
  "exportedBy": "system_admin@example.com",
  "orgId": 7,
  "exportScope": "tenant",
  "includesData": true,
  "includesFiles": false,
  "isAnonymized": false
}
```

### `export-metadata.json`

```json
{
  "exportId": "exp_01HZ...",
  "exportJobId": 42,
  "filters": { "createdAfter": "2026-01-01", "status": ["active", "completed"] },
  "rowCounts": { "helpdesk_sessions": 1240, "tool_invocations": 8731 },
  "checksumsFile": "checksums.sha256",
  "encryptionKeyId": null,
  "downloadExpiresAt": "2026-04-31T14:00:00Z"
}
```

### Data format — JSONL

Each row in a `.jsonl` file is one JSON object per line:

```jsonl
{"id":1,"org_id":7,"status":"completed","technician_user_id":3,"created_at":"2026-01-15T09:00:00Z"}
{"id":2,"org_id":7,"status":"active","technician_user_id":5,"created_at":"2026-01-16T10:30:00Z"}
```

### Format rationale

| Format | When to use |
|--------|------------|
| **JSONL** | Default for all owned table data — streaming-friendly, schema-preserving, human-readable, append-safe |
| CSV | Only when exporting for spreadsheet consumption by non-technical users |
| Parquet | When row counts exceed ~1M and columnar compression matters (Phase 3+) |
| SQL dump | Never as primary format — use only for emergency DR, never as module exchange format |

---

## 5. Export Scopes

| Scope | Who can trigger | What is included |
|-------|----------------|-----------------|
| `config-only` | org-admin | manifest, config, permissions, feature flags — no data rows |
| `tenant` | org-admin | all owned table rows for the calling org_id |
| `tenant-filtered` | org-admin | owned rows matching a date/filter predicate |
| `anonymized` | org-admin, support | tenant scope with PII columns replaced per anonymization rules |
| `system-wide` | system-admin only | all tenants' data for the module — for platform migration/backup |
| `snapshot` | system-admin only | full point-in-time tenant state — for restore/rollback |

**Tenant-scoped exports never include rows where `org_id` does not match the requesting user's org_id.** This check is enforced at the query layer, not the application layer.

---

## 6. Import Modes

| Mode | Behavior | Allowed users | Risk |
|------|----------|--------------|------|
| `dry-run` | Validates package, reports conflicts, does not write | org-admin | None |
| `create-only` | Insert new rows; skip existing IDs | org-admin | Partial data if IDs collide |
| `update-existing` | Upsert — update if exists, insert if not | org-admin | May overwrite newer data |
| `merge` | Combine — prefer existing on conflict | org-admin | Complex conflict resolution |
| `replace-module-data` | Delete all module data for tenant, then import | org-admin | Destructive — irreversible without snapshot |
| `restore-snapshot` | Full replace from system snapshot | system-admin only | Highest risk — full tenant data replaced |

### Import pipeline steps

```
1. Receive package
2. Validate package signature (checksums.sha256 + signature.json)
3. Validate schema compatibility (schema.json vs current DB schema)
4. Validate module version compatibility (manifest.json vs installed version)
5. Resolve user-map.json → map source user IDs to target user IDs
6. Resolve org-map.json → confirm target org exists and matches
7. Dependency check → verify all referenced tables are present
8. DRY RUN:
   a. Validate all rows against importValidationRules
   b. Detect ID conflicts per conflict strategy
   c. Detect FK violations
   d. Report PII presence (if not anonymized)
   e. Return ModuleImportValidationResult
9. (If dry-run only: stop here and return result)
10. BEGIN TRANSACTION
11. Apply ID remapping (id-map.json)
12. Apply user remapping
13. Apply org remapping
14. Insert/upsert rows per import mode
15. Call postImportHooks
16. COMMIT
17. Write ModuleImportAuditEvent
18. (On any failure: ROLLBACK, call rollbackHooks, write failure audit event)
```

---

## 7. ID Remapping Strategy

Owned table primary keys (`id`) must be remapped during import because:
- Target system may already have rows with the same integer ID
- Auto-increment sequences in the target DB are independent

### Remapping approach

1. On export: record `{original_id: N, export_key: <uuid>}` in `mappings/id-map.json`
2. On import: before inserting each row, generate a new `id` in the target sequence
3. Update all FK columns in child rows to point to the new ID
4. Log the remapping in `ModuleImportAuditEvent` for traceability

### FK remapping order

Import parent tables before child tables. The `dataContract.importValidationRules` must declare the correct insert order. Violating FK order causes a constraint error and a clean rollback.

### Core table references

References to core tables (`users.id`, `organizations.id`) are never remapped by the module importer — they are resolved using `user-map.json` (maps source email → target user ID) and `org-map.json` (maps source org slug → target org ID).

---

## 8. Tenant Mapping Strategy

The export always includes `org_id` on every row. On import:

1. The `org-map.json` declares: `{"source_org_id": 7, "source_org_slug": "acme", "target_org_id": null}`
2. During import setup, the importer resolves `target_org_id` from the target system (`SELECT id FROM organizations WHERE slug = 'acme'`)
3. If no match: importer can create the org (system-admin only) or fail with `OrgNotFoundError`
4. All rows in the package have their `org_id` field replaced with `target_org_id` before insert

**Cross-tenant imports** (source org ≠ target org) require explicit system-admin authorization. The import job records both `source_org_id` and `target_org_id` in the audit log.

---

## 9. Security and Compliance Rules

### Secrets

- **Never export** any column declared in `secretColumns`
- `secretColumns` are validated against a system-managed list (not module-declared only)
- Export job fails at build time if a secret column is found in `exportableColumns`
- Applies to: API keys, tokens, hashed passwords, PBX credentials, Gemini key assignments

### PII

- Columns in `piiColumns` are exported as-is in `full-data` exports
- In `anonymized` exports: replaced with synthetic values per `anonymizationRules`
- Download of a non-anonymized package containing PII requires explicit acceptance of a compliance acknowledgment
- Export packages with PII have a 24-hour download expiration by default

### Encryption

- Export packages containing PII or full data are encrypted at rest using a per-export AES-256 key
- The key is stored in SSM Parameter Store, referenced by `encryptionKeyId` in `export-metadata.json`
- System-admin packages require a second factor to decrypt

### Signatures

- Every package includes `signature.json` signed with the platform's private key
- Import validates the signature before processing any file
- Unsigned packages are rejected

### Download expiration

- `anonymized` / `config-only` exports: 7 days
- `tenant` / `tenant-filtered` exports: 24 hours
- `system-wide` / `snapshot` exports: 4 hours

### Audit

- Every export generates a `ModuleExportJob` record with: who, when, scope, row counts, download URL
- Every import attempt (including dry-runs) generates a `ModuleImportJob` record
- Every imported row generates a row in `ModuleImportAuditEvent`
- Audit records are in core tables and cannot be modified by module imports

### Permission requirements

| Action | Required permission |
|--------|-------------------|
| Export config-only | `module.export` on own org |
| Export tenant data | `module.export.data` on own org |
| Export anonymized | `module.export` on own org |
| Export system-wide | `system_admin` |
| Dry-run import | `module.import` on own org |
| Import (create-only, merge) | `module.import.data` on own org |
| Import (replace, restore) | `system_admin` |

---

## 10. Backend Models

### `ModuleExportJob`

```
id                  — primary key
org_id              — tenant context (nullable for system-wide)
module_id           — string, e.g. "helpdesk"
module_version      — at time of export
schema_version      — at time of export
export_scope        — enum: config-only, tenant, tenant-filtered, anonymized, system-wide, snapshot
status              — enum: pending, running, completed, failed
requested_by        — user_id
requested_at        — timestamp
completed_at        — timestamp (nullable)
row_counts          — jsonb: { table_name: row_count }
filters_applied     — jsonb: export filter predicates
package_size_bytes  — int (nullable until complete)
package_sha256      — string
download_url        — string (signed, temporary)
download_expires_at — timestamp
encryption_key_id   — string (SSM key reference, nullable)
is_anonymized       — bool
error_message       — string (nullable)
```

### `ModuleImportJob`

```
id                    — primary key
org_id                — target tenant
module_id             — string
source_module_version — from manifest
source_schema_version — from manifest
target_module_version — installed in platform
import_mode           — enum: dry-run, create-only, update-existing, merge, replace-module-data, restore-snapshot
status                — enum: pending, validating, validated, running, completed, failed, rolled-back
requested_by          — user_id
requested_at          — timestamp
dry_run_completed_at  — timestamp (nullable)
completed_at          — timestamp (nullable)
rows_imported         — jsonb: { table_name: count }
rows_failed           — int
rows_skipped          — int
source_org_id         — org_id from export package (for cross-tenant tracking)
package_sha256        — validated checksum
validation_passed     — bool
error_summary         — string (nullable)
rollback_completed_at — timestamp (nullable)
```

### `ModuleDataContract`

```
id             — primary key
module_id      — string
version        — module version this contract applies to
owned_tables   — jsonb: OwnedTableSpec[]
ref_tables     — jsonb: ReferencedTableSpec[]
validation_rules — jsonb: string[]
post_import_hooks — jsonb: string[]
rollback_hooks — jsonb: string[]
anon_rules     — jsonb: AnonymizationRule{}
created_at     — timestamp
```

### `ModuleDataExportFile`

```
id              — primary key
export_job_id   — FK → ModuleExportJob
table_name      — string
file_path       — string (S3 path or local path)
row_count       — int
file_size_bytes — int
sha256          — string
created_at      — timestamp
```

### `ModuleImportValidationResult`

```
id              — primary key
import_job_id   — FK → ModuleImportJob
table_name      — string
total_rows      — int
valid_rows      — int
invalid_rows    — int
conflict_rows   — int
pii_rows        — int (rows containing PII columns)
missing_fk_rows — int (rows with FK references that cannot be resolved)
warnings        — jsonb: string[]
errors          — jsonb: string[]
created_at      — timestamp
```

### `ModuleImportRowError`

```
id            — primary key
import_job_id — FK → ModuleImportJob
table_name    — string
row_index     — int (line number in .jsonl file)
source_id     — original row ID from package
error_type    — enum: fk_missing, pii_present, schema_mismatch, constraint_violation, validation_rule_failed
error_detail  — string
quarantined   — bool (row saved to quarantine table for manual review)
created_at    — timestamp
```

### `ModuleImportAuditEvent`

```
id              — primary key
import_job_id   — FK → ModuleImportJob
event_type      — enum: row_inserted, row_updated, row_skipped, row_failed, job_started, job_completed, job_rolled_back
table_name      — string (nullable)
source_id       — original ID from package (nullable)
target_id       — ID assigned in target DB (nullable)
org_id          — target tenant
performed_by    — user_id
performed_at    — timestamp
detail          — jsonb: additional context
```

---

## 11. UI Flows

### Export flow

```
Module management page
  └─ "Export" button
       ├─ Select scope: config-only / tenant data / anonymized / full
       ├─ (Optional) Set date filter / row filter
       ├─ Review what will be exported (table list + estimated row counts)
       ├─ Acknowledge PII if applicable
       └─ Start export → progress bar → download link (time-limited)
```

### Import flow

```
Module management page
  └─ "Import" button
       ├─ Upload package (.zip)
       ├─ System validates signature + checksums
       ├─ Select import mode (default: dry-run first)
       ├─ DRY RUN RESULT SCREEN:
       │     - Rows valid / invalid / conflicts
       │     - FK resolution status
       │     - PII presence warning (if applicable)
       │     - Schema compatibility summary
       │     - User/org mapping status
       ├─ (If conflicts): CONFLICT RESOLUTION SCREEN
       │     - Per-table: skip / overwrite / merge
       │     - User remapping: map source users → target users
       ├─ Confirm and import → PROGRESS SCREEN
       │     - Table-by-table progress
       │     - Live row count
       └─ RESULT SCREEN: imported / failed / quarantined counts + download audit log
```

### Import rollback

- Available within 1 hour after a completed import
- Calls `rollbackHooks` + deletes rows in reverse dependency order
- Writes rollback event to `ModuleImportAuditEvent`
- Only available to the same user who initiated the import or a system-admin

### Export/Import history

- Separate tabs on module management page
- List: date, scope, user, status, row counts, download (if still valid)
- Click-through to audit detail for each job

---

## 12. AI-Agent Safety Rules

These rules prevent AI coding assistants from making unsafe changes to the export/import system:

1. **Never add a column to `exportableColumns` without classifying it** — every new column must be evaluated against `piiColumns` and `secretColumns` first.
2. **Never export a table without a `tenantColumn`** — tables without explicit tenant isolation must not be exportable.
3. **Never write import logic that modifies core tables** — `users`, `organizations`, `roles`, `permissions` are read-only from module import code.
4. **Dry-run must always be the default mode** — any code path that calls the import writer directly without dry-run validation first is a bug.
5. **Never skip signature validation** — even for internal/test imports, the package must pass checksum verification.
6. **Secret column list is authoritative** — the system maintains a registry of columns that may never be exported regardless of `dataContract` declarations.
7. **Cross-tenant detection** — if `source_org_id ≠ target_org_id` in the import job, require explicit `system_admin` permission check before proceeding, regardless of what the module manifest says.
8. **FK remapping is mandatory** — importing rows with original IDs without remapping causes silent data corruption. Any code that skips id-map.json is wrong.

---

## 13. Risks and Anti-Patterns

| Anti-pattern | Risk | Correct approach |
|---|---|---|
| Raw `pg_dump` / SQL dump as module exchange format | Exports all tables including secrets/core; no tenant scope; no dry-run | Use governed JSONL package format |
| Exporting all columns by default | PII/secrets in package | Whitelist approach: only `exportableColumns` |
| Importing with original IDs | ID collision, silent data corruption | Always remap via id-map.json |
| Skipping dry-run for "simple" imports | FK violations, constraint errors, partial import | Dry-run is mandatory before any write |
| Trusting module manifest for secret classification | Module developer forgets to mark column as secret | Platform maintains authoritative secret column registry |
| Allowing org-admin to run system-wide export | Cross-tenant data leakage | System-wide and snapshot scopes are system-admin only |
| No rollback for failed partial import | Orphaned data in target tenant | Wrap entire import in a DB transaction; rollback on any error |
| Exporting blobs/files without ownership check | Files from other modules or tenants in package | Only include files whose FK to an owned table row resolves within the export scope |
| Storing decryption key inside the package | Anyone with the package can decrypt | Key stored in SSM; referenced by ID only |

---

## 14. Acceptance Criteria (Phase implementation)

- [ ] `ModuleDataContract` declared for at least one module before export is enabled for that module
- [ ] Export job enforces `tenantColumn` filtering at the SQL query layer
- [ ] Dry-run validation runs and returns `ModuleImportValidationResult` before any write
- [ ] ID remapping applied to all FK columns before insert
- [ ] `users`, `organizations`, `roles` tables never modified by module import code
- [ ] `secretColumns` list maintained by platform, checked at export build time
- [ ] Package includes `checksums.sha256` and import validates them before processing
- [ ] Every export and import attempt creates an audit record
- [ ] Cross-tenant import (source org ≠ target org) requires `is_system_admin=True` on the requesting user
- [ ] `replace-module-data` mode requires explicit confirmation step in UI and `is_system_admin=True`
- [ ] Download link expires per policy (24h for tenant data)
- [ ] PII columns are replaced in anonymized exports, verified by test fixture
- [ ] Rollback completes cleanly if import fails mid-way (transaction boundary test)

---

## 15. Module Manifest: aiActions Extension (Round 024)

Module manifests gain an optional `aiActions` section listing which platform actions AI agents may invoke for that module. Full specification: `docs/system-upgrade/36-ai-action-platform.md §11`.

```typescript
// Addition to ModuleManifest (lib/platform/modules/manifest.ts)
aiActions?: ModuleAIAction[];

interface ModuleAIAction {
  actionId: string;       // "module.verb" — matches AIActionDescriptor.action_id
  label: string;          // Hebrew/i18n display name
  description: string;
  dangerLevel: DangerLevel;
  requiresConfirmation: boolean;
  voiceInvocable: boolean; // only READ + WRITE_LOW with dangerLevel <= "low"
  requiredRoles: string[];
  inputSchemaId: string;  // JSON Schema ID in apps/ai_action_platform/schemas/
}
```

**Rules:**
- `voiceInvocable: true` requires `dangerLevel <= "low"` and `risk_tier = "READ" | "WRITE_LOW"`
- Module's `aiActions` must be declared before the module is onboarded to ALA or Helpdesk AI
- Backend `platform_actions.py` must have a matching `AIActionDescriptor` for every manifest entry

### AI User Capability Context (Round 025)

At session start, `GET /api/ai/context` returns an `AIUserCapabilityContext` object for the authenticated user. This is a server-generated snapshot of what the user can do — personalized by role, org, modules, feature flags, and profile. The context drives the AI system prompt and action filtering. It is never client-supplied.

Key fields: `available_actions` (filtered to user's role), `unavailable_action_categories` (safe category names — no unauthorized action IDs), `enabled_modules`, `feature_flags`, `can_see_pii`, `onboarding_mode`, `context_version` (Redis counter, invalidated on any permission change).

Full spec: `docs/system-upgrade/36-ai-action-platform.md §23–§32`
