# T02 — sync_from_manifests(): build ModuleDependency rows

**Estimate:** 45 min
**Status:** ⬜ todo
**Depends on:** T01
**Touches:** `apps/platform/modules/registry.py`, `apps/platform/modules/dependencies.py` (new), tests

## Goal
Extend the sync to populate `module_dependencies` from each manifest's `dependencies[]` array.

## Acceptance Criteria
- [ ] After sync, `module_dependencies` table reflects manifest declarations
- [ ] Existing rows for a module are replaced atomically (delete-then-insert) when manifest changes
- [ ] Cycle detection: if A→B and B→A declared, sync raises `CircularDependencyError` and rolls back
- [ ] Missing target module: dependency on a non-existent `module_key` raises `UnknownDependencyError` with module name
- [ ] `dependency_type` honored (required | optional | recommended)
- [ ] `min_version` constraint stored verbatim (validation happens at install time, not sync time)

## Implementation Notes
- Topological sort via Kahn's algorithm to detect cycles
- Two-phase: first pass collects all module keys, second pass resolves FKs
- Errors include both module key and chain (e.g. "A → B → A")
- `optional` and `recommended` dependencies still inserted, but flag retained

## Test
- Unit: `test_module_dependencies_sync.py`
  - `test_dependencies_inserted_from_manifest`
  - `test_dependencies_replaced_on_manifest_change`
  - `test_circular_dependency_detected` — A↔B → raises + rollback
  - `test_unknown_target_raises` — declares dep on missing module
  - `test_optional_dep_does_not_block_sync`
- Evidence: pytest output

## Definition of Done
- [ ] All AC checked + tests pass
- [ ] Committed + pushed
- [ ] `epic.md` Tasks: `[x] T02`
