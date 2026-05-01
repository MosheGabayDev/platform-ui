# R045 — Feature Flags Engine + Settings Engine

**Phase:** P1 — Foundation Gates
**Track:** platformengineer
**Status:** ⬜ ready
**Depends on:** R040 ✅
**Estimate:** ~6 hours

## Scope
- **Feature Flags:**
  - Generic `OrgFeatureFlag` service backing `useFeatureFlag(key)` UI hook
  - Plan-tier gating: a flag may be plan-gated (e.g. `helpdesk.advanced` requires `pro` plan)
  - System-admin override: force-enable a flag for any org (debug/staging)
  - `GET /api/org/feature-flags` endpoint (returns map of all keys for current org)
- **Settings Engine:**
  - Generic org/user settings registry with typed schemas
  - `GET/PATCH /api/org/settings/<scope>` and `/api/user/settings/<scope>`
  - Settings declared per module via manifest (`settings` section)
  - PII fields auto-masked in responses

## Out of scope
- Settings UI (separate platform-ui round)
- Per-feature billing meter (R045-billing or later)

## Why now
Without these, every module invents its own settings storage and flag pattern. AI assistant has nowhere to read user preferences. Plan gating is unreliable.

## Tasks
- [ ] T01 — `OrgFeatureFlag` model + migration (org_id, key, enabled, plan_required, expires_at)
- [ ] T02 — `OrgSettings` + `UserSettings` models + migrations
- [ ] T03 — `FeatureFlagService.is_enabled(org_id, key)` with plan + override + cache (5min TTL)
- [ ] T04 — `SettingsService.get(scope, owner_id)` + `set(scope, owner_id, key, value)`
- [ ] T05 — Manifest schema extension: `settings` section + load on `sync_from_manifests()`
- [ ] T06 — `GET /api/org/feature-flags` + `GET/PATCH /api/org/settings/<scope>` + `GET/PATCH /api/user/settings/<scope>`
- [ ] T07 — Tests: plan gating, system override, per-org isolation, PII masking, cache invalidation

## Acceptance Criteria
- [ ] `is_enabled(org, "helpdesk.advanced")` returns false for free-plan org
- [ ] System override enables flag regardless of plan
- [ ] Settings PATCH validates against manifest schema (rejects unknown keys)
- [ ] Cross-tenant test: org A settings invisible to org B user
- [ ] All tests pass

## Final commit
SHA: `<filled on close>`
Date: `<YYYY-MM-DD>`
