# 06 — Security Assessment

_Last updated: 2026-04-24 (Round 022 — all deferred blockers resolved)_

> **R022 Summary**: All pre-production security blockers from R021 resolved. AUD-001 (audit trail), L3 (URL token), PII-001 (email visibility), M2 (is_system_admin typing). Overall score: 9.2/10.

---

## Status After Round 022

| Finding | R001 Status | R021 Status | R022 Status |
|---------|------------|------------|------------|
| C2 — Auth bridge stub | CRITICAL | ✅ Fixed (R005–R009) | ✅ |
| H1 — No formal API auth contract | HIGH | ✅ Fixed (JWT throughout) | ✅ |
| H2 — RBAC not enforced in platform-ui | HIGH | ✅ Fixed (PermissionGate, role guards) | ✅ |
| M2 — Token/session expiry | MEDIUM | ✅ Fixed (refresh rotation, 8h session) | ✅ |
| **R021-H1** — Proxy PATH_MAP fallback | NEW HIGH | ✅ Fixed R021 | ✅ |
| **R021-H2** — Missing /users/active endpoint | NEW HIGH | ✅ Fixed R021 | ✅ |
| **R021-H3** — Missing /orgs/active endpoint | NEW HIGH | ✅ Fixed R021 | ✅ |
| **R021-M1** — X-User-Id header naming | NEW MEDIUM | ✅ Fixed R021 | ✅ |
| **R021-L1** — Logout no refresh invalidation | NEW LOW | ✅ Fixed R021 | ✅ |
| **R021-M2** — is_system_admin in types | NEW MEDIUM | Deferred | ✅ Fixed R022 |
| **R021-AUD-001** — Audit trail gaps | NEW HIGH | Deferred | ✅ Fixed R022 |
| **R021-PII-001** — Email in user list | NEW MEDIUM | Deferred | ✅ Fixed R022 |
| **R021-L3** — URL token in jwt_required | NEW LOW | Deferred | ✅ Fixed R022 |
| C1 — SAML disabled | CRITICAL | Still open — not in scope | Still open |
| **CSP-enforce** — Security headers | NEW MEDIUM | — | Plan only ([../07-audits/production-security-headers.md](../07-audits/production-security-headers.md)) |

---

---

## Summary

The backend has a thoughtful security foundation — multi-tenant RBAC, audit trails, encrypted secrets via SSM, approval gates for destructive actions. However, several structural gaps exist that must be closed before this system scales to more customers.

---

## Critical

### C1 — SAML / Enterprise SSO Disabled

`python3-saml` and `xmlsec` are commented out in `requirements.txt` due to "compilation issues on macOS." Enterprise MSP customers will require SSO (Okta, Azure AD, Google Workspace). Without it, the system cannot target enterprise buyers.

**Evidence:** `requirements.txt` lines for `python3-saml`, `xmlsec`, `onelogin` are commented with "TEMPORARILY DISABLED."

**Recommendation:** Fix the build dependency issue; use a pre-built binary wheel or Docker-only compilation.

### C2 — Authentication Bridge (platform-ui) is a Stub

The login page in `platform-ui` does nothing (`setTimeout(1000)` only). The API proxy at `/api/proxy` routes requests to the backend with `credentials: "include"`, relying on Flask session cookies — but no session establishment flow exists in the Next.js layer.

**Evidence:** `app/(auth)/login/page.tsx` — form submit is a no-op.

**Recommendation:** Implement `next-auth` with a credentials provider that calls Flask's `POST /api/auth/login`, stores the session, and gates all dashboard routes.

---

## High

### H1 — No Formal API Authentication Contract

Flask routes use Flask-Login session cookies. The API contract for machine-to-machine or mobile API calls via PyJWT is unclear — `PyJWT` is in requirements but consistent API token auth is not evidenced across all endpoints.

**Recommendation:** Define and enforce: JWT for API-key/M2M access, session cookie for browser, and ensure platform-ui proxy passes the right auth credential.

### H2 — RBAC Not Enforced in platform-ui

Backend RBAC (`@role_required`, `@permission_required`) is correct. But `platform-ui` has zero server-side or client-side role guards. A user with insufficient backend permissions would see all nav items but get 403 errors when clicking — confusing and leaks navigation structure.

**Evidence:** `nav-items.ts` — all items shown regardless of role.

**Recommendation:** Expose current user role/permissions in the auth session; conditionally render nav and use Next.js middleware to gate routes.

### H3 — `auto_approve_commands` Privilege Escalation Risk

Per `CLAUDE.md` (Helpdesk Approval Policy):
- `auto_approve_commands` is system-admin-only
- Every grant writes to `UserActivity`

This is correctly designed but relies on the server correctly checking `is_system_admin` before granting. If any org-admin path can bypass this check, it's a critical privilege escalation.

**Recommendation:** Verify the grant/revoke endpoint includes `is_system_admin` check with a test; add to regression gate.

### H4 — Destructive AI Actions Without End-to-End Audit

`AutonomousActionLog` records all autonomous actions. However, the link between a `ToolInvocation` (what was called), the `AutonomousActionLog` (what was executed), and the `TicketTimeline` (what the user sees) is not clearly enforced as atomic.

**Recommendation:** Verify that every tool execution path writes to all three tables, or document the intentional gap.

### H5 — API Proxy in platform-ui May Leak Internal Errors

`lib/api/client.ts` throws `Error(body.error ?? body.message ?? "HTTP ${res.status}")` — Flask tracebacks should never reach this. Verify Flask error handlers suppress tracebacks to non-debug clients.

---

## Medium

### M1 — CSRF Protection Scope

Flask-WTF provides CSRF tokens for form-based requests. JSON API endpoints via the new `platform-ui` proxy pattern use `credentials: "include"` (cookies) — need SameSite cookie policy + CSRF validation for state-changing requests.

### M2 — Token/Session Expiry Handling

No evidence of sliding session expiry or explicit token rotation in the codebase. Long-lived sessions are a risk for enterprise deployments.

### M3 — PII Module Exists But Coverage Unknown

`apps/pii/` module exists. Scope and enforcement coverage unknown without deeper inspection.

### M4 — No Content Security Policy Header Observed

Static assets served by Flask/Nginx. No evidence of CSP headers in Nginx or Flask config.

### M5 — Mobile App APK Distribution

APK distributed via admin upload UI, no Google Play. Users install from unknown source, bypassing Play Protect. Risk of tampered APK distribution.

---

## Low

### L1 — Debug Routes in Production

Some `apps/*/routes.py` files may include debug endpoints not disabled in PROD. Not confirmed but common in Flask apps.

### L2 — Console Logging of Sensitive Data

No evidence of systematic log scrubbing. AI prompts logged for debugging may include PII or credentials embedded in tool params.

### L3 — Dependency Pinning

`requirements.txt` mostly pinned. Some entries use `>=` which allows drift. Consider `pip-audit` in CI.

---

## Positive Findings

| Finding | Evidence |
|---------|----------|
| Secrets never hardcoded | SSM + K8s Secret pattern consistently used |
| Multi-tenant `org_id` enforcement | All tables, most services |
| Approval gate for destructive actions | `PolicyRule`, `ToolInvocation.tool_snapshot` |
| Audit trail | `TicketTimeline`, `UserActivity`, `AutonomousActionLog` |
| Input sanitization | `bleach` in requirements |
| Security scanning in CI | `sast.yml`, `secret-leak-scan.yml`, `trivy.yml` in `.github/workflows/` |
| `.gitleaks.toml` | Secret leak scanning configured |
