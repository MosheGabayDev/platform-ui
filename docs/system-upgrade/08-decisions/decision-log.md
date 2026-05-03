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

**Follow-up tasks**: See `../03-roadmap/action-backlog.md §Auth Bridge Implementation`

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

**Chosen direction**: **Option C** — versioned ZIP package per module per tenant, with JSONL data files, explicit owned/referenced/core table classification, mandatory dry-run before write, ID remapping, signature, and full audit trail. See full specification in `../04-capabilities/module-system.md`.

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
- 15 backlog tasks added — see `../03-roadmap/action-backlog.md §Module Data Export/Import`

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

## ADR-016 — Open-Source Capability Layer (Round 011)

**Status**: Accepted

**Context**: 19 modules need the same horizontal capabilities: data grids, charts, forms, file import/export, permission gates, multi-tenant safety, and audit mutations. Without a standardized choice, each module developer would evaluate libraries independently, creating bundle duplication and inconsistent UX patterns.

**Options considered**:
- Per-module library choices (rejected — creates 19 inconsistent patterns)
- AG Grid for tables (rejected — enterprise license needed for RTL; conflicts with TanStack Query cache ownership)
- Material UI / Ant Design component libraries (rejected — conflicts with shadcn/ui; heavy bundle)
- `moment.js` / `date-fns` for dates (rejected — `Intl.*` covers all use cases at zero bundle cost)

**Chosen direction**: Standardize on the libraries already installed (`@tanstack/react-table`, `react-hook-form`, `zod`, `recharts`, `sonner`, `zustand`) plus a minimal set of approved additions (`nuqs`, `papaparse`, `@tanstack/react-virtual`, `react-day-picker` via shadcn). `react-grid-layout` and `xlsx` are deferred to Phase 3, installed per-module only.

**Internal patterns** (not libraries):
- `usePermission()` hook + `<PermissionGate>` component for all action gating
- `useAuditedMutation` pattern (TanStack Query mutations with meta context)
- Org ID always from `session.user.org_id` — never from URL params or request body

**Consequences**:
- Every module list page uses `DataTable<T>` (TanStack Table, `manualPagination: true`)
- Every form uses react-hook-form + zod, schema in `lib/modules/<module>/schemas.ts`
- Every mutation lives in `lib/modules/<module>/mutations.ts`
- Filter/pagination state uses `nuqs` after it's installed (Phase 1)
- CSV export with BOM (Hebrew Excel compatibility)
- `react-grid-layout` deferred to Phase 3 (Monitoring module)
- Libraries listed in "What NOT to Add" table in `../04-capabilities/oss-layer.md` require explicit approval before installation

**Full reference**: `docs/system-upgrade/25-open-source-capability-layer.md`

**Affected modules**: All 19 modules

---

---

## ADR-017 — Shared Capabilities Promotion Policy

**Date:** 2026-04-24
**Round:** 015

**Context:** Users and Organizations detail pages each defined identical `InfoRow`, `BoolBadge`, and `StatChip` helpers locally. List pages duplicated `LazyMotion` + header animation boilerplate. Risk of drift as more modules are added.

**Decision:** Any pattern appearing in 2+ module files is promoted to `components/shared/` or `lib/ui/`. No local re-definitions allowed.

**Promotion threshold:** 2 occurrences in production code, OR 2nd consumer is planned within 1 sprint.

**Alternatives:**
- Copy-paste with comment (rejected — silent drift)
- Abstract only at 3+ consumers (rejected — 3rd consumer always arrives with API differences, forcing a breaking change)

**Consequences:**
- `components/shared/detail-view/`, `components/shared/stats/`, `components/shared/page-shell/`, `components/shared/form/`, `components/shared/error-state.tsx`, `components/shared/error-boundary.tsx`, `components/shared/confirm-action-dialog.tsx` all created R015
- All future module list pages MUST use `PageShell` as outermost wrapper
- All future detail pages MUST use `DetailSection` + `InfoRow` + `DetailHeaderCard`
- All future forms MUST use `PlatformForm` + `FormActions` + `FormError`

**Affected modules**: All 19 (policy), 01-Users + 02-Organizations (first consumers)

---

---

## ADR-018 — `lib/platform/` Cross-Platform Boundary

**Date:** 2026-04-24
**Round:** 016

**Context:** As platform-ui prepares for React Native and Electron expansion, there is no structural separation between web-specific logic (DOM, next-auth, Next.js router) and portable logic (pure functions, TypeScript interfaces). Any file that accidentally imports `next-auth` or `document` becomes a hard blocker for mobile builds.

**Decision:** Create and enforce `lib/platform/` as the explicit cross-platform code boundary.

**Rules:**
- `lib/platform/*` — **cross-platform only**: pure TypeScript, pure functions, `Intl.*`, standard JS. Zero React, zero Next.js, zero DOM.
- `lib/` (non-platform) — web/Next.js OK but should be a thin adapter/shim when possible
- `components/*` — web React only (shadcn, Tailwind, DOM)
- `app/*` — Next.js App Router only

**Enforcement:** Every new file under `lib/platform/` must include a `@platform cross` JSDoc comment. TypeScript `tsc --noEmit` is the guard — any accidental `next-auth` import will break if the platform file is later consumed in a non-web environment.

**Migration strategy:** Existing web files become re-export shims pointing to `lib/platform/`. No import changes needed in web code. Mobile/desktop imports directly from `lib/platform/`.

**Alternatives:**
- Monorepo with shared package (rejected — premature; adds tooling complexity before a second consumer exists)
- Barrel re-exports only with no structural separation (rejected — invisible boundary causes accidental coupling to re-emerge)

**Consequences:**
- `lib/platform/auth/types.ts` — NormalizedAuthUser importable without next-auth (unblocks RN)
- `lib/platform/permissions/rbac.ts` — RBAC testable in Node.js without jsdom
- `lib/platform/formatting/format.ts` — formatting testable in Node.js
- `lib/api/client.ts` — base URL configurable for Electron/direct-connect scenarios
- All existing web imports unchanged via re-export shims

**Affected modules**: All (policy), 01-Users + 02-Organizations (first consumers)

---

---

## ADR-019 — usePlatformMutation as the Platform Mutation Standard (2026-04-24)

**Context:** Every module needs write operations (create, update, toggle). Without a standard pattern, each page component reinvents: `useState(loading)`, error catch, cache invalidation, toast notifications, and audit header injection. Helpdesk alone has 12+ write flows; inconsistency compounds at scale.

**Decision:** All write operations in platform-ui must use `usePlatformMutation` from `lib/hooks/use-platform-mutation.ts`.

**Rules:**
- Mutation API functions live in `lib/api/<module>.ts` (e.g. `createUser`, `updateUser`)
- Zod schemas live in `lib/modules/<module>/schemas.ts` — never inline in page components
- `org_id` MUST be injected server-side from the JWT — never passed as a form field or prop
- `invalidateKeys` array is required; must include at minimum the module's `all()` key
- Toast is called from `onSuccess` callback — not inside `mutationFn`
- `serverError` string from the hook feeds into `<FormError>` at the top of the form

**Standard form stack:** PlatformForm + FormError + FormActions + useForm (zodResolver) + usePlatformMutation

**Alternatives:** Direct `useMutation` in components (rejected — repeated boilerplate); Server Actions (rejected — Flask proxy doesn't benefit).

**Consequences:** First consumers: Users Phase B (UserCreateSheet, UserEditSheet). All future modules (Organizations, Helpdesk, Billing) follow this pattern.

**Affected modules**: All write-capable modules (01-Users first; next: 02-Organizations, 04-Helpdesk)

---

## ADR-020 — Permission Dot-Notation Standard + groupPermissions Utility (2026-04-24)

**Context:** Module 03 (Roles) needs to display and group permissions. Codenames in the DB are arbitrary strings. Need a consistent grouping strategy for checklist, tag cloud, and badge color-coding.

**Decision:** Permission codenames MUST use `module.action` dot-notation (e.g. `ops.admin`, `ai_providers.read`). `groupPermissions(permissions)` in `lib/modules/roles/types.ts` splits by the first dot. Codenames without a dot fall into "general". Grouping is client-side only.

**Rules:**
- New permissions defined in Flask: `@permission_required("module.action")`
- `RolePermissionBadge` NAMESPACE_STYLES map must be updated when a new module namespace is added
- Only `groupPermissions()` handles grouping — no duplication in form or detail view

**Consequences:** Checklist + tag cloud use identical grouping. New namespaces auto-colorize once added to `NAMESPACE_STYLES`.

**Affected modules**: 03-Roles (primary); all future modules that define permissions.

---

## ADR-021 — Dangerous Action Standard (2026-04-24)

**Context:** Platform-ui needs to trigger destructive or high-risk operations (deactivate user, disable org, delete data). Without a standard, each page would have its own confirmation dialog, danger styling, reason collection, and audit event naming — inconsistent and untestable.

**Decision:** All human-initiated dangerous actions in platform-ui use the `PlatformAction` + `DangerLevel` system (`lib/platform/actions/`) with `useDangerousAction()` hook and `ConfirmActionDialog` component (ADR-021 — Dangerous Action Standard).

**Rules:**
- `PlatformAction.dangerLevel` controls UX tier only. Backend enforces authorization independently.
- `danger_level >= "high"` requires reason textarea. `danger_level = "critical"` requires typed confirmation phrase.
- Every `PlatformAction` must have `auditEvent` (format: `module.verb`). Backend writes audit on execution.
- UX-only gates: `<PermissionGate>` wraps trigger buttons — backend still enforces RBAC.
- `USER_ACTIONS` and `ORG_ACTIONS` are the reference implementations.

**Consequences:** `ConfirmActionDialog` is the only confirmation dialog; `useDangerousAction` is the only dangerous mutation hook. No ad-hoc confirm UI in module pages.

**Affected modules**: 01-Users, 02-Organizations, 04-Helpdesk, and all write-capable modules.

---

## ADR-022 — AI Delegated Action Platform (2026-04-24)

**Context:** Voice and chat AI agents (ALA, Helpdesk AI, Investigation Console) can describe what should happen but cannot safely execute actions. Every write operation requires the user to navigate separately. This breaks conversational UX and limits AI automation potential.

**Decision:** Build an AI Delegated Action Platform (`apps/ai_action_platform/`) that lets AI agents execute platform actions on behalf of authenticated users, with delegated permission checks, confirmation tokens, voice-specific confirmation flow, and mandatory audit trail.

**Core invariants:**
1. AI agent never holds its own permissions — acts as proxy for the authenticated human.
2. `org_id` always from JWT — never from AI output.
3. Every execution (success or failure) writes `AIActionInvocation` before returning results.
4. `danger_level >= "high"` never executable via verbal confirm — requires dashboard approval.
5. AI output (parameters) is treated as untrusted input — validated against JSON Schema before execution.
6. Confirmation token is single-use with 120s TTL (60s for voice).

**Architecture:** Two-layer registry (static platform manifest + dynamic org `AIAction` rows), `ActionExecutor` (internal_function + http_api handlers), `AIActionConfirmationToken` for WRITE tier, helpdesk `ApprovalService` reused for DESTRUCTIVE tier. Frontend: `useAIAction` hook + `AIActionPreviewCard` component.

**Implementation phases:** R027 (registry + READ), R028 (confirmation flow + WRITE), R029 (voice), R030 (approval queue + DESTRUCTIVE), R031 (module manifests + org config).

**Spec:** `docs/system-upgrade/36-ai-action-platform.md`

**Affected modules**: `apps/ai_action_platform/` (new), `apps/ala/`, `apps/helpdesk/`, `apps/agents/`, `lib/platform/ai-actions/` (new).

---

## ADR-023 — Personalized AI Capability Context (2026-04-24)

**Context:** AI agents serve both regular users and system administrators, but without knowing what a specific user can do, the agent either over-offers (security risk) or under-offers (friction). A generic agent with no user context cannot personalize safely.

**Decision:** Each AI session receives a **server-generated AI User Capability Context** (`AIUserCapabilityContext`) derived from the authenticated user's JWT, RBAC state, enabled modules, feature flags, org policies, and profile. This context is used to:
1. Build a personalized AI system prompt section (`build_ai_capability_prompt()`)
2. Filter the AI Action Registry to actions the user may invoke
3. Summarize denied action categories safely (no action IDs exposed for unauthorized actions)

**Critical invariant:** The context is guidance only, not authorization. Backend re-checks all permissions at execution time (§27). A stale or forged context cannot authorize any action.

**Endpoint:** `GET /api/ai/context` — JWT Bearer, server-side only, returns `AIUserCapabilityContext` JSON.

**Invalidation:** `context_version` Redis counter incremented on any permission-relevant change (role, module, feature flag, deactivation, policy). Version checked at execution; stale context → HTTP 409.

**Role-specific policies:**
- `viewer` / `technician`: READ + WRITE_LOW; denied categories explained with admin referral
- `manager`: READ + WRITE_LOW + WRITE_HIGH; approval queue for high-risk
- `admin`: all org-scoped; cross-org blocked; billing if `can_see_billing_data`
- `system_admin`: all actions; critical always requires typed/voice+UI confirmation; no bulk destructive without explicit confirm
- `ai_agent` (service account): READ + pre-authorized WRITE_LOW only; no confirmation-required actions

**Voice-specific:** Action list capped at 8; only `voice_invocable: true` actions; `danger_level >= "high"` redirected to UI; PII never spoken proactively.

**What the context never returns:** Secrets, tokens, other users' data, internal function names, raw permission codenames list, full unauthorized action schemas.

**Capability levels:** The AI may execute READ, CREATE, UPDATE, DELETE_SOFT, CONFIGURE, APPROVE, EXECUTE, BULK, and SYSTEM operations wherever the authenticated human is authorized. The AI is not read-only. Constraint is user's permission set, not channel. See §33–§34.

**Service account rule:** `is_ai_agent=True` JWT alone cannot authorize business writes. Must carry signed delegated-human context. Service account alone = READ only.

**Delete policy:** Hard delete is disabled by default for all AI actions. Requires `system_admin`, `critical` danger, typed confirmation, approval, retention policy, pre-delete export, and platform registry opt-in. See §40.

**Implementation gate:** See §38 implementation readiness checklist — 22 viability checks, 7 positive tests, 15 negative/security tests required before R027 ships.

**Spec:** `docs/system-upgrade/36-ai-action-platform.md §23–§40`

**Affected modules**: `apps/ai_action_platform/` (new: `context.py`, `context_builder.py`, `prompt_builder.py`), `apps/ala/`, `apps/helpdesk/engine/`, `apps/agents/`.

---

## ADR-024 — AI Action Capability Levels + Write/Delete Policy (2026-04-24)

**Context:** The AI Action Platform design initially implied the AI might be limited to READ or advisory roles. This created ambiguity in implementation: what write/delete operations are permitted? What are the exact gates for destructive actions? What distinguishes soft from hard delete?

**Decision:** The AI may execute the full write surface (READ, CREATE, UPDATE, DELETE_SOFT, CONFIGURE, APPROVE, EXECUTE, BULK, SYSTEM) wherever the authenticated user is authorized. The following non-negotiable constraints apply:

**Capability level taxonomy (§34):** 10 levels with explicit role matrix, confirmation requirements, voice eligibility, rollback expectations, and audit requirements.

**`voiceEligible` formula:** `capabilityLevel` in (READ, CREATE, UPDATE, APPROVE, EXECUTE) AND `dangerLevel` ≤ "medium" AND `bulkAllowed = false` AND `hardDeleteAllowed = false`. DELETE_SOFT, DELETE_HARD, CONFIGURE, BULK, SYSTEM are never voice-eligible.

**Hard delete policy (§40):** Disabled by default. Requires: system_admin + critical danger + typed confirm + approval + retention policy + pre-delete export. No AI hard delete until retention/export policy exists.

**Delegated human rule (§36):** Service account (`is_ai_agent=True`) alone = READ only. All writes require delegated human context (signed token). The AI inherits the human's permissions, never holds its own write authorization.

**Execution viability (§37):** 22 mandatory checks before any action runs. Fails closed on uncertainty.

**Implementation gate (§38):** 22 + 22 test checklist must pass before R027 ships.

**Spec:** `docs/system-upgrade/36-ai-action-platform.md §33–§40`

**Affected modules**: Same as ADR-022 + ADR-023.

---

## ADR-025 — Global Floating AI Assistant and Page Context Registry (2026-04-24)

**Context:** The platform needs a persistent AI assistant surface visible from every page. Naive implementations trigger LLM calls on page load, route change, or component mount — causing unacceptable cost and latency. A globally visible component also risks leaking page context, PII, or action surfaces across auth boundaries.

**Decision:** The Global Floating AI Assistant uses strict lazy loading. The assistant icon is rendered on every page but makes **zero LLM or API calls** until the user explicitly interacts (click icon, open drawer, send message, confirm action, resume workflow). Page navigation updates local context metadata (`currentPageId`, `lastPageContextHash`) but never triggers an LLM call by itself.

**Persistent conversation:** `conversationId`, `activeObjective`, `pendingActionId`, and `pendingConfirmationTokenId` survive route changes. Only `currentPageId`, `previousPageId`, and `lastPageContextHash` update on navigation. The conversation state lives in a Zustand in-memory store (`AIAssistantSessionState`) — never persisted to localStorage (no auth-boundary leakage on shared devices).

**Context diffing:** `PageContextDiff` is computed on route change and stored locally. It is sent to the LLM only on the user's next message or on active workflow continuation. Diffs irrelevant to `activeObjective` are suppressed entirely.

**Page context registry:** Each page registers static metadata via `useRegisterPageContext()` → `PageAIContext` (pageId, pageName, staticDescription, availableActionIds, selectedResource). No API call. Used for "What is this page?" without LLM. Permission-filtered before exposure to the assistant.

**LLM cost-control hard rules:**
- Never call LLM on page load, route change, hover, or while icon is idle
- Never send full table data, secrets, or raw permission codenames to LLM
- `lastLLMContextHash` checked before re-sending context; skip if unchanged
- Capability context loaded only once per session (re-fetched only on `context_version` change)

**Security:** On org switch → full session reset. On auth expiry → session cleared. `PageAIContext` filtered to only actions the current user can access before sending to LLM.

**Spec:** `docs/system-upgrade/38-floating-ai-assistant.md`

**Affected modules**: `components/shell/floating-ai-assistant/`, `lib/stores/ai-assistant-session.ts`, `lib/hooks/use-register-page-context.ts`, `app/(dashboard)/layout.tsx` (mount point).

---

## ADR-026 — AI Architecture Consistency Pass: Canonical Terms, Schemas, and Security Rules (2026-04-24)

**Context:** Four architecture rounds (024–027) built the AI Action Platform design in sequence. Each round added new definitions that partially conflicted with earlier drafts in the same document: `risk_tier` vs `capability_level`, `voiceInvocable` vs `voice_eligible`, 14-field vs 25-field `AIActionDescriptor`, old permission check using `risk_tier`, no delegation token design, no tool injection safety rules.

**Decision:** Round 028 produces a single canonical reference document (`docs/system-upgrade/39-ai-architecture-consistency-pass.md`) that resolves all ambiguities. All implementation must follow doc 39, not earlier drafts. Conflicting sections in doc 36 are marked deprecated with forward pointers.

**Canonical terms established:**
- `capability_level` (10 values) replaces `risk_tier` (4 values) everywhere
- `voice_eligible` (Python) / `voiceEligible` (TypeScript) replaces `voiceInvocable` / `voice_invocable`
- `module_id`, `label`, `executor_type`, `executor_ref`, `executor_allowlist_policy` are canonical v1 field names
- `AIActionDescriptor v1` (30 fields, doc 39 §05) supersedes both old schemas in doc 36 §05 and §35

**Implementation blockers declared:**
- B1: Delegation token design (algorithm, signing key, nonce storage) must be resolved before write-tier ships
- B4: `check_execution_viability()` must replace `risk_tier` checks with `capability_level` checks
- B5/B6: `ModuleAIAction` and `AIActionSummary` must use canonical field names before any integration

**New policies added:**
- Prompt-is-guidance-only boxed warning (doc 39 §10)
- Tool definition / prompt injection safety rules (doc 39 §09)
- Rollback and partial failure policy (doc 39 §11)
- Delegation token design placeholder (doc 39 §08)

**Spec:** `docs/system-upgrade/39-ai-architecture-consistency-pass.md`

**Affected ADRs:** ADR-022 (AI Action Platform), ADR-023 (Capability Context), ADR-024 (Capability Levels) — all remain valid; this ADR adds the consistency layer, does not replace them.

**Affected modules:** Same as ADR-022 + ADR-023 + ADR-024.

---

## ADR-027 — AI Provider Gateway and Mandatory Billing Metering (2026-04-24)

**Context:** 55+ files across 20+ modules directly import LLM provider SDKs (openai, anthropic, google.generativeai) outside of `apps/ai_providers/`. These calls produce no billing records, cannot be quota-enforced, and generate no attribution. The platform already has a working provider abstraction layer (registry, adapters, `AIUsageLog`, cost_tracker) — the gap is that most modules bypass it entirely.

**Decision:** All LLM / STT / TTS / embedding / model API calls must go through the AI Provider Gateway (`apps/ai_providers/gateway.py`). Every call must emit a usage event linked to org / user / module / session before returning. No exceptions except calls explicitly marked `non_billable=True` in test environments.

**Architecture:** New `gateway.py` wraps existing registry + adapters + cost_tracker + billing_adapter into a single entry point. `GatewayRequest` carries attribution (org_id, user_id, module_id, feature_id, session_id, conversation_id, action_id). `AIUsageLog` extended with 12 new fields. `policy.py` enforces quota pre-check before every provider call.

**Enforcement:** CI lint rule blocks merges that add direct LLM provider imports outside `apps/ai_providers/`. `get_api_key()` remains the only allowed API key access function.

**Migration:** Priority order — helpdesk (P1), mobile_voice (P1), ai_agents (P1), ala (P1), ops_intelligence (P2), personal_info (P2), life_assistant (P3), remaining 37 files (P3).

**AIUsageLog extension:** 14 new fields (corrected R032): `feature_id`, `conversation_id`, `action_id`, `ai_action_invocation_id`, `status`, `started_at`, `completed_at`, `error_code`, `correlation_id`, `cached_tokens`, `is_estimated`, `billable_cost`, `quota_bucket`, `is_billable`. Migration: `20260424_extend_ai_usage_log` (R031 committed).

**Spec:** `docs/system-upgrade/40-ai-provider-gateway-billing.md`

**Affected modules:** `apps/ai_providers/` (gateway.py, policy.py, billing_adapter.py, schemas.py added), `apps/billing/` (reused), all 55+ bypass modules (migration required).

---

## ADR-028 — Shared Services and Capability-First Enforcement (2026-04-25)

**Context:** The platform rewrite spans 19 modules and two repositories. Early modules (Users, Roles, Organizations) established shared capabilities (DataTable, PlatformForm, PermissionGate, PageShell, DetailView) and backend patterns (@jwt_required, g.jwt_user, record_activity). Without explicit enforcement, new modules built by developers or AI agents will continue using old one-off patterns (custom tables, inline Zod schemas, window.confirm(), direct LLM imports) rather than the established shared infrastructure.

**Decision:** All new platform-ui and platformengineer rewrite work must use the approved shared capabilities and backend services when they exist. Legacy one-off patterns are prohibited except through documented, time-boxed exceptions in `docs/system-upgrade/43-shared-services-enforcement.md §Appendix A`.

**Scope:**
- Frontend: DataTable<T>, PlatformForm+usePlatformMutation, PermissionGate/usePermission, PageShell+DetailView, ConfirmActionDialog, lib/api/<module>.ts+queryKeys — mandatory for all new module code
- Backend: @jwt_required, g.jwt_user, @role_required/@permission_required, org_id from g.jwt_user.org_id, record_activity, AIProviderGateway.call() — mandatory for all new API routes
- Detection: P0 CI lint scripts (check_no_direct_llm_imports.py, check_no_org_id_from_body.py, check_json_api_auth.py) wired to CI by R033
- Exceptions: Must be documented with why/migration-round/owner/approval — no silent exceptions

**Enforcement layers:** Documentation → Code review checklist → Static detection scripts → CI gates → AI-agent guardrails in CLAUDE.md

**Spec:** `docs/system-upgrade/43-shared-services-enforcement.md`

**Affected modules:** All future module work in platform-ui and platformengineer.

---

## ADR-029 — AI Providers Hub: Side-by-Side JWT Routes (2026-04-25)

**Context:** The platform has a comprehensive AI provider management system in `apps/ai_providers/routes.py` (provider CRUD, fallback chains, module overrides, usage APIs) but it uses Flask-Login authentication throughout (`@login_required + current_user`). Platform-ui uses JWT-only auth (`@jwt_required + g.jwt_user`). No React/Next.js UI exists for AI provider management.

**Decision:** Build an AI Providers Hub in platform-ui. Add a new `apps/ai_providers/api_routes.py` Blueprint at `/api/ai-providers/` using `@jwt_required + g.jwt_user`. Do not modify `apps/ai_providers/routes.py` — the two blueprints coexist during migration. The new blueprint calls the same SQLAlchemy models and service layer as the existing routes.

**Alternatives considered:**
- Migrate existing routes to JWT in-place: risky — breaks the Jinja2 admin hub still in use by deployed code.
- Use Flask-Login routes from Next.js via session cookie: not supported — platform-ui is JWT-only.
- Replace all existing routes: too much churn; side-by-side coexistence is lower risk with a clear retirement path.

**New permissions required:** `ai_providers.view`, `ai_providers.manage`, `ai_providers.rotate_key`, `ai_providers.usage.view`, `ai_providers.billing.view`, `ai_providers.health.view`, `ai_providers.quota.manage`, `ai_providers.system.manage`.

**Hub sections:** Overview, Providers List, Provider Detail, Defaults, Module Overrides, Fallback Chains, Usage/Billing, Quotas, Health/Circuit Breakers, Migration Status (system-admin only).

**Security rules:** Never expose `api_key_ref`; all mutations audit-logged via `record_activity()`; delete must check referential integrity (409 if provider in use); circuit breaker reset requires `ai_providers.system.manage`.

**Phased implementation:** Phase 1 (R034): architecture + ADR. Phase 2 (R035): backend JWT routes. Phase 3 (R036): Hub UI core (sections 1–5 + usage). Phase 4 (R037): advanced sections (fallback editor, health monitor, quotas, migration status).

**Spec:** `docs/system-upgrade/44-ai-providers-hub.md`

**Affected modules:** `apps/ai_providers/` (new `api_routes.py`), `apps/__init__.py` (register blueprint), `app/(dashboard)/ai-providers/` (new route tree), `lib/api/`, `app/api/proxy/[...path]/`.

---

## ADR-030 — AI Service-to-Provider Routing Matrix (2026-04-25)

**Context:** The platform has 27+ AI-consuming services across 10+ modules. Provider/model routing is currently either (a) hardcoded in service code via `GatewayRequest(provider_id=..., model=...)`, or (b) resolved at module+capability granularity via `AIModuleOverride`. Two features in the same module+capability share one provider — they cannot be routed differently. No registry of named AI services/features exists. `feature_id` in `AIUsageLog` is a free-form string with no enforcement.

**Decision:** Introduce `AIServiceDefinition` (service registry) and `AIServiceProviderRoute` (feature-level routing) to enable configuration-driven provider/model resolution at the service/feature granularity. Remove `provider_id` and `model` from the public `GatewayRequest` API. Implement a 9-step resolution hierarchy: user override → org+service → org+module → org+capability → system+service → system+module → system+capability → fallback chain → fail-closed. Service code must call the gateway with only `module_id`, `feature_id`, and `capability`.

**Key rules:**
- No service may hardcode provider/model in application code.
- `GatewayRequest.provider_id` and `GatewayRequest.model` removed from public API.
- Exception: admin test endpoint + `X-Migration-Mode` header + `ai_routes.system.manage` permission during P0 migrations only.
- Step 9 is mandatory: if no provider configured → `NoProviderConfiguredError`, never silent fallback.
- `AIModuleOverride` is NOT deprecated — it remains as the module-level fallback step (step 3/6 in hierarchy).

**New models:** `AIServiceDefinition` (system-level registry, 27 known services seeded), `AIServiceProviderRoute` (feature-level routing with scope: system/org/module/feature/user).

**New `AIUsageLog` columns:** `service_id`, `route_id`, `resolution_source`, `fallback_used`, `routing_scope`.

**New permissions:** `ai_routes.view`, `ai_routes.manage`, `ai_routes.test`, `ai_routes.disable`, `ai_routes.usage.view`, `ai_routes.system.manage`.

**Spec:** `docs/system-upgrade/44-ai-providers-hub.md §16–§28`

**Affected modules:** `apps/ai_providers/` (models, registry, gateway, api_routes), all 27 AI-consuming service files, `lib/api/types.ts`, `app/(dashboard)/ai-providers/services/`.

---

---

## ADR-031 — Module Manager Multi-Tenant Model Split (2026-04-25)

- **Context:** Module Manager (`apps/module_manager/`) was designed single-tenant. `Module.is_installed` and `Module.is_enabled` are system-wide flags. No per-org enable/disable. `ModulePurchase.organization` is a loose string with no FK. Audit fields (`ModuleLog.user`, `ScriptExecution.executed_by`) are untyped strings. Routes use Flask-Login, violating ADR-028.
- **Decision:** Split `Module` (system catalog) from a new `OrgModule` table (per-org state). Add `OrgModuleSettings` (per-org config, replacing `ModuleSettings`). Rename `ModulePurchase` → `ModuleLicense` with hard `org_id FK → orgs.id`. Replace `Module.dependencies` JSON blob with `ModuleDependency` join table. All audit string fields become `Integer FK → users.id`. All new routes use `@jwt_required` (ADR-028).
- **Alternatives considered:**
  - Add `org_id` columns to existing `Module` rows — rejected: creates (module × org) duplication, pollutes system catalog.
  - JSON `enabled_orgs` array in `Module` — rejected: no referential integrity, unqueryable.
- **Consequences:**
  - All org-scoped module queries must join through `OrgModule`.
  - `ModuleSettings` deprecated in favor of `OrgModuleSettings`.
  - Data migration: seed `OrgModule` from current `Module.is_enabled`; parse `dependencies` JSON to `ModuleDependency` rows; resolve `ModuleLicense.org_id` from `organization` string.
  - Old `/modules/*` Jinja2 routes stay until platform-ui `/modules` page ships.
- **Affected modules:** `apps/module_manager/` (models, routes, api_routes), `scripts/migrations/`, `platform-ui/app/(dashboard)/modules/`.
- **Spec:** `docs/system-upgrade/45-module-manager-redesign.md`

---

---

## ADR-032 — Module Versioning, Upgrade Jobs, Package Management, and Marketplace (2026-04-25)

- **Context:** ADR-031 defined per-org module state but assumed all orgs run the same version. ResolveAI requires independent per-org version progression. Module upgrades are high-risk operations requiring dry-run validation, approval gates, and rollback. Package artifacts must be signed and stored in object storage (never in DB). A module marketplace is needed so orgs can discover, trial, and purchase modules.
- **Decision:** (1) `ModuleVersion` — system-level registry of released versions with `release_channel`, `status`, `rollback_supported`, `migration_required`, `manifest_snapshot`. (2) `OrgModule` gains `installed_version_id`, `target_version_id`, `rollback_version_id`, `auto_update_policy`, `release_channel_allowed`. (3) `ModuleUpgradeJob` — 9-step async workflow with dry-run, approval gate, migration execution, and rollback. (4) `ModulePackage` — metadata in DB, files in S3, checksum required, no hot-loading of `backend_plugin` packages. (5) `ModuleStoreListing` — marketplace data layer; pricing model, trial support, visibility control. (6) `ModuleLicense` extended with `license_type`, `seats_limit`, `billing_subscription_id`.
- **Key rules:**
  - No dynamic code execution of uploaded packages — `backend_plugin` requires CI/CD deploy
  - **Permitted:** `apps/__init__.py` auto-registers blueprints at startup using `importlib.import_module()` from the local filesystem — this is NOT hot-loading; it loads code that was deployed via CI/CD. This startup pattern is allowed.
  - **Banned:** `importlib.import_module()` or `exec()` on files that arrived via an upload API or object storage at runtime — this is hot-loading and is prohibited.
  - Checksum must be verified before any package is applied during upgrade
  - Yanked version → immediate alert to all affected orgs; blocks new upgrades to that version
  - Rollback blocked if `dry_run_result.has_irreversible=True`
  - Marketplace store visibility respects `listing_status` + `required_plan` per org
- **Phases:** R038H (versioning + upgrade + packages), R038I (marketplace + store + license flow). Gate for R038I: billing integration decision (OQ-03).
- **Affected modules:** `apps/module_manager/` (models, services, tasks, api_routes), S3/storage, `platform-ui/app/(dashboard)/modules/`, billing integration.
- **Spec:** `docs/system-upgrade/45-module-manager-redesign.md §22–§32`

---

## ADR-037 — Single-Trunk Workflow on Master with Compensating Controls (2026-05-01)

- **Status:** Accepted (responds to adversarial review C-01).
- **Context:** Project operates as single-trunk on `master` (CLAUDE.md §Workflow Rules) — no feature branches, no PRs, no worktrees. The plan is Level 4 (40+ stories, multi-tenant, billing-affecting code, DB migrations). Adversarial review C-01 flagged the workflow as inconsistent with the risk profile: a single bad commit goes straight to production CI; no asynchronous quality gate exists.
- **Decision:** **Accept** the single-trunk workflow. The user has explicitly chosen it for productivity reasons (`memory/feedback_main_only_workflow.md`). However, **introduce compensating controls** to address the risk asymmetry.
- **Compensating controls (mandatory):**
  1. **High-risk file allowlist** — any commit touching `apps/authentication/`, `apps/ai_providers/`, `lib/auth/`, files in `02-rules/shared-services.md` blacklist, OR any DB migration MUST include in the same commit a file `commits/<sha>-checklist.md` confirming: tests run, security review self-checklist passed, rollback plan exists. CI gate (planned, not yet built) blocks push if file missing.
  2. **Pre-commit hook** that runs `npm run typecheck` + `npm run lint` + `npm run test:e2e` (smoke subset). Hook is opt-out only via `--no-verify` which is reserved for emergency.
  3. **Daily smoke check** — automated cron (planned: GitHub Actions schedule) that runs the full E2E suite against production every morning and pages on regression.
  4. **Rollback drill once per quarter** — documented procedure in `09-history/rollback-drill-log.md` (to be created); each drill simulates a bad master commit, measures time-to-revert, validates SSM secret rotation, and exercises the K8s rollback. Schedule the first drill within 30 days of accepting this ADR.
  5. **Post-mortem on every revert** — any `git revert` to master triggers a 1-page post-mortem in `09-history/post-mortems/`.
- **Alternatives considered:**
  - Reintroduce PR gate for high-risk files only — rejected: user explicitly does not want PR friction; workflow rule already in CLAUDE.md.
  - Branch-per-feature with self-merge — rejected: indistinguishable from branch workflow user is avoiding.
  - Status quo with no compensating controls — rejected: review C-01 is correct that the bare workflow is unsafe at Level 4.
- **Consequences:** Velocity preserved. Risk surface reduced via the 5 controls. The first 3 controls (allowlist, pre-commit, daily smoke) are added in the next round (R-OPS-01, to be created). Drill + post-mortem procedures are documented but exercised only when triggered.
- **Reviews this ADR responds to:** `planning-artifacts/reviews/2026-05-01-adversarial-master-roadmap.md` C-01.

---

## ADR-038 — AI Delivery Phasing: Foundation Then Surface (2026-05-01)

- **Status:** Accepted (responds to adversarial review C-02).
- **Context:** Master roadmap §1 declares "AI is the primary interaction layer." Build order in §5 schedules zero AI surface during P1 (R040–R048); first AI feature lands in P2 R051. Review C-02 flagged the gap between thesis and delivery — 6+ months of foundation work before users see anything AI-native.
- **Decision:** **Reframe** the public narrative without changing the underlying technical sequence. The platform IS AI-native in its foundation (every API governed by AIProviderGateway, every action audit-able for AI consumption, every module declares AI capabilities) but the user-visible AI experience is delivered in phases:
  - **P1 deliverable:** "AI-Ready Platform" — backend governance complete, gateway routes all calls, billing accurate, audit complete. No new user-facing AI surface.
  - **P2 demonstration slice:** During P2, ship a **minimal floating "Ask the Dashboard"** capability (read-only, single page context, one AI provider, no actions) using existing R048-cleaned gateway. This validates the foundation with real users before the full AI Action Platform lands.
  - **P2 full:** AI Action Platform R051 — write actions with confirmation tokens.
  - **P3:** Floating Assistant full + voice + actions across all modules.
- **Action items from this ADR:**
  - Update `master-roadmap §1` Vision text to distinguish "AI-ready foundation" from "AI-native experience" with explicit phase mapping.
  - Add new round `R049.5-AI-demo-slice` to `master-roadmap §5` between R049 and R051 — tasks: minimal chat overlay, gateway integration, single page context.
  - Update `00-control-center.md` Track A so the next-up scoping is for the demo slice, not the full assistant.
- **Alternatives considered:**
  - Bring forward the full Floating Assistant — rejected: depends on R045 Settings, R046 Audit, R049 Data Sources for full functionality; pulling it forward duplicates work.
  - Accept the gap silently — rejected: review C-02 is right that the headline-vs-schedule mismatch will be questioned.
- **Consequences:** Adds ~2 weeks of P2 work for the demo slice. In exchange, P2 delivers visible AI value, validates the gateway end-to-end with real traffic, and de-risks the full R051 build. Public narrative stays honest.
- **Reviews this ADR responds to:** C-02.

---

## ADR-039 — Joint-Repo Phase for P1 Foundation Work (2026-05-01)

- **Status:** Accepted (responds to adversarial review C-03).
- **Context:** `00-control-center.md` and `master-roadmap §5` declare `platformengineer` read-only during the platform-ui rewrite. R042-BE through R049 are ALL backend work in `platformengineer` — exactly the work the read-only rule blocks. Each round currently requires "explicit user authorization in the prompt" to proceed. Review C-03 flagged this as a structural contradiction guaranteed to cause scheduling pain.
- **Decision:** **Lift the read-only restriction on `platformengineer` for the duration of P1 (R040–R048).** During this window, `platformengineer` is in active joint-repo development with platform-ui. After P1 closes (all 12 P0 gates green), reinstate read-only mode for the platformengineer repo and treat all subsequent backend changes as exception-only.
- **Operational rules during the joint-repo phase:**
  1. Each backend round still requires its `epic.md` in `10-tasks/` (in this repo, even when work is in platformengineer).
  2. Commits in platformengineer reference the round ID in the commit message footer (e.g. `Round: R042-BE`).
  3. Cross-repo coordination: when a platformengineer change requires a platform-ui follow-up (or vice versa), both commits land within 24h; the second commit message references the first SHA.
  4. CI/CD pipeline `cd-deploy-dual.yml` (platformengineer) coordinates dual-deploys — no need for stricter coordination.
  5. The "single-trunk on master" rule applies to BOTH repos during this window — no PR review on either side.
- **Alternatives considered:**
  - Reimplement ModuleRegistry in `platform-ui` (or a new `platform-api` service) — rejected: the data already lives in platformengineer's DB; duplicating it would create sync hell.
  - Keep read-only and continue per-round authorization friction — rejected: drives delivery slower than necessary; review C-03 is correct.
  - Migrate the entire platformengineer codebase into a monorepo with platform-ui — rejected: out of scope for P1, ADR-002 already chose separate repos.
- **Consequences:** Platformengineer becomes a normal active repo until P1 closes. No more per-round authorization friction. After P1, the read-only rule resumes for all rounds R051+. The transition is documented in `00-control-center.md`.
- **Reviews this ADR responds to:** C-03.

---

## ADR-040 — Helpdesk-Validated Foundation Slicing (2026-05-01)

- **Status:** Accepted (responds to adversarial review C-04).
- **Context:** Master-roadmap §11 anti-overengineering rule #1: "No capability without a confirmed consumer." The R042-BE through R049 foundation rounds claim Helpdesk as the consumer but Helpdesk Phase A is blocked behind all of them — the foundation is being built fully before the consumer validates it. Review C-04 flagged this as the plan violating its own rule.
- **Decision:** **Slice each foundation round to deliver the Helpdesk-validating subset first**, ship that subset, validate end-to-end with a Helpdesk page, then iterate. Do NOT build the full R042-BE / R044 / R045 / R046 pyramid before Helpdesk Phase A starts.
- **New round structure:**
  - **R042-BE-min** — `is_module_available("helpdesk")` + minimal `OrgModule` enable/disable for org_id=1 (the bootstrap org). T01-T03 only from current epic.
  - **R044-min** — Navigation API returns ONLY helpdesk + already-built routes (users, orgs, roles). No manifest-driven nav yet.
  - **R045-min** — Feature Flags ONLY (Settings deferred to R045-full). One flag: `helpdesk.enabled`.
  - **R046-min** — Notification dedupe + delivery for ONE notification type from Helpdesk. Audit log for Helpdesk write actions only.
  - **Helpdesk Phase A** runs IMMEDIATELY after the four "-min" rounds. Validates the minimal foundation against a real consumer.
  - **R042-BE-full / R044-full / R045-full / R046-full** are then completed AFTER Helpdesk Phase A — informed by what the validation revealed.
- **Action items from this ADR:**
  - Update `10-tasks/R042-BE-module-registry/epic.md` — mark T01-T03 as the "min" subset, T04-T07 as "full" deferred.
  - Add corresponding `-min` epic stubs for R044, R045, R046 in `10-tasks/`.
  - Renumber/relabel `master-roadmap §5` rounds.
- **Alternatives considered:**
  - Continue the full-foundation-first plan — rejected: violates the anti-overengineering rule and creates 6+ weeks of unvalidated foundation.
  - Build only Helpdesk-specific implementations and extract later — rejected: still creates the dual-pattern problem H-02 warns about.
- **Consequences:** Foundation rounds become smaller and faster individually. Helpdesk ships at end of P1 instead of beginning of P2. Total work likely UP by ~10% (re-extraction effort) but project risk DOWN substantially. Each foundation slice has a confirmed consumer at landing time.
- **Reviews this ADR responds to:** C-04.

---

## ADR-041 — P1 Exit Gate: Helpdesk in Production (2026-05-01)

- **Status:** Accepted (responds to adversarial review C-05).
- **Context:** Master-roadmap §3 lists 12 P0 gates with no exit criterion for P1 itself. Review C-05 flagged this: P1 can drift indefinitely with no concrete stopping point. Six rounds × 4-10h estimates each + normal slippage = unbounded duration with no observable user value.
- **Decision:** **Define an explicit P1 EXIT GATE.** P1 is complete when ALL of the following hold:
  1. `/helpdesk` and `/helpdesk/tickets` routes are live in production (TEST environment minimum, PROD preferred).
  2. The routes are gated by `FeatureGate flag="helpdesk.enabled"` and the flag is served by the platform Feature Flag Service (not a stub).
  3. The Helpdesk nav item is served by the Navigation API (not hardcoded `nav-items.ts`).
  4. At least one notification flow goes from a Helpdesk event → platform Notification Service → user's notification bell.
  5. At least one Helpdesk action is auditable via the platform AuditLog Service with org_id, actor_id, and resource fields populated.
  6. Cross-tenant isolation test passes: org A user cannot see org B Helpdesk data.
  7. CI gate `check_no_direct_llm_imports.py` is in warn-only mode AND the count of warnings is non-increasing for 7 consecutive days.
  8. AI demo slice (per ADR-038) is in development (epic.md exists, ≥2 tasks complete).
- **Until P1 EXIT GATE passes:** No new module work begins (per ADR-040 slicing). No new shared capabilities are built (per master-roadmap §11 rule #1). Round selection is constrained to "what's needed to close the gate."
- **Action items from this ADR:**
  - Add this gate as a checklist to `00-control-center.md §Foundation Gates`.
  - Add a row in `master-roadmap §5` titled "P1-Exit" with status `🔴 not started`.
  - Add `09-history/rounds-index.md` entry as P1 closes documenting the eight gate items + evidence.
- **Alternatives considered:**
  - No exit gate (status quo) — rejected: review C-05 is correct that this leads to drift.
  - Stricter gate (full Settings + full Audit) — rejected: bigger gate = longer drift; this gate is the minimum that proves the foundation works.
  - Gate based purely on internal metrics (gates 1–6 only, no production verification) — rejected: production verification IS the validation; without it, the gate is theatrical.
- **Consequences:** P1 has a definition of "done" that everyone can see. Round-selection has a clear filter. The eight items map cleanly to the per-round DoDs already required.
- **Reviews this ADR responds to:** C-05.

---

## ADR-042 — Project-Wide Test Coverage Gate (2026-05-01)

- **Status:** Accepted (responds to adversarial review C-06).
- **Context:** Master-roadmap §10 DoD requires per-round "X passed / Y total" test counts. There is no project-wide coverage threshold and no Vitest unit test setup yet. Review C-06 flagged that round-level counts can pass while project coverage trends downward.
- **Decision:** **Adopt project-wide coverage gates with floor enforcement.** Coverage cannot drop below baseline; baseline rises only by deliberate ADR.
- **Targets (per layer) — the floor as of acceptance of this ADR:**
  - `lib/api/` — 90% line coverage
  - `lib/hooks/` — 80%
  - `lib/auth/` — 95% (security-critical)
  - `lib/modules/<key>/` — 70%
  - `components/shared/` — 70%
  - `components/shell/` — 50%
  - `app/api/proxy/` — 90%
  - `apps/platform/` (platformengineer) — 85%
  - `apps/authentication/` (platformengineer) — 95%
- **Tooling:**
  - Frontend: Vitest + `c8` for line/branch coverage, configured in next round (R-OPS-01).
  - Backend: existing `pytest --cov` already produces coverage; CI publishes the report.
  - Baseline file `tests/.coverage-baseline.json` checked into the repo.
  - CI gate fails if any layer drops below baseline by >1pp.
- **Evidence enforcement (also responds to H-06):** Per-task DoD changes from "paste test counts" to "Tests-CI: <github-actions-run-url>" — the URL is a verifiable link to the green CI run that closed the task. CI gate ensures the URL exists in the closing commit's trailer.
- **Action items from this ADR:**
  - Add R-OPS-01 round to `10-tasks/`: "Vitest + coverage baseline + CI gate." Estimated 2h. Must complete before any P1-Exit gate items.
  - Update `master-roadmap §10` DoD wording.
  - Update `_template/tasks/T01-example.md` evidence section.
- **Alternatives considered:**
  - Round-level only (status quo) — rejected: review C-06 correctly identifies the drift risk.
  - Single project-wide threshold — rejected: layers have legitimately different testability; one number masks bad ratios.
  - Coverage exempt from CI gates — rejected: coverage that's not gated is documentation, not enforcement.
- **Consequences:** Coverage becomes a first-class quality signal. Drops are visible immediately, not at P5 hardening. Some velocity cost initially as agents must add tests for new code; this cost decreases as the testing pattern stabilizes.
- **Reviews this ADR responds to:** C-06 (and partially H-06).

---

## ADR-043 — `components/ui/` primitive bug exception (2026-05-01)

- **Status:** Accepted (responds to e2e error report Q29).
- **Context:** `CLAUDE.md §Hard Rules` mandates `components/ui/` is read-only ("shadcn/ui primitives, copy-paste only — do not modify"). The intent is to prevent silent drift between the project and shadcn upstream. However the shipped `components/ui/command.tsx` has a real defect: `<DialogHeader>` is rendered as a sibling of `<DialogContent>` instead of nested inside it. Two consequences observed in e2e error capture (`planning-artifacts/reviews/2026-05-01-e2e-error-report.md`):
  1. **Page-error on Ctrl+K:** `Cannot read properties of undefined (reading 'subscribe')` — `cmdk` crashes because its provider tree is split when `DialogContent` doesn't contain the children that read its context.
  2. **A11y violation logged on every render:** `DialogContent requires a DialogTitle for the component to be accessible for screen reader users.`
- **Decision:** Carve a **narrow exception** to the read-only rule for primitive bugs that cause runtime errors or hard a11y violations. Three conditions MUST hold for a patch to qualify:
  1. The defect causes a runtime error (`pageerror`, console error from a primitive's own code) OR a Radix/Radix-derived a11y warning that ships in the production console.
  2. The patch is the **minimum viable fix** — no styling changes, no API changes, no logic refactor unrelated to the defect.
  3. The patch is **annotated in-file** with a `// PATCH (<date>) — ADR-043 — keep on next shadcn re-init.` header that explains the bug, the upstream tracking link (or "TODO: file upstream"), and the restoration recipe.
- **Operational rules:**
  1. The patch annotation lives at the top of the file (after `"use client"`) so re-init reviewers see it immediately.
  2. If `npx shadcn add <component> --overwrite` is ever run, the pre-commit hook (R-OPS-01 ADR-037) must flag any commit that touches `components/ui/` and require a corresponding `commits/<sha>-checklist.md` confirming the PATCH header was preserved.
  3. Each ADR-043 patch references this ADR by number in its annotation comment so a future maintainer can find the policy.
  4. Each patch MUST have an upstream issue link (or a `// TODO upstream:` placeholder if filing is pending) so the long-term direction is to delete the patch when upstream fixes it.
- **First applied to:** `components/ui/command.tsx` `CommandDialog`. Move `DialogHeader` inside `DialogContent`. Verify Ctrl+K no longer throws and a11y warning gone.
- **Alternatives considered:**
  - **(b) Wrapper `CommandDialogV2` in `components/shared/`** — rejected: creates "shadow primitive" anti-pattern, two files for one job, perpetual confusion about which to use.
  - **(c) `npx shadcn add command --overwrite` to a newer version** — rejected for now: no evidence the bug is fixed upstream, and a version bump risks breaking React 19 / Tailwind 4 compatibility we already validated.
  - **(d) Live with the bug** — rejected: page-error pollutes Sentry on every Ctrl+K, blocks future a11y baseline.
- **Consequences:** `components/ui/` is no longer 100% read-only — it's 99.9% read-only with a documented exception path. The PATCH header convention must be respected by every future contributor. In practice this is the same discipline as a vendored library with local patches (e.g. how the FreeBSD ports tree handles upstream patches).
- **Reviews this ADR responds to:** `planning-artifacts/reviews/2026-05-01-e2e-error-report.md` Q29.

---

_Add new ADRs here as decisions are made during implementation._
