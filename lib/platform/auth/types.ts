/**
 * @module lib/platform/auth/types
 * Cross-platform auth user types shared by web, mobile, and desktop.
 *
 * @platform cross — no React, no Next.js, no DOM, no next-auth
 *
 * These types mirror Flask's _user_to_dict() / serialize_auth_user() output.
 * NextAuth-specific module augmentation lives in lib/auth/types.ts (web-only).
 */

// ---------------------------------------------------------------------------
// Flask API response shapes
// ---------------------------------------------------------------------------

/** Response body from Flask POST /api/auth/login */
export interface FlaskLoginResponse {
  data: {
    token: string;
    refresh_token: string;
    user: FlaskUserPayload;
  };
}

/** Response body from Flask POST /api/auth/refresh */
export interface FlaskRefreshResponse {
  data: {
    token: string;
    refresh_token: string;
  };
}

/**
 * User object returned by Flask serialize_auth_user() in jwt_routes.py.
 * Fields marked optional are not yet included in backend response (documented gaps).
 */
export interface FlaskUserPayload {
  id: number;
  email: string;
  org_id: number;
  /** Array of role name strings, e.g. ["admin"]. Primary role is roles[0]. */
  roles: string[];
  name?: string;
  is_admin?: boolean;
  /** True only for the platform-wide super-admin — distinct from org-level is_admin. */
  is_system_admin?: boolean;
  is_manager?: boolean;
  permissions?: string[];
}

// ---------------------------------------------------------------------------
// Normalized cross-platform user shape
// ---------------------------------------------------------------------------

/**
 * Normalized user shape used across all platform clients.
 * Derived from FlaskUserPayload on login.
 * Stored in next-auth session on web; in SecureStore on mobile; in Keychain on desktop.
 */
export interface NormalizedAuthUser {
  id: number;
  email: string;
  /** Derived from user.name if present, otherwise email prefix. */
  username: string;
  /** Primary role string, e.g. "admin", "technician". Derived from roles[0]. */
  role: string;
  /**
   * Permission codenames, e.g. ["billing.view"].
   * Currently always empty — backend does not return permissions in JWT yet (Q14).
   */
  permissions: string[];
  org_id: number;
  /** True if user has admin bypass (matches Flask User.is_admin). */
  is_admin: boolean;
  /** True only for the platform-wide super-admin (matches Flask User.is_system_admin). */
  is_system_admin: boolean;
}
