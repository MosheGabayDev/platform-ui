# Platform UI — Deep Upgrade Roadmap

_Generated: 2026-04-24_
_Baseline: Next.js 16.2.4, React 19.2.4, Tailwind v4, shadcn/ui, Framer Motion 12, TanStack Query v5_

---

## 1. Executive Summary

- **Biggest win (Tier 1):** An AI command bar inside the existing `CommandPalette` (`components/shell/command-palette.tsx`) converts Ctrl+K from a page-navigator into a natural-language operator — zero new routes required, ships in one day.
- **Biggest win (Tier 2):** A single `useServerSentEvents` hook + `EventSourceProvider` can drive live ticket status, log streaming, and service-health pulse across all 19 modules — one implementation, infinite reuse.
- **Biggest win (Tier 3):** Recharts 3 is already installed; replacing the single `AreaChart` on the dashboard with a Recharts `ComposedChart` and adding a `ResponsiveContainer`-wrapped `Treemap` for billing gives professional-grade visualisation with no new bundle weight.
- **Biggest win (Tier 4):** Running `openapi-typescript` against the Flask `/openapi.json` spec generates `lib/api/generated/schema.d.ts` — every `apiFetch<T>` call becomes type-safe with zero runtime overhead and eliminates the hand-written `types.ts`.
- **Biggest win (Tier 5):** Converting the 5 stat-card rows on `app/(dashboard)/page.tsx` from `"use client"` polling to a React Server Component (RSC) + `Suspense` streaming boundary cuts TTFB by ~400 ms and removes the Recharts bundle from the initial JS payload for non-JS clients.

---

## 2. Tier 1 — AI-Native UX

### Goal
Embed intelligence at every interaction point: search, insights, filters, anomaly detection.

### Upgrade Table

| Upgrade | Files to Create / Modify | Approach | Size | Priority |
|---------|--------------------------|----------|------|----------|
| **AI Command Bar** — natural-language search in Ctrl+K palette, with fallback to page nav | `components/shell/command-palette.tsx` (modify), `lib/ai/command-router.ts` (new), `app/api/ai/command/route.ts` (new) | Stream response from `POST /api/ai/command` via `fetch` with `ReadableStream`; parse intent to either navigate or summarise; render streamed text inside existing `CommandDialog` with a new `CommandAIResult` item type | S | P1 |
| **Contextual insight chips** — each dashboard card gets a one-line AI summary ("Sessions up 18% — tied to new org onboarding 2026-04-22") | `components/shared/insight-chip.tsx` (new), `app/(dashboard)/page.tsx` (modify) | `useQuery` with `staleTime: Infinity` calls `GET /api/ai/insight?metric=sessions&value=...`; renders a `Badge`-like chip with `Sparkles` icon below each `StatCard`; debounced 500 ms after page data loads | S | P1 |
| **Smart filter suggestions** on `DataTable` | `components/shared/data-table.tsx` (modify), `components/shared/smart-filter-bar.tsx` (new) | When search input is focused for >1 s and query is empty, call `POST /api/ai/suggest-filters?context=<module>` and render ghost-text suggestions using `cmdk` `CommandItem` overlay inside the existing search `Input` | M | P2 |
| **Anomaly highlight overlay** on charts | `components/shared/anomaly-band.tsx` (new) | Post-process `TimeSeriesData` client-side with a simple z-score (>2σ) detection utility in `lib/ai/anomaly.ts`; render `ReferenceArea` from Recharts with amber fill and a `Tooltip` explanation; no server call needed for simple z-score | S | P2 |
| **AI chat sidebar overlay** — floating assistant, any page | `components/shell/ai-chat-drawer.tsx` (new), `components/shell/topbar.tsx` (modify to add trigger), `app/api/ai/chat/route.ts` (new) | `Sheet` from shadcn/ui (right-side, 420 px); uses `useChat` from `ai` SDK (`npm i ai`); streams from Flask `/admin/api/internal/ala/text-chat` via Next.js proxy; session context injected as system message; Zustand store `lib/stores/ai-chat-store.ts` persists conversation per module | L | P2 |
| **Per-module AI "what happened" digest** — auto-generated summary at page top | `components/shared/page-digest.tsx` (new) | RSC; calls `GET /api/ai/digest?module=helpdesk` which returns a 2-sentence summary; rendered in a collapsible `Card` before the main content; uses `Suspense` + skeleton | M | P3 |
| **Predictive empty state** — when a list is empty, AI suggests why and what to do | `components/shared/empty-state.tsx` (modify) | Accept optional `aiHint?: string` prop; when `data.length === 0` and `aiHint` is set, render a secondary line with the hint string (generated once server-side at data-fetch time, not on every render) | S | P3 |

### Key Libraries

- `ai` (Vercel AI SDK v4) — `npm i ai` — streaming chat, `useChat` hook
- No additional NLP libraries needed — all inference routes through Flask's existing ALA engine via `/admin/api/internal/ala/text-chat`

---

## 3. Tier 2 — Real-time Everything

### Goal
Replace 60-second polling with push-based updates. Reduce stale-data latency from 60 s to <1 s for critical paths.

### Upgrade Table

| Upgrade | Files to Create / Modify | Approach | Size | Priority |
|---------|--------------------------|----------|------|----------|
| **SSE infrastructure hook** | `lib/hooks/use-sse.ts` (new), `app/api/sse/[channel]/route.ts` (new) | `new EventSource('/api/sse/<channel>')` with automatic reconnect (exponential back-off, max 30 s), `useEffect` cleanup, `queryClient.setQueryData` on each event to push into TanStack Query cache without refetch; Next.js route handler proxies to Flask `GET /admin/api/sse/<channel>` | M | P1 |
| **Live ticket status** on Helpdesk list | `app/(dashboard)/helpdesk/page.tsx` (new — not yet built), `lib/hooks/use-sse.ts` (use) | `useSSE('helpdesk.tickets')` emits `{type:'ticket.updated', payload: TicketPatch}`; optimistic row highlight with Framer Motion `layoutId` transition on status badge change | M | P1 |
| **Connection indicator upgrade** — show SSE channel health, not just polling | `components/shell/connection-indicator.tsx` (modify) | Extend existing component to display SSE `readyState` (`CONNECTING/OPEN/CLOSED`) with coloured pulse dot; already renders in topbar | S | P1 |
| **Live log streaming** on Logs page | `app/(dashboard)/logs/page.tsx` (new), `components/shared/log-stream.tsx` (new) | `EventSource` to `GET /api/sse/logs?level=error&limit=200`; virtual list using `react-window` (`npm i react-window @types/react-window`) to handle 10 k+ rows without DOM cost; auto-scroll toggle with Framer Motion scroll anchor | L | P2 |
| **Real-time metrics widgets** | `app/(dashboard)/metrics/page.tsx` (new), `components/shared/live-metric-gauge.tsx` (new) | 2-s SSE tick from `GET /api/sse/metrics`; Recharts `LineChart` with a rolling 60-point window; data appended via `useRef` buffer, rendered via `useState` throttled at 500 ms via `requestAnimationFrame` | M | P2 |
| **Presence indicators** — show which admins are viewing the same record | `components/shared/presence-avatars.tsx` (new), `lib/hooks/use-presence.ts` (new) | On mount, `POST /api/presence/join?page=<path>` heartbeat every 15 s; `useSSE('presence.<path>')` receives array of active users; renders `AvatarGroup` of 3 max + overflow count in page header | M | P3 |
| **Optimistic mutations** — create/update operations update the UI before server confirms | `lib/api/mutations.ts` (new) | TanStack Query `useMutation` with `onMutate` snapshot + rollback `onError`; pattern documented once in `lib/api/mutations.ts` and reused across all modules; requires standard `{ data, error }` response envelope from Flask (align with Phase 1 of migration roadmap) | M | P2 |
| **Toast-to-action notifications** for background tasks | `components/shell/task-toast.tsx` (new) | When Celery task ID is returned from a mutation, open a Sonner toast with an indeterminate progress indicator; poll `GET /api/tasks/<id>/status` every 3 s via `useQuery` with `refetchInterval`; dismiss and navigate on completion | M | P3 |

### Key Libraries

- `react-window` v1 — `npm i react-window @types/react-window` — virtual scroll for log stream
- No additional WebSocket library needed; SSE is sufficient for all read paths; mutations use REST

---

## 4. Tier 3 — Advanced Data Visualization

### Goal
Move beyond sparklines and area charts. Support drill-down, topology, heatmaps, and user-configurable layouts.

### Upgrade Table

| Upgrade | Files to Create / Modify | Approach | Size | Priority |
|---------|--------------------------|----------|------|----------|
| **KPI drill-down** — click stat card to open time-range breakdown modal | `components/shared/kpi-drill-modal.tsx` (new), `app/(dashboard)/page.tsx` (modify StatCard onClick) | `Dialog` wrapping a `ComposedChart` (`BarChart` + `Line` overlay) from Recharts; time range selector (`7d / 30d / 90d`) using `nuqs` URL state (`npm i nuqs`); data from `fetchTimeSeries(days)` already available | M | P1 |
| **Billing treemap** — visual breakdown of cost by org/module | `app/(dashboard)/billing/page.tsx` (new), `components/charts/treemap-chart.tsx` (new) | Recharts `Treemap` component with custom `content` prop for glassmorphism tiles; colour-coded by spend tier; tooltip shows org name + amount + % of total | M | P2 |
| **Heatmap calendar** — session/action volume by day, last 90 days | `components/charts/activity-heatmap.tsx` (new) | Pure SVG + Tailwind; render 13×7 grid of `rect` elements; colour scale `oklch` 5-step; tooltip via Radix `Tooltip`; no D3 needed — grid math is simple enough for vanilla TS in `lib/charts/heatmap.ts` | S | P2 |
| **Service topology graph** — visual map of platform service dependencies | `components/charts/topology-graph.tsx` (new), `app/(dashboard)/health/page.tsx` (new) | `@xyflow/react` (React Flow v12) — `npm i @xyflow/react`; nodes = services from `HealthData.services`; edges = hardcoded dependency map in `lib/charts/service-topology.ts`; node colour driven by `ServiceStatus`; dagre layout (`npm i @dagrejs/dagre`) | L | P2 |
| **Timeline chart** — helpdesk session timeline with status transitions | `components/charts/session-timeline.tsx` (new) | Recharts `BarChart` with `layout="vertical"` + custom tick; each bar = session duration; segments coloured by status (`waiting_approval`, `active`, `completed`); data from Flask `/admin/api/helpdesk/sessions?format=timeline` | M | P3 |
| **Drag-and-drop dashboard layout** | `app/(dashboard)/page.tsx` (major refactor), `lib/stores/dashboard-layout-store.ts` (new) | `@dnd-kit/core` + `@dnd-kit/sortable` (`npm i @dnd-kit/core @dnd-kit/sortable`) — wrap each dashboard section in `SortableItem`; persist layout order to `localStorage` via Zustand `persist` middleware; "Edit Layout" toggle in topbar | XL | P3 |
| **Multi-series comparison chart** — overlay two metrics (e.g. sessions vs errors) | `components/charts/comparison-chart.tsx` (new) | Recharts `ComposedChart` with dual `YAxis`; metric selector as two `Select` dropdowns from shadcn/ui; data fetched via `useQuery` with dynamic keys; chart state in `nuqs` URL params so the view is shareable | M | P3 |
| **Funnel chart** — helpdesk ticket conversion (new → in_progress → resolved) | `components/charts/funnel-chart.tsx` (new) | Custom SVG trapezoid funnel — no library needed; 3-stage data from Flask aggregation endpoint; render with `motion.path` animated on mount | S | P3 |

### Key Libraries

- `@xyflow/react` v12 — `npm i @xyflow/react` — topology graph
- `@dagrejs/dagre` — `npm i @dagrejs/dagre` — auto-layout for topology
- `@dnd-kit/core` + `@dnd-kit/sortable` — `npm i @dnd-kit/core @dnd-kit/sortable` — drag layout
- `nuqs` v2 — `npm i nuqs` — URL-based chart state (already on Phase 1 roadmap)
- Recharts 3 is already installed — all other chart types are covered

---

## 5. Tier 4 — Developer Experience

### Goal
Eliminate type drift, ensure UI regressions are caught before merge, document the design system.

### Upgrade Table

| Upgrade | Files to Create / Modify | Approach | Size | Priority |
|---------|--------------------------|----------|------|----------|
| **OpenAPI → TypeScript codegen** | `lib/api/generated/` (new dir), `scripts/gen-types.sh` (new), `package.json` (add `gen` script) | `npm i -D openapi-typescript`; script: `npx openapi-typescript http://localhost:5000/openapi.json -o lib/api/generated/schema.d.ts`; replace hand-written `lib/api/types.ts` `interface`s with `components['schemas']['DashboardStats']` etc.; run in CI before `tsc` | M | P1 |
| **Type-safe API client** | `lib/api/client.ts` (refactor), `lib/api/generated/schema.d.ts` (generated) | Replace bare `apiFetch<T>` with a typed wrapper using the generated schema types; infer response types from endpoint path + method via TypeScript template literals; no runtime overhead — purely types | M | P1 |
| **Vitest unit tests** | `lib/api/__tests__/` (new), `lib/hooks/__tests__/` (new), `vitest.config.ts` (new) | `npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react`; test `apiFetch` error handling, `useNavHistory` pin/unpin logic, `useCountUp` output, anomaly detection in `lib/ai/anomaly.ts` | M | P1 |
| **Playwright e2e smoke tests** | `e2e/` (new dir), `playwright.config.ts` (new) | `npm i -D @playwright/test`; 3 smoke tests: (1) login flow, (2) dashboard loads with ≥1 stat card, (3) Ctrl+K command palette opens and navigates; run in CI on `pull_request`; RTL locale (`he`) set in Playwright config | M | P1 |
| **Storybook** | `.storybook/` (new), `components/**/*.stories.tsx` (new for 10 core components) | `npx storybook@latest init` — picks up Tailwind v4 via PostCSS; write stories for: `StatCard`, `DataTable`, `EmptyState`, `TiltCard`, `CommandPalette`, `AuroraBackground`, `InsightChip`, `LogStream`, `TopologyGraph`, `LiveMetricGauge`; use `next-intl` decorator for RTL | L | P2 |
| **ESLint strict config** | `eslint.config.mjs` (modify) | Add `eslint-plugin-react-compiler` (React 19), `eslint-plugin-tailwindcss` (class order), `@typescript-eslint/strict` preset; add rule banning `useEffect` as a data-fetching mechanism (use TanStack Query instead) | S | P1 |
| **Absolute import path aliases** | `tsconfig.json` (modify), `next.config.ts` (modify) | Add `@/modules/*` → `app/(dashboard)/*` alias so module imports are self-documenting; also add `@/charts`, `@/stores`, `@/ai` | S | P1 |
| **CI quality gate** | `.github/workflows/platform-ui-ci.yml` (new) | Steps: `tsc --noEmit`, `eslint`, `vitest run`, `openapi-typescript` codegen diff check, `playwright test`, `next build`; fail PR if any step fails; separate job for Storybook build | M | P2 |

### Key Libraries

- `openapi-typescript` — `npm i -D openapi-typescript`
- `vitest` + `@testing-library/react` — `npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react`
- `@playwright/test` — `npm i -D @playwright/test`
- Storybook 9 — `npx storybook@latest init`

---

## 6. Tier 5 — Performance and Scale

### Goal
Achieve Core Web Vitals LCP < 2.5 s, CLS < 0.1, INP < 200 ms. Cut initial JS bundle by ≥40%.

### Upgrade Table

| Upgrade | Files to Create / Modify | Approach | Size | Priority |
|---------|--------------------------|----------|------|----------|
| **RSC dashboard stats** — move stat fetch to server | `app/(dashboard)/page.tsx` (refactor), `app/(dashboard)/dashboard-client.tsx` (new) | Extract the `useQuery` calls for `fetchDashboardStats` + `fetchServiceHealth` into an async RSC; wrap the count-up animation shell in a `"use client"` `DashboardClient` component; data arrives in the HTML, not in a second fetch | L | P1 |
| **Suspense streaming boundaries** | `app/(dashboard)/layout.tsx` (modify), `app/(dashboard)/page.tsx` (modify) | Wrap each dashboard section in `<Suspense fallback={<StatCardSkeleton />}>` — existing skeleton components are already built; enables streaming SSR so above-the-fold content renders first | M | P1 |
| **Per-module code splitting** | `next.config.ts` (modify), all module pages | Next.js App Router already splits by route; ensure no barrel re-exports in `components/index.ts` that would prevent tree-shaking; audit with `next build --debug` and `@next/bundle-analyzer` | M | P2 |
| **Bundle analysis and pruning** | `next.config.ts` (modify) | `npm i -D @next/bundle-analyzer`; add `analyzeServer` + `analyzeBrowser` scripts; target: remove Framer Motion from server bundle (it ships ~100 kB); use `LazyMotion` with `domAnimation` (already partially done in `page.tsx`) everywhere | S | P1 |
| **Image optimisation** | `public/icons/` (audit), `next.config.ts` (modify) | Enable `images.formats: ['image/avif', 'image/webp']`; convert `icon-192.png` to AVIF; use `next/image` for all avatar/logo renders; add `sizes` prop to prevent oversized image fetches on mobile | S | P2 |
| **Font subsetting** | `app/layout.tsx` (modify) | `Rubik` and `Cairo` are already loaded via `next/font/google` — add `display: 'swap'` and explicit `preload: true`; add `unicode-range` subset for Hebrew-only glyphs to avoid loading Latin weights unused by the UI | S | P2 |
| **Service Worker / offline shell** | `public/sw.js` (new), `next.config.ts` (modify) | `npm i -D next-pwa`; cache the app shell (`/`, `/manifest.json`, CSS, JS chunks) with StaleWhileRevalidate; network-first for API calls; offline fallback page at `app/offline/page.tsx`; extends existing `manifest.json` | M | P3 |
| **React Compiler (opt-in)** | `next.config.ts` (modify), `babel.config.js` (new) | React 19 ships the compiler as a babel plugin (`npm i -D babel-plugin-react-compiler`); enable on `lib/` and `components/shared/` first (safest); auto-memoises callbacks and derived values, eliminating most `useMemo`/`useCallback` calls | M | P3 |
| **Core Web Vitals monitoring** | `app/layout.tsx` (modify), `lib/vitals.ts` (new) | Use `next/web-vitals` `onCLS`/`onLCP`/`onINP` callbacks; `POST /api/vitals` to persist p75 values; display sparkline in Monitoring page | S | P3 |

### Targets

| Metric | Current (estimated) | Target |
|--------|-------------------|--------|
| LCP | ~3.8 s (client fetch waterfall) | < 2.5 s (RSC streaming) |
| CLS | ~0.05 (skeleton present) | < 0.05 |
| INP | ~180 ms | < 150 ms |
| Initial JS (dashboard) | ~420 kB | < 250 kB |
| Time to interactive | ~4.2 s | < 2.8 s |

---

## 7. Quick Wins (≤1 Day Each — Do These First)

These can be implemented by a single developer on the next workday, in order:

| # | What | File | Time |
|---|------|------|------|
| 1 | **Anomaly bands on sparklines** — add z-score detection to `buildSpark()`, render amber `ReferenceArea` | `app/(dashboard)/page.tsx` + `lib/ai/anomaly.ts` | 2 h |
| 2 | **KPI drill-down modal** — wrap existing `StatCard` in an `onClick` that opens a `Dialog` with the 30-day `AreaChart` already rendered on the page | `app/(dashboard)/page.tsx` + `components/shared/kpi-drill-modal.tsx` | 3 h |
| 3 | **AI insight chip** — add `GET /api/ai/insight` route + `InsightChip` component, mount below each stat card | `lib/ai/command-router.ts` + `components/shared/insight-chip.tsx` + `app/api/ai/insight/route.ts` | 3 h |
| 4 | **LazyMotion everywhere** — wrap every page that imports `framer-motion` in `<LazyMotion features={domAnimation}>` to cut Framer from 100 kB to 18 kB | All page files that use `motion.*` | 1 h |
| 5 | **Bundle analyser** — add `@next/bundle-analyzer`, run once, document the 3 largest modules | `next.config.ts` | 30 min |
| 6 | **SSE hook scaffold** — implement `useSSE` with reconnect logic, wire it to the connection indicator | `lib/hooks/use-sse.ts` + `components/shell/connection-indicator.tsx` | 2 h |
| 7 | **`nuqs` URL state for DataTable** — replace manual `useState` pagination/sort with `nuqs` so table state survives navigation | `components/shared/data-table.tsx` | 2 h |
| 8 | **ESLint strict** — add `@typescript-eslint/strict` + `eslint-plugin-tailwindcss` to existing `eslint.config.mjs` | `eslint.config.mjs` + `package.json` | 1 h |
| 9 | **Heatmap calendar** — render a 13×7 SVG grid from `TimeSeriesData`; add to dashboard as a collapsible card | `components/charts/activity-heatmap.tsx` + `app/(dashboard)/page.tsx` | 3 h |
| 10 | **Suspense boundaries** — wrap dashboard sections in `<Suspense fallback={skeleton}>` (skeletons already exist) | `app/(dashboard)/page.tsx` | 1 h |

---

## 8. Dependency Order

The following sequence is mandatory — items earlier in the list are prerequisites for items later.

```
1. ESLint strict + absolute path aliases (tsconfig)
      └─> All new files should follow the aliases from day 1
2. openapi-typescript codegen (lib/api/generated/)
      └─> Type-safe client (lib/api/client.ts refactor)
            └─> All module pages (Users, Helpdesk, etc.)
3. nuqs URL state
      └─> DataTable URL-driven pagination
            └─> Multi-series comparison chart (chart state in URL)
4. useSSE hook
      └─> Connection indicator upgrade
            └─> Live ticket status (Helpdesk page)
            └─> Live log streaming (Logs page)
            └─> Real-time metrics (Metrics page)
5. Vitest setup
      └─> CI quality gate (cannot gate on tests that don't exist)
6. Storybook (parallel to Vitest — no dependency)
      └─> Chromatic visual regression (Phase 4, migration roadmap)
7. RSC dashboard stats
      └─> Suspense streaming boundaries
            └─> Per-module code splitting (measure after RSC)
8. LazyMotion everywhere
      └─> Bundle analysis (measure the reduction)
9. AI command bar
      └─> AI chat sidebar (uses same stream infrastructure)
            └─> Per-page AI digest (same Flask endpoint, different prompt)
10. Service Worker / offline shell
      └─> (requires stable RSC + bundle split first)
```

---

## 9. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Flask SSE endpoint not implemented** — `useSSE` hook exists but backend emits nothing | High | Medium | Mock SSE in Next.js `app/api/sse/[channel]/route.ts` first; ship real Flask SSE per module incrementally |
| **React Compiler breaks existing components** — auto-memoisation changes referential equality assumptions | Medium | High | Enable compiler only in `lib/` first via `babel-plugin-react-compiler` `include` filter; run Playwright suite after each enable |
| **RSC refactor introduces hydration mismatch** — `useCountUp` is client-only, StatCard uses it | Medium | Medium | Keep the animated number shell as `"use client"` `DashboardClient`; pass pre-fetched `numericValue` as a prop from RSC parent; `suppressHydrationWarning` is already set on `<body>` |
| **openapi-typescript codegen fails on Flask endpoints without full OpenAPI spec** — many Flask routes lack `@smorest` annotations | High | Medium | Run codegen in `|| true` mode in CI initially; annotate top-10 endpoints by call frequency first (migration roadmap Phase 1) |
| **@xyflow/react bundle size** — React Flow is ~280 kB; adds to initial load | Medium | Medium | Dynamic-import the topology graph: `const TopologyGraph = dynamic(() => import('@/charts/topology-graph'), { ssr: false })`; only loads on `/health` page |
| **@dnd-kit drag-layout conflicts with Framer Motion layoutId** — both mutate element transforms | Medium | Low | Disable `layoutId` on elements that are draggable; use `@dnd-kit` overlay for drag ghost instead of Framer spring |
| **RTL breaks with D3/React Flow** — svg `transform` and text-anchor are direction-agnostic | Low | Medium | Set `dir="ltr"` on chart wrapper `div`s; Hebrew labels rendered in Recharts `Tooltip` custom component remain RTL-safe |
| **AI streaming latency** — Flask ALA endpoint takes 1.5-3 s on first token | Medium | Low | Show animated typing dots using Framer Motion `staggerChildren` while streaming; stream first token immediately rather than waiting for full response |
| **Storybook + Tailwind v4 incompatibility** — Storybook 9 may not support `@tailwindcss/vite` yet | Medium | Medium | Use `@storybook/nextjs` framework (not Vite); it runs Next.js PostCSS pipeline which includes `@tailwindcss/postcss` — already in `devDependencies` |
| **`nuqs` + App Router shallow routing edge case** — `useSearchParams` requires `Suspense` boundary in Next.js 15/16 | Low | Low | Wrap any component using `useSearchParams` in `<Suspense>`; `nuqs` v2 docs include explicit App Router guidance |

---

## 10. File Creation Summary

New files introduced by this roadmap, grouped by tier:

```
Tier 1 (AI-Native UX)
  app/api/ai/command/route.ts
  app/api/ai/insight/route.ts
  app/api/ai/chat/route.ts
  lib/ai/command-router.ts
  lib/ai/anomaly.ts
  lib/stores/ai-chat-store.ts
  components/shell/ai-chat-drawer.tsx
  components/shared/insight-chip.tsx
  components/shared/smart-filter-bar.tsx
  components/shared/anomaly-band.tsx
  components/shared/page-digest.tsx

Tier 2 (Real-time)
  app/api/sse/[channel]/route.ts
  app/api/presence/route.ts
  lib/hooks/use-sse.ts
  lib/hooks/use-presence.ts
  lib/api/mutations.ts
  components/shared/log-stream.tsx
  components/shared/live-metric-gauge.tsx
  components/shared/presence-avatars.tsx
  components/shell/task-toast.tsx

Tier 3 (Visualisation)
  lib/charts/heatmap.ts
  lib/charts/service-topology.ts
  components/charts/activity-heatmap.tsx
  components/charts/topology-graph.tsx
  components/charts/session-timeline.tsx
  components/charts/treemap-chart.tsx
  components/charts/comparison-chart.tsx
  components/charts/funnel-chart.tsx
  components/shared/kpi-drill-modal.tsx

Tier 4 (DX)
  lib/api/generated/schema.d.ts          (auto-generated)
  scripts/gen-types.sh
  vitest.config.ts
  lib/api/__tests__/client.test.ts
  lib/hooks/__tests__/use-nav-history.test.ts
  e2e/smoke.spec.ts
  playwright.config.ts
  .storybook/main.ts
  .storybook/preview.ts
  .github/workflows/platform-ui-ci.yml

Tier 5 (Performance)
  lib/vitals.ts
  app/offline/page.tsx
  public/sw.js                           (generated by next-pwa)
  app/(dashboard)/dashboard-client.tsx
```

---

_This roadmap is consistent with the existing `docs/system-upgrade/12-migration-roadmap.md`. Tier 4 (DX) aligns with Phase 1 of that plan. Tier 2 SSE work aligns with Phase 2 Helpdesk migration. All new file paths follow the existing `components/shell/`, `components/shared/`, `lib/api/`, `lib/hooks/` conventions._
