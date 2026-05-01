/**
 * @module lib/api/roles
 * API client functions for the Roles & Permissions module.
 *
 * MOCK MODE is currently true — returns 4 default roles. Flips to false once
 * R045-min ships and Flask /api/roles endpoints are reachable.
 */

import type {
  RolesListParams,
  RolesListResponse,
  RoleDetailResponse,
  PermissionsListResponse,
  RoleMutationResponse,
  RoleSummary,
  RolePermission,
} from "@/lib/modules/roles/types";
import type { CreateRoleInput, EditRoleInput } from "@/lib/modules/roles/schemas";

export const MOCK_MODE = true;

const BASE = "/api/proxy/roles";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? body.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

const MOCK_PERMISSIONS: RolePermission[] = [
  { id: 1, name: "users.view", description: "View users list and detail", created_at: null },
  { id: 2, name: "users.create", description: "Create new users", created_at: null },
  { id: 3, name: "users.edit", description: "Edit user fields", created_at: null },
  { id: 4, name: "users.deactivate", description: "Deactivate users", created_at: null },
  { id: 5, name: "helpdesk.view", description: "View helpdesk tickets", created_at: null },
  { id: 6, name: "helpdesk.assign", description: "Assign tickets", created_at: null },
  { id: 7, name: "helpdesk.resolve", description: "Resolve tickets", created_at: null },
  { id: 8, name: "helpdesk.approve", description: "Approve tool invocations", created_at: null },
  { id: 9, name: "audit.view", description: "View audit log", created_at: null },
  { id: 10, name: "audit.export", description: "Export audit log", created_at: null },
];

const MOCK_ROLES: RoleSummary[] = [
  { id: 1, name: "system_admin", description: "Cross-tenant platform operator", permission_count: 10, user_count: 1, created_at: null, updated_at: null },
  { id: 2, name: "manager", description: "Org manager — team operations", permission_count: 8, user_count: 1, created_at: null, updated_at: null },
  { id: 3, name: "technician", description: "Operator — handles tickets", permission_count: 5, user_count: 1, created_at: null, updated_at: null },
  { id: 4, name: "viewer", description: "Read-only role", permission_count: 2, user_count: 0, created_at: null, updated_at: null },
];

/** List all roles with permission and user counts. */
export async function fetchRoles(params: RolesListParams = {}): Promise<RolesListResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 100));
    let filtered = MOCK_ROLES;
    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter((r) => r.name.toLowerCase().includes(q));
    }
    return { success: true, data: { roles: filtered, total: filtered.length } };
  }
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  const query = qs.toString() ? `?${qs}` : "";
  return apiFetch<RolesListResponse>(query);
}

/** Fetch single role detail with full permissions list. */
export async function fetchRole(id: number): Promise<RoleDetailResponse> {
  if (MOCK_MODE) {
    const role = MOCK_ROLES.find((r) => r.id === id);
    if (!role) throw new Error(`fetchRole failed: 404 — role ${id} not found`);
    // Mock: assume the role has the first N permissions where N matches its count
    return {
      success: true,
      data: {
        role: { ...role, permissions: MOCK_PERMISSIONS.slice(0, role.permission_count) },
      },
    };
  }
  return apiFetch<RoleDetailResponse>(`/${id}`);
}

/** List all available permissions. */
export async function fetchAllPermissions(): Promise<PermissionsListResponse> {
  if (MOCK_MODE) return { success: true, data: { permissions: MOCK_PERMISSIONS } };
  return apiFetch<PermissionsListResponse>("/permissions");
}

/** Create a new global role. System admin only. */
export async function createRole(input: CreateRoleInput): Promise<RoleMutationResponse> {
  if (MOCK_MODE) {
    return {
      success: true,
      message: "(mock) role created",
      data: {
        role: {
          id: 999,
          name: input.name,
          description: input.description ?? null,
          permission_count: 0,
          user_count: 0,
          created_at: null,
          updated_at: null,
          permissions: [],
        },
      },
    } as RoleMutationResponse;
  }
  return apiFetch<RoleMutationResponse>("", { method: "POST", body: JSON.stringify(input) });
}

/** Update role name/description. System admin only. */
export async function updateRole(
  id: number,
  input: Pick<EditRoleInput, "name" | "description">,
): Promise<RoleMutationResponse> {
  if (MOCK_MODE) {
    const role = MOCK_ROLES.find((r) => r.id === id) ?? MOCK_ROLES[0];
    return {
      success: true,
      message: "(mock) role updated",
      data: {
        role: {
          ...role,
          name: input.name ?? role.name,
          description: input.description ?? role.description,
          permissions: MOCK_PERMISSIONS.slice(0, role.permission_count),
        },
      },
    } as RoleMutationResponse;
  }
  return apiFetch<RoleMutationResponse>(`/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

/** Replace role's full permission set. System admin only. */
export async function setRolePermissions(
  id: number,
  permissionIds: number[],
): Promise<RoleMutationResponse> {
  if (MOCK_MODE) {
    const role = MOCK_ROLES.find((r) => r.id === id) ?? MOCK_ROLES[0];
    return {
      success: true,
      message: "(mock) permissions updated",
      data: {
        role: {
          ...role,
          permission_count: permissionIds.length,
          permissions: MOCK_PERMISSIONS.filter((p) => permissionIds.includes(p.id)),
        },
      },
    } as RoleMutationResponse;
  }
  return apiFetch<RoleMutationResponse>(`/${id}/permissions`, {
    method: "PATCH",
    body: JSON.stringify({ permission_ids: permissionIds }),
  });
}
