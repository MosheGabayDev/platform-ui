# 05 — UI/UX and Frontend Assessment

_Last updated: 2026-04-23_

---

## Current State: Two Parallel Worlds

The system has two simultaneous frontend surfaces:

1. **Jinja2 templates** (legacy, in `templates/`) — server-rendered, 20+ template directories, in production
2. **platform-ui** (new, this repository) — Next.js 16, early scaffold, not yet connected

Additionally, 4 embedded Vite apps (`ai-agents-ui`, `ala-ui`, `ops-ui`, `dyn-dt-ui`) exist as islands within the Jinja2 world.

---

## Jinja2 Layer Analysis

### Structure

```
templates/
├── accounts/     — user/org management
├── admin/        — system admin views
├── agents/       — AI agent investigation UI
├── ala/          — AI Life Assistant interface
├── charts/       — charts, dashboard widgets
├── helpdesk/     — ticket management
├── home/         — landing/dashboard
├── layouts/      — base templates
├── logging_management/ — log viewer
├── search/       — search interface
└── [10+ more]
```

### Consistency

- No shared design system — visual language varies module-to-module
- Mix of Bootstrap-era styles and newer Tailwind additions
- No consistent spacing, typography, or color system
- Form patterns differ across modules

### RTL

- Primary user base is Hebrew-speaking; `lang="he" dir="rtl"` is set in `platform-ui`'s layout.tsx
- Evidence of RTL awareness in `platform-ui` but cannot confirm Jinja2 templates are RTL-correct
- Hebrew text appears in nav items of `platform-ui` and login page

### Responsiveness

- Unknown from codebase alone — Jinja2 templates not fully inspected
- Bootstrap classes suggest basic responsiveness but likely desktop-first

### Accessibility

- No evidence of systematic a11y (ARIA labels, focus management, screen reader testing)
- Radix UI in `platform-ui` brings a11y primitives, but usage not verified for completeness

---

## platform-ui Current State

### What Exists (as of 2026-04-23)

| Component | Status |
|-----------|--------|
| Dashboard layout (sidebar, topbar, bottom nav) | Built |
| Animated page transitions (Framer Motion) | Built |
| Dark mode | Built |
| RTL layout (`dir="rtl"`, `lang="he"`) | Built |
| Hebrew + Arabic fonts (Rubik, Cairo) | Built |
| Command palette (`⌘K`) | Built (shell) |
| Keyboard shortcuts system | Built |
| Sidebar with Hebrew nav groups | Built |
| Dashboard stats page (with charts) | Built (fetches real data) |
| Login page | Built (stub — no real auth wired) |
| API proxy route (`/api/proxy`) | Built |
| TanStack Query + QueryProvider | Built |
| shadcn/ui component library | Partial (15 components) |
| Shared components (TiltCard, CursorGlow, Skeletons) | Built |

### What Is Missing

| Gap | Priority |
|-----|----------|
| Real authentication (next-auth → Flask session) | Critical |
| All non-dashboard pages (users, helpdesk, agents, ALA, etc.) | High |
| Real-time updates (investigation status, voice calls) | High |
| Role-based page guards | High |
| i18n strings (content not yet localized) | Medium |
| Form flows (create ticket, create org, etc.) | Medium |
| Mobile layout testing | Medium |
| Accessibility audit | Medium |
| PWA full setup (manifest, service worker) | Low-medium |

### Architecture Quality (platform-ui)

**Positive observations:**
- Route groups `(auth)` and `(dashboard)` — correct App Router pattern
- API client abstraction in `lib/api/client.ts` via proxy route — correct
- Query keys centralized in `lib/api/query-keys.ts` — correct
- Types defined in `lib/api/types.ts` — correct, but manually maintained
- `LazyMotion` for Framer — performance-conscious
- Zustand theme store in `lib/theme-store.ts`

**Gaps:**
- Login form has no real submit logic — `setTimeout(1000)` only
- API proxy at `/api/proxy` not yet implemented as a real Next.js route handler
- No error boundaries
- No loading state for non-skeleton cases

---

## Is Creating a New Dedicated UI Repository a Good Idea?

**Yes — strongly recommended, and already started correctly.**

### Reasons:

1. **Jinja2 has hit its ceiling.** The backend has a level of sophistication (autonomous agents, voice AI, real-time investigation, complex approval flows) that requires a reactive, component-driven UI. Server-rendered HTML cannot express this adequately.

2. **Independent release cadence.** Frontend and backend need to ship independently. Flask monolith releases should not block UI improvements.

3. **Design system first.** With shadcn/ui + Radix + Tailwind, `platform-ui` has the foundation for a consistent, accessible design system that the Jinja2 templates never had.

4. **RTL-first from the ground up.** Starting fresh allows building RTL correctly, not as an afterthought.

5. **Type safety across the boundary.** A dedicated frontend repo enables generated API types (via OpenAPI → TypeScript codegen), which Jinja2 templates could never have.

6. **Technology alignment.** The team is already using React (4 embedded Vite apps). Consolidating into one React codebase reduces context switching.

### Risk to manage:

The biggest risk is **running two UI systems indefinitely**. Every page migrated to `platform-ui` must have the Jinja2 equivalent removed. The migration must be feature-complete per domain area before going live — avoid shipping hybrid pages where half the flow is Next.js and half is Jinja2.

---

## Friction Points (Inferred)

1. **Investigation live status** — no real-time updates means users must refresh to see AI investigation progress
2. **Voice call management UI** — complex state machine (active, paused, waiting_approval) not visible in real-time
3. **Approval workflow UI** — technician must be notified of pending approvals; push/SSE needed
4. **Multi-org switching** — system admins work across orgs; context switching likely manual
5. **Hebrew layout inconsistencies** — mixing LTR code blocks with RTL prose in same page

---

## Cross-Platform Readiness

| Platform | Current State |
|----------|--------------|
| Web (desktop) | Jinja2: functional. platform-ui: in progress |
| Web (mobile browser) | Likely degraded; bottom nav in platform-ui suggests awareness |
| Native Android | React Native app exists |
| Native iOS | Not built |
| Desktop app | Not built |
| PWA | platform-ui has `manifest.json` + apple-touch-icon + mobile meta tags — PWA-ready scaffold |
