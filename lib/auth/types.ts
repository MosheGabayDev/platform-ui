/**
 * @module lib/auth/types
 * NextAuth module augmentation for platform-ui web.
 *
 * @platform web — this file imports next-auth; do NOT import in React Native or Electron
 *
 * Pure user types (NormalizedAuthUser, FlaskUserPayload, etc.) live in:
 *   lib/platform/auth/types.ts  ← import from here on non-web platforms
 *
 * This file re-exports those types for web consumers that already import from here,
 * and adds the NextAuth-specific Session/JWT augmentation on top.
 */

// Re-export cross-platform types so existing web imports keep working
export type {
  FlaskLoginResponse,
  FlaskRefreshResponse,
  FlaskUserPayload,
  NormalizedAuthUser,
} from "@/lib/platform/auth/types";

import type { NormalizedAuthUser } from "@/lib/platform/auth/types";
import "next-auth";
import "next-auth/jwt";

// ---------------------------------------------------------------------------
// NextAuth module augmentation (web-only)
// ---------------------------------------------------------------------------

declare module "next-auth" {
  /**
   * Client-visible session shape. refreshToken is intentionally excluded.
   * Set session.error = "RefreshTokenError" when refresh fails.
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
   * Passed to the jwt() callback as `user` on first sign-in.
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
