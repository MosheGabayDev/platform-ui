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

## Upcoming Rounds (Proposed)

| Round | Topic | Why Now |
|-------|-------|---------|
| **005** | Authentication bridge | ✅ Complete — design in `16-auth-bridge-design.md` |
| **006** | AI-maintainability policy | ✅ Complete — policy in `23-ai-maintainability-and-code-cleanup.md` |
| **007** | Auth implementation (Phase A) | Implement next-auth, login page, middleware, proxy Bearer |
| **008** | Module 01: Users | First critical module, no dependencies |
| **009** | Module 04: Helpdesk | Largest module, most business value |
| **010** | SSE infrastructure | Enables live data across all future modules |
| **011** | CI/CD pipeline for platform-ui | Required before shipping to production |
