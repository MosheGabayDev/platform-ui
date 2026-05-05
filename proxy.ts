/**
 * @module proxy
 * Next.js proxy for platform-ui route protection. Replaces the deprecated
 * `middleware.ts` convention as of Next.js 16 (renamed 2026-05-05).
 * Protects all routes except auth pages and static assets.
 *
 * Rules:
 *   - /api/proxy/* without token → 401 JSON (not redirect, for API callers)
 *   - Dashboard pages without token → redirect to /login with callbackUrl
 *   - /login with valid token → redirect to / (already logged in)
 *   - /api/auth/* → always pass through (NextAuth internal routes)
 *   - RefreshTokenError in JWT → treat as unauthenticated
 */

import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/reset-password"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow: NextAuth internals, Next.js build assets, static files
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname === "/manifest.json" ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Treat refresh error same as no token — force re-login
  const isAuthenticated = !!token && token.error !== "RefreshTokenError";

  // Unauthenticated API proxy call → 401 (don't redirect API callers to HTML login page)
  if (pathname.startsWith("/api/proxy") && !isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Unauthenticated page request → redirect to /login
  if (!isAuthenticated && !PUBLIC_PATHS.includes(pathname)) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user visiting /login → send to dashboard
  if (isAuthenticated && PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except Next.js internals and static files.
     * This regex excludes: /_next/*, /favicon.ico
     */
    "/((?!_next/static|_next/image|favicon\\.ico).*)",
  ],
};
