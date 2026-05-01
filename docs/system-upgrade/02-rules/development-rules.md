# 02 — Development Rules

> Non-negotiable rules for all agents and developers working on this platform.
> _Last updated: 2026-04-26 (R041-AI-Assist Governance — §6 AI readiness expanded to mandatory gate)_
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

## 6. AI Assistant Readiness Is Mandatory

> **This rule is absolute. No silent omission is allowed.**

The global Chat AI assistant and Voice agent are not optional add-ons. They are core platform interaction layers. Every module, capability, and user-facing workflow must be developed so these assistants can support it automatically.

### 6.1 Done Gate — Module Not Complete Without AI/Voice Status

A module round cannot be marked **Done** unless one of these is true and documented:

| Option | What is required |
|--------|----------------|
| **Full AI/Voice readiness** | AI readiness level declared + tested per `54-ai-assistant-runtime.md §14` |
| **Read-only explanation support** | Level 1 page context declared + explanation tested |
| **Explicit documented exception** | Reason + approval + follow-up issue reference in `AI_READINESS.md` |

No silent omission. Every module must have one of the above before its round closes.

### 6.2 AI Readiness Levels

Full level definitions: `54-ai-assistant-runtime.md §14`.

| Level | Name | Description |
|-------|------|-------------|
| 0 | Not Ready | No AI metadata — assistant cannot help with this module |
| 1 | Explainable | Assistant explains page, fields, actions. No execution. |
| 2 | Guided | Assistant guides workflows and suggests next steps. No execution. |
| 3 | Action Proposal | Assistant proposes actions + collects parameters. User must execute manually. |
| 4 | Chat Action Ready | Chat executes allowed actions via backend auth + confirmation + audit. |
| 5 | Voice Assist Ready | Voice explains and guides. Limited low-risk execution with read-back confirm. |
| 6 | Voice Action Ready | Voice executes low-risk actions. High/critical always routed to UI approval. |

### 6.3 Per-Module AI Page Context

Every user-facing page must declare (in `ai-page-contexts.ts`):

| Field | Required |
|-------|---------|
| `page_id` | Unique ID: `<module_key>.<page_type>` (e.g. `helpdesk.tickets.list`) |
| `module_key` | Module this page belongs to |
| `title` / `description` | Human-readable page purpose |
| `fields[]` | Fields visible on the page with labels and types |
| `available_actions[]` | Action IDs available on this page |
| `pii_fields[]` | Fields that are PII / sensitive |
| `ai_explanation_rules[]` | What the assistant should/must not say about this page |
| `refusal_rules[]` | What AI must refuse on this page |

### 6.4 Per-Module AI Actions

Every AI-executable action must be registered in `AIActionRegistry` with a complete `AIActionDescriptor` (full spec: `54-ai-assistant-runtime.md §6`, canonical schema: `39-ai-architecture-consistency-pass.md`):

| Required field | Description |
|----------------|-------------|
| `action_id` | Unique: `<module_key>.<action_name>` |
| `label` / `description` | Human-readable |
| `required_permission` | RBAC permission string |
| `input_schema` / `output_schema` | JSON schema |
| `danger_level` | `low / medium / high / critical` |
| `voice_eligible` | `true / false` — required for every action |
| `confirmation_required` | `true / false` — required for every mutation |
| `approval_required` | `true / false` |
| `audit_required` | Always `true` for any execution |
| `rollback_action_id` | If reversible; `null` otherwise |

No unregistered action may be executed by the assistant.

### 6.5 AI Refusal Rules

Each module must document what the assistant must refuse. Examples:
- Insufficient permission for the requested action
- Module disabled for the org
- Tenant mismatch (target belongs to another org)
- High/critical action attempted via voice only
- Missing confirmation token
- Destructive action without approval
- PII access denied for requester's role
- Quota / billing unavailable
- Data source access denied

### 6.6 Voice Capability Rules

- Voice uses the same backend authorization as chat — no shortcuts.
- One action per voice turn.
- Read-back before confirmation for any execution.
- High/critical actions escalate to UI — voice never executes them directly.
- No bulk destructive actions by voice.
- No hard delete by voice.
- No system-level dangerous action by voice unless explicitly voice-allowlisted and UI-confirmed.
- Ambiguous request → ask clarification.
- Silence or timeout → cancel pending confirmation, do not execute.
- Never speak sensitive PII unless explicitly allowed by the user's role.

### 6.7 Chat Capability Rules

Chat may support any readiness level the module has declared and tested. Chat cannot bypass backend authorization for any reason. The model's output is guidance — the backend always re-checks (14 checks: `54-ai-assistant-runtime.md §8`).

### 6.8 Required declarations per module

In `docs/modules/<module_key>/AI_READINESS.md` (full template: `54-ai-assistant-runtime.md §10`):
- Current and target readiness level
- AI page contexts for every user-facing page
- AI action registry entries (if Level 3+)
- AI refusal rules
- Voice eligibility rules and escalation policy
- AI service routes (read-only backend routes the assistant may call)
- Exception declaration if AI readiness is not applicable

**The `ai_chat` and `voice_agent` columns in `03-module-migration-progress.md` must be updated after every module round.**

**A module cannot be marked `migrated` until `ai_chat != "not_started"` and the declared level has passing tests.**

Full module contract: `54-ai-assistant-runtime.md §10`
Full readiness level spec: `54-ai-assistant-runtime.md §14`
Required tests: `54-ai-assistant-runtime.md §11`

### §6.9 Global Capability Metadata Required

Every module must declare global capability metadata per `55-ai-system-capability-knowledge-base.md §6.1`. This is tracked in `03-module-migration-progress.md` column `capability_metadata`.

Fields required:
- `capability_summary`
- `business_use_cases`
- `target_users`
- `required_setup`
- `required_permissions`
- `ai_supported_explanations`
- `ai_supported_actions` (with `voice_supported_actions` subset)
- `recommended_dashboard_widgets`
- `related_data_sources`
- `related_integrations`
- `plan_or_license_requirements`
- `limitations`
- `security_notes`

A module cannot be marked `capability_metadata = complete` without all fields declared.

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

Violations of §5 (UX) and §7 (i18n) block a module from being marked **migrated** (but not from shipping an in-progress state).

**Violations of §6 (AI Assistant Readiness) block a round from being marked Done** if no AI/voice status is declared (even `exception_approved` counts). A module cannot be marked `migrated` without a tested readiness level.

Violations of §8 (Agent Collaboration) must be documented in the handoff summary and corrected in the next round.

**Cross-reference:** `01-round-review-checklist.md` maps these rules to reviewer checklist items.
