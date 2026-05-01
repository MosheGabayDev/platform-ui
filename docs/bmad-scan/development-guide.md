# Development Guide — platform-ui

**Generated:** 2026-05-01 (BMAD Deep Scan).

## Prerequisites

- **Node.js** 20+ (Next.js 16 requirement)
- **npm** (or pnpm/yarn — repo uses npm by default per `package-lock.json`)
- **Flask backend** (`platformengineer`) accessible — defaults to `http://localhost:5000` (override via `FLASK_API_URL` env)

## First-time setup

```bash
git clone git@github.com:MosheGabayDev/platform-ui.git
cd platform-ui
npm install
cp .env.example .env.local   # if present; otherwise create per below
```

### Required env vars

| Var | Purpose |
|---|---|
| `FLASK_API_URL` | Backend base URL (default `http://localhost:5000`) |
| `NEXTAUTH_SECRET` | next-auth JWT signing secret (production: from SSM) |
| `NEXTAUTH_URL` | Public URL for callbacks (default `http://localhost:3000`) |

Production: secrets injected from AWS SSM Parameter Store via K8s Secret → pod env. Dev: `.env.local`.

## Daily workflow (single-trunk on master)

Per `CLAUDE.md §Workflow Rules`:

```bash
git pull --ff-only origin master
# pick one task from docs/system-upgrade/10-tasks/<round>/tasks/T0X.md
# implement
npm run build      # must be green
npm run typecheck  # must be EXIT 0
npm run test:e2e   # must pass
git add -A
git commit -m "type(scope): summary"
git push origin master
```

No feature branches. No PRs. No worktrees. Hotfix forward.

## Common commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start Next.js dev server (Turbopack) on `:3000` |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` (strict TS check) |
| `npm run test:e2e` | Playwright E2E run |
| `npm run test:e2e:ui` | Playwright with UI |

## Code conventions (must read before writing code)

1. **Hard rules** — `CLAUDE.md §Hard Rules` (RTL, styling, hydration, Framer Motion, data fetching, components/architecture).
2. **Development rules** — `docs/system-upgrade/02-rules/development-rules.md`.
3. **Shared services contract (ADR-028)** — `docs/system-upgrade/02-rules/shared-services.md`. Use shared capabilities — never local replacements.
4. **Design system** — `docs/design/DESIGN_SYSTEM.md`, `TOKENS.md`, `ANIMATIONS.md`, `COMPONENTS.md`, `MOBILE.md`.

## Per-task workflow

1. Open the task file: `docs/system-upgrade/10-tasks/<round>/tasks/T{NN}-<name>.md`.
2. Verify Definition of Ready in the round's `epic.md`.
3. Implement only what's in the task scope.
4. Run `npm run build` + relevant tests.
5. Update `epic.md` Tasks list `[ ] → [x]`.
6. Commit + push to `master`.
7. If task closes the round: update `00-control-center.md`, `09-history/rounds-index.md`, `09-history/change-log.md`, `03-roadmap/action-backlog.md`.

## Adding a new module

1. Confirm `docs/modules/<key>/LEGACY_INVENTORY.md` exists (per `02-rules/legacy-inventory.md`).
2. Create `docs/modules/<key>/E2E_COVERAGE.md` per `02-rules/e2e-coverage.md`.
3. Create `docs/modules/<key>/AI_READINESS.md` per `02-rules/development-rules.md §6`.
4. Create the round folder: `10-tasks/<round-id>-<slug>/epic.md`.
5. Implement following the shared-capability-first rule.
6. Wire route under `app/(dashboard)/<key>/`, types in `lib/modules/<key>/`, API client in `lib/api/<key>.ts`.

## Common pitfalls

- **RTL violation:** Using `pl-`/`pr-` instead of `ps-`/`pe-` — the linter doesn't catch this. Manual review required.
- **Inline query keys:** `useQuery({ queryKey: ["users"] })` — ALWAYS use `queryKeys.users.list(filters)` from `lib/api/query-keys.ts`.
- **Direct Flask call:** `fetch("http://localhost:5000/...")` — must go through `/api/proxy/[...path]`.
- **Direct LLM SDK in frontend:** never. AI calls go through Flask `AIProviderGateway`.
- **`window.confirm`:** never. Use `ConfirmActionDialog` + `useDangerousAction`.
- **Hydration mismatch:** theme-dependent rendering without `mounted` guard.
- **org_id from form state:** never. Always from session via `lib/auth/rbac.ts getOrgId()`.

## Debugging

- TanStack Query devtools: `<ReactQueryDevtools />` in `QueryProvider`. Open with the floating button in dev mode.
- React Hook Form: `formState.errors` shows current validation errors.
- Network tab: see `/api/proxy/...` calls (cookies attached) — confirm Flask response shape.
- Playwright trace viewer: `npx playwright show-trace test-results/.../trace.zip`.

## Performance budgets

- New TS file: ≤ 200 lines.
- New Python file (platformengineer side): ≤ 300 lines.
- Bundle: track via `next build` output; flag PR if any chunk grows >10% without justification.
- Animation duration: max 0.5s for content; never animate `width`/`height` (use `scale` or `maxHeight`).
