## Summary
<!-- One sentence: what does this PR do and why? -->

## Round / Issue
<!-- Required: link the implementation round or GitHub issue -->
- Round: <!-- e.g. R041 -->
- Issue: <!-- e.g. #123 or "see docs/system-upgrade/issues/R040-R049-issue-drafts.md" -->

## Type of Change
- [ ] feat — new feature
- [ ] fix — bug fix
- [ ] refactor — no logic change
- [ ] test — tests only
- [ ] docs — documentation
- [ ] chore — maintenance / tooling
- [ ] security — security fix
- [ ] governance — process / templates / checklists

---

## Scope Adherence
- [ ] All acceptance criteria from the round/issue are met
- [ ] Nothing outside defined scope was added
- [ ] Out-of-scope list was respected
- [ ] Do-Not-Start-Yet items were not touched (see `docs/system-upgrade/00-implementation-control-center.md`)

---

## Forbidden Patterns Check
- [ ] No `import openai` / `import anthropic` / `import google.generativeai` outside `apps/ai_providers/`
- [ ] No `os.getenv("OPENAI_API_KEY")` / `os.getenv("GEMINI_API_KEY")` outside `key_resolver.py`
- [ ] No `request.json.get("org_id")` for data scoping (use `g.jwt_user.org_id`)
- [ ] No `render_template()` in `/api/*` routes
- [ ] No `str(exc)` in error responses
- [ ] No hardcoded secrets, IPs, or hostnames
- [ ] Response envelope is `{"success": bool, "data": {...}}` — no raw model dumps

---

## Auth / RBAC
- [ ] N/A — no new routes in this PR
- [ ] All new `/api/*` write endpoints have `@jwt_required`
- [ ] All mutation endpoints have `@role_required` or `@permission_required`
- [ ] Identity derived from `g.jwt_user` — not request body

---

## Tenant Isolation
- [ ] N/A — no DB queries in this PR
- [ ] Every new DB query scopes by `org_id` (`WHERE org_id = g.jwt_user.org_id`)
- [ ] No query returns cross-tenant data without `is_system_admin` gate
- [ ] New org-scoped models have `org_id FK → organizations.id` (non-nullable)

---

## Audit Trail
- [ ] N/A — no state mutations in this PR
- [ ] `record_activity()` called for every create/update/delete/security operation

---

## AI / LLM Checks
- [ ] N/A — no LLM calls in this PR
- [ ] All LLM calls use `AIProviderGateway.call(GatewayRequest(...))` — not provider SDK directly
- [ ] `GatewayRequest` includes `org_id`, `user_id`, `module_id`, `feature_id`, `capability`

---

## DB Migration Safety
- [ ] N/A — no migrations in this PR
- [ ] All new columns are nullable OR have `server_default` (additive-only — ADR-036)
- [ ] No `op.drop_column()` / `op.alter_column()` on nullable→NOT NULL without approval
- [ ] Migration file in `migrations/versions/` (not `scripts/migrations/versions/`)
- [ ] `down_revision` chains correctly to FK dependencies
- [ ] `upgrade()` tested locally; `downgrade()` present

---

## Tests
- [ ] Tests added / updated for new code
- [ ] Test count: <!-- e.g. "43 passed / 43 total" -->
- [ ] Regression gate: `bash scripts/test_steps/00_regression.sh` → PASSED
- [ ] No test uses model instantiation where pre-existing mapper error may fire (use `__table__.columns`)

---

## Docs Updated
- [ ] `apps/<module>/INDEX.md` updated for every changed file
- [ ] `docs/system-upgrade/96-rounds-index.md` — new round entry appended
- [ ] `docs/system-upgrade/98-change-log.md` — new entry prepended
- [ ] `docs/system-upgrade/15-action-backlog.md` — tasks marked done / new tasks added
- [ ] `docs/system-upgrade/35-platform-capabilities-build-order.md` — row updated if applicable

---

## Screenshots
<!-- Required if UI was changed. Include before/after or "N/A — no UI changes" -->

---

## Risks / Follow-ups
<!-- List new risks discovered, or "none". Open issues for follow-ups that were descoped. -->

---

## Related
<!-- RXXX round, ADR-XXX, issue #XXX, links -->
