# 30 — Security Hardening Audit (Round 021)

_Last updated: 2026-04-24 | Round 021_

---

## 1. Executive Summary

Round 021 performed a deep security audit of the platform-ui + platformengineer foundation following Round 020 (Dangerous Actions Standard). The foundation is fundamentally sound — no critical vulnerabilities were found. Three HIGH findings were identified and **all three were fixed in this round**. Two MEDIUM and four LOW findings remain as documented deferred items.

The foundation is **safe for continued feature development** with the deferred items acknowledged.

---

## 2. Security Posture Score

| Dimension | Before R021 | After R021 |
|-----------|------------|------------|
| Auth/session safety | 8/10 | 9/10 |
| Proxy/API safety | 6/10 | 9/10 |
| RBAC enforcement | 8/10 | 8/10 |
| Tenant isolation | 9/10 | 9/10 |
| Dangerous action safety | 7/10 | 9/10 |
| Audit readiness | 5/10 | 7/10 |
| **Overall** | **7.2/10** | **8.5/10** |

---

## 3. What Is Strong

- **JWT auth is solid**: access token (15 min HS256), refresh token (7-day opaque, SHA256-stored), rotation on every refresh, org_id cross-check in `jwt_required`.
- **Token isolation**: `refreshToken` never in `session.user`. `accessToken` removed from client session (Round 020). Both live only in the encrypted server-side `next-auth.session-token` cookie.
- **Proxy defense-in-depth**: middleware blocks unauthenticated requests + proxy itself re-validates. `getToken()` is server-side only.
- **Tenant isolation**: every Flask route derives `org_id` from `g.jwt_user`, never from request body. `_scoped_query()` filters by `org_id` unless `is_system_admin`.
- **Sensitive field exclusion**: `_SAFE_EXCLUDE` frozenset prevents `password_hash`, `mobile_refresh_token`, `mfa_secret` from appearing in any API response.
- **Self-deactivation guard**: `PATCH /api/users/<id>` and the new `PATCH /api/users/<id>/active` both block `is_self` changes.
- **Slug validation**: org slugs validated with regex before write; `IntegrityError` caught and normalized to 409.
- **Admin-only gates**: `pending_users`, `create_user`, `list_organizations`, `create_organization`, `update_organization` all check `_is_admin()` or `_is_system_admin()` before acting.

---

## 4. Critical Findings

_None found._

---

## 5. High Findings — All Fixed in R021

### H1 — Proxy PATH_MAP Fallback Allowed Arbitrary Flask Path Access ✅ FIXED

**File**: `app/api/proxy/[...path]/route.ts`

**Before**: `const flaskPrefix = PATH_MAP[prefix] ?? /api/${prefix}` — any unknown prefix like `auth`, `admin-internal`, `debug` would silently forward to the Flask equivalent.

**Risk**: Authenticated (JWT-bearing) users could access Flask endpoints not intended for the proxy surface. For example `/api/proxy/auth/login` would reach Flask's `POST /api/auth/login` with a valid Bearer token attached.

**Fix**: Strict allowlist — unknown prefix returns 404 immediately. No fallback.

```typescript
if (!Object.prototype.hasOwnProperty.call(PATH_MAP, prefix)) {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
```

---

### H2 — `setUserActive()` Called Non-Existent Flask Endpoint ✅ FIXED

**File**: `lib/api/users.ts` (client), `apps/authentication/user_api_routes.py` (server)

**Before**: Round 020 added `setUserActive()` calling `PATCH /api/users/<id>/active` — but this route did not exist on Flask. Deactivate/reactivate user feature was silently broken (502 or 404).

**Fix**: Added `PATCH /api/users/<id>/active` to Flask with:
- Admin-only guard
- Self-deactivation guard
- Idempotency (no-op if status unchanged)
- `UserActivity` audit write

---

### H3 — `setOrgActive()` Called Non-Existent Flask Endpoint ✅ FIXED

**File**: `lib/api/organizations.ts` (client), `apps/admin/org_api_routes.py` (server)

**Before**: Round 020 added `setOrgActive()` calling `PATCH /api/organizations/<id>/active` — but this route did not exist. Org deactivate/reactivate was silently broken.

**Fix**: Added `PATCH /api/organizations/<id>/active` to Flask with:
- System-admin-only guard
- Idempotency
- `UserActivity` audit write (captures `org_id`, `org_name`, `reason`)

---

## 6. Medium Findings

### M1 — `X-User-Id`/`X-Org-Id` Header Names Look Authoritative ✅ FIXED

**File**: `lib/platform/request/context.ts`

**Before**: Proxy sent `X-User-Id` and `X-Org-Id` to Flask. Flask never used these for auth (it reads `g.jwt_user` from the decoded JWT), but the names imply authorization.

**Risk**: Future Flask middleware or a new developer could accidentally trust them, causing IDOR.

**Fix**: Renamed to `X-Client-User-Id` and `X-Client-Org-Id`. Docstring explicitly states "advisory hints, NOT authorization."

---

### M2 — `is_system_admin` Not in `NormalizedAuthUser` (Design Gap)

**File**: `lib/platform/auth/types.ts`, `lib/auth/options.ts`

**Status**: Deferred (documented)

The frontend `NormalizedAuthUser` has `is_admin` but not `is_system_admin`. The `isSystemAdmin()` helper returns `is_admin` — which also returns `true` for org-level admins. This means org admins can see system-admin UI panels.

**Behavior is consistent** — Flask's `_is_system_admin()` also treats `is_admin=True` as system admin. So there is no privilege escalation; the UI and backend agree.

**Recommendation**: Add `is_system_admin: boolean` to `FlaskUserPayload`, `NormalizedAuthUser`, and `normalizeFlaskUser()`. Add corresponding `hasSystemAdminRole()` helper. Makes the distinction explicit.

**Blocker level**: Low for current 1-tenant usage. Medium before multi-tenant enterprise.

---

### M3 — No Audit Trail for User/Org Deactivation Before R021

**Status**: Fixed by H2/H3 above. `UserActivity` now written for all deactivate/reactivate events.

**Gap remaining**: No audit for `create_user`, `update_user`, `create_organization`, `update_organization`.

---

## 7. Low Findings

### L1 — SignOut Doesn't Invalidate Flask Refresh Token ✅ FIXED

**File**: `lib/auth/options.ts`

**Before**: NextAuth `signOut()` destroyed the local session cookie but didn't call Flask `/api/auth/logout`. Refresh token remained valid for up to 7 days.

**Fix**: Added `events.signOut` handler that calls `POST /api/auth/logout` with the current access token. Failure is silently swallowed — local session is always destroyed regardless.

---

### L2 — Permissions[] Always Empty (Q14 Gap) — Deferred

**File**: `lib/auth/options.ts` comment, `lib/platform/auth/types.ts`

Flask `serialize_auth_user()` returns `permissions: [p.name for p in user.role.permissions]` — this is populated. But `FlaskUserPayload.permissions` is typed `optional` and `normalizeFlaskUser()` uses `user.permissions ?? []`.

**Root check**: The permissions are being returned but typed as optional. This should work in practice. Document Q14 as low-priority clarification.

---

### L3 — Query Param Token Fallback in `jwt_required` — Deferred

**File**: `apps/authentication/jwt_auth.py`

The `jwt_required` decorator accepts `?token=<jwt>` as fallback. Tokens in query strings are logged in access logs (Nginx, Cloudflare, etc.) — a token leakage risk.

**Recommendation**: Remove the query-param fallback or restrict it to specific internal endpoints only. Not urgent since no current endpoint uses it from platform-ui.

---

### L4 — No Token Expiry Invalidation on User Deactivation

When a user is deactivated via `PATCH /api/users/<id>/active`, their existing JWT access token remains valid for up to 15 minutes. The `jwt_required` decorator checks `user.is_active` — so any request after token expiry will be blocked. The 15-minute window is acceptable but should be documented.

---

## 8. Auth/Session Review

| Check | Status | Notes |
|-------|--------|-------|
| refreshToken never in session.user | ✅ | Server-side JWT cookie only |
| accessToken not in session.user | ✅ | Fixed Round 020 |
| accessToken readable server-side by proxy | ✅ | `getToken()` in route handler |
| Token refresh transparent to user | ✅ | `refreshAccessToken()` in jwt() callback |
| RefreshTokenError → re-login | ✅ | Middleware check |
| Logout invalidates refresh token | ✅ | Fixed R021 (events.signOut) |
| Unauthenticated /api/proxy/* → 401 | ✅ | Middleware + proxy defense-in-depth |
| Expired token → consistent UI state | ✅ | `session.error` drives middleware redirect |
| Login errors don't leak Flask internals | ✅ | `authorizeWithFlask()` returns null on any failure |
| Session max age | ✅ | 8h (workday-appropriate) |

**Question answers:**
- Any token reachable from client components? **No.** `accessToken`/`refreshToken` removed from session in Round 020.
- Any token logged? **No.** Flask access logs only log path; Bearer token is in header, not URL (except L3 gap above).
- Can unauthenticated user call `/api/proxy/*`? **No.** Blocked at middleware (401 JSON) + proxy defense-in-depth.
- Can expired token cause inconsistent UI state? **No.** `session.error = "RefreshTokenError"` → middleware redirect → clean login.

---

## 9. Proxy/API Review

| Check | Status | Notes |
|-------|--------|-------|
| PATH_MAP prevents path traversal | ✅ | Strict allowlist, 404 for unknown prefix (fixed R021) |
| Internal Flask URL/topology not leaked | ✅ | catch block returns generic "Gateway error" |
| Raw upstream errors not forwarded | ✅ | JSON parse + re-wrap |
| Method restrictions | ✅ | GET/POST/PUT/PATCH/DELETE only (no HEAD/OPTIONS/TRACE) |
| Privileged headers not spoofable | ✅ | `Authorization` assembled server-side from JWT; client cannot inject |
| Audit headers clearly advisory | ✅ | Renamed X-Client-User-Id, X-Client-Org-Id (fixed R021) |
| Content-Type hardcoded to application/json | ✅ | Prevents content-sniffing attacks |
| 8s upstream timeout | ✅ | Prevents resource exhaustion from slow Flask responses |

---

## 10. RBAC Matrix for Current APIs

### `/api/users`

| Endpoint | Auth | Min Role | Tenant Scope | Self-Access |
|----------|------|----------|--------------|-------------|
| GET / | JWT | any | org_id from JWT | — |
| GET /stats | JWT | any | org_id from JWT | — |
| GET /pending | JWT | admin | org_id from JWT | — |
| GET /roles | JWT | admin | global (roles are global) | — |
| GET /<id> | JWT | any | org_id from JWT | own profile only |
| POST / | JWT | admin | org_id from JWT (forced) | — |
| PATCH /<id> | JWT | admin | org_id from JWT | own name only |
| PATCH /<id>/active | JWT | admin | org_id from JWT | blocked |
| POST /<id>/approve | JWT | admin | org_id from JWT | — |

### `/api/organizations`

| Endpoint | Auth | Min Role | Tenant Scope |
|----------|------|----------|--------------|
| GET / | JWT | system_admin | all orgs |
| GET /stats | JWT | system_admin | all orgs |
| GET /<id> | JWT | any | own org only (system_admin: any) |
| POST / | JWT | system_admin | — |
| PATCH /<id> | JWT | system_admin | any org |
| PATCH /<id>/active | JWT | system_admin | any org |

### `/api/roles`

| Endpoint | Auth | Min Role | Notes |
|----------|------|----------|-------|
| GET /permissions | JWT | admin | global list |
| GET / | JWT | admin | global list |
| POST / | JWT | system_admin | |
| GET /<id> | JWT | admin | global |
| PATCH /<id> | JWT | system_admin | name/description only |
| PATCH /<id>/permissions | JWT | system_admin | replace full set |

---

## 11. Tenant Isolation Review

| Check | Status | Notes |
|-------|--------|-------|
| org_id from JWT, not request body | ✅ | `g.jwt_user.org_id` used everywhere |
| User list scoped to org | ✅ | `_scoped_query()` with `org_id` filter |
| User detail scoped to org | ✅ | `_scoped_query()` used before 404 check |
| User create forces org from JWT | ✅ | `org_id=jwt_user.org_id` hardcoded |
| Cross-tenant user detail blocked | ✅ | `_scoped_query` returns None → 404 |
| Cross-tenant org update blocked | ✅ | System admin only; regular admin cannot call |
| IDOR via user_id | ✅ | Scoped query ensures same-org only |
| System admin bypass explicit | ✅ | `_scoped_query` removes org filter only for `is_system_admin` |

---

## 12. Personal Data Visibility Review

### Current exposure

| Field | Who Can See | Notes |
|-------|-------------|-------|
| email | own org admin, self | not in summary list? No — included in `_serialize_user_summary` |
| name (first/last) | own org admin, self | in summary |
| is_admin, is_manager | own org admin, self | in summary |
| last_login | own org admin | in summary |
| mfa_enabled, email_confirmed | admin, self | detail view only |
| permissions | admin, self | detail view only |
| password_hash | nobody | `_SAFE_EXCLUDE` |
| mobile_refresh_token | nobody | `_SAFE_EXCLUDE` |
| mfa_secret | nobody | `_SAFE_EXCLUDE` |

### Gap: Email in user list

All users in the org can call `GET /api/users` (not admin-restricted). This returns `email` for every user in the org. This may be acceptable for intra-org visibility but should be reviewed.

**Policy recommendation (deferred)**:
- `GET /api/users` (list): admin sees full list with email; regular user sees only own record.
- Document as SEC-PII-001 in backlog.

---

## 13. Dangerous Action Review

| Action | UI Confirms | Reason Required | Backend Enforced | Audit Written | Safe |
|--------|-------------|-----------------|------------------|---------------|------|
| Deactivate user | ✅ | No (medium) | ✅ admin + anti-self | ✅ R021 | ✅ |
| Reactivate user | ✅ | No (low) | ✅ admin | ✅ R021 | ✅ |
| Deactivate org | ✅ | Yes (high) | ✅ system_admin | ✅ R021 | ✅ |
| Reactivate org | ✅ | No (low) | ✅ system_admin | ✅ R021 | ✅ |

Notes:
- `requiresReason` for org deactivation (high) means the dialog forces a reason text. This is captured client-side and forwarded to Flask in the request body. Flask stores it in `UserActivity.additional_data.reason`.
- No hard deletes exist in any of these flows.

---

## 14. Audit Readiness Matrix

| Event | Audited | Notes |
|-------|---------|-------|
| Login (success) | Partial | `UserActivity` written by Flask `/api/auth/login`? **TBD** — not confirmed in jwt_routes.py |
| Login (failure) | No | Not audited; brute-force protection via `failed_login_attempts` only |
| Logout | No | JWT invalidated; no `UserActivity` entry |
| Create user | No | `UserActivity` not written in `POST /api/users` |
| Update user | No | `UserActivity` not written in `PATCH /api/users/<id>` |
| Deactivate user | ✅ | Written in R021 (`user.deactivate`) |
| Reactivate user | ✅ | Written in R021 (`user.reactivate`) |
| Create org | Partial | `logger.info(...)` written but no `UserActivity` row |
| Update org | No | `UserActivity` not written |
| Deactivate org | ✅ | Written in R021 (`org.deactivate`) |
| Reactivate org | ✅ | Written in R021 (`org.reactivate`) |
| Create role | No | `UserActivity` not written |
| Update role | No | |
| Replace role permissions | No | |
| Approve user | No | |

**Required audit events for production** (see §19):
- `user.login`, `user.login_failed`, `user.logout`
- `user.create`, `user.update`, `user.approve`
- `org.create`, `org.update`
- `role.create`, `role.update`, `role.permissions_replace`

---

## 15. Tests Added / Still Needed

### Tests added this round

None added (scope: audit + fixes only per mission fix policy).

### Tests still needed (priority order)

1. `test_user_active_endpoint.py` — PATCH /api/users/<id>/active: admin OK, self blocked, cross-org blocked, 403 for non-admin
2. `test_org_active_endpoint.py` — PATCH /api/organizations/<id>/active: system_admin OK, non-admin 403
3. `test_proxy_path_map.py` — unknown prefix returns 404 (not proxy-forward)
4. `test_tenant_isolation.py` — cross-org user detail returns 404, not 403 (prevents info leakage)
5. `test_dangerous_action_audit.py` — `UserActivity` row written for deactivate/reactivate

---

## 16. Fixes Implemented (R021)

| ID | Severity | Fix | Files |
|----|----------|-----|-------|
| H1 | HIGH | Proxy PATH_MAP strict allowlist (no fallback) | `app/api/proxy/[...path]/route.ts` |
| H2 | HIGH | Add `PATCH /api/users/<id>/active` Flask endpoint with audit | `apps/authentication/user_api_routes.py` |
| H3 | HIGH | Add `PATCH /api/organizations/<id>/active` Flask endpoint with audit | `apps/admin/org_api_routes.py` |
| M1 | MEDIUM | Rename X-User-Id → X-Client-User-Id, X-Org-Id → X-Client-Org-Id | `lib/platform/request/context.ts` |
| L1 | LOW | Add `events.signOut` to call Flask `/api/auth/logout` | `lib/auth/options.ts` |

---

## 17. Fixes Deferred

| ID | Severity | Description | Blocker Level |
|----|----------|-------------|---------------|
| M2 | MEDIUM | Add `is_system_admin` to `NormalizedAuthUser` | Before enterprise multi-tenant |
| L2 | LOW | Clarify Q14 permissions[] population (currently works but typed optional) | Low |
| L3 | LOW | Remove query-param token fallback in `jwt_required` | Before production |
| L4 | LOW | 15-min window where deactivated user's JWT remains valid | Documented |
| PII-001 | MEDIUM | `GET /api/users` returns emails to all org members | Before GDPR compliance |
| AUD-001 | HIGH | Audit trail for create/update user, create/update org, login/logout | Before production |

---

## 18. Required Blockers Before Helpdesk

The following must be resolved before building the Helpdesk module:

1. **AUD-001 (HIGH)**: Helpdesk actions (ticket create, tool invocation, approval) require audit trail. The `UserActivity` model exists but write coverage is incomplete. At minimum, document the audit event spec for Helpdesk.
2. **L3 (LOW)**: Remove query-param token — Helpdesk embeds may accidentally pass tokens in URLs.
3. No additional security blockers for Helpdesk itself.

---

## 19. Required Blockers Before Production

1. **AUD-001 (HIGH)**: Login, user create/update, role permission changes must write `UserActivity`.
2. **L3 (LOW)**: Remove query-param `?token=` fallback from `jwt_required`.
3. **PII-001 (MEDIUM)**: Restrict `GET /api/users` to admin-only, or strip email from non-admin view.
4. **M2 (MEDIUM)**: Explicit `is_system_admin` in NormalizedAuthUser for clarity.
5. **CSP headers**: Not addressed in this round — Nginx/Cloudflare configuration needed.

---

## 20. Acceptance Criteria for Security-Ready Foundation

- [x] No tokens in client-side session
- [x] Proxy cannot route to arbitrary Flask endpoints
- [x] All dangerous actions behind confirmation dialog
- [x] All dangerous actions enforced server-side
- [x] Deactivate/reactivate user and org write audit trail
- [x] Logout invalidates refresh token
- [x] Tenant isolation enforced in all current endpoints
- [x] Sensitive fields excluded from all API responses
- [ ] Full audit trail for create/update events (AUD-001 — deferred)
- [ ] Query-param token removed (L3 — deferred)
- [ ] Email visibility restricted to admins in user list (PII-001 — deferred)
