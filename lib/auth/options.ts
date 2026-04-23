/**
 * @module lib/auth/options
 * Owns NextAuth v4 configuration for platform-ui.
 * Depends on: Flask JWT endpoints POST /api/auth/login, POST /api/auth/refresh.
 * Does not own: UI login rendering, RBAC page policies, Flask session management.
 *
 * Session strategy: JWT (no database). next-auth stores the session in an
 * encrypted HttpOnly cookie (next-auth.session-token, SameSite=Lax).
 * The Flask refresh token is stored only inside the server-side JWT — it is
 * never serialized into session.user where client components can read it.
 */

import type { NextAuthOptions, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import type {
  FlaskLoginResponse,
  FlaskRefreshResponse,
  FlaskUserPayload,
  NormalizedAuthUser,
} from "./types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FLASK_URL = process.env.FLASK_API_URL ?? "http://localhost:5000";

/** Matches Flask jwt_auth.py JWT_ACCESS_EXPIRY = timedelta(minutes=15). */
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

/** Refresh 60s before expiry to avoid mid-request token invalidity. */
const REFRESH_BUFFER_SECONDS = 60;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Converts the raw Flask user payload to the normalized shape stored in session.
 * Derives role from roles[0] (Flask RBAC uses a single active role per user).
 * Round 009 fix: is_admin and permissions[] are now real values from serialize_auth_user().
 */
function normalizeFlaskUser(user: FlaskUserPayload): NormalizedAuthUser {
  const roles = Array.isArray(user.roles) ? user.roles : [];
  const primaryRole = roles[0] ?? "user";
  return {
    id: user.id,
    email: user.email,
    username: user.name ?? user.email.split("@")[0],
    role: primaryRole,
    permissions: user.permissions ?? [],
    org_id: user.org_id,
    // is_admin is now a real boolean from Flask User.is_admin column (Round 009).
    is_admin: user.is_admin ?? false,
  };
}

/**
 * Calls Flask POST /api/auth/login with email + password.
 * Returns a next-auth User object on success, or null on failure.
 * Normalizes all error paths to null to avoid leaking Flask error details to client.
 */
async function authorizeWithFlask(
  email: string,
  password: string
): Promise<User | null> {
  let res: Response;

  try {
    res = await fetch(`${FLASK_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    // Network error or timeout — do not expose to client
    return null;
  }

  if (!res.ok) return null;

  let json: FlaskLoginResponse | { error?: string };
  try {
    json = await res.json();
  } catch {
    return null;
  }

  // Type-narrow to FlaskLoginResponse
  if (!("data" in json) || !json.data?.token) return null;

  const { token, refresh_token, user } = json.data;

  return {
    id: String(user.id),
    email: user.email,
    name: user.name,
    // Extra fields carried through the jwt() callback:
    accessToken: token,
    refreshToken: refresh_token,
    expiresAt: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL_SECONDS,
    normalizedUser: normalizeFlaskUser(user),
  };
}

/**
 * Refreshes the Flask access token using the stored refresh token.
 * Called transparently in the jwt() callback when accessToken is near expiry.
 * On any failure, returns the existing token with error="RefreshTokenError".
 * The middleware treats "RefreshTokenError" as unauthenticated and redirects to /login.
 */
async function refreshAccessToken(staleToken: JWT): Promise<JWT> {
  try {
    const res = await fetch(`${FLASK_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: staleToken.refreshToken }),
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) throw new Error(`refresh HTTP ${res.status}`);

    const json: FlaskRefreshResponse | { error?: string } = await res.json();

    if (!("data" in json) || !json.data?.token) {
      throw new Error("empty refresh response");
    }

    return {
      ...staleToken,
      accessToken: json.data.token,
      // Flask returns a new refresh token (rotation). Fall back to old one if absent.
      refreshToken: json.data.refresh_token ?? staleToken.refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL_SECONDS,
      error: undefined,
    };
  } catch {
    // Refresh failed (token revoked, network error, etc.)
    // Return with error flag — middleware will redirect to /login.
    return { ...staleToken, error: "RefreshTokenError" };
  }
}

// ---------------------------------------------------------------------------
// NextAuth options
// ---------------------------------------------------------------------------

export const authOptions: NextAuthOptions = {
  // JWT strategy: session stored in encrypted cookie, no database needed.
  // maxAge: 8h matches a typical workday; users are re-prompted after idle overnight.
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },

  pages: {
    signIn: "/login",
  },

  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Platform Engineer",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        return authorizeWithFlask(credentials.email, credentials.password);
      },
    }),
  ],

  callbacks: {
    /**
     * jwt() is called on every getToken() / getServerSession() call.
     * On first sign-in: merges Flask auth data from the User object.
     * On subsequent calls: refreshes token if within REFRESH_BUFFER_SECONDS of expiry.
     */
    async jwt({ token, user }) {
      // First sign-in: user is present, merge Flask auth data into JWT.
      if (user) {
        return {
          ...token,
          accessToken: user.accessToken,
          // refreshToken lives only in the JWT (server-side cookie) — never in session.user.
          refreshToken: user.refreshToken,
          expiresAt: user.expiresAt,
          user: user.normalizedUser,
        };
      }

      // Subsequent calls: return existing token if still valid.
      if (
        Date.now() <
        (token.expiresAt as number) * 1000 - REFRESH_BUFFER_SECONDS * 1000
      ) {
        return token;
      }

      // Access token is expiring — refresh transparently.
      return refreshAccessToken(token);
    },

    /**
     * session() shapes the client-visible session from the server-side JWT.
     * refreshToken is intentionally excluded here.
     */
    async session({ session, token }) {
      session.user = token.user;
      session.accessToken = token.accessToken;
      session.expiresAt = token.expiresAt;
      // Propagate refresh errors so client can handle forced re-login gracefully.
      if (token.error) session.error = token.error;
      return session;
    },
  },
};
