# 14 — Decision Log

_Format: ADR (Architecture Decision Record)_
_Last updated: 2026-04-24_

---

## ADR-001 — Next.js as Primary Frontend Platform

**Status**: Accepted (already in execution)

**Context**: The existing Jinja2 templates are fragmented, inconsistent, and cannot express the complexity of real-time AI investigation flows, approval workflows, and voice session management. A dedicated frontend framework is needed.

**Options considered**:
- Continue with Jinja2 + progressive JavaScript enhancement
- Vue.js (Nuxt) — similar capability to Next.js
- Next.js — App Router, RSC, edge middleware, strong ecosystem
- Remix — good but smaller ecosystem for RTL/i18n

**Chosen direction**: Next.js 16 with App Router, React 19, TailwindCSS v4, shadcn/ui.

**Consequences**:
- Requires authentication bridge between Next.js and Flask
- Requires stable API contract before all features can be migrated
- 4 embedded Vite apps must eventually be consolidated
- Jinja2 templates retired feature-by-feature, not all at once

---

## ADR-002 — Separate Repositories (Not Monorepo)

**Status**: Accepted

**Context**: `platformengineer` is a 3GB+ repository with binary assets, K8s configs, scripts, and multiple languages. Merging it with `platform-ui` would create an impractical development environment.

**Options considered**:
- Monorepo with Turborepo
- Separate repositories

**Chosen direction**: Separate repositories. API contracts (OpenAPI → TypeScript codegen) define the boundary.

**Consequences**:
- Backend and frontend release independently
- Shared types managed via codegen, not shared packages
- Revisit if shared packages exceed 3

---

## ADR-003 — RTL and Hebrew as Default

**Status**: Accepted (already in execution)

**Context**: Primary user base is Hebrew-speaking. Israeli MSP market is the initial target.

**Options considered**:
- RTL as optional / locale-toggle
- RTL-first with LTR as alternate

**Chosen direction**: `lang="he" dir="rtl"` as default in root layout. `next-intl` for all string localization.

**Consequences**:
- Every component must be tested with RTL layout
- Storybook stories need RTL variants
- All text content must live in `messages/` JSON — no hardcoded strings in components

---

## ADR-004 — TanStack Query for Server State, Zustand for UI State

**Status**: Accepted

**Context**: Need to distinguish between server-cached data (API responses) and client-only UI state (theme, sidebar open, command palette).

**Chosen direction**:
- TanStack Query: all API data — caching, background refresh, optimistic updates
- Zustand: UI state only — theme, sidebar, modal state, command palette
- react-hook-form + zod: form state

**Consequences**:
- Do not put API responses into Zustand stores
- All server mutations go through TanStack Query `useMutation`

---

## ADR-005 — Keep Flask Monolith, Add FastAPI for New Surface

**Status**: Proposed (not yet in execution)

**Context**: Flask is synchronous; has no auto-generated OpenAPI; input validation is inconsistent. But it has 81 modules of working business logic that should not be rewritten.

**Options considered**:
- Rewrite all Flask routes in FastAPI
- Keep Flask for everything
- Flask for legacy + FastAPI for new routes (dual-service approach)
- Migrate to Django REST Framework

**Chosen direction**: Keep Flask; add FastAPI as new API gateway for new features and migrated routes. Route via Nginx path prefix.

**Consequences**:
- Temporary dual-service complexity during migration
- Flask routes stay until Jinja2 template is retired for that domain
- FastAPI owns OpenAPI spec → TypeScript codegen pipeline
- FastAPI shares the same PostgreSQL database

**Pending decision**: Need to evaluate operational cost of running two Python services in EKS.

---

## ADR-006 — next-auth v4 for Frontend Auth (Upgrade to v5 Planned)

**Status**: Accepted (next-auth v4 already in `package.json`)

**Context**: Next.js App Router needs server-side session management. next-auth provides this with credentials + OAuth providers.

**Chosen direction**: next-auth v4 now; plan migration to Auth.js v5 when stable.

**Consequences**:
- Must implement real credentials provider (currently stub)
- SAML support requires backend fix first
- Auth.js v5 migration is non-trivial but planned

---

## ADR-007 — API Response Envelope Standard

**Status**: Proposed

**Context**: Current Flask endpoints return inconsistent shapes. Some return `{ data: ... }`, some return arrays directly, some return `{ status, message }`.

**Chosen direction** (proposed): All new endpoints return:
```json
{
  "data": { ... },
  "error": null,
  "meta": { "page": 1, "total": 100 }
}
```

Error case:
```json
{
  "data": null,
  "error": { "code": "UNAUTHORIZED", "message": "..." },
  "meta": null
}
```

**Consequences**:
- Existing endpoints not changed immediately
- New endpoints and migrated endpoints follow this standard
- platform-ui API client updated to unwrap `data` automatically

---

---

## ADR-011 — Auth Bridge: next-auth Credentials + Flask JWT

**Status**: Accepted

**Context**: platform-ui has zero working authentication. The login form is a stub. Flask has two parallel auth systems: Flask-Login (session cookie, browser/Jinja2) and JWT (`/api/auth/login`, mobile app). platform-ui must connect to one of them without browser CORS issues.

**Options considered**:
- A: Pure Flask session cookie proxy — opaque, hard to extract user data, SameSite complexity
- B: next-auth + Flask session cookie (hybrid dual-cookie) — fragile, two expiry systems
- C: next-auth Credentials + Flask JWT — clean JSON contract, user data in token, server-to-server (no CORS) ✅
- D: Auth.js v5 — breaking API, still beta, package.json already has v4

**Chosen direction**: **Option C** — next-auth v4 Credentials provider calls `POST /api/auth/login` (existing mobile JWT endpoint). Stores `{accessToken, refreshToken, user: {id, email, role, org_id, permissions}}` in next-auth JWT session cookie. Proxy attaches `Authorization: Bearer <accessToken>` on every upstream call.

**Consequences**:
- `NEXTAUTH_SECRET` must be added to SSM Parameter Store + K8s `platform-secrets`
- Flask `POST /api/auth/login` is now shared by mobile app + platform-ui (no change needed)
- Flask needs two small additions: `POST /api/auth/logout` (invalidate refresh token) + `GET /api/auth/me` (validation)
- Flask CORS allow-list must include `http://localhost:3000` (dev) and `https://platform-ui-domain` (prod)
- Mobile app: no change — continues to use JWT endpoint directly

**Risks**:
- MFA flow: `POST /login` may redirect to `/two-factor-login` instead of returning JSON — needs handling in `authorize` callback
- 15-min JWT access token: next-auth JWT callback must refresh transparently

**Follow-up tasks**: See `15-action-backlog.md §Auth Bridge Implementation`

---

## ADR-012 — No CSRF Token for platform-ui API Calls

**Status**: Accepted

**Context**: Flask has `WTF_CSRF_CHECK_DEFAULT = False` — CSRF auto-check is disabled for all routes. All platform-ui API calls use `Content-Type: application/json` through a Next.js proxy with `Authorization: Bearer` header.

**Chosen direction**: No CSRF token required for platform-ui → Flask calls. JWT Bearer token provides equivalent protection. next-auth session cookie is `SameSite=Lax` which blocks cross-origin form submissions.

**Consequences**: No `X-CSRFToken` header implementation needed.

---

_Add new ADRs here as decisions are made during implementation._
