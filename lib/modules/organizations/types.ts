/**
 * @module lib/modules/organizations/types
 * TypeScript types for the Organizations module.
 * Mirrors Flask apps/admin/org_api_routes.py _serialize_org().
 *
 * Do NOT add UI state here. Do NOT import React or component libraries here.
 */

// ---------------------------------------------------------------------------
// API response types
// ---------------------------------------------------------------------------

/** Org record returned in list and detail views. */
export interface OrgSummary {
  id: number;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  created_at: string | null;
  user_count: number;
}

// ---------------------------------------------------------------------------
// Response envelopes
// ---------------------------------------------------------------------------

export interface OrgsListResponse {
  success: boolean;
  data: {
    orgs: OrgSummary[];
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}

export interface OrgDetailResponse {
  success: boolean;
  data: {
    org: OrgSummary;
  };
}

export interface OrgStatsResponse {
  success: boolean;
  data: {
    total: number;
    active: number;
    inactive: number;
  };
}

export interface CreateOrgResponse {
  success: boolean;
  data: {
    org: { id: number; name: string; slug: string };
  };
}

// ---------------------------------------------------------------------------
// Query parameters
// ---------------------------------------------------------------------------

export interface OrgsListParams {
  page?: number;
  per_page?: number;
  search?: string;
  is_active?: boolean;
}

// ---------------------------------------------------------------------------
// Mutation payloads
// ---------------------------------------------------------------------------

export interface CreateOrgPayload {
  name: string;
  slug: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateOrgPayload {
  name?: string;
  description?: string;
  is_active?: boolean;
}
