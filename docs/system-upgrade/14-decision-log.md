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

## ADR-013 — AI-Maintainable Codebase and Cleanup-First Modernization

**Status**: Accepted

**Context**: This project relies heavily on AI coding assistants (Claude Code) for implementation. AI agents generate better, safer code when they can read a clean, well-structured codebase. The current codebase has: dead backup files (`api_auth_OLD_BACKUP.py`), no per-module INDEX.md files, missing file headers, 4 embedded Vite apps with duplicated components, and Jinja2 templates co-existing with platform-ui equivalents. This creates context pollution that degrades agent output quality and increases the risk of agents modifying the wrong layer.

**Options considered**:
- A: Clean up only when convenient — no policy, ad hoc
- B: Clean up after migration — retire Jinja2 last, delete dead code last
- C: Cleanup-first per module — before building a platform-ui page for a module, sweep dead code and create INDEX.md for that module's backend; delete Jinja2 on parity (same PR) ✅

**Chosen direction**: **Option C** — cleanup is a first-class development activity, not a follow-up. Each module is cleaned before its platform-ui equivalent is built. Jinja2 templates are deleted the same day the platform-ui equivalent reaches parity.

**AI-agent-friendly conventions required by this ADR**:
1. Every `apps/<module>/` has `INDEX.md` (created before or during the module's platform-ui migration)
2. Every new/modified file has a standard module-level header (purpose + auth + tenant scope)
3. `*_OLD_*` and `*_BACKUP*` files are deleted after grep-confirm + 1-week monitor; not archived indefinitely
4. File size gates enforced: Python routes ≤200 lines, TypeScript pages ≤150 lines
5. `vulture` + `knip` run as part of the pre-migration checklist for each module
6. Jinja2 template deleted in same PR as platform-ui parity confirmation — no dual-maintenance

**Consequences**:
- Each module migration starts with a cleanup subtask (estimated 0.5 days overhead per module)
- `docs/system-upgrade/23-ai-maintainability-and-code-cleanup.md` is the reference document
- The cleanup checklist in §13 of that document is added to every module PLAN.md's DoD
- Vite app retirement follows the explicit schedule in §10 of that document

**Affected modules**: All 19 modules + `platformengineer/apps/` directory

---

## ADR-014 — Tenant-Aware Module Data Export/Import

**Status**: Accepted (design; implementation pending)

**Context**: Module configuration export/import alone is insufficient for a production SaaS system. Tenant migrations, environment promotions (TEST → PROD), disaster recovery, and support debugging all require moving actual database table data between tenants or environments. A raw DB dump is unsafe (exports all tenants, all secrets, no versioning). A governed, per-module, tenant-scoped package format is required.

**Options considered**:
- A: Raw `pg_dump` / SQL restore — fast to implement; exports everything including secrets and cross-tenant data; no dry-run; no versioning
- B: CSV per table — simple; no FK awareness; no schema version; no signature; no PII handling
- C: Governed JSONL module package with manifest, dry-run, ID remapping, and audit log ✅

**Chosen direction**: **Option C** — versioned ZIP package per module per tenant, with JSONL data files, explicit owned/referenced/core table classification, mandatory dry-run before write, ID remapping, signature, and full audit trail. See full specification in `24-core-platform-and-module-system.md`.

**Core invariants this ADR enforces**:
1. Exports are not raw DB dumps — they are module-owned data packages
2. Owned/referenced/core table distinction is mandatory in every module `dataContract`
3. Import must complete a dry-run validation before any write operation
4. Every import attempt (including dry-runs) creates an audit record
5. Secrets (`secretColumns`) are never exported regardless of manifest declarations
6. PII columns must be declared; anonymized in non-full exports
7. Cross-tenant imports (source org ≠ target org) require `is_system_admin=True`
8. Core tables (`users`, `organizations`, `roles`, `permissions`) may never be overwritten by module import — only remapped via `user-map.json` / `org-map.json`

**Consequences**:
- Each module must define a `dataContract` before enabling export/import
- Platform must maintain an authoritative `secretColumns` registry (not module-declared)
- Import pipeline wraps writes in a DB transaction; rollback on any error
- Download links are time-limited (24h for tenant data; 7d for config-only)
- Export/import history visible in module management UI
- 15 backlog tasks added — see `15-action-backlog.md §Module Data Export/Import`

**Affected modules**: All 19 modules (at varying priority); core platform; billing; helpdesk highest priority

---

## ADR-015 — Module-First JSON API Pattern (Round 010)

**Status**: Accepted

**Context**: Existing Flask routes for admin user management (`/admin/users/*`) return HTML via `render_template()` — they are Jinja2 views, not JSON APIs. The existing `/api/v1/users` endpoint uses API Token auth (`@api_token_required`), not JWT Bearer. Platform-ui needs JWT-authenticated, org-scoped JSON endpoints.

**Decision**: For each module being migrated to platform-ui, create a dedicated JSON API blueprint alongside (not replacing) the existing Jinja2 admin routes. New endpoints use `@jwt_required`, are scoped by `g.jwt_user.org_id`, and exclude AI agents and sensitive fields by default. The Jinja2 routes remain for backward compatibility until fully retired.

**Pattern**:
- New file: `apps/<module>/api_routes.py` or `apps/authentication/user_api_routes.py`
- Blueprint URL prefix: `/api/<module>` (e.g. `/api/users`)
- Auth: always `@jwt_required`
- Org scoping: always from `g.jwt_user.org_id`, never from request body
- Response envelope: `{success: bool, data: {...}}` consistent with other JWT endpoints
- Exclude from responses: all password fields, tokens, MFA secrets

**Proxy mapping**: Each new module JSON API gets an entry in platform-ui proxy PATH_MAP:
```
"<module>": "/api/<module>"
```

**Consequences**:
- Two auth systems coexist temporarily: session cookie (Jinja2) + JWT Bearer (platform-ui)
- Module JSON API is additive — does not break existing admin panel
- Each module migration requires creating a new `*_api_routes.py` file
- Long-term: retire Jinja2 routes once all modules migrated (Phase 4)

**Affected modules**: All 19 modules; Users is the reference implementation

---

_Add new ADRs here as decisions are made during implementation._
