# Module 02 — Organizations: Implementation Notes

_Last updated: 2026-04-24 (Round 019)_

## Status: Phase B Complete

---

## What Was Built

### Flask (platformengineer)

**Round 013:** `apps/admin/org_api_routes.py` — JWT blueprint at `/api/organizations`
- 5 endpoints: `GET /` (list), `GET /stats`, `GET /<id>`, `POST /`, `PATCH /<id>`
- All `@jwt_required`, `org_id` always from `g.jwt_user` — ADR-015 compliant
- Registered in `apps/__init__.py` after `user_api_bp`

**Round 019 hardening:**
- Slug format validated against `^[a-z0-9][a-z0-9\-]{0,48}[a-z0-9]$|^[a-z0-9]$`
- Name length validated (2–100 chars) on both `POST` and `PATCH`
- `IntegrityError` caught on create/update → 409 response with safe message (no `str(exc)` leak)
- `PATCH` update also validates name length before executing

### platform-ui

**Round 013:**
- `lib/modules/organizations/types.ts` — OrgSummary, response envelopes, payload types
- `lib/api/organizations.ts` — fetchOrgs, fetchOrgStats, fetchOrg, createOrg, updateOrg
- `lib/api/query-keys.ts` — orgs key group
- Proxy PATH_MAP: `organizations` → `/api/organizations`
- `components/modules/organizations/org-status-badge.tsx`
- `components/modules/organizations/orgs-table.tsx`
- `app/(dashboard)/organizations/page.tsx` — list with PermissionGate (systemAdminOnly)
- `app/(dashboard)/organizations/[id]/page.tsx` — detail

**Round 019 (Phase B):**
- `lib/modules/organizations/schemas.ts` — `createOrgSchema` + `editOrgSchema` (Zod)
- `lib/api/organizations.ts` — updated to use `CreateOrgInput` / `EditOrgInput` from schemas
- `components/modules/organizations/organization-form.tsx` — `OrgCreateSheet` + `OrgEditSheet`
- `app/(dashboard)/organizations/page.tsx` — "ארגון חדש" button + `OrgCreateSheet`
- `app/(dashboard)/organizations/[id]/page.tsx` — "ערוך ארגון" button + `OrgEditSheet`

---

## Routes

| Route | File | Description |
|-------|------|-------------|
| `/organizations` | `app/(dashboard)/organizations/page.tsx` | List + create (system_admin) |
| `/organizations/[id]` | `app/(dashboard)/organizations/[id]/page.tsx` | Detail + edit (system_admin) |

---

## Backend Endpoints

| Method | Flask Path | Auth | Notes |
|--------|-----------|------|-------|
| GET | `/api/organizations` | JWT + system_admin | Paginated list; `?search=&is_active=&page=&per_page=` |
| GET | `/api/organizations/stats` | JWT + system_admin | Aggregate counts |
| GET | `/api/organizations/<id>` | JWT (own org or system_admin) | Detail view |
| POST | `/api/organizations` | JWT + system_admin | Create; validates name + slug |
| PATCH | `/api/organizations/<id>` | JWT + system_admin | Update name/description/is_active |

---

## Permissions Required

| Action | Requirement |
|--------|------------|
| View org list | system_admin |
| View org stats | system_admin |
| View org detail | system_admin OR own org |
| Create org | system_admin |
| Edit org | system_admin |

Frontend: `hasRole(session, "system_admin")` from `lib/auth/rbac.ts`.
Backend: `_is_system_admin(g.jwt_user)` in `org_api_routes.py`.

---

## Create Form — Slug Auto-Generation

`OrgCreateSheet` auto-generates the slug field from the name while the user types.
Algorithm: `name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-")`.
The user can manually override the slug before submitting.
**Slug is immutable after creation** — the edit form shows it as read-only text.

---

## Shared Capabilities Used

| Capability | Import |
|-----------|--------|
| DataTable | `@/components/shared/data-table` |
| PermissionGate | `@/components/shared/permission-gate` |
| PageShell | `@/components/shared/page-shell` |
| StatCard | `@/components/shared/stats` |
| PlatformForm, FormError, FormActions | `@/components/shared/form` |
| usePlatformMutation | `@/lib/hooks/use-platform-mutation` |
| DetailHeaderCard, DetailSection, InfoRow, BoolBadge, DetailBackButton, DetailLoadingSkeleton | `@/components/shared/detail-view` |
| ErrorState | `@/components/shared/error-state` |
| PAGE_EASE | `@/lib/ui/motion` |
| formatDate | `@/lib/utils/format` |

---

## Tenant Safety

- Org list: system_admin only (frontend `PermissionGate` + backend `_is_system_admin`)
- Org detail: system_admin OR user whose `org_id` matches
- `org_id` is NEVER in form payloads — the backend derives everything from `g.jwt_user`
- Slug cannot be updated (immutable) — no `slug` field in `PATCH` body or edit form
- IntegrityError on duplicate name/slug → 409 (safe message, no DB details)

---

## How Future Agents Should Modify This Module

### Adding a new field (e.g. `timezone`)
1. Add column to `organizations` table via migration
2. Add field to `_serialize_org()` in `apps/admin/org_api_routes.py`
3. Add field to `OrgSummary` in `lib/modules/organizations/types.ts`
4. Add field to `editOrgSchema` in `lib/modules/organizations/schemas.ts`
5. Add `PATCH` handling in `update_organization()`
6. Add `Input` field in `OrgEditSheet` in `organization-form.tsx`

### Deactivating an org (destructive)
- Use `ConfirmActionDialog` before submitting `is_active: false`
- Currently the `is_active` toggle is in the form — a dedicated "Deactivate" button with confirm dialog is a backlog item

---

## Backlog

- Dedicated "Deactivate Org" button with `ConfirmActionDialog`
- Org members list tab (cross-module with Users)
- E2E tests
