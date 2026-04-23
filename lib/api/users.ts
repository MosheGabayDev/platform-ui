/**
 * @module lib/api/users
 * API client functions for the Users module.
 * All calls go through the Next.js proxy (/api/proxy/users/*) which attaches Bearer auth.
 *
 * Do NOT call Flask directly. Do NOT put UI logic here.
 * Do NOT use these functions directly in components — wrap with useQuery in hooks.
 */

import type {
  UsersListParams,
  UsersListResponse,
  UserDetailResponse,
  UserStatsResponse,
  PendingUsersResponse,
} from "@/lib/modules/users/types";

const BASE = "/api/proxy/users";

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

/** Fetch paginated, filterable users list. */
export function fetchUsers(params: UsersListParams = {}): Promise<UsersListResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.per_page) qs.set("per_page", String(params.per_page));
  if (params.search) qs.set("search", params.search);
  if (params.role) qs.set("role", params.role);
  if (params.is_active !== undefined) qs.set("is_active", String(params.is_active));
  const query = qs.toString() ? `?${qs}` : "";
  return apiFetch<UsersListResponse>(`${query}`);
}

/** Fetch quick stats for the module header / badge. */
export function fetchUserStats(): Promise<UserStatsResponse> {
  return apiFetch<UserStatsResponse>("/stats");
}

/** Fetch users pending admin approval. Admin only — returns 403 otherwise. */
export function fetchPendingUsers(): Promise<PendingUsersResponse> {
  return apiFetch<PendingUsersResponse>("/pending");
}

/** Fetch single user detail by id. */
export function fetchUser(id: number): Promise<UserDetailResponse> {
  return apiFetch<UserDetailResponse>(`/${id}`);
}

/** Approve a pending user. Admin only. */
export async function approveUser(id: number): Promise<{ success: boolean; message: string }> {
  return apiFetch(`/${id}/approve`, { method: "POST" });
}
