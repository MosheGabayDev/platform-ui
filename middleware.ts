/**
 * @module middleware
 * Edge middleware: gates the (dashboard) route group behind a valid next-auth JWT.
 * Unauthenticated requests redirect to /login with the original path as callbackUrl.
 *
 * Public routes: /login, /signup, /reset-password, /api/auth/*, static assets.
 * Everything else under app/ requires a session.
 */

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Token present + non-expired refresh — let request through.
    if (req.nextauth.token?.error === "RefreshTokenError") {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("callbackUrl", req.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

/**
 * Matcher: protect everything EXCEPT
 *   - /login, /signup, /reset-password   (public auth pages)
 *   - /api/auth/*                        (next-auth handlers)
 *   - /api/proxy/*                       (proxy handles auth at edge of each call)
 *   - /_next/*, /favicon.ico, /icons/*, /manifest.json, /robots.txt  (static assets)
 */
export const config = {
  matcher: [
    "/((?!login|signup|reset-password|api/auth|api/proxy|_next/static|_next/image|favicon.ico|icons|manifest.json|robots.txt).*)",
  ],
};
