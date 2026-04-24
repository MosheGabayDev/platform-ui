/**
 * @module lib/platform/modules/organizations/types
 * Cross-platform re-export of Organizations module type contracts.
 *
 * @platform cross — pure TypeScript, no framework imports
 *
 * Import from this path in platform-agnostic code (mobile, desktop, shared utils).
 * Web-specific code may continue to import from lib/modules/organizations/types directly.
 */
export type {
  OrgSummary,
  OrgsListResponse,
  OrgDetailResponse,
  OrgStatsResponse,
  CreateOrgResponse,
  OrgsListParams,
  CreateOrgPayload,
  UpdateOrgPayload,
} from "@/lib/modules/organizations/types";
