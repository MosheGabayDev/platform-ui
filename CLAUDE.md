# Platform UI — AI Agent Instructions

> Every AI working on this project MUST read this file completely before writing any code.
> Last updated: 2026-04-23

---

## Project Identity

**Platform Engineer UI** — AI-powered IT platform dashboard for MSP operators.
- RTL-first (Hebrew default), supports Arabic + English
- Dark mode default, light mode available
- Mobile-first responsive (320px → 1920px)
- Target audience: IT admins, platform engineers, MSP operators

---

## Must-Read Before Coding

1. [`docs/design/DESIGN_SYSTEM.md`](docs/design/DESIGN_SYSTEM.md) — visual language, colors, spacing, typography
2. [`docs/design/TOKENS.md`](docs/design/TOKENS.md) — CSS variables, animation timing, z-index scale
3. [`docs/design/ANIMATIONS.md`](docs/design/ANIMATIONS.md) — motion rules + full Framer Motion variant library
4. [`docs/design/COMPONENTS.md`](docs/design/COMPONENTS.md) — all component patterns and anti-patterns
5. [`docs/design/MOBILE.md`](docs/design/MOBILE.md) — mobile rules, PWA, iOS Safari specifics
6. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — full system architecture blueprint

---

## Hard Rules (NEVER BREAK)

### RTL / Layout
- **RTL always**: `ps-`/`pe-` not `pl-`/`pr-`, `ms-`/`me-` not `ml-`/`mr-`, `start-`/`end-` not `left-`/`right-`
- **No inline left/right**: use `inset-inline-start`/`inset-inline-end` or Tailwind logical equivalents
- **Sidebar**: always `side="right"` (RTL — sidebar is on the right)
- **Mobile padding**: every page inside `(dashboard)` MUST have `pb-20 md:pb-0` to clear bottom nav

### Styling
- **No hardcoded colors**: use CSS variables via Tailwind (`text-primary`, `bg-muted`, etc.)
- **Glass cards**: `className="glass border-border/50"` — never inline `backdropFilter`
- **Fonts**: Hebrew → Rubik (`var(--font-rubik)`), Arabic → Cairo (`var(--font-cairo)`)
- **No `text-white`**: use `text-foreground` or `text-primary-foreground`
- **No `bg-gray-*`**: use `bg-background`, `bg-card`, `bg-muted`

### React / Next.js
- **Hydration safety**: ANY theme-dependent rendering MUST guard with `mounted` state:
  ```tsx
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null; // or safe fallback
  ```
- **`"use client"` rule**: only add where truly needed (interactivity, hooks, browser APIs)
- **`suppressHydrationWarning`**: required on `<html>` and `<body>` in root layout

### Framer Motion
- **Always wrap pages** with `<LazyMotion features={domAnimation}>` — reduces bundle ~50%
- **`ease` constant** typed as `[number,number,number,number]`:
  ```ts
  const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];
  ```
- **Never animate** `width`/`height` — use `scale` or `maxHeight`
- **Max duration**: 0.5s for content animations

### Data Fetching (TanStack Query)
- **All server data** via `useQuery` — never raw `fetch` in components
- **Query keys** defined in `lib/api/query-keys.ts` — never inline strings
- **API calls** in `lib/api/client.ts` — never scattered in components
- **Proxy**: all Flask calls go through `/api/proxy/[...path]` — never call Flask directly from client
- **Refetch intervals**: stats 60s, health 30s, timeseries 120s

### Components / Architecture
- **`components/ui/`**: DO NOT MODIFY — shadcn/ui primitives, copy-paste only
- **`components/shared/`**: custom reusable components (TiltCard, CursorGlow, EmptyState, DataTable, Skeletons)
- **`components/shell/`**: layout chrome only (Sidebar, Topbar, BottomNav, AuroraBackground)
- **`components/providers/`**: React context providers (QueryProvider, etc.)

---

## Tech Stack

| Layer | Library | Version | Notes |
|---|---|---|---|
| Framework | Next.js App Router | 16.x | `app/` directory, RSC + client components |
| React | React | 19.x | |
| Styling | Tailwind CSS | v4 | Logical properties, RTL-native |
| Components | shadcn/ui (Radix) | latest | Init with `--rtl` flag |
| Animations | Framer Motion | 12.x | LazyMotion always |
| Global state | Zustand + persist | 5.x | `lib/theme-store.ts`, `lib/hooks/use-nav-history.ts` |
| Server state | TanStack Query | 5.x | QueryProvider in root layout |
| Tables | TanStack Table | 8.x | Headless, styled with Tailwind |
| Charts | Recharts | 3.x | Sparklines + area charts |
| Forms | React Hook Form + Zod | 7.x + 4.x | |
| Icons | Lucide React | latest | Never raw `<svg>` |

---

## File Structure

```
app/
  (auth)/              — public pages: login, reset-password
  (dashboard)/         — protected pages with sidebar shell
    layout.tsx         — QueryClient + LazyMotion + AnimatePresence + keyboard shortcuts
    page.tsx           — dashboard home (useQuery for real data)
  api/proxy/[...path]/ — Next.js proxy → Flask (cookie-forwarding)
  layout.tsx           — root: fonts, ThemeProvider, QueryProvider
  globals.css          — CSS variables, aurora keyframes, .glass helper

components/
  ui/                  — shadcn/ui primitives (READ ONLY — never modify)
  shell/               — layout chrome
    app-sidebar.tsx    — RTL sidebar: search, pinned, recent, collapsible groups
    topbar.tsx         — sticky header: search button, theme, accent, notifications, connection indicator
    bottom-nav.tsx     — mobile only (md:hidden), spring layoutId indicator
    aurora-background.tsx — CSS animated blobs
    command-palette.tsx — Ctrl+K global command palette (17 routes)
    connection-indicator.tsx — real-time latency dot in topbar
    sidebar-search.tsx — inline sidebar search with ↑↓↵ keyboard nav
    shortcuts-dialog.tsx — ? key shortcut cheat-sheet
    accent-picker.tsx  — 6 accent colors, applies via CSS variable
  shared/              — reusable cross-module components
    tilt-card.tsx      — 3D perspective tilt on hover (disabled on touch)
    cursor-glow.tsx    — radial spotlight following cursor (desktop only)
    empty-state.tsx    — animated icon + title + description + action
    data-table.tsx     — sort + filter + paginate (uses @tanstack/react-table)
    skeleton-card.tsx  — StatCardSkeleton, FeedItemSkeleton, ServiceRowSkeleton, TableSkeleton
  providers/
    query-provider.tsx — QueryClient with default options
    session-provider.tsx — NextAuthSessionProvider client wrapper (wraps next-auth SessionProvider)

lib/
  auth/
    types.ts           — Flask response types, NormalizedAuthUser, next-auth Session/JWT augmentation
    options.ts         — authOptions (Credentials provider, jwt callback with refresh, session callback)
    rbac.ts            — hasRole, hasPermission, getOrgId — use everywhere for RBAC checks
  api/
    client.ts          — typed fetch functions (fetchDashboardStats, fetchTimeSeries, fetchServiceHealth)
    types.ts           — TypeScript interfaces for all API responses
    query-keys.ts      — centralized query key registry
  hooks/
    use-count-up.ts    — rAF number animation with ease-out cubic
    use-keyboard-shortcuts.ts — g+d/u/t/a navigation, ? shortcut
    use-nav-history.ts — Zustand persist for recent + pinned nav items
  theme-store.ts       — Zustand persist for accent color (6 options)
  utils.ts             — shadcn cn() utility

docs/
  design/              — design system (update after EVERY design decision)
  ARCHITECTURE.md      — full architecture blueprint (§1-20)

public/
  manifest.json        — PWA manifest (RTL, Hebrew, dark theme)
  icons/               — PWA icons (192px, 512px)
```

---

## API Proxy Pattern

All Flask API calls flow through the Next.js proxy:

```ts
// ✅ Correct — via proxy
const data = await fetch("/api/proxy/ai-settings/stats");

// ❌ Wrong — direct Flask call (CORS issues + no cookie forwarding)
const data = await fetch("http://localhost:5000/api/ai-settings/stats");
```

Proxy URL mapping (`app/api/proxy/[...path]/route.ts`):
| Proxy path | Flask path |
|---|---|
| `/api/proxy/ai-settings/*` | `/api/ai-settings/*` |
| `/api/proxy/monitoring/*` | `/admin/api/monitoring/*` |
| `/api/proxy/admin/*` | `/admin/api/*` |

Flask URL configured via `FLASK_API_URL` env var (`.env.local` for dev, `.env.production` for prod).

---

## Data Fetching Pattern

```tsx
// ✅ Correct
import { useQuery } from "@tanstack/react-query";
import { fetchDashboardStats } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { StatCardSkeleton } from "@/components/shared/skeleton-card";

const { data, isLoading, error } = useQuery({
  queryKey: queryKeys.dashboardStats,
  queryFn: fetchDashboardStats,
  refetchInterval: 60_000,
});

// Show skeleton during load
if (isLoading) return <StatCardSkeleton />;
// Show error badge on failure — never crash
if (error) return <ErrorBadge />;
```

---

## Keyboard Shortcuts Convention

| Shortcut | Action |
|---|---|
| `g` + `d` | Dashboard |
| `g` + `u` | Users |
| `g` + `t` | Tickets |
| `g` + `a` | Agents |
| `g` + `h` | Helpdesk |
| `g` + `s` | Settings |
| `/` | Focus sidebar search |
| `Ctrl+K` or `⌘K` | Open command palette |
| `?` | Show shortcuts dialog |

---

## Sidebar Rules

- Search: `SidebarSearch` component handles `/` shortcut, ↑↓↵ keyboard nav, fuzzy match, highlight
- Pinned items: `useNavHistory` Zustand store, persisted to localStorage
- Recent pages: auto-tracked on every route change via `useTrackNavHistory()`
- Groups: collapsible — first 2 open by default, rest closed
- Active item: `shadow-[inset_-2px_0_0_0_hsl(var(--primary))]` + glow bg with `layoutId`

---

## When to Update These Docs

| Trigger | File to update |
|---|---|
| New color / CSS token | `docs/design/TOKENS.md` |
| New animation variant | `docs/design/ANIMATIONS.md` |
| New component pattern or anti-pattern | `docs/design/COMPONENTS.md` |
| Mobile behavior change | `docs/design/MOBILE.md` |
| Major visual/architecture direction | `docs/design/DESIGN_SYSTEM.md` + `docs/ARCHITECTURE.md` |
| New hard rule for AI agents | This file (`CLAUDE.md`) |
| New API endpoint or proxy route | `lib/api/client.ts` + `lib/api/types.ts` + `lib/api/query-keys.ts` |
| New page / module | Update file structure above |

---

## Shared Capabilities Enforcement (MANDATORY before any new module code)

> **ADR-028** — All new module code must use the approved shared capabilities. No local workarounds. Full spec: `docs/system-upgrade/43-shared-services-enforcement.md`

**Before writing or modifying any module code, read:**
1. `docs/system-upgrade/43-shared-services-enforcement.md` — contract rules, canonical paths, blacklist, exception policy
2. `docs/system-upgrade/26-platform-capabilities-catalog.md` — shared capability catalog (check before building anything new)
3. `docs/system-upgrade/35-platform-capabilities-build-order.md` — build order and capability status

Do not create local replacements for capabilities listed in the catalog.

**AI-agent checklist — run before writing any component, hook, or page:**

```
BEFORE ADDING ANY COMPONENT OR PAGE:

1. Tables: DataTable<T> from components/shared/data-table/ — NEVER custom table shell
2. Forms: PlatformForm + usePlatformMutation + Zod in lib/modules/<module>/schemas.ts
3. Mutations: usePlatformMutation — NEVER inline useState(loading) + catch + toast pattern
4. Permissions: PermissionGate + usePermission() — NEVER session.user.role === inline
5. Layout: PageShell + DetailView components — NEVER custom per-page header
6. Dangerous actions: ConfirmActionDialog — NEVER window.confirm() or alert()
7. API calls: lib/api/<module>.ts + queryKeys — NEVER fetch() directly in components
8. Query keys: queryKeys.<module>.* — NEVER inline ["users"] string arrays
9. org_id: from session only — NEVER in form state or request body for auth
10. LLM: backend AIProviderGateway.call() only — NEVER provider SDK in frontend

CHECK CATALOG FIRST:
- docs/system-upgrade/26-platform-capabilities-catalog.md
- docs/system-upgrade/25-open-source-capability-layer.md

IF BLOCKED BY MISSING SHARED CAPABILITY:
- Add backlog task to docs/system-upgrade/15-action-backlog.md
- Build shared capability first, then the module
- If urgent: document exception in docs/system-upgrade/43-shared-services-enforcement.md §Appendix A
```

## Definition of Done (every task)

- [ ] No physical CSS direction classes (`pl-`, `pr-`, `ml-`, `mr-`, `left-`, `right-`)
- [ ] No hardcoded color values
- [ ] `mounted` guard on theme-dependent rendering
- [ ] `pb-20 md:pb-0` on all new dashboard pages
- [ ] Loading state via Skeleton component
- [ ] Error state handled (badge or EmptyState — never crash)
- [ ] Build passes: `npm run build` with zero errors
- [ ] CLAUDE.md file structure updated if new files added
