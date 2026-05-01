/**
 * @module lib/modules/users/types
 * TypeScript types for the Users module.
 * Mirrors Flask apps/authentication/user_api_routes.py serializers.
 * API response types (UserSummary, UserDetail) are separate from any UI-only models.
 *
 * Do NOT add UI state here. Do NOT import React or component libraries here.
 */

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------

export type UserStatus = "active" | "inactive" | "pending";

// ---------------------------------------------------------------------------
// API response types (matches Flask serialize_auth_user / _serialize_user_*)
// ---------------------------------------------------------------------------

/** Minimal user record returned in list views. */
export interface UserSummary {
  id: number;
  username: string;
  email: string;
  /** Computed from first_name + last_name, falls back to username. */
  name: string;
  role: string | null;
  role_id: number | null;
  is_active: boolean;
  is_admin: boolean;
  is_ai_agent: boolean;
  is_approved: boolean;
  org_id: number;
  created_at: string | null;
  last_login: string | null;
}

/** Full user record returned in detail views. */
export interface UserDetail extends UserSummary {
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  bio: string | null;
  phone: string | null;
  phone_verified: boolean;
  job_title: string | null;
  profile_image: string | null;
  is_manager: boolean;
  is_system_admin: boolean;
  email_confirmed: boolean;
  mfa_enabled: boolean;
  mfa_exempt: boolean;
  auto_approve_commands: boolean;
  preferred_language: string | null;
  timezone: string | null;
  email_notifications: boolean;
  security_alerts: boolean;
  system_updates: boolean;
  permissions: string[];
}

// ---------------------------------------------------------------------------
// List endpoint response envelope
// ---------------------------------------------------------------------------

export interface UsersListResponse {
  success: boolean;
  data: {
    users: UserSummary[];
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}

export interface UserDetailResponse {
  success: boolean;
  data: {
    user: UserDetail;
  };
}

export interface UserStatsResponse {
  success: boolean;
  data: {
    total: number;
    active: number;
    pending: number;
    admins: number;
  };
}

export interface PendingUsersResponse {
  success: boolean;
  data: {
    users: UserSummary[];
    total: number;
  };
}

// ---------------------------------------------------------------------------
// Query parameters
// ---------------------------------------------------------------------------

export interface UsersListParams {
  page?: number;
  per_page?: number;
  search?: string;
  role?: string;
  is_active?: boolean;
}

// ---------------------------------------------------------------------------
// Roles (for create/edit dropdown)
// ---------------------------------------------------------------------------

export interface RoleSummary {
  id: number;
  name: string;
}

export interface RolesListResponse {
  success: boolean;
  data: { roles: RoleSummary[] };
}

// ---------------------------------------------------------------------------
// Activity timeline
// ---------------------------------------------------------------------------

export type ActivityTypeFilter = "login" | "security" | "profile";

export interface UserActivityEvent {
  id: string;
  type: string;
  timestamp: string;
  actor?: string;
  description: string;
  detail?: string;
}

export interface UserActivityResponse {
  success: boolean;
  data: {
    events: UserActivityEvent[];
    total: number;
  };
}

// ---------------------------------------------------------------------------
// Mutation response types
// ---------------------------------------------------------------------------

export interface UserMutationResponse {
  success: boolean;
  data: { user: UserDetail };
}
