# Module 13 — Audit Log

**Priority:** 🟡 Medium | **Est:** 1 day | **Depends on:** Users (01)

## Flask Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/helpdesk/api/audit/export` | Helpdesk audit log (CSV/JSON) |
| GET | `/admin/api/platform/audit-log` | Platform-wide audit log |

> Verify: `grep -n "audit" apps/admin/routes.py apps/helpdesk/routes.py`

## Proxy Mapping

Uses existing proxy prefixes.

## TypeScript Types (`lib/api/types.ts`)

```ts
export interface AuditEntry {
  id: number;
  actor_id: number;
  actor_name: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  ip_address?: string;
  timestamp: string;
  org_id: number;
  metadata?: Record<string, unknown>;
}
```

## Query Keys (`lib/api/query-keys.ts`)

```ts
auditLog: {
  list: (filters?: object) => ["audit-log", "list", filters] as const,
}
```

## Pages / Routes

| File | Route | Description |
|------|-------|-------------|
| `app/(dashboard)/audit-log/page.tsx` | `/audit-log` | Audit log viewer |

## Components

- `AuditTable` — DataTable<AuditEntry> with actor, action, resource, time
- `AuditActionBadge` — create/update/delete/login badge
- `AuditFilterBar` — actor filter, action type, date range
- `ExportButton` — download CSV

## Definition of Done

- [ ] Audit log table with filters
- [ ] Actor / action / resource columns
- [ ] Date range filter
- [ ] CSV export
- [ ] Skeleton + EmptyState
