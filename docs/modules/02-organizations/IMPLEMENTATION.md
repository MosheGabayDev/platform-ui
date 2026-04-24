# Module 02 — Organizations: Implementation Notes

## Status: Phase A Complete (Round 013)

## What Was Built

### Flask (platformengineer — Round 013)
- `apps/admin/org_api_routes.py` — new JWT blueprint (`org_api_bp`) at `/api/organizations`
- 5 endpoints: `GET /` (list), `GET /stats`, `GET /<id>`, `POST /`, `PATCH /<id>`
- All `@jwt_required`, org_id always from `g.jwt_user.org_id` — ADR-015 compliant
- Raw SQL queries (Organization model has only `id` column; rest are raw columns)
- Registered in `apps/__init__.py` after `user_api_bp`

### platform-ui (Round 013)
- `lib/modules/organizations/types.ts` — OrgSummary, OrgDetail, payload types
- `lib/api/organizations.ts` — fetchOrgs, fetchOrgStats, fetchOrg, createOrg, updateOrg
- `lib/api/query-keys.ts` — added `orgs` key group
- `app/api/proxy/[...path]/route.ts` — added `"organizations"` to PATH_MAP
- `components/modules/organizations/org-status-badge.tsx` — Active/Inactive badge
- `components/modules/organizations/orgs-table.tsx` — DataTable<OrgSummary>
- `app/(dashboard)/organizations/page.tsx` — list page with PermissionGate (systemAdminOnly)
- `app/(dashboard)/organizations/[id]/page.tsx` — detail page

## Shared Capabilities Used (Round 015 refactor)

| Capability | Import |
|-----------|--------|
| DataTable | `@/components/shared/data-table` |
| PermissionGate | `@/components/shared/permission-gate` |
| PageShell | `@/components/shared/page-shell` |
| StatCard | `@/components/shared/stats` |
| DetailHeaderCard, DetailSection, InfoRow, BoolBadge, DetailBackButton, DetailLoadingSkeleton | `@/components/shared/detail-view` |
| ErrorState | `@/components/shared/error-state` |
| PAGE_EASE | `@/lib/ui/motion` |
| formatDate | `@/lib/utils/format` |

## Tenant Safety

- Org list endpoint: system admin only (`g.jwt_user.is_system_admin`)
- Org detail endpoint: system admin OR user whose `org_id` matches the requested id
- `org_id` never from URL params or request body on write endpoints

## Phase B (Not Yet Built)

- Create org form (POST /) — needs `PlatformForm` + zod schema
- Edit org form (PATCH /<id>) — same
- Disable org action — needs `ConfirmActionDialog`
- Org members list — cross-module with Users
