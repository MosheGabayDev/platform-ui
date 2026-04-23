# Module 15 — Departments

**Priority:** 🟢 Low | **Est:** 1 day | **Depends on:** Users (01), Organizations (02)

## Flask Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/helpdesk/api/departments` | List departments |
| POST | `/helpdesk/api/departments` | Create department |
| PUT | `/helpdesk/api/departments/<id>` | Update department |
| DELETE | `/helpdesk/api/departments/<id>` | Delete department |
| GET | `/helpdesk/api/departments/<id>/members` | Members list |
| POST | `/helpdesk/api/departments/<id>/members` | Add member |

> Verify: `grep -n "department" apps/helpdesk/routes.py apps/admin/routes.py`

## Proxy Mapping

Uses existing `"helpdesk": "/helpdesk"` prefix.

## TypeScript Types (`lib/api/types.ts`)

```ts
export interface Department {
  id: number;
  name: string;
  description?: string;
  manager_id?: number;
  member_count: number;
  org_id: number;
}
```

## Query Keys (`lib/api/query-keys.ts`)

```ts
departments: {
  list: ["departments", "list"] as const,
  detail: (id: number) => ["departments", "detail", id] as const,
}
```

## Pages / Routes

| File | Route | Description |
|------|-------|-------------|
| `app/(dashboard)/departments/page.tsx` | `/departments` | Department list |
| `app/(dashboard)/departments/[id]/page.tsx` | `/departments/:id` | Members + details |

## Components

- `DepartmentCard` — name, manager, member count
- `MemberTable` — users in department with access level badge
- `DepartmentForm` — name, description, manager picker

## Definition of Done

- [ ] Department list with member count
- [ ] Create / edit form
- [ ] Member management
- [ ] Skeleton + EmptyState
