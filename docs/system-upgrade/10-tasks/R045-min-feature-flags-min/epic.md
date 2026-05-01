# R045-min — Feature Flags only (one flag: `helpdesk.enabled`)

**Phase:** P1 (foundation slice)
**Track:** platformengineer
**Status:** ⬜ ready (parallel-safe with R042-BE-min, R044-min)
**Depends on:** R040 ✅
**Estimate:** ~2 hours
**ADR refs:** ADR-040

## Scope
Replace the current `useFeatureFlag` stub with a real `OrgFeatureFlag`-backed service exposing ONE flag: `helpdesk.enabled`. Settings Engine is split out and deferred to R045 (full) per ADR-040.

- `OrgFeatureFlag` model + migration (org_id, key, enabled, plan_required, expires_at)
- `FeatureFlagService.is_enabled(org_id, key)` with simple in-memory cache (5-min TTL)
- `GET /api/org/feature-flags` endpoint returns `{ "helpdesk.enabled": true|false, ... }` for current org
- Seed: `helpdesk.enabled = false` for every org by default; explicit enable per org via SQL or admin UI (later)
- Frontend `useFeatureFlag` hook already exists — verify it consumes the new endpoint correctly (replace stub)

## Out of scope (deferred to R045 full)
- Settings Engine (org/user settings registry) — entire SettingsService deferred
- Plan-tier enforcement (just store `plan_required`, don't enforce yet)
- System-admin override mechanism — admin UI deferred
- Manifest-driven flag declaration — R045 full
- Cache invalidation on flag mutation — naive 5-min TTL only

## Why now
ADR-041 P1 Exit Gate item #2 requires `FeatureGate flag="helpdesk.enabled"` to be served by the real service (not stub). This min slice closes that requirement.

## Tasks
- [ ] T01 — Migration: `org_feature_flags` table (org_id, key, enabled, plan_required, expires_at, created_at, updated_at) (~30 min)
- [ ] T02 — `FeatureFlagService.is_enabled()` + cache + tests (no caching bugs, expiry honored) (~45 min)
- [ ] T03 — `GET /api/org/feature-flags` route (JWT + tenant scope) + cross-tenant test (~30 min)
- [ ] T04 — Seed: insert `helpdesk.enabled=false` row for every existing org (idempotent) (~15 min)
- [ ] T05 — Verify frontend `useFeatureFlag` consumes the new endpoint — manual smoke test (~15 min)

## Acceptance Criteria
- [ ] After migration + seed, every org has a `helpdesk.enabled` row defaulting to false
- [ ] `GET /api/org/feature-flags` returns map for the JWT's org only
- [ ] Setting flag to true via SQL → frontend `useFeatureFlag("helpdesk.enabled")` returns `enabled: true` within 5 min (cache TTL)
- [ ] Cross-tenant: org A user cannot read org B flags
- [ ] Expired flags (`expires_at` past) treated as disabled

## Definition of Done
- [ ] AC met
- [ ] `09-history/rounds-index.md` entry
- [ ] G-FeatureFlags gate flips to 🟡 partial with "single flag, no plan enforcement" note

## Final commit
SHA: `<filled on close>`
Date: `<YYYY-MM-DD>`
