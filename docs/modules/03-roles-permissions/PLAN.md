# Module 03 — Roles & Permissions

**Priority:** 🔴 Critical | **Implemented:** R018 | **Depends on:** Users (01), Organizations (02)

## Authority Model

- Roles are **global** (no `org_id`) — shared across all organizations.
- **Read:** any admin (`is_admin` OR `is_system_admin`).
- **Write:** `system_admin` only.

## Flask Endpoints (implemented)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/roles` | jwt+admin | List all roles with counts |
| GET | `/api/roles/<id>` | jwt+admin | Role detail with full permissions |
| POST | `/api/roles` | jwt+system_admin | Create role |
| PATCH | `/api/roles/<id>` | jwt+system_admin | Update name/description |
| PATCH | `/api/roles/<id>/permissions` | jwt+system_admin | Replace permission set |
| GET | `/api/roles/permissions` | jwt+admin | List all available permissions |

## Proxy Mapping

`"roles": "/api/roles"` in `app/api/proxy/[...path]/route.ts`

## TypeScript Types

- `lib/modules/roles/types.ts` — `RolePermission`, `RoleSummary`, `RoleDetail`, response envelopes, `groupPermissions()`
- `lib/modules/roles/schemas.ts` — `createRoleSchema`, `editRoleSchema`, inferred types

## Query Keys

```ts
roles.all()           → ["roles"]
roles.list(params)    → ["roles", "list", params]
roles.detail(id)      → ["roles", "detail", id]
roles.permissions()   → ["roles", "permissions"]
```

## Pages / Routes

| File | Route | Description |
|------|-------|-------------|
| `app/(dashboard)/roles/page.tsx` | `/roles` | Roles list + stats |
| `app/(dashboard)/roles/[id]/page.tsx` | `/roles/:id` | Role detail + permission tag cloud |

## Components

| File | Description |
|------|-------------|
| `components/modules/roles/role-permission-badge.tsx` | Single permission codename badge (color by namespace) |
| `components/modules/roles/roles-table.tsx` | DataTable: name, description, counts, edit action |
| `components/modules/roles/role-form.tsx` | `RoleCreateSheet`, `RoleEditSheet` with permission checklist |

## Definition of Done

- [x] Roles list with permission/user counts
- [x] Role detail with grouped permission tag cloud
- [x] Create role (system_admin only)
- [x] Edit name/description + replace permission set (system_admin only)
- [x] Permission checklist grouped by dot-notation namespace
- [x] Skeleton + EmptyState + ErrorState
- [x] usePlatformMutation + cache invalidation
- [x] Module manifest + IMPLEMENTATION.md
