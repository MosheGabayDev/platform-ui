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
