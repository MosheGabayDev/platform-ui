# R044 — Navigation API + JWT Route Audit

**Phase:** P1 — Foundation Gates
**Track:** platformengineer
**Status:** 🔴 blocked on R042-BE (CompatLayer)
**Depends on:** R042-BE
**Estimate:** ~4 hours

## Scope
- `GET /api/org/modules/navigation` — returns nav structure scoped by OrgModule.status + RBAC
- Sidebar wiring: platform-ui consumes this endpoint instead of hardcoding nav
- JWT route audit: every `/api/*` write route has `@jwt_required` + tenant scoping
- Spec: `05-ai/floating-assistant.md §navigation context`

## Out of scope
- Custom nav per role (deferred — single endpoint serves all roles, frontend filters)
- Breadcrumbs (frontend concern)
- Search index population (R053)

## Why now
Sidebar currently shows ALL modules regardless of OrgModule.status, leaking info about disabled features. Module licensing has no teeth without nav-level enforcement.

## Decomposition rationale
Backend endpoint first (testable). UI wiring is a separate platform-ui round once endpoint stable.

## Tasks
- [ ] T01 — Manifest schema: declare `navigation` section per module (root path, label key, icon, permissions)
- [ ] T02 — `build_navigation(org_id, user)` pure function: filter by OrgModule.status + permissions
- [ ] T03 — `GET /api/org/modules/navigation` route + JWT + cross-tenant test
- [ ] T04 — JWT audit script: list all `/api/*` routes missing `@jwt_required` (output as report)
- [ ] T05 — Fix all routes flagged by T04 (or document exception)
- [ ] T06 — Tests: viewer / technician / admin see different nav from same org

## Acceptance Criteria
- [ ] Endpoint returns 401 without JWT
- [ ] Endpoint returns 200 + filtered nav with valid JWT
- [ ] Disabled modules NOT in response
- [ ] Cross-tenant test: org A user cannot see org B nav
- [ ] JWT audit report shows zero unprotected `/api/*` write routes (or all documented)

## Final commit
SHA: `<filled on close>`
Date: `<YYYY-MM-DD>`
