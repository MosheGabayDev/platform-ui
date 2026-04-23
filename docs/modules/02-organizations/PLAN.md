# Module 02 — Organizations

**Priority:** 🔴 Critical | **Est:** 2 days | **Depends on:** Users (01)

## Flask Endpoints

Organizations are managed via admin blueprint. Check `/admin/api/organizations` or
general settings. At minimum:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/api/organizations` | List orgs |
| GET | `/admin/api/organizations/<id>` | Org detail |
| POST | `/admin/api/organizations` | Create org |
| PUT | `/admin/api/organizations/<id>` | Update org |
| DELETE | `/admin/api/organizations/<id>` | Delete org |
| GET | `/admin/api/organizations/<id>/users` | Users in org |

> Verify exact paths by running `grep -n "@.*route.*org" apps/authentication/routes.py apps/admin/routes.py`

## Proxy Mapping (add to `app/api/proxy/[...path]/route.ts`)

```
"admin": "/admin/api"   // already exists
```

## TypeScript Types (`lib/api/types.ts`)

```ts
export interface Organization {
  id: number;
  name: string;
  slug: string;
  plan: string;
  is_active: boolean;
  user_count: number;
  created_at: string;
  contact_email?: string;
}
```

## Query Keys (`lib/api/query-keys.ts`)

```ts
orgs: {
  list: ["orgs", "list"] as const,
  detail: (id: number) => ["orgs", "detail", id] as const,
}
```

## Pages / Routes

| File | Route | Description |
|------|-------|-------------|
| `app/(dashboard)/organizations/page.tsx` | `/organizations` | Org list |
| `app/(dashboard)/organizations/[id]/page.tsx` | `/organizations/:id` | Org detail |
| `app/(dashboard)/organizations/new/page.tsx` | `/organizations/new` | Create org |

## Components

- `OrgCard` — plan badge, user count, status dot
- `OrgForm` — name, slug, plan, contact email
- `OrgUsersList` — sub-table of users belonging to org

## Definition of Done

- [ ] List page with plan filter
- [ ] Create / edit form
- [ ] Org detail with user sub-list
- [ ] Skeleton + EmptyState
