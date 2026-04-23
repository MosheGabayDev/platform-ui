# Module 03 — Roles & Permissions

**Priority:** 🔴 Critical | **Est:** 2 days | **Depends on:** Users (01), Organizations (02)

## Flask Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/roles` | List roles |
| POST | `/admin/roles/create` | Create role |
| GET/POST | `/admin/roles/<id>/edit` | Edit role |
| GET | `/admin/permissions` | List permissions |
| POST | `/admin/permissions/create` | Create permission |
| GET/POST | `/admin/permissions/<id>/edit` | Edit permission |

## Proxy Mapping

Uses existing `"users": "/admin"` prefix (GET `/api/proxy/users/roles` → `/admin/roles`).

## TypeScript Types (`lib/api/types.ts`)

```ts
export interface Role {
  id: number;
  name: string;
  description?: string;
  permissions: string[];
  user_count: number;
}

export interface Permission {
  id: number;
  name: string;
  codename: string;
  module: string;
  description?: string;
}
```

## Query Keys (`lib/api/query-keys.ts`)

```ts
roles: {
  list: ["roles", "list"] as const,
  detail: (id: number) => ["roles", "detail", id] as const,
},
permissions: {
  list: ["permissions", "list"] as const,
},
```

## Pages / Routes

| File | Route | Description |
|------|-------|-------------|
| `app/(dashboard)/roles/page.tsx` | `/roles` | Roles list + permission matrix |
| `app/(dashboard)/roles/[id]/page.tsx` | `/roles/:id` | Role detail + assigned users |
| `app/(dashboard)/roles/new/page.tsx` | `/roles/new` | Create role |

## Components

- `RoleCard` — role name, permission count, user count
- `PermissionMatrix` — checkbox grid: role × permission
- `RoleForm` — name, description, multi-select permissions

## Definition of Done

- [ ] Roles list with permission count
- [ ] Permission matrix grid view
- [ ] Assign permissions to role
- [ ] Show users per role
- [ ] Skeleton + EmptyState
