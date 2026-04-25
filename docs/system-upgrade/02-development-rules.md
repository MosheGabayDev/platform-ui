# 02 — Development Rules

> Non-negotiable rules for all agents and developers working on this platform.
> _Last updated: 2026-04-26 (R041-Governance Addendum — initial creation)_
>
> **Read after:** `CLAUDE.md` → `00-implementation-control-center.md` → **this file**

---

## No Feature Loss During Rewrite

> **This rule is absolute.**

The new UI may simplify, reorganize, or redesign flows, but it **must not remove existing capabilities** unless explicitly documented as one of:

| Disposition | What it means | Required documentation |
|-------------|--------------|----------------------|
| **deprecated** | Feature intentionally retired | Reason + date + replacement or "no replacement" |
| **replaced** | Replaced by a new flow | Old path → new path mapping |
| **intentionally_removed** | Removed with approval | Stakeholder approval + issue/round reference |
| **moved** | Moved to another module | Source module → destination module |
| **deferred** | Planned but not in this round | Tracked issue or round reference |

Every removed, changed, or merged legacy behavior must be recorded in the module's `LEGACY_INVENTORY.md` under the "Removal/Deprecation" section.

**Violation of this rule blocks a round from being marked Done.**

---

## No Module Rewrite Without Inventory

A module may not enter rewrite implementation unless its per-module docs exist:

- `docs/modules/<module_key>/LEGACY_INVENTORY.md` — completed
- `docs/modules/<module_key>/E2E_COVERAGE.md` — planned (not necessarily complete)
- Legacy must-preserve capability list — defined
- UX simplification plan — documented (even as "no change planned")
- Backend API plan — at minimum a list of routes to preserve/change
- Security/tenant test plan — at minimum a list of test cases

**Missing any of the above = blocked from implementation.**

---

## No Module Done Without Evidence

A module round cannot be marked Done without:

- Backend tests: unit + integration
- Security tests: 401 + 403 for every protected endpoint
- Tenant isolation tests: org-scoped data query proven isolated
- E2E evidence: spec exists, or blocker documented
- AI readiness status: declared (even if "not applicable")
- i18n readiness status: declared (even if "deferred")
- Module migration progress row updated: `03-module-migration-progress.md`

---

## 1. Product Rules

- The platform is an **AI-native generic organization platform**.
- MSP/IT helpdesk is one supported module family, not the whole product identity.
- The platform supports many organizations and many use cases through interchangeable modules.
- The platform should feel **clean, modern, and not unnecessarily cluttered**.
- UI/UX simplification is encouraged; capability removal is not.
- Features exist to serve user needs — if a feature has no users, deprecate it formally, don't silently remove it.

---

## 2. Architecture Rules

### 2.1 Multi-Tenancy

- **Multi-tenant by default.** Every model, route, and query must be org-scoped.
- `org_id` is always derived from the authenticated JWT, never from the request body or query string.
- Cross-tenant operations require explicit `is_system_admin` gate.

### 2.2 Module Architecture

- **Module-first architecture.** Every feature belongs to a module.
- Each module is independently owned, documented, and testable.
- Modules communicate through defined API contracts, not direct imports.
- Module navigation is driven by the module registry (`OrgModule` state), not hardcoded.
- A module can be enabled/disabled per org without affecting other modules.

### 2.3 Shared Capabilities First

- Before building any new capability, check `26-platform-capabilities-catalog.md`.
- No local duplicate components — use shared `PageShell`, `DataTable`, `PlatformForm`, `DetailView`, `ActionButton`.
- Shared capabilities: auth, RBAC, audit, notifications, file storage, AI gateway, billing, feature flags, settings engine.

### 2.4 Schema & Data

- **Code-first schema.** SQLAlchemy model → migration → DB. Never the reverse.
- **Existing DB first + additive migrations.** No destructive schema changes without 30-day transition.
- No manual DB schema changes (no `ALTER TABLE` outside migration files).
- No BYODB (bring-your-own database) implementation before Phase 3.
- JSONB for flexible metadata; typed columns for indexed/queried fields.

### 2.5 AI Architecture

- **No direct LLM calls.** `import openai`, `import anthropic`, `import google.generativeai` banned outside `apps/ai_providers/`.
- **`AIProviderGateway` only** — `AIProviderGateway.call(GatewayRequest(...))`.
- `get_api_key()` only for capabilities where gateway is not yet implemented.
- Data Sources Hub is separate from TenantDataStore — do not conflate.
- Module navigation is module-registry-driven, not hardcoded.

---

## 3. Security Rules

- **Backend auth/RBAC is mandatory.** Frontend permission checks are UX convenience only — never the sole gate.
- `@jwt_required` on every `/api/*` write endpoint.
- `@role_required` / `@permission_required` on every mutation.
- `org_id` comes from authenticated JWT context, never from request body.
- No cross-tenant data leakage — every query scoped by `org_id`.
- `record_activity()` on every sensitive mutation: create, update, delete, revoke, disable, approve, security operations.
- **Secrets never returned to frontend.** API keys, tokens, passwords redacted in all responses.
- **Safe error responses only.** No `str(exc)`, no stack traces, no SQL error text in responses.
- Input validated at system boundaries (API layer). Trust internal code.
- HTTPS enforced at ingress level (Cloudflare). No HTTP-only paths.

---

## 4. Testing Rules

- **No module without backend tests.** Every module needs unit + integration tests.
- **No module without security tests.** 401 + 403 tests for every protected endpoint.
- **No module without tenant isolation tests.** Org A cannot access Org B data — proven with tests.
- **No module without E2E evidence.** Playwright spec exists, or blocker documented with issue reference.
- **No fake passing tests.** Tests must actually exercise the behavior being asserted.
- **Skipped tests require documented blocker.** `test.skip()` / `pytest.mark.skip()` with reason string pointing to an issue or this file.
- Full standard: `48-testing-and-evidence-standard.md`.
- Evidence matrix required per module: see `48-testing-and-evidence-standard.md §7`.

---

## 5. UX Rules

- **Simplify UX but preserve functionality.** A simpler flow is better; a missing flow is a bug.
- Avoid unnecessary clutter — remove decorative complexity, not functional capability.
- Use shared components: `PageShell`, `DataTable`, `PlatformForm`, `DetailView`, `ActionButton`.
- **RTL-first.** All layouts must work in RTL (Hebrew primary audience).
- **i18n-ready.** No hardcoded user-facing strings in new UI unless explicitly marked `TODO:i18n`.
- **Mobile-aware.** Key flows must work on mobile viewport.
- **Loading / error / empty states required** for every data-dependent view.
- Accessible: ARIA labels on interactive elements, keyboard navigable.

---

## 6. AI Readiness Rules

Every module must declare its AI readiness before it can be marked "migrated". Minimum declaration:

| Field | Required |
|-------|---------|
| `ai_page_context` | What the global chat assistant knows about this page (or "not applicable") |
| `ai_actions` | List of AI-executable actions on this module (or "none") |
| `ai_service_routes` | Backend routes the AI assistant may call (or "none") |
| `chat_explainable` | What the assistant can explain about module data |
| `voice_capable` | What the voice agent can do (or "not applicable") |
| `ai_refuse_list` | What AI must refuse (e.g. "never delete without user confirmation") |
| `ai_permission_requirements` | Permissions required for AI-executed actions |

This declaration lives in `docs/modules/<module_key>/AI_READINESS.md` or as a section in `IMPLEMENTATION.md`.

---

## 7. i18n Rules

- No hardcoded user-facing strings in new UI code unless marked `// TODO:i18n`.
- All user-facing labels, error messages, button text, and placeholder text should use translation keys.
- Hebrew and RTL are the primary design targets; English layout must also work.
- Module manifest must declare `display_name` and `description` as translation keys where applicable.
- i18n readiness is tracked in `docs/modules/<module_key>/I18N_READINESS.md` or as a section in `IMPLEMENTATION.md`.
- A module with hardcoded strings is not blocked from shipping but must be tracked as "i18n_pending".

---

## 8. Agent Collaboration Rules

- Multiple agents may work on different modules in parallel.
- **Every parallel agent works in a Git worktree.** Never work directly on `main` or `master`. See `52-parallel-worktree-agent-workflow.md` for setup, naming, and cleanup.
- Agents must not modify shared contracts (auth, RBAC decorators, shared components) without documenting impact.
- Agents must not edit locked files in parallel — see `52-parallel-worktree-agent-workflow.md §7` for the full lock list.
- Every agent must read the handoff protocol before starting: `51-agent-handoff-protocol.md`.
- Every agent must leave a handoff summary when done (template in `51-agent-handoff-protocol.md`).
- Progress tracker `03-module-migration-progress.md` must be updated after every module-related round.
- Agents must not implement outside their assigned round/issue scope.
- Safe and unsafe parallel combinations are defined in `52-parallel-worktree-agent-workflow.md §8`.

---

## 9. Per-Module Documentation Convention

All per-module docs live under `docs/modules/<module_key>/`:

| File | Purpose | Required before |
|------|---------|----------------|
| `LEGACY_INVENTORY.md` | Existing functionality inventory | Rewrite can start |
| `E2E_COVERAGE.md` | E2E coverage plan and status | Rewrite can start |
| `TESTING.md` | Test plan and evidence | Module marked Done |
| `IMPLEMENTATION.md` | Implementation plan and status | Implementation starts |
| `AI_READINESS.md` | AI readiness declaration | Module marked migrated |
| `I18N_READINESS.md` | i18n readiness and string inventory | Module marked migrated |

> **Central tracker** links to all per-module docs: `03-module-migration-progress.md`.

---

## 10. Enforcement

Violations of rules §2 (Architecture), §3 (Security), and §4 (Testing) **block a round from being marked Done**.

Violations of §5 (UX), §6 (AI Readiness), §7 (i18n) block a module from being marked **migrated** (but not from shipping an in-progress state).

Violations of §8 (Agent Collaboration) must be documented in the handoff summary and corrected in the next round.

**Cross-reference:** `01-round-review-checklist.md` maps these rules to reviewer checklist items.
