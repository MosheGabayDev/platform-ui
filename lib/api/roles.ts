/**
 * @module lib/api/roles
 * API client functions for the Roles & Permissions module.
 * All calls go through /api/proxy/roles/* which attaches Bearer auth.
 *
 * Do NOT call Flask directly. Do NOT put UI logic here.
 */

import type {
  RolesListParams,
  RolesListResponse,
  RoleDetailResponse,
  PermissionsListResponse,
  RoleMutationResponse,
} from "@/lib/modules/roles/types";
import type { CreateRoleInput, EditRoleInput } from "@/lib/modules/roles/schemas";

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

/** List all roles with permission and user counts. */
export function fetchRoles(params: RolesListParams = {}): Promise<RolesListResponse> {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  const query = qs.toString() ? `?${qs}` : "";
  return apiFetch<RolesListResponse>(query);
}

/** Fetch single role detail with full permissions list. */
export function fetchRole(id: number): Promise<RoleDetailResponse> {
  return apiFetch<RoleDetailResponse>(`/${id}`);
}

/** List all available permissions (for create/edit form). */
export function fetchAllPermissions(): Promise<PermissionsListResponse> {
  return apiFetch<PermissionsListResponse>("/permissions");
}

/** Create a new global role. System admin only. */
export function createRole(input: CreateRoleInput): Promise<RoleMutationResponse> {
  return apiFetch<RoleMutationResponse>("", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Update role name/description. System admin only. */
export function updateRole(
  id: number,
  input: Pick<EditRoleInput, "name" | "description">,
): Promise<RoleMutationResponse> {
  return apiFetch<RoleMutationResponse>(`/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/** Replace role's full permission set. System admin only. */
export function setRolePermissions(
  id: number,
  permissionIds: number[],
): Promise<RoleMutationResponse> {
  return apiFetch<RoleMutationResponse>(`/${id}/permissions`, {
    method: "PATCH",
    body: JSON.stringify({ permission_ids: permissionIds }),
  });
}
