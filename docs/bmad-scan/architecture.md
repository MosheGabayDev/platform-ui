# Architecture — platform-ui (BMAD scan)

**Generated:** 2026-05-01.
**Authoritative source:** `docs/ARCHITECTURE.md` (Next.js architecture blueprint) and `docs/system-upgrade/01-foundations/10-architecture-target.md` (target full-stack). This file is a BMAD-style summary for AI agent retrieval.

## Executive summary

Next.js 16 App Router web application. Layered: shell + page + module + shared + lib. All Flask backend calls flow through a single proxy route for cookie/JWT forwarding. Data fetching is server-state-first via TanStack Query; UI state lives in component-local React state and Zustand stores for cross-component preferences only.

## Layer diagram

```
┌──────────────────────────────────────────────────────────────┐
│ app/(auth)/                  app/(dashboard)/                │
│ login, reset-password        sidebar shell + module pages    │
└──────────────────────────────────────────────────────────────┘
                ↓                          ↓
┌──────────────────────────────────────────────────────────────┐
│  components/shell/        components/modules/<key>/          │
│  Sidebar, Topbar,         module-specific UI (users, orgs,   │
│  BottomNav, Aurora,       roles)                             │
│  CommandPalette,                                             │
│  NotificationBell                                            │
└──────────────────────────────────────────────────────────────┘
                ↓                          ↓
┌──────────────────────────────────────────────────────────────┐
│            components/shared/ + components/ui/               │
│  DataTable, Form, ActionButton, DetailView, KpiCard,         │
│  Timeline, FeatureGate, PermissionGate, ConfirmActionDialog, │
│  ErrorBoundary, EmptyState, Skeleton (READ-ONLY ui/)         │
└──────────────────────────────────────────────────────────────┘
                ↓                          ↓
┌──────────────────────────────────────────────────────────────┐
│  lib/hooks/        lib/api/       lib/modules/<key>/         │
│  useAuth,          query-keys,    types, hooks, schemas      │
│  useFeatureFlag,   client.ts,                                │
│  useDangerousAction,users.ts, …                              │
│  use-platform-     proxied → Flask                           │
│  mutation                                                    │
└──────────────────────────────────────────────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────────────┐
│             app/api/proxy/[...path]/route.ts                 │
│  Forwards cookies + JWT to Flask (FLASK_API_URL).            │
│  PATH_MAP routes /api/proxy/X → /api/X or /admin/api/X       │
│  per backend convention.                                     │
└──────────────────────────────────────────────────────────────┘
                                ↓
                       Flask (platformengineer)
```

## Core architectural rules

1. **All Flask calls go through `/api/proxy/[...path]`.** Never fetch Flask directly from a component or hook.
2. **All server data through TanStack Query.** Never raw `fetch` in components.
3. **Query keys are centralized** in `lib/api/query-keys.ts` — never inline strings.
4. **API client functions are centralized** in `lib/api/<module>.ts`. Components consume hooks, hooks call clients.
5. **Mutations go through `usePlatformMutation`** — never inline `useState(loading) + try/catch + toast`.
6. **Permission checks use `PermissionGate` / `usePermission()`** — never inline `session.user.role === "admin"`.
7. **Feature flags use `FeatureGate` / `useFeatureFlag()`** with fail-closed behavior.
8. **Dangerous actions use `ConfirmActionDialog` + `useDangerousAction`** — never `window.confirm`/`alert`.
9. **Tables use `DataTable<T>`** — never custom `<table>` shells.
10. **Forms use `PlatformForm` + Zod schema** in `lib/modules/<key>/schemas.ts`.
11. **org_id never comes from request body or form state** — always from session.
12. **No LLM SDK in frontend.** All AI calls go through Flask `AIProviderGateway.call()`.

Full rule set: `docs/system-upgrade/02-rules/development-rules.md`.

## Data flow (typical page render)

1. Page component (`app/(dashboard)/<route>/page.tsx`) calls `useQuery({ queryKey, queryFn })` from `lib/api/<module>.ts`.
2. `queryFn` calls `fetch("/api/proxy/...")` — same-origin, browser sends session cookie.
3. `app/api/proxy/[...path]/route.ts` resolves path, forwards request to `${FLASK_API_URL}/...` with cookies + JWT.
4. Flask responds JSON.
5. Proxy passes through; TanStack Query caches with `staleTime` per key.
6. Page renders; `Skeleton` while loading, `ErrorBoundary` + `EmptyState` on failures.

## Authentication

`next-auth` Credentials provider (`lib/auth/options.ts`) talks to Flask login endpoint. JWT callback refreshes on expiry. Session contains `user.role`, `user.org_id`, `user.permissions` for RBAC checks. Proxy forwards the session cookie + a JWT bearer token; Flask trusts both.

## State management map

| Concern | Where |
|---|---|
| Server data (users list, ticket detail, …) | TanStack Query cache |
| Form state | React Hook Form |
| Theme + accent | Zustand persist (`lib/theme-store.ts`) |
| Nav history (recent + pinned) | Zustand persist (`lib/hooks/use-nav-history.ts`) |
| Command palette open/close | Zustand (`lib/hooks/use-command-palette.ts`) |
| Page-local UI | React component state |

## RTL + i18n

Tailwind v4 logical properties everywhere. Hebrew is default; Rubik font (`var(--font-rubik)`) for he/en, Cairo (`var(--font-cairo)`) for ar. `next-intl` for messages; module strings live in `messages/he.json` etc.

## Testing strategy

- **Unit:** Vitest (planned for `lib/api/`, `lib/hooks/`, utilities — Phase 1 deliverable).
- **E2E:** Playwright (`playwright.config.ts` + `tests/e2e/`). Smoke tests for dashboard + users live; expansion per `docs/system-upgrade/02-rules/testing-standard.md`.
- **Security tests** mandatory per round (auth, RBAC, tenant isolation, audit, AI governance) — see `02-rules/testing-standard.md`.

## Build + deploy

- `npm run build` — Next.js production build.
- `npm run start` — production server.
- `npm run dev` — dev server.
- `npm run typecheck` — strict TS check.
- `npm run test:e2e` — Playwright run.
- Production deploy: containerized → ECR → EKS via GitHub Actions (`cd-deploy-dual.yml` in platformengineer repo coordinates frontend + backend).

## Architecture-level concerns and current gaps

(From `docs/system-upgrade/01-foundations/05-architecture-current.md` and the master-roadmap P0 gates.)

- **Module boundary enforcement** not yet active in CI (planned R041A).
- **Navigation API** not built — sidebar nav is hardcoded (planned R044).
- **Feature flag engine** partial — `FeatureGate` consumes a stub today (R045 backend pending).
- **AI Provider Gateway** built backend-side, not universally wired; 55+ direct LLM imports remain (R048 cleanup).
- **Data Sources Hub** not yet started (R049).

## See also

- Full target architecture: `docs/system-upgrade/01-foundations/10-architecture-target.md`
- Capability catalog: `docs/system-upgrade/04-capabilities/catalog.md`
- AI specs: `docs/system-upgrade/05-ai/`
- Runtime/deployment topology: `docs/system-upgrade/04-capabilities/runtime-deployment.md`
