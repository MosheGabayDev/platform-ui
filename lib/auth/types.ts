/**
 * @module lib/auth/types
 * Owns all TypeScript types for authentication in platform-ui.
 * Augments next-auth Session and JWT to carry Flask auth data.
 * Does not own auth logic, RBAC policies, or UI rendering.
 *
 * Backend contract: Flask POST /api/auth/login → {data: {token, refresh_token, user}}
 * Known gap (Q14): _user_to_dict() does not include permissions[] — only roles[].
 *   When backend adds permissions, update FlaskUserPayload and remove the empty-array override in options.ts.
 */

import "next-auth";
import "next-auth/jwt";

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
 * User object returned by Flask _user_to_dict() in jwt_routes.py.
 * Fields marked optional are not yet included in the backend response (documented gaps).
 */
export interface FlaskUserPayload {
  id: number;
  email: string;
  org_id: number;
  /** Array of role name strings, e.g. ["admin"]. Primary role is roles[0]. */
  roles: string[];
  name?: string;
  /** Not returned yet — backend gap tracked in Q15 (SESSION_COOKIE_SECURE) */
  is_admin?: boolean;
  /** Not returned yet — backend gap tracked in Q14 */
  permissions?: string[];
}

// ---------------------------------------------------------------------------
// Normalized app-level user shape
// ---------------------------------------------------------------------------

/**
 * Normalized user shape stored in next-auth session.
 * Derived from FlaskUserPayload on every login via normalizeFlaskUser() in options.ts.
 */
export interface NormalizedAuthUser {
  id: number;
  email: string;
  /** Derived from user.name if present, otherwise email prefix */
  username: string;
  /** Primary role string, e.g. "admin", "technician". Derived from roles[0]. */
  role: string;
  /**
   * Permission codenames, e.g. ["billing.view"].
   * Currently always empty — backend does not return permissions in JWT response yet (Q14).
   * Use role-based checks via hasRole() for now.
   */
  permissions: string[];
  org_id: number;
  /**
   * True if user has admin bypass (matches Flask User.is_admin).
   * Currently derived from role name until backend returns this field explicitly.
   */
  is_admin: boolean;
}

// ---------------------------------------------------------------------------
// next-auth module augmentation
// ---------------------------------------------------------------------------

declare module "next-auth" {
  /**
   * Client-visible session shape. refreshToken is intentionally excluded.
   * Set session.error = "RefreshTokenError" when refresh fails — middleware redirects to login.
   */
  interface Session {
    user: NormalizedAuthUser;
    /** Short-lived Flask JWT access token. Proxy adds this as Authorization: Bearer. */
    accessToken: string;
    /** Unix timestamp (seconds) when accessToken expires. */
    expiresAt: number;
    /** Set when token refresh fails. Middleware treats this as unauthenticated. */
    error?: string;
  }

  /**
   * Augments the User object returned by CredentialsProvider.authorize().
   * This object is passed to the jwt() callback as `user` on first sign-in.
   */
  interface User {
    accessToken: string;
    /** Server-side only. Stored in JWT cookie, never exposed in session.user. */
    refreshToken: string;
    /** Unix timestamp (seconds) for access token expiry. */
    expiresAt: number;
    normalizedUser: NormalizedAuthUser;
  }
}

declare module "next-auth/jwt" {
  /** Server-side JWT payload (stored encrypted in next-auth session cookie). */
  interface JWT {
    accessToken: string;
    /** Kept server-side. NEVER copy this field into the session callback return value. */
    refreshToken: string;
    expiresAt: number;
    user: NormalizedAuthUser;
    error?: string;
  }
}
