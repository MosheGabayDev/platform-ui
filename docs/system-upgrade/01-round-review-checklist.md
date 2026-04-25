# 01 — Round Review Checklist

> Reviewer runs this checklist before approving any implementation round.
> _Last updated: 2026-04-25 (R040-Control — Governance Setup)_

---

## How to Use

Work through each section. Mark `[x]` for pass, `[!]` for concern (must document), `[x]` with note for waived items.
A round may not be marked Done until all `[!]` items are resolved or explicitly accepted with an ADR.

---

## 1. Scope Adherence

- [ ] All acceptance criteria from the round definition are met
- [ ] No features or changes outside defined scope were added
- [ ] The out-of-scope list was respected
- [ ] Do-Not-Start-Yet items from `00-implementation-control-center.md` were not touched
- [ ] If scope changed during implementation: a scope change note was added to the round entry in `96-rounds-index.md`

---

## 2. Forbidden Patterns

> These are hard `NEVER` rules from `CLAUDE.md`. Any violation blocks the round.

- [ ] No `import openai` / `import anthropic` / `import google.generativeai` outside `apps/ai_providers/`
- [ ] No `os.getenv("OPENAI_API_KEY")` / `os.getenv("GEMINI_API_KEY")` outside `key_resolver.py`
- [ ] No `request.json.get("org_id")` or `request.args.get("org_id")` for data scoping
- [ ] No `render_template()` in `/api/*` routes
- [ ] No `str(exc)` in error responses (leaks internal info)
- [ ] No new `*_client.py` or `*_wrapper.py` that calls LLM providers directly
- [ ] No hardcoded IP addresses, hostnames, or environment-specific values
- [ ] No hardcoded secrets or credentials in any file
- [ ] No `create_engine()` in model files
- [ ] No `postgresql://` or `mysql://` connection strings in app code

---

## 3. Auth / RBAC

- [ ] All new `/api/*` write endpoints have `@jwt_required` decorator
- [ ] `g.jwt_user` is used for identity — not `current_user` from Flask-Login on JSON routes
- [ ] All mutation endpoints have `@role_required` or `@permission_required`
- [ ] No new endpoint skips auth without explicit design justification in an ADR
- [ ] Internal-only routes (e.g. `/admin/api/internal/*`) are protected by `X-API-Key` header check

---

## 4. Tenant Isolation

- [ ] Every new DB query includes `WHERE org_id = g.jwt_user.org_id` (or equivalent FK scoping)
- [ ] No query returns rows from multiple orgs without explicit system-admin check
- [ ] New models with org-level data have `org_id` as a non-nullable FK to `organizations.id`
- [ ] No new route accepts `org_id` from request body for data scoping (derive from auth only)
- [ ] Cross-tenant operations (system-admin only) are explicitly gated on `is_system_admin`

---

## 5. Audit Trail

- [ ] `record_activity()` called on every create/update/delete operation
- [ ] `record_activity()` called on security operations (revoke, disable, suspend, approve)
- [ ] Audit entries include the actor (`user_id`), affected resource, and org context
- [ ] No sensitive action silently succeeds without an audit row

---

## 6. Billing / LLM Usage

- [ ] All LLM calls use `AIProviderGateway.call(GatewayRequest(...))` — not provider SDK directly
- [ ] `GatewayRequest` includes `org_id`, `user_id`, `module_id`, `feature_id`, `capability`
- [ ] `response.usage_log_id` is available — confirms `AIUsageLog` row was written
- [ ] No new call to `get_api_key()` where `AIProviderGateway` can be used instead
- [ ] Voice gateway calls use `/admin/api/internal/resolve-voice-provider` — not direct key access

---

## 7. DB Migration Safety

> Skip if no migrations in this round.

- [ ] All new columns are nullable OR have a `server_default` (additive-only rule per ADR-036)
- [ ] No `op.drop_column()` without a 30-day transition gate approval
- [ ] No `op.alter_column()` that changes nullability from nullable→NOT NULL without backfill
- [ ] No table renames without a dual-name transition period
- [ ] `upgrade()` function present and tested
- [ ] `downgrade()` function present (may be stub with `pass` for truly additive changes)
- [ ] Migration file placed in `migrations/versions/` (not `scripts/migrations/versions/`)
- [ ] `down_revision` correctly chains to dependency migrations (especially FK dependencies)
- [ ] No `create_engine()` in migration files — use `op.get_bind()` if raw SQL needed
- [ ] JSONB columns use `sqlalchemy.dialects.postgresql.JSONB` (PostgreSQL-only project)

---

## 8. Tests

- [ ] New models: structural tests verify column existence, constraints, and relationships
- [ ] New routes: at least one test per endpoint (happy path + 401/403)
- [ ] Regression gate passes: `bash scripts/test_steps/00_regression.sh`
- [ ] Test count documented in round summary (e.g., "43 passed / 43 total")
- [ ] No test uses object instantiation where mapper error can fire (use `__table__.columns` inspection instead)
- [ ] Tests added to the correct module test directory (`apps/<module>/tests/`)
- [ ] No live DB connection required for structural/unit tests

---

## 9. Shared Capability Usage

> Before building anything new, verify it doesn't duplicate an existing shared capability.

- [ ] Checked `26-platform-capabilities-catalog.md` — no duplicate capability built
- [ ] Auth: uses `@jwt_required` + `g.jwt_user` (not custom token parsing)
- [ ] RBAC: uses `@role_required` / `@permission_required` from `apps/authentication/rbac.py`
- [ ] Audit: uses `record_activity()` from shared audit module
- [ ] Response envelope: `{"success": bool, "data": {...}}` — no raw model dumps
- [ ] Error responses: no `str(exc)` — use safe error messages

---

## 10. Documentation

- [ ] `apps/<module>/INDEX.md` updated for every changed file (Quick Lookup, Key Symbols, Flow)
- [ ] `docs/system-upgrade/96-rounds-index.md` — new round entry appended
- [ ] `docs/system-upgrade/98-change-log.md` — new entry prepended
- [ ] `docs/system-upgrade/15-action-backlog.md` — completed tasks marked `[x]`, new tasks added
- [ ] `docs/system-upgrade/35-platform-capabilities-build-order.md` — capability row updated if applicable
- [ ] If new module created: `CLAUDE.md §Module Index` updated + new `INDEX.md` created from template
- [ ] If architectural boundary changed: ADR added to `DOCS/execution/DECISIONS_LOG.md`
- [ ] If new bug diagnosed (>10 min): `MEMORY.md §Known Bugs Fixed` updated

---

## 11. PR Quality

- [ ] PR title matches `<type>(<scope>): <desc>` commit convention (≤72 chars)
- [ ] PR body references the round ID (e.g., R040)
- [ ] PR body includes test results
- [ ] PR body links to the GitHub issue (or notes the issue draft)
- [ ] Diff is ≤500 LOC net (or justified in PR body if larger)
- [ ] No debug prints, commented-out code blocks, or TODO stubs left in (unless explicitly deferred with an issue)

---

## Round Summary Template

Copy this into the `96-rounds-index.md` entry:

```markdown
| Field | Value |
|-------|-------|
| **Round** | RXXX — Title |
| **Date** | YYYY-MM-DD |
| **Commit** | <SHA> |
| **Scope** | One sentence |
| **Tests** | XX passed / XX total |
| **Forbidden patterns** | None / [describe violation + resolution] |
| **Security** | Checked |
| **Tenant isolation** | Checked |
| **Docs updated** | 96, 98, 15, [list] |
| **Risks/follow-ups** | [list or "none"] |
| **Next round** | RXXX |
```
