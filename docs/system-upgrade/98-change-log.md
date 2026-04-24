# 98 — Change Log

_Running log of what changed in each update round._
_Newest entry at the top._

---

## Format

```
## YYYY-MM-DD — Round NNN: <topic>
### Files Changed
### New Findings
### Decision Changes
### Backlog Changes
```

---

## 2026-04-24 — Round 022: Security Blockers Closure

### Files Changed

**platformengineer:**
- `apps/authentication/jwt_auth.py` — **added** `record_activity()` helper; **removed** `?token=` query-param fallback from `jwt_required` (L3 fix)
- `apps/authentication/jwt_routes.py` — **added** `auth.login`, `auth.login_failed`, `auth.logout` audit writes using `record_activity`
- `apps/authentication/user_api_routes.py` — **added** `record_activity` import; PII-001: non-admins now see only own record in `GET /api/users`; **added** `user.create`, `user.update`, `user.approve` audit writes
- `apps/admin/org_api_routes.py` — **added** `record_activity` import; **added** `org.create`, `org.update` audit writes
- `apps/authentication/role_api_routes.py` — **added** `record_activity` import; **added** `role.create`, `role.update`, `role.permissions_replace` audit writes

**platform-ui:**
- `lib/platform/auth/types.ts` — **added** `is_system_admin?: boolean` to `FlaskUserPayload`; `is_system_admin: boolean` to `NormalizedAuthUser`
- `lib/auth/options.ts` — **added** `is_system_admin: user.is_system_admin ?? false` to `normalizeFlaskUser()`
- `lib/platform/permissions/rbac.ts` — **fixed** `isSystemAdmin()` to return `user.is_system_admin` instead of `user.is_admin`
- `docs/system-upgrade/31-production-security-headers.md` — **created** (CSP planning doc)
- `docs/system-upgrade/30-security-hardening-audit.md` — **updated** with R022 status (all blockers resolved)
- `docs/system-upgrade/06-security-assessment.md` — **updated** with R022 column
- `docs/system-upgrade/96-rounds-index.md` — **updated** (R022 entry)
- `docs/system-upgrade/98-change-log.md` — **updated**

### New Findings
- All R021 deferred items resolved in this round

### Decision Changes
- `isSystemAdmin()` now correctly distinguishes system-admin from org-admin (was returning `is_admin`)

### Backlog Changes
- AUD-001, PII-001, M2, L3 — all closed
- Remaining open: CSP enforcement (plan created), L4 (15-min JWT window — acceptable)

---

## 2026-04-24 — Round 021: Security Hardening Audit

### Files Changed

**platformengineer:**
- `apps/authentication/user_api_routes.py` — **added** `PATCH /api/users/<id>/active` with admin guard, self-deactivation block, idempotency, `UserActivity` audit write
- `apps/admin/org_api_routes.py` — **added** `PATCH /api/organizations/<id>/active` with system-admin guard, idempotency, `UserActivity` audit write

**platform-ui:**
- `app/api/proxy/[...path]/route.ts` — **hardened** proxy PATH_MAP: strict allowlist, unknown prefix → 404 (removed `?? /api/${prefix}` fallback)
- `lib/platform/request/context.ts` — **hardened** header names: `X-User-Id` → `X-Client-User-Id`, `X-Org-Id` → `X-Client-Org-Id`
- `lib/auth/options.ts` — **added** `events.signOut` handler calling Flask `/api/auth/logout` to invalidate refresh token
- `docs/system-upgrade/30-security-hardening-audit.md` — **created** (full audit findings, RBAC matrix, tenant isolation review, audit readiness matrix)
- `docs/system-upgrade/06-security-assessment.md` — **updated** with R021 status table
- `docs/system-upgrade/96-rounds-index.md` — **updated** (R020 + R021 entries)
- `docs/system-upgrade/98-change-log.md` — **updated**

### New Findings
- **HIGH** Proxy PATH_MAP fallback: authenticated users could reach any Flask endpoint → FIXED
- **HIGH** Missing `/users/<id>/active` and `/organizations/<id>/active` Flask endpoints → FIXED
- **MEDIUM** `X-User-Id`/`X-Org-Id` header names look authoritative → FIXED (renamed)
- **LOW** Logout didn't invalidate Flask refresh token → FIXED
- **DEFERRED** AUD-001: audit trail gaps for create/update events — pre-production blocker
- **DEFERRED** PII-001: email visible in user list to all org members — pre-production blocker
- **DEFERRED** M2: `is_system_admin` not in NormalizedAuthUser — before enterprise multi-tenant
- **DEFERRED** L3: query-param `?token=` in `jwt_required` — before production

### Decision Changes
- Confirmed: backend must never trust `X-Client-*` advisory headers for auth decisions

### Backlog Changes
- AUD-001 added to pre-production backlog (audit trail for create/update)
- PII-001 added to pre-production backlog (email visibility restriction)
- L3 (query-param token removal) added to pre-production backlog

---

## 2026-04-24 — Round 020: Dangerous Actions + ConfirmAction Standard

### Files Changed
- `lib/platform/actions/` — **created** (types.ts, danger-level.ts, definitions.ts, index.ts — ADR-021 cross-platform standard)
- `lib/hooks/use-dangerous-action.ts` — **created** (ties PlatformAction to mutation with dialog state)
- `components/shared/confirm-action-dialog.tsx` — **hardened** (full DangerLevel support: badge, reason textarea, typed confirmation)
- `lib/api/users.ts` — **added** `setUserActive(id, isActive, reason)`
- `lib/api/organizations.ts` — **added** `setOrgActive(id, isActive, reason)`
- `app/(dashboard)/users/[id]/page.tsx` — **added** deactivate/reactivate buttons + ConfirmActionDialog
- `app/(dashboard)/organizations/[id]/page.tsx` — **added** deactivate/reactivate buttons + ConfirmActionDialog
- `lib/auth/options.ts` — **removed** `accessToken` from client session (XSS fix)
- `app/(auth)/login/page.tsx` — **fixed** open redirect on callbackUrl
- `app/api/proxy/[...path]/route.ts` — **fixed** catch block topology leak

### New Findings
- `accessToken` in session.user = XSS/extension exfiltration risk → removed
- `callbackUrl` query param not validated → open redirect → fixed
- Proxy catch block leaked error messages with internal URLs → stripped
- `useCountUp` in `.map()` = React hooks violation → extracted component
- Unstable `reset` function caused infinite render loop → wrapped in `useCallback`

### Decision Changes
- ADR-021: Dangerous Action Standard adopted (`DangerLevel` scale, `useDangerousAction`, `ConfirmActionDialog`)

### Backlog Changes
- Deactivate/reactivate user and org promoted from backlog to done

---

## 2026-04-24 — Round 019: Organizations Phase B + Admin Mutation Standard

### Files Changed
- `apps/admin/org_api_routes.py` — **hardened** (IntegrityError handling, slug regex, name length, no raw exc leak)
- `lib/modules/organizations/schemas.ts` — **created** (createOrgSchema + editOrgSchema)
- `lib/api/organizations.ts` — **updated** (CreateOrgInput/EditOrgInput from schemas)
- `components/modules/organizations/organization-form.tsx` — **created** (OrgCreateSheet + OrgEditSheet)
- `app/(dashboard)/organizations/page.tsx` — **updated** (add create button + OrgCreateSheet)
- `app/(dashboard)/organizations/[id]/page.tsx` — **updated** (add edit button + OrgEditSheet)
- `docs/modules/02-organizations/IMPLEMENTATION.md` — **rewritten** (Phase B complete)
- `docs/modules/02-organizations/module.manifest.json` — **updated** (v1.1.0, Phase B features)

### New Findings
- Backend POST/PATCH were already implemented in R013 — only hardening needed
- Slug auto-generation (client-side only) is idiomatic for org creation UX
- Slug must be immutable after creation — no `slug` field in PATCH, edit form shows it read-only
- `OrgCreateSheet` + `OrgEditSheet` pattern validates the R017 mutation standard on a second multi-tenant module
- `is_active` toggle in edit form is safe UX; dedicated deactivation action with `ConfirmActionDialog` is backlog

### Decision Changes
- No new ADRs — pattern confirms ADR-019 (usePlatformMutation) is reusable across multi-tenant modules

### Backlog Changes
- Organizations: create/edit marked ✅; deactivate-with-confirm + org-members-list remain backlog

---

## 2026-04-24 — Round 018: Roles & Permissions Core Module

### Files Changed
- `apps/authentication/role_api_routes.py` — **created** (platformengineer; 6 endpoints)
- `apps/__init__.py` — **updated** (role_api_bp registration)
- `lib/modules/roles/types.ts` — **created**
- `lib/modules/roles/schemas.ts` — **created**
- `lib/api/roles.ts` — **created**
- `lib/api/query-keys.ts` — **updated** (roles keys)
- `components/modules/roles/role-permission-badge.tsx` — **created**
- `components/modules/roles/roles-table.tsx` — **created**
- `components/modules/roles/role-form.tsx` — **created** (RoleCreateSheet + RoleEditSheet + PermissionChecklist)
- `app/(dashboard)/roles/page.tsx` — **created**
- `app/(dashboard)/roles/[id]/page.tsx` — **created**
- `app/api/proxy/[...path]/route.ts` — **updated** (roles PATH_MAP)
- `docs/modules/03-roles-permissions/PLAN.md` — **updated** (actual implementation)
- `docs/modules/03-roles-permissions/IMPLEMENTATION.md` — **created**
- `docs/modules/03-roles-permissions/module.manifest.json` — **created**

### New Findings
- Roles are GLOBAL (no org_id) — shared across all organizations
- Flask routing order matters: static routes (`/permissions`) must precede param routes (`/<int:id>`)
- Two-mutation edit strategy: PATCH meta first, PATCH permissions only if set changed
- Permission dot-notation (`module.action`) enables client-side grouping via `groupPermissions()`
- All shared capabilities (PageShell, PlatformForm, usePlatformMutation, DataTable, DetailView) reused without modification

### Decision Changes
- Permission model standard: codenames use `module.action` dot-notation; `groupPermissions()` is the client-side splitter

### Backlog Changes
- Roles module backlog: delete-role, role-users-list-tab, permission-create-ui, bulk-role-assign, e2e-tests

---

## 2026-04-24 — Round 017: Users Phase B — Mutations + Form Standard

### Files Changed (platform-ui — commit 2592dde)
- `lib/hooks/use-platform-mutation.ts` — **created** (shared TanStack mutation hook, error normalization, cache invalidation)
- `lib/modules/users/schemas.ts` — **created** (createUserSchema, editUserSchema, Zod v4)
- `lib/modules/users/types.ts` — **updated** (RoleSummary, RolesListResponse, UserMutationResponse, role_id added)
- `lib/api/users.ts` — **updated** (createUser, updateUser, fetchRoles)
- `components/modules/users/user-form.tsx` — **created** (UserCreateSheet, UserEditSheet)
- `app/api/proxy/[...path]/route.ts` — **updated** (PATCH handler added)
- `app/(dashboard)/users/page.tsx` — **updated** ("הוסף משתמש" button + UserCreateSheet)
- `app/(dashboard)/users/[id]/page.tsx` — **updated** ("ערוך" button + UserEditSheet)

### Files Changed (platformengineer — commit a1780f1c)
- `apps/authentication/user_api_routes.py` — **updated**
  - `GET  /api/users/roles` — role dropdown (admin only)
  - `POST /api/users` — create user (admin; org_id from JWT)
  - `PATCH /api/users/<id>` — update user fields (admin or own name)
  - `role_id` added to `_serialize_user_summary` for edit form pre-population

### Mutation Standard Established
| Component | Role |
|-----------|------|
| `usePlatformMutation` | Wraps `useMutation`, normalizes errors, invalidates query cache |
| `PlatformForm` | `<form>` shell with aria-busy + isSubmitting |
| `FormError` | Displays serverError string below form header |
| `FormActions` | Submit + Cancel buttons with loading state |
| `lib/modules/<m>/schemas.ts` | Zod schema + inferred input types |
| `lib/api/<m>.ts` | Mutation API functions (`createX`, `updateX`) |

### Decision Changes
- ADR-019 established (see 14-decision-log.md): usePlatformMutation as the org-wide mutation standard

### Backlog Changes
- Users Phase B ✅ complete
- PlatformForm capability ✅ complete (§03 in catalog)
- PlatformAction 🔵 partial (§04 — usePlatformMutation done; ConfirmDialog pending)

---

## 2026-04-24 — Round 016: CP-0 Boundary Extraction

### Files Changed
- `lib/platform/index.ts` — **created** (root barrel, all platform exports)
- `lib/platform/auth/types.ts` + `index.ts` — **created** (NormalizedAuthUser, FlaskUserPayload — no next-auth)
- `lib/platform/permissions/rbac.ts` + `index.ts` — **created** (pure RBAC functions)
- `lib/platform/formatting/format.ts` + `index.ts` — **created** (pure Intl.* formatters)
- `lib/platform/export/csv.ts` + `index.ts` — **created** (rowsToCsv, escapeCsvCell — no Blob)
- `lib/platform/request/context.ts` + `index.ts` — **created** (buildAuditHeaders, generateRequestId)
- `lib/platform/data-grid/types.ts` + `index.ts` — **created** (SortDirection, TableFilter, PaginationParams, etc.)
- `lib/platform/modules/users/types.ts` — **created** (re-export of lib/modules/users/types)
- `lib/platform/modules/organizations/types.ts` — **created** (re-export)
- `lib/auth/types.ts` — **updated** (re-export platform types + next-auth augmentation only)
- `lib/auth/rbac.ts` — **updated** (re-export shim from lib/platform/permissions/rbac)
- `lib/utils/format.ts` — **updated** (re-export shim from lib/platform/formatting)
- `lib/utils/csv.ts` — **updated** (imports pure CSV from platform; keeps browser download layer)
- `lib/api/request-context.ts` — **updated** (re-export shim from lib/platform/request)
- `lib/api/client.ts` — **updated** (configurable base URL: NEXT_PUBLIC_API_BASE_URL ?? "/api/proxy")
- `docs/system-upgrade/14-decision-log.md` — **updated** (ADR-018: platform boundary)
- `docs/system-upgrade/28-cross-platform-structure-audit.md` — **updated** (CP-0 status, readiness 55→68/100)

### New Findings
- `lib/platform/` creates a clean, checkable boundary — any accidental DOM/next-auth import fails at typecheck time
- Re-export shim pattern is zero-risk: existing web imports continue to work unchanged
- `NEXT_PUBLIC_API_BASE_URL` env var enables future Electron or direct-connect mobile without code changes

### Decision Changes
- ADR-018: `lib/platform/*` = cross-platform only. `lib/` (non-platform) = web OK. All new cross-platform logic goes to platform/ first.

### Backlog Changes
- Marked done: CP-0 type extraction, lib/platform/ creation, rowsToCsv extraction, API base URL parameterization

---

## 2026-04-24 — Round 016 (prep): Cross-Platform Structure Audit

### Files Changed
- `docs/system-upgrade/28-cross-platform-structure-audit.md` — **created** (16 sections)
- `docs/system-upgrade/10-target-architecture.md` — **updated** (CP readiness block + blockers table)
- `docs/system-upgrade/12-migration-roadmap.md` — **updated** (Migration Principle #10: platform boundary)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (CP-0, CP-1, CP-2 task sections)

### New Findings
- `lib/auth/rbac.ts` is already cross-platform — zero changes needed
- `lib/utils/format.ts` uses only `Intl.*` — compatible with React Native 0.70+
- `lib/auth/types.ts` is the single biggest mobile blocker — next-auth augmentation mixed with user types
- `lib/api/client.ts` hardcodes `/api/proxy` — one-line fix unblocks Electron + native HTTP use
- `lib/utils/csv.ts` `rowsToCsv()` is portable; only `downloadCsv()` uses browser APIs — easy split
- Overall readiness 55/100: logic excellent, API transport problematic, shell intentionally web-only

### Decision Changes
- Migration Principle #10 added: new `lib/` files must be classified `lib/platform/` or `lib/web/`

### Backlog Changes
- Added CP-0 (type extraction), CP-1 (transport), CP-2 (component splitting) task sections

---

## 2026-04-24 — Round 015: Capability Hardening

### Files Changed
- `lib/ui/motion.ts` — **created** (shared PAGE_EASE constant)
- `components/shared/detail-view/` — **created** (InfoRow, BoolBadge, DetailSection, DetailHeaderCard, DetailBackButton, DetailLoadingSkeleton + index)
- `components/shared/stats/` — **created** (StatCard, StatsGrid + index)
- `components/shared/page-shell/` — **created** (PageShell + index)
- `components/shared/error-state.tsx` — **created**
- `components/shared/error-boundary.tsx` — **created**
- `components/shared/form/` — **created** (PlatformForm, FormActions, FormError + index)
- `components/shared/confirm-action-dialog.tsx` — **created**
- `app/(dashboard)/users/[id]/page.tsx` — **refactored** (removed local InfoRow/BoolBadge/ease/back button/loading/error)
- `app/(dashboard)/users/page.tsx` — **refactored** (replaced StatChip + LazyMotion header + inline error with PageShell + StatCard + ErrorState)
- `app/(dashboard)/organizations/[id]/page.tsx` — **refactored** (same as users detail page)
- `app/(dashboard)/organizations/page.tsx` — **refactored** (same as users list page)
- `docs/modules/02-organizations/IMPLEMENTATION.md` — **created**
- `docs/system-upgrade/14-decision-log.md` — **updated** (ADR-017 added)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (7 tasks marked done)
- `docs/system-upgrade/26-platform-capabilities-catalog.md` — **updated** (6 capability statuses updated)

### New Findings
- `InfoRow` + `BoolBadge` helpers were character-for-character identical in Users and Orgs detail pages — classic promotion case
- `PageShell` removes ~20 lines of boilerplate from every future module list page
- `DetailBackButton` subsumes `useRouter` — detail pages no longer need the router import for navigation
- `ConfirmActionDialog` uses `shadcn/ui Dialog` (not AlertDialog — not installed); this is the correct pattern

### Decision Changes
- ADR-017: Shared Capabilities Promotion Policy (2+ occurrences → promote to `components/shared/`)

### Backlog Changes
- Marked done: ErrorBoundary, ErrorState, PageShell, DetailView, StatCard, PlatformForm, ConfirmDialog

---

## 2026-04-24 — Round 014: Platform Capabilities Catalog

### Files Created (platform-ui)
- `docs/system-upgrade/26-platform-capabilities-catalog.md` — **created** (30 platform capabilities; 7 fields each: purpose, modules, libraries, first scope, security/multi-tenant, AI-maintainability, priority)

### Files Updated (platform-ui)
- `docs/system-upgrade/10-target-architecture.md` — **updated** (added capability-first AI principle; added Platform Capabilities Layer section with status table)
- `docs/system-upgrade/12-migration-roadmap.md` — **updated** (added migration principle #9: capability-first)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (new "Platform Capabilities Catalog" section: 25 tasks across now/next/later tiers)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 014 entry)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### Capability Status Snapshot (as of Round 014)
| Status | Capabilities |
|--------|-------------|
| ✅ Implemented | DataGrid (01), PermissionGate (05), TenantContext (19), API Client (22) |
| 🔵 Partial | Dashboard (02), ImportExport CSV (06), DetailView (08), ModuleRegistry (18) |
| ⬜ Pending Now | ErrorBoundary (21), PageShell (07), Form (03), Action (04), FeatureFlags (17), Notifications (12) |
| ⬜ Pending Next | Timeline (09), ApprovalFlow (13), Settings (16), Realtime (11+23), JobRunner (14), Wizard (15), Billing (26), Policy (27) |
| ⬜ Pending Later | AuditLog (10), FileManager (24), Integration (25), Privacy (20), Help (28), TestHarness (29), DevDocs (30) |

### New Rules Added
- Capability-First Rule: check `26-platform-capabilities-catalog.md` before building any module feature (added to doc 10 §AI Principles, doc 12 §Migration Principles)
- Module-local implementations used in 2+ modules must be promoted to the catalog

---

## 2026-04-24 — Round 013: Module 02 Organizations

### Files Created (platformengineer)
- `apps/admin/org_api_routes.py` — **created** (Flask JWT blueprint: list/stats/detail/create/update; tenant safety enforced)

### Files Updated (platformengineer)
- `apps/__init__.py` — **updated** (registered `org_api_bp` at `/api/organizations`)

### Files Created (platform-ui)
- `lib/modules/organizations/types.ts` — **created** (OrgSummary, OrgsListResponse, OrgDetailResponse, OrgStatsResponse, CreateOrgResponse, payload types)
- `lib/api/organizations.ts` — **created** (fetchOrgs, fetchOrgStats, fetchOrg, createOrg, updateOrg)
- `components/modules/organizations/org-status-badge.tsx` — **created** (active/inactive badge)
- `components/modules/organizations/orgs-table.tsx` — **created** (uses shared DataTable, defines org columns)
- `app/(dashboard)/organizations/page.tsx` — **created** (list page, system-admin gate via PermissionGate, stats chips)
- `app/(dashboard)/organizations/[id]/page.tsx` — **created** (detail page, own-org or system-admin, formatted fields)
- `docs/modules/02-organizations/module.manifest.json` — **created**

### Files Updated (platform-ui)
- `app/api/proxy/[...path]/route.ts` — **updated** (added `"organizations": "/api/organizations"`)
- `lib/api/query-keys.ts` — **updated** (added `orgs` key group)
- `docs/modules/02-organizations/PLAN.md` — **updated** (DoD: 9 items marked complete)

### Files Deleted (platform-ui)
- `components/shared/data-table-client.tsx` — **deleted** (unused legacy; confirmed no imports)

### New Findings
- `Organization` model in `apps/authentication/models.py` only has `id` column — full org data requires raw SQL (already done in existing admin routes)
- `PermissionGate systemAdminOnly` pattern validated end-to-end

### Capability Reuse Summary (ADR-016 validation)
- `DataTable<OrgSummary>` — used ✓
- `PermissionGate systemAdminOnly` — used ✓
- `formatDate` from lib/utils/format — used ✓
- `OrgStatusBadge` — created following UserStatusBadge pattern ✓

### TypeScript Typecheck
EXIT 0

---

## 2026-04-24 — Round 012: Capability Layer Foundation

### Files Created (platform-ui)
- `components/shared/data-table/types.ts` — **created** (DataTableProps, PaginationState interfaces)
- `components/shared/data-table/table-skeleton.tsx` — **created** (animated skeleton rows for loading state)
- `components/shared/data-table/pagination.tsx` — **created** (RTL-aware prev/next pagination with page indicator)
- `components/shared/data-table/data-table.tsx` — **created** (generic server-side DataTable wrapping TanStack Table)
- `components/shared/data-table/index.ts` — **created** (barrel exports)
- `components/shared/permission-gate.tsx` — **created** (role/permission/adminOnly gate with hide/disable modes)
- `lib/hooks/use-permission.ts` — **created** (session-aware isRole/can/isAdmin helpers)
- `lib/utils/format.ts` — **created** (formatDate, formatDateTime, formatRelativeTime, formatNumber, formatCurrency, formatBytes — he-IL locale, Asia/Jerusalem TZ)
- `lib/utils/csv.ts` — **created** (rowsToCsv, downloadCsv, exportToCsv with BOM for Hebrew Excel compat)
- `lib/api/request-context.ts` — **created** (buildAuditHeaders, generateRequestId)

### Files Updated (platform-ui)
- `components/shared/data-table.tsx` → **renamed** to `components/shared/data-table-client.tsx` (client-side legacy table; avoid directory name collision)
- `components/modules/users/users-table.tsx` — **refactored** (delegates table shell to shared DataTable; uses formatDate from lib/utils/format; reduced from 241 to ~120 lines)
- `app/api/proxy/[...path]/route.ts` — **updated** (attaches X-Request-ID, X-User-Id, X-Org-Id, X-Client-Source audit headers)
- `docs/modules/02-organizations/PLAN.md` — **updated** (full endpoint audit: all routes use session cookie auth, not JWT; ADR-015 pattern required; capability layer alignment section added)
- `docs/system-upgrade/25-open-source-capability-layer.md` — **updated** (implementation status updated, DataTable reference path corrected)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (10 tasks marked done, 2 new tasks added)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 012 entry)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### New Findings
- `components/shared/data-table.tsx` existed (client-side only, no TanStack) — renamed to avoid name conflict
- `components/shared/empty-state.tsx` existed and was already good — no changes needed
- Organizations endpoints all use `_require_admin()` (Flask-Login session) — ADR-015 pattern required again
- JWT token in proxy is `token.user.id` / `token.user.org_id` (not flat `token.userId`)

### Decision Changes
- None new — implements ADR-016

### Backlog Changes
- 10 capability layer tasks marked `[x] 2026-04-24`
- 2 new tasks added: request-context helper, UsersTable refactor

---

## 2026-04-24 — Round 011: Open-Source Capability Layer

### Files Changed (platform-ui)
- `docs/system-upgrade/25-open-source-capability-layer.md` — **created** (18 sections: DataGrid, charts, forms, URL state, import/export, permissions, multi-tenant safety, audit mutations, dashboard layout, dates, toasts, skeletons, empty states, RTL conventions, file gates, install order, what NOT to add, ADR reference)
- `docs/system-upgrade/14-decision-log.md` — **updated** (ADR-016: Open-Source Capability Layer)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (new section: 14 capability layer tasks — install nuqs, shared components, PermissionGate, date utils, CSV export, proxy audit headers)
- `docs/system-upgrade/11-recommended-tech-stack.md` — **updated** (capability layer standards block with approved additions list)
- `docs/system-upgrade/12-migration-roadmap.md` — **updated** (Phase 1: capability layer foundation added as first deliverable)
- `docs/modules/ROADMAP.md` — **updated** (module start checklist: step 3 now requires reading capability layer doc; module file structure expanded)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 011 entry, upcoming rounds updated)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### New Findings
- BOM (`\uFEFF`) required for Hebrew CSV export (Excel on Windows misreads UTF-8 without it)
- `nuqs` not yet installed — blocks all list page filter/pagination URL state
- `PermissionGate` + `usePermission()` missing — must be created before any module with destructive actions
- `react-grid-layout` correctly deferred to Phase 3 (no dashboard builder until Monitoring module)
- `org_id` safety rule formalized: always from `session.user.org_id`, never URL params

### Decision Changes
- ADR-016 added: Open-Source Capability Layer — standardizes library choices for all 19 modules

### Backlog Changes
- Added "Open-Source Capability Layer" section to `15-action-backlog.md` (14 new P1/P2 tasks)

---

## 2026-04-24 — Round 010: Module 01 Users (First Module)

### Files Changed (platformengineer)
- `apps/authentication/user_api_routes.py` — **created** (JWT user management API: list, stats, pending, detail, approve)
- `apps/__init__.py` — **updated** (register user_api_bp at /api/users)

### Files Changed (platform-ui)
- `lib/modules/users/types.ts` — **created** (UserSummary, UserDetail, response envelopes, UsersListParams)
- `lib/api/users.ts` — **created** (fetchUsers, fetchUser, fetchUserStats, fetchPendingUsers, approveUser)
- `lib/api/query-keys.ts` — **updated** (users.all/stats/list/detail/pending keys)
- `lib/auth/options.ts` — **updated** (remove is_admin role-name workaround; Round 009 fix applied)
- `app/api/proxy/[...path]/route.ts` — **updated** (users PATH_MAP: /admin/users → /api/users)
- `app/(dashboard)/users/page.tsx` — **created** (list page: stats, pending banner, search, paginated table, error/empty states)
- `app/(dashboard)/users/[id]/page.tsx` — **created** (detail page: profile, security, permissions)
- `components/modules/users/users-table.tsx` — **created** (TanStack Table with pagination, search, skeleton)
- `components/modules/users/user-status-badge.tsx` — **created** (active/inactive/pending badge)
- `components/modules/users/user-role-badge.tsx` — **created** (colored role badge)
- `docs/modules/01-users/IMPLEMENTATION.md` — **created** (data flow, file map, limitations, agent guide, checklist)
- `docs/modules/01-users/module.manifest.json` — **created** (routes, permissions, endpoints, data ownership)
- `docs/modules/01-users/PLAN.md` — **updated** (actual endpoints, DoD status)
- `docs/modules/ROADMAP.md` — **updated** (Users: ⬜ → 🔵)
- `docs/auth/README.md` — **updated** (resolved Round 009 gaps)
- `docs/system-upgrade/14-decision-log.md` — **updated** (ADR-015 added)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 010 entry)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### New Findings
- `/admin/users` routes are HTML-only (Jinja2) — cannot be used from platform-ui
- `/api/v1/users` uses API Token auth, incompatible with JWT Bearer
- Module-first JSON API pattern needed for every module migration (ADR-015)
- AI agent users are now filtered from all list queries by default

### Decision Changes
- ADR-015 added: module-first JSON API pattern
- ADR-015 superceeds the PLAN.md assumption that `/admin/users` returns JSON

### Backlog Changes
- Users Phase 2: create form, edit form, pending approval page — added as Phase 2 items

---

## 2026-04-24 — Round 009: Backend Auth Contract Hardening

### Files Changed
- `apps/authentication/jwt_routes.py` — **updated** (`_user_to_dict` → `serialize_auth_user` with `permissions[]`, `is_admin`, `is_system_admin`, `is_manager`, `is_ai_agent`; `GET /api/auth/me` fixed with `@jwt_required` + correct response envelope; `POST /api/auth/logout` added)
- `apps/authentication/tests/test_jwt_routes_v2.py` — **created** (10 tests: serialize_auth_user × 4, /me × 3, /logout × 3)
- `apps/authentication/INDEX.md` — **updated** (JWT routes quick lookup expanded; platform-ui integration section added with field table + security rules)
- `docs/system-upgrade/13-open-questions.md` — **updated** (Q14 fully resolved — permissions now returned)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (Phase B all 4 tasks marked done; Phase B.1 follow-ups added: remove is_admin workaround from options.ts, update auth README)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 009 entry added; upcoming rounds updated)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### New Findings
- `apps/__init__.py` CORS `after_request` already matches `http://localhost*` — `localhost:3000` covered, no change needed
- Existing `/me` had two bugs: wrong JWT claim key (`sub` vs `user_id`) and non-standard response format
- `is_admin` is a real DB boolean column — `normalizeFlaskUser()` role-name derivation in `lib/auth/options.ts` can now be removed
- `mobile_refresh_token` stores SHA256 hash — logout can genuinely revoke refresh tokens (not just expiry-based)

### Decision Changes
- None new — Phase B tasks close out ADR-011 implementation

### Backlog Changes
- Phase B: 4 tasks → `[x] 2026-04-24`
- Phase B.1 added: remove is_admin workaround (P1), update auth README (P2)

---

## 2026-04-24 — Round 008: Module Data Export/Import Design

### Files Changed
- `docs/system-upgrade/24-core-platform-and-module-system.md` — **created** (14 sections: data ownership, dataContract spec, package format, export scopes, import modes, ID remapping, tenant mapping, security rules, 7 backend models, UI flows, AI-agent safety, risks, acceptance criteria)
- `docs/system-upgrade/10-target-architecture.md` — **updated** (Module Data Ownership section added before AI-Agent Design Principles)
- `docs/system-upgrade/12-migration-roadmap.md` — **updated** (Phase 3.5 Module Export/Import added)
- `docs/system-upgrade/14-decision-log.md` — **updated** (ADR-014 added)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (Module Data Export/Import section: 35 tasks across foundation, models, export pipeline, import pipeline, security, platform-ui)
- `docs/system-upgrade/13-open-questions.md` — **updated** (Q21–Q25 added: large tables, blob attachments, Celery queues, S3 setup, existing manifests)
- `docs/system-upgrade/97-source-of-truth.md` — **updated** (module system row added; ADR highest updated to ADR-014)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 008 entry added; upcoming rounds updated)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### New Findings
- Raw SQL dump is the anti-pattern to avoid — governed JSONL package is the correct model
- Three table categories (owned/referenced/core) must be declared per module before export is enabled
- Secrets must be excluded at the platform level (registry), not solely at the module level
- `replace-module-data` and `restore-snapshot` import modes are system-admin only
- Download link expiry policy: 24h tenant data, 7d config-only, 4h system-wide
- Q21–Q25 added: need to audit large tables (>100k rows), S3 setup, and existing manifests before implementation

### Decision Changes
- ADR-014 added: Tenant-Aware Module Data Export/Import

### Backlog Changes
- 35 new tasks added in §Module Data Export/Import section of `15-action-backlog.md`
- Covers: dataContract schema, secret registry, 7 backend models, JSONL export writer, ID remapping, dry-run validator, import transaction wrapper, anonymization, checksums, 5 platform-ui screens, 3 security tests

---

## 2026-04-24 — Round 007: Auth Phase A Implementation

### Files Created
- `lib/auth/types.ts` — Flask response types, NormalizedAuthUser, next-auth Session/JWT augmentation
- `lib/auth/options.ts` — authOptions: Credentials provider, jwt callback (with refresh), session callback
- `lib/auth/rbac.ts` — hasRole, hasAnyRole, hasPermission, isSystemAdmin, getOrgId
- `app/api/auth/[...nextauth]/route.ts` — NextAuth handler (thin, no logic)
- `components/providers/session-provider.tsx` — client SessionProvider wrapper
- `middleware.ts` — route guard: 401 for proxy, redirect for pages, RefreshTokenError handling
- `docs/auth/README.md` — auth flow diagram, session shape, proxy behavior, backend gaps, agent guide
- `.env.example` — NEXTAUTH_SECRET, NEXTAUTH_URL, FLASK_API_URL documented

### Files Updated
- `app/(auth)/login/page.tsx` — replaced fake setTimeout with `signIn("credentials")`, Hebrew error state
- `app/api/proxy/[...path]/route.ts` — Bearer token via `getToken()`, added PUT/DELETE handlers, expanded PATH_MAP
- `app/layout.tsx` — added NextAuthSessionProvider wrapper
- `docs/system-upgrade/15-action-backlog.md` — Phase A tasks all marked done
- `docs/system-upgrade/96-rounds-index.md` — Round 007 entry added

### New Findings
- `roles` in Flask JWT response is an array — `roles[0]` is the primary role
- `is_admin` not yet returned by `_user_to_dict()` — derived from role name (tracked: Q14 backlog)
- Typecheck passes (tsc --noEmit exit 0) after all auth files created
- No backend changes needed for Phase A (proxy is server-to-server, CORS not an issue)
- `expiresAt` must be tracked manually in Credentials provider (no `account.expires_at` for non-OAuth)

### Decision Changes
- None new — implements ADR-011 and ADR-012 as designed

### Backlog Changes
- Phase A auth tasks: all 10 marked `[x] 2026-04-24`
- Phase 0 "Wire real auth" marked done
- Phase 0 "Add Next.js middleware" marked done
- Remaining: Phase B (Flask additions) and Phase C (hardening)

---

## 2026-04-24 — Round 006: AI-Maintainability and Code Cleanup Policy

### Files Changed
- `docs/system-upgrade/23-ai-maintainability-and-code-cleanup.md` — **created** (15 sections, full cleanup policy)
- `docs/system-upgrade/08-technical-debt-register.md` — **updated** (3 new AI-maintainability debt items: missing INDEX.md, missing file headers, Vite app duplication, Jinja2 co-existence)
- `docs/system-upgrade/09-modernization-opportunities.md` — **updated** (QW-3 expanded from "Delete Dead Code" stub to full AI-maintainability foundations plan)
- `docs/system-upgrade/10-target-architecture.md` — **updated** (added principle 7 + AI-Agent Design Principles table)
- `docs/system-upgrade/12-migration-roadmap.md` — **updated** (added Migration Principles 6-8: cleanup-first, delete Jinja2 on parity, file size gate)
- `docs/system-upgrade/14-decision-log.md` — **updated** (ADR-013 added)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (Phase 0.5 AI-Maintainability section added: 10 tasks)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 006 entry added; upcoming rounds renumbered)
- `docs/system-upgrade/97-source-of-truth.md` — **updated** (AI-maintainability policy row added; ADR highest updated to ADR-013)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### New Findings
- `api_auth_OLD_BACKUP.py` confirmed dead — no imports found; safe to delete after grep-confirm
- No per-module `INDEX.md` exists in any `apps/<module>/` directory — AI agents read full module without orientation
- 4 Vite apps (`ai-agents-ui/`, `ala-ui/`, `ops-ui/`, `dyn-dt-ui/`) have no inventory of feature-vs-platform-ui parity — must scope before retirement
- Jinja2 templates have no tracked relationship to their `render_template` callers — retirement order undefined
- `run.py` is 15KB god-file — primary driver of incorrect agent module attribution
- 39 Alembic parallel heads are intentional — must NOT be consolidated (documented in MEMORY.md)
- File size limits are undefined in current CLAUDE.md — agents generate unbounded files

### Decision Changes
- ADR-013 added: AI-maintainable codebase and cleanup-first modernization

### Backlog Changes
- Phase 0.5 AI-Maintainability section added to `15-action-backlog.md`: 10 tasks covering dead-code sweep, INDEX.md template, file header standard, oversized file list, platform-ui knip scan, Vite app inventory, Jinja2 template inventory

---

## 2026-04-24 — Round 005: Authentication Bridge

### Files Changed
- `docs/system-upgrade/16-auth-bridge-design.md` — **created** (auth bridge design, 15 sections)
- `docs/system-upgrade/14-decision-log.md` — **updated** (ADR-011, ADR-012 added)
- `docs/system-upgrade/13-open-questions.md` — **updated** (Q1/Q2 resolved; Q13/Q14/Q15 added)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (Phase A/B/C auth tasks added; old tasks marked done)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 005 entry added)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### New Findings
- Flask has two auth systems: Flask-Login (session) + JWT (`/api/auth/login` for mobile). Platform-ui will use JWT.
- `POST /api/auth/login` returns `{data: {token, refresh_token, user: {id,email,org_id,roles}}}` — clean contract.
- `POST /api/auth/refresh` exists — rotation-based (7-day opaque token, SHA256-hashed in DB).
- `next-auth` v4 is installed but not configured. Login page is a stub (no API call).
- No `middleware.ts` — dashboard routes are publicly accessible.
- CSRF auto-check is disabled Flask-side — no CSRF header needed for platform-ui.
- Flask CORS allows only Flutter/localhost ports, not `localhost:3000` — must fix for dev.
- `SESSION_COOKIE_SECURE` not set in Flask production config — security gap.
- RBAC: `@role_required` / `@permission_required` in `rbac.py`. `is_admin=True` bypasses all.
- `_user_to_dict()` in `jwt_routes.py` does NOT include `permissions[]`, only `roles[]`.
- MFA: TOTP session-based. JSON behavior for MFA users is unresolved (Q13).

### Decision Changes
- ADR-011 added: next-auth Credentials + Flask JWT is the chosen auth bridge
- ADR-012 added: No CSRF token required for platform-ui API calls

### Backlog Changes
- Phase A (Next.js side): 8 tasks added — next-auth handler, options, types, SessionProvider, login page, middleware, proxy Bearer header, env vars
- Phase B (Flask side): 4 tasks added — logout endpoint, /me endpoint, CORS, permissions in JWT response
- Phase C (Hardening): 4 tasks added — SSM secret, role nav, E2E test, Flask cookie security
- Previous Phase 0 tasks updated: proxy route marked done, Q1/Q4 marked done

---

## 2026-04-24 — Round 004: Deep Upgrade Planning

### Files Changed
- `docs/UPGRADE_ROADMAP.md` — **created** (287 lines, 5 tiers, 10 quick wins, dependency order, risk register)
- `docs/system-upgrade/96-rounds-index.md` — **created**
- `docs/system-upgrade/97-source-of-truth.md` — **created**
- `docs/system-upgrade/98-change-log.md` — **created** (this file)

### New Findings
- Recharts 3 already installed — covers all chart types except topology (`@xyflow/react`) and drag layout (`@dnd-kit`)
- React Compiler (babel-plugin) is safe to enable incrementally on `lib/` directory
- RSC migration of dashboard stat fetches cuts estimated TTFB by ~400ms
- SSE hook is the single most reusable infrastructure investment — drives tickets, logs, metrics, presence
- Storybook 9 must use `@storybook/nextjs` (not Vite) due to Tailwind v4 PostCSS pipeline
- `nuqs` v2 is the right tool for URL-driven DataTable and chart state in Next.js App Router
- Flask SSE endpoint does not yet exist — SSE hook must mock first, then wire incrementally

### Decision Changes
- ADR-008 proposed: `nuqs` for URL-driven chart/table state
- ADR-009 proposed: SSE over WebSocket for all read-only real-time paths (simpler, no socket library)
- ADR-010 proposed: OpenAPI codegen replaces hand-written `lib/api/types.ts`

### Backlog Changes
- Added 10 quick-win tasks (all ≤1 day) to `docs/UPGRADE_ROADMAP.md §7`
- Tier ordering established: DX (Tier 4) must precede AI-native UX (Tier 1) in implementation

---

## 2026-04-24 — Round 003: Module Mapping & Roadmap

### Files Changed
- `docs/modules/ROADMAP.md` — **created** (priority table, dependency graph, 19 modules)
- `docs/modules/01-users/PLAN.md` through `19-backups/PLAN.md` — **created** (all 19)
- `components/shell/nav-items.ts` — **updated** (8 groups, all 19 routes, correct hrefs, missing icons added)

### New Findings
- All 19 modules have verified Flask endpoints (grep'd from `routes.py` files)
- 6 new proxy prefixes needed: `helpdesk:/helpdesk`, `ai-agents:/ai-agents`, `ala:/api/ala/v1`, `rag:/api/rag`, `billing:/api/billing`, `automation:/automation`
- Helpdesk is largest module (4 days): tickets, SLA, KB, technicians, approval queue, timeline
- Billing has unusually rich API: balance, history, dashboard charts, usage breakdown, rates CRUD
- Knowledge/RAG split: `/api/rag` (REST API) vs `/admin/rag` (UI-backing pages)
- nav-items.ts had wrong hrefs: `/orgs` → `/organizations`, `/health` → `/monitoring`, `/agents` → `/ai-agents`
- Automation (`/automation`) and Integrations (`/integrations`) were missing from nav entirely

### Decision Changes
- ADR-007 proposed: One `PLAN.md` per module as the single implementation spec for that module
- Settings restructured: moved to its own nav group; integrations moved out of settings to standalone

### Backlog Changes
- All 19 module plans now have explicit Definition of Done checklists
- Critical path clarified: Users (01) → Roles (03) → Helpdesk (04) is the dependency chain

---

## 2026-04-23 — Round 002: Shell & Dashboard Build

### Files Changed
- `CLAUDE.md` — **full rewrite** (proxy pattern, useQuery pattern, keyboard shortcuts, sidebar rules, DoD checklist, file structure map)
- `docs/design/COMPONENTS.md` — **updated** (added TiltCard, CursorGlow, EmptyState, Skeleton, DataTable, ConnectionIndicator, SidebarSearch patterns; 8 new anti-patterns)
- `docs/ARCHITECTURE.md` — **updated** (§18 RTL, §19 AI Dashboard, §20 Real-time added; total 833 lines)
- `components/shell/app-sidebar.tsx` — **full rewrite** (search, pinned, recent, collapsible, motion)
- `components/shell/sidebar-search.tsx` — **created**
- `lib/hooks/use-nav-history.ts` — **created** (Zustand persist, recent + pinned)
- `app/api/proxy/[...path]/route.ts` — **created** (Flask proxy, cookie-forwarding, PATH_MAP)
- `lib/api/client.ts`, `types.ts`, `query-keys.ts` — **created**
- `components/shared/tilt-card.tsx`, `cursor-glow.tsx`, `empty-state.tsx`, `data-table.tsx`, `skeleton-card.tsx` — **created**
- `app/(dashboard)/page.tsx` — **rewritten** (real TanStack Query data, skeletons, service health)
- `public/manifest.json` — **created** (PWA, RTL, Hebrew)
- `public/icons/icon-192.png`, `icon-512.png` — **generated** via sharp

### New Findings
- `TableSkeleton` `style` prop error: `<Shimmer>` doesn't accept `style` → must use raw `div`
- `shadcn/ui` Table and Tooltip not auto-generated — must run `npx shadcn@latest add table tooltip`
- Next.js 16 route params are `Promise<{...}>` — must `await params` in catch-all proxy handler
- Flask `/api/ai-settings/stats` and `/admin/api/monitoring/health` both confirmed working
- RTL: `side="right"` on Sidebar, logical CSS properties throughout (`ps-/pe-`, `ms-/me-`)

### Decision Changes
- ADR-005 ratified: Skeleton on every async load state (standardised across all modules)
- ADR-006 ratified: `mounted` guard mandatory on all theme-dependent rendering

### Backlog Changes
- Phase 0 (stabilisation) tasks clarified: auth bridge is the next blocker after proxy is working
- `lib/api/query-keys.ts` centralisation rule added to `CLAUDE.md` anti-patterns

---

## 2026-04-23 — Round 001: Foundation Investigation

### Files Changed
- `docs/system-upgrade/00-executive-summary.md` — **created**
- `docs/system-upgrade/01-current-system-analysis.md` — **created**
- `docs/system-upgrade/02-product-needs-inferred.md` — **created**
- `docs/system-upgrade/03-technology-inventory.md` — **created**
- `docs/system-upgrade/04-architecture-assessment.md` — **created**
- `docs/system-upgrade/05-ui-ux-assessment.md` — **created**
- `docs/system-upgrade/06-security-assessment.md` — **created**
- `docs/system-upgrade/07-scalability-maintainability.md` — **created**
- `docs/system-upgrade/08-technical-debt-register.md` — **created**
- `docs/system-upgrade/09-modernization-opportunities.md` — **created**
- `docs/system-upgrade/10-target-architecture.md` — **created**
- `docs/system-upgrade/11-recommended-tech-stack.md` — **created**
- `docs/system-upgrade/12-migration-roadmap.md` — **created**
- `docs/system-upgrade/13-open-questions.md` — **created**
- `docs/system-upgrade/14-decision-log.md` — **created** (ADR-001 through ADR-004)
- `docs/system-upgrade/15-action-backlog.md` — **created**
- `docs/system-upgrade/README.md` — **created**

### New Findings
- System is production-deployed on EKS (not prototype) with real MSP customers
- 46+ Flask modules, multi-tenant by `org_id`, PostgreSQL + Redis + Celery
- Auth is dual: Flask-Login (session cookie) + JWT — contract with platform-ui TBD
- ALA Voice AI is a distinct subsystem at `/api/ala/v1` — Gemini Live, billing, transcripts
- Helpdesk has the most complex backend: approval workflows, SLA, device auth, AI sessions
- RBAC decorators exist but applied inconsistently across modules
- FreePBX/Asterisk/PSTN fully removed — voice is now WebRTC + STUNner + Gemini Live only

### Decision Changes
- ADR-001: Next.js App Router as primary frontend
- ADR-002: Flask proxy pattern via `/api/proxy/[...path]`
- ADR-003: TanStack Query v5 for all server state
- ADR-004: RTL-first with Tailwind v4 logical properties

### Backlog Changes
- Phase 0 backlog populated: auth bridge, proxy route, route guards, error boundary
- 7 critical open questions added to `13-open-questions.md`
