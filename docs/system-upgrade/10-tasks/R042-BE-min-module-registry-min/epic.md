# R042-BE-min — ModuleRegistry sync (Helpdesk-validating subset)

**Phase:** P1 (foundation slice)
**Track:** platformengineer
**Status:** ⬜ ready (after R-OPS-01)
**Depends on:** R-OPS-01, R040 ✅, R040-Fix ✅
**Estimate:** ~2.5 hours
**ADR refs:** ADR-040 (Helpdesk-validated foundation slicing)

## Scope
Minimal subset of R042-BE that lets Helpdesk Phase A validate the OrgModule mechanism. Defers full CompatLayer + enforcement decorator + startup wiring + ≥20 coverage tests to R042-BE (full).

- `sync_from_manifests()` core — read `apps/*/module.manifest.json` files into `modules` table (T01 of R042-BE)
- `sync_from_manifests()` dependencies — populate `module_dependencies` (T02 of R042-BE)
- `is_module_available(org_id, module_key)` helper (T03 of R042-BE)

These three tasks together provide enough to support Helpdesk's `is_module_available("helpdesk")` lookup and per-org enable/disable for the bootstrap org.

## Out of scope (deferred to R042-BE full)
- ModuleCompatLayer (legacy is_enabled / is_installed shim) — not needed for new Helpdesk page
- @module_required decorator — Helpdesk uses FeatureGate from R045-min instead
- Flask startup wiring — manual sync via CLI sufficient for the validation
- ≥ 20 coverage tests — tests bundled into Helpdesk Phase A AC instead

## Why now
ADR-040 mandates Helpdesk-validating slicing. Building the full R042-BE before any consumer means weeks of unvalidated foundation work. This min slice unblocks Helpdesk Phase A in ~2.5h.

## Tasks
Reuse the existing R042-BE tasks:
- [ ] T01 — sync_from_manifests() core (60 min) — see `../R042-BE-module-registry/tasks/T01-sync-core.md`
- [ ] T02 — sync_from_manifests() dependencies (45 min) — see `../R042-BE-module-registry/tasks/T02-sync-dependencies.md`
- [ ] T03 — is_module_available() + tests (45 min) — see `../R042-BE-module-registry/tasks/T03-is-module-available.md`

## Acceptance Criteria
- [ ] T01-T03 from R042-BE pass their AC
- [ ] Manual smoke: enable helpdesk for org_id=1 via SQL, then `is_module_available(1, "helpdesk")` returns True; disable, returns False
- [ ] Helpdesk Phase A T01 (types) can begin (no further backend work blocks it)

## Definition of Done
- [ ] AC met
- [ ] R042-BE epic.md updated: T01-T03 marked `[x] (in -min)`, T04-T07 status = "deferred to R042-BE full post-Helpdesk-Phase-A"
- [ ] `09-history/rounds-index.md` entry added
- [ ] G-ModuleSync gate (00-control-center) flips to 🟡 partial with "min subset" note

## Final commit
SHA: `<filled on close>`
Date: `<YYYY-MM-DD>`
