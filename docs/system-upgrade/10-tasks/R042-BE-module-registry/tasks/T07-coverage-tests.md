# T07 — Round-level coverage tests (20+ scenarios)

**Estimate:** 90 min
**Status:** ⬜ todo
**Depends on:** T01–T06
**Touches:** `tests/integration/test_module_registry_round.py` (new)

## Goal
Round-level integration tests that exercise the full pipeline: manifest → sync → OrgModule state → enforcement decorator → API response. Ensures end-to-end correctness of R042-BE before declaring the round done.

Per `02-rules/testing-standard.md`, every capability round needs cross-tenant + RBAC + audit evidence.

## Acceptance Criteria
≥ 20 integration tests covering:

**Sync correctness (5)**
- [ ] Fresh DB sync from 3 manifests produces 3 modules + N dependencies
- [ ] Re-sync with no changes is no-op (assert no DB writes via SQL log)
- [ ] Manifest hash change → only that row updates
- [ ] Removed manifest → status=retired, not deleted
- [ ] Malformed manifest does not block sync of others

**OrgModule + availability (5)**
- [ ] is_module_available returns True when org enabled
- [ ] is_module_available cascades through required deps
- [ ] is_module_available ignores optional dep absence
- [ ] is_module_available expires correctly on `expires_at` past
- [ ] is_module_available returns False for retired module

**CompatLayer (3)**
- [ ] Legacy is_enabled call routes through new logic
- [ ] is_installed=true even if status=disabled
- [ ] Deprecation warning logged once per call site

**Enforcement (5)**
- [ ] @module_required passes when enabled
- [ ] @module_required → 404 when disabled
- [ ] @module_required → 410 when retired
- [ ] @module_required stacks with @jwt_required correctly
- [ ] Cross-tenant: org A's enabled module is 404 for org B user

**Multi-tenant + audit (3)**
- [ ] Org isolation: 50 orgs, sync once, all see correct OrgModule state
- [ ] All denied accesses logged (line count == denial count)
- [ ] No PII leakage in 404 / 410 response bodies (assert generic message)

## Test
- Run: `pytest tests/integration/test_module_registry_round.py -v --cov=apps/platform/modules`
- Evidence: paste `X passed / 0 failed in Ys` + coverage % for `apps/platform/modules/*`

## Definition of Done
- [ ] ≥ 20 tests pass
- [ ] Coverage ≥ 90% for `apps/platform/modules/`
- [ ] No flakes (run 3× consecutively)
- [ ] G-ModuleSync gate flipped to ✅ in `00-control-center.md`
- [ ] `09-history/rounds-index.md` entry added for R042-BE
- [ ] Committed + pushed
- [ ] `epic.md` Tasks: `[x] T07`
- [ ] `epic.md` Final commit SHA + date filled
