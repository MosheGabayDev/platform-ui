# Project Overview — platform-ui

**Generated:** 2026-05-01 by BMAD `bmad-document-project` (Deep Scan, brownfield mode)

## What this project is

`platform-ui` is the Next.js frontend rewrite of `platformengineer` — an AI-native generic organization platform for any kind of organization (IT/MSP, helpdesk, knowledge management, sales, voice support, automation, …). The platform itself ships no domain logic; everything is delivered as modules.

Three foundational principles (from `docs/system-upgrade/03-roadmap/master-roadmap.md`):
1. AI is the primary interaction layer.
2. Every cross-module concern is a platform service (auth, RBAC, billing, audit, notifications, files, search, AI gateway).
3. Modules extend, never fork the core.

## Repository type

**Monolith.** Single Next.js app under one git repo. The backend (`platformengineer`, Flask) lives in a separate repo and is read-only legacy reference during the rewrite.

## Tech stack at a glance

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.x |
| UI runtime | React | 19.x |
| Styling | Tailwind CSS | v4 (logical properties, RTL-native) |
| Components | shadcn/ui (Radix) | latest |
| Animations | Framer Motion | 12.x (LazyMotion always) |
| Server state | TanStack Query | 5.x |
| Tables | TanStack Table | 8.x |
| Global state | Zustand + persist | 5.x |
| Auth | next-auth (Credentials → Flask) | 4.x |
| i18n | next-intl | 4.x |
| Forms | React Hook Form + Zod | 7.x + 4.x |
| Charts | Recharts | 3.x |
| Icons | Lucide React | latest |
| E2E tests | Playwright | 1.59 |

## Architecture pattern

**Component-based + proxy-mediated data fetching.** All Flask calls flow through `app/api/proxy/[...path]` for cookie/JWT forwarding. State is server-state-first (TanStack Query) with Zustand only for cross-component preferences (theme, accent, nav history).

## Key constraints (from CLAUDE.md)

- **RTL-first:** Hebrew default, also Arabic + English. Use logical CSS properties only (`ps-`/`pe-`, `ms-`/`me-`, `start-`/`end-`).
- **Dark mode default**, light available.
- **Mobile-first** (320 → 1920 px), `pb-20 md:pb-0` on every dashboard page.
- **Hydration-safe:** any theme-dependent rendering must guard with `mounted` state.
- **Single-trunk workflow:** work directly on `master`. No feature branches, no worktrees, no PRs (CLAUDE.md §Workflow Rules).

## Where to look

| You want to know about | Read |
|---|---|
| The plan | `docs/system-upgrade/03-roadmap/master-roadmap.md` |
| The active round | `docs/system-upgrade/00-control-center.md` |
| Atomic tasks | `docs/system-upgrade/10-tasks/` |
| Design system | `docs/design/DESIGN_SYSTEM.md` |
| AI agent rules | `CLAUDE.md` (root) |
| Architecture (this scan) | `architecture.md` (sibling) |
| Source tree (this scan) | `source-tree-analysis.md` (sibling) |
| Components (this scan) | `component-inventory.md` (sibling) |
