# 10 — Target Architecture

_Last updated: 2026-04-24_

---

## Guiding Principles

1. **Evolutionary, not revolutionary** — preserve the backend investment; modernize the surface
2. **Frontend-backend contract first** — define the API before building the UI
3. **RTL and i18n as structural requirements** — not optional features
4. **Multi-tenant security at every layer** — org_id enforced from auth session down
5. **Real-time where it matters** — investigation status, approvals, voice calls
6. **Observability from day one** — every new service ships with metrics + logs
7. **AI-maintainable codebase** — every module has an INDEX.md; file headers state purpose + auth; dead code is deleted, not commented out; file size stays bounded so AI agents read the whole module in one context window

---

## Module Data Ownership

Every database table in the system must be classified into one of three categories:

| Category | Definition | Export/Import |
|----------|-----------|--------------|
| **Owned** | Lifecycle belongs to the module | Module may export and import rows |
| **Referenced** | Module reads but does not own | Export reference key only; remap on import |
| **Core/Shared** | Owned by platform (`users`, `orgs`, `roles`) | Never overwritten on import; remapped only |

Each module declares its data ownership in a `dataContract` section in its manifest. See `24-core-platform-and-module-system.md` for full specification.

Export packages are versioned JSONL archives — not SQL dumps. Every import runs a mandatory dry-run before writing. Secrets are never exported.

---

## AI-Agent Design Principles

These principles apply to every file written or modified in this project:

| Principle | Rule |
|-----------|------|
| **Navigable** | Every `apps/<module>/` has `INDEX.md`; every platform-ui route has `README.md` |
| **Bounded files** | Python routes ≤200 lines; TypeScript page components ≤150 lines; split beyond that |
| **No dead addresses** | `*_OLD_*`, `*_BACKUP*`, and commented-out implementations are deleted (not kept) |
| **Self-describing headers** | Module-level docstring (Python) or JSDoc (TypeScript) on every file; states purpose, auth requirement, tenant-scoping |
| **Explicit boundaries** | `apps/A/` does not import from `apps/B/`; `lib/api/` does not import from `app/`; boundaries declared and enforced by `import-linter` |
| **One canonical implementation** | When an old and new version of the same thing co-exist, the old one is archived or deleted — never left as a sibling file |
| **Capability-first** | Before building any new module feature, check `26-platform-capabilities-catalog.md` — if a shared capability exists or should exist, build/extend it first, then use it. Module-local implementations used in 2+ modules must be promoted to the catalog. |

For the full policy see `23-ai-maintainability-and-code-cleanup.md`.

---

## Platform Capabilities Layer

Platform capabilities are horizontal building blocks reused across all 19 modules. They are NOT module-specific components — they are platform-owned patterns that any module composes.

**Canonical location:** `components/shared/` (UI components), `lib/hooks/` (hooks), `lib/utils/` (utilities)

**Full catalog:** `docs/system-upgrade/26-platform-capabilities-catalog.md`

**Key capabilities (as of Round 014):**

| Capability | Status | Location |
|-----------|--------|----------|
| PlatformDataGrid | ✅ | `components/shared/data-table/` |
| PermissionGate | ✅ | `components/shared/permission-gate.tsx` |
| PlatformTenantContext | ✅ | `lib/auth/`, `app/api/proxy/` |
| PlatformAPI Client | ✅ | `lib/api/`, `app/api/proxy/` |
| PlatformImportExport (CSV) | 🔵 partial | `lib/utils/csv.ts` |
| PlatformDetailView | 🔵 partial | `app/(dashboard)/users/[id]/`, `organizations/[id]/` |
| PlatformPageShell | ⬜ pending | inline in pages — needs extraction |
| PlatformForm | ⬜ pending | `lib/modules/*/schemas.ts` — needs wrapper |
| PlatformErrorBoundary | ⬜ pending | — |

---

## Repository Strategy

```
Monorepo approach is NOT recommended yet — too much churn to migrate the platformengineer monolith.

Current:
  platformengineer/   (Flask backend — stays as-is during migration)
  platform-ui/        (Next.js frontend — THIS repo — primary development focus)

Future (when extracting services):
  platform-api/       (FastAPI — new API gateway, shares DB with platformengineer during transition)
  platform-ai-providers/  (extracted Python package)
```

Keep `platformengineer` and `platform-ui` as separate repositories with clean API contracts. Introduce a monorepo only if shared package count exceeds 3 and team size warrants it.

---

## Target System Diagram

```
                    ┌─────────────────────────────────────────────┐
                    │              Cloudflare                      │
                    │  DNS + WAF + Tunnel + DDoS protection        │
                    └──────────────────────┬──────────────────────┘
                                           │
                    ┌──────────────────────▼──────────────────────┐
                    │            Nginx Ingress (EKS)               │
                    │  /          → platform-ui (Next.js pod)      │
                    │  /api/      → platform-api (FastAPI pod)     │
                    │  /legacy/   → web-api (Flask pod)            │
                    │  /voice-edge/ → voice-edge pod               │
                    └──────────────────────────────────────────────┘

    ┌────────────────────────────────────────────────────────────────┐
    │                    platform-ui (Next.js)                       │
    │  App Router + RSC + next-auth + TanStack Query + Zustand       │
    │  shadcn/ui + Tailwind v4 + Framer Motion + next-intl (RTL)    │
    │  PWA-ready + bottom nav (mobile) + command palette             │
    └───────────────────────────┬────────────────────────────────────┘
                                │ HTTPS + JWT (Bearer) or cookie
    ┌───────────────────────────▼────────────────────────────────────┐
    │                 platform-api (FastAPI) — NEW                   │
    │  Async SQLAlchemy + Pydantic v2 + OpenAPI auto-generated       │
    │  Domains: dashboard, helpdesk, agents, ALA, billing, admin     │
    │  Auth: JWT validation + org_id scoping                         │
    │  SSE endpoints for live investigation status                   │
    └───────┬───────────────────────────────────────────────────────┘
            │ Internal K8s svc calls
    ┌───────▼────────────────┐    ┌─────────────────────────────────┐
    │  web-api (Flask)       │    │  Celery Workers (x3 pools)      │
    │  Legacy routes during  │    │  life / ops / agents            │
    │  migration; eventually │    │  Long-running AI tasks          │
    │  retired               │    └─────────────────────────────────┘
    └───────┬────────────────┘
            │
    ┌───────▼────────────────────────────────────────────────────────┐
    │                      Data Layer                                │
    │  PostgreSQL (platform-db) — primary + partitioned tables       │
    │  PostgreSQL (rag-db) — vector embeddings                       │
    │  Redis — Celery broker + circuit breaker + SSE pub/sub         │
    └────────────────────────────────────────────────────────────────┘

    ┌──────────────────────┐    ┌───────────────────────────────────┐
    │  Voice Stack (EKS)   │    │  AI Providers (external)          │
    │  voice-edge (WebRTC) │    │  Anthropic / Gemini / OpenAI      │
    │  realtime-voice-go   │    │  Ollama (self-hosted option)      │
    │  STUNner (TURN)      │    └───────────────────────────────────┘
    └──────────────────────┘
```

---

## Module Boundaries (Target)

### Frontend (platform-ui)

```
app/
├── (auth)/           — Login, SSO, 2FA
├── (dashboard)/      — All authenticated pages
│   ├── page.tsx      — Dashboard overview
│   ├── helpdesk/     — Sessions, tickets, approvals, SLA
│   ├── agents/       — AI investigation console, live status
│   ├── ala/          — Life assistant interface
│   ├── knowledge/    — KB articles, runbooks, RAG
│   ├── voice/        — Voice call history, live session
│   ├── billing/      — Usage, plans, Stripe portal
│   ├── users/        — User management
│   ├── orgs/         — Org management (system admin)
│   ├── settings/     — System, org, notifications, integrations
│   ├── health/       — Service health, Prometheus widgets
│   ├── logs/         — Audit log, activity stream
│   └── onboarding/   — Setup wizard for new orgs
└── api/
    └── proxy/        — Next.js route handler → backend API
```

### Backend API (FastAPI — target)

```
platform-api/
├── auth/             — JWT issue, validate, refresh
├── helpdesk/         — Sessions, tickets, approvals, SLA
├── agents/           — Investigation create/read/stream
├── ala/              — ALA session management
├── knowledge/        — KB CRUD, RAG search
├── billing/          — Usage stats, plan info
├── admin/            — Org, user, feature flag management
└── health/           — Service health aggregation
```

---

## Security Model (Target)

```
1. Authentication:
   platform-ui → POST /auth/login → JWT (short-lived, 15min) + refresh token (httpOnly cookie)
   or: next-auth OAuth/SAML → exchange for platform JWT

2. Authorization:
   Every API request includes Bearer JWT
   FastAPI middleware extracts org_id + role from JWT — never from request body
   RBAC: same role model as current (admin, manager, technician, end_user)
   Tenant isolation: org_id required on all data queries

3. Frontend:
   Next.js middleware reads session, gates routes by role
   Server Components don't expose sensitive data to client
   API proxy strips internal headers, adds CSRF token for state-changing requests

4. Secrets:
   No change — SSM Parameter Store remains source of truth
```

---

## API Contract Strategy

1. **FastAPI** auto-generates OpenAPI spec from Pydantic models
2. **openapi-typescript** generates `platform-ui/lib/api/generated/*.ts` on every backend push
3. CI fails if generated types diverge from committed types
4. Platform-ui imports from `generated/` — never writes types manually for API shapes

---

## Real-Time Strategy

```
Investigation status updates:
  FastAPI SSE endpoint: GET /api/agents/{id}/stream
  platform-ui: useEventSource hook subscribes; TanStack Query invalidated on events

Approval notifications:
  Redis pub/sub: Celery publishes approval_required event
  FastAPI SSE: per-org broadcast channel
  platform-ui: notification bell + modal via Zustand

Voice session status:
  WebRTC signaling status via existing voice-edge
  platform-ui polls or subscribes via SSE for billing/transcript status
```

---

## Design System Strategy

```
platform-ui/
├── components/
│   ├── ui/           — shadcn/ui base components (never modified directly)
│   ├── shared/       — custom extensions (TiltCard, CursorGlow, etc.)
│   └── domain/       — domain-specific components (TicketCard, AgentStatus, etc.)
├── lib/
│   ├── theme-store.ts — Zustand theme store
│   └── design-tokens.ts — centralized tokens (colors, spacing)
```

Storybook as living documentation of every component with RTL stories for each.

---

## Cross-Platform Strategy

| Platform | Approach |
|----------|---------|
| Web | platform-ui (this repo) — primary |
| Mobile (Android) | Existing React Native app; migrate to EAS Build + CI |
| Mobile (iOS) | React Native + EAS Build; add Apple provisioning |
| Desktop | Electron or Tauri wrapping platform-ui — deferred until web is stable |
| PWA | platform-ui already has PWA scaffold; complete service worker |

**Cross-platform readiness audit:** See `docs/system-upgrade/28-cross-platform-structure-audit.md` (Round 016-prep).
Current score: **55/100** overall. Logic layer: 85/100. Blocking issue: `lib/auth/types.ts` mixes `NormalizedAuthUser` (cross-platform) with next-auth module augmentation (web-only).

**Required before mobile/desktop work begins (Phase CP-0):**
1. Extract `NormalizedAuthUser` + `FlaskUserPayload` to `lib/platform/auth/user-types.ts`
2. Parameterize API base URL in `lib/api/client.ts`
3. Extract `rowsToCsv()` from `lib/utils/csv.ts`
4. Create `lib/platform/` directory as the canonical cross-platform code boundary

**Already cross-platform:** `lib/auth/rbac.ts`, `lib/utils/format.ts`, `lib/api/query-keys.ts`, all `lib/modules/*/types.ts`, `lib/ui/motion.ts`
