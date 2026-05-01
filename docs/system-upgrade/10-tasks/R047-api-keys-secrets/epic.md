# R047 — API Keys + Secrets Manager Backend

**Phase:** P1 — Foundation Gates
**Track:** platformengineer
**Status:** 🔴 blocked on R046
**Depends on:** R040 ✅, R046
**Estimate:** ~6 hours

## Scope
- **API Keys:**
  - `APIKey` model (id, org_id, key_hash, name, scopes, last_used_at, expires_at, created_by)
  - Generation: 32-byte random, prefix `pk_<env>_`, returned ONCE on creation
  - Verification: HMAC compare of incoming key against stored hash
  - Auth middleware: `Authorization: Bearer pk_*` → load org_id + scopes onto request
  - Service account flag: `is_service_account=true` keys bypass session, audit-required
- **Secrets Manager:**
  - `Secret` model (id, org_id, name, ssm_param_path, secret_type, rotated_at)
  - Backed by AWS SSM Parameter Store (production) / file-based vault (dev)
  - `SecretService.resolve(secret_ref)` returns plaintext server-side only
  - Never returned to frontend — frontend gets `secret_ref` placeholder

## Out of scope
- Key rotation UI (deferred)
- HSM-backed keys (P4 enterprise)
- OAuth client management (separate concern)

## Why now
Integrations (R049+) need machine auth. AI agents need non-session auth. Connector secrets (Google OAuth tokens, Jira API tokens) have no governed home today.

## Tasks
- [ ] T01 — `APIKey` model + migration + key generator + hash verifier
- [ ] T02 — JWT-or-APIKey auth middleware (accept either) + scope check
- [ ] T03 — `POST /api/org/api-keys` (creates, returns plaintext ONCE) + `DELETE /<id>` + RBAC
- [ ] T04 — `Secret` model + migration + SSMSecretBackend + LocalSecretBackend (dev)
- [ ] T05 — `SecretService.resolve()` + `rotate()` + audit every resolution via R046 AuditLog
- [ ] T06 — Test: API key auth works, expired key rejected, scope enforcement, cross-tenant isolation
- [ ] T07 — Test: Secret backend roundtrip dev + SSM mock prod, no plaintext leak in logs

## Acceptance Criteria
- [ ] API key creation returns `pk_*` plaintext ONCE; subsequent reads return masked
- [ ] Auth middleware accepts JWT and API key interchangeably
- [ ] Cross-tenant: API key scoped to org_id, cannot access other orgs
- [ ] Secret never appears in API response — only `secret_ref` placeholder
- [ ] All resolutions audited

## Final commit
SHA: `<filled on close>`
Date: `<YYYY-MM-DD>`
