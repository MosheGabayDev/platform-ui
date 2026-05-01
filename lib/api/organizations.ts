/**
 * @module lib/api/organizations
 * API client functions for the Organizations module.
 *
 * MOCK MODE is currently true — returns a 1-org fixture so the page renders
 * without 401 noise. Flips to false once R045-min ships and Flask
 * /api/organizations endpoints are reachable from this environment.
 */

import type {
  OrgsListParams,
  OrgsListResponse,
  OrgDetailResponse,
  OrgStatsResponse,
  CreateOrgResponse,
  OrgSummary,
} from "@/lib/modules/organizations/types";
import type { CreateOrgInput, EditOrgInput } from "@/lib/modules/organizations/schemas";

export const MOCK_MODE = true;

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

const MOCK_ORGS: OrgSummary[] = [
  {
    id: 1,
    name: "Platform Demo Org",
    slug: "demo",
    description: "Default seeded organization for development.",
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    user_count: 3,
  },
];

/** Fetch paginated, filterable organizations list. System admin only. */
export async function fetchOrgs(params: OrgsListParams = {}): Promise<OrgsListResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 100));
    let filtered = MOCK_ORGS;
    if (params.is_active !== undefined) {
      filtered = filtered.filter((o) => o.is_active === params.is_active);
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter((o) => o.name.toLowerCase().includes(q));
    }
    const page = params.page ?? 1;
    const per_page = params.per_page ?? 25;
    return {
      success: true,
      data: {
        orgs: filtered.slice((page - 1) * per_page, page * per_page),
        total: filtered.length,
        page,
        per_page,
        total_pages: Math.max(1, Math.ceil(filtered.length / per_page)),
      },
    } as OrgsListResponse;
  }

  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.per_page) qs.set("per_page", String(params.per_page));
  if (params.search) qs.set("search", params.search);
  if (params.is_active !== undefined) qs.set("is_active", String(params.is_active));
  const query = qs.toString() ? `?${qs}` : "";
  return apiFetch<OrgsListResponse>(query);
}

/** Fetch aggregate org stats. System admin only. */
export async function fetchOrgStats(): Promise<OrgStatsResponse> {
  if (MOCK_MODE) {
    return {
      success: true,
      data: {
        total: MOCK_ORGS.length,
        active: MOCK_ORGS.filter((o) => o.is_active).length,
        inactive: 0,
      },
    } as OrgStatsResponse;
  }
  return apiFetch<OrgStatsResponse>("/stats");
}

/** Fetch single org by id. */
export async function fetchOrg(id: number): Promise<OrgDetailResponse> {
  if (MOCK_MODE) {
    const o = MOCK_ORGS.find((x) => x.id === id);
    if (!o) throw new Error(`fetchOrg failed: 404 — org ${id} not found`);
    return { success: true, data: { org: o } };
  }
  return apiFetch<OrgDetailResponse>(`/${id}`);
}

/** Create a new organization. System admin only. */
export async function createOrg(input: CreateOrgInput): Promise<CreateOrgResponse> {
  if (MOCK_MODE) {
    return {
      success: true,
      data: { org: { id: 999, name: input.name, slug: (input as { slug?: string }).slug ?? "new-org" } },
    };
  }
  return apiFetch<CreateOrgResponse>("", { method: "POST", body: JSON.stringify(input) });
}

/** Partially update an organization. System admin only. */
export async function updateOrg(id: number, input: EditOrgInput): Promise<OrgDetailResponse> {
  if (MOCK_MODE) {
    const o = MOCK_ORGS.find((x) => x.id === id) ?? MOCK_ORGS[0];
    return { success: true, data: { org: { ...o, ...(input as Partial<OrgSummary>) } } };
  }
  return apiFetch<OrgDetailResponse>(`/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

/** Activate or deactivate an organization. System admin only. */
export async function setOrgActive(
  id: number,
  isActive: boolean,
  reason?: string | null,
): Promise<OrgDetailResponse> {
  if (MOCK_MODE) {
    const o = MOCK_ORGS.find((x) => x.id === id) ?? MOCK_ORGS[0];
    return { success: true, data: { org: { ...o, is_active: isActive } } };
  }
  return apiFetch<OrgDetailResponse>(`/${id}/active`, {
    method: "PATCH",
    body: JSON.stringify({ is_active: isActive, reason: reason ?? null }),
  });
}
