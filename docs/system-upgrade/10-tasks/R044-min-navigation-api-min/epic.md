# R044-min — Navigation API (already-built routes only)

**Phase:** P1 (foundation slice)
**Track:** platformengineer + platform-ui
**Status:** 🔴 blocked on R042-BE-min
**Depends on:** R042-BE-min
**Estimate:** ~2 hours
**ADR refs:** ADR-040

## Scope
Minimum Navigation API that returns nav structure for the routes that already exist (dashboard, users, organizations, roles) PLUS helpdesk once enabled. NO manifest-driven multi-module logic yet — just enough to replace the hardcoded `nav-items.ts` for the live route set.

- Backend: `GET /api/org/modules/navigation` → returns array of nav items filtered by:
  1. OrgModule.status = 'enabled' for the requesting org (helpdesk only — others always-on for now)
  2. User permissions (basic check — system_admin sees all, others see role-allowed only)
- Frontend: replace `components/shell/nav-items.ts` static export with a `useNavigation()` hook that calls the API
- Sidebar consumes the hook, falls back to a minimal hardcoded list on API failure (fail-closed = empty nav, not crash)

## Out of scope (deferred to R044 full)
- Manifest-driven nav (each module declares `navigation` section) — R044 full
- Cross-module nav grouping — R044 full
- JWT route audit (full scan of all `/api/*` routes for missing `@jwt_required`) — R044 full
- Nav caching strategy — naive every-request fetch for now

## Why now
ADR-041 P1 Exit Gate item #3 requires Helpdesk nav to be served by the Navigation API (not hardcoded). This min slice satisfies that gate item with the smallest possible surface.

## Tasks
- [ ] T01 — Backend: `GET /api/org/modules/navigation` route (Flask) + JWT + tenant scope + tests (~60 min)
- [ ] T02 — Frontend: `lib/api/navigation.ts` client + `lib/hooks/use-navigation.ts` hook + query key (~30 min)
- [ ] T03 — Replace `components/shell/nav-items.ts` consumers with `useNavigation()`. Fallback: empty nav on error. (~30 min)

## Acceptance Criteria
- [ ] Endpoint returns 401 without JWT
- [ ] Endpoint returns nav array filtered by OrgModule.status (helpdesk only when enabled)
- [ ] Sidebar in browser renders nav from API (verify in dev tools network tab)
- [ ] Disabling helpdesk OrgModule for a test org → helpdesk vanishes from sidebar
- [ ] Cross-tenant test: org A user does not see org B-only nav items (currently no such items, but test the boundary)

## Definition of Done
- [ ] AC met
- [ ] `nav-items.ts` either deleted or marked DEPRECATED with "kept for fallback only" comment
- [ ] `09-history/rounds-index.md` entry
- [ ] G-NavAPI gate flips to 🟡 partial with "min subset" note

## Final commit
SHA: `<filled on close>`
Date: `<YYYY-MM-DD>`
