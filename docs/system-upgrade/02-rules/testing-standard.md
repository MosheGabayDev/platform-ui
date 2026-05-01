# 48 — Testing and Evidence Standard

_Created: 2026-04-26 (R041-Test Addendum) | Updated: 2026-04-26 (R041-AI-Assist Governance — §2.10 AI action tests + §3.4 frontend AI/voice UI tests added)_
_Owner: Platform Engineering_

> **This document is mandatory.** A module or capability is not Done unless it meets the evidence requirements in this standard.
> Read this before writing any test. Read the round-review checklist (`../06-governance/round-checklist.md §12`) before marking a round Done.
>
> **Cross-references:**
> - Legacy preservation: `../02-rules/development-rules.md §No Feature Loss During Rewrite`
> - Module migration progress: `../06-governance/module-migration-progress.md`
> - Per-module E2E plans: `docs/modules/<key>/E2E_COVERAGE.md` (standard: `../02-rules/e2e-coverage.md`)
> - Per-module testing docs: `docs/modules/<key>/TESTING.md`
> - Agent handoff: `../06-governance/handoff-protocol.md`

---

## 1. Mandate: No Module Without Security & Tenant Evidence

A module or shared capability is **not Done** unless it has documented evidence for each of the following:

| Evidence Category | Required |
|---|---|
| Authentication behavior | mandatory |
| Authorization / RBAC behavior | mandatory |
| Tenant isolation | mandatory for every org-scoped module |
| Sensitive mutation audit | mandatory for every create/update/delete/security operation |
| Safe error responses (no internals leaked) | mandatory |
| Frontend permission visibility | mandatory when UI exists |
| Backend permission enforcement | mandatory |
| E2E permission / denial flow | mandatory if UI exists; or documented blocker if not feasible |
| AI governance (gateway + billing) | mandatory for every AI/LLM feature |

If any category is missing, the round reviewer blocks the round. An exception requires explicit documentation in `../09-history/risk-register.md` and a follow-up issue.

---

## 2. Required Test Categories

### 2.1 Authentication Tests

Every protected API and page must test:

- Unauthenticated request returns `401`
- Expired or invalid JWT returns `401`
- JWT issued for a different org is rejected
- platform-ui protected page redirects unauthenticated user to `/login`
- `/api/proxy/*` rejects unauthenticated calls
- Internal API routes (`/admin/api/internal/*`) reject missing or wrong `X-API-Key`

**Assertion pattern (backend):**

```python
def test_unauthenticated(client):
    resp = client.get("/api/some/endpoint")
    assert resp.status_code == 401
    assert resp.json["success"] is False
    assert "data" not in resp.json or resp.json.get("data") is None
```

### 2.2 Authorization / RBAC Tests

Every module with role-guarded mutations must test:

- User with required role/permission can perform the action (200)
- User without required role/permission receives `403`
- Frontend hides the action button/form when permission absent
- Direct API call still returns `403` even when frontend hides the UI element
- Role escalation is blocked (user cannot grant themselves a higher role)
- Self-demotion or self-deactivation is blocked where applicable

**Assertion pattern (backend):**

```python
def test_requires_admin(client, viewer_token):
    resp = client.post("/api/some/mutation",
                       headers={"Authorization": f"Bearer {viewer_token}"},
                       json={...})
    assert resp.status_code == 403
    assert resp.json["success"] is False
```

### 2.3 Multi-Tenant Isolation Tests

Every org-scoped module must test ALL of the following:

- Org A user **cannot list** Org B records
- Org A user **cannot fetch** an Org B record by direct ID
- Org A user **cannot update** an Org B record by direct ID
- Org A user **cannot delete** an Org B record by direct ID
- User cannot override tenant by sending `org_id` in request body
- User cannot override tenant by sending `org_id` in query string
- System-admin cross-org access is explicit, documented, and tested separately
- Org-admin cannot access another org's settings, modules, users, or data

**Assertion pattern (backend):**

```python
def test_cannot_access_other_org(client, org_a_token, org_b_record_id):
    resp = client.get(f"/api/items/{org_b_record_id}",
                      headers={"Authorization": f"Bearer {org_a_token}"})
    assert resp.status_code in (403, 404)

def test_org_id_in_body_ignored(client, org_a_token, org_b_id):
    # Backend must derive org from JWT, not request body
    resp = client.post("/api/items",
                       headers={"Authorization": f"Bearer {org_a_token}"},
                       json={"name": "test", "org_id": org_b_id})
    assert resp.status_code in (200, 201)
    # Verify created item belongs to org_a, not org_b
    created = resp.json["data"]
    assert created["org_id"] != org_b_id
```

### 2.4 Module Availability Tests

For every module-gated route:

- Enabled module is accessible (200)
- Disabled module direct URL returns `403` with `{"error": "module_unavailable"}`
- Disabled module is hidden from navigation API response
- Unlicensed module is blocked
- Suspended module is blocked
- Missing required dependency blocks module enable

### 2.5 Audit Trail Tests

Every sensitive mutation must assert an audit row was created.

**Required mutations to cover:**

| Action | Audit required |
|---|---|
| create (any resource) | yes |
| update (any resource) | yes |
| delete / soft-delete | yes |
| deactivate / reactivate | yes |
| permission grant / revoke | yes |
| role change | yes |
| module enable / disable | yes |
| provider or route change | yes |
| API key create / revoke | yes |
| Secret or connection change | yes |
| AI action execution | yes |
| Billing / quota change | yes |

**Assertion pattern (backend):**

```python
def test_audit_on_delete(client, admin_token, item_id, db_session):
    client.delete(f"/api/items/{item_id}",
                  headers={"Authorization": f"Bearer {admin_token}"})
    audit = db_session.query(UserActivity).filter_by(
        action="item_deleted", resource_id=str(item_id)
    ).first()
    assert audit is not None
    assert audit.user_id is not None
    assert audit.org_id is not None
    # Verify no secrets/tokens/PII in metadata
    if audit.metadata:
        meta_str = json.dumps(audit.metadata)
        assert "password" not in meta_str
        assert "token" not in meta_str
        assert "secret" not in meta_str
```

### 2.6 Safe Error / Data Exposure Tests

Every module must verify:

- API errors do not return `str(exc)` with internal details
- No stack traces in JSON responses
- No raw SQL errors surfaced to client
- No secrets, tokens, or API keys returned in responses
- Non-admin users do not receive sensitive fields (e.g., password hashes, internal IDs, system metadata)
- PII fields are hidden or scoped correctly per role

**Assertion pattern (backend):**

```python
def test_error_response_is_safe(client, admin_token):
    resp = client.get("/api/items/99999999",  # nonexistent
                      headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 404
    body = resp.get_data(as_text=True)
    # None of these must appear in error responses
    assert "Traceback" not in body
    assert "psycopg2" not in body
    assert "sqlalchemy" not in body
    assert "Exception" not in body
```

### 2.7 AI Governance Tests

For every AI/LLM feature:

- Direct provider SDK is not imported outside `apps/ai_providers/adapters/` (static scan enforced in CI via `scripts/check_no_direct_llm_imports.py`)
- AI calls use `AIProviderGateway.call(GatewayRequest(...))`
- `GatewayRequest` includes `org_id`, `user_id`, `module_id`, `feature_id`, `capability`
- `AIUsageLog` row is created after every call
- Billing usage event is emitted or queued
- Provider and model are not hardcoded in service code
- Prompt/context is not treated as authorization (backend permission re-checked)
- AI action execution re-checks backend permissions — prompt injection cannot escalate
- AI cannot access disabled modules
- AI cannot access sources denied by `SourceAccessPolicy`
- AI cannot perform destructive actions without confirmation/approval/audit

**Assertion pattern (backend):**

```python
def test_ai_call_writes_usage_log(client, admin_token, db_session):
    before_count = db_session.query(AIUsageLog).count()
    client.post("/api/some-ai-feature",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"prompt": "summarize this"})
    after_count = db_session.query(AIUsageLog).count()
    assert after_count == before_count + 1

def test_no_direct_llm_import():
    """Static — ensure no openai/anthropic import outside adapters."""
    import subprocess, sys
    result = subprocess.run(
        [sys.executable, "scripts/check_no_direct_llm_imports.py"],
        capture_output=True
    )
    assert result.returncode == 0, result.stdout.decode()
```

### 2.8 AI Assistant Action Tests

For every module that implements AI-executable actions (readiness Level 3+):

- Authorized user can execute a registered AI action → 200 + correct result
- Unauthorized user (wrong role) receives `403` — action not executed
- User cannot execute an action against a record in another org → `403 target_scope_violation`
- Disabled module blocks AI action → `409 module_disabled` or `403`
- Unregistered action ID is rejected → `400 action_not_registered`
- Stale capability context returns `409 context_stale` after `context_version` increment
- Confirmation token required for `medium`/`high`/`critical` actions — missing token rejected
- `high`/`critical` danger level action requires approval or typed confirmation — missing returns `403`
- `AIActionInvocation` audit row created for every execution attempt (success and denial)
- `AIUsageLog` created for every LLM call made during action flow
- Billing/usage event emitted or queued for every AI call
- No PII/secrets leaked in action metadata or error responses

**Assertion patterns:**

```python
def test_ai_action_denied_wrong_role(client, viewer_token):
    resp = client.post("/api/ai/actions/execute",
                       headers={"Authorization": f"Bearer {viewer_token}"},
                       json={"action_id": "helpdesk.close_ticket", "params": {...}})
    assert resp.status_code == 403
    assert resp.json["error"] in ("permission_denied", "action_denied")

def test_ai_action_tenant_isolation(client, org_a_token, org_b_record_id):
    resp = client.post("/api/ai/actions/execute",
                       headers={"Authorization": f"Bearer {org_a_token}"},
                       json={"action_id": "helpdesk.close_ticket",
                             "params": {"ticket_id": org_b_record_id}})
    assert resp.status_code in (403, 404)

def test_ai_action_creates_audit_row(client, admin_token, db_session):
    client.post("/api/ai/actions/execute",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"action_id": "helpdesk.close_ticket", "params": {...},
                      "confirmation_token": valid_token})
    invocation = db_session.query(AIActionInvocation).filter_by(
        action_id="helpdesk.close_ticket"
    ).order_by(AIActionInvocation.created_at.desc()).first()
    assert invocation is not None
    assert invocation.user_id is not None
    assert invocation.org_id is not None
    assert invocation.status == "success"

def test_unregistered_action_rejected(client, admin_token):
    resp = client.post("/api/ai/actions/execute",
                       headers={"Authorization": f"Bearer {admin_token}"},
                       json={"action_id": "invented.fake_action", "params": {}})
    assert resp.status_code == 400
    assert resp.json["error"] == "action_not_registered"

def test_stale_context_rejected(client, admin_token, bump_context_version):
    bump_context_version()  # simulates role change / module toggle
    resp = client.post("/api/ai/actions/execute",
                       headers={"Authorization": f"Bearer {admin_token}"},
                       json={"action_id": "helpdesk.close_ticket",
                             "params": {...}, "context_version": old_version})
    assert resp.status_code == 409
    assert resp.json["error"] == "context_stale"
```

### 2.9 AI Knowledge and Advisory Tests

For every user-facing module, assert:

1. **KB-completeness:** Module has `capability_summary` + `business_use_cases` + `target_users` declared (from `../05-ai/capability-kb.md §6.1`)
2. **KB-advisory-mode:** Assistant in Advisory Mode returns correct capabilities for a sample org profile — no action execution
3. **KB-guided-mode:** Assistant in Guided Operation Mode explains current page fields and actions from AIPageContextRegistry
4. **KB-delegated-allowed:** Allowed delegated action executes + `AIActionInvocation.status == "success"` + `AIUsageLog` row created
5. **KB-delegated-denied:** Denied action returns 403 + `AIActionInvocation.status == "denied"` — no execution
6. **KB-unavailable-unlicensed:** Assistant explains license requirement and refers to admin — no data exposed
7. **KB-tenant-isolation:** Cross-tenant resource access → 403/404 — advisory knowledge does not bypass tenant scope
8. **KB-admin-escalation:** User without permission gets safe referral, not raw error

Evidence required: test file at `tests/ai_knowledge/test_<module_key>_advisory.py`

**Test patterns:**
```python
def test_advisory_mode_no_execution(client, user_token, org_profile):
    # Advisory mode must not trigger any action execution
    resp = client.post("/api/ai/advisory", json={"mode": "advisory", "query": "what can I do?"})
    assert resp.status_code == 200
    assert resp.json.get("actions_executed") == []

def test_guided_mode_page_context(client, user_token, page_id):
    resp = client.post("/api/ai/context", json={"page_id": page_id})
    assert resp.status_code == 200
    assert "available_actions" in resp.json["data"]

def test_unlicensed_capability_referral(client, basic_plan_token, capability_id):
    resp = client.post("/api/ai/advisory", json={"capability_id": capability_id})
    assert resp.status_code == 200
    assert resp.json["data"]["status"] == "unlicensed"
    assert "admin" in resp.json["data"]["message"].lower()
```

### 2.10 Data Sources / MCP / DB Connection Tests

For future Data Sources Hub:

- Source belongs to current org (tenant isolation applies to data connections)
- Source access policy is enforced per capability (`ai_allowed`, `voice_allowed`)
- DB connections are read-only by default
- Arbitrary destructive SQL is blocked
- MCP tools require allowlist
- Destructive MCP tools require AI Action Platform rules
- Secrets are never returned to the frontend

### 2.11 Billing / Quota Tests

For billable capabilities:

- Quota exceeded blocks or degrades according to org policy
- Usage event is recorded on every AI call
- AI token / call usage is tied to `org_id`
- Module license is checked before enabling a paid module
- Expired or suspended license blocks module usage
- Org billing status can suspend module usage when policy requires

---

## 3. E2E Security Test Structure

### 3.1 Directory Layout

```text
tests/e2e/security/
  auth-redirect.spec.ts        # Unauthenticated → redirect to /login
  permission-denied.spec.ts    # Viewer cannot perform admin actions
  tenant-isolation.spec.ts     # Org A cannot see Org B data
  module-disabled.spec.ts      # Disabled module blocked in nav + direct URL
```

### 3.2 Required Environment Variables

| Variable | Purpose |
|---|---|
| `E2E_BASE_URL` | Base URL of the running platform-ui (e.g., `http://localhost:3000`) |
| `E2E_ORG_A_ADMIN_EMAIL` | Org A admin test user email |
| `E2E_ORG_A_ADMIN_PASSWORD` | Org A admin test user password |
| `E2E_ORG_A_VIEWER_EMAIL` | Org A viewer (no admin permissions) test user email |
| `E2E_ORG_A_VIEWER_PASSWORD` | Org A viewer test user password |
| `E2E_ORG_B_ADMIN_EMAIL` | Org B admin (different org) test user email |
| `E2E_ORG_B_ADMIN_PASSWORD` | Org B admin test user password |
| `E2E_TEST_USER_NO_PERMISSION_EMAIL` | User with no module permissions |
| `E2E_TEST_USER_NO_PERMISSION_PASSWORD` | Password for above |

**Rules:**
- Never commit credentials — use `.env.test.local` (gitignored)
- Never use production users
- Test orgs must be disposable or clearly marked `[E2E-TEST]`
- E2E tests must not perform destructive actions against production
- Destructive actions allowed only in TEST environment (`E2E_BASE_URL` pointing to TEST)

### 3.3 E2E Test Rules

- Initial scaffold tests are skipped (`test.skip`) when test credentials/data are not available
- Skipped tests must define exact fixtures and env vars needed — not "TODO"
- Each test file must `test.describe` with the feature/module being tested
- All tests must clean up created resources (use `afterEach` teardown or isolated test data)
- Tests must not depend on each other's execution order

### 3.4 Frontend AI/Voice UI Tests

For modules at AI readiness Level 1+, frontend E2E tests must cover:

**Chat assistant UI:**
- Floating assistant icon visible on authenticated module pages
- No LLM/API call on page load (before user opens assistant) — assert no network call to `/api/ai/*`
- Assistant drawer opens on icon click
- Conversation persists across route navigation (same `conversationId` in Zustand store)
- Current page context updates in assistant after navigation (page_id changes)
- Action proposal card renders when assistant proposes an action
- `ConfirmActionDialog` shown for actions with `danger_level >= medium`
- Permission-denied message is safe, helpful, and contains no internal detail
- Assistant does not execute action without confirmation for mutation endpoints

**Voice agent UI (if module is Level 5+):**
- Voice unavailable/degraded state renders correctly when voice service is down
- Voice UI does not auto-start on page load
- Voice session billing indicator visible during active session
- Voice refusal renders safe message for ineligible or unauthorized actions

**RTL and accessibility:**
- RTL layout renders without overflow on all AI/voice UI surfaces
- ARIA labels present on floating icon, drawer, and action confirmation elements

**Spec file location:**
```text
tests/e2e/ai/
  assistant-page-context.spec.ts    # page context + explanation flows
  assistant-action-proposal.spec.ts # action proposal + confirmation
  assistant-permission-denied.spec.ts # refusal flows
  voice-agent-safety.spec.ts         # voice safety + UI escalation (if Level 5+)
```

These tests are scaffolded/skipped until the Phase A–B implementation is complete.

---

### 3.5 UI Smoke Tests — mandatory for every UI feature

Every page, drawer, dialog, or interactive widget that a user can see MUST
have a Playwright UI smoke spec. This is the source-of-truth contract for
"a feature works in the browser."

**Where the spec goes:**

```text
tests/e2e/
  fixtures/base.ts              ← extended Playwright `test` (do not import @playwright/test directly)
  helpers/
    auth.ts                     ← real Flask login (use when RBAC must be live)
    mock-session.ts             ← mints NextAuth JWE locally (offline mock-mode runs)
    error-capture.ts            ← console + pageerror + 4xx/5xx capture
  modules/<module>/             ← per-module specs live here
    <feature>.spec.ts
  smoke/                        ← cross-cutting golden-path specs only
  security/                     ← RBAC + tenant isolation
```

**Every spec must:**

1. Import from the base fixture:
   ```ts
   import { test, expect } from "../../fixtures/base";
   //                          ^^^^^^^^^^^^^^^^^^^^^
   //                          NOT "@playwright/test"
   ```
2. Exercise the **golden path** (the most common successful flow).
3. Exercise at least one of: empty state, error state, loading state.
4. Assert no `page-error`, no unexpected `console-error` (use the base
   fixture's `errorCapture.errors` list — the run is allowed to capture
   warnings, but a `page-error` fails the gate).
5. For destructive actions: assert `ConfirmActionDialog` is shown and
   the action does NOT fire until confirmed.
6. For RTL audiences: assert `<html dir="rtl">` and that the page renders
   without overflow at 320×568 (mobile S).

**Every PR that adds or modifies UI must:**

1. Add or update at least one spec under `tests/e2e/modules/<module>/`.
2. Run `node scripts/aggregate-e2e-errors.mjs` after the spec passes.
3. Read the generated `planning-artifacts/reviews/<date>-e2e-error-report.md`.
4. For each captured browser error: either fix it, or open a question in
   `docs/system-upgrade/08-decisions/open-questions.md` with a triage label.

**The base fixture intentionally provides:**

- A pre-authenticated mock admin session (no Flask login required for
  MOCK_MODE clients).
- All feature flags open by default; override per-test via
  `flagOverrides` fixture.
- Auto-attached `ErrorCapture` — every captured browser error is
  persisted to `test-results/error-capture/<test>.json` and attached to
  the HTML report.

**The base fixture intentionally does NOT provide:**

- Real Flask login (use `helpers/auth.ts` `login()` directly when needed).
- Database seeding (per-module setup, or use Flask seed scripts for live
  integration runs).
- Performance assertions (use `tests/e2e/performance/` once budgets exist).

**Skip rules:**

- A spec that depends on a non-existent backend route may `test.skip()`
  with a `// REASON: blocked on R<round>-BE-<task>` comment. The
  blocker must be tracked in the round's epic.
- A spec that requires real Flask login when Flask is unavailable must
  use `getAdminCredentials()` from `helpers/auth.ts` and skip if null.
  Never silently green-pass.

**Reference implementation:** `tests/e2e/smoke/golden-path.spec.ts` — covers
shell, AI drawer, page-context registration, helpdesk dashboard/list/detail,
command palette, and mobile viewport in 8 steps.

---

## 4. Backend Security Test Helpers

### 4.1 Required Helper Patterns

These helpers must be available in `apps/tests/helpers/security.py` (create when first needed):

```python
# JWT helpers
def make_jwt(user_id, org_id, role="member", permissions=None, expired=False):
    """Generate a test JWT for a user. Set expired=True for expiry tests."""

def admin_headers(org_id=1):
    """Return Authorization headers for an admin user in org_id."""

def viewer_headers(org_id=1):
    """Return Authorization headers for a viewer user in org_id."""

def cross_org_headers(source_org_id=1, target_org_id=2):
    """Return headers for a user in org 1 trying to access org 2 data."""

# Assertion helpers
def assert_401(response):
    assert response.status_code == 401
    assert response.json["success"] is False

def assert_403(response):
    assert response.status_code == 403
    assert response.json["success"] is False

def assert_no_internal_error(response):
    body = response.get_data(as_text=True)
    for forbidden in ["Traceback", "psycopg2", "sqlalchemy", "Exception at", "raise "]:
        assert forbidden not in body, f"Internal error leaked: found '{forbidden}' in response"

def assert_audit_exists(db_session, action, org_id, resource_id=None):
    from apps.authentication.models import UserActivity
    q = db_session.query(UserActivity).filter_by(action=action, org_id=org_id)
    if resource_id:
        q = q.filter_by(resource_id=str(resource_id))
    row = q.first()
    assert row is not None, f"No audit row found for action={action}, org_id={org_id}"
    return row

def assert_no_pii_leaked(response):
    body = response.get_data(as_text=True).lower()
    for field in ["password", "hashed_password", "api_key", "secret", "token"]:
        assert field not in body, f"PII/secret field '{field}' leaked in response"
```

### 4.2 Test Org Fixtures

Standard pytest fixtures for multi-tenant testing:

```python
@pytest.fixture
def org_a(db_session):
    """Create a test org A."""
    org = Organization(name="Test Org A [E2E]", ...)
    db_session.add(org)
    db_session.commit()
    yield org
    db_session.delete(org)
    db_session.commit()

@pytest.fixture
def org_b(db_session):
    """Create a test org B (different org for isolation tests)."""
    ...
```

---

## 5. CI/CD Security Gate Plan

### 5.1 PR Checks (on every pull request)

| Check | Tool | Gate |
|---|---|---|
| Backend unit + API tests | pytest | fail PR if any fail |
| Backend security tests (auth/RBAC/isolation) | pytest | fail PR if any fail |
| LLM import scan | `scripts/check_no_direct_llm_imports.py` | fail PR if violations |
| Frontend typecheck + build | `tsc --noEmit` + `next build` | fail PR if errors |
| Playwright smoke (if TEST env available) | playwright | fail PR if smoke fails |

### 5.2 TEST Deployment Checks (after deploy to TEST env)

- Playwright login smoke
- Permission denial smoke
- Tenant isolation smoke
- Module disabled smoke
- **No destructive production-like operations**

### 5.3 PROD Deployment Checks (read-only only)

- Health endpoint check
- Login page loads
- Authenticated dashboard renders (if safe)
- **No create/update/delete tests**
- **No AI destructive action tests**

### 5.4 CI Artifacts

Every CI run must produce:

| Artifact | When |
|---|---|
| pytest HTML / JUnit XML | every PR |
| Playwright HTML report | when Playwright runs |
| Playwright screenshots | on failure (always); on success (when `EVIDENCE_MODE=headed`) |
| Playwright traces | on failure |
| Playwright videos | on failure |
| Security test summary | every PR |

---

## 6. Test Evidence Matrix

A module or capability is **not Done** without the following evidence:

| Evidence Type | Required For | Artifact |
|---|---|---|
| Backend test output | every backend module | pytest output with pass/total count |
| API security tests (401/403) | every protected API | pytest/JUnit output |
| Tenant isolation tests | every org-scoped module | pytest/JUnit output |
| Playwright trace | every E2E failure | `trace.zip` |
| Playwright video | E2E failure OR headed evidence mode | `.webm` |
| Screenshot | failure + key happy path if configured | `.png` |
| Audit assertion | every sensitive mutation | test assertion in pytest output |
| AIUsageLog assertion | every AI/LLM feature | test assertion in pytest output |
| Billing event assertion | every billable feature | test assertion in pytest output |
| AI readiness level declared | every module round | `docs/modules/<key>/AI_READINESS.md` exists |
| AI action denial test (403) | every AI-executable action | pytest assertion |
| AIActionInvocation row asserted | every AI action execution | pytest assertion |
| Voice safety test | Level 5–6 modules | pytest + Playwright assertion |

---

## 7. Module TESTING.md Template Additions

Every module's `TESTING.md` must include:

```markdown
## Security & Multi-Tenant Coverage

### Authentication
- [ ] Unauthenticated request returns 401
- [ ] Expired JWT returns 401
- [ ] Cross-org JWT rejected

### Authorization (RBAC)
- [ ] Required role enforced on mutations
- [ ] 403 returned for unauthorized role
- [ ] Role escalation blocked

### Tenant Isolation
- [ ] Org A cannot list Org B records
- [ ] Org A cannot fetch Org B record by ID
- [ ] Org A cannot update/delete Org B records
- [ ] org_id in body is ignored (derived from JWT)

### Audit Trail
| Action | Audit asserted | Test file | Line |
|---|---|---|---|
| create | [ ] | | |
| update | [ ] | | |
| delete | [ ] | | |

### Safe Error Responses
- [ ] No stack traces in error responses
- [ ] No SQL/ORM errors surfaced
- [ ] No secrets in responses

### PII / Data Exposure
- [ ] Sensitive fields hidden from non-admin roles
- [ ] Audit metadata has no passwords/tokens

### E2E Security Scenarios
- [ ] Unauthenticated redirect
- [ ] Permission denial (viewer cannot admin)
- [ ] Cross-org access denied
- [ ] Disabled module blocked

### Known Gaps
<!-- document any test gaps and the tracking issue -->

### Required Test Fixtures / Test Users
<!-- list env vars and fixture descriptions needed to run security tests -->
```

---

## 8. RBAC Matrix Template

Every module with multiple roles must document the RBAC matrix:

| Action | system_admin | org_admin | manager | member | viewer |
|---|---|---|---|---|---|
| list | ✅ | ✅ | ✅ | ✅ | ✅ |
| read | ✅ | ✅ | ✅ | ✅ | ✅ |
| create | ✅ | ✅ | ✅ | ❌ | ❌ |
| update | ✅ | ✅ | ✅ | ❌ | ❌ |
| delete | ✅ | ✅ | ❌ | ❌ | ❌ |
| configure | ✅ | ✅ | ❌ | ❌ | ❌ |

Fill this in for each module. Tests must cover each `❌` cell (403 expected).

---

## 9. Known Gaps and Next Steps

| Gap | Tracking | Priority |
|---|---|---|
| Backend security helper module not yet created | R041-Test follow-up | P1 |
| E2E security test specs are scaffolded/skipped | Blocked by: Playwright setup + test credentials | P1 |
| No CI gate for tenant isolation tests yet | R041A CI enforcement | P1 |
| Module TESTING.md template not yet applied to existing modules | Per-module task | P2 |
| AI governance test patterns not yet applied to existing AI modules | R048 cleanup round | P2 |

---

## 10. Source of Truth

| Topic | Canonical document |
|---|---|
| AI governance test requirements | This document §2.7 |
| E2E security test env vars | This document §3.2 |
| Backend security helper patterns | This document §4 |
| CI gate plan | This document §5 |
| Evidence matrix | This document §6 |
| Module TESTING.md template | This document §7 |
| Round review enforcement | `../06-governance/round-checklist.md §12` |
| Active risks | `../09-history/risk-register.md §R16` |
