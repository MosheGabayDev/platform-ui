# 10 — Target Architecture

_Last updated: 2026-04-23_

---

## Guiding Principles

1. **Evolutionary, not revolutionary** — preserve the backend investment; modernize the surface
2. **Frontend-backend contract first** — define the API before building the UI
3. **RTL and i18n as structural requirements** — not optional features
4. **Multi-tenant security at every layer** — org_id enforced from auth session down
5. **Real-time where it matters** — investigation status, approvals, voice calls
6. **Observability from day one** — every new service ships with metrics + logs

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
