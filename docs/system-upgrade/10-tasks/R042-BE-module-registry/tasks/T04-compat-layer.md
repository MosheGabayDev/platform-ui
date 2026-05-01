# T04 — ModuleCompatLayer: read-through shim with deprecation logging

**Estimate:** 45 min
**Status:** ⬜ todo
**Depends on:** T03
**Touches:** `apps/platform/modules/compat.py` (new), `apps/platform/modules/__init__.py`

## Goal
Read-through shim that mirrors legacy `Module.is_enabled` / `Module.is_installed` calls onto the new OrgModule-aware logic, while logging deprecation warnings. Lets existing route code keep working unchanged during gradual migration.

## Acceptance Criteria
- [ ] `ModuleCompatLayer.is_enabled(module_key)` resolves org_id from `flask.g.user.org_id` and calls T03 `is_module_available`
- [ ] `ModuleCompatLayer.is_installed(module_key)` returns True if OrgModule row exists for org (regardless of status)
- [ ] Both methods log `WARNING module_compat: legacy call from <caller>` once per process per call site (deduped)
- [ ] Deprecation log includes filename:line of caller (use `inspect.stack()`)
- [ ] If `flask.g.user` missing (background job, no request) → fall back to system-admin org check, log INFO
- [ ] Drop-in replacement: a `apps/platform/modules/__init__.py` re-export aliases legacy `Module.is_enabled` etc. to CompatLayer methods

## Implementation Notes
- Deduplication: `Set[Tuple[file, line]]` at module scope, never cleared (logs once per process per call site)
- Performance: same flask.g cache as T03
- DO NOT silently change behavior — if legacy returned True for a case the new logic returns False, that IS the bug being surfaced

## Test
- Unit: `test_module_compat_layer.py`
  - `test_is_enabled_delegates_to_is_module_available`
  - `test_is_installed_returns_true_for_disabled_org_module` — installed != enabled
  - `test_deprecation_warning_logged_once_per_callsite`
  - `test_no_flask_g_falls_back_to_system_admin`
- Evidence: pytest output + grep deprecation log lines

## Definition of Done
- [ ] All AC checked + tests pass
- [ ] Committed + pushed
- [ ] `epic.md` Tasks: `[x] T04`
