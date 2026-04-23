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
