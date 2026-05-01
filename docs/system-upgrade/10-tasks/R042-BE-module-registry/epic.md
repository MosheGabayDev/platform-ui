# R042-BE — ModuleRegistry sync + ModuleCompatLayer (FULL — runs after R042-BE-min + Helpdesk Phase A)

**Phase:** P1 — Foundation Gates (full slice — sliced per ADR-040)
**Track:** platformengineer (joint-repo phase per ADR-039)
**Status:** 🔴 blocked on Helpdesk Phase A
**Depends on:** R042-BE-min ✅ + Helpdesk Phase A
**Estimate:** ~3.5 hours (T04-T07; T01-T03 ran in R042-BE-min)

> **Slicing note (ADR-040):** T01-T03 of this round have been sliced into `../R042-BE-min-module-registry-min/epic.md` and run BEFORE Helpdesk Phase A. T04-T07 below run AFTER Helpdesk Phase A validates the min subset.

## Scope
- `ModuleRegistry.sync_from_manifests()` — bridge 75 manifest files → DB catalog (R040 tables)
- `ModuleCompatLayer` — read-through shim for existing callers of `Module.is_enabled` / `Module.is_installed`
- `is_module_available(org_id, module_key)` helper
- `ModuleEnforcementService` — gate runtime access by OrgModule.status

## Out of scope
- Write APIs (R042-write or later)
- Sidebar wiring (R044 Navigation API)
- UI consumption (deferred until backend stable)

## Why now
Without this layer the R040 OrgModule tables are dead weight — no caller reads them, manifest data drifts from DB state, and any module migration breaks existing route checks.

## Decomposition rationale
Backend, isolated to `apps/platform/modules/`. Tasks ordered: data sync first (manifests → DB), then read helpers, then enforcement service. Tests at each layer.

## Tasks (to be split when round starts on platformengineer)
- [ ] T01 — `sync_from_manifests()` core: discover + insert/update Module rows from manifest files
- [ ] T02 — `sync_from_manifests()` dependencies: build ModuleDependency rows from manifest `dependencies[]`
- [ ] T03 — `is_module_available(org_id, key)` + unit tests (org has, org doesn't, disabled, missing)
- [ ] T04 — `ModuleCompatLayer.is_enabled` / `is_installed` shim with deprecation logging
- [ ] T05 — `ModuleEnforcementService` decorator for route guards
- [ ] T06 — Wire sync into Flask startup (idempotent run on boot)
- [ ] T07 — Tests: 20+ scenarios per `02-rules/testing-standard.md`

## Acceptance Criteria
- [ ] After app startup, `org_modules` table has rows for every manifest module
- [ ] `is_module_available(org, "helpdesk")` returns correct boolean given OrgModule state
- [ ] CompatLayer reads return same values as legacy Module fields for unchanged orgs
- [ ] All tests pass (paste counts on close)
- [ ] No new direct LLM imports introduced

## Definition of Done
- [ ] AC met
- [ ] `09-history/rounds-index.md` + `change-log.md` updated
- [ ] G-ModuleSync gate flipped to ✅ in `00-control-center.md`
- [ ] Final commit SHA recorded below

## Final commit
SHA: `<filled on close>`
Date: `<YYYY-MM-DD>`
