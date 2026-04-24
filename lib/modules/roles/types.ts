/**
 * @module lib/modules/roles/types
 * TypeScript types for the Roles & Permissions module.
 * Mirrors Flask apps/authentication/role_api_routes.py serializers.
 *
 * Authority model:
 *   - Roles are GLOBAL (no org_id) — shared across all organizations.
 *   - Read access: any admin (is_admin or is_system_admin).
 *   - Write access: system_admin only.
 *
 * Do NOT add UI state here. Do NOT import React here.
 */

// ---------------------------------------------------------------------------
// Permission record
// ---------------------------------------------------------------------------

export interface RolePermission {
  id: number;
  /** Codename — matches @permission_required("codename") in Flask decorators. */
  name: string;
  description: string | null;
  created_at?: string | null;
}

// ---------------------------------------------------------------------------
// Role records
// ---------------------------------------------------------------------------

/** Lightweight role for list views — includes counts only. */
export interface RoleSummary {
  id: number;
  name: string;
  description: string | null;
  permission_count: number;
  user_count: number;
  created_at: string | null;
  updated_at: string | null;
}

/** Full role record for detail views — includes permissions array. */
export interface RoleDetail extends RoleSummary {
  permissions: RolePermission[];
}

// ---------------------------------------------------------------------------
// Response envelopes
// ---------------------------------------------------------------------------

export interface RolesListResponse {
  success: boolean;
  data: { roles: RoleSummary[]; total: number };
}

export interface RoleDetailResponse {
  success: boolean;
  data: { role: RoleDetail };
}

export interface PermissionsListResponse {
  success: boolean;
  data: { permissions: RolePermission[] };
}

export interface RoleMutationResponse {
  success: boolean;
  data: { role: RoleDetail };
}

// ---------------------------------------------------------------------------
// Query parameters
// ---------------------------------------------------------------------------

export interface RolesListParams {
  search?: string;
}

// ---------------------------------------------------------------------------
// Permission namespace grouping (derived client-side from dot notation)
// ---------------------------------------------------------------------------

/** Group permissions by the prefix before the first dot. */
export function groupPermissions(
  permissions: RolePermission[],
): Map<string, RolePermission[]> {
  const map = new Map<string, RolePermission[]>();
  for (const p of permissions) {
    const group = p.name.includes(".") ? p.name.split(".")[0] : "general";
    if (!map.has(group)) map.set(group, []);
    map.get(group)!.push(p);
  }
  return map;
}
