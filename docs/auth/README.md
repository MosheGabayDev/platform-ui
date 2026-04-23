# Authentication — platform-ui

_Last updated: 2026-04-24 (Round 006)_

---

## Overview

platform-ui uses **next-auth v4 Credentials provider** connecting to Flask's existing JWT auth endpoint (`POST /api/auth/login`). All Next.js → Flask communication uses `Authorization: Bearer <accessToken>` forwarded by the server-side proxy.

The design document and ADRs are in `docs/system-upgrade/16-auth-bridge-design.md` (design) and `docs/system-upgrade/14-decision-log.md` (ADR-011, ADR-012).

---

## File Map

| File | Responsibility |
|------|---------------|
| `lib/auth/types.ts` | TypeScript types: FlaskLoginResponse, NormalizedAuthUser, Session/JWT augmentation |
| `lib/auth/options.ts` | NextAuth configuration: Credentials provider, jwt() callback, session() callback |
| `lib/auth/rbac.ts` | Pure RBAC helpers: hasRole, hasPermission, getOrgId |
| `app/api/auth/[...nextauth]/route.ts` | NextAuth handler (thin — no logic) |
| `components/providers/session-provider.tsx` | Client wrapper for SessionProvider |
| `middleware.ts` | Route protection: redirect to /login or 401 |
| `app/api/proxy/[...path]/route.ts` | Flask proxy: attaches Bearer token |
| `app/(auth)/login/page.tsx` | Login UI: calls signIn("credentials") |

---

## Login Flow

```
Browser (login page)
  │
  ├─ User submits email + password
  │
  ▼
signIn("credentials", { email, password, redirect: false })
  │
  ▼
POST /api/auth/[...nextauth]          (NextAuth handler)
  │   calls authOptions.authorize()
  │
  ▼
POST /api/auth/login → Flask          (server-to-server — no CORS issue)
  │   body: { email, password }
  │
  ▼
Flask returns:
  { data: { token, refresh_token, user: { id, email, org_id, roles } } }
  │
  ▼
authOptions.jwt() callback            (first call: user is present)
  → stores { accessToken, refreshToken, expiresAt, user } in JWT
  → refreshToken is in the JWT only — never in session.user
  │
  ▼
Set-Cookie: next-auth.session-token   (HttpOnly, SameSite=Lax)
  │
  ▼
Browser receives session
  → useSession() returns { user: { id, email, role, org_id }, accessToken }
  → router.push("/") → dashboard
```

---

## Token Refresh Flow

```
Every getToken() call (on request to any protected route):
  │
  ├─ if Date.now() < expiresAt * 1000 - 60s → return existing token
  │
  └─ else: refresh
       │
       ▼
     POST /api/auth/refresh → Flask
       body: { refresh_token }
       │
       ├─ success → new { token, refresh_token } → update JWT
       │
       └─ failure → token.error = "RefreshTokenError"
                     → middleware redirects to /login
```

---

## Route Guard Rules

| Path pattern | Unauthenticated behavior |
|---|---|
| `/api/auth/*` | Always allowed (NextAuth internals) |
| `/_next/*`, `/favicon.ico`, `/manifest.json` | Always allowed (static) |
| `/login`, `/reset-password` | Allowed; authenticated user → redirect to `/` |
| `/api/proxy/*` | Return `401 { error: "Unauthorized" }` JSON |
| Everything else | Redirect to `/login?callbackUrl=<original-path>` |

---

## Session Shape (Client-Visible)

```ts
session = {
  user: {
    id: number,          // Flask User.id
    email: string,
    username: string,    // name from Flask, or email prefix
    role: string,        // "admin" | "manager" | "technician" | "user"
    permissions: string[], // Currently always [] — backend gap Q14
    org_id: number,      // Multi-tenancy key — use getOrgId(session) everywhere
    is_admin: boolean,   // Derived from role for now
  },
  accessToken: string,   // Short-lived Flask JWT — proxy attaches as Bearer
  expiresAt: number,     // Unix timestamp (seconds)
  error?: string,        // "RefreshTokenError" when refresh fails
}
```

**refreshToken is NOT in the session** — it lives only inside the encrypted next-auth session cookie (server-side).

---

## RBAC Usage

```ts
// Server Component
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { hasRole, getOrgId } from "@/lib/auth/rbac";

const session = await getServerSession(authOptions);
if (!hasRole(session, "admin", "manager")) redirect("/unauthorized");
const orgId = getOrgId(session); // use for DB queries

// Client Component
import { useSession } from "next-auth/react";
import { hasRole } from "@/lib/auth/rbac";

const { data: session } = useSession();
if (!hasRole(session, "admin")) return null; // hide UI element
```

---

## Proxy Auth Behavior

Every request to `/api/proxy/*` automatically includes:

```
Authorization: Bearer <accessToken>
```

The `accessToken` comes from `getToken({ req })` server-side. Flask's `@jwt_required` decorator validates it. If the token is expired and refresh failed, the proxy returns 401 before calling Flask.

**Never call Flask directly from client code** — all Flask calls must go through `/api/proxy/*`.

---

## Current Backend Gaps

| Gap | Tracking | Impact |
|-----|----------|--------|
| `permissions[]` missing from JWT response | Q14 in `13-open-questions.md` | RBAC works by role only for now |
| `POST /api/auth/logout` does not exist | Phase B task in `15-action-backlog.md` | Logout only clears next-auth cookie; Flask refresh token not revoked |
| `GET /api/auth/me` does not exist | Phase B task | No server-side session validation endpoint |
| `localhost:3000` not in Flask CORS | Phase B task | Direct browser→Flask calls would fail (proxy avoids this) |
| `SESSION_COOKIE_SECURE` not set in prod | Q15, Phase C task | Security gap in Flask session cookies |

---

## How Future Agents Should Modify Auth

1. **Adding a new field to session**: Update `FlaskUserPayload` in `lib/auth/types.ts` → update `normalizeFlaskUser()` in `lib/auth/options.ts` → update `NormalizedAuthUser` interface.

2. **Adding a new role**: Update `hasRole()` callers. No central list to update — roles are strings from Flask RBAC.

3. **Adding permissions support** (when Q14 is fixed): Remove the empty-array override in `normalizeFlaskUser()` and populate from `user.permissions`.

4. **Changing Flask auth endpoint URL**: Update `FLASK_URL` usage in `lib/auth/options.ts` only.

5. **Migrating to next-auth v5**: `lib/auth/options.ts` is the only file that changes structurally. Types in `lib/auth/types.ts` and helpers in `lib/auth/rbac.ts` are largely compatible.

6. **Adding OAuth provider** (GitHub/Google): Add to `providers` array in `lib/auth/options.ts`. The session shape and RBAC remain unchanged.

---

## Manual Verification Checklist

Until E2E tests exist (`e2e/auth.spec.ts` — Phase C backlog):

- [ ] Open `/` in a fresh browser → redirects to `/login`
- [ ] Submit wrong credentials → Hebrew error message appears, no crash
- [ ] Submit correct credentials → redirects to `/`, session shows in React DevTools
- [ ] `useSession()` returns `{user: {id, email, role, org_id}}`
- [ ] Dashboard stats load (proxy sends Bearer token, Flask accepts)
- [ ] Copy `/` URL, open incognito → redirects to `/login?callbackUrl=/`
- [ ] Log in → redirects to `/` (callbackUrl honored)
- [ ] `/api/proxy/ai-settings/stats` in browser (unauthenticated) → `{"error":"Unauthorized"}` with 401
