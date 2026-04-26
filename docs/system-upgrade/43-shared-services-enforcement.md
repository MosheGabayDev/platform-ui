# 43 — Shared Services and Platform Capabilities Enforcement Plan

_Created: R032 — 2026-04-25_
_Owner: platform-ui + platformengineer_
_Status: Active — enforcement starts immediately_

> **Purpose:** Remove all ambiguity about which shared patterns must be used during the platform rewrite. Define what is forbidden, how violations are detected, and how exceptions are documented. Any code that bypasses the rules in this document requires an explicit, time-boxed exception.

---

## §01 — Executive Summary

The platform rewrite uses two categories of shared building blocks:

**Shared frontend capabilities** — components, hooks, and API client patterns in `platform-ui` that every module must use. Defined in `docs/system-upgrade/26-platform-capabilities-catalog.md`.

**Shared backend services** — authentication, RBAC, multi-tenancy, audit logging, and AI provider access patterns in `platformengineer` that every route must use.

**The problem:** Both repos have legacy patterns that are still present in old modules. If developers or AI agents build new modules without checking the shared catalog, the old patterns will proliferate. This document prevents that.

**The rule:** Check the catalog first. If a shared capability exists, use it. If it doesn't exist yet, build it before the module that needs it (Capability-First Rule). If neither applies, document an exception.

### Quick Reference: Canonical Replacement Table

| Need | Forbidden old way | Required new way |
|------|-------------------|-----------------|
| Feature/capability gate | Inline `if (flag)` / hardcoded boolean | `FeatureGate` + `useFeatureFlag()` — fail-closed; unknown flags are disabled |
| Table | Custom HTML `<table>` / per-page table shell | `DataTable<T>` from `components/shared/data-table/` |
| Form | Inline RHF/Zod in page component | `PlatformForm` + Zod in `lib/modules/<module>/schemas.ts` |
| Mutation | `useState(loading)` + `catch` + `toast.error` | `usePlatformMutation` from `lib/hooks/use-platform-mutation.ts` |
| Permission UI | `session.user.role ===` inline checks | `PermissionGate` / `usePermission()` |
| Page layout | Custom per-page header + breadcrumb | `PageShell` from `components/shared/page-shell/` |
| Detail rows | Local `InfoRow` / `BoolBadge` helpers | `components/shared/detail-view/` barrel |
| API call | `fetch()` direct / Flask URL in component | `lib/api/<module>.ts` + `apiFetch` + proxy |
| Destructive action | `window.confirm()` / `alert()` | `ConfirmActionDialog` |
| Action button loading | Inline `isLoading` + `disabled` per page | `ActionButton` (after R034); until then: `Button + isPending` from `usePlatformMutation` |
| Error display | `null` return / blank screen | `ErrorState` from `components/shared/error-state.tsx` |
| Tenant scope (BE) | `org_id` from request body | `g.jwt_user.org_id` |
| Auth (BE) | Flask-Login `@login_required` | `@jwt_required` + `g.jwt_user` |
| RBAC (BE) | Manual `is_admin` checks | `@permission_required` / `@role_required` |
| Audit (BE) | `print()` / log only | `record_activity()` |
| LLM call | Direct provider SDK import | `AIProviderGateway.call(GatewayRequest(...))` |

### Quick Reference: Canonical Paths

| Capability | Canonical path | Legacy / forbidden path | Status |
|-----------|---------------|------------------------|--------|
| `DataTable<T>` | `components/shared/data-table/data-table.tsx` | Custom `<table>` shell in page | ✅ Implemented |
| `PlatformForm` | `components/shared/form/platform-form.tsx` | Inline RHF form in page | ✅ Implemented |
| `usePlatformMutation` | `lib/hooks/use-platform-mutation.ts` | `useState(loading)` + `toast` | ✅ Implemented |
| `PermissionGate` | `components/shared/permission-gate.tsx` | `session.user.role ===` inline | ✅ Implemented |
| `usePermission()` | `lib/hooks/use-permission.ts` | Direct session field checks | ✅ Implemented |
| `PageShell` | `components/shared/page-shell/page-shell.tsx` | Per-page header component | ✅ Implemented |
| `InfoRow` | `components/shared/detail-view/info-row.tsx` | Per-page `InfoRow` helper | ✅ Implemented |
| `BoolBadge` | `components/shared/detail-view/bool-badge.tsx` | Per-page `BoolBadge` helper | ✅ Implemented |
| `DetailHeaderCard` | `components/shared/detail-view/detail-header-card.tsx` | Per-page header card | ✅ Implemented |
| `DetailSection` | `components/shared/detail-view/detail-section.tsx` | Per-page section wrapper | ✅ Implemented |
| `DetailBackButton` | `components/shared/detail-view/detail-back-button.tsx` | Inline back button | ✅ Implemented |
| `ConfirmActionDialog` | `components/shared/confirm-action-dialog.tsx` | `window.confirm()` | ✅ Implemented |
| `ActionButton` | `components/shared/action-button.tsx` | Inline loading button | ✅ Implemented (R041B) |
| `PlatformTimeline` | `components/shared/timeline/timeline.tsx` | Custom timeline per page | ✅ Implemented (R041E) |
| `FeatureGate` | `components/shared/feature-gate.tsx` | Hardcoded `if (enabled)` in page | ✅ Implemented (R041D-UI) — fail-closed |
| `useFeatureFlag()` | `lib/hooks/use-feature-flag.ts` | Direct flag boolean in component | ✅ Implemented (R041D-UI) — returns false while loading/errored |
| `ErrorState` | `components/shared/error-state.tsx` | `null` return / blank on error | ✅ Implemented |
| `PlatformErrorBoundary` | `components/shared/error-boundary.tsx` | Unhandled render crash | ✅ Implemented |
| `apiFetch` | `lib/api/client.ts` | `fetch()` in components | ✅ Implemented |
| `queryKeys` | `lib/api/query-keys.ts` | Inline `["users"]` arrays | ✅ Implemented |
| `PlatformTimeline` | `components/shared/timeline/` | Custom per-page timeline | ✅ Implemented (R041E) |
| `NotificationBell` | `components/shell/notification-bell.tsx` | Inline Bell button with toast | ✅ Implemented (R042) |
| `NotificationDrawer` | `components/shell/notification-drawer.tsx` | Per-page notification list | ✅ Implemented (R042) |
| `useNotifications()` | `lib/hooks/use-notifications.ts` | Inline `useQuery` + fetch in component | ✅ Implemented (R042) |
| `AIProviderGateway` (BE) | `apps/ai_providers/gateway.py` | `import openai` / direct SDK | ✅ Implemented |
| `record_activity` (BE) | `apps/authentication/jwt_auth.py` | `print()` / no audit | ✅ Implemented |
| `@jwt_required` (BE) | `apps/authentication/jwt_auth.py` | `@login_required` on JSON routes | ✅ Implemented |
| `@role_required` / `@permission_required` (BE) | `apps/authentication/rbac.py` | Manual `is_admin` checks | ✅ Implemented |

---

## §02 — Capability-First Rule

> **MANDATORY** — enforced by code review and AI-agent guardrails.

Before writing any new component, hook, or route:

1. **Check `docs/system-upgrade/26-platform-capabilities-catalog.md`** — does a shared capability cover this need?
2. **Check `docs/system-upgrade/25-open-source-capability-layer.md`** — is there a standard library choice for this pattern?
3. If a capability exists → **use it**. Never re-implement.
4. If a capability is "Partial" → **extend the shared one**, don't fork it locally.
5. If no capability exists and the pattern will be needed by 2+ modules → **build the shared capability first**, then use it in the module in the same round.
6. If you cannot use the shared capability → **file an exception** (§10).
7. If you see a pattern duplicated across 2+ modules → **file a backlog item to promote it** (see doc 26 §How to Promote).

**No silent local workarounds.** A local implementation that bypasses a shared capability is a violation, not a workaround.

---

## §03 — Shared Frontend Capability Contract

### FE-01 — Data/List Pages

| Field | Rule |
|-------|------|
| **Must use** | `DataTable<T>` from `components/shared/data-table/data-table.tsx` |
| **Must use** | Module-local `ColumnDef<T>[]` in `components/modules/<module>/<module>-table.tsx` |
| **Must use** | `TableSkeleton` during `isLoading` |
| **Must use** | `ErrorState` on query error |
| **Must use** | Empty state component when `data.length === 0 && !isLoading` |
| **Must use** | `TablePagination` (RTL-aware) from the shared data-table barrel |
| **Forbidden** | Custom table shell per page |
| **Forbidden** | Inline pagination logic (`useState(page)` + manual slice) |
| **Forbidden** | Spinner overlay instead of skeleton rows |
| **Forbidden** | Raw HTML `<table>` inside page components |
| **Exception** | Single-item display cards are not tables — `DetailView` (§FE-04) applies instead |
| **Canonical files** | `components/shared/data-table/` |
| **Implemented by** | Users (01), Organizations (02), Roles (03) — use these as reference |

### FE-02 — Forms and Mutations

| Field | Rule |
|-------|------|
| **Must use** | `PlatformForm` wrapper (`components/shared/form/platform-form.tsx`) |
| **Must use** | `usePlatformMutation` hook (`lib/hooks/use-platform-mutation.ts`) |
| **Must use** | Zod schema in `lib/modules/<module>/schemas.ts` — **never inline in page/component** |
| **Must use** | API function in `lib/api/<module>.ts` — typed wrapper over `apiFetch` |
| **Must use** | `FormField` → `FormItem` → `FormControl` → `FormMessage` chain for every input |
| **Must use** | Submit button shows `isPending` loading state |
| **Forbidden** | Direct `fetch()` or `axios` in React components |
| **Forbidden** | Inline Zod schema inside a page or form component file |
| **Forbidden** | `useState(isLoading)` + manual `catch(e)` + `toast.error` pattern |
| **Forbidden** | `org_id` as a form field — it must come from session inside the mutation function |
| **Forbidden** | Duplicate toast/error handling per page instead of using `usePlatformMutation` |
| **Canonical files** | `components/shared/form/`, `lib/hooks/use-platform-mutation.ts` |
| **Implemented by** | Users create/edit (R017), Roles create/edit (R018), Organizations (R019) |

### FE-03 — Permissions / Access Control

| Field | Rule |
|-------|------|
| **Must use** | `PermissionGate` (`components/shared/permission-gate.tsx`) for all privileged UI |
| **Must use** | `usePermission()` hook (`lib/hooks/use-permission.ts`) for conditional rendering logic |
| **Must use** | `lib/auth/rbac.ts` pure functions (`hasRole`, `hasPermission`, `isSystemAdmin`) |
| **Forbidden** | Inline `session.user.role === "admin"` comparisons in page/component files |
| **Forbidden** | Inline `session.user.is_admin` checks outside of `usePermission()` |
| **Forbidden** | Treating frontend permission gates as authorization (they are UX only) |
| **Forbidden** | Rendering a disabled button for unauthorized actions — render nothing (or locked icon) |
| **Security note** | Every destructive backend action must have independent server-side enforcement regardless of frontend gate |
| **Canonical files** | `components/shared/permission-gate.tsx`, `lib/hooks/use-permission.ts`, `lib/auth/rbac.ts` |

### FE-04 — Page / Detail Layout

| Field | Rule |
|-------|------|
| **Must use** | `PageShell` (`components/shared/page-shell/`) for all module list pages |
| **Must use** | `DetailBackButton`, `DetailHeaderCard`, `DetailSection`, `InfoRow` from `components/shared/detail-view/` |
| **Must use** | `ErrorState` (`components/shared/error-state.tsx`) for API error display |
| **Must use** | `PlatformErrorBoundary` (`components/shared/error-boundary.tsx`) at dashboard layout level |
| **Must use** | Motion constants from `lib/ui/motion.ts` — never inline `ease`/`duration` per page |
| **Forbidden** | Custom page header duplicated per module |
| **Forbidden** | Local `InfoRow`/`BoolBadge` helpers after shared extraction exists |
| **Forbidden** | `null` return during loading (causes layout shift) |
| **Forbidden** | Full-page spinner on list pages instead of `TableSkeleton` |
| **Canonical files** | `components/shared/page-shell/`, `components/shared/detail-view/`, `lib/ui/motion.ts` |

### FE-05 — Dangerous Actions

| Field | Rule |
|-------|------|
| **Must use** | `ConfirmActionDialog` (`components/shared/confirm-action-dialog.tsx`) for all destructive actions |
| **Must use** | `usePlatformMutation` for the action execution (audit headers attached automatically) |
| **Must use** | `ActionButton` (once built: R034) for all action buttons with loading state |
| **Must use** | Resource name in dialog body — e.g., "Delete organization Acme Corp?" not "Delete this item?" |
| **Forbidden** | `window.confirm()` — always |
| **Forbidden** | `alert()` — always |
| **Forbidden** | `toast` as the only confirmation for destructive actions |
| **Forbidden** | Destructive action without backend audit log entry |
| **Canonical files** | `components/shared/confirm-action-dialog.tsx`, `lib/hooks/use-platform-mutation.ts` |

### ActionButton Transition Rule

`ActionButton` (`components/shared/action-button.tsx`) is **not yet built** — target R034.

**Before ActionButton is built:**
- Use `Button` (shadcn) + `isPending` from `usePlatformMutation` + `ConfirmActionDialog` for destructive paths. This is the approved interim pattern.
- Do NOT create a local `LoadingButton`, `ActionBtn`, or any inline loading-button wrapper.

**After ActionButton is marked ✅ in `docs/system-upgrade/26-platform-capabilities-catalog.md`:**
- All new action buttons must use `ActionButton` — no exceptions for new code.
- Existing callers (`Button + isPending`) migrate opportunistically or in a scheduled cleanup round.
- The `Button + isPending` inline pattern becomes forbidden for new code immediately after R034 ships `ActionButton`.

**Never:** Create a new per-module loading-button component. Use the interim approved pattern above until `ActionButton` is available.

### FE-06 — API / Data Fetching

| Field | Rule |
|-------|------|
| **Must use** | `lib/api/<module>.ts` — typed wrapper functions over `apiFetch` |
| **Must use** | `queryKeys` from `lib/api/query-keys.ts` — no inline string query keys |
| **Must use** | `apiFetch` from `lib/api/client.ts` as the base fetch function |
| **Must use** | `/api/proxy/<prefix>/...` as the URL pattern — never direct Flask URLs |
| **Must use** | `useQuery` / `useMutation` from TanStack Query — never raw `fetch` in components |
| **Forbidden** | `fetch("http://localhost:5000/...")` or any direct Flask URL in components |
| **Forbidden** | `fetch(process.env.FLASK_API_URL + ...)` in component or page files |
| **Forbidden** | `org_id` in client request body for authorization purposes |
| **Forbidden** | Inline query key strings (`queryKey: ["users"]` instead of `queryKeys.users.list()`) |
| **Forbidden** | API call logic inline in a page component — always in `lib/api/<module>.ts` |
| **Canonical files** | `lib/api/client.ts`, `lib/api/query-keys.ts`, `app/api/proxy/[...path]/route.ts` |

### FE-07 — AI / LLM (Frontend)

| Field | Rule |
|-------|------|
| **Must use** | Backend `AIProviderGateway.call()` for all LLM/STT/TTS/embedding operations |
| **Must use** | API endpoint (`lib/api/<module>.ts`) to call the Flask backend which calls the gateway |
| **Forbidden** | Any LLM provider SDK import in frontend (`openai`, `anthropic`, `@google/generative-ai`, etc.) |
| **Forbidden** | Raw API keys in frontend code, env vars, or local storage |
| **Forbidden** | Direct fetch to `api.openai.com`, `generativelanguage.googleapis.com`, or any LLM provider URL |
| **Forbidden** | LLM call from frontend that bypasses `AIUsageLog` + billing event |
| **Security note** | All AI provider credentials live in `platform-secrets` K8s secret — never in frontend env |

---

## §04 — Shared Backend Service Contract

### BE-01 — Authentication

| Field | Rule |
|-------|------|
| **Must use** | `@jwt_required` decorator from `apps.authentication.jwt_auth` on all new platform-ui JSON endpoints |
| **Must use** | User context from `g.jwt_user` (set by `@jwt_required`) — never from request body or query param |
| **Must use** | JWT `Authorization: Bearer <token>` header (sent automatically by Next.js proxy) |
| **Forbidden** | Flask-Login `@login_required` on JSON endpoints consumed by platform-ui (session auth only) |
| **Forbidden** | Reading `user_id` or `org_id` from request body for authentication |
| **Forbidden** | `?token=<jwt>` query param authentication |
| **Forbidden** | Unauthenticated JSON endpoints without explicit `# PUBLIC: <reason>` comment |
| **Canonical files** | `apps/authentication/jwt_auth.py` — `jwt_required`, `create_access_token`, `record_activity` |
| **Reference** | `apps/authentication/role_api_routes.py` — correct pattern for `@jwt_required` JSON blueprint |

### BE-02 — RBAC

| Field | Rule |
|-------|------|
| **Must use** | `@role_required(...)` or `@permission_required(...)` from `apps.authentication.rbac` on every mutation endpoint |
| **Must use** | `g.jwt_user.is_system_admin` for system-admin checks (not `g.jwt_user.is_admin` alone) |
| **Must use** | Backend enforcement as the primary gate — frontend `PermissionGate` is UX only |
| **Forbidden** | Trusting `PermissionGate` results as authorization |
| **Forbidden** | Trusting `X-User-Role` advisory headers from the proxy |
| **Forbidden** | Role/permission derived from request body field |
| **Forbidden** | Using `is_admin=True` as a substitute for `is_system_admin=True` for system-level operations |
| **Canonical files** | `apps/authentication/rbac.py` — `role_required`, `permission_required` |

### BE-03 — Multi-Tenancy

| Field | Rule |
|-------|------|
| **Must use** | `g.jwt_user.org_id` as the tenant scope for all DB queries — never from request body |
| **Must use** | Explicit `WHERE org_id = g.jwt_user.org_id` (or SQLAlchemy equivalent) on every query |
| **Must use** | Separate code path for system-admin cross-org views with explicit comment `# SYSTEM_ADMIN_CROSS_ORG` |
| **Forbidden** | `org_id = request.json.get("org_id")` used for data scoping |
| **Forbidden** | `org_id` from URL parameter for authorization (`/api/orgs/<org_id>/...` as scope = violation unless system-admin verified) |
| **Forbidden** | Client-side org filtering as the only tenant isolation |
| **Forbidden** | Cross-org data access without `is_system_admin` check |
| **Canonical files** | `apps/authentication/jwt_auth.py` (`g.jwt_user`), `apps/admin/org_api_routes.py` (reference) |

### BE-04 — Audit Logging

| Field | Rule |
|-------|------|
| **Must use** | `record_activity(g.jwt_user, action="<module>.<action>", ...)` or `UserActivity` model for create/update/delete/disable/revoke/role/permission/security-sensitive mutations |
| **Must use** | Safe metadata only — entity type, entity ID, old value summary, new value summary |
| **Forbidden** | Write mutation route without audit record (unless documented exception with `# AUDIT_EXCEPTION: <reason>`) |
| **Forbidden** | Logging secrets, tokens, raw passwords, or full PII dumps in audit records |
| **Forbidden** | `print()`-based audit trail — always use the structured `record_activity` / `SecurityAudit.log_action` helpers |
| **Canonical files** | `apps/authentication/jwt_auth.py` (`record_activity`), `apps/security/audit_logger.py` (category helpers) |

### BE-05 — JSON API Route Pattern

| Field | Rule |
|-------|------|
| **Must use** | Flask `Blueprint` with `url_prefix` for all new platform-ui-facing API modules |
| **Must use** | `@jwt_required` on all endpoints (see BE-01) |
| **Must use** | Consistent response envelope: `{"success": true, "data": {...}}` or `{"success": false, "error": "..."}` |
| **Must use** | HTTP 400 for validation errors, 401 for auth failure, 403 for permission denied, 404 for not found, 409 for conflict |
| **Must use** | Explicit field serialization in response — never `model.__dict__` or raw SQLAlchemy dump |
| **Forbidden** | `render_template(...)` in routes under `/api/*` |
| **Forbidden** | Reusing Jinja2 HTML routes for platform-ui JSON consumption |
| **Forbidden** | Returning SQLAlchemy model objects directly (`jsonify(user)`) without serialization |
| **Forbidden** | Raw `str(exc)` in error responses (leaks internal info) — use explicit messages |
| **Canonical files** | `apps/authentication/role_api_routes.py`, `apps/admin/org_api_routes.py` (reference implementations) |

### BE-06 — AI Providers / Billing

| Field | Rule |
|-------|------|
| **Must use** | `AIProviderGateway.call(GatewayRequest(...))` for ALL LLM/STT/TTS/embedding calls |
| **Must use** | `org_id`, `user_id`, `module_id`, `feature_id` on every `GatewayRequest` |
| **Must use** | `AIUsageLog` row written automatically via `write_usage_log_extended` task |
| **Must use** | Billing event emitted via `AIProviderBillingAdapter.emit()` (handled by gateway) |
| **Forbidden** | `import openai`, `import anthropic`, `import google.generativeai` outside `apps/ai_providers/adapters/` |
| **Forbidden** | `os.getenv("OPENAI_API_KEY")`, `os.getenv("GEMINI_API_KEY")` outside `apps/ai_providers/key_resolver.py` |
| **Forbidden** | Module-level genai/openai object construction (`genai.configure()`, `openai.OpenAI()` at module level) |
| **Forbidden** | LLM call that produces no `AIUsageLog` row |
| **Forbidden** | Creating new AI wrappers (`*_client.py`, `*_service.py`) that call providers directly |
| **Canonical files** | `apps/ai_providers/gateway.py`, `apps/ai_providers/schemas.py`, `apps/ai_providers/key_resolver.py` |
| **Usage example** | See `CLAUDE.md §AI Provider & Billing` |

---

## §05 — Legacy Pattern Blacklist

Patterns in this list trigger mandatory review. CI will flag them as warnings (Phase 1) then failures (Phase 2).

### Frontend Blacklist

| Pattern | Category | Severity |
|---------|----------|----------|
| `fetch("http://` | Direct Flask call | FAIL |
| `fetch(process.env.FLASK` | Direct Flask call | FAIL |
| `fetch(process.env.NEXT_PUBLIC_API` in component files | Direct call | WARN |
| `window.confirm(` | Forbidden dialog | FAIL |
| `alert(` | Forbidden dialog | FAIL |
| `useState.*[Ll]oading` + `catch` + `toast.error` inline in component | Manual mutation pattern | WARN |
| `import.*from "openai"` | LLM SDK in frontend | FAIL |
| `import.*from "@anthropic` | LLM SDK in frontend | FAIL |
| `import.*from "@google/generative` | LLM SDK in frontend | FAIL |
| `session\.user\.role\s*===` | Inline role check | WARN |
| `session\.user\.is_admin` outside `usePermission()` | Inline admin check | WARN |
| Duplicate `InfoRow` helper defined locally | After shared extraction | WARN |
| Duplicate `BoolBadge` helper defined locally | After shared extraction | WARN |
| `queryKey: \["` inline (not using `queryKeys.`) | Inline query key | WARN |
| `new URLSearchParams` in list page without `nuqs` (after nuqs adopted) | Filter state | WARN |
| `useMutation` imported directly in a page component | Should use `usePlatformMutation` | WARN |

### Backend Blacklist

| Pattern | Category | Severity |
|---------|----------|----------|
| `import openai` outside `apps/ai_providers/adapters/` | Direct LLM | FAIL |
| `import google.generativeai` outside `apps/ai_providers/adapters/` | Direct LLM | FAIL |
| `import anthropic` outside `apps/ai_providers/adapters/` | Direct LLM | FAIL |
| `os.getenv("OPENAI_API_KEY"` | Raw key access | FAIL |
| `os.getenv("GEMINI` | Raw key access | FAIL |
| `os.getenv("ANTHROPIC` | Raw key access | FAIL |
| `render_template` in routes under `/api/` path | HTML in API route | FAIL |
| `request.json.get("org_id")` used for data scoping | Tenant bypass | FAIL |
| `request.args.get("org_id")` used for data scoping | Tenant bypass | FAIL |
| Missing `@jwt_required` on write endpoint in `/api/*` | Auth bypass | FAIL |
| `str(exc)` in `jsonify({"error": str(exc)})` | Info leak | WARN |
| `db.session.execute(text("SELECT ..."))` without `WHERE org_id` | Missing tenant scope | WARN |
| New `*_client.py` or `*_service.py` with direct LLM provider import | New bypass wrapper | FAIL |

---

## §06 — Enforcement Layers

### Layer 1 — Documentation Enforcement

**Primary:** This document (doc 43) + `CLAUDE.md` (§AI Provider & Billing, §Security Rules) in both repos.

**Before any module build:**
- Read doc 26 (capability catalog) — confirm shared capability status
- Read doc 25 (library layer) — confirm library choice
- Read doc 43 §08 (module development checklist)

**`CLAUDE.md` updates (see §13):** New sections added to both repos pointing to this document.

### Layer 2 — Code Review Checklist

See §11 (PR/reviewer checklist). Reviewers must reject PRs that:
- Duplicate a shared capability without a documented exception
- Add a new direct LLM import outside `adapters/`
- Add a write endpoint without `@jwt_required`
- Add a form with inline Zod schema
- Use `org_id` from request body for data scoping

### Layer 3 — Static Detection Scripts

See §07.

### Layer 4 — CI Gates

See §08.

### Layer 5 — AI-Agent Guardrails

See §12 (AI-agent checklist). Added to `CLAUDE.md` in both repos.

---

## §07 — Static Detection Plan

### Detection Script Registry

| Script | Priority | Status | Owner | Target Round | Phase | Enforcement | Allowlist |
|--------|----------|--------|-------|-------------|-------|-------------|-----------|
| `check_no_direct_llm_imports.py` | P0 | **EXISTS** | platformengineer | R034 (wire CI) | 1→2 (R035) | Warn → hard-fail | Required; entries need R0NN targets |
| `check_no_org_id_from_body.py` | P0 | **PENDING** | platformengineer | R034 (write + run) | 1→2 (R035) | Warn → hard-fail | Required for existing violations |
| `check_json_api_auth.py` | P0 | **PENDING** | platformengineer | R034 (write + run) | 1→2 (R035) | Warn → hard-fail | Required for existing violations |
| `check_no_window_confirm` (grep) | P1 | **PENDING** | platform-ui | R035 | 1 | Hard-fail immediately | None — new code only |
| `check_no_direct_fetch_in_components.py` | P1 | **PENDING** | platform-ui | R035 | 1→2 | Warn → hard-fail | Required |
| `check_no_inline_query_keys.ts` | P1 | **PENDING** | platform-ui | R035 | 1 | Warn | Required |
| `check_no_inline_zod_schema.ts` | P2 | **PENDING** | platform-ui | R036 | 1 | Warn | Required |
| `check_mutation_pattern.ts` | P2 | **PENDING** | platform-ui | R036 | 2 | Warn | Required |

_Phase 1 = warn-only (non-blocking CI). Phase 2 = hard-fail on new violations (allowlisted legacy files still pass). Phase 1→2 = starts warn, promoted to hard-fail after allowlist stabilizes._

---

### Scripts — Priority P0 (implement before R033)

#### `scripts/check_no_direct_llm_imports.py` — **ALREADY EXISTS** (R031)

Scans `apps/` for `import openai`, `import anthropic`, `import google.generativeai`. Allows `apps/ai_providers/adapters/` only. Exit 1 on violation.

**Status:** Written. Not yet wired to CI.

**CI action (R033):** Add to `.github/workflows/` as warn-only step.

#### `scripts/check_no_org_id_from_body.py` — **P0**

Scans `apps/` Python route files for `request.json.get("org_id")` or `request.args.get("org_id")` used as a data-scoping authority (not as an advisory read). Pattern: the value is used in a DB query or permission check.

```python
# Detection pattern (regex in Python files under apps/*/routes.py):
# r'request\.(json|args|form)\.get\(["\']org_id'
# Context filter: next DB query or model filter within 5 lines
```

Exit 1 on any unallowlisted match.

#### `scripts/check_json_api_auth.py` — **P0**

Scans Flask blueprint files under `apps/` for route functions that:
- Are under a `/api/` prefix blueprint
- Are `POST`, `PATCH`, `PUT`, or `DELETE` methods
- Do NOT have `@jwt_required` decorator

```python
# Detection: AST-parse files, find Blueprint url_prefix starting with /api,
# find route functions with methods=['POST','PATCH','PUT','DELETE'],
# check that @jwt_required appears in decorators.
```

Reports violations as warnings (Phase 1) then failures (Phase 2 — R035+).

### Scripts — Priority P1 (implement R034–R035)

#### `scripts/check_no_window_confirm.ts` — **P1**

Grep-based: scan `app/` and `components/` for `window.confirm(` and `alert(`. Exit 1 on match. Trivial to add as a one-liner in CI.

```bash
# Equivalent CI step (no script needed — direct grep):
grep -rn "window\.confirm\|window\.alert\|^alert(" app/ components/ --include="*.tsx" --include="*.ts" && exit 1 || exit 0
```

#### `scripts/check_no_direct_fetch_in_components.py` — **P1**

Scans `app/(dashboard)/` and `components/modules/` for `fetch("http` and `fetch(process.env.FLASK` patterns. Frontend proxy violations.

#### `scripts/check_no_inline_query_keys.ts` — **P1**

Scans for `useQuery({` or `useMutation({` where `queryKey: ["` (inline string array) appears instead of `queryKeys.`. Warns on match.

### Scripts — Priority P2 (implement R036+)

#### `scripts/check_no_inline_zod_schema.ts` — **P2**

Scans `app/` and `components/` for `z.object({` defined inside a `.tsx` file (not in `lib/modules/*/schemas.ts`). Warns on match.

#### `scripts/check_mutation_pattern.ts` — **P2**

Detects `useState.*loading` + `catch` + `toast.error` pattern in the same component — indicates manual mutation pattern instead of `usePlatformMutation`.

---

## §08 — CI Rollout Plan

### Phase 1 — Warn Only (R033, current sprint)

Wire `check_no_direct_llm_imports.py` to CI as a non-blocking warning step.

```yaml
# .github/workflows/lint.yml (new job)
- name: Check no direct LLM imports
  run: python scripts/check_no_direct_llm_imports.py
  continue-on-error: true   # warn-only in Phase 1
```

Add to both backend CI (platformengineer) and document the violation list.

**Allowlist format** for existing violations (until migrated):
```python
# At top of scripts/check_no_direct_llm_imports.py
ALLOWLIST = [
    "apps/life_assistant/services/gemini_client.py",   # P1 migration — R033
    "apps/personal_info/ai_chat/providers/",            # P1 migration — R033
    # ... add with round milestone
]
```

### Phase 2 — Hard Fail on New Violations (R035)

Move all P0 scripts to `continue-on-error: false`. Existing allowlisted files still pass; new files cannot bypass.

**Gate logic:** Script checks that no NEW files appear in the violation list since the allowlist was set. Allowlisted files are tracked; new violations outside the list fail.

### Phase 3 — Full Hard Fail (R037+)

All allowlisted legacy files migrated. Remove allowlist entries as migrations complete. CI fails on any violation, no exceptions.

### Allowlist Exception Format

Every allowlist entry must include:

```python
# ALLOWLIST ENTRY FORMAT:
# "apps/module/file.py",  # Reason: <why>. Migration round: R0NN. Owner: <module>.
```

Example:
```python
"apps/life_assistant/services/gemini_client.py",  # Reason: P1 migration pending. Migration round: R033. Owner: life_assistant.
```

No entry may remain in the allowlist past its stated migration round without an explicit extension with new round.

---

## §09 — Exception Policy

An exception is required when a shared capability cannot be used and a local implementation must be created.

**Exceptions are NOT allowed:**
- Because the shared implementation is "not quite right" — extend the shared one instead
- Because it's faster to do it locally — speed is not an exception criterion
- Because the developer didn't check the catalog first — that's a process failure, not an exception

**Exceptions ARE allowed when:**
- The shared capability does not yet exist (build it first, or document a time-boxed local workaround)
- The shared capability has a confirmed architectural incompatibility for this specific case
- A third-party integration imposes a requirement that conflicts with the shared pattern

### Exception Record Format

Add to `docs/system-upgrade/43-shared-services-enforcement.md §Appendix A — Active Exceptions`:

```markdown
### EXC-NNN — <title>

| Field | Value |
|-------|-------|
| **File** | `apps/<module>/file.py` or `components/<path>/file.tsx` |
| **Shared capability bypassed** | `DataTable<T>` / `usePlatformMutation` / `AIProviderGateway` / etc. |
| **Why shared capability doesn't fit** | <specific technical reason> |
| **Why local implementation is temporary** | <migration path> |
| **Backlog item** | `docs/system-upgrade/15-action-backlog.md §<section>` or Linear ticket |
| **Owner** | <module name> |
| **Expiry round** | R0NN |
| **Approval** | <approver — system admin or lead> |
| **Added** | YYYY-MM-DD |
```

Exceptions without a complete record are violations. No silent exceptions.

---

## §10 — Module Development Checklist

> Read this before writing the first line of code for any new module.

### Pre-coding gate

- [ ] Read `docs/system-upgrade/26-platform-capabilities-catalog.md` for capabilities needed
- [ ] Read `docs/system-upgrade/25-open-source-capability-layer.md` for library choices
- [ ] Confirm `DataTable<T>` is the table shell (no custom table)
- [ ] Confirm Zod schema location: `lib/modules/<module>/schemas.ts`
- [ ] Confirm API functions location: `lib/api/<module>.ts`
- [ ] Confirm `queryKeys` namespace added to `lib/api/query-keys.ts`
- [ ] Confirm Flask Blueprint with `url_prefix="/api/<module>"`
- [ ] Confirm `@jwt_required` on all write endpoints
- [ ] Confirm `g.jwt_user.org_id` used for all DB scoping (not from request body)
- [ ] Confirm `record_activity` / audit log on all mutations
- [ ] Confirm no direct LLM import — use `AIProviderGateway.call()` if AI is needed

### During coding

- [ ] `PageShell` wraps list page
- [ ] `DetailView` components used on detail page — no local `InfoRow`/`BoolBadge`
- [ ] `PermissionGate` wraps all privileged actions (delete, create, approve)
- [ ] `ConfirmActionDialog` for all destructive actions — no `window.confirm()`
- [ ] `ErrorState` shown on query error — no crash, no blank screen
- [ ] `TableSkeleton` shown during loading — no spinner overlay
- [ ] `usePlatformMutation` used for all mutations — no manual `useState(loading)` pattern
- [ ] Backend: `@role_required` or `@permission_required` on mutations
- [ ] Backend: response envelope `{"success": true, "data": {...}}`
- [ ] Backend: no `str(exc)` in error response
- [ ] Backend: no `render_template` in `/api/*` routes

### After coding

- [ ] `module.manifest.json` created with module metadata
- [ ] Module added to `app/api/proxy/[...path]/route.ts` PATH_MAP
- [ ] `docs/modules/<N>-<name>/IMPLEMENTATION.md` created with DoD items
- [ ] Module `INDEX.md` updated in platformengineer if backend files added
- [ ] `docs/system-upgrade/15-action-backlog.md` updated: completed tasks marked `[x]`
- [ ] `docs/system-upgrade/96-rounds-index.md` and `98-change-log.md` updated

---

## §11 — PR / Reviewer Checklist

> Reviewers must check all items before approving a PR that adds or modifies module code.

### Frontend review

- [ ] No custom table shell — uses `DataTable<T>`
- [ ] No inline Zod schema — schema in `lib/modules/<module>/schemas.ts`
- [ ] No direct `fetch()` in components — all API calls via `lib/api/<module>.ts`
- [ ] No `window.confirm()` or `alert()` — uses `ConfirmActionDialog`
- [ ] No inline query key strings — uses `queryKeys.<module>.*`
- [ ] No `session.user.role ===` inline — uses `usePermission()` hook
- [ ] No duplicate `InfoRow`/`BoolBadge` helpers if shared exists
- [ ] No LLM provider SDK import in frontend
- [ ] `org_id` is NEVER in form state or request body for authorization
- [ ] Loading state uses skeleton, not spinner overlay
- [ ] Error state uses `ErrorState` component, does not crash

### Backend review

- [ ] All write endpoints have `@jwt_required`
- [ ] All write endpoints have `@role_required` or `@permission_required` OR explicit comment `# OPEN_WRITE: <reason>`
- [ ] No `import openai`/`anthropic`/`google.generativeai` outside `ai_providers/adapters/`
- [ ] No `os.getenv("OPENAI_API_KEY")` or similar outside `key_resolver.py`
- [ ] No `render_template` in `/api/*` routes
- [ ] No `request.json.get("org_id")` used for DB scoping
- [ ] No `str(exc)` in error responses — explicit messages only
- [ ] Mutations have `record_activity` / audit log call OR `# AUDIT_EXCEPTION: <reason>`
- [ ] All DB queries include `WHERE org_id = g.jwt_user.org_id`
- [ ] Response envelope is `{"success": bool, "data": {...}}` consistent pattern

### Capability-first review

- [ ] No new capability built locally that exists in doc 26
- [ ] No new library added that's covered by doc 25 with a different choice
- [ ] If a new shared component was created: added to doc 26 catalog
- [ ] If a legacy pattern was extended: backlog item filed for promotion

---

## §12 — AI-Agent Checklist

> Every AI coding agent working in platform-ui or platformengineer must follow these rules before writing code.

```
BEFORE ADDING ANY COMPONENT OR ROUTE:

1. Read docs/system-upgrade/26-platform-capabilities-catalog.md
   → Is there a shared capability for this? Use it. Don't re-implement.

2. Read docs/system-upgrade/25-open-source-capability-layer.md
   → Is there a standard library choice? Use it. Don't add alternatives.

3. Read docs/system-upgrade/43-shared-services-enforcement.md §03 and §04
   → Does the code follow all frontend and backend contract rules?

WHEN WRITING FRONTEND CODE:
- Tables: DataTable<T> only — never custom table shell
- Forms: PlatformForm + usePlatformMutation + Zod in schemas.ts — never inline
- Permissions: PermissionGate + usePermission() — never session.user.role ===
- Layout: PageShell + DetailView — never custom page header
- Destructive actions: ConfirmActionDialog — never window.confirm()
- API: lib/api/<module>.ts + queryKeys — never direct fetch() in components
- LLM: backend gateway only — no provider SDK imports

WHEN WRITING BACKEND CODE:
- Auth: @jwt_required on all write endpoints
- Context: g.jwt_user (from JWT) — never from request body
- Tenant: WHERE org_id = g.jwt_user.org_id — never from client
- RBAC: @role_required / @permission_required on mutations
- Audit: record_activity() on all create/update/delete/security operations
- Responses: {"success": bool, "data": {}} envelope — never raw model dump
- LLM: AIProviderGateway.call(GatewayRequest(...)) — never direct SDK

IF BLOCKED BY A MISSING SHARED CAPABILITY:
1. DO NOT invent a local workaround silently
2. Add a task to docs/system-upgrade/15-action-backlog.md
3. Build the shared capability first, then the module
4. If truly urgent: document an exception in doc 43 §Appendix A

NEVER:
- import openai / anthropic / google.generativeai outside adapters/
- use window.confirm() or alert()
- put org_id in request body for authorization
- duplicate a shared capability that already exists
- skip @jwt_required on a write endpoint
- use render_template in a /api/* route
```

---

## §13 — P0 Enforcement Tasks

Tasks that must be completed before R033 module work proceeds.

| # | Task | Owner | Round | Status |
|---|------|-------|-------|--------|
| P0-01 | Wire `check_no_direct_llm_imports.py` to `.github/workflows/` (warn-only) | platformengineer | R034 | `[ ]` |
| P0-02 | Add AI-agent checklist from §12 to `CLAUDE.md` (platformengineer) | platformengineer | R032 | `[x] R032` |
| P0-03 | Add AI-agent checklist from §12 to `CLAUDE.md` (platform-ui) | platform-ui | R032 | `[x] R032` |
| P0-04 | Add Capability-First Rule section to `docs/ARCHITECTURE.md` | platform-ui | R032 | `[x] R032` |
| P0-05 | Write `scripts/check_no_org_id_from_body.py` and run baseline scan | platformengineer | R034 | `[ ]` |
| P0-06 | Write `scripts/check_json_api_auth.py` and run baseline scan | platformengineer | R034 | `[ ]` |
| P0-07 | Migrate remaining P0 LLM files to gateway (ai_coach, voice_support, personal_info/ai_chat/providers/, jira_integration) | platformengineer | R034 | `[ ]` |
| P0-08 | Add allowlist entries for all remaining violations in `check_no_direct_llm_imports.py` with migration round targets | platformengineer | R034 | `[ ]` |

---

## §14 — P1/P2 Enforcement Tasks

| # | Task | Owner | Round | Status |
|---|------|-------|-------|--------|
| P1-01 | Add `scripts/check_no_window_confirm.ts` (or grep step) to platform-ui CI | platform-ui | R034 | `[ ]` |
| P1-02 | Add `scripts/check_no_direct_fetch_in_components.py` to platform-ui CI | platform-ui | R034 | `[ ]` |
| P1-03 | Add `scripts/check_no_inline_query_keys.ts` to platform-ui CI | platform-ui | R034 | `[ ]` |
| P1-04 | Move `check_no_direct_llm_imports.py` from warn-only to hard-fail (after allowlist stable) | platformengineer | R035 | `[ ]` |
| P1-05 | Move `check_json_api_auth.py` from warn-only to hard-fail | platformengineer | R035 | `[ ]` |
| P1-06 | Add `scripts/check_no_inline_zod_schema.ts` to platform-ui CI | platform-ui | R036 | `[ ]` |
| P2-01 | Build `ActionButton` component and add to capability contract (FE-05) | platform-ui | R034 | `[ ]` |
| P2-02 | Install `nuqs` and add to FE-06 enforcement (after first list page with filters) | platform-ui | R034 | `[ ]` |
| P2-03 | Add module IMPLEMENTATION.md template with pre/during/post checklists from §10 | platform-ui | R034 | `[ ]` |
| P2-04 | Migrate all remaining P1 LLM bypasses to gateway (gemini_client, life_assistant, ala) | platformengineer | R034 | `[ ]` |

---

## §15 — Acceptance Criteria

This round (R032) is complete only when all of the following are true:

- [x] Every shared frontend capability has a "must use when" rule (§03)
- [x] Every shared backend service has a "must use when" rule (§04)
- [x] Forbidden legacy patterns are listed with severity (§05)
- [x] Exceptions require a documented record with expiry (§09)
- [x] AI agents have clear guardrails text (§12) — ready to add to CLAUDE.md
- [x] CI/static detection plan exists with P0/P1/P2 priority (§07, §08)
- [x] Module development checklist exists (§10)
- [x] PR/reviewer checklist exists (§11)
- [x] `CLAUDE.md` updated in both repos (§13 — P0-02, P0-03) — done R032
- [x] `docs/ARCHITECTURE.md` updated with Capability-First Rule (§13 — P0-04) — done R032
- [x] P0 tasks added to `15-action-backlog.md` — done R032
- [x] Canonical paths table added (§01) — done R033 follow-up
- [x] Detection script registry with owner/round/phase added (§07) — done R033 follow-up
- [x] ActionButton transition rule documented (§FE-05) — done R033 follow-up
- [x] Quick replacement table added (§01) — done R033 follow-up

---

## Appendix A — Active Exceptions

_No exceptions registered yet. All known legacy violations are tracked as P0/P1 migration tasks._

---

## Revision History

| Date | Round | Change |
|------|-------|--------|
| 2026-04-25 | R034 | AI Providers Hub (ADR-029) added to new capability catalog entry (doc 26 §30); Hub tasks added to backlog (doc 15); ADR-029 added to decision log (doc 14); doc 40 §20 + doc 41 §21 cross-references added; doc 44 created |
| 2026-04-25 | R033 follow-up | Canonical paths table added (§01); quick replacement table added (§01); ActionButton transition rule added (§FE-05); detection script registry table added (§07); P0-02/03/04 marked done; `DetailInfoRow` corrected to `InfoRow`; acceptance criteria updated |
| 2026-04-25 | R032 | Document created — full enforcement plan |
