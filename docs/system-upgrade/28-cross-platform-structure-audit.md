# 28 — Cross-Platform Structure Audit

_Date: 2026-04-24 | Round: 016-prep_
_Scope: platform-ui codebase as of Round 015 completion_

---

## 1. Purpose

Evaluate whether the current `platform-ui` folder structure is ready for Web, PWA, Desktop, and Mobile expansion without blocking current development. This is an audit — no refactoring is performed here.

**Platforms considered:**
| Platform | Timeline | Tech |
|----------|----------|------|
| Web (current) | Now | Next.js App Router |
| PWA | Phase 3 | Same codebase + service worker |
| Desktop | Phase 4 | Electron/Tauri wrapping Web |
| Mobile (React Native) | Phase 4 | Shared logic layer + RN components |

---

## 2. Current Structure Map

```
platform-ui/
├── app/                          # Next.js App Router (web-only)
│   ├── (auth)/login/page.tsx
│   ├── (dashboard)/              # All module pages
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── users/
│   │   └── organizations/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts     # NextAuth handler
│   │   └── proxy/[...path]/route.ts        # Flask reverse proxy
│   ├── globals.css
│   └── layout.tsx
│
├── components/
│   ├── modules/                  # Module UI components
│   │   ├── users/                # UsersTable, UserStatusBadge, UserRoleBadge
│   │   └── organizations/        # OrgsTable, OrgStatusBadge
│   ├── providers/                # React context wrappers
│   │   ├── query-provider.tsx    # TanStack Query
│   │   └── session-provider.tsx  # next-auth/react
│   ├── shared/                   # Reusable UI primitives
│   │   ├── data-table/           # DataTable + Pagination + Skeleton
│   │   ├── detail-view/          # InfoRow, BoolBadge, DetailSection, etc.
│   │   ├── stats/                # StatCard, StatsGrid
│   │   ├── page-shell/           # PageShell (header + motion)
│   │   ├── form/                 # PlatformForm, FormActions, FormError
│   │   ├── permission-gate.tsx
│   │   ├── error-state.tsx
│   │   ├── error-boundary.tsx
│   │   ├── confirm-action-dialog.tsx
│   │   ├── empty-state.tsx
│   │   ├── skeleton-card.tsx
│   │   ├── cursor-glow.tsx       # Mouse CSS effect
│   │   └── tilt-card.tsx         # Mouse CSS transform
│   ├── shell/                    # App chrome (sidebar, topbar, nav)
│   │   ├── app-sidebar.tsx
│   │   ├── topbar.tsx
│   │   ├── bottom-nav.tsx
│   │   ├── command-palette.tsx
│   │   ├── connection-indicator.tsx
│   │   ├── shortcuts-dialog.tsx
│   │   ├── sidebar-search.tsx
│   │   ├── accent-picker.tsx
│   │   ├── aurora-background.tsx
│   │   └── nav-items.ts
│   └── ui/                       # shadcn/ui primitives
│       └── (button, input, dialog, table, badge, ...)
│
├── lib/
│   ├── api/
│   │   ├── client.ts             # apiFetch via /api/proxy (browser URL)
│   │   ├── users.ts              # fetchUsers, fetchUser, fetchUserStats
│   │   ├── organizations.ts      # fetchOrgs, fetchOrg, fetchOrgStats
│   │   ├── query-keys.ts         # TanStack Query key factories
│   │   ├── request-context.ts    # Audit headers builder
│   │   └── types.ts              # DashboardStats, TimeSeriesData, HealthData
│   ├── auth/
│   │   ├── options.ts            # NextAuth v4 config + token refresh
│   │   ├── rbac.ts               # hasRole, hasPermission, getOrgId
│   │   └── types.ts              # NormalizedAuthUser + next-auth augmentation
│   ├── hooks/
│   │   ├── use-permission.ts     # useSession wrapper for RBAC in client components
│   │   ├── use-nav-history.ts    # Zustand + usePathname
│   │   ├── use-keyboard-shortcuts.ts  # document.addEventListener + useRouter
│   │   └── use-count-up.ts       # Animated counter (requestAnimationFrame)
│   ├── modules/
│   │   ├── users/types.ts        # UserSummary, UserDetail, payload types
│   │   └── organizations/types.ts # OrgSummary, OrgDetail, payload types
│   ├── utils/
│   │   ├── format.ts             # formatDate, formatNumber, formatCurrency (Intl.*)
│   │   └── csv.ts                # rowsToCsv, downloadCsv (browser Blob API)
│   ├── ui/
│   │   └── motion.ts             # PAGE_EASE constant
│   ├── utils.ts                  # cn() helper (clsx + tailwind-merge)
│   └── theme-store.ts            # Zustand accent store (document.documentElement)
```

---

## 3. Classification Table

| File / Folder | Class | Reason |
|---------------|-------|--------|
| `app/` (all) | **Web-only UI** | Next.js App Router — pages, layouts, route handlers |
| `app/api/proxy/[...path]/route.ts` | **Next.js adapter** | Route Handler, uses `NextRequest`, calls `getToken` |
| `app/api/auth/[...nextauth]/route.ts` | **Next.js adapter** | NextAuth handler — web-only |
| `components/shell/` (all) | **Web-only UI** | Sidebar, topbar, nav — browser DOM chrome |
| `components/ui/` (shadcn) | **Web-only UI** | DOM-specific primitives; no React Native equivalent |
| `components/providers/session-provider.tsx` | **Next.js adapter** | Wraps `next-auth/react` SessionProvider |
| `components/providers/query-provider.tsx` | **Next.js adapter** | TanStack Query config; pattern is portable |
| `components/shared/cursor-glow.tsx` | **Web-only UI** | CSS `mousemove` — no equivalent on touch/native |
| `components/shared/tilt-card.tsx` | **Web-only UI** | CSS transform on mouse hover |
| `components/shared/detail-view/detail-back-button.tsx` | **Next.js adapter** | Uses `useRouter` from `next/navigation` |
| `components/shared/detail-view/` (rest) | **Cross-platform shared logic** | Pure React + Tailwind classes; logic portable |
| `components/shared/stats/` | **Cross-platform shared logic** | Pure React; StatCard/StatsGrid are display primitives |
| `components/shared/page-shell/` | **Web-only UI** | Uses `framer-motion` + DOM; pattern extractable but Tailwind classes web-specific |
| `components/shared/form/` | **Cross-platform shared logic** | RHF + Zod pattern is framework-portable |
| `components/shared/confirm-action-dialog.tsx` | **Web-only UI** | Uses shadcn `Dialog` (DOM-specific) |
| `components/shared/permission-gate.tsx` | **Cross-platform shared logic** | Logic is portable; rendering style is web |
| `components/shared/error-state.tsx` | **Cross-platform shared logic** | Pure React display; no DOM APIs |
| `components/shared/error-boundary.tsx` | **Cross-platform shared logic** | React class component; works in RN |
| `components/shared/empty-state.tsx` | **Cross-platform shared logic** | Pure React display |
| `components/modules/users/user-status-badge.tsx` | **Module-specific UI** | Display logic extractable to `lib/platform` |
| `components/modules/users/user-role-badge.tsx` | **Module-specific UI** | Display logic extractable to `lib/platform` |
| `components/modules/users/users-table.tsx` | **Module-specific UI** | Uses DataTable; web-only rendering |
| `components/modules/organizations/org-status-badge.tsx` | **Module-specific UI** | Display logic portable |
| `components/modules/organizations/orgs-table.tsx` | **Module-specific UI** | Uses DataTable; web-only rendering |
| `lib/auth/rbac.ts` | **Cross-platform shared logic** | Pure functions; zero framework imports |
| `lib/auth/options.ts` | **Next.js adapter** | NextAuth v4 config; `next-auth` dependency |
| `lib/auth/types.ts` | **Split needed** | `NormalizedAuthUser` is cross-platform; `next-auth` module augmentation is web-only |
| `lib/api/client.ts` | **Next.js adapter** | Hardcoded `const BASE = "/api/proxy"` — browser relative URL |
| `lib/api/users.ts` | **Next.js adapter** | Calls `apiFetch` from client.ts — proxy URL assumption |
| `lib/api/organizations.ts` | **Next.js adapter** | Same as users.ts |
| `lib/api/query-keys.ts` | **Cross-platform shared logic** | Pure factory functions; zero deps |
| `lib/api/request-context.ts` | **Cross-platform shared logic** | Pure header builder; `Math.random` + string ops only |
| `lib/api/types.ts` | **Backend/API contract** | DashboardStats, TimeSeriesData, HealthData shapes |
| `lib/modules/users/types.ts` | **Module-specific contracts** | UserSummary, UserDetail — pure TypeScript |
| `lib/modules/organizations/types.ts` | **Module-specific contracts** | OrgSummary, OrgDetail — pure TypeScript |
| `lib/hooks/use-permission.ts` | **Next.js adapter** | Wraps `useSession` from `next-auth/react`; logic is portable |
| `lib/hooks/use-nav-history.ts` | **Next.js adapter** | Uses `usePathname` from `next/navigation` |
| `lib/hooks/use-keyboard-shortcuts.ts` | **Web-only UI** | `document.addEventListener` + `useRouter` + `KeyboardEvent` |
| `lib/hooks/use-count-up.ts` | **Cross-platform shared logic** | Uses `requestAnimationFrame` (available in RN) |
| `lib/utils/format.ts` | **Cross-platform shared logic** | `Intl.*` works in React Native 0.73+ and Node.js |
| `lib/utils/csv.ts` | **Web-only UI** | `Blob`, `URL.createObjectURL`, `document.createElement` |
| `lib/utils.ts` | **Cross-platform shared logic** | `cn()` = clsx + tailwind-merge; logic portable |
| `lib/ui/motion.ts` | **Cross-platform shared logic** | Pure constant array |
| `lib/theme-store.ts` | **Web-only UI** | `document.documentElement.style.setProperty` — DOM API |

### Classification Legend

| Class | Meaning |
|-------|---------|
| **Web-only UI** | Browser DOM required; cannot leave this repo |
| **Next.js adapter** | Bound to Next.js APIs (`next/navigation`, `next-auth`, Route Handlers) |
| **Cross-platform shared logic** | Pure logic, pure React, or pure TypeScript — extractable |
| **Module-specific contracts** | Pure TypeScript module shapes — extractable |
| **Module-specific UI** | React components tied to one module's domain |
| **Backend/API contract** | Response shape types — extractable |

---

## 4. Cross-Platform Readiness Score

| Layer | Score | Notes |
|-------|-------|-------|
| `lib/auth/rbac.ts` | 10/10 | Zero deps, pure functions |
| `lib/modules/*/types.ts` | 10/10 | Pure TypeScript |
| `lib/api/query-keys.ts` | 10/10 | Pure factory functions |
| `lib/api/request-context.ts` | 9/10 | Pure; minor: `X-Client-Source` hardcodes `"platform-ui"` |
| `lib/utils/format.ts` | 8/10 | `Intl.*` is RN-compatible since 0.70; edge case: `timeZone: "Asia/Jerusalem"` hardcoded |
| `lib/ui/motion.ts` | 10/10 | Pure constant |
| `components/shared/error-state.tsx` | 7/10 | Logic portable; Tailwind class names web-specific |
| `components/shared/error-boundary.tsx` | 9/10 | Standard React class component; fully portable |
| `components/shared/form/` | 6/10 | RHF + Zod are portable; Tailwind classes not |
| `components/shared/detail-view/` | 6/10 | Logic portable; detail-back-button uses `useRouter` |
| `components/shared/stats/` | 7/10 | Display-only; styling would differ on native |
| `lib/auth/types.ts` | 5/10 | `NormalizedAuthUser` is portable; next-auth augmentation isn't |
| `lib/api/client.ts` | 1/10 | Browser relative URL assumption; not portable |
| `lib/api/users.ts` / `organizations.ts` | 2/10 | Depends on client.ts proxy URL |
| `lib/hooks/use-permission.ts` | 4/10 | Logic portable; `useSession` is next-auth-specific |
| `lib/hooks/use-keyboard-shortcuts.ts` | 0/10 | DOM + Next.js router |
| `lib/utils/csv.ts` | 0/10 | Browser Blob API only |
| `lib/theme-store.ts` | 1/10 | `document.documentElement` — DOM-only |
| `components/shell/` | 0/10 | Web chrome — fully web-specific |
| `app/` | 0/10 | Next.js App Router |

**Overall readiness: 55/100**

- Logic layer (`lib/auth/rbac.ts`, types, format, query-keys): **85/100**
- React components (`components/shared/`): **65/100** (logic yes, styling no)
- API/data layer (`lib/api/`, hooks): **30/100** (proxy URL coupling)
- App chrome + shell: **5/100** (intentionally web-specific)

---

## 5. What Is Currently Structured Well

### Strengths

1. **`lib/auth/rbac.ts` is already cross-platform.** It accepts a generic `SessionLike` interface with no framework imports. The identical logic can run in React Native, Node.js workers, or CLI tools today.

2. **Module types are pure TypeScript.** `lib/modules/users/types.ts` and `lib/modules/organizations/types.ts` contain only interface definitions. Any consumer can import them.

3. **`lib/utils/format.ts` is cross-platform.** Uses only `Intl.DateTimeFormat`, `Intl.NumberFormat`, `Intl.RelativeTimeFormat` — all available in React Native 0.70+ and Node.js. No browser APIs.

4. **`lib/api/query-keys.ts` is a pure factory.** Zero dependencies. Works in any JavaScript environment.

5. **`lib/api/request-context.ts` is pure.** Header builder uses only `Math.random()`, `Date.now()`, and string operations. Fully portable.

6. **`components/shared/error-boundary.tsx` is standard React.** Class component using `getDerivedStateFromError` + `componentDidCatch` — works identically in React Native.

7. **Module contracts and UI are separated.** `lib/modules/*/types.ts` holds the contract; `components/modules/*/` holds the rendering. This separation is the right structure — the contract can move to a shared platform package without touching the rendering.

8. **`components/shared/` capability folders have clean barrel exports.** Each folder exports a clear public API via `index.ts`. Easy to re-export from a `lib/platform/` package later.

9. **Auth types are documented.** `NormalizedAuthUser` is well-typed with clear comments about what comes from Flask. The shape itself is framework-independent.

10. **`lib/ui/motion.ts` is a pure constant.** No imports, no side effects.

---

## 6. What Is Too Web-Specific

### Problems

1. **`lib/api/client.ts` hardcodes `const BASE = "/api/proxy"`.** This is a browser relative URL — it only works inside a Next.js app running in a browser. React Native, Electron, or a Node.js test harness would need an absolute URL. This is the single biggest cross-platform blocker in the API layer.

2. **`lib/auth/types.ts` mixes cross-platform types with next-auth augmentation.** The file imports `"next-auth"` and `"next-auth/jwt"` and adds `declare module` blocks. `NormalizedAuthUser` and `FlaskUserPayload` don't need these imports but live in the same file.

3. **`lib/theme-store.ts` calls `document.documentElement.style.setProperty`.** This side effect runs inside the Zustand store action — it will crash in any non-browser environment (SSR, React Native, Electron renderer with strict CSP, tests).

4. **`lib/utils/csv.ts` uses `Blob`, `URL.createObjectURL`, `document.createElement`.** Pure browser download trigger — not portable. The `rowsToCsv` string builder is portable; only `downloadCsv` needs isolation.

5. **`lib/hooks/use-keyboard-shortcuts.ts` touches `document.addEventListener`.** Also imports `useRouter` from `next/navigation`. Both make this a browser + Next.js-only hook.

6. **`lib/hooks/use-nav-history.ts` imports `usePathname` from `next/navigation`.** The Zustand store logic is portable; only the `useTrackNavHistory` function needs the pathname hook.

7. **`components/shared/detail-view/detail-back-button.tsx` uses `useRouter`.** The back button's visual representation is neutral, but the navigation action is Next.js-specific.

8. **`components/shell/` is entirely web chrome.** This is expected and correct — sidebar, topbar, command palette are all browser UI. Not a problem, just needs to stay clearly bounded.

9. **`components/shared/confirm-action-dialog.tsx` uses shadcn `Dialog`** which renders as a portal into `document.body`. Cannot be used in React Native as-is. The state/behavior contract is portable; the rendering must be replaced.

10. **`lib/api/users.ts` and `lib/api/organizations.ts` call `apiFetch`** which assumes the browser proxy. These files contain the TanStack Query integration logic which is portable, but the HTTP transport is not.

---

## 7. What Can Be Shared With Future Mobile/Desktop Apps

The following can be shared with zero changes or minor wrappers:

| File | What to share | Action needed |
|------|--------------|---------------|
| `lib/auth/rbac.ts` | Entire file | None — already cross-platform |
| `lib/modules/users/types.ts` | Entire file | None |
| `lib/modules/organizations/types.ts` | Entire file | None |
| `lib/api/query-keys.ts` | Entire file | None |
| `lib/api/request-context.ts` | `buildAuditHeaders` + `generateRequestId` | None |
| `lib/utils/format.ts` | Entire file | None — Intl.* is universal |
| `lib/ui/motion.ts` | `PAGE_EASE` constant | None |
| `lib/utils.ts` | `cn()` utility | None |
| `components/shared/error-boundary.tsx` | Entire component | None |
| `NormalizedAuthUser`, `FlaskUserPayload` from `lib/auth/types.ts` | The two interfaces | Extract to separate file |
| `lib/api/types.ts` | Response shape types | None |
| `rowsToCsv()` from `lib/utils/csv.ts` | The pure string builder | Extract from download trigger |
| Nav history Zustand store from `lib/hooks/use-nav-history.ts` | The Zustand store only | Extract from `usePathname` consumer |
| `StatCard` / `StatsGrid` display logic | Types + value formatting | Needs styling layer swap for native |
| `InfoRow` / `BoolBadge` display logic | Same | Needs styling layer swap |
| Permission check logic from `use-permission.ts` | The `hasRole` / `hasPermission` calls | Decouple from `useSession` |

**Total extractable today without architecture changes:** ~35% of the codebase by file count, representing ~65% of the business logic.

---

## 8. What Must Remain Web-Only

| File / Folder | Reason | Alternative for native |
|---------------|--------|----------------------|
| `app/` | Next.js App Router | React Navigation on mobile; Electron menu on desktop |
| `app/api/proxy/[...path]/route.ts` | Next.js Route Handler | Direct HTTP client with absolute URL on native |
| `app/api/auth/[...nextauth]/route.ts` | NextAuth | Token stored in SecureStore (RN) or Keychain (Electron) |
| `lib/auth/options.ts` | NextAuth v4 config | Custom auth flow with same Flask JWT endpoints |
| `lib/api/client.ts` | Proxy relative URL | Replace with `Platform.select()` base URL factory |
| `lib/utils/csv.ts` (`downloadCsv`) | Browser Blob download | RN Share API or Electron `dialog.showSaveDialog` |
| `lib/theme-store.ts` | `document.documentElement` | CSS variables don't exist in RN; use themed StyleSheet |
| `lib/hooks/use-keyboard-shortcuts.ts` | DOM keyboard events | Not applicable on touch; desktop can use Electron accelerators |
| `components/shell/` | Browser sidebar/topbar chrome | Replace with React Navigation drawer or Electron frame |
| `components/ui/` (shadcn) | DOM-specific Radix primitives | Replace with React Native equivalents (e.g. Tamagui) |
| `components/shared/cursor-glow.tsx` | CSS `mousemove` | Not applicable on touch |
| `components/shared/tilt-card.tsx` | CSS transform on mouse | Not applicable on touch |
| `components/shared/confirm-action-dialog.tsx` | shadcn Dialog (DOM portal) | React Native Modal or ActionSheet |
| `components/shared/page-shell/` | `framer-motion` + Tailwind layout | Rewrite with Animated API + RN StyleSheet |

---

## 9. Recommended Target Structure

> Do not implement yet. This is the eventual target once cross-platform development begins.

```
lib/
  platform/                     ← NEW: pure cross-platform logic
    auth/
      rbac.ts                   ← moved from lib/auth/rbac.ts
      user-types.ts             ← extracted: NormalizedAuthUser, FlaskUserPayload
    api/
      query-keys.ts             ← moved from lib/api/query-keys.ts
      request-context.ts        ← moved from lib/api/request-context.ts
      types.ts                  ← moved from lib/api/types.ts
    modules/
      users/types.ts            ← moved from lib/modules/users/types.ts
      organizations/types.ts    ← moved from lib/modules/organizations/types.ts
    utils/
      format.ts                 ← moved from lib/utils/format.ts
      csv-core.ts               ← extracted: rowsToCsv() only (no download)
    ui/
      motion.ts                 ← moved from lib/ui/motion.ts
    hooks/
      use-count-up.ts           ← moved: requestAnimationFrame is universal
  web/                          ← NEW: Next.js / browser-specific
    auth/
      options.ts                ← moved from lib/auth/options.ts
      types.ts                  ← next-auth module augmentation only
    api/
      client.ts                 ← stays web-only; proxy URL stays here
      users.ts                  ← stays web-only
      organizations.ts          ← stays web-only
    utils/
      csv.ts                    ← browser download trigger only
    hooks/
      use-permission.ts         ← next-auth/react wrapper
      use-nav-history.ts        ← usePathname wrapper
      use-keyboard-shortcuts.ts ← DOM + router hook
    theme-store.ts              ← document.documentElement usage

  (existing lib/auth/rbac.ts etc. replaced by re-exports from lib/platform/)
```

### Component layer target

```
components/
  platform/                     ← NEW: portable React components (no DOM APIs)
    display/
      bool-badge.tsx            ← from components/shared/detail-view/bool-badge.tsx
      info-row.tsx              ← from components/shared/detail-view/info-row.tsx
      detail-section.tsx        ← from detail-view/detail-section.tsx
      detail-header-card.tsx    ← from detail-view/detail-header-card.tsx
      error-boundary.tsx        ← from components/shared/error-boundary.tsx
      error-state.tsx           ← from components/shared/error-state.tsx
    permission/
      permission-gate.tsx       ← logic portable; rendering to be adapted
    stats/                      ← portable display primitives
    form/                       ← RHF + Zod pattern; rendering adapts
  web/                          ← NEW: browser-specific wrappers
    detail-view/
      detail-back-button.tsx    ← useRouter-dependent
    shell/                      ← moved from components/shell/
    confirm-action-dialog.tsx   ← shadcn Dialog
    page-shell/                 ← framer-motion + Tailwind layout
    cursor-glow.tsx
    tilt-card.tsx
  shared/                       ← keep for now; migrate gradually
  modules/                      ← stays; module UI always platform-specific
  ui/                           ← stays; shadcn primitives are web-only
  providers/                    ← stays; web-specific wrappers
```

---

## 10. Refactor Phases

These phases are **future work** — do not start until web module development is further along (after Helpdesk + Roles + Settings modules are complete).

### Phase CP-0: Type Extraction (no runtime impact)
**When:** Before starting React Native work.
**Effort:** ~2 hours.
- Split `lib/auth/types.ts` into `user-types.ts` (cross-platform) + `auth-next.ts` (next-auth augmentation)
- Re-export from existing paths so no import changes needed
- Extract `rowsToCsv()` from `lib/utils/csv.ts` into `csv-core.ts`

### Phase CP-1: Pure Logic Migration
**When:** When first non-web consumer appears (test suite, mobile prototype, CLI).
**Effort:** ~4 hours.
- Create `lib/platform/` directory
- Move: `rbac.ts`, `query-keys.ts`, `request-context.ts`, `format.ts`, `motion.ts`, module types
- Leave re-export shims at original paths (zero import churn in web code)
- Add `vitest` tests that import only from `lib/platform/` (confirms no browser deps)

### Phase CP-2: API Transport Abstraction
**When:** When React Native or Electron prototype needs real data.
**Effort:** ~8 hours.
- Create `lib/platform/api/http.ts` with `createApiClient(baseUrl, getToken)` factory
- `lib/web/api/client.ts` becomes a thin wrapper calling `createApiClient("/api/proxy", ...)`
- Mobile uses `createApiClient("https://ai-data-platform.com/api", ...)`
- Module fetch files (`users.ts`, `organizations.ts`) become cross-platform

### Phase CP-3: Component Splitting
**When:** When building mobile or desktop UI.
**Effort:** ~16 hours.
- Create `components/platform/` for portable React components
- Move display primitives (InfoRow, BoolBadge, ErrorState, ErrorBoundary, StatCard)
- Web wrappers in `components/web/` adapt to shadcn/Tailwind
- Mobile adapters in separate `platform-mobile/` repo use Tamagui or RN StyleSheet

### Phase CP-4: Auth Abstraction
**When:** When mobile app needs its own auth flow (not NextAuth).
**Effort:** ~12 hours.
- Extract Flask token exchange logic from `options.ts` into `lib/platform/auth/flask-auth.ts`
- Web uses NextAuth calling `lib/platform/auth/flask-auth.ts`
- Mobile uses `lib/platform/auth/flask-auth.ts` directly + `expo-secure-store`

---

## 11. Files to Move Later (to `lib/platform/`)

| File | Target | Effort |
|------|--------|--------|
| `lib/auth/rbac.ts` | `lib/platform/auth/rbac.ts` | Trivial |
| `NormalizedAuthUser` from `lib/auth/types.ts` | `lib/platform/auth/user-types.ts` | Trivial (extract + shim) |
| `lib/api/query-keys.ts` | `lib/platform/api/query-keys.ts` | Trivial |
| `lib/api/request-context.ts` | `lib/platform/api/request-context.ts` | Trivial |
| `lib/api/types.ts` | `lib/platform/api/types.ts` | Trivial |
| `lib/modules/users/types.ts` | `lib/platform/modules/users/types.ts` | Trivial |
| `lib/modules/organizations/types.ts` | `lib/platform/modules/organizations/types.ts` | Trivial |
| `lib/utils/format.ts` | `lib/platform/utils/format.ts` | Trivial |
| `rowsToCsv()` from `lib/utils/csv.ts` | `lib/platform/utils/csv-core.ts` | Small extract |
| `lib/ui/motion.ts` | `lib/platform/ui/motion.ts` | Trivial |
| `lib/hooks/use-count-up.ts` | `lib/platform/hooks/use-count-up.ts` | Trivial |
| `components/shared/error-boundary.tsx` | `components/platform/error-boundary.tsx` | Trivial |

---

## 12. Files to Keep Where They Are

| File / Folder | Reason |
|---------------|--------|
| `app/` | Next.js App Router is the web entry point; it stays |
| `components/shell/` | Web chrome; intentionally browser-specific |
| `components/ui/` (shadcn) | shadcn is web-only by design |
| `lib/auth/options.ts` | NextAuth is a Next.js library |
| `lib/api/client.ts` | Proxy URL is web-specific; keep it narrow |
| `lib/api/users.ts` / `organizations.ts` | These are the web data access layer |
| `lib/theme-store.ts` | `document.documentElement` — DOM only; theming strategy differs per platform |
| `lib/utils/csv.ts` (`downloadCsv`) | Browser download API; keep with web utilities |
| `lib/hooks/use-keyboard-shortcuts.ts` | DOM + Next.js; web-only feature |
| `lib/hooks/use-nav-history.ts` (`useTrackNavHistory`) | Next.js pathname hook |
| `components/shared/confirm-action-dialog.tsx` | shadcn Dialog; web-only rendering |
| `components/shared/cursor-glow.tsx` | Mouse-only interaction |
| `components/shared/tilt-card.tsx` | Mouse-only interaction |

---

## 13. Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **Premature abstraction** — moving files before a second consumer exists creates maintenance overhead for no gain | Medium | Only begin CP-1 when React Native prototype is confirmed. No speculative moves. |
| **Import churn** — moving files breaks `@/lib/auth/rbac` imports everywhere | Low | Use re-export shims at original paths. `@/lib/auth/rbac` stays valid; it just re-exports from `lib/platform/auth/rbac`. |
| **`Intl.*` React Native gaps** — some locales/options not supported on older Android | Low | Test on minimum Android API 24. Fallback to `"—"` is already in format.ts. |
| **Transport abstraction leaks** — building too abstract an HTTP client before the mobile use case is known | Medium | Keep Phase CP-2 minimal — just parameterize the base URL. Don't build a full abstraction layer. |
| **`document.documentElement` in tests** — `theme-store.ts` breaks in jest/vitest without jsdom | Low | Already mitigated by using `useThemeStore` only in `accent-picker.tsx` which is client-only. |
| **`NormalizedAuthUser` shape drift** — if Flask changes user fields, both web and mobile need updating | Medium | Once extracted to `lib/platform/`, it's the single source. Add a changelog note to `CLAUDE.md` for `NormalizedAuthUser` field changes. |
| **Tailwind classes on mobile** — `className` strings are meaningless in React Native | High | Accept that `components/platform/` components will need a separate native renderer. The logic + types are shared; the styling is not. |

---

## 14. What Must Change Before Mobile/Desktop Work Starts

**Mandatory (block mobile work):**

1. **Split `lib/auth/types.ts`** — extract `NormalizedAuthUser` and `FlaskUserPayload` to `lib/platform/auth/user-types.ts`. The next-auth module augmentation stays in a separate file. Without this, a React Native bundle that imports user types will also import next-auth, causing a crash.

2. **Parameterize API base URL** — `lib/api/client.ts` must accept a base URL, not hardcode `/api/proxy`. Even a single `const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/api/proxy"` is enough for Phase CP-2.

3. **Extract `rowsToCsv()`** from `lib/utils/csv.ts` — the string builder has no browser deps and can run in React Native. `downloadCsv` stays browser-only.

4. **Create `lib/platform/` directory** as a clear signal in the codebase that cross-platform code lives there. Even if empty at first.

**Recommended (before mobile to avoid later pain):**

5. **Fix `lib/theme-store.ts` side effects** — wrap `document.documentElement.style.setProperty` in a platform check or move it to a `web/` hook so the Zustand store itself is side-effect-free.

6. **Remove `useRouter` from `detail-back-button.tsx`** — accept an `onBack?: () => void` prop, making it a pure React component. The Next.js router call moves to the page.

7. **Add platform classification comments** to all `lib/` files (e.g. `// @platform: cross` vs `// @platform: web`) — makes it easy for future agents to audit.

---

## 15. Acceptance Criteria Before Mobile/Desktop Work Begins

- [ ] `lib/platform/` directory exists with at least `rbac.ts`, `user-types.ts`, `query-keys.ts`, `format.ts`
- [ ] No `import "next-auth"` in any file under `lib/platform/`
- [ ] No `document.*`, `window.*`, or `navigator.*` calls in any file under `lib/platform/`
- [ ] No `from "next/navigation"` in any file under `lib/platform/`
- [ ] `rowsToCsv()` runs cleanly in a Node.js test (no `Blob` or DOM required)
- [ ] `lib/api/client.ts` accepts a configurable base URL (not hardcoded `/api/proxy`)
- [ ] `NormalizedAuthUser` and `FlaskUserPayload` importable without `next-auth` dependency
- [ ] Vitest test suite runs against `lib/platform/` in Node.js (no jsdom) with `--pool=forks`
- [ ] All existing web typecheck: `tsc --noEmit` exits 0 after any structural moves
- [ ] No import paths broken in existing web code (all original paths re-export from `lib/platform/`)

---

## 16. Summary Verdict

| Question | Answer |
|----------|--------|
| Is the structure ready for PWA? | **Yes** — PWA is the same Next.js codebase + service worker |
| Is the structure ready for Desktop (Electron)? | **Mostly** — needs API base URL parameterization + theme-store isolation |
| Is the structure ready for Mobile (React Native)? | **No** — needs Phase CP-0 + CP-1 first; `next-auth` types are intertwined with user types |
| What is the biggest single blocker? | `lib/auth/types.ts` mixing next-auth module augmentation with `NormalizedAuthUser` |
| What is already excellent? | `lib/auth/rbac.ts`, `lib/utils/format.ts`, `lib/api/query-keys.ts`, `lib/modules/*/types.ts` |
| What is the recommended next step? | Phase CP-0 (type extraction) — 2 hours of work, zero risk, unlocks everything else |
