# 11 — Recommended Tech Stack

_Last updated: 2026-04-23_

---

## Web Frontend

### Next.js 16 + React 19 ✓ ALREADY CHOSEN

**Why it fits**: App Router enables Server Components for data-heavy admin views; Edge middleware for auth guards; built-in i18n and PWA support. React 19 concurrent features align with real-time investigation updates.

**Problem it solves**: Replaces 20 Jinja2 template directories with one coherent, type-safe, component-driven frontend.

**Migration difficulty**: Low (already started correctly)

**Risks/tradeoffs**: React 19 is very recent — some shadcn/ui components may have minor hydration issues. Monitor React 19 stable release cadence.

---

### TailwindCSS v4 ✓ ALREADY CHOSEN

**Why it fits**: CSS-first configuration; RTL support via `dir` attribute and logical properties. v4 is faster and removes config complexity.

**Risk**: v4 is cutting edge — some third-party components may not support it fully. Stay on `@tailwindcss/postcss` as used.

---

### shadcn/ui + Radix UI ✓ ALREADY CHOSEN

**Why it fits**: Accessible primitives, not a component library you upgrade. Copy-paste ownership means no breaking update risk. Radix provides correct ARIA for every interactive component.

**Add**: `@radix-ui/react-dialog`, `@radix-ui/react-tabs`, `@radix-ui/react-select` as features are built.

---

### Capability Layer Standards (Round 011)

Horizontal capabilities (DataGrid, forms, import/export, permissions, audit mutations) are standardized in `docs/system-upgrade/25-open-source-capability-layer.md`. Do not evaluate these choices per-module — follow ADR-016.

**Approved additions to install:**
- `nuqs` — URL filter/pagination state (Phase 1)
- `papaparse` — CSV import/export (Phase 2)
- `@tanstack/react-virtual` — virtual scroll for large tables (Phase 2)
- `react-grid-layout` — dashboard drag-resize (Phase 3, deferred)
- `xlsx` — Excel export, per-module only (Phase 3)

---

### TanStack Query v5 ✓ ALREADY CHOSEN

**Why it fits**: Server state management (cache, background refresh, optimistic updates) is exactly what investigation status and approval notifications need.

**Do not use**: React Context or Zustand for server state — TanStack Query owns that.

---

### Zustand v5 ✓ ALREADY CHOSEN

**Why it fits**: Minimal client state (theme, command palette open state, sidebar state). Not for server data.

---

### next-auth v4 ✓ ALREADY CHOSEN (but upgrade to v5 when stable)

**Current**: v4 — functional, maintained.
**Recommendation**: Plan migration to Auth.js v5 when it reaches stable. v5 has better Edge support and cleaner API. Not urgent.

---

### next-intl ✓ ALREADY CHOSEN

**Why it fits**: Server and client component support; RTL locale routing; Hebrew + Arabic support. The only i18n library worth using with App Router.

**Must do**: Migrate all hardcoded Hebrew strings from component code into `messages/` JSON files.

---

### Framer Motion ✓ ALREADY CHOSEN

**Note**: LazyMotion correctly used for code splitting. Keep using `domAnimation` feature set only — don't import full bundle.

---

## Backend API (New Layer)

### FastAPI — RECOMMENDED for new API surface

**Why it fits THIS system**:
- Auto-generates OpenAPI 3.1 spec — eliminates manual type maintenance
- Pydantic v2 validation — catches bad input at the boundary
- Async by default — better than sync Flask for I/O-heavy AI calls
- Type hints throughout — better IDE support for 81-module codebase
- Dependency injection built-in — fixes the testability problem

**Problem it solves**: No API contract, inconsistent validation, hard to unit test services

**Migration difficulty**: Medium. Flask stays for legacy routes; FastAPI handles new routes. Route via Nginx path prefix (`/api/` → FastAPI, `/legacy/` → Flask during transition).

**Risks**: Adds another service to maintain. Only worth it if you commit to building new features there, not in Flask.

---

### Keep Flask for: Jinja2 templates, legacy API routes, Celery task management

Flask is not broken — it's doing its job. Don't rewrite what works. Extract new features to FastAPI; migrate old routes as the Jinja2 templates are replaced.

---

## Auth Strategy

### next-auth v4 Credentials Provider → Flask Session + JWT

```
1. User submits login form in platform-ui
2. next-auth credentials provider POSTs to Flask /api/auth/login
3. Flask validates credentials, returns user profile + roles + JWT
4. next-auth stores in encrypted session cookie
5. Next.js middleware reads session, enforces role-based routes
6. API calls include JWT Bearer header via API proxy route
```

**For SSO (future)**: Add next-auth SAML/OAuth providers — requires SAML fix on backend (see C1 in security assessment).

---

## State Management

| State Type | Tool |
|-----------|------|
| Server state (API data) | TanStack Query |
| UI state (theme, sidebar, modals) | Zustand |
| Form state | react-hook-form + zod |
| URL state (filters, pagination) | `nuqs` (URL search params — add this) |

**Add `nuqs`**: Strongly recommended for filter/search state in lists. Prevents losing state on navigation.

---

## Testing

| Layer | Tool | Priority |
|-------|------|----------|
| Backend unit | pytest (keep) | — |
| Backend integration | pytest + testcontainers (add) | Medium |
| Frontend unit | Vitest (add) | Medium |
| Frontend e2e | Playwright (add) | High |
| API contract | Schemathesis against OpenAPI (add) | Medium |

---

## Mobile

**Keep React Native + Expo** — correct choice.

**Add**:
- EAS Build for both Android + iOS
- Expo Updates for OTA pushes
- `expo-secure-store` for token storage (not AsyncStorage for sensitive data)

---

## Design System

| Tool | Purpose |
|------|---------|
| shadcn/ui | Base components (keep) |
| Storybook | Component documentation + visual testing |
| Chromatic | Visual regression tests per PR |

---

## Observability

| Tool | Purpose |
|------|---------|
| Prometheus | Already deployed — keep |
| Grafana | Add via Helm — dashboards for API latency, AI costs, investigation success rate |
| Loki | Add — log aggregation via Fluent Bit on EKS |
| Tempo (or Jaeger) | Distributed tracing — add OpenTelemetry SDK to FastAPI + Go services |

---

## Deployment/DevEx

| Tool | Status | Note |
|------|--------|------|
| Docker + EKS | Keep | Working |
| GitHub Actions | Keep + expand | Add platform-ui build + deploy workflow |
| kustomize | Keep | Add platform-ui overlay |
| `dev-local-full.sh` | Keep | Add `--ui` flag to start platform-ui dev server |
| Turborepo (deferred) | Consider | Only if 3+ shared packages emerge |

---

## Monorepo vs Multi-Repo

**Current recommendation: Multi-repo** (`platformengineer` + `platform-ui` separate).

Reason: The backend is a complex 3GB repository with binary assets, specialized scripts, and K8s configs. A monorepo with this content would be impractical. Keep them separate with API contracts as the boundary.

**Revisit** when: shared TypeScript/Python packages exceed 3, team grows beyond 5 developers.
