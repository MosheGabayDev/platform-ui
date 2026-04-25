# 96 — Rounds Index

_Master index of every investigation round._
_Updated after each round — append, never overwrite entries._

---

## How to Use

1. Before starting a new round: read the latest entry to understand where we left off.
2. After completing a round: append a new entry here immediately.
3. Use the **Next Recommended Round** field to decide what to investigate next.

---

## Round 001 — Foundation Investigation

| Field | Value |
|-------|-------|
| **Date** | 2026-04-23 |
| **Topic** | Initial codebase investigation and architecture mapping |
| **Objective** | Understand the full platformengineer system before building platform-ui. Reverse-engineer what it does, what the architecture looks like, and what needs to be built. |
| **Key Findings** | • System is a production-deployed AI MSP platform (ResolveAI) on EKS <br>• 46+ Flask modules, PostgreSQL, Redis, Celery, Gemini Live, STUNner TURN <br>• Frontend is Jinja2 templates — no existing React/Next.js code <br>• Auth is Flask-Login + JWT (dual) — contract for platform-ui TBD <br>• Multi-tenant by `org_id` throughout — every API must scope by org <br>• Critical security finding: RBAC implemented via `@role_required` / `@permission_required` but not applied consistently <br>• Helpdesk is the most complex module (AI sessions, approval workflows, SLA) <br>• ALA (Voice AI) is a separate subsystem at `/api/ala/v1` with its own billing |
| **Files Updated** | `00` through `15` (all created fresh) |
| **Decisions Proposed** | ADR-001: Next.js App Router as primary frontend <br>ADR-002: Flask proxy pattern via `/api/proxy/[...path]` <br>ADR-003: TanStack Query v5 for all server state <br>ADR-004: RTL-first with Tailwind v4 logical properties |
| **Next Recommended Round** | Round 002: Authentication bridge — validate Flask auth contract, implement next-auth, test session |

---

## Round 002 — Shell & Dashboard Build

| Field | Value |
|-------|-------|
| **Date** | 2026-04-23 |
| **Topic** | Build platform-ui shell + connect to real Flask API |
| **Objective** | Ship working dashboard shell: aurora, sidebar, TanStack Query, real data from Flask proxy. |
| **Key Findings** | • Proxy route works with cookie forwarding + 8s timeout <br>• `fetchDashboardStats` → `/api/ai-settings/stats` returns real session/action/knowledge counts <br>• `fetchServiceHealth` → `/admin/api/monitoring/health` returns service array <br>• Sidebar needed full rewrite: search, pinned items, recent pages, collapsible groups <br>• PWA manifest required `dir: rtl`, `lang: he` <br>• `TableSkeleton` style prop error — fixed by replacing `<Shimmer>` with raw div <br>• shadcn Table + Tooltip components were missing — added via `npx shadcn@latest add` |
| **Files Updated** | `CLAUDE.md` (full rewrite), `docs/design/COMPONENTS.md` (added 8 patterns), `docs/ARCHITECTURE.md` (§18-20 RTL/AI/Realtime) |
| **Decisions Proposed** | ADR-005: Skeleton on every async load state (never spinner alone) <br>ADR-006: `mounted` guard mandatory on all theme-dependent rendering |
| **Next Recommended Round** | Round 003: Module planning — map all 19 modules to Flask endpoints |

---

## Round 003 — Module Mapping & Roadmap

| Field | Value |
|-------|-------|
| **Date** | 2026-04-24 |
| **Topic** | Create PLAN.md for all 19 modules |
| **Objective** | For every planned module: identify Flask endpoints, define TypeScript types, specify pages/routes, list required components, note dependencies. |
| **Key Findings** | • All 19 modules have known Flask endpoints (verified from routes.py files) <br>• Proxy prefix mapping needed for 6 new blueprints: helpdesk, ai-agents, ala, rag, billing, ai-providers, automation, integrations <br>• Helpdesk is largest module (4 est. days) — tickets, SLA, KB, technicians, approval queue <br>• Automation blueprint at `/automation` is fully CRUD (tasks, servers, commands, executions) <br>• Billing at `/api/billing` has rich data: balance, history, dashboard, usage, rates <br>• Knowledge/RAG split: `/api/rag` (API) + `/admin/rag` (UI-backing) <br>• nav-items.ts updated: 8 groups, all 19 module routes, correct hrefs |
| **Files Updated** | `docs/modules/ROADMAP.md`, `docs/modules/01-19/PLAN.md` (all 19), `components/shell/nav-items.ts` |
| **Decisions Proposed** | ADR-007: One PLAN.md per module as the single source for that module's implementation spec |
| **Next Recommended Round** | Round 004: Authentication — implement next-auth, middleware, session-based RBAC |

---

## Round 004 — Deep Upgrade Planning

| Field | Value |
|-------|-------|
| **Date** | 2026-04-24 |
| **Topic** | Full upgrade roadmap across 5 tiers |
| **Objective** | Research and plan all non-module upgrades: AI-native UX, real-time, advanced visualization, DX, performance. |
| **Key Findings** | • Recharts 3 already installed — no new charting library needed except `@xyflow/react` for topology <br>• React Compiler (babel-plugin) safe to enable on `lib/` first <br>• RSC migration of dashboard stats cuts TTFB ~400ms <br>• SSE hook is the single biggest infrastructure investment — reused by 4 modules <br>• 10 quick wins identified, all ≤1 day, zero new libraries for first 4 <br>• Storybook 9 must use `@storybook/nextjs` not Vite (Tailwind v4 compatibility) |
| **Files Updated** | `docs/UPGRADE_ROADMAP.md` (created, 287 lines) |
| **Decisions Proposed** | ADR-008: `nuqs` for URL-driven chart/table state <br>ADR-009: SSE over WebSocket for all read-only real-time paths <br>ADR-010: OpenAPI codegen replaces hand-written `lib/api/types.ts` |
| **Next Recommended Round** | Round 005: Authentication implementation — the one true blocker for all module builds |

---

## Round 005 — Authentication Bridge

| Field | Value |
|-------|-------|
| **Date** | 2026-04-24 |
| **Topic** | Auth bridge design — next-auth + Flask JWT |
| **Objective** | Answer all auth questions from codebase investigation. Design the complete auth bridge. Unblock all module development. |
| **Key Findings** | • Flask has TWO auth systems: Flask-Login (session cookie) + JWT (`/api/auth/login`, mobile). Platform-ui uses JWT. <br>• `POST /api/auth/login` returns `{data: {token, refresh_token, user: {id,email,org_id,roles}}}` — clean JSON contract. <br>• `POST /api/auth/refresh` exists in `jwt_routes.py` — rotation-based refresh. <br>• JWT expiry: 15-min access, 7-day refresh. <br>• `next-auth` v4 already in `package.json` — NOT yet configured. Login page is a stub. <br>• No `middleware.ts` — all dashboard routes publicly accessible. <br>• CSRF auto-check disabled Flask-side (`WTF_CSRF_CHECK_DEFAULT=False`) — no CSRF needed for API calls. <br>• Flask CORS allows only localhost Flutter ports, NOT `localhost:3000` — must add for dev. <br>• `Session_COOKIE_SECURE` not set — production security gap. <br>• RBAC via `@role_required`, `@permission_required` in `rbac.py`. Admins bypass all checks. <br>• `MFA`: TOTP-based, session-based (`pending_user_id`) — may redirect instead of returning JSON for MFA users (Q13 unresolved). |
| **Files Updated** | `16-auth-bridge-design.md` (created), `14-decision-log.md` (ADR-011, ADR-012), `13-open-questions.md` (Q1/Q2 resolved, Q13-15 added), `15-action-backlog.md` (Phase A/B/C tasks added), `96-rounds-index.md`, `98-change-log.md` |
| **Decisions Proposed** | ADR-011: next-auth Credentials + Flask JWT (Option C) <br>ADR-012: No CSRF token needed for platform-ui API calls |
| **Next Recommended Round** | Round 006: Implement Phase A auth (next-auth config, login, middleware, proxy update) — confirm working in TEST |

---

## Round 006 — AI-Maintainability and Code Cleanup Policy

| Field | Value |
|-------|-------|
| **Date** | 2026-04-24 |
| **Topic** | AI-maintainability as a first-class architectural goal |
| **Objective** | Define the complete cleanup strategy — dead code, file size limits, module INDEX.md, Jinja2 retirement, Vite app consolidation — so that AI coding assistants produce reliably correct changes throughout the 19-module migration. |
| **Key Findings** | • `api_auth_OLD_BACKUP.py` confirmed dead — safe to delete after grep-confirm <br>• 4 Vite apps have no inventory of what they do vs platform-ui — scoping needed before retirement <br>• No per-module INDEX.md exists in `apps/` — agent navigates by reading every file <br>• No file size enforcement — `run.py` is 15KB god-file <br>• Jinja2 templates not yet tracked against their Flask callers — retirement order undefined <br>• 39 Alembic parallel heads intentional — must NOT consolidate (documented in MEMORY.md) |
| **Files Updated** | `23-ai-maintainability-and-code-cleanup.md` (created), `08-technical-debt-register.md`, `09-modernization-opportunities.md`, `10-target-architecture.md`, `12-migration-roadmap.md`, `14-decision-log.md` (ADR-013), `15-action-backlog.md`, `96-rounds-index.md`, `97-source-of-truth.md`, `98-change-log.md` |
| **Decisions Proposed** | ADR-013: AI-maintainable codebase and cleanup-first modernization |
| **Next Recommended Round** | Round 007: Implement Phase A auth (next-auth config, login, middleware, proxy update) — confirm working in TEST |

---

## Round 007 — Auth Phase A Implementation (Next.js)

| Field | Value |
|-------|-------|
| **Date** | 2026-04-24 |
| **Topic** | Authentication bridge Phase A — Next.js implementation |
| **Objective** | Implement the minimum viable auth layer in platform-ui: next-auth handler, options, types, RBAC helpers, login page, middleware, proxy Bearer token, session provider, env docs, auth README. |
| **Key Findings** | • next-auth v4 `authorize` callback returns `null` on any failure — all Flask errors safely normalized <br>• Flask `POST /api/auth/login` returns `{data: {token, refresh_token, user: {id,email,org_id,roles}}}` — contract confirmed <br>• `roles` is an array; `is_admin` not yet in JWT response — derived from role name for now <br>• TypeScript typecheck passes (exit 0) after all auth files created <br>• `refreshToken` correctly excluded from client-visible session — stored only in server-side JWT cookie <br>• Middleware handles two behaviors: 401 JSON for `/api/proxy/*`, redirect for pages <br>• `expiresAt` tracked manually since Credentials provider has no `account.expires_at` <br>• No backend changes required for Phase A (proxy is server-to-server, no CORS issue) |
| **Files Created** | `lib/auth/types.ts`, `lib/auth/options.ts`, `lib/auth/rbac.ts`, `app/api/auth/[...nextauth]/route.ts`, `components/providers/session-provider.tsx`, `middleware.ts`, `docs/auth/README.md`, `.env.example` |
| **Files Updated** | `app/(auth)/login/page.tsx`, `app/api/proxy/[...path]/route.ts`, `app/layout.tsx`, `15-action-backlog.md` |
| **Decisions Proposed** | None new — implements ADR-011 (auth bridge) and ADR-012 (no CSRF) |
| **Next Recommended Round** | Round 008: Phase B Flask additions — `POST /api/auth/logout`, `GET /api/auth/me`, CORS `localhost:3000` |

---

## Round 008 — Module Data Export/Import Design

| Field | Value |
|-------|-------|
| **Date** | 2026-04-24 |
| **Topic** | Tenant-aware module data export/import architecture |
| **Objective** | Design a safe, governed module data package system for moving tenant data between environments. Owned/referenced/core table classification, JSONL package format, dry-run import, ID remapping, PII/secret handling, audit trail, backend models, UI flows. |
| **Key Findings** | • Raw SQL dump is never acceptable — export must be governed, versioned, tenant-scoped <br>• Three table categories: owned (exportable), referenced (export key only), core (remap only) <br>• JSONL chosen over CSV/Parquet for Phase 1 — streaming-friendly, schema-preserving <br>• Dry-run is mandatory before any write — enforced at pipeline level, not UI level <br>• Secrets must be excluded at platform level (registry), not module-declared only <br>• Cross-tenant imports require `is_system_admin` — cannot be delegated to org-admin <br>• 6 new backend models needed: ExportJob, ImportJob, DataContract, ExportFile, ValidationResult, RowError, AuditEvent <br>• `replace-module-data` and `restore-snapshot` modes are system-admin only — highest risk <br>• Download link expiry: 24h for tenant data, 7d for config-only, 4h for system-wide <br>• Q21–Q25 added: need large table size audit, S3 setup, existing manifest check |
| **Files Created** | `24-core-platform-and-module-system.md` (14 sections, 400+ lines) |
| **Files Updated** | `10-target-architecture.md`, `12-migration-roadmap.md`, `14-decision-log.md` (ADR-014), `15-action-backlog.md` (35+ tasks added), `13-open-questions.md` (Q21–Q25), `97-source-of-truth.md`, `96-rounds-index.md`, `98-change-log.md` |
| **Decisions Proposed** | ADR-014: Tenant-Aware Module Data Export/Import (accepted) |
| **Next Recommended Round** | Round 009: Auth Phase B Flask additions — `POST /api/auth/logout`, `GET /api/auth/me`, CORS `localhost:3000`, `permissions[]` in JWT response |

---

## Round 009 — Backend Auth Contract Hardening

| Field | Value |
|-------|-------|
| **Date** | 2026-04-24 |
| **Topic** | Flask backend auth additions for platform-ui |
| **Objective** | Implement the minimum backend contract required by platform-ui: fix /me, add /logout, expand user serializer with permissions + admin flags, write tests, update docs. |
| **Key Findings** | • Existing `GET /api/auth/me` was buggy: used `payload.get('sub')` (JWT uses `user_id`), wrong response format, no `@jwt_required` decorator <br>• `POST /api/auth/logout` did not exist — `mobile_refresh_token` field exists for real revocation <br>• `_user_to_dict()` missing: `permissions[]`, `is_admin`, `is_system_admin`, `is_manager`, `is_ai_agent` <br>• CORS already covered: `apps/__init__.py` `after_request` handler matches `http://localhost` prefix — no change needed for `localhost:3000` <br>• `is_admin` is a real boolean column on User — the role-name derivation workaround in `normalizeFlaskUser()` can be removed |
| **Files Created** | `apps/authentication/tests/test_jwt_routes_v2.py` (10 tests) |
| **Files Updated** | `apps/authentication/jwt_routes.py` (`serialize_auth_user`, fixed `/me`, new `/logout`), `apps/authentication/INDEX.md` (platform-ui integration section) |
| **Planning Files Updated** | `13-open-questions.md` (Q14 fully resolved), `15-action-backlog.md` (Phase B all done + B.1 follow-ups added), `96-rounds-index.md`, `98-change-log.md` |
| **Decisions Proposed** | None new — implements Phase B from ADR-011 (auth bridge) |
| **Next Recommended Round** | Round 010: Module 01 Users — first full module build, unblocked by auth |

---

## Round 010 — Module 01 Users (First Module)

| Field | Value |
|-------|-------|
| **Date** | 2026-04-24 |
| **Topic** | Module 01 Users — first production-quality authenticated module |
| **Objective** | Build Users module as the implementation standard for all future modules. Auth contract verification, Flask JSON API, platform-ui pages + components + types. |
| **Key Findings** | • `/admin/users` routes return HTML, NOT JSON — cannot use from platform-ui <br>• `/api/v1/users` exists but uses API Token auth, not JWT — incompatible with platform-ui Bearer flow <br>• Created new `apps/authentication/user_api_routes.py` — JWT Bearer, org-scoped, excludes AI agents, excludes sensitive fields <br>• Proxy PATH_MAP corrected: `users` → `/api/users` (was `/admin/users`) <br>• `normalizeFlaskUser()` `is_admin` workaround removed — backend now returns real boolean (Round 009 fix) <br>• Module manifest draft created: owned/referenced/core table classification |
| **Files Created (platformengineer)** | `apps/authentication/user_api_routes.py` (5 endpoints) |
| **Files Updated (platformengineer)** | `apps/__init__.py` (register user_api_bp) |
| **Files Created (platform-ui)** | `lib/modules/users/types.ts`, `lib/api/users.ts`, `components/modules/users/users-table.tsx`, `components/modules/users/user-status-badge.tsx`, `components/modules/users/user-role-badge.tsx`, `app/(dashboard)/users/page.tsx`, `app/(dashboard)/users/[id]/page.tsx`, `docs/modules/01-users/IMPLEMENTATION.md`, `docs/modules/01-users/module.manifest.json` |
| **Files Updated (platform-ui)** | `lib/api/query-keys.ts` (users keys), `lib/auth/options.ts` (remove is_admin workaround), `app/api/proxy/[...path]/route.ts` (users path fix), `docs/auth/README.md` (resolved gaps), `docs/modules/01-users/PLAN.md`, `docs/modules/ROADMAP.md` |
| **Decisions Proposed** | ADR-015: Module-first JSON API pattern (new JWT endpoints separate from Jinja2 admin routes) |
| **Next Recommended Round** | Round 011: Module 02 Organizations OR Users Phase 2 (create/edit + pending page) |

---

## Round 011 — Open-Source Capability Layer

| Field | Value |
|-------|-------|
| **Date** | 2026-04-24 |
| **Topic** | Standardize horizontal capabilities across all 19 modules |
| **Objective** | Define which open-source libraries handle DataGrid, charts, forms, URL state, file import/export, permission-aware UI, multi-tenant safety, and audit mutations — so these are never re-evaluated per module. |
| **Key Findings** | • `@tanstack/react-table` v8, `recharts` v3, `react-hook-form` v7, `zod` v4, `sonner` already installed — no new P0 libraries needed <br>• `nuqs` missing — must be installed before any list page with filters (URL state) <br>• RTL pagination direction flip: ChevronRight=previous, ChevronLeft=next (logical) — must be standard everywhere <br>• BOM (`\uFEFF`) mandatory in CSV export — Excel on Windows misreads Hebrew UTF-8 without it <br>• `org_id` from `session.user.org_id` only — never from URL params or request body (tenant safety rule) <br>• `react-grid-layout` deferred to Phase 3 (dashboard builder, Monitoring module only) <br>• `xlsx` deferred — dynamic import, per-module only for helpdesk/billing Excel exports <br>• `PermissionGate` component + `usePermission()` hook missing — must be created before any module with destructive actions <br>• All module mutations must live in `lib/modules/<module>/mutations.ts` — not inline in components |
| **Files Created (platform-ui)** | `docs/system-upgrade/25-open-source-capability-layer.md` (18 sections) |
| **Files Updated (platform-ui)** | `docs/system-upgrade/14-decision-log.md` (ADR-016), `docs/system-upgrade/15-action-backlog.md` (14 new tasks), `docs/system-upgrade/11-recommended-tech-stack.md` (capability layer section), `docs/system-upgrade/12-migration-roadmap.md` (Phase 1 prerequisite), `docs/modules/ROADMAP.md` (module start checklist updated) |
| **Decisions Proposed** | ADR-016: Open-Source Capability Layer (standardizes all library choices for 19 modules) |
| **Next Recommended Round** | Round 012: Capability layer foundation — install nuqs, create shared DataTable, PermissionGate, EmptyState, date utils; then Module 02 Organizations |

---

## Round 012 — Capability Layer Foundation

| Field | Value |
|-------|-------|
| **Date** | 2026-04-24 |
| **Topic** | Implement shared capability layer foundations + Organizations preparation |
| **Objective** | Extract reusable primitives from Users module so Organizations and all future modules don't duplicate table/permission/format/CSV logic. |
| **Key Findings** | • `components/shared/data-table.tsx` existed but was client-side only (in-memory filter/sort) — renamed to `data-table-client.tsx` to avoid name collision with new server-side `data-table/` directory <br>• `components/shared/empty-state.tsx` already existed and was already good — no changes needed <br>• Organizations `/admin/api/organizations` routes use `_require_admin()` (session cookie) — same ADR-015 problem as Users; need new JWT-authenticated blueprint `apps/admin/org_api_routes.py` <br>• Token JWT shape in proxy is `token.user.id` / `token.user.org_id` (not `token.userId`) — fixed in proxy update <br>• TypeScript typecheck: EXIT 0 after fixes |
| **Files Created (platform-ui)** | `components/shared/data-table/types.ts`, `components/shared/data-table/table-skeleton.tsx`, `components/shared/data-table/pagination.tsx`, `components/shared/data-table/data-table.tsx`, `components/shared/data-table/index.ts`, `components/shared/permission-gate.tsx`, `lib/hooks/use-permission.ts`, `lib/utils/format.ts`, `lib/utils/csv.ts`, `lib/api/request-context.ts` |
| **Files Updated (platform-ui)** | `components/shared/data-table.tsx` → renamed to `data-table-client.tsx`, `components/modules/users/users-table.tsx` (refactored to use shared DataTable), `app/api/proxy/[...path]/route.ts` (audit headers), `docs/modules/02-organizations/PLAN.md` (full endpoint audit + capability alignment), `docs/system-upgrade/25-open-source-capability-layer.md`, `docs/system-upgrade/15-action-backlog.md`, `docs/system-upgrade/96-rounds-index.md`, `docs/system-upgrade/98-change-log.md` |
| **Decisions Proposed** | None new — implements ADR-016 capability layer |
| **Next Recommended Round** | Round 013: Module 02 Organizations — create Flask JWT org API + platform-ui pages using shared DataTable + PermissionGate |

---

## Round 013 — Module 02: Organizations

| Field | Value |
|-------|-------|
| **Date** | 2026-04-24 |
| **Topic** | Module 02 Organizations — Flask JWT API + platform-ui list/detail pages |
| **Objective** | Deliver the second reference module using the shared capability layer. Validate that DataTable, PermissionGate, formatDate, OrgStatusBadge all compose correctly. |
| **Key Findings** | • `data-table-client.tsx` confirmed unused (not imported anywhere) — deleted <br>• PermissionGate `systemAdminOnly` works correctly; non-admins see "no permission" message <br>• Flask `org_api_routes.py` uses raw SQL (same as existing admin routes) — Organization model only has `id` column <br>• TypeScript typecheck: EXIT 0 |
| **Files Created (platformengineer)** | `apps/admin/org_api_routes.py` (5 endpoints, JWT auth, tenant safety) |
| **Files Updated (platformengineer)** | `apps/__init__.py` (registered `org_api_bp`) |
| **Files Created (platform-ui)** | `lib/modules/organizations/types.ts`, `lib/api/organizations.ts`, `components/modules/organizations/org-status-badge.tsx`, `components/modules/organizations/orgs-table.tsx`, `app/(dashboard)/organizations/page.tsx`, `app/(dashboard)/organizations/[id]/page.tsx`, `docs/modules/02-organizations/module.manifest.json` |
| **Files Updated (platform-ui)** | `app/api/proxy/[...path]/route.ts` (added "organizations" to PATH_MAP), `lib/api/query-keys.ts` (added `orgs` keys), `docs/modules/02-organizations/PLAN.md` (DoD updated), `docs/system-upgrade/96-rounds-index.md`, `docs/system-upgrade/98-change-log.md` |
| **Files Deleted (platform-ui)** | `components/shared/data-table-client.tsx` (unused legacy) |
| **Decisions Proposed** | None new |
| **Capability Reuse Validated** | DataTable ✓, PermissionGate ✓, OrgStatusBadge ✓, formatDate ✓, usePermission ✓ |
| **Next Recommended Round** | Round 014: Module 03 Helpdesk OR Users Phase B (create/edit form + zod schema) |

---

## Round 014 — Platform Capabilities Catalog

| Field | Value |
|-------|-------|
| **Date** | 2026-04-24 |
| **Topic** | Define 30 horizontal platform capabilities to build once and reuse across all 19 modules |
| **Objective** | Prevent duplication by cataloging every shared capability: purpose, consuming modules, libraries, first scope, security rules, AI-maintainability notes, priority. Add "capability-first" rule to architecture and migration docs. |
| **Key Findings** | • Users and Orgs detail pages both have identical `InfoRow` + `BoolBadge` helpers — first promotion candidates <br>• `StatChip` pattern is also duplicated — promote to `StatCard` <br>• `PageShell` header+motion pattern duplicated across all module list pages — extract immediately <br>• 6 capabilities already partially implemented: DataGrid, PermissionGate, TenantContext, API Client, CSV export, DetailView pattern <br>• 11 capabilities needed before Round 015 (Helpdesk, Users Phase B) — ErrorBoundary, PageShell, DetailView, StatCard, PlatformForm, usePlatformMutation, ConfirmDialog, ActionButton, FeatureFlags, NotificationBell |
| **Files Created (platform-ui)** | `docs/system-upgrade/26-platform-capabilities-catalog.md` (30 capabilities, 7 fields each) |
| **Files Updated (platform-ui)** | `docs/system-upgrade/10-target-architecture.md` (capability-first principle + capabilities layer table), `docs/system-upgrade/12-migration-roadmap.md` (principle #9: capability-first), `docs/system-upgrade/15-action-backlog.md` (Platform Capabilities Catalog section: 25 new tasks across now/next/later), `docs/system-upgrade/96-rounds-index.md`, `docs/system-upgrade/98-change-log.md` |
| **Decisions Proposed** | Capability-First Rule: before building any module feature, check catalog — enforced in code review |
| **Next Recommended Round** | Round 015: Extract shared capabilities from existing code (PageShell, DetailView, StatCard, ErrorBoundary) + Users Phase B (create/edit form using PlatformForm) |

---

## Round 016 — Cross-Platform Structure Audit + CP-0 Boundary Extraction

| Field | Value |
|-------|-------|
| **Date** | 2026-04-24 |
| **Topic** | Audit platform-ui + implement CP-0: extract pure logic to `lib/platform/` boundary |
| **Objective** | Score cross-platform readiness, split `lib/auth/types.ts`, extract RBAC/format/CSV/request to `lib/platform/`, parameterize API base URL. No behavior change — re-export shims keep all web imports intact. |
| **Key Findings** | • Score raised from **55/100 → 68/100** <br>• `lib/platform/` created with 7 subdirs + root barrel index <br>• `NormalizedAuthUser` / `FlaskUserPayload` now importable without `next-auth` <br>• `lib/api/client.ts` base URL now `NEXT_PUBLIC_API_BASE_URL ?? "/api/proxy"` <br>• All existing web imports unchanged — shims at original paths <br>• TypeScript typecheck: EXIT 0 |
| **Files Created (platform-ui)** | `lib/platform/index.ts`, `lib/platform/auth/types.ts+index`, `lib/platform/permissions/rbac.ts+index`, `lib/platform/formatting/format.ts+index`, `lib/platform/export/csv.ts+index`, `lib/platform/request/context.ts+index`, `lib/platform/data-grid/types.ts+index`, `lib/platform/modules/users/types.ts`, `lib/platform/modules/organizations/types.ts` (18 new files total) |
| **Files Updated (platform-ui)** | `lib/auth/types.ts` (re-export + next-auth augmentation), `lib/auth/rbac.ts` (re-export shim), `lib/utils/format.ts` (re-export shim), `lib/utils/csv.ts` (platform import + browser layer), `lib/api/request-context.ts` (re-export shim), `lib/api/client.ts` (configurable base URL), `docs/system-upgrade/28-cross-platform-structure-audit.md` (CP-0 status updated), docs 10, 12, 15, 96, 98 |
| **Decisions Proposed** | ADR-018 (platform boundary enforcement — see 14-decision-log.md) |
| **Next Recommended Round** | Round 017: Users Phase B (create/edit form + zod) OR Module 04 Helpdesk Phase A |

---

## Round 015 — Capability Hardening from Users + Organizations

| Field | Value |
|-------|-------|
| **Date** | 2026-04-24 |
| **Topic** | Extract shared capabilities from Users + Organizations; refactor both modules to use them |
| **Objective** | Eliminate duplicated `InfoRow`, `BoolBadge`, `StatChip`, `PageShell`, inline error patterns from Users and Organizations pages. Build 6 shared capability folders before any more modules are added. |
| **Key Findings** | • Users and Orgs detail pages had identical `InfoRow` + `BoolBadge` + `ease` constant — exact duplication <br>• `LazyMotion` + header animation pattern duplicated in both list pages — extracted to `PageShell` <br>• `StatChip` pattern in both list pages — extracted to `StatCard` with optional `icon` prop <br>• Inline error state duplicated in all 4 pages — unified to `ErrorState` with HTTP status message mapping <br>• `useRouter` in detail pages was only for back button — moved into `DetailBackButton` <br>• Typecheck: EXIT 0 throughout |
| **Files Created (platform-ui)** | `lib/ui/motion.ts`, `components/shared/detail-view/` (6 files + index), `components/shared/stats/` (3 files + index), `components/shared/page-shell/` (2 files + index), `components/shared/error-state.tsx`, `components/shared/error-boundary.tsx`, `components/shared/form/` (3 files + index), `components/shared/confirm-action-dialog.tsx`, `docs/modules/02-organizations/IMPLEMENTATION.md` |
| **Files Updated (platform-ui)** | `app/(dashboard)/users/[id]/page.tsx`, `app/(dashboard)/users/page.tsx`, `app/(dashboard)/organizations/[id]/page.tsx`, `app/(dashboard)/organizations/page.tsx`, `docs/system-upgrade/14-decision-log.md` (ADR-017), `docs/system-upgrade/15-action-backlog.md` (7 tasks marked done), `docs/system-upgrade/26-platform-capabilities-catalog.md` (6 statuses updated) |
| **Decisions Proposed** | ADR-017: Shared Capabilities Promotion Policy — pattern in 2+ module files → promote to `components/shared/` |
| **Capability Reuse Validated** | PageShell ✓, StatCard ✓, DetailView ✓, ErrorState ✓, ErrorBoundary ✓, PlatformForm ✓, ConfirmActionDialog ✓ |
| **Next Recommended Round** | Round 016: Users Phase B (create user form + zod schema + usePlatformMutation) OR Module 04 Helpdesk Phase A |

---

## Round 018 — Roles & Permissions Core Module

| Field | Value |
|-------|-------|
| **Date** | 2026-04-24 |
| **Topic** | Module 03: Roles & Permissions — Flask API + full platform-ui module |
| **Objective** | Expose role/permission data via JWT-auth API; build list + detail pages + create/edit forms using all established shared capabilities; document permission model standard. |
| **Key Findings** | • Roles are GLOBAL (no org_id) — shared across all orgs <br>• `/api/roles/permissions` must be registered BEFORE `/<int:id>` to avoid Flask routing conflict <br>• `groupPermissions()` utility splits dot-notation codenames into namespace groups client-side <br>• Two-mutation strategy in `RoleEditSheet`: PATCH meta → PATCH permissions (only if changed) <br>• Permission checklist grouped by namespace; `PermissionChecklist` fetches `queryKeys.roles.permissions()` <br>• All shared capabilities reused: PageShell, StatCard, DataTable, PlatformForm, usePlatformMutation, DetailView <br>• Typecheck: EXIT 0 |
| **Files Created (platformengineer)** | `apps/authentication/role_api_routes.py` (261 lines, 6 endpoints) |
| **Files Updated (platformengineer)** | `apps/__init__.py` (role_api_bp registration) |
| **Files Created (platform-ui)** | `lib/modules/roles/types.ts`, `lib/modules/roles/schemas.ts`, `lib/api/roles.ts`, `components/modules/roles/role-permission-badge.tsx`, `components/modules/roles/roles-table.tsx`, `components/modules/roles/role-form.tsx`, `app/(dashboard)/roles/page.tsx`, `app/(dashboard)/roles/[id]/page.tsx`, `docs/modules/03-roles-permissions/IMPLEMENTATION.md`, `docs/modules/03-roles-permissions/module.manifest.json` |
| **Files Updated (platform-ui)** | `app/api/proxy/[...path]/route.ts` (roles PATH_MAP), `lib/api/query-keys.ts` (roles keys), `docs/modules/03-roles-permissions/PLAN.md` |
| **Commits** | platformengineer: `d1a6299d` · platform-ui: `1e7257a` |
| **Decisions Proposed** | Permission dot-notation standard: `module.action`; `groupPermissions()` = client-side namespace splitter |
| **Next Recommended Round** | Round 019: Organizations Phase B (create/edit org forms) OR Helpdesk Phase A (list + detail pages) |

---

## Round 019 — Organizations Phase B + Admin Mutation Standard

| Field | Value |
|-------|-------|
| **Date** | 2026-04-24 |
| **Topic** | Organizations Phase B: create/edit org forms + backend hardening |
| **Objective** | Validate that the R017 usePlatformMutation form pattern generalizes cleanly to a second multi-tenant, system-admin-only module before moving to Helpdesk. |
| **Key Findings** | • Backend POST + PATCH were already implemented in R013 — only security hardening needed <br>• Raw `str(exc)` was leaking DB constraint details — fixed with `IntegrityError` catch → 409 <br>• Slug auto-generation from name is idiomatic UX; slug is immutable after creation (no `slug` field in PATCH) <br>• `is_active` deactivation in edit form is acceptable UX; dedicated `ConfirmActionDialog` action is backlog <br>• Pattern confirmed: `createOrgSchema` / `editOrgSchema` → `usePlatformMutation` → cache invalidation works cleanly <br>• Typecheck: EXIT 0 |
| **Files Created (platformengineer)** | (hardening only — no new files) |
| **Files Updated (platformengineer)** | `apps/admin/org_api_routes.py` (IntegrityError, slug regex, name length) |
| **Files Created (platform-ui)** | `lib/modules/organizations/schemas.ts`, `components/modules/organizations/organization-form.tsx` |
| **Files Updated (platform-ui)** | `lib/api/organizations.ts`, `app/(dashboard)/organizations/page.tsx`, `app/(dashboard)/organizations/[id]/page.tsx`, `docs/modules/02-organizations/IMPLEMENTATION.md`, `docs/modules/02-organizations/module.manifest.json` |
| **Commits** | platformengineer: `735b88ae` · platform-ui: `885358a` |
| **Decisions Proposed** | None — ADR-019 (usePlatformMutation) confirmed valid for multi-tenant system-admin modules |
| **Next Recommended Round** | Round 020: Helpdesk Phase A — list + detail pages (tickets + sessions) |

---

## Round 020 — Dangerous Actions + ConfirmAction Standard

| Field | Value |
|-------|-------|
| **Date** | 2026-04-24 |
| **Topic** | ADR-021 Dangerous Action Standard — platform-wide UX + enforcement for sensitive actions |
| **Objective** | Create `lib/platform/actions/` cross-platform standard; implement deactivate/reactivate for users and orgs; harden ConfirmActionDialog; fix security findings from audit review. |
| **Key Findings** | • `accessToken` in client session = XSS risk — removed from `session()` callback <br>• `refreshToken` was already server-side only — confirmed safe <br>• `callbackUrl` open redirect fix: now strips non-relative paths <br>• Proxy catch block was leaking internal error messages — stripped to generic message <br>• `useEffect` deps with inline `reset` caused infinite loop — fixed with `useCallback` <br>• `useCountUp` in `.map()` = hooks violation — extracted to `AnimatedStatItem` component <br>• Typecheck: EXIT 0 |
| **Files Created (platform-ui)** | `lib/platform/actions/types.ts`, `lib/platform/actions/danger-level.ts`, `lib/platform/actions/definitions.ts`, `lib/platform/actions/index.ts`, `lib/hooks/use-dangerous-action.ts` |
| **Files Updated (platform-ui)** | `lib/platform/index.ts`, `components/shared/confirm-action-dialog.tsx`, `lib/api/users.ts`, `lib/api/organizations.ts`, `app/(dashboard)/users/[id]/page.tsx`, `app/(dashboard)/organizations/[id]/page.tsx`, `app/(auth)/login/page.tsx`, `app/api/proxy/[...path]/route.ts`, `lib/auth/options.ts`, `lib/auth/types.ts`, `components/modules/users/user-form.tsx` |
| **Commits** | platform-ui: `e634ca3` |
| **Decisions Proposed** | ADR-021: Dangerous Action Standard — DangerLevel scale, useDangerousAction, ConfirmActionDialog |
| **Next Recommended Round** | Round 021: Security Hardening Audit |

---

## Round 021 — Post-Dangerous-Actions Security Hardening Audit

| Field | Value |
|-------|-------|
| **Date** | 2026-04-24 |
| **Topic** | Deep security audit of auth, proxy, RBAC, tenant isolation, dangerous actions, audit readiness |
| **Objective** | Verify no critical/high security gaps before Helpdesk development. Fix all HIGH findings. Document deferred items. |
| **Key Findings** | • Proxy PATH_MAP fallback allowed routing to arbitrary Flask endpoints (HIGH) — fixed <br>• `setUserActive`/`setOrgActive` called non-existent Flask endpoints (HIGH) — fixed <br>• `X-User-Id`/`X-Org-Id` header names look authoritative (MEDIUM) — renamed to `X-Client-*` <br>• `signOut` didn't invalidate Flask refresh token (LOW) — fixed via events.signOut <br>• Full audit trail gaps documented as AUD-001 (pre-prod blocker) <br>• PII gap: email in user list visible to all org members (pre-prod blocker) <br>• Overall security score: 7.2 → 8.5/10 <br>• Typecheck: EXIT 0 |
| **Files Created (platform-ui)** | `docs/system-upgrade/30-security-hardening-audit.md` |
| **Files Updated (platform-ui)** | `app/api/proxy/[...path]/route.ts`, `lib/platform/request/context.ts`, `lib/auth/options.ts`, `docs/system-upgrade/06-security-assessment.md`, `docs/system-upgrade/96-rounds-index.md`, `docs/system-upgrade/98-change-log.md` |
| **Files Updated (platformengineer)** | `apps/authentication/user_api_routes.py` (add `/active` route + audit), `apps/admin/org_api_routes.py` (add `/active` route + audit) |
| **Commits** | platform-ui: (this round) · platformengineer: (this round) |
| **Decisions Proposed** | None — confirmed: backend must never trust X-Client-* headers |
| **Next Recommended Round** | Round 022: Security Blockers Closure |

---

## Round 022 — Security Blockers Closure

| Field | Value |
|-------|-------|
| **Date** | 2026-04-24 |
| **Topic** | Resolve all R021 deferred security blockers before production |
| **Objective** | AUD-001 (full audit trail), L3 (URL token removal), PII-001 (email visibility), M2 (is_system_admin typing), CSP plan |
| **Key Findings** | • Added `record_activity()` helper — all write operations now write `UserActivity` <br>• Login/logout/login_failed now audited in `jwt_routes.py` <br>• create/update/approve user audited in `user_api_routes.py` <br>• create/update org audited in `org_api_routes.py` <br>• create/update/permissions_replace role audited in `role_api_routes.py` <br>• `?token=` URL fallback removed from `jwt_required` (token leakage in access logs) <br>• `GET /api/users` non-admins now see only own record (PII-001) <br>• `is_system_admin` added to `FlaskUserPayload`, `NormalizedAuthUser`, `normalizeFlaskUser()` <br>• `isSystemAdmin()` corrected to return `is_system_admin` not `is_admin` <br>• CSP headers planning doc created <br>• Security score: 8.5 → 9.2/10 <br>• Typecheck: EXIT 0 |
| **Files Created (platform-ui)** | `docs/system-upgrade/31-production-security-headers.md` |
| **Files Updated (platform-ui)** | `lib/platform/auth/types.ts`, `lib/auth/options.ts`, `lib/platform/permissions/rbac.ts`, `docs/system-upgrade/30-security-hardening-audit.md`, `docs/system-upgrade/06-security-assessment.md`, `docs/system-upgrade/96-rounds-index.md`, `docs/system-upgrade/98-change-log.md` |
| **Files Updated (platformengineer)** | `apps/authentication/jwt_auth.py` (record_activity + L3 fix), `apps/authentication/jwt_routes.py` (login/logout audits), `apps/authentication/user_api_routes.py` (PII-001 + create/update/approve audits), `apps/admin/org_api_routes.py` (create/update audits), `apps/authentication/role_api_routes.py` (create/update/permissions audits) |
| **Commits** | platform-ui: (this round) · platformengineer: (this round) |
| **Decisions Proposed** | None — security hardening only |
| **Next Recommended Round** | Round 023: Capabilities Build Order planning (this round) |

---

## Upcoming Rounds (Proposed)

| Round | Topic | Why Now |
|-------|-------|---------|
| **005** | Authentication bridge | ✅ Complete — design in `16-auth-bridge-design.md` |
| **006** | AI-maintainability policy | ✅ Complete — policy in `23-ai-maintainability-and-code-cleanup.md` |
| **007** | Auth implementation (Phase A) | ✅ Complete — all Phase A files implemented |
| **008** | Module data export/import design | ✅ Complete — spec in `24-core-platform-and-module-system.md` |
| **009** | Auth Phase B (Flask additions) | ✅ Complete — /me fixed, /logout added, serialize_auth_user with permissions |
| **010** | Module 01: Users | ✅ Complete — list + detail pages, Flask JSON API, types, components, ADR-015 |
| **011** | Open-Source Capability Layer | ✅ Complete — ADR-016, 25-open-source-capability-layer.md, 14 backlog tasks |
| **012** | Capability Layer Foundation | ✅ Complete — shared DataTable, PermissionGate, format utils, CSV util, request context, audit headers |
| **013** | Module 02: Organizations | ✅ Complete — Flask JWT org API + platform-ui list/detail pages |
| **014** | Platform Capabilities Catalog | ✅ Complete — 30 capabilities documented, capability-first rule added |
| **015** | Capability Hardening | ✅ Complete — 6 shared capability folders, all 4 module pages refactored |
| **016** | Cross-Platform Structure Audit + CP-0 | ✅ Complete — `lib/platform/` created, auth types split, readiness 55→68/100 |
| **017** | Users Phase B — Mutations + Form Standard | ✅ Complete — create/edit user forms, usePlatformMutation, Zod schemas, PATCH proxy, backend endpoints |
| **018** | Roles & Permissions Core Module | ✅ Complete — Flask role API (6 endpoints), full frontend module with form + table + detail |
| **019** | Organizations Phase B | ✅ Complete — create/edit forms, backend hardening (IntegrityError, slug validation), immutable slug |
| **016** | CI/CD pipeline for platform-ui | Required before shipping to production |

---

## Round 023 — Capabilities Build Order (Planning Round)

| Field | Value |
|-------|-------|
| **Date** | 2026-04-24 |
| **Topic** | Dependency-aware capability build order for all remaining platform capabilities |
| **Objective** | Create a strict, dependency-aware build order for remaining Platform Capabilities before broad module development. Analyze all 30 capabilities, map dependencies, define next 10 rounds, anti-overengineering rules, and acceptance criteria. |
| **Key Findings** | • 8 capabilities fully implemented, 5 partial, 17 pending <br>• Helpdesk gate requires 6 capabilities — 3 pending (FeatureFlags, Timeline, Notifications) + 3 partial completions <br>• ActionButton (§04) and DetailView extraction (§08) are the smallest blockers — ~75 min each <br>• PlatformFeatureFlags (§17) is 1 hour and unblocks all plan-gated features <br>• PlatformTimeline (§09) is the most critical pending capability — no Helpdesk ticket detail without it <br>• PlatformRealtime (§23) deferred to R030 — polling is sufficient for Helpdesk Phase A/B/C <br>• Production gate: FeatureFlags + AuditLog + Notifications + CSP headers (R023–R026) <br>• 10 capability deferred (Wizard, Registry, Privacy, FileManager, Integration, etc.) — safe to skip for Helpdesk and AI Agents |
| **Files Created (platform-ui)** | `docs/system-upgrade/35-platform-capabilities-build-order.md` |
| **Files Updated (platform-ui)** | `docs/system-upgrade/26-platform-capabilities-catalog.md` (build-order column), `docs/system-upgrade/12-migration-roadmap.md` (Phase 0 marked complete), `docs/system-upgrade/15-action-backlog.md` (R023–R032 tasks), `docs/system-upgrade/96-rounds-index.md`, `docs/system-upgrade/98-change-log.md` |
| **Decisions Proposed** | None — planning only. No code changes in this round. |
| **Next Recommended Round** | Round 025: AI Capability Context Architecture (design only) |

---

## Round 025 — AI User Capability Context Architecture

| Field | Value |
|-------|-------|
| **Date** | 2026-04-24 |
| **Topic** | Personalized AI Capability Context — server-generated per-user prompt context |
| **Objective** | Extend the AI Action Platform with a complete AI User Capability Context system. Agents must serve both regular users and system admins under a dynamically generated, user-specific context. Context is guidance only — backend re-authorization is mandatory at every execution. |
| **Key Findings** | • Context is guidance, not authorization — backend re-check (§27) is the real gate <br>• `GET /api/ai/context` generates `AIUserCapabilityContext` from JWT+RBAC+modules+flags+profile — client never supplies context <br>• `build_ai_capability_prompt()` produces ≤400-token Hebrew prompt section — deterministic, cacheable by `context_version` <br>• `context_version` Redis counter incremented on role/module/flag/deactivation/policy changes <br>• Action filtering: user sees only role-appropriate actions; denied categories as safe strings only (no unauthorized action IDs exposed) <br>• 6 role-specific prompt policies: viewer/technician/manager/admin/system_admin/ai_agent <br>• Voice: 8-action cap, `voice_invocable: true` only, `danger_level >= "high"` → UI redirect, PII never spoken proactively <br>• Personalization (org discovery profile, onboarding mode) influences suggestions only — never expands permissions <br>• 7 context-specific security rules added (S11–S17) |
| **Files Created (platform-ui)** | None — doc-only round |
| **Files Updated (platform-ui)** | `docs/system-upgrade/36-ai-action-platform.md` (§23–§32 added: 10 new sections), `docs/system-upgrade/14-decision-log.md` (ADR-023), `docs/system-upgrade/10-target-architecture.md`, `docs/system-upgrade/24-core-platform-and-module-system.md`, `docs/system-upgrade/26-platform-capabilities-catalog.md`, `docs/system-upgrade/35-platform-capabilities-build-order.md`, `docs/system-upgrade/15-action-backlog.md` (16 context-layer tasks), `docs/system-upgrade/96-rounds-index.md`, `docs/system-upgrade/98-change-log.md` |
| **Commits** | No code changes — architecture/planning round |
| **Decisions Proposed** | ADR-023: Personalized AI Capability Context |
| **Next Recommended Round** | Round 026: AI Action Platform hardening — capability levels, viability checks, delete policy |

---

## Round 031 — AI Provider Gateway Phase 1 Implementation

| Field | Value |
|-------|-------|
| **Date** | 2026-04-25 |
| **Topic** | Implement AI Provider Gateway Phase 1 foundation in platformengineer |
| **Objective** | Build the mandatory gateway layer designed in R029/R030: schemas, gateway, policy, billing adapter, AIUsageLog model extension + migration, CI lint script, reference P0 migration (fitness_nutrition), and tests. |
| **Key Findings** | • `AIProviderGateway.call()` is synchronous chat + embedding only in Phase 1; streaming deferred to Phase 2 <br>• `_try_set()` pattern allows `write_usage_log_extended` to run on unmigrated DB — solves chicken-and-egg deployment order <br>• `AIProviderPolicy` fails open on errors (Redis/DB partial failure should not block all AI calls) <br>• `AIProviderBillingAdapter` tolerates `ImportError` on `service_billing` — dev/test environments without billing module work correctly <br>• Non-billable requests (`is_billable=False`) still write `AIUsageLog` — no silent skip <br>• `fitness_nutrition/ai_service.py` P0 migration: removed module-level `genai` import, `os.getenv('GEMINI_AI_KEY')` replaced, singleton `__init__` stripped, `org_id`/`user_id` passed per-call <br>• CI lint scanner (`check_no_direct_llm_imports.py`) scans `apps/` and allows only `apps/ai_providers/adapters/` to import banned packages |
| **Files Created (platformengineer)** | `apps/ai_providers/schemas.py` (GatewayRequest, GatewayResponse, PolicyDecision, VALID_CAPABILITIES), `apps/ai_providers/gateway.py` (AIProviderGateway.call/\_execute/\_resolve\_provider/\_write\_usage\_log), `apps/ai_providers/policy.py` (AIProviderPolicy.check + Phase 2 TODOs), `apps/ai_providers/billing_adapter.py` (AIProviderBillingAdapter.emit), `scripts/migrations/versions/20260424_extend_ai_usage_log.py`, `scripts/check_no_direct_llm_imports.py`, `apps/ai_providers/tests/test_gateway.py` |
| **Files Updated (platformengineer)** | `apps/ai_providers/tasks.py` (write\_usage\_log\_extended task + \_try\_set helper), `apps/ai_providers/models.py` (AIUsageLog: 14 new attribution/billing columns), `apps/fitness_nutrition/ai_service.py` (full rewrite — no genai import), `apps/fitness_nutrition/workout_routes.py` (org\_id + user\_id passed to generate\_workout\_plan), `apps/fitness_nutrition/nutrition_routes.py` (org\_id + user\_id passed to generate\_meal\_plan) |
| **Files Updated (platform-ui)** | `docs/system-upgrade/96-rounds-index.md`, `docs/system-upgrade/98-change-log.md`, `docs/system-upgrade/15-action-backlog.md`, `docs/system-upgrade/35-platform-capabilities-build-order.md` |
| **Decisions Proposed** | None new — implements ADR-027 (R029) |
| **Next Recommended Round** | Round 032: Commit Round 031 gateway files + CLAUDE.md fix + doc consistency corrections |

---

## Round 032 — Master Plan Consistency & Readiness Review

| Field | Value |
|-------|-------|
| **Date** | 2026-04-25 |
| **Topic** | Documentation-only: audit all modernization plan docs for internal consistency; define canonical document hierarchy, implementation status matrices, and blocker register |
| **Objective** | Cross-check 19 documents across platform-ui and platformengineer. Find and fix all conflicts. Determine which Round 031 gateway files are uncommitted. Produce master consistency document (doc 42). Correct stale statuses in docs 35, 40, 97. Add missing registry entries to doc 97. Fix CLAUDE.md response field name. |
| **Key Findings** | • **BLK-01 (critical)**: Round 031 fully implemented but NOT committed — 13 files in platformengineer working tree, last commit = `0041db7b security(r022)` <br>• `CLAUDE.md` usage example had wrong field: `response.content` should be `response.output_text` — fixed <br>• Doc 40 status was "Implementation not started" — corrected to "Phase 1 implemented (uncommitted, R031)" <br>• Doc 40 AIUsageLog extension said "12 new fields" — corrected to "14 new fields" <br>• Doc 97 ADR count was "ADR-014" — corrected to "ADR-027" <br>• Doc 35 §11 used R023–R032 as future capability rounds but those numbers were consumed by AI/security work — offset note added, capability rounds start at R033 <br>• 8 conflicts total (C1–C8) identified and documented in doc 42 §03–§04 <br>• Implementation gates A–G defined (Gate C = first LLM feature, requires gateway committed) <br>• 10-entry blocker register (BLK-01–BLK-10) defined |
| **Files Created (platform-ui)** | `docs/system-upgrade/42-master-plan-consistency-and-readiness.md` (15 sections: status matrices, blocker register, gates A–G, next 5 rounds, ambiguities) |
| **Files Updated (platform-ui)** | `docs/system-upgrade/40-ai-provider-gateway-billing.md` (status + field count corrected), `docs/system-upgrade/35-platform-capabilities-build-order.md` (§11 round offset note), `docs/system-upgrade/97-source-of-truth.md` (ADR count ADR-014→ADR-027), `docs/system-upgrade/96-rounds-index.md`, `docs/system-upgrade/98-change-log.md` |
| **Files Updated (platformengineer)** | `CLAUDE.md` (`response.content` → `response.output_text`) |
| **Commits** | No code changes — documentation consistency round |
| **Decisions Proposed** | None new — clarifications only |
| **Next Recommended Round** | Round 033: Shared Services and Platform Capabilities Enforcement Plan (doc 43, ADR-028) |

---

## Round 033 — Shared Services and Platform Capabilities Enforcement Plan

| Field | Value |
|-------|-------|
| **Date** | 2026-04-25 |
| **Topic** | Documentation-only: define mandatory shared capability usage rules, legacy pattern blacklist, CI enforcement design, exception policy, and AI-agent guardrails |
| **Objective** | Remove all ambiguity about which shared patterns must be used. Define what is forbidden. Design static detection scripts and CI gates. Update CLAUDE.md in both repos. Prevent old one-off patterns from proliferating during the rewrite. |
| **Key Findings** | • All shared frontend capabilities (DataTable, PlatformForm, PermissionGate, PageShell, DetailView, ConfirmActionDialog) now have explicit "must use" contracts with forbidden alternatives <br>• All shared backend services (@jwt_required, g.jwt_user, @role_required, record_activity, AIProviderGateway) have explicit "must use" contracts <br>• 15 frontend + 14 backend forbidden patterns documented with FAIL/WARN severity <br>• 3 P0 detection scripts designed (check_no_direct_llm_imports: exists; check_no_org_id_from_body: new; check_json_api_auth: new) <br>• CI rollout: Phase 1 warn-only (R034), Phase 2 hard-fail new violations (R036), Phase 3 full hard-fail (R038) <br>• Exception policy: every exception requires file/reason/migration-round/owner/approval — no silent exceptions <br>• Module development checklist (pre/during/post), PR reviewer checklist, AI-agent guardrail checklist all defined <br>• ADR-028 added to decision log |
| **Files Created (platform-ui)** | `docs/system-upgrade/43-shared-services-enforcement.md` (15 sections: capability contracts, backend contracts, blacklist, enforcement layers, CI plan, exception policy, checklists, P0/P1 tasks, acceptance criteria) |
| **Files Updated (platform-ui)** | `docs/ARCHITECTURE.md` (§21.4 updated: gateway files marked ✅ R031; §22 new: Capability-First Rule with mandatory tables), `docs/system-upgrade/14-decision-log.md` (ADR-028 added; ADR-027 field count corrected 12→14), `docs/system-upgrade/15-action-backlog.md` (P0 + P1 enforcement tasks added), `docs/system-upgrade/26-platform-capabilities-catalog.md` (enforcement plan cross-reference added), `CLAUDE.md` (AI-agent guardrail checklist added), `docs/system-upgrade/96-rounds-index.md`, `docs/system-upgrade/98-change-log.md` |
| **Files Updated (platformengineer)** | `CLAUDE.md` (AI-agent backend guardrail checklist added) |
| **Commits** | No new code — documentation round |
| **Decisions Proposed** | ADR-028: Shared Services and Capability-First Enforcement |
| **Next Recommended Round** | Round 034: P0 LLM migrations (ai_coach, voice_support, personal_info/ai_chat/providers/, jira_integration) + wire check_no_direct_llm_imports.py to CI + ActionButton component |

---

## Round 034 — AI Providers Hub Architecture & UI Plan

| Field | Value |
|-------|-------|
| **Date** | 2026-04-25 |
| **Topic** | Documentation-only: design the AI Providers Hub for platform-ui; assess existing backend capability; define JWT API routes, permissions, security rules, shared capability usage, and phased implementation plan |
| **Objective** | Answer 15 questions about existing backend AI provider layer. Design 10 Hub sections with full API table (29 endpoints), TypeScript interfaces, Zod schemas, permissions model, security rules, and 4-phase implementation roadmap. |
| **Key Findings** | • Existing `apps/ai_providers/routes.py` has full CRUD + usage APIs but uses Flask-Login throughout — incompatible with platform-ui JWT auth <br>• No platform-ui pages exist for AI provider management — `app/(dashboard)/` has no `ai-providers/` route <br>• Decision: new `apps/ai_providers/api_routes.py` at `/api/ai-providers/` with `@jwt_required` (side-by-side, not replacing existing routes) <br>• Provider health state not in DB — Redis-backed circuit breaker only (CLOSED/OPEN/HALF_OPEN, 5-failure threshold, 30s cooldown) <br>• API keys Fernet-encrypted in `api_key_ref`; frontend receives only `has_api_key: bool` — never the key value <br>• 8 new permissions required: `ai_providers.view/manage/rotate_key/usage.view/billing.view/health.view/quota.manage/system.manage` <br>• Migration status page (system-admin only) will surface `check_no_direct_llm_imports.py` scan results |
| **Files Created (platform-ui)** | `docs/system-upgrade/44-ai-providers-hub.md` (15 sections: capability assessment, gap analysis, product goals, 10 hub sections, 29-endpoint API table, TypeScript interfaces, Zod schemas, permissions model, security rules, shared capability rules, phased plan, open questions, acceptance criteria, ADR-029) |
| **Files Updated (platform-ui)** | `docs/system-upgrade/14-decision-log.md` (ADR-029 added), `docs/system-upgrade/26-platform-capabilities-catalog.md` (§30 AIProviders Hub added to summary table + full section), `docs/system-upgrade/35-platform-capabilities-build-order.md` (Hub enforcement pointer added), `docs/system-upgrade/40-ai-provider-gateway-billing.md` (§20 Hub reference added), `docs/system-upgrade/41-direct-llm-call-audit-and-migration.md` (§21 migration status Hub page added), `docs/system-upgrade/43-shared-services-enforcement.md` (R034 revision history entry), `docs/system-upgrade/15-action-backlog.md` (R035/R036/R037 Hub tasks added), `docs/system-upgrade/96-rounds-index.md`, `docs/system-upgrade/98-change-log.md` |
| **Commits** | No new code — documentation + architecture planning round |
| **Decisions Proposed** | ADR-029: AI Providers Hub — side-by-side JWT routes |
| **Next Recommended Round** | Round 034 Follow-up: Extend Hub plan with AI Service-to-Provider Routing Matrix |

---

## Round 034 Follow-up — AI Service-to-Provider Routing Matrix

| Field | Value |
|-------|-------|
| **Date** | 2026-04-25 |
| **Topic** | Documentation-only: extend AI Providers Hub with feature-level service routing — `AIServiceDefinition` + `AIServiceProviderRoute` models, 9-step routing resolution, GatewayRequest API cleanup, 27-service seed data, ADR-030 |
| **Objective** | Address the gap where `AIModuleOverride` cannot differentiate two features within the same module+capability. Design feature-level routing sitting above the module layer. Remove `provider_id`/`model` public API from `GatewayRequest`. Document 27 known AI-consuming services. |
| **Key Findings** | • `AIModuleOverride` unique on `(org_id, module_name, capability)` — feature-level differentiation impossible <br>• New `AIServiceDefinition` (system-level registry, 27 services) + `AIServiceProviderRoute` (feature-level routing) solve the gap <br>• 9-step resolution hierarchy: user_override → org+service → org+module → org+capability → system+service → system+capability → fallback_chain → fail-closed <br>• Step 9 is mandatory fail-closed (`NoProviderConfiguredError`) — never silent fallback to hardcoded provider <br>• `GatewayRequest.provider_id` and `.model` removed from public API; admin-only escape via `X-Migration-Mode` header <br>• 5 new `AIUsageLog` routing columns: `service_id`, `route_id`, `resolution_source`, `fallback_used`, `routing_scope` <br>• 6 new `ai_routes.*` permissions; `RouteDebugInfo` admin-only response field <br>• 23 legacy bypass files mapped to canonical `service_id` values |
| **Files Updated (platform-ui)** | `docs/system-upgrade/44-ai-providers-hub.md` (§16–§28 added: Routing Matrix sections, ADR-030), `docs/system-upgrade/14-decision-log.md` (ADR-030 added), `docs/system-upgrade/40-ai-provider-gateway-billing.md` (§20 addendum: gateway changes from ADR-030), `docs/system-upgrade/41-direct-llm-call-audit-and-migration.md` (§22 service_id mapping table), `docs/system-upgrade/35-platform-capabilities-build-order.md` (R035 + R037 rows updated), `docs/system-upgrade/15-action-backlog.md` (R035 backend + R037 UI matrix tasks expanded), `docs/system-upgrade/96-rounds-index.md`, `docs/system-upgrade/98-change-log.md` |
| **Commits** | No new code — documentation round |
| **Decisions Proposed** | ADR-030: AI Service-to-Provider Routing Matrix |
| **Next Recommended Round** | Round 038: Module Manager multi-tenant model redesign |

---

## Round 038 — Module Manager Multi-Tenant Redesign

| Field | Value |
|-------|-------|
| **Date** | 2026-04-25 |
| **Topic** | Documentation-only: redesign Module Manager DB model to support multi-tenant SaaS (per-org module state, per-org settings, proper license FKs, dependency graph, ADR-031) |
| **Objective** | The current `Module` model has global `is_installed`/`is_enabled` flags and no `org_id` anywhere. In a multi-tenant SaaS, each org must independently enable/disable/configure modules and hold licenses. Design the split and migration strategy. |
| **Key Findings** | • `Module.is_installed` + `Module.is_enabled` are system-wide — no per-org module state is structurally possible <br>• `ModulePurchase.organization` is `String(255)` with no FK — license ownership is unqueryable by org <br>• `ModuleLog.user` and `ScriptExecution.executed_by` are untyped strings — no audit FK integrity <br>• `Module.dependencies` is a JSON Text blob — no referential integrity, no version constraints, no cascade <br>• `ModuleSettings` overlaps with `Module.config_data` and has no org scoping <br>• Routes use `@login_required + current_user.is_admin` throughout — violates ADR-028 BE-01/BE-03 <br>• Solution: `Module` (system catalog) + new `OrgModule` (per-org state) + `OrgModuleSettings` + `ModuleDependency` table + `ModuleLicense` (org_id FK) |
| **Files Created (platform-ui)** | `docs/system-upgrade/45-module-manager-redesign.md` (11 sections: problem diagnosis, design goals, 9 new model definitions, schema diagram, API redesign, permissions, migration strategy, open questions, acceptance criteria, ADR-031, backlog) |
| **Files Updated (platform-ui)** | `docs/system-upgrade/14-decision-log.md` (ADR-031 added), `docs/system-upgrade/96-rounds-index.md`, `docs/system-upgrade/98-change-log.md` |
| **Commits** | No new code — documentation + architecture planning round |
| **Decisions Proposed** | ADR-031: Module Manager Multi-Tenant Model Split |
| **Next Recommended Round** | Round 038 Follow-up: module contract hardening (source of truth, lifecycle, manifest, dependency enforcement, backward compat, testing strategy, R038 phase split) |

---

## Round 038 Follow-up — Module Manager Contract Hardening

| Field | Value |
|-------|-------|
| **Date** | 2026-04-25 |
| **Topic** | Documentation-only: tighten Module Manager redesign before implementation — source of truth, lifecycle model, manifest integration, permission model, dependency enforcement, route/nav enforcement, audit requirements, testing strategy, backward compatibility plan, AI integration, R038 phase split |
| **Objective** | Prevent a dangerous big-bang migration. Make R038B the smallest safe first step. Define manifest-first architecture. Clarify all implementation contracts before any code is written. |
| **Key Findings** | • Original R038 was too large — mixed schema migrations + models + APIs + UI in one round <br>• `module_key` must be the primary identity — not `module_id` or `display_name` <br>• Manifest files (`apps/*/module.manifest.json`) own all static metadata; DB owns only runtime/org state <br>• `ModuleRegistry.sync_from_manifests()` is the sync bridge — DB catalog is derived state <br>• Two distinct lifecycles: system module (`registered → beta → active → deprecated → removed`) vs org module (`available → installed → enabled → disabled → suspended → uninstalled`) <br>• `ModuleEnforcementService.check_enable_preconditions()` checks 8 conditions fail-closed before any enable <br>• Disabling a module when dependents exist returns `dependent_modules` warning — no auto-cascade <br>• `ModuleCompatLayer` read-through allows gradual migration without breaking existing callers <br>• Phase 4 (G) drops must be gated on 30-day production observation after R038F <br>• AI integration: Module Manager provides registry data only; execution still via AI Action Platform + AI Provider Gateway <br>• 9 new permissions: `modules.view/enable/disable/configure/audit.view/license.view/system.manage/system.licenses/system.audit.view` |
| **Files Updated (platform-ui)** | `docs/system-upgrade/45-module-manager-redesign.md` (v1.0 → v2.0: 21 sections — source of truth, identity terms, lifecycle model, manifest integration, permission model, dependency/license enforcement, route/nav enforcement, audit requirements, API contract, testing strategy, backward compatibility, AI integration, migration strategy, R038A-G phase split), `docs/system-upgrade/14-decision-log.md` (ADR-031 clarified — manifest-first rule added), `docs/system-upgrade/15-action-backlog.md` (R038 replaced by R038A-G: 43 tasks across 7 phases), `docs/system-upgrade/35-platform-capabilities-build-order.md` (Gate Summary: R038B-G rows added), `docs/system-upgrade/96-rounds-index.md`, `docs/system-upgrade/98-change-log.md` |
| **Commits** | No code changes — documentation hardening round |
| **Decisions Proposed** | ADR-031 clarification: manifest-first rule + `module_key` as primary identity |
| **Next Recommended Round** | R038A2: module versioning, upgrade jobs, package management, marketplace — then answer OQ-01–OQ-07 and start R038B |

---

## Round 038A2 — Module Versioning, Upgrade Jobs, Package Management, and Marketplace

| Field | Value |
|-------|-------|
| **Date** | 2026-04-25 |
| **Topic** | Documentation-only: extend Module Manager redesign with per-org versioning, upgrade workflow, rollback policy, package file management, module marketplace, and license/purchase flow |
| **Objective** | Make the Module Manager design complete for a production SaaS: different orgs can run different module versions, upgrades are safe and auditable, package artifacts are checksum-verified, and a marketplace enables discovery and licensing. |
| **Key Findings** | • `OrgModule` needs 6 new version fields: `installed_version_id`, `target_version_id`, `rollback_version_id`, `last_upgrade_job_id`, `auto_update_policy`, `release_channel_allowed` <br>• `ModuleVersion` model added: `status` (draft/published/deprecated/yanked/archived), `release_channel`, `rollback_supported`, `migration_required`, `manifest_snapshot` (frozen at publish time) <br>• Upgrade is a 9-step async Job (not a synchronous API call): initiate → pre-flight → dry-run → approval gate → execute → validate → success/failure → rollback → audit <br>• Rollback blocked if `dry_run_result.has_irreversible=True` (DROP/TRUNCATE detected in dry-run) <br>• `ModulePackage` metadata in DB, files in S3; checksum required before publish; no hot-loading of `backend_plugin` packages <br>• `ModuleStoreListing` is the marketplace data layer — `listing_status` + `required_plan` control visibility per org <br>• `ModuleLicense` extended with `license_type` (trial/subscription/perpetual/usage_based/enterprise/included), `seats_limit`, `billing_subscription_id` <br>• R038H and R038I phases added to the phase plan (9 phases total) |
| **Files Updated (platform-ui)** | `docs/system-upgrade/45-module-manager-redesign.md` (v2.0 → v3.0: §22 versioning, §23 upgrade workflow, §24 rollback policy, §25 package management, §26 marketplace, §27 license flow, §28 store UI routes, §29 security, §30 AI integration v2, §31 updated phase split, §32 ADR-032), `docs/system-upgrade/14-decision-log.md` (ADR-032 added), `docs/system-upgrade/15-action-backlog.md` (R038H: 18 tasks; R038I: 14 tasks), `docs/system-upgrade/35-platform-capabilities-build-order.md` (R038H + R038I gate rows), `docs/system-upgrade/96-rounds-index.md`, `docs/system-upgrade/98-change-log.md` |
| **Commits** | No code changes — documentation round |
| **Decisions Proposed** | ADR-032: Module Versioning, Upgrade Jobs, Package Management, and Marketplace |
| **Next Recommended Round** | Answer OQ-01–OQ-07 in doc 45 §18, then R038B: additive schema foundation |

---

## Round 038B0 — Module Manager Open Questions & Implementation Inventory

| Field | Value |
|-------|-------|
| **Date** | 2026-04-25 |
| **Topic** | Investigation-only: answer OQ-01–OQ-07, verify FK targets, inventory current schema, audit manifest files and legacy callers, decide ModuleVersion/Package/Store timing, add Navigation Source of Truth |
| **Objective** | Make R038B migration safe by verifying every assumption from doc 45. No code written. |
| **Key Findings** | • Manifest filename is `manifest.v2.json` (NOT `module.manifest.json` — doc 45 §01 corrected) <br>• `module_key` = `Module.name` — already exists, only needs denormalization onto `OrgModule` <br>• 75 manifest files across 37+ modules (v1 + v2); `manifest.v2.json` has full `menu_items` nav data <br>• `Organization` is a stub model (`organizations` table, `id` only) — FK confirmed: `organizations.id` <br>• `ModuleVersion` must be in R038B scope to avoid breaking FK migration in R038H <br>• `ModulePackage` and `ModuleStoreListing` deferred to R038H/I <br>• OrgModule seed: lazy for non-core, pre-seed `is_core=True` × all orgs at migration time <br>• `ModuleLog.user` and `ModulePurchase.organization` are String (no FK) — add nullable FK columns in R038B without dropping the strings <br>• `/api/modules/enabled-menu` route has no auth (`@login_required` missing) — security gap; fix in R038D <br>• `apps/__init__.py:193` already has partial org-filtered module nav via `OrgFeatureFlag` — this is the migration hook for R038E <br>• Navigation Source of Truth section added to doc 45 §33 with planned API `GET /api/org/modules/navigation` <br>• ADR-032 no-hot-loading rule clarified: existing blueprint auto-register at startup uses local filesystem — permitted; hot-loading of uploaded package files is banned |
| **Files Created (platform-ui)** | `docs/system-upgrade/46-module-manager-implementation-inventory.md` (v1.0) |
| **Files Updated (platform-ui)** | `docs/system-upgrade/45-module-manager-redesign.md` (v2.0 → v3.1: header fixed, §01 manifest filename corrected, §33 Navigation Source of Truth added), `docs/system-upgrade/15-action-backlog.md` (R038B0 gate entry, R038B scope updated with ModuleVersion + module_purchases FK + pre-migration check, R038D nav API + auth fix tasks added), `docs/system-upgrade/35-platform-capabilities-build-order.md` (R038B0 gate row added), `docs/system-upgrade/98-change-log.md`, `docs/system-upgrade/96-rounds-index.md` |
| **Commits** | No code changes — investigation and documentation round |
| **Decisions Made** | OQ-01: lazy seed non-core, pre-seed core modules. OQ-02: no seed. OQ-03: licenses deferred. OQ-04: FK = organizations.id. OQ-05: script executions system-only. OQ-06: manifest filename = manifest.v2.json. OQ-07: deprecated blocks new enables. ModuleVersion in R038B. ModulePackage/Store in R038H/I. |
| **Next Recommended Round** | R038B: write additive schema migrations (org_modules, module_versions, module_licenses, module_dependencies, extend module_logs, extend module_purchases, add system_status to modules) |

---

## Round 030 — Direct LLM Call Audit + Gateway Migration Plan

| Field | Value |
|-------|-------|
| **Date** | 2026-04-24 |
| **Topic** | Complete inventory of direct LLM provider calls that bypass `apps/ai_providers/`, migration risk classification, gateway readiness assessment, and enforcement design |
| **Objective** | Before implementing any new AI feature, identify and classify every file that bypasses the AI Provider Gateway. Create a phased migration plan with P0/P1/P2/P3 priority, document bypass wrapper deletion criteria, assess gateway Phase 1 readiness, and design CI enforcement. Code audit + planning only — no runtime changes. |
| **Key Findings** | • **40 production files in `apps/`** bypass `apps/ai_providers/` — calling OpenAI/Gemini/Anthropic directly <br>• **3 dedicated bypass wrappers** exist: `life_assistant/services/gemini_client.py`, `life_assistant/services/openai_fallback.py`, `personal_info/ai_chat/providers/openai_provider.py` + `gemini_provider.py` <br>• **10 P0 files** have no key_resolver, no billing, no attribution — must migrate before any new AI feature <br>• 3 files have **module-level genai imports** (`voice_support/call_manager.py`, `fitness_nutrition/ai_service.py`, `ai_coach.py`) — fail at import time if key missing <br>• `personal_info/ai_chat/providers/` — Critical PII risk, no billing, no key_resolver, passes raw API key as constructor arg <br>• `apps/ai_providers/` is **70% complete** — registry, adapters, key_resolver, circuit breaker all production-ready; missing: `gateway.py`, `policy.py`, `billing_adapter.py`, schema extension, CI lint <br>• `gemini_client.py` is already semi-compliant (uses registry + fallback) but adds no billing — easiest P1 migration <br>• `openai_fallback.py` creates double-fallback risk if left after gateway ships <br>• No quota pre-check anywhere — orgs can exceed plan limits with no enforcement <br>• Critical PII gap: `personal_info` sends raw diary/document data to OpenAI/Gemini without PII redaction policy |
| **Files Created (platform-ui)** | `docs/system-upgrade/41-direct-llm-call-audit-and-migration.md` |
| **Files Updated (platform-ui)** | `docs/system-upgrade/35-platform-capabilities-build-order.md` (gateway track updated with P0 phase + audit doc reference), `docs/system-upgrade/15-action-backlog.md` (P0 migration tasks: 9 items), `docs/system-upgrade/96-rounds-index.md`, `docs/system-upgrade/98-change-log.md` |
| **Files Inspected (platformengineer)** | All `apps/*.py` files grepped for direct LLM imports; `apps/life_assistant/services/gemini_client.py`, `openai_fallback.py`, `apps/personal_info/ai_chat/providers/openai_provider.py`, `gemini_provider.py`, `apps/ai_agents/engine/agent_runner.py`, `apps/helpdesk/services/vision_service.py`, `screen_analyzer.py`, `incident_memory_service.py`, `apps/ai_settings/services/agent_engine.py`, `apps/ala/text_session.py`, `apps/mobile_voice/conversation_engine.py`, `apps/ops_intelligence/services/ops_rag_indexer.py`, `apps/voice_support/call_manager.py`, `apps/fitness_nutrition/ai_service.py`, `ai_coach.py` |
| **Decisions Proposed** | None — audit round, no new ADR required |
| **Next Recommended Round** | Gateway Phase 1 implementation (`gateway.py`, `policy.py`, `billing_adapter.py`, `schemas.py`, AIUsageLog migration) + P0 module migrations |

---

## Round 029 — AI Provider Gateway + Billing Metering Architecture

| Field | Value |
|-------|-------|
| **Date** | 2026-04-24 |
| **Topic** | AI Provider Gateway and mandatory billing metering — close the direct LLM provider call bypass gap |
| **Objective** | Define the canonical architecture for all LLM/STT/TTS/embedding calls: unified gateway, billing attribution, quota enforcement, streaming finalization, voice metering, and migration plan. Doc-only. No code. |
| **Key Findings** | • 55+ files across 20+ modules directly import LLM provider SDKs bypassing `apps/ai_providers/` entirely <br>• The platform already has a complete provider layer (registry, adapters, AIUsageLog, cost_tracker, fallback chain, circuit breaker) — it's just not being used <br>• `AIUsageLog` exists but is missing 12 fields needed for full attribution: `conversation_id`, `feature_id`, `action_id`, `ai_action_invocation_id`, `status`, `started_at`, `completed_at`, `error_code`, `correlation_id`, `cached_tokens`, `is_estimated`, `billable_cost`, `quota_bucket` <br>• No quota pre-check exists — orgs can exceed plan limits with no enforcement <br>• No streaming finalization — partial stream aborts produce unbilled usage <br>• Gemini Live voice path (mobile_voice/conversation_engine.py) bypasses all usage tracking <br>• Dedicated bypass wrapper files: `life_assistant/services/gemini_client.py`, `openai_fallback.py`, `personal_info/ai_chat/providers/` |
| **Files Created (platform-ui)** | `docs/system-upgrade/40-ai-provider-gateway-billing.md` |
| **Files Updated (platform-ui)** | `docs/system-upgrade/36-ai-action-platform.md` (§42 gateway integration note), `docs/system-upgrade/38-floating-ai-assistant.md` (§14 gateway attribution), `docs/system-upgrade/39-ai-architecture-consistency-pass.md` (§14 gateway as enforcement layer), `docs/system-upgrade/14-decision-log.md` (ADR-027), `docs/system-upgrade/26-platform-capabilities-catalog.md` (skipped — to update in round follow-up), `docs/system-upgrade/35-platform-capabilities-build-order.md` (gateway migration track pre-R027), `docs/system-upgrade/15-action-backlog.md` (gateway Phase 1/2/3 tasks: 30 items), `docs/system-upgrade/96-rounds-index.md`, `docs/system-upgrade/98-change-log.md` |
| **Files Inspected (platformengineer)** | `apps/ai_providers/` (models.py, cost_tracker.py, key_resolver.py, registry.py, adapters/base.py), `apps/billing/` (rate_config.py, service_billing.py) |
| **Decisions Proposed** | ADR-027: AI Provider Gateway and Mandatory Billing Metering |
| **Next Recommended Round** | B1 delegation token design OR gateway.py implementation (Phase 1 tasks) before any R027 feature work |

---

## Round 028 — AI Architecture Consistency Pass

| Field | Value |
|-------|-------|
| **Date** | 2026-04-24 |
| **Topic** | AI architecture consistency pass — remove all ambiguity across Rounds 024–027 before implementation begins |
| **Objective** | Audit docs 36, 38, 14, 26, 35, 15 for conflicting definitions. Produce canonical terms, canonical AIActionDescriptor v1, canonical voice policy, delegation token design placeholder, tool injection safety rules, and rollback policy. Doc-only. No code. |
| **Key Findings** | • `risk_tier` (4 values) and `capability_level` (10 values) were both active in doc 36 — `risk_tier` is retired <br>• `voiceInvocable` / `voice_invocable` and `voice_eligible` were 3 different names for same boolean — `voice_eligible` is canonical <br>• Old voice rule "only READ + WRITE_LOW" contradicts §34 formula allowing CREATE/UPDATE/APPROVE/EXECUTE at ≤medium — formula wins <br>• Two `AIActionDescriptor` schemas in same doc (14-field §05, 25-field §35) — canonical v1 is 30 fields in doc 39 §05 <br>• `check_delegated_permission()` in §06 references `risk_tier` → must not be implemented as written <br>• No delegation token design → B1 blocker before write-tier ships <br>• No tool injection safety rules → added in doc 39 §09 <br>• No prompt-is-guidance-only boxed warning → added in doc 39 §10 <br>• No rollback / partial failure policy → added in doc 39 §11 |
| **Files Created (platform-ui)** | `docs/system-upgrade/39-ai-architecture-consistency-pass.md` |
| **Files Updated (platform-ui)** | `docs/system-upgrade/36-ai-action-platform.md` (deprecated sections marked §05/§06/§09/§11/§23/§35; voice_eligible fixes; header update), `docs/system-upgrade/14-decision-log.md` (ADR-026), `docs/system-upgrade/35-platform-capabilities-build-order.md` (consistency gate pre-R027), `docs/system-upgrade/15-action-backlog.md` (B1–B10 blocker tasks), `docs/system-upgrade/96-rounds-index.md`, `docs/system-upgrade/98-change-log.md` |
| **Decisions Proposed** | ADR-026: AI Architecture Consistency Pass |
| **Next Recommended Round** | Round 023 implementation: ActionButton + DetailView + PlatformFeatureFlags (unblocks Helpdesk Phase A). OR: B1 delegation token design if write-tier AI actions are prioritized. |

---

## Round 027 — Floating AI Assistant Architecture

| Field | Value |
|-------|-------|
| **Date** | 2026-04-24 |
| **Topic** | Global Floating AI Assistant — lazy AI context loading and persistent conversation continuity |
| **Objective** | Design the Floating AI Assistant component: globally visible, zero LLM calls while idle, conversation survives route changes, context diffs computed on navigation but sent only on explicit interaction. Doc-only. No code. |
| **Key Findings** | • Lazy loading is mandatory — LLM calls only on explicit user interaction (click, open, send, confirm, resume) <br>• Route change updates `currentPageId` + `lastPageContextHash` locally only — no LLM, no API <br>• `conversationId`, `activeObjective`, `pendingActionId` survive route changes; only page metadata updates <br>• `PageContextDiff` computed on navigation; sent to LLM only on next user message or workflow continuation; irrelevant diffs suppressed <br>• `AIAssistantSessionState` Zustand in-memory store — never localStorage (prevents auth-boundary leakage on shared devices) <br>• `PageAIContext` static per-page metadata via `useRegisterPageContext()` hook — no API call, permission-filtered before LLM <br>• `lastLLMContextHash` prevents re-sending unchanged context to LLM <br>• Org switch → full session reset; auth expiry → session clear <br>• 4 implementation phases: R032 (infra), R033 (LLM wiring), R034 (actions), R035 (voice) |
| **Files Created (platform-ui)** | `docs/system-upgrade/38-floating-ai-assistant.md` |
| **Files Updated (platform-ui)** | `docs/system-upgrade/36-ai-action-platform.md` (§41: frontend surface reference), `docs/system-upgrade/14-decision-log.md` (ADR-025), `docs/system-upgrade/26-platform-capabilities-catalog.md` (Global Floating AI Assistant capability entry), `docs/system-upgrade/35-platform-capabilities-build-order.md` (R032–R035 track + gate table), `docs/system-upgrade/15-action-backlog.md` (R032–R035 tasks: 39 items), `docs/system-upgrade/96-rounds-index.md`, `docs/system-upgrade/98-change-log.md` |
| **Decisions Proposed** | ADR-025: Global Floating AI Assistant and Page Context Registry |
| **Next Recommended Round** | Round 023 implementation: ActionButton + DetailView + PlatformFeatureFlags (unblocks Helpdesk Phase A) |

---

## Round 026 — AI Action Platform Hardening

| Field | Value |
|-------|-------|
| **Date** | 2026-04-24 |
| **Topic** | AI Action Platform documentation hardening — remove read-only ambiguity, add capability levels, full registry schema, viability checks, readiness checklist, delete policy |
| **Objective** | Ensure the AI Action Platform design is unambiguous about write/delete capability, has an actionable implementation gate, and fully defines service-account delegation rules. Doc-only. No code. |
| **Key Findings** | • AI is not read-only — full CREATE/UPDATE/DELETE_SOFT/CONFIGURE/APPROVE/EXECUTE/BULK/SYSTEM surface wherever user is authorized <br>• 10 capability levels with explicit role matrix, voice eligibility, rollback, audit requirements (§34) <br>• 25-field `AIActionDescriptor` + 10 registry examples (§35) <br>• Service account alone = READ only; all writes require signed delegated-human context (§36) <br>• 22-point execution viability check; fails closed on uncertainty (§37) <br>• Implementation readiness gate: 22 infra items + 22 tests (§38) <br>• Voice write/delete: DELETE_SOFT/CONFIGURE/BULK/SYSTEM never voice; read-back required; one action per turn (§39) <br>• Hard delete: disabled by default; requires system_admin + critical + retention policy + pre-delete export (§40) |
| **Files Updated (platform-ui)** | `docs/system-upgrade/36-ai-action-platform.md` (§33–§40 + header update), `docs/system-upgrade/14-decision-log.md` (ADR-023 updated + ADR-024 added), `docs/system-upgrade/26-platform-capabilities-catalog.md`, `docs/system-upgrade/35-platform-capabilities-build-order.md`, `docs/system-upgrade/15-action-backlog.md` (R027 expanded: 32 tasks), `docs/system-upgrade/96-rounds-index.md`, `docs/system-upgrade/98-change-log.md` |
| **Decisions Proposed** | ADR-024: AI Action Capability Levels + Write/Delete Policy |
| **Next Recommended Round** | Round 023 implementation: ActionButton + DetailView + PlatformFeatureFlags (unblocks Helpdesk Phase A) |

---

## Round 024 — AI Action Platform Architecture

| Field | Value |
|-------|-------|
| **Date** | 2026-04-24 |
| **Topic** | AI Delegated Action Platform — architecture, contracts, and security model |
| **Objective** | Design a generic AI Action Platform that lets conversational and voice agents (ALA, Helpdesk AI, Investigation Console) safely execute platform actions on behalf of authenticated users. Full spec + ADR. No runtime implementation. |
| **Key Findings** | • Existing system has two separate action planes that need bridging: `PlatformAction` (UI confirmation) + `AIAction` HTTP-callable model (org-defined) <br>• `ToolInvocation` + `ApprovalService` (helpdesk) can be reused for DESTRUCTIVE tier — no new approval queue needed <br>• Core invariant: AI agent always acts as proxy for authenticated human — never holds own permissions <br>• `AIActionConfirmationToken` single-use 120s token prevents replay attacks and parameter substitution <br>• Voice ceiling: `danger_level >= "high"` never executable via verbal confirm — requires dashboard approval <br>• Two-layer registry: static platform manifest (code) + dynamic org-level `AIAction` rows (DB) <br>• 5 implementation phases: R027 (registry+READ), R028 (confirmation+WRITE), R029 (voice), R030 (approval+DESTRUCTIVE), R031 (manifests+org config) <br>• 10 open questions documented (Q1–Q10) for follow-up |
| **Files Created (platform-ui)** | `docs/system-upgrade/36-ai-action-platform.md` |
| **Files Updated (platform-ui)** | `docs/system-upgrade/14-decision-log.md` (ADR-021 + ADR-022), `docs/system-upgrade/10-target-architecture.md` (AI Action Platform section), `docs/system-upgrade/24-core-platform-and-module-system.md` (§15 aiActions extension), `docs/system-upgrade/26-platform-capabilities-catalog.md` (AI Action Platform section), `docs/system-upgrade/35-platform-capabilities-build-order.md` (R027–R031 parallel track + gate table), `docs/system-upgrade/15-action-backlog.md` (16 backlog items across R027–R031), `docs/system-upgrade/96-rounds-index.md`, `docs/system-upgrade/98-change-log.md` |
| **Commits** | No code changes — architecture/planning round only |
| **Decisions Proposed** | ADR-021: Dangerous Action Standard (formalized) · ADR-022: AI Delegated Action Platform |
| **Next Recommended Round** | Round 023 implementation: ActionButton + DetailView extraction + PlatformFeatureFlags (unblocks Helpdesk Phase A) |

---

## Round 039 — Generic Platform Foundation Roadmap

**Date:** 2026-04-25
**Status:** Complete
**Output:** `docs/system-upgrade/47-generic-platform-foundation-roadmap.md`

### Mission
Planning and sequencing round. Define all required platform capabilities, current status, dependencies, correct build order, and master development plan for turning the system into a generic, extensible, AI-native organization platform.

### Key Decisions
- ADR-033: Generic Platform Foundation First — complete foundation before broad module dev
- ADR-034: AI-Native Generic Organization Platform — platform is generic, not helpdesk-only
- ADR-035: Data Sources & Knowledge Connections Platform — new platform domain (Pillar 6)
- 10 platform pillars defined
- 11 capability domains mapped (Identity, Tenant, Module, Data, AI, Data Sources, Integration, Operations, Billing, UX, DevOps)
- 12 P0 foundation gates identified that block all broad module development
- Next 10 rounds recommended (R040–R049)

### Files Created
- `docs/system-upgrade/47-generic-platform-foundation-roadmap.md` (new — 700+ line master roadmap)

### Files Updated
- `docs/system-upgrade/35-platform-capabilities-build-order.md`
- `docs/system-upgrade/15-action-backlog.md`
- `docs/system-upgrade/96-rounds-index.md`
- `docs/system-upgrade/98-change-log.md`
- `docs/system-upgrade/97-source-of-truth.md`
- `docs/system-upgrade/10-target-architecture.md`
- `docs/ARCHITECTURE.md`

---

## Round 039 addendum — Data Ownership, Artifacts & Tenant Storage Strategy

**Date:** 2026-04-25
**Status:** Complete

### Mission
Architecture/roadmap hardening. No code. Defined: existing DB-first migration principle, Platform Data & Artifact Registry (module data contracts), manifest `dataContract` extension, tenant storage modes (shared/dedicated/BYODB/hybrid), TenantDataStore/TenantDataRouter abstraction, S3 object storage strategy, export/import/install/upgrade lifecycle integration, BYODB safety rules.

### Key Decisions
- ADR-036: Existing DB First, Data Artifact Registry, Tenant Storage Modes
- Additive migration principle formalized — destructive migrations require 30d gate
- Every module must declare `dataContract` in manifest.v2.json
- 4 tenant storage modes defined; platform_managed_shared_db is default and only tested mode
- TenantDataRouter is a P3 future abstraction — module code must be written router-compatible today (always scope by org_id, never hardcode connection strings)
- BYODB = enterprise P3 feature only

### Files Updated
- `docs/system-upgrade/47-generic-platform-foundation-roadmap.md` (§21 added, ADR-036 added)
- `docs/system-upgrade/12-migration-roadmap.md`
- `docs/system-upgrade/24-core-platform-and-module-system.md`
- `docs/system-upgrade/45-module-manager-redesign.md`
- `docs/system-upgrade/35-platform-capabilities-build-order.md`
- `docs/system-upgrade/15-action-backlog.md`
- `docs/system-upgrade/96-rounds-index.md`
- `docs/system-upgrade/98-change-log.md`
- `docs/ARCHITECTURE.md`

---

## Round 040 — Module Manager Additive Schema Foundation

**Date:** 2026-04-25
**Commit:** `abdf3bc3` (platformengineer, branch: main)
**Status:** Complete ✅

### Mission
Implement R038B: additive multi-tenant schema foundation for the Module Manager redesign.
Backend only. No UI. No destructive changes. platform_managed_shared_db only.

### Models Added
- `ModuleVersion` — system-level version catalog (no org_id)
- `OrgModule` — per-org runtime state (replaces global is_enabled/is_installed)
- `OrgModuleSettings` — per-org module settings (JSONB)
- `ModuleDependency` — normalized dependency graph
- `ModuleLicense` — org entitlement scaffold

### Models Patched (additive only)
- `Module.system_status` column added (VARCHAR 30, default 'active')
- `ModuleLog.org_id` / `user_id` / `module_key` nullable compat FK columns added

### Migration Files (migrations/versions/)
- `20260425_add_module_versions.py` (down_revision=None)
- `20260425_add_org_modules.py` (chains to module_versions)
- `20260425_add_org_module_settings.py` (chains to org_modules)
- `20260425_add_module_dependencies.py` (down_revision=None)
- `20260425_add_module_licenses.py` (down_revision=None)
- `20260425_extend_module_logs.py` (down_revision=None)
- `20260425_add_module_system_status.py` (down_revision=None)

### Tests
43 structural tests in `apps/module_manager/tests/test_r040_schema.py` — all pass.
Pre-existing mapper error (`AgentAIChat`) noted — R040 is not the cause.

### Storage Constraint Verified
- No DROP / RENAME operations
- No BYODB / TenantDataStore / TenantDataRouter
- All org-scoped tables: org_id FK → organizations.id, non-nullable
- No hardcoded connection strings

### Deferred Items
- ModuleDependency seed from JSON blob → R038C (format unverified across modules)
- ModulePurchase → ModuleLicense backfill → R038I (org string not safely mappable)
- module_permissions seed → R038C

### Files Created/Updated (platformengineer)
- `apps/module_manager/models.py` (modified)
- `apps/module_manager/seeds.py` (new)
- `apps/module_manager/tests/__init__.py` (new)
- `apps/module_manager/tests/test_r040_schema.py` (new)
- 7× `migrations/versions/20260425_*.py` (new)

### Files Updated (platform-ui docs)
- `docs/system-upgrade/15-action-backlog.md`
- `docs/system-upgrade/96-rounds-index.md`
- `docs/system-upgrade/98-change-log.md`
- `docs/system-upgrade/35-platform-capabilities-build-order.md`

### Next Recommended Round
R041: CI enforcement + ActionButton extraction (independent, can start now)
OR: Apply R040 migrations to EKS DB, then R042 ModuleRegistry + CompatLayer

---

## Round 040-Control — Implementation Governance Setup

**Date:** 2026-04-25
**Commit:** TBD (platformengineer + platform-ui, branch: main)
**Status:** Complete ✅

### Mission
Process round — no product features, no schema, no UI.
Establish a lightweight but strict governance system so every future round is scoped, reviewable, testable, issue-linked, and checked against security/shared-capability rules.

### Files Created (platform-ui)
- `docs/system-upgrade/00-implementation-control-center.md` — main control center (first doc after CLAUDE.md)
- `docs/system-upgrade/99-risk-register.md` — 14 active risks with mitigations
- `docs/system-upgrade/01-round-review-checklist.md` — reviewer checklist (11 sections)
- `docs/system-upgrade/issues/R040-R049-issue-drafts.md` — issue bodies for R040–R049

### Files Created (platformengineer)
- `.github/ISSUE_TEMPLATE/platform-round.yml` — GitHub issue template for all future rounds
- `.github/pull_request_template.md` — updated PR template with governance sections

### Files Updated (platformengineer)
- `CLAUDE.md` — added §Implementation Governance (10-rule agent contract)

### Files Updated (platform-ui)
- `docs/system-upgrade/96-rounds-index.md` (this file)
- `docs/system-upgrade/98-change-log.md`
- `docs/system-upgrade/97-source-of-truth.md`
- `docs/system-upgrade/15-action-backlog.md`
- `docs/system-upgrade/35-platform-capabilities-build-order.md`

### Governance Artifacts Summary
- **Control Center** — active round, next 10 rounds, blockers, foundation gates, do-not-start-yet list, DoR, DoD
- **Risk Register** — 14 risks (R01–R14): scope creep, plan drift, missing tests, LLM bypass, tenant isolation regression, destructive migrations, BYODB premature, hardcoded nav, incomplete audit, incomplete billing, stale docs, out-of-order implementation, R040 migrations not applied, GitHub issues not created
- **Issue Template** — 14 fields: round ID, title, goal, scope, out-of-scope, dependencies, ACs, security checklist, shared capability checklist, tests, docs, risks, rollback plan, follow-ups
- **PR Template** — 9 sections: scope adherence, forbidden patterns, auth/RBAC, tenant isolation, audit, LLM, DB migration, tests, docs
- **Review Checklist** — 11 sections: scope, forbidden patterns, auth/RBAC, tenant isolation, audit, billing/LLM, DB migration, tests, shared capability, docs, PR quality

### Tests
No tests required — governance/process round.

### Next Recommended Round
R041: CI enforcement + ActionButton extraction (ready to start)
Pre-requisite: apply R040 migrations to EKS DB before R042/R043/R045
