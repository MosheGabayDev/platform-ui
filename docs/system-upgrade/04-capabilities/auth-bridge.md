# 16 — Authentication Bridge Design

_Round 005 — 2026-04-24_
_Evidence-based: all claims verified against source files_

---

## 1. Current Backend Auth Map

### Login endpoints

| Endpoint | Method | Contract | Auth model | Returns |
|----------|--------|----------|------------|---------|
| `POST /login` | HTML form + JSON | `{username\|email, password}` | Flask-Login session | JSON `{success, user: {id,username,email,role,org_id}}` + `Set-Cookie: session=...` |
| `POST /api/auth/login` | JSON only | `{email, password}` | JWT | `{data: {token, refresh_token, user: {id,email,org_id,roles}}}` |
| `POST /api/auth/refresh` | JSON | `{refresh_token}` | JWT | New `{token, refresh_token}` |
| `GET /logout` | — | — | Flask-Login | Redirect to `/login` (HTML only, no JSON) |
| `GET /api/auth/verify` | — | — | Flask session | 200/401/403 (for Apache proxy only) |

**Key finding:** Two fully separate auth systems coexist:
- **Flask-Login** (`flask_login.login_user()`) — server-side session cookie, used by browser/Jinja2
- **JWT** (`apps/authentication/jwt_auth.py`) — 15-min HS256 access token + 7-day opaque refresh token, used by mobile app

Both return `org_id`. The JWT endpoint (`/api/auth/login`) is the cleaner contract for platform-ui because it was designed for JSON clients and has no CSRF requirement.

### User / org_id resolution

```python
# Flask-Login: session-based
current_user.id, current_user.org_id, current_user.role.name

# JWT: from token payload (jwt_auth.py:29-37)
payload = { 'user_id': user.id, 'org_id': user.org_id, 'email': user.email }

# jwt_required decorator falls back to Flask-Login session for web clients (jwt_auth.py:86-93)
if current_user and current_user.is_authenticated:
    g.jwt_user = current_user
    g.jwt_payload = {'user_id': current_user.id, 'org_id': current_user.org_id}
```

### Role / permission model

```
User.role_id → Role.name (e.g. "admin", "manager", "technician")
Role.permissions → Permission.name (e.g. "billing.view", "admin")

Special booleans on User:
  is_admin (bool)          — bypasses all RBAC checks
  is_system_admin (bool)   — system-wide admin, receives approval notifications
  is_manager (bool)        — infra request approvals
  is_ai_agent (bool)       — service-account flag, no password
  auto_approve_commands (bool) — bypass helpdesk approval gate

RBAC decorators (apps/authentication/rbac.py):
  @role_required("admin", "manager")   — OR logic; admins bypass
  @permission_required("billing.view") — admins bypass
```

### CSRF status

- `flask_wtf.csrf.CSRFProtect` installed (`apps/__init__.py:31`)
- **Auto-check disabled**: `WTF_CSRF_CHECK_DEFAULT = False` (`apps/__init__.py:59`)
- JSON requests (`request.is_json`) skip CSRF check in login flow (`routes.py:336-340`)
- `X-CSRFToken` listed in allowed CORS headers but not enforced on API routes
- **Conclusion: CSRF is effectively off for all API calls. This is intentional (mobile + SPA clients).**

### Cookie security settings

- No `SESSION_COOKIE_SECURE`, `SESSION_COOKIE_SAMESITE`, `SESSION_COOKIE_HTTPONLY` explicitly set in app factory
- Flask defaults: `HttpOnly=True`, `Secure=False` (dev), `SameSite=None`
- **Production gap**: cookies not set `Secure=True` or `SameSite=Lax` — security risk on HTTPS

### CORS

- Configured for `localhost:*` only (Flutter dev origins)
- `platform-ui` origin (e.g. `http://localhost:3000`) is **not in the CORS allow-list**
- Direct browser→Flask calls will fail with CORS errors from platform-ui
- **Mitigation already in place: Next.js proxy is server-to-server, so CORS does not apply**

### SAML / OAuth

- `saml_routes.py` exists — SAML SSO implementation present
- `oauth.py` with Flask-Dance — GitHub and Google OAuth configured
- Status of production enablement: unknown (requires `.env` check)

---

## 2. Current Frontend Auth Map

| Item | Status | File |
|------|--------|------|
| Login form | Stub — `handleSubmit` only `await sleep(1000)`, no real API call | `app/(auth)/login/page.tsx:17` |
| next-auth | **Installed** (`^4.24.14`) but **not configured** — no `auth.ts`, no `[...nextauth]` route, no `SessionProvider` | `package.json:21` |
| Next.js middleware | **Does not exist** — no `middleware.ts` in project root | — |
| Dashboard route guards | **None** — all `(dashboard)` routes are publicly accessible | — |
| Proxy cookie forwarding | Forwards `Cookie` header from browser — but since no session exists, this is a no-op | `app/api/proxy/[...path]/route.ts:36` |
| Role-aware nav | None — all 19 nav items shown to all visitors | `components/shell/nav-items.ts` |
| Org context in session | None | — |

**Conclusion: platform-ui has zero working authentication. The login page is a UI shell.**

---

## 3. Auth Bridge Options Considered

### Option A: Flask session cookie proxy (pure session forwarding)
- User logs in via platform-ui → Next.js server action calls `POST /login` → Flask sets session cookie in response → Next.js stores cookie and forwards on every proxy call
- **Pros**: Reuses existing Flask session exactly
- **Cons**: Cookie domain/SameSite complexity, Flask session secret must be shared or proxy must relay cookie, difficult to extract user data (role, org_id) from opaque session cookie without a `/me` endpoint, session expiry management complex

### Option B: next-auth Credentials + Flask session cookie (hybrid)
- next-auth Credentials provider calls `POST /login` → extracts user JSON from Flask response + relays Set-Cookie → next-auth stores user data in its own JWT + browser also holds Flask cookie
- **Pros**: User data available in next-auth session
- **Cons**: Two parallel cookie systems, fragile if Flask session expires independently

### Option C: next-auth Credentials + Flask JWT (recommended ✅)
- next-auth Credentials provider calls `POST /api/auth/login` → gets `{token, refresh_token, user}` → stores in next-auth JWT session
- Proxy attaches `Authorization: Bearer <accessToken>` on every upstream call
- next-auth JWT callback handles token refresh (calls `POST /api/auth/refresh`)
- **Pros**: Clean separation, JWT already designed for JSON clients, user data (role, org_id, permissions) in session, no CORS issue (server-to-server), single logout path, works for mobile too
- **Cons**: Need to expose `refreshToken` in next-auth session; JWT_SECRET_KEY must be managed

### Option D: Auth.js v5 (next-auth v5 beta)
- More modern API, built-in edge runtime support
- **Not recommended** — breaking API changes from v4, still in beta, `package.json` already has v4

---

## 4. Recommended Target Auth Design

**Chosen: Option C — next-auth Credentials + Flask JWT**

```
Browser
  │
  ├─ POST /api/auth/login  (next-auth sign-in)
  │     ↓
  │   Next.js server action (authorize callback)
  │     ↓
  │   POST /api/auth/login → Flask  (server-to-server)
  │     ↓
  │   { token, refresh_token, user: {id, email, org_id, roles} }
  │     ↓
  │   next-auth JWT: { accessToken, refreshToken, expiresAt, user }
  │     ↓
  │   Set-Cookie: next-auth.session-token (HttpOnly, Secure, SameSite=Lax)
  │
  ├─ Every API call via proxy
  │     ↓
  │   getServerSession() → extract accessToken
  │     ↓
  │   proxy adds: Authorization: Bearer <accessToken>
  │     ↓
  │   Flask → jwt_required → g.jwt_user
  │
  └─ Token refresh (every request if expiresAt < now + 60s)
        ↓
      POST /api/auth/refresh → Flask
        ↓
      New accessToken stored in next-auth JWT (rotation)
```

---

## 5. Browser Session Strategy

- **next-auth v4** configured with `session: { strategy: "jwt" }` (no DB required)
- Cookie: `next-auth.session-token`, HttpOnly, Secure in production, `SameSite=Lax`
- Session shape (see §9 for full type):
  ```ts
  { user: { id, email, username, role, permissions, org_id }, accessToken, expiresAt }
  ```
- Session lifetime: 8 hours (matches typical workday); configurable via `NEXTAUTH_SESSION_MAXAGE`
- Auto-refresh: JWT callback checks `expiresAt` on every `getToken()` — if within 60s of expiry, calls `/api/auth/refresh` transparently

---

## 6. API / JWT Strategy

**New proxy behavior** (modify `app/api/proxy/[...path]/route.ts`):

```ts
// Current (broken — no real auth):
headers: { Cookie: cookie }

// Target:
import { getToken } from "next-auth/jwt";
const token = await getToken({ req });
headers: {
  ...(token?.accessToken ? { Authorization: `Bearer ${token.accessToken}` } : {}),
}
```

Flask endpoint must have `@jwt_required` (or the dual fallback already in `jwt_auth.py`).

**New Next.js API routes needed:**
- `app/api/auth/[...nextauth]/route.ts` — next-auth handler (create)
- `app/api/auth/logout/route.ts` — call Flask `/logout` equivalent + next-auth `signOut` (create)

**Flask changes needed (minimal):**
- Add `GET /api/auth/me` endpoint — returns current user from JWT (for session validation)
- Add `POST /api/auth/logout` JSON endpoint — invalidates refresh token in DB
- Add `platform-ui` origin to CORS allow-list in `apps/__init__.py`

---

## 7. Mobile Auth Strategy

No change to mobile app. Mobile app continues using `POST /api/auth/login` directly, stores JWT locally, uses `Authorization: Bearer` header. The JWT infrastructure is shared — same endpoint, same token format.

---

## 8. Tenant / Org Propagation Strategy

`org_id` flows through the entire system:

```
/api/auth/login response: user.org_id
  → next-auth session: session.user.org_id
  → JWT token payload: jwt.org_id
  → Every proxy call: Flask receives org_id via JWT payload (g.jwt_payload['org_id'])
  → Every DB query: scoped by org_id (existing Flask convention)
```

**Platform-ui usage** — make `org_id` available everywhere:
```ts
// In any server component:
const session = await getServerSession(authOptions);
const orgId = session?.user?.org_id;

// In any client component:
const { data: session } = useSession();
const orgId = session?.user?.org_id;
```

Never read `org_id` from request body (per CLAUDE.md security rules).

---

## 9. RBAC / Permission Propagation Strategy

**Session type** (`lib/auth/types.ts`):
```ts
declare module "next-auth" {
  interface Session {
    user: {
      id: number;
      email: string;
      username: string;
      role: string;           // e.g. "admin", "technician"
      permissions: string[];  // e.g. ["billing.view", "admin"]
      org_id: number;
      is_admin: boolean;
    };
    accessToken: string;
    expiresAt: number;
  }
}
```

**Fetch permissions at login** — add to `authorize` callback:
```ts
// Call GET /api/users/me/permissions to get permission list
// Or derive from role name (simpler, start here)
```

**Client-side RBAC helper** (`lib/auth/rbac.ts`):
```ts
export function hasRole(session: Session, ...roles: string[]): boolean {
  if (session.user.is_admin) return true;
  return roles.includes(session.user.role);
}

export function hasPermission(session: Session, permission: string): boolean {
  if (session.user.is_admin) return true;
  return session.user.permissions.includes(permission);
}
```

**Server component usage:**
```tsx
const session = await getServerSession(authOptions);
if (!hasRole(session, "admin", "manager")) redirect("/unauthorized");
```

---

## 10. Route Guard Strategy

Three layers — implement in order:

### Layer 1: Next.js middleware (highest priority, ship first)

```ts
// middleware.ts (project root)
export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/(dashboard)/:path*",
    "/api/proxy/:path*",
  ],
};
```

This redirects unauthenticated users to `/login` for `(dashboard)` routes and returns 401 for proxy calls.

### Layer 2: Server Component auth check (role-aware)

```tsx
// app/(dashboard)/layout.tsx
const session = await getServerSession(authOptions);
if (!session) redirect("/login");
// role-specific pages:
if (!hasRole(session, "admin")) redirect("/unauthorized");
```

### Layer 3: Client-side nav filtering (UX polish, not security)

```tsx
// components/shell/nav-items.ts — add requiredRole?: string to NavItem
// components/shell/app-sidebar.tsx — filter items based on session.user.role
const { data: session } = useSession();
const visibleItems = group.items.filter(item =>
  !item.requiredRole || hasRole(session, item.requiredRole)
);
```

---

## 11. CSRF Strategy

Flask CSRF auto-check is disabled (`WTF_CSRF_CHECK_DEFAULT = False`). All API calls are JSON.

**For platform-ui:** No CSRF token needed.
- All state-changing calls are `POST /api/proxy/*` with `Content-Type: application/json`
- JWT Bearer token in `Authorization` header provides the same protection as CSRF tokens for non-cookie auth
- next-auth session cookie is HttpOnly + SameSite=Lax — sufficient protection against CSRF

**No action required on CSRF** for the MVP auth implementation.

---

## 12. Logout / Session Expiry Strategy

1. **Client-initiated logout**: `signOut()` from next-auth → calls `app/api/auth/logout/route.ts` → calls Flask `POST /api/auth/logout` (to-be-created) to invalidate refresh token in DB → clears next-auth cookie
2. **Session expiry**: next-auth JWT `maxAge` = 8h → automatic expiry; middleware catches expired tokens and redirects to `/login`
3. **Token refresh failure**: if `POST /api/auth/refresh` returns 401 (e.g. refresh token revoked) → JWT callback returns error → middleware redirects to `/login`
4. **Flask `/logout` endpoint gap**: current `GET /logout` returns HTML redirect. Need `POST /api/auth/logout` that invalidates `mobile_refresh_token` on User record.

---

## 13. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Flask login JSON response shape changes | Low | High | Pin response parsing to specific fields; add integration test |
| JWT 15-min expiry causes mid-session UX disruption | Medium | Medium | Implement refresh in JWT callback before expiry; show no visible disruption |
| `next-auth` v4 → v5 migration later | High (planned) | Medium | Isolate auth config in `lib/auth/options.ts`; next-auth v5 is backwards-compatible for Credentials |
| `NEXTAUTH_SECRET` not set in production | Medium | Critical | Add to K8s `platform-secrets` + document in deployment/CLAUDE.md |
| CORS: Flask returns 401 from proxy server-to-server | Low | High | Server-to-server calls bypass CORS; add `platform-ui` origin to Flask CORS for browser fallback |
| MFA mid-session: `/login` returns 302 to `/two-factor-login` instead of JSON | Medium | High | Detect `requires_mfa` in authorize callback; block login with `CredentialsSignin` error until MFA handled |
| is_ai_agent accounts attempting platform-ui login | Low | Low | `check_password()` short-circuits for AI agents; will return 401 naturally |
| Refresh token stored as SHA256 hash — collision risk | Very Low | Low | 64-byte random secret → 2^512 space; no practical risk |

---

## 14. Implementation Steps

### Phase A — Minimum viable auth (unblocks module development)

1. **Create `app/api/auth/[...nextauth]/route.ts`** — next-auth handler with Credentials provider calling `POST /api/auth/login`
2. **Create `lib/auth/options.ts`** — `authOptions` with JWT strategy, session shape, JWT callback for token refresh
3. **Create `lib/auth/types.ts`** — next-auth module augmentation (Session + JWT interfaces)
4. **Wire `SessionProvider`** in `app/layout.tsx`
5. **Update `app/(auth)/login/page.tsx`** — call `signIn("credentials", {...})` from next-auth
6. **Create `middleware.ts`** — protect `(dashboard)/*` routes
7. **Update proxy** — add `Authorization: Bearer <token>` from `getToken()`
8. **Add `NEXTAUTH_SECRET` + `NEXTAUTH_URL`** to `.env.local`

### Phase B — Flask additions

9. **Add `POST /api/auth/logout`** to Flask `jwt_routes.py` — clears `mobile_refresh_token` on User
10. **Add `GET /api/auth/me`** to Flask — returns current JWT user (validation endpoint)
11. **Add `http://localhost:3000` to Flask CORS** allow-list in `apps/__init__.py`

### Phase C — Production hardening

12. **Add `SESSION_COOKIE_SECURE=True`** and `SESSION_COOKIE_SAMESITE="Lax"` to Flask config for production
13. **Add `NEXTAUTH_SECRET`** to SSM Parameter Store + K8s `platform-secrets`
14. **Implement role-aware nav filtering** in `app-sidebar.tsx`
15. **Add auth integration test** — `e2e/auth.spec.ts` with Playwright

---

## 15. Acceptance Criteria

- [ ] `POST /login` with JSON credentials from platform-ui returns `{success: true, user: {...}}` in TEST environment
- [ ] `POST /api/auth/login` (JWT endpoint) returns token + user with org_id
- [ ] next-auth `authorize` callback successfully authenticates against Flask in TEST
- [ ] Browser receives `next-auth.session-token` cookie after login
- [ ] `useSession()` returns `{user: {id, email, role, org_id}}` in client components
- [ ] `(dashboard)` routes redirect to `/login` when unauthenticated
- [ ] `/api/proxy/*` calls return 401 when unauthenticated (no crash, no HTML redirect)
- [ ] Authenticated proxy calls include `Authorization: Bearer` header and Flask accepts them
- [ ] Token refresh works silently when access token expires
- [ ] Logout clears session and redirects to `/login`
- [ ] `org_id` is accessible in both server and client components from session
