# API Contracts — platform-ui

**Generated:** 2026-05-01 (BMAD Deep Scan).

> Frontend talks to Flask exclusively through `app/api/proxy/[...path]/route.ts`. The proxy routes paths via PATH_MAP. This file lists the proxy mapping + the API client functions that consume it. Detailed Flask endpoint specs live in `platformengineer` (separate repo) and per-module specs in `docs/modules/<key>/`.

## Proxy route mapping

`app/api/proxy/[...path]/route.ts` resolves prefixes:

| Frontend path | Flask path | Notes |
|---|---|---|
| `/api/proxy/ai-settings/*` | `/api/ai-settings/*` | AI provider per-org config |
| `/api/proxy/monitoring/*` | `/admin/api/monitoring/*` | Health, metrics, latency |
| `/api/proxy/admin/*` | `/admin/api/*` | System admin operations |
| `/api/proxy/ai-providers/*` | `/api/ai-providers/*` | AI Providers Hub (R035+) |
| `/api/proxy/users/*` | `/api/users/*` | User CRUD + RBAC |
| `/api/proxy/organizations/*` | `/api/organizations/*` | Org CRUD |
| `/api/proxy/roles/*` | `/api/roles/*` | Role + permission management |
| `/api/proxy/notifications/*` | `/api/notifications/*` | Per-user notification feed |
| `/api/proxy/feature-flags/*` | `/api/feature-flags/*` | Org feature flag map |
| `/api/proxy/dashboard/*` | `/api/dashboard/*` | KPI stats + activity timeseries |

> Proxy forwards: session cookie + JWT bearer + `X-Forwarded-For` for audit. Errors from Flask propagated as-is with status code preserved.

## Frontend API client functions

All in `lib/api/`. Components consume hooks (TanStack Query) wrapping these.

### `lib/api/client.ts` (dashboard)

| Function | Returns |
|---|---|
| `fetchDashboardStats()` | `{ users, sessions, tickets, agents }` totals + deltas |
| `fetchTimeSeries()` | `Array<{ timestamp, value }>` for chart |
| `fetchServiceHealth()` | `Array<{ service, status, latency }>` |

### `lib/api/users.ts`

| Function | Returns |
|---|---|
| `fetchUsers(filters)` | Paginated list |
| `fetchUser(id)` | Single user with roles + activity preview |
| `createUser(payload)` | New user |
| `updateUser(id, payload)` | Updated user |
| `deactivateUser(id, reason)` | Dangerous action, requires confirm |
| `fetchRoles()` | Available roles for assignment |

### `lib/api/feature-flags.ts`

| Function | Returns |
|---|---|
| `fetchFeatureFlags()` | `Record<flag_key, { enabled: boolean, source: string }>` |

Backed by `useFeatureFlag(key)` hook (`lib/hooks/use-feature-flag.ts`) with fail-closed coercion.

### `lib/api/notifications.ts`

| Function | Returns |
|---|---|
| `fetchNotifications()` | Unacked feed for current user |
| `ackNotification(id)` | Mark as read |

### `lib/api/query-keys.ts` (centralized)

All keys defined here — never inline strings.

```ts
export const queryKeys = {
  dashboardStats: ["dashboard", "stats"] as const,
  timeSeries: (period: string) => ["dashboard", "timeseries", period] as const,
  serviceHealth: ["dashboard", "health"] as const,
  users: {
    list: (filters: UsersFilters) => ["users", "list", filters] as const,
    detail: (id: string) => ["users", "detail", id] as const,
    roles: ["users", "roles"] as const,
  },
  organizations: { /* … */ },
  roles: { /* … */ },
  featureFlags: ["feature-flags"] as const,
  notifications: ["notifications"] as const,
};
```

## Standard response envelope

All endpoints (where annotated) return:

```json
{
  "data": <payload>,
  "error": null,
  "meta": { "page": 1, "page_size": 50, "total": 234 }
}
```

Error case:

```json
{
  "data": null,
  "error": { "code": "FORBIDDEN", "message": "…", "details": {} },
  "meta": null
}
```

> Per master-roadmap §3 Phase 1 deliverable: standard envelope enforcement is in progress. Some legacy endpoints return raw shapes — wrappers in `lib/api/` normalize.

## Auth contract

- **Login:** POST `/api/proxy/auth/login` with credentials → Flask sets session cookie + returns JWT in body.
- **Session:** next-auth Credentials provider stores JWT in `next-auth.session-token` cookie + `lib/auth/options.ts` callbacks expose `user.role`, `user.org_id`, `user.permissions` to client.
- **JWT refresh:** automatic via `jwt` callback in `lib/auth/options.ts` when token close to expiry.
- **Logout:** next-auth `signOut()` + Flask logout endpoint.

## RBAC contract

Frontend treats permissions as advisory (UX hints). Backend re-checks on every protected route:

- `lib/auth/rbac.ts hasRole(session, "system_admin")`
- `lib/auth/rbac.ts hasPermission(session, "users.create")`
- `lib/auth/rbac.ts getOrgId(session)` — never read org_id from form state.

Backend enforcement: `@jwt_required` + `@role_required("...")` + `@permission_required("...")` decorators on Flask side.

## Tenant isolation contract

- Frontend never sends `org_id` in request body for write operations — backend reads it from JWT.
- All list/detail queries return only rows scoped to the JWT's `org_id` (system_admin role exempt for cross-org operations).
- Cross-tenant test gate: every new endpoint must have a test verifying org A's data invisible to org B (per `02-rules/testing-standard.md`).

## Open contracts (planned)

| Contract | Round | Spec |
|---|---|---|
| Navigation API | R044 | `10-tasks/R044-navigation-api/epic.md` |
| Feature Flags + Settings | R045 | `10-tasks/R045-feature-flags-settings/epic.md` |
| AuditLog + Notifications service | R046 | `10-tasks/R046-audit-notifications/epic.md` |
| API Keys + Secrets Manager | R047 | `10-tasks/R047-api-keys-secrets/epic.md` |
| AI Service Routing Matrix | R043 | `10-tasks/R043-ai-routing-matrix/epic.md` |
| Data Sources Hub | R049 | `10-tasks/R049-data-sources-hub/epic.md` |
