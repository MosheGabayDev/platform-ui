# Module 02 — Organizations

**Priority:** 🔴 Critical | **Est:** 2 days | **Depends on:** Users (01)
_Updated: Round 012 — endpoint audit + capability layer alignment_

---

## Critical Finding — Auth Mismatch (ADR-015 applies)

All existing `/admin/api/organizations/*` routes use `_require_admin()` which checks Flask-Login
session cookie. They are NOT JWT Bearer authenticated and cannot be called directly from platform-ui.

**Resolution (same pattern as Module 01 Users):** Create
`apps/admin/org_api_routes.py` with a new Blueprint at `/api/organizations` using `@jwt_required`.
Map `"organizations": "/api/organizations"` in the proxy PATH_MAP.

---

## Existing Flask Endpoints (Admin Session Cookie Auth — DO NOT USE from platform-ui)

| Method | Path | Auth | Returns |
|--------|------|------|---------|
| GET | `/admin/api/organizations` | `_require_admin()` session | `{"orgs": [...]}` |
| POST | `/admin/api/organizations` | `_require_admin()` session | `{"ok": true, "id": N}` |
| PUT | `/admin/api/organizations/<id>` | `_require_admin()` session | `{"ok": true}` |
| DELETE | `/admin/api/organizations/<id>` | `_require_admin()` session | `{"ok": true}` |
| GET | `/admin/api/organizations/<id>/users` | `_require_admin()` session | `{"members": [...], "others": [...]}` |
| PUT | `/admin/api/organizations/<id>/users/<uid>` | `_require_admin()` session | `{"ok": true}` |
| DELETE | `/admin/api/organizations/<id>/users/<uid>` | `_require_admin()` session | `{"ok": true}` |
| GET | `/admin/api/organizations/<id>/stats` | `_require_admin()` session | stats object |

Note: `GET /admin/api/organizations` response is `{"orgs": [...]}` — not the standard `{success, data}`
envelope. New endpoint must conform to ADR-007 standard envelope.

---

## New Endpoints to Create (platformengineer — Round 013 task)

File: `apps/admin/org_api_routes.py` (new, Blueprint: `org_api_bp`, prefix: `/api/organizations`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/organizations` | `@jwt_required` + `is_system_admin` | List all orgs (system admin only) |
| GET | `/api/organizations/<id>` | `@jwt_required` | Org detail (system admin or own org) |
| POST | `/api/organizations` | `@jwt_required` + `is_system_admin` | Create org |
| PUT | `/api/organizations/<id>` | `@jwt_required` + `is_system_admin` | Update org |
| GET | `/api/organizations/<id>/stats` | `@jwt_required` | Org stats |
| GET | `/api/organizations/<id>/users` | `@jwt_required` | Users in org (scoped) |

Response envelope (all endpoints):
```json
{ "success": true, "data": { "org": {...} } }
{ "success": true, "data": { "orgs": [...], "total": N } }
```

---

## Proxy Mapping (add to `app/api/proxy/[...path]/route.ts`)

```typescript
"organizations": "/api/organizations"
```

---

## TypeScript Types (`lib/modules/organizations/types.ts`)

```typescript
export interface Organization {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  user_count: number;
  created_at: string | null;
}

export interface OrganizationDetail extends Organization {
  contact_email: string | null;
  plan: string | null;
  stats?: OrgStats;
}

export interface OrgStats {
  total_users: number;
  active_users: number;
  total_sessions: number;
  last_activity: string | null;
}

export interface OrgsListResponse {
  success: boolean;
  data: { orgs: Organization[]; total: number };
}

export interface OrgDetailResponse {
  success: boolean;
  data: { org: OrganizationDetail };
}

export interface OrgsListParams {
  search?: string;
  is_active?: boolean;
}
```

---

## Query Keys (`lib/api/query-keys.ts`)

```typescript
organizations: {
  all:    () => ["organizations"] as const,
  list:   (params?: object) => ["organizations", "list", params] as const,
  detail: (id: number) => ["organizations", "detail", id] as const,
},
```

---

## Pages / Routes

| File | Route | Description |
|------|-------|-------------|
| `app/(dashboard)/organizations/page.tsx` | `/organizations` | Org list — system admin only |
| `app/(dashboard)/organizations/[id]/page.tsx` | `/organizations/:id` | Org detail + users |
| `app/(dashboard)/organizations/new/page.tsx` | `/organizations/new` | Create org form |

---

## Components

- `OrgsTable` — uses shared `DataTable<Organization>` (do NOT duplicate table logic)
- `OrgStatusBadge` — active/inactive
- `OrgPlanBadge` — plan name badge (if plan field added)
- `OrgUsersSubTable` — compact list of users belonging to the org

---

## Permissions

Organization management is **system-admin only**. Org admins can view their own org detail only.

```typescript
// Page-level guard (users page.tsx pattern):
const { isSystemAdmin } = usePermission();
if (!isSystemAdmin) return <AccessDeniedState />;

// Backend: @jwt_required + check g.jwt_user.is_system_admin
```

---

## Capability Layer Alignment (ADR-016)

This module must use:
- `DataTable<Organization>` from `components/shared/data-table` for the list view
- `PermissionGate` from `components/shared/permission-gate` for admin actions
- `formatDate` from `lib/utils/format` for created_at display
- `exportToCsv` from `lib/utils/csv` for the org list export
- Mutations in `lib/modules/organizations/mutations.ts`
- Schema in `lib/modules/organizations/schemas.ts`

---

## Module Manifest

```json
{
  "module": "organizations",
  "routes": ["/organizations", "/organizations/[id]", "/organizations/new"],
  "permissions": ["system_admin"],
  "ownedTables": ["organizations"],
  "referencedTables": ["users", "billing_rates"],
  "coreTables": [],
  "secretColumns": [],
  "piiColumns": ["contact_email"]
}
```

---

## Definition of Done

- [x] Backend: `apps/admin/org_api_routes.py` with JWT Bearer auth (Round 013)
- [x] Backend: register blueprint in `apps/__init__.py`
- [x] Proxy: `"organizations": "/api/organizations"` added
- [x] Types: `lib/modules/organizations/types.ts`
- [ ] Schema: `lib/modules/organizations/schemas.ts` — Phase B
- [ ] Mutations: `lib/modules/organizations/mutations.ts` — Phase B
- [x] List page: `/organizations` — system-admin gate, DataTable, search, empty state
- [x] Detail page: `/organizations/[id]` — own-org or system-admin
- [ ] Create form: react-hook-form + zod schema — Phase B
- [x] `PermissionGate systemAdminOnly` on list page
- [x] Skeleton + EmptyState on all data states
- [x] TypeScript typecheck passes (EXIT 0)
- [x] nav-items.ts badge not needed (orgs don't have a pending count)
- [ ] Playwright E2E tests — Phase C backlog

_Round 013 delivered: Flask API, proxy, types, API client, query keys, OrgsTable, OrgStatusBadge, list page, detail page. Phase B (create/edit form) deferred._
