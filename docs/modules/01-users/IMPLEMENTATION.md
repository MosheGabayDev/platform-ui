# Module 01 — Users: Implementation Notes

_Last updated: 2026-04-24 (Round 010)_

---

## Purpose

Manage platform users — list, view details, approve pending registrations.
This is the first production-quality module and serves as the template for all future modules.

---

## Routes

| Route | File | Description |
|-------|------|-------------|
| `/users` | `app/(dashboard)/users/page.tsx` | Paginated list with search, stats, pending alert |
| `/users/[id]` | `app/(dashboard)/users/[id]/page.tsx` | User detail: profile, security, permissions |

Planned (not yet implemented — see backlog):
- `/users/pending` — approval queue page
- `/users/new` — create user form
- `/users/[id]/edit` — edit user form

---

## Backend Endpoints

| Method | Flask Path | Auth | Notes |
|--------|-----------|------|-------|
| GET | `/api/users` | JWT Bearer | Paginated list, org-scoped, filterable |
| GET | `/api/users/stats` | JWT Bearer | Counts for header badge |
| GET | `/api/users/pending` | JWT Bearer + admin | Pending approval queue |
| GET | `/api/users/<id>` | JWT Bearer | Detail; non-admin sees own only |
| POST | `/api/users/<id>/approve` | JWT Bearer + admin | Approve pending user |

Flask file: `apps/authentication/user_api_routes.py`

**Important:** The old `/admin/users` routes return HTML (Jinja2), NOT JSON.
The new `/api/users` routes are the correct JSON API for platform-ui.
The proxy PATH_MAP maps `users` → `/api/users` (not `/admin/users`).

---

## Permissions Required

| Action | Requirement |
|--------|------------|
| View user list | Any authenticated user |
| View user detail | Own profile (any user) OR admin/system_admin |
| Approve pending user | is_admin or is_system_admin |
| See pending banner | is_admin or is_system_admin |

RBAC helper: `hasRole(session, "admin", "system_admin")` from `lib/auth/rbac.ts`.

---

## Data Flow

```
UsersPage (RSC shell + client state)
  │
  ├─ useQuery(queryKeys.users.list(params))
  │    → fetchUsers(params) [lib/api/users.ts]
  │    → GET /api/proxy/users?... [Next.js proxy]
  │    → Authorization: Bearer <accessToken>
  │    → GET /api/users?... [Flask]
  │    → org-scoped query, returns UsersListResponse
  │
  ├─ useQuery(queryKeys.users.stats())
  │    → fetchUserStats() [lib/api/users.ts]
  │    → GET /api/proxy/users/stats [proxy]
  │    → GET /api/users/stats [Flask]
  │
  └─ <UsersTable> (display only — receives data via props)
       → no API calls inside component
```

---

## Files Involved

| File | Responsibility |
|------|---------------|
| `lib/modules/users/types.ts` | UserSummary, UserDetail, response envelopes, query params |
| `lib/api/users.ts` | fetchUsers, fetchUser, fetchUserStats, fetchPendingUsers, approveUser |
| `lib/api/query-keys.ts` | `queryKeys.users.*` — list, detail, stats, pending |
| `components/modules/users/users-table.tsx` | Paginated table (TanStack Table, RTL) |
| `components/modules/users/user-status-badge.tsx` | Status badge: active/inactive/pending |
| `components/modules/users/user-role-badge.tsx` | Role badge with color coding |
| `app/(dashboard)/users/page.tsx` | List page with stats + pending banner |
| `app/(dashboard)/users/[id]/page.tsx` | Detail page: profile + security + permissions |
| `app/api/proxy/[...path]/route.ts` | Proxy PATH_MAP: `users` → `/api/users` |
| `apps/authentication/user_api_routes.py` | Flask JSON API (platformengineer repo) |

---

## Current Limitations

| Limitation | Tracking | Workaround |
|-----------|---------|-----------|
| No create user form | Phase 2 backlog | Use existing Jinja2 admin panel at `/admin/users/create` |
| No edit user form | Phase 2 backlog | Use existing Jinja2 admin panel at `/admin/users/<id>/edit` |
| No pending approval page | Phase 2 backlog | List accessible via `/api/users/pending` API |
| No role filter dropdown | Phase 2 backlog | URL param `?role=admin` works but no UI |
| No user avatar | Phase 2 backlog | Initial letter placeholder shown instead |
| Pagination is server-side | By design | `per_page` default 25, max 100 |

---

## How Future Agents Should Modify This Module

### Adding a new list column
1. Add field to `UserSummary` in `lib/modules/users/types.ts`
2. Add the field to `_serialize_user_summary()` in `apps/authentication/user_api_routes.py`
3. Add a `ColumnDef` to `components/modules/users/users-table.tsx`

### Adding a new filter
1. Add param to `UsersListParams` in `lib/modules/users/types.ts`
2. Add URL param handling in `list_users()` in Flask `user_api_routes.py`
3. Pass new param to `fetchUsers()` in `lib/api/users.ts`
4. Add UI control to `UsersTable` props (pass down from page)

### Adding edit/create
1. Verify Flask endpoint exists (`apps/authentication/routes.py` or a new file)
2. Create Zod schema in `lib/modules/users/schemas.ts`
3. Create form component in `components/modules/users/user-form.tsx`
4. Add route: `app/(dashboard)/users/[id]/edit/page.tsx`
5. Use React Hook Form + useMutation (TanStack Query)

### Changing permission requirements
1. Update this file (IMPLEMENTATION.md)
2. Update the `_is_admin()` check in `apps/authentication/user_api_routes.py`
3. Update any `hasRole()` calls in page components

---

## Manual Verification Checklist

Until Playwright E2E tests exist:

- [ ] Unauthenticated browser visiting `/users` → redirects to `/login`
- [ ] Authenticated user visits `/users` → list renders with loading skeleton then data
- [ ] Search box filters users client-side within current page
- [ ] Clicking a row navigates to `/users/<id>`
- [ ] Non-admin viewing `/users/123` (different user) → sees 403 error message
- [ ] Admin sees pending banner when pending users exist
- [ ] API error on `/api/proxy/users` → error banner with retry button
- [ ] Empty search results → "לא נמצאו משתמשים" message
- [ ] Pagination buttons work (disabled at first/last page)
- [ ] Session `useSession()` exposes correct `org_id` for scoping

---

## Module Manifest (Draft)

See `docs/modules/01-users/module.manifest.json` for the data ownership manifest.
