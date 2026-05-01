/**
 * @module lib/api/users
 * API client functions for the Users module.
 * All calls go through the Next.js proxy (/api/proxy/users/*) which attaches Bearer auth.
 *
 * MOCK MODE is currently true — returns a small fixture so list + detail pages
 * render without 401 noise. Flips to false once R045-min ships and Flask
 * /api/users endpoints are reachable from this environment.
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
  RolesListResponse,
  UserMutationResponse,
  UserSummary,
  UserDetail,
} from "@/lib/modules/users/types";
import type { CreateUserInput, EditUserInput } from "@/lib/modules/users/schemas";

export const MOCK_MODE = true;

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

// ---------------------------------------------------------------------------
// Mock fixtures
// ---------------------------------------------------------------------------

const MOCK_USERS: UserSummary[] = [
  {
    id: 1,
    username: "admin",
    email: "admin@platform.local",
    name: "System Admin",
    role: "system_admin",
    role_id: 1,
    is_active: true,
    is_admin: true,
    is_ai_agent: false,
    is_approved: true,
    org_id: 1,
    created_at: "2026-01-01T00:00:00Z",
    last_login: "2026-05-01T08:00:00Z",
  },
  {
    id: 2,
    username: "manager",
    email: "manager@platform.local",
    name: "Manager Bot",
    role: "manager",
    role_id: 2,
    is_active: true,
    is_admin: true,
    is_ai_agent: false,
    is_approved: true,
    org_id: 1,
    created_at: "2026-01-15T00:00:00Z",
    last_login: "2026-04-30T18:30:00Z",
  },
  {
    id: 7,
    username: "techtim",
    email: "tim@platform.local",
    name: "Tech Tim",
    role: "technician",
    role_id: 3,
    is_active: true,
    is_admin: false,
    is_ai_agent: false,
    is_approved: true,
    org_id: 1,
    created_at: "2026-02-01T00:00:00Z",
    last_login: "2026-05-01T07:15:00Z",
  },
];

const MOCK_DETAIL_FIELDS = (u: UserSummary): UserDetail => ({
  ...u,
  first_name: u.name.split(" ")[0] ?? null,
  last_name: u.name.split(" ").slice(1).join(" ") || null,
  display_name: u.name,
  bio: null,
  phone: null,
  phone_verified: false,
  job_title: null,
  profile_image: null,
  is_manager: u.role === "manager",
  is_system_admin: u.role === "system_admin",
  email_confirmed: true,
  mfa_enabled: false,
  mfa_exempt: false,
  auto_approve_commands: false,
  preferred_language: "he",
  timezone: "Asia/Jerusalem",
  email_notifications: true,
  security_alerts: true,
  system_updates: true,
  permissions: u.is_admin ? ["users.view", "users.create", "users.edit"] : ["users.view"],
});

function applyUserFilters(users: UserSummary[], params: UsersListParams): UserSummary[] {
  let result = users;
  if (params.role) result = result.filter((u) => u.role === params.role);
  if (params.is_active !== undefined) {
    result = result.filter((u) => u.is_active === params.is_active);
  }
  if (params.search) {
    const q = params.search.toLowerCase();
    result = result.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }
  return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Fetch paginated, filterable users list. */
export async function fetchUsers(params: UsersListParams = {}): Promise<UsersListResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 150));
    const page = params.page ?? 1;
    const per_page = params.per_page ?? 25;
    const filtered = applyUserFilters(MOCK_USERS, params);
    const start = (page - 1) * per_page;
    return {
      success: true,
      data: {
        users: filtered.slice(start, start + per_page),
        total: filtered.length,
        page,
        per_page,
        total_pages: Math.max(1, Math.ceil(filtered.length / per_page)),
      },
    };
  }

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
export async function fetchUserStats(): Promise<UserStatsResponse> {
  if (MOCK_MODE) {
    return {
      success: true,
      data: { total: MOCK_USERS.length, active: MOCK_USERS.filter((u) => u.is_active).length, pending: 0, admins: MOCK_USERS.filter((u) => u.is_admin).length },
    };
  }
  return apiFetch<UserStatsResponse>("/stats");
}

/** Fetch users pending admin approval. Admin only — returns 403 otherwise. */
export async function fetchPendingUsers(): Promise<PendingUsersResponse> {
  if (MOCK_MODE) return { success: true, data: { users: [], total: 0 } };
  return apiFetch<PendingUsersResponse>("/pending");
}

/** Fetch single user detail by id. */
export async function fetchUser(id: number): Promise<UserDetailResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 100));
    const u = MOCK_USERS.find((x) => x.id === id);
    if (!u) throw new Error(`fetchUser failed: 404 — user ${id} not found`);
    return { success: true, data: { user: MOCK_DETAIL_FIELDS(u) } };
  }
  return apiFetch<UserDetailResponse>(`/${id}`);
}

/** Approve a pending user. Admin only. */
export async function approveUser(id: number): Promise<{ success: boolean; message: string }> {
  if (MOCK_MODE) return { success: true, message: `(mock) user ${id} approved` };
  return apiFetch(`/${id}/approve`, { method: "POST" });
}

/** List available roles for create/edit dropdown. Admin only. */
export async function fetchRoles(): Promise<RolesListResponse> {
  if (MOCK_MODE) {
    return {
      success: true,
      data: {
        roles: [
          { id: 1, name: "system_admin" },
          { id: 2, name: "manager" },
          { id: 3, name: "technician" },
          { id: 4, name: "viewer" },
        ],
      },
    };
  }
  return apiFetch<RolesListResponse>("/roles");
}

/** Create a new user in the current org. Admin only. */
export async function createUser(input: CreateUserInput): Promise<UserMutationResponse> {
  if (MOCK_MODE) {
    return { success: true, message: "(mock) user created", data: { user: { id: 999 } } } as unknown as UserMutationResponse;
  }
  return apiFetch<UserMutationResponse>("", { method: "POST", body: JSON.stringify(input) });
}

/** Update user fields. Admin or own profile. */
export async function updateUser(id: number, input: EditUserInput): Promise<UserMutationResponse> {
  if (MOCK_MODE) {
    return { success: true, message: `(mock) user ${id} updated`, data: { user: { id } } } as unknown as UserMutationResponse;
  }
  return apiFetch<UserMutationResponse>(`/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

/** Activate or deactivate a user. Admin only. */
export async function setUserActive(
  id: number,
  isActive: boolean,
  reason?: string | null,
): Promise<UserMutationResponse> {
  if (MOCK_MODE) {
    return { success: true, message: `(mock) user ${id} ${isActive ? "activated" : "deactivated"}`, data: { user: { id } } } as unknown as UserMutationResponse;
  }
  return apiFetch<UserMutationResponse>(`/${id}/active`, {
    method: "PATCH",
    body: JSON.stringify({ is_active: isActive, reason: reason ?? null }),
  });
}
