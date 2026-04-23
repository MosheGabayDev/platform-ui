# 14 — Decision Log

_Format: ADR (Architecture Decision Record)_
_Last updated: 2026-04-23_

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

_Add new ADRs here as decisions are made during implementation._
