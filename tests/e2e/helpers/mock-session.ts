/**
 * Mock NextAuth session helper for E2E demos.
 *
 * Mints a NextAuth-compatible JWE session cookie using NEXTAUTH_SECRET,
 * bypassing Flask /api/auth/login. Use ONLY when Flask backend is unavailable
 * (mock-mode demo). Tests that depend on real RBAC must use helpers/auth.ts login().
 */
import { encode } from "next-auth/jwt";
import type { BrowserContext } from "@playwright/test";

const COOKIE_NAME = "next-auth.session-token";
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

export async function injectMockSession(
  context: BrowserContext,
  baseURL = "http://localhost:3001"
): Promise<void> {
  const secret = process.env.NEXTAUTH_SECRET ?? "dev-secret-local-only-not-for-prod";
  const expiresAt = Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL_SECONDS;

  const token = await encode({
    secret,
    token: {
      accessToken: "mock-access-token",
      refreshToken: "mock-refresh-token",
      expiresAt,
      user: {
        id: 1,
        email: "demo@platform-ui.local",
        username: "demo",
        role: "admin",
        permissions: ["*"],
        org_id: 1,
        is_admin: true,
        is_system_admin: true,
      },
    },
  });

  const url = new URL(baseURL);
  await context.addCookies([
    {
      name: COOKIE_NAME,
      value: token,
      domain: url.hostname,
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      expires: expiresAt,
    },
  ]);
}
