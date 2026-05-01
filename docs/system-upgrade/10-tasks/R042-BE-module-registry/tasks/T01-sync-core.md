# T01 — sync_from_manifests() core: discover + insert/update Module rows

**Estimate:** 60 min
**Status:** ⬜ todo
**Depends on:** none (R040 schema already applied)
**Touches:** `apps/platform/modules/registry.py` (new), `apps/platform/modules/__init__.py`, tests

## Goal
Implement the discovery half of `ModuleRegistry.sync_from_manifests()` — walk `apps/*/module.manifest.json`, validate, upsert into `modules` table.

## Acceptance Criteria
- [ ] `ModuleRegistry.sync_from_manifests()` walks all `apps/*/module.manifest.json` files
- [ ] Each manifest validated against Pydantic `ModuleManifestV2` schema (reject malformed with structured error)
- [ ] New manifests → INSERT into `modules` table
- [ ] Existing manifests → UPDATE only if `manifest_hash` differs (idempotent)
- [ ] Manifests removed from disk → mark `modules.status='retired'` (do not DELETE)
- [ ] Function returns summary dict: `{inserted, updated, retired, skipped, errors}`

## Implementation Notes
- Manifest schema lives in `_legacy/47-…-roadmap.md §3` and `04-capabilities/module-system.md`
- `manifest_hash`: SHA256 of canonical-JSON serialization (sorted keys)
- Errors per manifest collected, do not abort sync on one bad file
- Use SQLAlchemy session; commit once at end (atomic)
- File walk: `glob.glob('apps/*/module.manifest.json')` from `apps/__init__.py` location

## Test
- Unit: `test_module_registry_sync.py`
  - `test_sync_inserts_new_modules` — empty DB → manifests on disk → all inserted
  - `test_sync_updates_changed_manifest` — modify hash → UPDATE not INSERT
  - `test_sync_idempotent` — run twice, second is no-op
  - `test_sync_retires_missing_manifest` — manifest deleted → status=retired
  - `test_sync_rejects_malformed_manifest` — bad JSON → error in summary, others succeed
- Evidence: paste `pytest tests/test_module_registry_sync.py -v` output

## Definition of Done
- [ ] All AC checked
- [ ] Tests pass
- [ ] `pytest` green for new tests
- [ ] Committed to master + pushed
- [ ] `epic.md` Tasks: `[x] T01`
