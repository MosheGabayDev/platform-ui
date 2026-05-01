# Source Tree Analysis — platform-ui

**Generated:** 2026-05-01 (BMAD Deep Scan).

```
platform-ui/
├── CLAUDE.md                      # AI agent project rules (NEVER BREAK)
├── package.json                   # Next.js 16 + React 19 + TanStack stack
├── playwright.config.ts           # E2E test config
├── tsconfig.json
├── next.config.ts
├── tailwind.config.* / postcss.config.mjs
│
├── app/                           # Next.js App Router root
│   ├── layout.tsx                 # Root: fonts, ThemeProvider, QueryProvider
│   ├── globals.css                # CSS variables, aurora keyframes, .glass helper
│   ├── (auth)/                    # PUBLIC route group: login, reset-password
│   ├── (dashboard)/               # PROTECTED route group with sidebar shell
│   │   ├── layout.tsx             # QueryClient + LazyMotion + AnimatePresence + shortcuts
│   │   ├── page.tsx               # Dashboard home (KpiCard grid + activity)
│   │   ├── users/                 # Users module pages
│   │   ├── organizations/         # Orgs module pages
│   │   ├── roles/                 # Roles module pages
│   │   └── [...slug]/             # Catch-all (404 + future module routes)
│   └── api/
│       └── proxy/[...path]/       # Single Flask proxy — cookie + JWT forwarding
│
├── components/
│   ├── ui/                        # ⚠ READ-ONLY — shadcn/ui primitives, never modify
│   ├── shared/                    # Reusable cross-module components
│   │   ├── action-button.tsx      # ✅ R041B (mutation trigger)
│   │   ├── confirm-action-dialog.tsx
│   │   ├── data-table/            # DataTable<T> — TanStack Table wrapper
│   │   ├── detail-view/           # PlatformDetailView (extraction pending)
│   │   ├── empty-state.tsx
│   │   ├── error-boundary.tsx + error-state.tsx
│   │   ├── feature-gate.tsx       # ✅ R041D-UI (fail-closed)
│   │   ├── form/                  # PlatformForm + FormError + FormActions
│   │   ├── page-shell/            # PlatformPageShell
│   │   ├── permission-gate.tsx
│   │   ├── skeleton-card.tsx      # All loading skeletons
│   │   ├── stats/                 # KpiCard ✅ R041G + StatCard
│   │   ├── timeline/              # PlatformTimeline ✅ R041E
│   │   ├── tilt-card.tsx          # 3D hover effect (desktop only)
│   │   └── cursor-glow.tsx        # Radial spotlight follow-cursor
│   ├── shell/                     # Layout chrome only
│   │   ├── app-sidebar.tsx        # RTL right-side sidebar
│   │   ├── topbar.tsx             # Sticky header
│   │   ├── bottom-nav.tsx         # Mobile only (md:hidden)
│   │   ├── aurora-background.tsx  # CSS animated blobs
│   │   ├── command-palette.tsx    # Ctrl+K palette (Cmdk)
│   │   ├── connection-indicator.tsx
│   │   ├── sidebar-search.tsx
│   │   ├── shortcuts-dialog.tsx
│   │   ├── accent-picker.tsx
│   │   ├── notification-bell.tsx + notification-drawer.tsx  # ✅ R042
│   │   └── nav-items.ts           # ⚠ HARDCODED until R044 Navigation API
│   ├── modules/                   # Module-specific UI (not yet shared)
│   │   ├── users/
│   │   ├── organizations/
│   │   └── roles/
│   └── providers/                 # React context providers
│       ├── query-provider.tsx     # TanStack QueryClient
│       └── session-provider.tsx   # next-auth wrapper
│
├── lib/
│   ├── api/                       # Server-data layer (typed)
│   │   ├── client.ts              # Stats, timeseries, health
│   │   ├── query-keys.ts          # CENTRALIZED — never inline keys
│   │   ├── types.ts               # API response interfaces
│   │   ├── users.ts, feature-flags.ts, notifications.ts, …
│   ├── auth/
│   │   ├── options.ts             # next-auth Credentials → Flask
│   │   ├── types.ts               # NormalizedAuthUser, Session/JWT augmentation
│   │   └── rbac.ts                # hasRole, hasPermission, getOrgId
│   ├── hooks/
│   │   ├── use-feature-flag.ts    # ✅ R041D-UI fail-closed
│   │   ├── use-platform-mutation.ts
│   │   ├── use-keyboard-shortcuts.ts
│   │   ├── use-nav-history.ts     # Zustand persist
│   │   ├── use-notifications.ts
│   │   └── use-count-up.ts        # rAF number animation
│   ├── modules/<key>/             # Module-specific types/hooks/schemas
│   │   ├── users/
│   │   └── notifications/
│   ├── platform/                  # Cross-platform code (no Next.js dep)
│   │   └── index.ts
│   ├── theme-store.ts             # Zustand persist (accent color)
│   ├── ui/                        # Tiny UI helpers
│   ├── utils/                     # csv export, etc.
│   └── utils.ts                   # shadcn cn()
│
├── messages/                      # next-intl translations
│   └── (he.json, ar.json, en.json planned)
│
├── public/                        # Static assets + PWA
│   ├── manifest.json              # PWA manifest (RTL, Hebrew, dark)
│   └── icons/                     # 192px + 512px PWA icons
│
├── tests/
│   └── e2e/                       # Playwright
│       ├── auth/login.spec.ts     # ✅ R041F
│       ├── helpers/auth.ts
│       ├── smoke/dashboard.spec.ts
│       ├── users/{list,detail}.spec.ts
│       └── security/              # Existing security tests
│
├── docs/
│   ├── ARCHITECTURE.md            # Full Next.js architecture blueprint
│   ├── design/                    # Design system (DESIGN_SYSTEM, TOKENS, ANIMATIONS, COMPONENTS, MOBILE)
│   ├── modules/<key>/             # Per-module docs (LEGACY_INVENTORY, E2E_COVERAGE, AI_READINESS, I18N_READINESS, TESTING)
│   ├── system-upgrade/            # MASTER PLAN — see ./03-roadmap/master-roadmap.md
│   ├── auth/README.md
│   └── bmad-scan/                 # ← THIS DIRECTORY (BMAD generated)
│
├── bmad/                          # BMAD config + agent overrides
│   ├── config.yaml
│   └── agent-overrides/
├── planning-artifacts/            # BMAD planning artifacts (PRDs, briefs, etc.)
│   └── workflow-status.yaml
├── implementation-artifacts/      # BMAD-format stories (during implementation)
│   └── stories/
│
└── .github/                       # PR template + issue template
    ├── ISSUE_TEMPLATE/platform-round.yml
    └── pull_request_template.md
```

## Critical entry points

| Entry | Purpose |
|---|---|
| `app/layout.tsx` | Root document — fonts, theme provider, query provider |
| `app/(dashboard)/layout.tsx` | Authenticated shell — Sidebar + Topbar + bottom nav + keyboard shortcuts |
| `app/api/proxy/[...path]/route.ts` | The ONLY way to talk to Flask |
| `lib/auth/options.ts` | next-auth configuration (Credentials provider) |
| `lib/api/query-keys.ts` | All TanStack Query keys (centralization is enforced) |

## Folders agents must not modify

- `components/ui/` — shadcn/ui primitives (copy-paste only via shadcn CLI).
- `docs/system-upgrade/03-roadmap/_legacy/` — archived original roadmap docs (audit only).

## Module folder convention

When a new module is added (e.g. helpdesk), the layout is:

```
app/(dashboard)/helpdesk/             # Routes (page.tsx, [id]/page.tsx, …)
components/modules/helpdesk/          # Module-only UI (TicketStatusBadge, …)
lib/modules/helpdesk/                 # types.ts, hooks.ts, schemas.ts
lib/api/helpdesk.ts                   # Typed API client functions
docs/modules/04-helpdesk/             # Module-specific docs
```

Cross-module reusable patterns get extracted to `components/shared/` only after appearing in 2+ modules (anti-overengineering rule from master-roadmap §11).
