/**
 * @module lib/api/organizations
 * API client functions for the Organizations module.
 * All calls go through /api/proxy/organizations/* which attaches Bearer auth.
 *
 * Do NOT call Flask directly. Do NOT put UI logic here.
 */

import type {
  OrgsListParams,
  OrgsListResponse,
  OrgDetailResponse,
  OrgStatsResponse,
  CreateOrgPayload,
  CreateOrgResponse,
  UpdateOrgPayload,
} from "@/lib/modules/organizations/types";

const BASE = "/api/proxy/organizations";

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

/** Fetch paginated, filterable organizations list. System admin only. */
export function fetchOrgs(params: OrgsListParams = {}): Promise<OrgsListResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.per_page) qs.set("per_page", String(params.per_page));
  if (params.search) qs.set("search", params.search);
  if (params.is_active !== undefined) qs.set("is_active", String(params.is_active));
  const query = qs.toString() ? `?${qs}` : "";
  return apiFetch<OrgsListResponse>(query);
}

/** Fetch aggregate org stats (total/active/inactive). System admin only. */
export function fetchOrgStats(): Promise<OrgStatsResponse> {
  return apiFetch<OrgStatsResponse>("/stats");
}

/** Fetch single org by id. System admin gets any org; others get own org only. */
export function fetchOrg(id: number): Promise<OrgDetailResponse> {
  return apiFetch<OrgDetailResponse>(`/${id}`);
}

/** Create a new organization. System admin only. */
export function createOrg(payload: CreateOrgPayload): Promise<CreateOrgResponse> {
  return apiFetch<CreateOrgResponse>("", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Partially update an organization. System admin only. */
export function updateOrg(id: number, payload: UpdateOrgPayload): Promise<OrgDetailResponse> {
  return apiFetch<OrgDetailResponse>(`/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
