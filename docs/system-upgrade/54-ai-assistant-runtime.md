# 54 — AI Assistant Runtime

> Source of truth for the global chat AI assistant and voice agent runtime architecture.
> _Created: 2026-04-26 (R041-AI Addendum)_
> _Last updated: 2026-04-26_
>
> **Relationship to other AI docs:**
> - `36-ai-action-platform.md` — AI delegated action design, action registry, permission model
> - `38-floating-ai-assistant.md` — UI shell: drawer, lazy loading, route change behavior, session state
> - `39-ai-architecture-consistency-pass.md` — canonical terms: `AIActionDescriptor` v1, `voice_eligible`, capability levels
> - `40-ai-provider-gateway-billing.md` — gateway pipeline, `AIUsageLog`, billing metering
> - `55-ai-system-capability-knowledge-base.md` — global knowledge model, SystemCapability registry, SolutionTemplates, advisory flows, KB-01–KB-15 E2E tests
>
> **This doc (54)** is the runtime contract: how the chat assistant and voice agent behave end-to-end, from page load to executed action to audit row. When there is a conflict between this doc and docs 36/38/39/40, this doc wins for runtime behavior. Design rationale stays in those earlier docs.

---

## Core Invariants (Non-Negotiable)

> These rules apply to every part of the assistant runtime. Any implementation that violates them is wrong.

1. **No LLM call until user explicitly interacts.** The floating icon does not trigger any API call, context fetch, or LLM call on page load or route change.
2. **Context guidance only — backend always re-checks.** The AI capability context in the prompt is guidance to the model. The backend re-checks every permission, module state, tenant scope, and rate limit at execution time.
3. **`org_id` always from auth.** Never from the AI's output, request body, or prompt. The model cannot inject a different tenant.
4. **AI is a proxy for the authenticated human.** It cannot hold permissions the human does not have.
5. **Every execution produces an audit row.** `AIActionInvocation` row for every action. No "fire and forget" path.
6. **Every LLM/STT/TTS call writes `AIUsageLog`.** Through `AIProviderGateway.call()` only.
7. **Voice is strictly limited.** One action per turn, read-back before confirm, high/critical escalate to UI, no bulk destructive, no hard delete, no system action without explicit voice allowlist + UI confirmation.
8. **No unregistered action execution.** The model cannot execute a function that is not in the `AIActionRegistry`.

---

## 1. Global Chat Assistant

### 1.1 What it is

A persistent floating UI element visible on every authenticated platform-ui page. It:
- Opens into a side drawer/panel on user click
- Maintains a session-persistent conversation (survives route changes)
- Knows the current page through a lightweight registry (no API call per page)
- Can explain any registered page, field, or action
- Can propose and execute AI-registered actions on behalf of the authenticated user
- Uses `AIProviderGateway` for every LLM call
- Records every call in `AIUsageLog`

### 1.2 Lifecycle

```
[page load]
  → render FloatingAIButton (static icon, badge from Zustand store)
  → NO API call. NO LLM call. NO context fetch.
  → NO: GET /api/ai/context

[user clicks floating icon — first time in session]
  → open AIAssistantDrawer
  → GET /api/ai/context   ← loads UserCapabilityContext
  → session initialized in Zustand (conversationId, capabilities, context_version)

[user navigates to another page]
  → currentPageId updated in Zustand store (local only)
  → lastPageContextHash recomputed (local only)
  → NO API call. NO LLM call.
  → if activeObjective exists: assistant shows context-aware prompt on next open

[user sends first message after navigation]
  → if lastPageContextHash changed since last LLM message:
      attach PageContextDiff to message
  → POST /api/ai/chat (with conversationId + capability context)
  → AIProviderGateway.call() → LLM response
  → AIUsageLog row written

[user closes drawer]
  → session state preserved in Zustand
  → conversationId preserved
  → next open: restore conversation without fetching context again
     (unless context_version has changed → force re-fetch)

[org switch or auth expiry]
  → full session reset (conversationId, capabilities, pageContext, objective all cleared)
```

### 1.3 What the assistant can do

| Capability | Rule |
|-----------|------|
| Explain page purpose | Using `aiPageContext.description` from module registry — no LLM needed |
| Explain field | Using `aiPageContext.fields[].help_text` from module registry |
| List available actions | From `UserCapabilityContext.available_actions` |
| Explain why action is disabled | From `UserCapabilityContext.unavailable_action_categories` |
| Propose action | Maps user intent → `AIActionRegistry` → creates proposal |
| Execute low-risk action | After user confirmation — no explicit approval token |
| Execute medium-risk action | After explicit typed/click confirmation |
| Execute high-risk action | After reason + UI confirmation modal |
| Execute critical action | After typed phrase + manager approval if configured |
| Explain data in current view | From `aiPageContext.data_context` (non-PII fields only) |

### 1.4 What the assistant must NOT do

- Execute any action not in `AIActionRegistry`
- Use `org_id` from anywhere other than auth context
- Return PII to a user who lacks the `pii.view` permission on that field
- Expose internal error messages or stack traces in responses
- Self-confirm an action (AI cannot be the actor and the confirmer)
- Expose other orgs' data even if accidentally in context
- Make decisions about permission using only the prompt — must defer to backend

---

## 2. Voice Agent

### 2.1 What it is

The voice agent uses the same `AIActionRegistry`, `UserCapabilityContext`, and backend authorization as the chat assistant. The difference is in its safety limits, turn structure, and escalation policy.

The voice path: Mobile App → WebRTC → STUNner TURN → voice-edge (EKS) → mobile-voice-gateway (EKS) → Gemini Live API → action execution → billing

### 2.2 Voice-specific safety limits

| Rule | Detail |
|------|--------|
| One action per turn | Voice agent proposes one action at a time, waits for confirmation |
| Read-back before confirm | Agent reads back the action, target, and parameters before asking for confirmation |
| No bulk destructive actions | `BULK` actions with `danger_level >= medium` are `voice_ineligible` |
| No hard delete by voice | `DELETE_HARD` is always `voice_ineligible` |
| High/critical → escalate to UI | Voice reads out the escalation: "This action requires approval in the app" — does not execute |
| No system-level action | `SYSTEM` tier actions are `voice_ineligible` unless explicitly in the voice allowlist and confirmed through UI |
| Max voice-eligible actions per turn | 8 (from `UserCapabilityContext.voice_action_ids`) |
| PII never spoken proactively | Only speaks PII if user explicitly requests it and has `pii.view` permission |
| No session transfer across agents | Voice session is owned by the authenticated user; no handoff to a different user's session |

### 2.3 Voice action eligibility

An action is `voice_eligible: true` only if all conditions are met:
1. `AIActionDescriptor.voice_eligible == true` (explicitly set in registry)
2. Action's `danger_level < "critical"` (critical always escalates)
3. Action's `capability_level != "SYSTEM"`
4. Action does not require bulk input
5. User has the required permission (`required_permission` check passes)

### 2.4 Voice confirmation flow

```
voice agent: "I'll deactivate user Alice. Shall I proceed?"
user (voice): "Yes"
  → backend: validate confirmation + check permission
  → execute AIAction
  → audit row: AIActionInvocation (confirmed_via: "voice")
  → voice agent: "Done. Alice has been deactivated."

# For high-risk:
voice agent: "This action is high risk. Please confirm in the platform app."
  → pending_ui_confirmation token created
  → voice agent waits or moves on
  → user confirms in UI
  → execution proceeds
```

### 2.5 Voice billing

Every voice session is metered via `AIProviderGateway` and `AIUsageLog`:
- STT: `capability="transcription"`, `feature_id="voice_session"`
- TTS: `capability="tts"`, `feature_id="voice_session"`  
- LLM response generation: `capability="chat"`, `feature_id="voice_agent"`
- Voice usage is org-attributed and quota-governed

---

## 3. Page Context Registry

### 3.1 What it is

Every module/page that wants assistant support must declare an `aiPageContext` object. This is static metadata registered at build time — no API call per page load.

### 3.2 Structure

```typescript
interface AIPageContext {
  page_id: string;            // unique: "helpdesk.tickets.list"
  module_key: string;         // "helpdesk"
  title: string;              // i18n key: "helpdesk.tickets.title"
  description: string;        // plain text or i18n key
  fields?: AIFieldContext[];   // table columns or form fields
  available_actions?: string[];// action_ids from AIActionRegistry
  dangerous_actions?: string[];// action_ids with danger_level >= medium
  help_text?: string;          // contextual help for this view
  data_context?: string;       // what data is visible: "active tickets for org"
  ai_explanation_rules?: string[];// "explain SLA means X", "field 'status' means..."
  pii_fields?: string[];       // field names that are PII — assistant must check pii.view
  refusal_rules?: string[];    // "never suggest deleting tickets in bulk"
  i18n_keys?: string[];        // translation keys for this page
}

interface AIFieldContext {
  field_name: string;
  label: string;             // i18n key
  help_text: string;         // what this field means
  is_pii: boolean;
  example?: string;          // example value to help model understand
}
```

### 3.3 Where it lives

- Per-module: declared in `lib/modules/<module_key>/ai-page-contexts.ts` (or inline in each page component via `useRegisterPageContext()`)
- Registered globally via `AIPageContextRegistry` (Zustand store + optional server registry)
- Accessed by the assistant via `GET /api/ai/page-context?page_id=<id>` (if server-side) or from local store

### 3.4 What the assistant uses it for

| User asks | Assistant uses |
|-----------|---------------|
| "What is this page?" | `aiPageContext.description` |
| "What does this field mean?" | `aiPageContext.fields[name].help_text` |
| "What can I do here?" | `aiPageContext.available_actions` → filter by user permissions |
| "Why is this button disabled?" | `UserCapabilityContext.unavailable_action_categories` |
| "Explain the SLA column" | `aiPageContext.ai_explanation_rules` |

### 3.5 Module contract

A module that does not declare `aiPageContext` for its pages will:
- Have the assistant say "I don't have context for this page yet"
- Not be able to offer page-specific help or actions
- Have `ai_chat` column in `03-module-migration-progress.md` marked `not_ready`

This is acceptable for early implementation phases. All modules must eventually declare contexts.

---

## 4. User Capability Context

### 4.1 What it is

A server-generated, org-scoped, user-specific capability snapshot. It tells the AI model:
- Who the user is
- What they're allowed to do
- What they're NOT allowed to do (categories, not specific action IDs)
- What modules are enabled for their org
- What billing/quota constraints apply
- What voice actions are available

### 4.2 Structure

```python
class UserCapabilityContext:
    # Identity
    user_id: int
    org_id: int
    username: str
    display_name: str
    roles: list[str]          # ["technician", "manager"]

    # Available actions (role-filtered from AIActionRegistry)
    available_actions: list[AIActionSummary]  # id, label, description, danger_level, voice_eligible
    unavailable_action_categories: list[str]  # safe strings only — no action IDs of denied actions
    voice_action_ids: list[str]               # subset of available_actions where voice_eligible=True (max 8)

    # Module/feature state
    enabled_modules: list[str]                # ["helpdesk", "users", "organizations"]
    feature_flags: dict[str, bool]            # {"ai_actions_enabled": True}
    data_source_access: list[str]             # data source IDs accessible to this user

    # PII / data visibility
    pii_visibility: dict[str, str]            # {"email": "masked", "phone": "hidden", "name": "visible"}

    # Quota / billing
    quota_state: QuotaState                   # {"chat_tokens_used": N, "chat_tokens_limit": N, "voice_minutes_used": N}

    # Context version (for staleness detection)
    context_version: int                      # incremented on role/module/flag/deactivation changes
    generated_at: datetime
```

### 4.3 Server-side generation

`GET /api/ai/context` builds `UserCapabilityContext` from:
1. JWT claims: `user_id`, `org_id`, `roles`, `permissions`
2. DB: `OrgModule` state (which modules are enabled)
3. DB: `FeatureFlag` state (which AI features are enabled)
4. DB: `AIActionRegistry` (filtered to user's role/permissions)
5. DB: `AIUsageLog` / quota system (current billing/quota state)
6. Redis: cached result, keyed by `context_version:{user_id}:{org_id}` (5 min TTL)

### 4.4 Context staleness

`context_version` is incremented when any of these change:
- User's role assignment changes
- Module enabled/disabled for org
- Feature flag toggled
- User deactivated/reactivated
- Org deactivated
- User's permissions explicitly changed

**Stale context flow:**
```
client sends request with context_version=5
server has context_version=6 (updated)
  → server returns 409 { error: "context_stale", current_version: 6 }
client re-fetches: GET /api/ai/context
  → session updated, conversation continues
```

### 4.5 What the frontend must NOT do

- The frontend must not derive permissions from the context — context is for prompt construction, not access control
- The frontend must not send `org_id` in the request body to derive tenant
- The frontend must not cache context across sessions (across logins)
- The frontend must not expose `context_version` to the model as a trust signal

---

## 5. Action Proposal Flow

```
1. User sends message: "Deactivate Alice from the support team"

2. Backend: intent mapping
   LLM called with capability context + page context
   → maps intent to action_id: "users.deactivate"
   → extracts parameters: {user_id: 42} (from page context or confirmed by user)

3. Backend: parameter validation
   - user_id 42 exists? ✅
   - user 42 belongs to org? ✅
   - target user is not the requesting user? ✅

4. Backend: permission check (re-check — not from prompt)
   - requesting user has "users.write" permission? ✅
   - module "users" is enabled for org? ✅
   - action "users.deactivate" is registered? ✅
   - danger_level: "medium" → requires explicit confirmation

5. Backend: create action proposal
   POST /api/ai-actions/propose
   → returns: AIActionProposal { action_id, params, danger_level, confirmation_required }

6. UI: render proposal
   AIActionPreviewCard shows:
   - Action: Deactivate User
   - Target: Alice Johnson (alice@example.com)
   - Danger level: Medium
   - Confirmation required: yes
   - [Confirm] [Cancel]

7. User: clicks Confirm

8. Backend: execute with confirmation token
   POST /api/ai-actions/confirm { proposal_id, confirmation_nonce }
   → Re-checks all permissions (not from cache)
   → Executes users.deactivate(user_id=42, org_id=g.jwt_user.org_id)
   → Writes audit row: AIActionInvocation (confirmed_via: "chat_ui")
   → Writes usage log: AIUsageLog (for LLM call that mapped intent)

9. Result returned to chat:
   "Alice Johnson has been deactivated. She can no longer log in."
```

---

## 6. Action Registry

Every AI-executable action must be registered. No unregistered action can be executed.

### 6.1 AIActionDescriptor (canonical v1 — from `39-ai-architecture-consistency-pass.md §05`)

| Field | Type | Description |
|-------|------|-------------|
| `action_id` | `str` | Globally unique: `"module_key.action_name"` |
| `module_key` | `str` | Owning module |
| `label` | `str` | Human-readable action name (i18n key) |
| `description` | `str` | What this action does |
| `required_permission` | `str` | Permission key required (e.g. `"users.write"`) |
| `input_schema` | `dict` | JSON Schema for parameters |
| `output_schema` | `dict` | JSON Schema for result |
| `danger_level` | `DangerLevel` | `low / medium / high / critical` |
| `capability_level` | `str` | `READ / CREATE / UPDATE / DELETE_SOFT / DELETE_HARD / CONFIGURE / APPROVE / EXECUTE / BULK / SYSTEM` |
| `voice_eligible` | `bool` | Can this action be executed via voice? |
| `confirmation_required` | `bool` | Must user confirm before execution? |
| `approval_required` | `bool` | Must a manager/admin approve? |
| `reason_required` | `bool` | Must user provide a reason? |
| `audit_required` | `bool` | Always `true` — all actions are audited |
| `rate_limit` | `RateLimit` | `{requests: N, window_seconds: N}` |
| `idempotency_key_strategy` | `str` | `"none" / "action+target" / "action+params_hash"` |
| `rollback_action_id` | `str \| None` | Action to undo this operation (if reversible) |
| `handler` | `callable` | Backend function reference |
| `min_role_rank` | `int` | Minimum role rank required |
| `max_batch_size` | `int` | For BULK actions |
| `module_required` | `bool` | Module must be enabled to execute |
| `license_required` | `str \| None` | License type required (if any) |
| `feature_flag_required` | `str \| None` | Feature flag key required |

### 6.2 Where actions are registered

- `apps/ai_action_platform/platform_actions.py` — platform-level actions (users, orgs, roles, modules, audit)
- `apps/<module>/ai_actions.py` — per-module actions (loaded by registry on startup)
- `AIActionRegistry` scans all registered modules at startup and builds the registry

### 6.3 What happens if action not in registry

The backend returns `{ error: "action_not_registered", action_id: "..." }`. The action is not executed. This prevents prompt injection from manufacturing fake actions.

---

## 7. Confirmation and Approval Policy

| Danger Level | Chat behavior | Voice behavior |
|-------------|--------------|----------------|
| `low` | Execute with inline confirmation ("Done: ...") | Execute with read-back and voice "Yes" confirm |
| `medium` | Show `AIActionPreviewCard`, user clicks Confirm | Read-back + voice confirm ("Yes/Confirm") |
| `high` | Show modal + require reason text + click Confirm | Escalate to UI: "Please confirm this action in the app" |
| `critical` | Show modal + typed phrase + optional manager approval | Always escalate to UI — never execute via voice |

### 7.1 Confirmation token

For `medium` and above:
1. Backend issues a `ConfirmationToken` (UUID, single-use, TTL=5min)
2. Token sent to frontend with proposal
3. Frontend sends token with confirm request
4. Backend validates: token exists, not expired, not used, action matches

### 7.2 Approval queue

For `approval_required: true`:
1. Backend creates `AIActionApprovalRequest` row
2. Notification sent to approvers (manager or admin)
3. Approver clicks approve/deny in UI
4. Backend executes action with approver's `confirmed_by_user_id`
5. Audit row includes both requester and approver

### 7.3 Session does not bounce on failed approval

After failed post-approval execution: `status='failed'` + notification to user. Session does NOT go back to "waiting for approval" (click-fatigue avoidance — documented in `CLAUDE.md §Helpdesk Approval Policy`).

---

## 8. Backend Authorization Re-Check

Before executing ANY action, the backend must verify all of the following. This is a mandatory re-check — the prompt context is NOT trusted.

```python
def pre_execution_checks(action_id, params, requesting_user, confirmation_token=None):
    checks = [
        ("user_active", requesting_user.is_active),
        ("org_active", requesting_user.org.is_active),
        ("user_belongs_to_org", requesting_user.org_id == g.jwt_user.org_id),
        ("module_enabled", OrgModule.is_enabled(action.module_key, requesting_user.org_id)),
        ("license_valid", check_license(action.license_required, requesting_user.org_id)),
        ("feature_flag", FeatureFlag.is_enabled(action.feature_flag_required, requesting_user.org_id)),
        ("permission_granted", requesting_user.has_permission(action.required_permission)),
        ("target_in_org", verify_target_org_scope(params, requesting_user.org_id)),
        ("action_not_disabled", not action.is_disabled),
        ("danger_policy", check_danger_policy(action.danger_level, confirmation_token)),
        ("confirmation_valid", validate_confirmation_token(confirmation_token)),
        ("rate_limit", check_rate_limit(action_id, requesting_user.org_id)),
        ("quota_ok", check_quota(requesting_user.org_id)),
        ("audit_available", True),  # audit write must not fail silently
    ]
    for name, result in checks:
        if not result:
            raise ActionDenied(name)
```

Any failed check returns a safe error (no internal detail exposed to client). The error is returned to the chat assistant as a structured denial — the model is instructed to relay only the user-safe denial reason.

---

## 9. Audit and Billing

### 9.1 Every action must record

`AIActionInvocation` row (in `apps/ai_action_platform/models.py`):

| Field | Value |
|-------|-------|
| `id` | UUID |
| `user_id` | Requesting user (never AI agent's own ID) |
| `org_id` | From JWT |
| `module_key` | Action's module |
| `action_id` | Registered action ID |
| `session_type` | `"chat"` or `"voice"` |
| `conversation_id` | Current conversation UUID |
| `input_summary` | Sanitized non-PII summary of parameters |
| `status` | `success / denied / confirmation_failed / approval_denied / error` |
| `confirmed_via` | `"chat_ui" / "voice" / "approval_queue" / None` |
| `confirmed_by_user_id` | For approved actions: approver's user_id |
| `correlation_id` | `X-Request-Id` from request |
| `created_at` | UTC timestamp |

**Rules:**
- No raw PII in `input_summary` (hash/redact sensitive field values)
- No API keys, tokens, or passwords in any audit field
- Audit write failure must roll back the action execution

### 9.2 Every LLM/STT/TTS call must record

`AIUsageLog` row via `AIProviderGateway`:

| Field | Value |
|-------|-------|
| `org_id` | From JWT |
| `user_id` | Requesting user |
| `module_id` | `"floating_assistant"` or `"voice_agent"` |
| `feature_id` | `"chat"` / `"voice_session"` / `"action_proposal"` etc. |
| `capability` | `"chat"` / `"tts"` / `"transcription"` |
| `provider` / `model` | Resolved by gateway |
| `input_tokens` / `output_tokens` | From provider response |
| `estimated_cost_usd` | Computed by billing adapter |
| `conversation_id` | Current conversation UUID |
| `session_id` | Voice session ID if applicable |
| `correlation_id` | `X-Request-Id` |

---

## 10. Module Contract for AI/Voice Readiness

A module is NOT done until it has declared its AI/voice readiness. Minimum required:

### 10.1 Required declarations per module

In `docs/modules/<module_key>/AI_READINESS.md`:

```markdown
## Module: <module_key>

### AI Page Contexts
For each page in this module:
- page_id: <module_key>.<page_type>  (e.g. "helpdesk.tickets.list")
- fields documented: yes / no / partial
- ai_explanation_rules: [...]
- pii_fields: [...]

### AI Actions
| action_id | label | danger_level | voice_eligible | status |
|-----------|-------|-------------|----------------|--------|
| module.action | Label | low/medium/high/critical | yes/no | registered/planned/not_applicable |

### AI Service Routes
Routes the assistant may call for read-only data (no auth bypass):
- GET /api/<module>/... — returns [...] — used for [...]

### Voice Capability
- voice_eligible actions: [list or "none"]
- escalation policy: [describe]
- refusal list: [what AI must refuse via voice]

### Refusal Rules
- [rule 1]
- [rule 2]

### AI Permission Requirements
| action_id | required_permission |
|-----------|-------------------|
```

### 10.2 Status in `03-module-migration-progress.md`

The `ai_chat` and `voice_agent` columns must be set per module:

| Status | Meaning |
|--------|---------|
| `not_applicable` | Module has no AI interaction surface (e.g. system-only config module) |
| `not_declared` | AI readiness not yet declared |
| `declared` | `AI_READINESS.md` exists with minimum fields |
| `page_contexts_registered` | `aiPageContexts` registered in code |
| `actions_registered` | `aiActions` registered in `AIActionRegistry` |
| `tested` | AI action + denial tests pass |
| `voice_ready` | Voice eligibility declared, voice tests pass |

**A module cannot be marked `migrated` until `ai_chat != "not_declared"`.**

---

## 11. Required Tests

Every module that implements AI/voice features must have:

### 11.1 Chat assistant tests

| Test | What it proves |
|------|---------------|
| Page explanation works | `GET /api/ai/page-context?page_id=<id>` returns correct context |
| AI action allowed for authorized user | Action executes successfully, audit row written |
| AI action denied for unauthorized user | `403` returned, no execution, audit denial row written |
| AI cannot access disabled module | `409 module_disabled` returned |
| AI cannot cross tenant boundary | Target in another org → `403 target_scope_violation` |
| AI cannot execute unregistered action | `400 action_not_registered` |
| AI action creates audit row | `AIActionInvocation` row exists with correct fields |
| AI LLM call creates usage log | `AIUsageLog` row exists, org_id correct |
| Stale context returns 409 | Increment `context_version` → next request returns `409 context_stale` |
| No LLM call on page load | Assert no LLM call fired until user opens assistant |

### 11.2 Voice agent tests

| Test | What it proves |
|------|---------------|
| Voice refuses `voice_ineligible` action | `voice_ineligible` error, no execution |
| Voice refuses high-risk action | Escalation response, no execution, pending UI token created |
| Voice confirms low-risk action | Read-back → voice confirm → execute → audit row |
| Voice session billing recorded | `AIUsageLog` rows for STT + TTS + LLM |
| Bulk destructive via voice denied | `voice_ineligible` error |
| Hard delete via voice denied | `voice_ineligible` error |

### 11.3 Integration tests (cross-module)

| Test | What it proves |
|------|---------------|
| Conversation context persists across route navigation | Send message, navigate, send another message → same `conversationId` |
| Org switch clears session | Switch org → `conversationId` reset, capability context re-fetched |
| Permission revoked mid-session | User loses permission during session → next action attempt returns `403` |

---

## 12. Implementation Phases

| Phase | Scope | Prerequisite | Tracks |
|-------|-------|-------------|--------|
| **Phase A** — Page Context Registry + chat shell | `useRegisterPageContext()` hook, `AIPageContextRegistry` Zustand store, `FloatingAIButton`, `AIAssistantDrawer` (no LLM) | R032 implementation | `38 §04`, `38 §05` |
| **Phase B** — Capability Context + read-only assistant | `GET /api/ai/context` endpoint, `UserCapabilityContext` model + generation, first LLM message send, page explanation | R033 | `38 §07`, `36 §23-§32` |
| **Phase C** — Action Proposal UI + low-risk actions | `AIActionRegistry` backend, `AIActionProposal` + `ConfirmationToken`, `AIActionPreviewCard`, low-risk action execute | R027 + R028 | `36 §05-§09` |
| **Phase D** — Dangerous action confirmations + audit | Medium/high/critical confirmation flow, `AIActionInvocation` model, audit write mandatory, voice escalation | R028 + R030 | `36 §09`, `39 §11` |
| **Phase E** — Voice agent with strict action limits | Voice eligibility filter, voice confirmation flow, voice billing, voice audit | R029 | `39 §05`, `36 §35-§40` |
| **Phase F** — Module onboarding + personalization | Module-specific page context declarations, onboarding assistant, personalization signals | After Phase E | — |

---

## 13. Enforcement Rules for Future Rounds

> Any round that adds a new module page or page-level interaction:

- [ ] `aiPageContext` declared for every new page in `ai-page-contexts.ts`
- [ ] `AI_READINESS.md` updated for the module
- [ ] `ai_chat` column in `03-module-migration-progress.md` updated

> Any round that adds a new AI-executable action:

- [ ] Action registered in `AIActionRegistry` with complete `AIActionDescriptor`
- [ ] `danger_level`, `voice_eligible`, `confirmation_required` all explicitly set
- [ ] Test exists: authorized user can execute, unauthorized user gets `403`
- [ ] Audit row assertion in test

> Any round that implements voice interaction:

- [ ] Voice safety limits listed in `AI_READINESS.md`
- [ ] `voice_eligible: false` set on any action that must not be voice-accessible
- [ ] Escalation flow for high/critical actions tested
- [ ] Voice billing (`AIUsageLog` for STT + TTS + LLM) tested

> Any round that changes `UserCapabilityContext` generation:

- [ ] `context_version` increment event documented
- [ ] Stale context test updated
- [ ] Cache invalidation strategy documented

---

## 14. AI Readiness Levels

Every module must declare its **current** and **target** readiness level. The level governs what the assistant can do on that module's pages.

| Level | Name | What the assistant can do |
|-------|------|--------------------------|
| **0** | Not Ready | No AI metadata. Assistant cannot help with this module. |
| **1** | Explainable | Assistant can explain the page, its purpose, its fields, and available actions. No execution. |
| **2** | Guided | Assistant can explain workflows, suggest next steps, and guide the user through multi-step flows. No execution. |
| **3** | Action Proposal | Assistant can propose actions and collect parameters but cannot execute — user must act manually. |
| **4** | Chat Action Ready | Chat can execute allowed actions through backend authorization and confirmation. Full audit trail required. |
| **5** | Voice Assist Ready | Voice can explain, guide, and propose actions. Limited low-risk execution with read-back and voice confirmation. |
| **6** | Voice Action Ready | Voice can execute approved low-risk actions and route high/critical actions to UI confirmation. Full voice billing required. |

### 14.1 Readiness level rules

- Level 0: module must not appear in the assistant's page context registry.
- Level 1–2: no action execution. Any attempt returns `{ error: "action_not_available" }`.
- Level 3: `AIActionDescriptor` entries required (even if `execute_enabled: false`).
- Level 4+: `AIActionDescriptor` with `execute_enabled: true`, backend re-check (§8), audit row, `AIUsageLog` mandatory.
- Level 5–6: all of Level 4 plus `voice_eligible` declared per action, voice safety tests, voice billing wired.
- **A module may not claim a level it has not implemented and tested.**

### 14.2 Declaring level in module docs

In `docs/modules/<module_key>/AI_READINESS.md`:

```markdown
## AI Readiness Level

| Field | Value |
|-------|-------|
| current_level | 0 / 1 / 2 / 3 / 4 / 5 / 6 |
| target_level | 0 / 1 / 2 / 3 / 4 / 5 / 6 |
| target_round | RXXX |
| exception | "none" or reason + approval reference |
```

Exceptions (staying at Level 0 permanently) require documented reason and a follow-up issue.

### 14.3 Progress tracker status values

The `ai_chat` and `voice_agent` columns in `03-module-migration-progress.md` must use:

| Status | Meaning |
|--------|---------|
| `not_started` | No AI metadata (Level 0) |
| `not_applicable` | No user-facing pages (system-only, infra module) |
| `exception_approved` | Documented exception — AI not required, approved with issue ref |
| `read_only_ready` | Level 1–2: page context declared, explanation tested |
| `action_ready` | Level 3–4: actions registered, execution tested |
| `voice_ready` | Level 5–6: voice eligible actions declared and tested |
| `blocked` | Blocked on dependency — reason documented in tracker |
| `tested` | All required tests for the declared level pass and are documented |

---

## 15. AI Assistant Test Harness (Planned)

A future automated test harness will verify every module's AI/voice support without requiring a live LLM.

### 15.1 Purpose

The harness will:
- Load each module's `AI_READINESS.md` and validate completeness
- Load all `AIPageContext` declarations and validate required fields
- Load all `AIActionDescriptor` entries and validate schemas
- Cross-check declared permissions against `apps/authentication/rbac.py`
- Validate `voice_eligible` rules against danger level constraints
- Verify refusal rules are documented for every action
- Verify E2E coverage exists for the declared readiness level
- Fail CI if a module claims a readiness level without test evidence

### 15.2 Harness design (not yet implemented)

```
apps/tests/ai_readiness/
  run_harness.py                    — entry point, discovers all modules
  validators/page_context.py        — validates AIPageContext completeness
  validators/action_descriptor.py   — validates AIActionDescriptor schema
  validators/permission_cross_check.py — verifies permissions exist in RBAC
  validators/voice_policy.py        — validates voice eligibility rules
  validators/coverage_check.py      — verifies E2E coverage for claimed level
  reporters/evidence_matrix.py      — generates evidence matrix per module
```

### 15.3 Implementation trigger

Build the harness after Phase D (dangerous action confirmations + audit). Requires at least 3 modules with complete AI/Voice declarations before the harness has enough coverage to be useful.

**Tracking:** `docs/system-upgrade/15-action-backlog.md §AI Assistant Test Harness`

---

## 16. Relationship to Global System Capability Knowledge Base (doc 55)

The assistant runtime (this doc) handles the **execution side**: page context, action proposal flow, backend re-check, confirmation, audit, billing.

Doc 55 (`55-ai-system-capability-knowledge-base.md`) handles the **knowledge side**: what the platform can do, how to advise users, what to recommend.

**Integration rules:**
1. Advisory Mode uses doc 55 knowledge sources. No LLM execution in Advisory Mode.
2. Guided Operation Mode uses AIPageContextRegistry (§5 of this doc). Doc 55 provides module-level context.
3. Delegated Action Mode uses AIActionRegistry + runtime context (§6–§9 of this doc). Doc 55 identifies which actions exist; this doc governs execution.
4. When a user asks "what can I do?" — Advisory Mode answers using doc 55.
5. When a user asks to execute something — Delegated Action Mode applies this doc's re-check rules.
6. The distinction between global knowledge and runtime context (doc 55 §2) is enforced here: the backend never trusts what the model says it knows — it re-checks from DB/auth.
