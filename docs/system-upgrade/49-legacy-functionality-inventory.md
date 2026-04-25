# 49 — Legacy Functionality Inventory Standard

> **Global standard and template** for inventorying existing module functionality before rewriting.
> _Last updated: 2026-04-26 (R041-Governance Addendum — initial creation)_
>
> ## How to use this doc
>
> This doc defines the **standard** (what fields, what rules, what quality bar).
> Actual per-module inventories live at:
>
> ```
> docs/modules/<module_key>/LEGACY_INVENTORY.md
> ```
>
> A module may not begin rewrite implementation until its `LEGACY_INVENTORY.md` is complete.
> "Complete" means: all must-preserve capabilities listed, all removal decisions documented.

---

## Why Inventory First

The rewrite is a redesign, not a deletion. Every field, button, route, and background job in the old system exists because someone needed it. Inventorying first:

1. Ensures no silent capability loss
2. Gives the UX designer the full feature surface to work with
3. Gives the backend developer the full API surface to preserve
4. Gives the test author the full set of behaviors to verify
5. Enables intentional simplification — you can only simplify what you've documented

---

## Template: `docs/modules/<module_key>/LEGACY_INVENTORY.md`

Copy this template when starting a new module inventory. Replace all `<...>` placeholders.

---

```markdown
# <module_key> — Legacy Functionality Inventory

> Inventoried by: <agent/developer name>
> Inventory date: <YYYY-MM-DD>
> Round: <round_id>
> Status: in_progress | complete
>
> Cross-references:
> - Central tracker: `docs/system-upgrade/03-module-migration-progress.md`
> - E2E coverage plan: `docs/modules/<module_key>/E2E_COVERAGE.md`
> - Testing plan: `docs/modules/<module_key>/TESTING.md`

---

## Module Identity

| Field | Value |
|-------|-------|
| module_key | `<module_key>` |
| display_name | <display name shown in UI> |
| legacy_app_path | `apps/<module>/` |
| owner | <team or agent> |
| related_db_tables | <comma-separated table names> |
| related_files_media_s3 | <S3 bucket, path, or "none"> |
| related_background_jobs | <Celery task names, or "none"> |
| related_integrations | <external APIs, webhooks, or "none"> |
| related_ai_llm_calls | <list of AI calls, or "none"> |
| related_permissions | <required role/permission names> |
| related_settings | <org-level or system-level settings keys> |

---

## Legacy UI / Pages / Routes

For every page or route in the legacy system:

### Page: <Page Name>

| Field | Value |
|-------|-------|
| route_path | `/path/to/page` |
| purpose | What this page does |
| authorized_roles | `admin`, `manager`, `viewer`, etc. |
| actions_available | List every button/action: create, edit, delete, export, etc. |
| forms | List form fields, validation rules |
| filters_search | What can be filtered/searched |
| tables | List of columns, sort order, pagination |
| detail_views | Detail pages linked from this list |
| export_import | Export format (CSV/Excel), import format |
| bulk_actions | Multi-select actions available |
| edge_cases | Known edge cases or unusual behavior |
| current_pain_points | Known UX problems, performance issues, user complaints |

_Repeat this section for every page in the module._

---

## Backend / API Behavior

For every API route in the legacy module:

### Route: `<METHOD> /api/<path>`

| Field | Value |
|-------|-------|
| method | GET / POST / PUT / PATCH / DELETE |
| purpose | What this route does |
| auth | JWT required / public / internal key |
| role_required | Role or permission name |
| tenant_scoped | Yes — `WHERE org_id = g.jwt_user.org_id` |
| request_params | Body fields, query params, path params |
| response_behavior | Success shape, pagination, errors |
| validation | Input validation rules |
| audit | `record_activity()` called? What action? |
| errors | Known error cases and HTTP codes |
| data_exposure_pii | Fields returned that may be PII |

_Repeat this section for every route in the module._

---

## Functional Capabilities

List every distinct capability the module provides:

| capability_id | name | description | legacy_location | must_preserve | new_design_location | e2e_required | security_test_required | tenant_test_required | status |
|--------------|------|-------------|----------------|--------------|-------------------|-------------|----------------------|--------------------|----|
| CAP-001 | <name> | <description> | `apps/<module>/routes.py:L123` | yes/no | <new route or "TBD"> | yes/no | yes/no | yes/no | `not_started` |

**Status values for capabilities:**
- `not_started` — not yet implemented in new platform
- `in_progress` — implementation underway
- `implemented` — in new platform, not yet tested
- `tested` — tests pass
- `deprecated` — formally deprecated (see §Removal below)
- `replaced` — replaced by new capability (see §Removal below)

---

## Removal / Deprecation Log

> No capability may be removed without an entry here.
> Missing entries = undocumented capability loss = blocks the round.

| capability_id | disposition | reason | replacement | approval | issue_round | migration_path |
|--------------|------------|--------|-------------|---------|------------|---------------|
| CAP-XXX | deprecated | <reason> | none / <new cap> | <who approved> | <issue or round> | <user migration path> |

**Disposition values:** `deprecated` | `replaced` | `intentionally_removed` | `moved` | `deferred`

---

## Known Gaps

> Things known to be missing, unclear, or requiring investigation before inventory is marked complete.

| gap_id | description | blocking | resolution |
|--------|-------------|---------|-----------|
| GAP-001 | <description> | yes/no | <plan or "open"> |
```

---

## Quality Bar for "Inventory Complete"

An inventory is not complete until:

- [ ] Every legacy UI page documented (route, purpose, roles, actions, forms, tables)
- [ ] Every legacy API route documented (method, auth, tenant scoping, audit, PII)
- [ ] Every capability listed with `must_preserve` decision
- [ ] All `must_preserve = yes` capabilities have a `new_design_location` (even if "TBD")
- [ ] All removed/changed capabilities documented in §Removal
- [ ] No blank or "unknown" entries in the "must_preserve" column
- [ ] Inventory reviewed and `status: complete` set

---

## Anti-Patterns to Avoid

| Anti-pattern | Correct approach |
|-------------|-----------------|
| "I'll document it as I implement" | Inventory first, implement second |
| "This feature looks unused — I'll just skip it" | Mark it `deprecated` in §Removal with reason |
| "The new UX is simpler, so I removed this tab" | Document the removed tab with disposition `replaced` or `intentionally_removed` |
| Listing only the happy path | Also document error states, edge cases, admin-only paths |
| One entry per module instead of per capability | One entry per distinct user-facing capability |
