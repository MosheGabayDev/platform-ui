# Module 03 — Roles & Permissions: Implementation Notes

_Last updated: 2026-04-24 (Round 018)_

---

## Purpose

Manage global roles and their permission sets.
Roles are shared across all organizations — not org-scoped.
Any admin can read. Only system_admin can write.

---

## Routes

| Route | File | Description |
|-------|------|-------------|
| `/roles` | `app/(dashboard)/roles/page.tsx` | List all roles with counts |
| `/roles/[id]` | `app/(dashboard)/roles/[id]/page.tsx` | Role detail with permission tag cloud |

---

## Backend Endpoints

| Method | Flask Path | Auth | Notes |
|--------|-----------|------|-------|
| GET | `/api/roles` | JWT Bearer + admin | List roles; `?search=` supported |
| GET | `/api/roles/<id>` | JWT Bearer + admin | Detail with full permissions array |
| POST | `/api/roles` | JWT Bearer + system_admin | Create role |
| PATCH | `/api/roles/<id>` | JWT Bearer + system_admin | Update name/description |
| PATCH | `/api/roles/<id>/permissions` | JWT Bearer + system_admin | Replace full permission set |
| GET | `/api/roles/permissions` | JWT Bearer + admin | List all available permissions |

Flask file: `apps/authentication/role_api_routes.py`

**IMPORTANT:** `GET /api/roles/permissions` must be registered BEFORE `GET /api/roles/<int:id>` in the blueprint.
Flask would otherwise try to cast "permissions" as an integer and return 404.

---

## Permissions Required

| Action | Requirement |
|--------|------------|
| View roles list | `is_admin` OR `is_system_admin` |
| View role detail | `is_admin` OR `is_system_admin` |
| Create role | `is_system_admin` only |
| Edit role | `is_system_admin` only |
| Replace permission set | `is_system_admin` only |

RBAC helper: `hasRole(session, "system_admin")` from `lib/auth/rbac.ts`.

---

## Data Flow

```
RolesPage (client)
  │
  ├─ useQuery(queryKeys.roles.list(params))
  │    → fetchRoles(params) [lib/api/roles.ts]
  │    → GET /api/proxy/roles?... [Next.js proxy]
  │    → Authorization: Bearer <accessToken>
  │    → GET /api/roles?... [Flask]
  │    → returns RolesListResponse
  │
  └─ <RolesTable> (display only — receives data via props)
       → no API calls inside component

RoleDetailPage (client)
  │
  └─ useQuery(queryKeys.roles.detail(id))
       → fetchRole(id) [lib/api/roles.ts]
       → GET /api/proxy/roles/<id> [proxy]
       → GET /api/roles/<id> [Flask]
       → returns RoleDetailResponse (includes permissions array)

RoleCreateSheet / RoleEditSheet
  ├─ useQuery(queryKeys.roles.permissions())
  │    → fetchAllPermissions() — permission checklist
  │
  └─ usePlatformMutation
       → createRole / updateRole + setRolePermissions
       → invalidates queryKeys.roles.all()
```

---

## Files Involved

| File | Responsibility |
|------|---------------|
| `lib/modules/roles/types.ts` | `RolePermission`, `RoleSummary`, `RoleDetail`, response envelopes, `groupPermissions()` |
| `lib/modules/roles/schemas.ts` | `createRoleSchema`, `editRoleSchema`, inferred types |
| `lib/api/roles.ts` | `fetchRoles`, `fetchRole`, `fetchAllPermissions`, `createRole`, `updateRole`, `setRolePermissions` |
| `lib/api/query-keys.ts` | `queryKeys.roles.*` — all, list, detail, permissions |
| `components/modules/roles/role-permission-badge.tsx` | Single permission badge, color-coded by dot-notation namespace |
| `components/modules/roles/roles-table.tsx` | DataTable: name, description, permission_count, user_count, edit action |
| `components/modules/roles/role-form.tsx` | `RoleCreateSheet`, `RoleEditSheet` with `PermissionChecklist` |
| `app/(dashboard)/roles/page.tsx` | List page: PageShell + StatCard + RolesTable + RoleCreateSheet |
| `app/(dashboard)/roles/[id]/page.tsx` | Detail page: DetailHeaderCard + permission tag cloud grouped by namespace |
| `app/api/proxy/[...path]/route.ts` | PATH_MAP: `roles` → `/api/roles` |
| `apps/authentication/role_api_routes.py` | Flask JSON API (platformengineer repo) |

---

## Permission Namespace Convention

Permission codenames use dot-notation: `module.action`
- e.g. `ops.admin`, `ai_providers.read`, `billing.view`
- `groupPermissions()` in `types.ts` splits by first dot → groups by namespace
- The RolePermissionBadge colors by namespace (violet=ai_providers, blue=ops, etc.)
- Codenames without a dot fall into the "general" group

---

## Edit Form — Two-mutation Strategy

`RoleEditSheet` runs two mutations sequentially:
1. `updateRole(id, { name, description })` — PATCH `/api/roles/<id>`
2. `setRolePermissions(id, permissionIds)` — PATCH `/api/roles/<id>/permissions` (only if permission set changed)

This follows the backend design where meta and permission set are separate endpoints.
Both invalidate `queryKeys.roles.detail(id)` and `queryKeys.roles.all()`.

---

## Manual Verification Checklist

- [ ] `/roles` accessible to admin, shows list with permission/user count badges
- [ ] `/roles` inaccessible to non-admin (returns 403)
- [ ] Search filters roles by name
- [ ] Clicking a row navigates to `/roles/<id>`
- [ ] Role detail shows permission tag cloud grouped by namespace
- [ ] "תפקיד חדש" button only visible to system_admin
- [ ] Create sheet: validation fires on empty name
- [ ] Create sheet: permission checklist grouped by namespace
- [ ] Edit sheet: pre-populated with current name/description/permissions
- [ ] Edit sheet: saving updates both meta and permission set
- [ ] Error state shown on 403/500 from Flask
