# T03 — is_module_available(org_id, module_key) helper + tests

**Estimate:** 45 min
**Status:** ⬜ todo
**Depends on:** T01
**Touches:** `apps/platform/modules/availability.py` (new), tests

## Goal
Pure-function helper that resolves whether a module is currently usable by a given org. Single source of truth for "can this org use module X right now?".

## Acceptance Criteria
- [ ] `is_module_available(org_id: int, module_key: str) -> bool`
- [ ] Returns `True` only if ALL hold:
  - Module exists in `modules` and `modules.status='active'` (not retired)
  - `OrgModule` row exists for (org_id, module_key)
  - `OrgModule.status='enabled'`
  - `OrgModule.expires_at` is NULL or in the future
  - All required dependencies (from T02) are also available for this org (recursive)
- [ ] Recursion bounded — uses memoized resolver, max depth 10, raises `DependencyDepthExceeded` beyond
- [ ] Returns `False` (not raise) for unknown `module_key`
- [ ] Side-effect free — no DB writes, no logs except DEBUG

## Implementation Notes
- Cache within request scope only (`flask.g`) — DO NOT use process-wide cache (org disable must take effect immediately)
- Recursion: a `Set[str]` of "currently resolving" keys to detect cycles defensively (T02 should have prevented but be defensive)
- Tenant isolation: query MUST scope by `org_id` (no `Module.is_enabled` global lookups)

## Test
- Unit: `test_is_module_available.py`
  - `test_returns_true_when_all_conditions_met`
  - `test_returns_false_when_org_module_disabled`
  - `test_returns_false_when_module_retired`
  - `test_returns_false_when_expired`
  - `test_returns_false_when_required_dep_unavailable`
  - `test_returns_true_when_optional_dep_unavailable` — optional deps don't block
  - `test_returns_false_for_unknown_module_key` — does not raise
  - `test_cross_tenant_isolation` — org A enable does not bleed to org B

## Definition of Done
- [ ] All AC checked + 7 tests pass
- [ ] Committed + pushed
- [ ] `epic.md` Tasks: `[x] T03`
