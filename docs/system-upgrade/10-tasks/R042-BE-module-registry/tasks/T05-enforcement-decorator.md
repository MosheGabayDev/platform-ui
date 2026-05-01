# T05 — ModuleEnforcementService decorator for route guards

**Estimate:** 60 min
**Status:** ⬜ todo
**Depends on:** T03, T04
**Touches:** `apps/platform/modules/enforcement.py` (new), `apps/authentication/decorators.py` (extend)

## Goal
A `@module_required("helpdesk")` decorator that gates route access to enabled modules per-org. Replaces ad-hoc `if not Module.is_enabled('helpdesk'): return 404` checks scattered through the codebase.

## Acceptance Criteria
- [ ] `@module_required("module_key")` decorator on Flask routes
- [ ] Returns HTTP 404 (NOT 403) when module disabled — disabled modules should not leak existence to users
- [ ] Returns HTTP 410 Gone when module is `retired`
- [ ] Stacks correctly with `@jwt_required` and `@role_required` (any order)
- [ ] Audits denied access via R046 AuditLog (when R046 is live; meanwhile log to standard logger)
- [ ] Multiple modules: `@module_required("helpdesk", "voice")` requires ALL listed modules enabled
- [ ] Passes module key through to handler context (for use in views)

## Implementation Notes
- Use `functools.wraps` to preserve route metadata
- 404 vs 403 distinction is intentional: 403 reveals the module exists but you can't access it; 404 hides existence
- For the multi-module case, fail-closed on the FIRST missing module
- Log line format: `module_enforcement: denied org=X user=Y module=Z reason=disabled|retired|expired`

## Test
- Integration: `test_module_required_decorator.py`
  - `test_returns_200_when_module_enabled`
  - `test_returns_404_when_module_disabled`
  - `test_returns_410_when_module_retired`
  - `test_returns_404_when_org_module_expired`
  - `test_multiple_modules_all_required`
  - `test_stacks_with_jwt_required` — both decorators applied, both checked
  - `test_cross_tenant` — org A user → org B's enabled module → 404

## Definition of Done
- [ ] All AC checked + 7 tests pass
- [ ] Committed + pushed
- [ ] `epic.md` Tasks: `[x] T05`
