# Module 01 — Users

**Priority:** 🔴 Critical | **Est:** 2 days | **Depends on:** nothing

## Flask Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/users` | List users (paginated, filterable) |
| GET | `/admin/users/<id>` | Get single user |
| POST | `/admin/users/create` | Create user |
| POST | `/admin/users/<id>/edit` | Update user |
| GET | `/admin/users/pending` | List pending-approval users |
| POST | `/admin/users/<id>/approve` | Approve pending user |
| GET | `/admin/users/<id>/role` | Get user role |
| POST | `/admin/users/<id>/role` | Assign role |
| GET | `/api/auth/verify` | Verify session |

## Proxy Mapping (add to `app/api/proxy/[...path]/route.ts`)

```
"users": "/admin"
```

## TypeScript Types (`lib/api/types.ts`)

```ts
export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  org_id: number;
  last_login?: string;
  is_ai_agent?: boolean;
}

export interface UsersListResponse {
  users: User[];
  total: number;
  page: number;
  per_page: number;
}
```

## Query Keys (`lib/api/query-keys.ts`)

```ts
users: {
  list: (page: number, search?: string) => ["users", "list", page, search] as const,
  detail: (id: number) => ["users", "detail", id] as const,
  pending: ["users", "pending"] as const,
}
```

## Pages / Routes

| File | Route | Description |
|------|-------|-------------|
| `app/(dashboard)/users/page.tsx` | `/users` | User list with DataTable |
| `app/(dashboard)/users/[id]/page.tsx` | `/users/:id` | User detail / edit |
| `app/(dashboard)/users/new/page.tsx` | `/users/new` | Create user form |
| `app/(dashboard)/users/pending/page.tsx` | `/users/pending` | Approval queue |

## Components

- `UserTable` — `DataTable<User>` with search by name/email
- `UserForm` — React Hook Form + Zod, role dropdown
- `UserStatusBadge` — active/inactive/pending badge
- `ApprovalQueue` — pending users list with approve/reject actions

## Actual Endpoints Used (Round 010)

> **CRITICAL FINDING**: `/admin/users` routes return HTML (Jinja2), NOT JSON.
> A new JWT-authenticated JSON API was created: `apps/authentication/user_api_routes.py`
> Proxy maps `users` → `/api/users` (not `/admin/users`).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users` | List users (paginated, filterable, org-scoped) |
| GET | `/api/users/stats` | Quick counts (total/active/pending/admins) |
| GET | `/api/users/pending` | Pending approval queue (admin only) |
| GET | `/api/users/<id>` | User detail (admin sees all, user sees own) |
| POST | `/api/users/<id>/approve` | Approve pending user (admin only) |

## Definition of Done

- [x] List page with search + pagination — `app/(dashboard)/users/page.tsx`
- [x] Skeleton loading on all data states
- [x] EmptyState when no users
- [x] Error state with retry button
- [x] Stats header (total/active/pending)
- [x] Pending approval banner for admins
- [x] User detail page — `app/(dashboard)/users/[id]/page.tsx`
- [x] TypeScript typecheck passes
- [ ] Create / edit form with validation — Phase 2 backlog
- [ ] Pending approval queue page — Phase 2 backlog
- [ ] nav-items badge shows pending count — Phase 2 backlog
- [ ] Role filter dropdown — Phase 2 backlog
- [ ] Playwright E2E tests — Phase C backlog
