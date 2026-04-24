# 39 — AI Architecture Consistency Pass

_Round 028 — 2026-04-24_
_Status: Complete. This document is the canonical reference for terminology, schemas, and security rules. All new implementation must follow this document, not earlier drafts in doc 36._

---

## §01 — Executive Summary

Rounds 024–027 built a complete AI Action Platform design across four architecture sessions. The design is sound but accumulated terminology conflicts across rounds. This consistency pass removes all ambiguity so the first implementer reads one canonical truth rather than four overlapping documents.

**What changed:**
- `risk_tier` retired. `capability_level` is canonical.
- `voiceInvocable` retired. `voice_eligible` is canonical.
- `handler_type` / `handler_config` retired in v1 schema. `executor_type` / `executor_ref` are canonical.
- `module` field renamed to `module_id`. `name` field renamed to `label`.
- Canonical `AIActionDescriptor v1` defined with 30 fields (replaces old 14-field and 25-field drafts).
- Canonical voice policy table defined (replaces three conflicting partial statements).
- Delegation token design declared as implementation blocker.
- Prompt injection / tool definition safety rules added.
- Rollback and partial failure policy added.
- Prompt-is-guidance-only warning made explicit in every relevant section.

---

## §02 — Ambiguities Found

| # | Location | Conflict |
|---|----------|---------|
| A1 | Doc 36 §05, §06, §11 | `risk_tier` ("READ", "WRITE_LOW", "WRITE_HIGH", "DESTRUCTIVE") coexists with `capability_level` (10-level taxonomy from §34). Two competing classification systems. |
| A2 | Doc 36 §09 | "`voiceInvocable`: only READ and WRITE_LOW with dangerLevel <= 'low'" contradicts §34/§39 voice eligibility formula which allows CREATE/UPDATE/APPROVE/EXECUTE at low/medium danger. |
| A3 | Doc 36 §09, §11, §23 | Field named `voiceInvocable` in three places; §35 correctly uses `voice_eligible`. Four different names across doc for the same boolean. |
| A4 | Doc 36 §05 `AIActionDescriptor` (14 fields) vs §35 (25 fields) | Two different dataclass schemas in the same document with different field names and coverage. No indication which is authoritative. |
| A5 | Doc 36 §05 uses `name: str`, §35 uses `name: str`, but canonical v1 spec requires `label` | Field name drift between Python dataclass and TypeScript `ModuleAIAction.label`. |
| A6 | Doc 36 §05 uses `module: str`, canonical v1 spec requires `module_id` | Naming inconsistency. |
| A7 | Doc 36 §05 uses `handler_type` / `handler_config`, v1 spec uses `executor_type` / `executor_ref` | Executor naming inconsistent between old and new schema. |
| A8 | Doc 36 §06 `check_delegated_permission()` checks `action.risk_tier == "DESTRUCTIVE"` | References retired `risk_tier`. Implementation following §06 would break against §35 registry. |
| A9 | Doc 36 §23 `AIActionSummary.voice_invocable: bool` | Snake-case old name; should match `voice_eligible` from §35. |
| A10 | Doc 36 §09 voice window "60s for voice" vs §08 "default 120s" | Token TTL not differentiated clearly in the base model. |
| A11 | No delegation token design | §36 says "service account needs signed delegated-human context token" with 7 fields listed, but no TTL, no signing key location, no replay protection, no revocation rule. Implementation cannot start safely. |
| A12 | No tool injection safety rules | Q9 in §22 asks whether LLM-as-tool-caller creates injection surface but leaves it open. No rule prevents LLM from influencing tool definitions. |
| A13 | No prompt-is-guidance-only boxed warning on `PageAIContext` (doc 38) or `AIUserCapabilityContext` (doc 36 §23) | Engineers reading fast may treat context injection as an auth mechanism. |
| A14 | No rollback/partial failure policy | §34 says "rollback expected" for certain levels but no concrete rules about partial failure handling in BULK actions. |
| A15 | `ModuleAIAction` in §11 uses `voiceInvocable: boolean` | TypeScript interface inconsistent with Python `voice_eligible`. |

---

## §03 — Ambiguities Fixed

| # | Fix | Location |
|---|-----|---------|
| A1 | `risk_tier` deprecated; `capability_level` canonical everywhere | §04 canonical terms, §36 §05/§06 marked deprecated |
| A2 | Voice policy table (§06 this doc) is the single truth | Supersedes §09 partial rule in doc 36 |
| A3 | `voice_eligible: bool` canonical everywhere | All instances of `voiceInvocable` / `voice_invocable` → `voice_eligible` |
| A4 | `AIActionDescriptor v1` (§05 this doc) is the canonical schema | Doc 36 §05 old schema marked "pre-v1 draft" |
| A5/A6/A7 | v1 canonical field names: `module_id`, `label`, `executor_type`, `executor_ref` | §05 canonical schema below |
| A8 | `check_delegated_permission()` must use `capability_level` + `required_permissions`; not `risk_tier` | §37 in doc 36 (22-check viability) is now authoritative; §06 marked deprecated |
| A9 | `AIActionSummary.voice_eligible: bool` | §09 fix in this doc; doc 36 §23 updated |
| A10 | `confirmation_ttl_seconds` per-descriptor; `voice_confirmation_ttl_seconds` separate field | §05 canonical schema has both |
| A11 | Delegation token design placeholder (§08 this doc) — implementation blocker | Blocks all write-tier AI actions |
| A12 | Tool definition safety rules (§09 this doc) — mandatory before any LLM tool-calling integration | |
| A13 | Prompt-is-guidance-only warning (§10 this doc) — must appear in every section that describes context injection | |
| A14 | Rollback and partial failure policy (§11 this doc) | |
| A15 | `ModuleAIAction.voice_eligible: boolean` canonical | |

---

## §04 — Canonical Terms

> **These are the terms. Use them. Do not introduce synonyms.**

| Canonical Term | Retired Terms | Where Used |
|---------------|---------------|-----------|
| `capability_level` | `risk_tier`, `write_tier`, `risk_level` | `AIActionDescriptor v1`, permission checks, audit |
| `voice_eligible` | `voiceInvocable`, `voice_invocable`, `voice_allowed` | `AIActionDescriptor v1`, `ModuleAIAction`, `AIActionSummary` |
| `module_id` | `module` (field name) | `AIActionDescriptor v1` |
| `label` | `name` (display name field) | `AIActionDescriptor v1`, `ModuleAIAction` |
| `executor_type` | `handler_type` | `AIActionDescriptor v1` |
| `executor_ref` | `handler_config`, `handler_ref` | `AIActionDescriptor v1` |
| `executor_allowlist_policy` | `executor_allowlisted`, `allowed_hosts` | `AIActionDescriptor v1` |
| `delegated human token` | "signed context token", "delegation token" | §08 this doc |
| `AIActionDescriptor v1` | old 14-field schema (§05 doc 36), old 25-field schema (§35 doc 36) | Only v1 is canonical |

### `capability_level` allowed values (canonical — no others)

```
READ | CREATE | UPDATE | DELETE_SOFT | DELETE_HARD | CONFIGURE | APPROVE | EXECUTE | BULK | SYSTEM
```

### `risk_tier` retirement

`risk_tier` ("READ" | "WRITE_LOW" | "WRITE_HIGH" | "DESTRUCTIVE") was a preliminary classification used in doc 36 §05/§06/§11 before the 10-level `capability_level` taxonomy was defined.

**`risk_tier` is retired as of Round 028. All code and docs must use `capability_level`.**

Migration guide:

| Old `risk_tier` | New `capability_level` |
|----------------|----------------------|
| `READ` | `READ` |
| `WRITE_LOW` | `CREATE` or `UPDATE` (choose by action type) |
| `WRITE_HIGH` | `UPDATE` or `DELETE_SOFT` or `CONFIGURE` (choose by action type) |
| `DESTRUCTIVE` | `DELETE_SOFT` or `DELETE_HARD` or `BULK` (choose by reversibility) |

---

## §05 — Canonical AIActionDescriptor v1

This is the single authoritative schema for all AI-executable actions. All earlier schemas in doc 36 §05 and §35 are superseded by this definition.

```python
# apps/ai_action_platform/registry.py
# AIActionDescriptor v1 — DO NOT modify fields without a new version + ADR

@dataclass
class AIActionDescriptor:
    # ─── Identity ──────────────────────────────────────────────────────────
    action_id: str              # "module.verb" e.g. "users.deactivate"
    module_id: str              # "users" | "helpdesk" | "ala" | "agents" ...
    label: str                  # Hebrew/i18n display label
    description: str            # One-sentence description for AI context

    # ─── Capability & Risk ─────────────────────────────────────────────────
    capability_level: str       # READ|CREATE|UPDATE|DELETE_SOFT|DELETE_HARD|
                                # CONFIGURE|APPROVE|EXECUTE|BULK|SYSTEM
    danger_level: str           # "none" | "low" | "medium" | "high" | "critical"

    # ─── Authorization ─────────────────────────────────────────────────────
    required_permissions: list[str]   # all must be present (AND logic)
    required_roles: list[str]         # any one sufficient (OR logic)
    tenant_scope: str                 # "own_org" | "cross_org" | "platform"
    resource_scope: str               # "any" | "assigned" | "own" | "target_id_required"
    module_enabled_required: str | None  # module_id that must be enabled, or None

    # ─── Confirmation & Approval ───────────────────────────────────────────
    requires_confirmation: bool
    requires_reason: bool             # required for danger_level "high" | "critical"
    requires_approval: bool           # goes to approval queue (danger_level "high" | "critical")
    confirmation_ttl_seconds: int     # default 120
    voice_confirmation_ttl_seconds: int  # default 60 (shorter window for voice)

    # ─── Voice ─────────────────────────────────────────────────────────────
    voice_eligible: bool        # True only if eligibility formula passes (see §06)

    # ─── Bulk ──────────────────────────────────────────────────────────────
    bulk_allowed: bool          # whether batch execution is permitted
    max_batch_size: int         # max items per bulk call; default 1 when bulk_allowed=False
    bulk_requires_individual_audit: bool  # each item gets its own AIActionInvocation row

    # ─── Delete policy ─────────────────────────────────────────────────────
    hard_delete_allowed: bool   # False by default — requires platform policy + ADR
    soft_delete_reversal_action_id: str | None  # e.g. "users.reactivate"

    # ─── Rollback ──────────────────────────────────────────────────────────
    rollback_supported: bool    # if False and action is high-risk, UI must warn before exec
    rollback_action_id: str | None  # action_id to call for rollback

    # ─── Idempotency & Rate Limiting ───────────────────────────────────────
    idempotency_key_strategy: str  # "user+action+target" | "confirmation_token" | "custom"
    rate_limit_policy: str | None  # e.g. "10/org/min" | "5/user/hour" | None (unlimited)

    # ─── Executor ──────────────────────────────────────────────────────────
    executor_type: str          # "internal_function" | "http_api" | "celery_task"
    executor_ref: dict          # function ref, HTTP config, or task name
    executor_allowlist_policy: str  # "platform_internal" | "org_allowlist" | "none" (for internal only)

    # ─── Audit & Traceability ──────────────────────────────────────────────
    audit_event: str            # "module_id.action_verb" written on every execution attempt
    pii_redaction_policy: str   # "none" | "mask_email" | "redact_all" | "voice_safe"

    # ─── Result ────────────────────────────────────────────────────────────
    input_schema_id: str        # e.g. "users.deactivate.v1" — JSON Schema file
    output_schema_id: str       # e.g. "users.deactivate.result.v1" — JSON Schema file
    safe_result_summary: str | None  # template: "השבתת {user_name} בוצעה בהצלחה."

    # ─── Feature gating ────────────────────────────────────────────────────
    feature_flag: str | None    # optional flag that must be enabled
    org_id: int | None          # None = platform-wide; int = org-specific

```

### Field invariants

| Field | Rule |
|-------|------|
| `capability_level` | Must be one of the 10 canonical values. No extensions without ADR. |
| `danger_level` | Must be one of: "none", "low", "medium", "high", "critical". |
| `tenant_scope` | `cross_org` requires `system_admin` role. |
| `voice_eligible` | Must satisfy the eligibility formula in §06. Never set manually to `true` if formula would return `false`. |
| `hard_delete_allowed` | May not be `true` in any registry entry until a platform data-retention policy document exists. |
| `executor_allowlist_policy` | `"none"` is only valid for `executor_type="internal_function"`. `"http_api"` executors must be `"platform_internal"` or `"org_allowlist"`. |
| `rollback_supported` | Must be explicitly `false` (not null/undefined) if rollback is not available. |
| `bulk_requires_individual_audit` | Must be `true` whenever `bulk_allowed=true`. |

### Updated AIActionSummary (sent in AI context — no secrets)

```python
@dataclass
class AIActionSummary:
    action_id: str
    label: str
    description: str
    capability_level: str       # included so AI knows what kind of action this is
    danger_level: str
    requires_confirmation: bool
    requires_approval: bool
    voice_eligible: bool        # canonical name
    input_schema_id: str        # reference only — full schema fetched on demand
    # NOT included: executor_ref, executor_type, handler_config, auth secrets
```

### Updated ModuleAIAction (TypeScript module manifests)

```typescript
export interface ModuleAIAction {
  actionId: string;             // "module.verb"
  label: string;                // Hebrew/i18n display label
  description: string;
  capabilityLevel: string;      // one of 10 canonical values
  dangerLevel: DangerLevel;
  requiresConfirmation: boolean;
  voiceEligible: boolean;       // canonical camelCase name for TypeScript
  requiredRoles: string[];
  inputSchemaId: string;
  outputSchemaId: string;
  rollbackSupported: boolean;
}
```

---

## §06 — Canonical Voice Policy

This table is the **single authoritative voice policy**. It supersedes any partial rule in doc 36 §09 or elsewhere.

### Voice eligibility formula (unchanged from doc 36 §34/§39)

`voice_eligible = true` requires ALL of the following to be true:
1. `capability_level` ∈ {`READ`, `CREATE`, `UPDATE`, `APPROVE`, `EXECUTE`}
2. `danger_level` ∈ {"none", "low", "medium"}
3. `bulk_allowed = false`
4. `hard_delete_allowed = false`

`DELETE_SOFT`, `DELETE_HARD`, `CONFIGURE`, `BULK`, and `SYSTEM` capability levels are **never** voice-eligible regardless of danger_level.

### Voice policy by capability level

| Capability Level | Voice allowed? | Condition |
|-----------------|---------------|-----------|
| `READ` | ✅ Yes | If `voice_eligible=true` |
| `CREATE` | ✅ Yes | `danger_level` ≤ "medium" AND `voice_eligible=true`; explicit verbal confirmation if `requires_confirmation=true` |
| `UPDATE` | ✅ Yes | `danger_level` ≤ "medium" AND `voice_eligible=true`; explicit verbal confirmation if `requires_confirmation=true` |
| `APPROVE` | ✅ Yes | `danger_level` ≤ "medium" AND `voice_eligible=true`; high-risk approvals require UI dashboard |
| `EXECUTE` | ✅ Yes | `danger_level` ≤ "medium" AND `voice_eligible=true`; long-running or destructive execution requires UI/approval |
| `DELETE_SOFT` | ❌ Never voice-only | Must use UI confirmation dialog; AI may propose but user completes via UI |
| `DELETE_HARD` | ❌ Never voice | No exceptions. Ever. |
| `CONFIGURE` | ❌ Never voice-only | Must use UI confirmation dialog |
| `BULK` | ❌ Never voice-only | No exceptions. Even if underlying action is READ. |
| `SYSTEM` | ❌ Never voice-only | No exceptions. |

### Voice policy by danger level

| Danger Level | Voice behavior |
|-------------|---------------|
| `none` | Executes directly if no confirmation required |
| `low` | Executes directly; if `requires_confirmation=true`, verbal confirm required |
| `medium` | Verbal confirmation required before execution; AI reads back action + target |
| `high` | Never via verbal confirm alone — requires UI tap or dashboard approval queue |
| `critical` | Never speech-only under any circumstances |

### Voice-specific execution rules

1. `voice_eligible=false` → action is never proposed in voice session
2. `danger_level >= "high"` → queued to approval dashboard; user told "this requires review"
3. AI must read back action name + affected resource name before requesting confirmation
4. Voice confirmation window: `voice_confirmation_ttl_seconds` (default 60s, shorter than 120s chat)
5. Silence for 10s or "cancel" → token marked `denied`; session continues; AI may not re-propose same action for 60s
6. One action per voice turn — AI never proposes two actions simultaneously in voice mode
7. Confirmation token `confirmed_via` field must be set to `"voice"` for all voice confirmations

---

## §07 — Delegated Human vs AI Service Account

### Canonical distinction

| Identity | Auth | Business authority |
|---------|------|-------------------|
| **Authenticated human user** | JWT with real `user_id` | Full authority per their role and permissions |
| **AI session acting for human** | Human JWT + valid delegated context | Inherits human's authority exactly — no more, no less |
| **`ai_agent` service account** | JWT with `is_ai_agent=True` | Infrastructure READ only — no business writes |

### AI service account is infrastructure identity only

`is_ai_agent=True` in the JWT means the JWT was issued to a service account (e.g., a Celery worker, an ALA voice gateway process, a test harness). This identity has **no business authority by itself**.

Service accounts may only perform:
- Pre-authorized internal READ operations (health checks, status lookups, queue depth reads)
- Operations explicitly annotated in the registry as `required_roles=["ai_agent"]` with `capability_level=READ`

Service accounts may NOT:
- Execute CREATE, UPDATE, DELETE_SOFT, CONFIGURE, APPROVE, EXECUTE, BULK, or SYSTEM actions
- Request confirmation tokens
- Approve pending actions
- Access another user's capability context

### All business writes require a delegated human token

When an AI session executes a write action, it must present a valid **delegated human token** alongside the JWT. The backend verifies the token and re-checks the **current** human user's permissions at execution time.

A delegated human token containing a user who has since been deactivated or had their role changed must be rejected. The token is not a permission cache — it is an assertion that the human authorized this specific action. The backend still re-checks live permissions.

---

## §08 — Delegation Token Design Placeholder

> **IMPLEMENTATION BLOCKER.** No write-tier AI action may ship to production until this design is reviewed, approved, and the signing infrastructure is in place.

This section defines the required design. It does NOT implement crypto. The signing key location, library, and rotation policy must be decided before implementation begins.

### Token claims (required minimum)

```
{
  "sub": "<human_user_id>",
  "org_id": <org_id>,
  "session_id": "<ai_session_id>",
  "action_id": "<action_id being authorized>",
  "parameters_hash": "<SHA-256 of canonicalized parameters JSON>",
  "issued_at": <unix_timestamp>,
  "expires_at": <unix_timestamp>,
  "nonce": "<UUID — single use>",
  "aud": "ai-action-platform",
  "iss": "<platform service identifier>"
}
```

### Design requirements (decisions required before implementation)

| Requirement | Decision needed |
|-------------|----------------|
| **Signing algorithm** | HS256 (shared HMAC secret) vs RS256 (asymmetric) |
| **Signing key location** | SSM Parameter Store `/platform/secrets/AI_ACTION_DELEGATED_KEY` (preferred) or per-service key |
| **Key rotation** | Rotation strategy without invalidating in-flight tokens |
| **Token TTL** | Must be shorter than the `confirmation_ttl_seconds` of the action (proposed: `min(action.confirmation_ttl_seconds, 90)`) |
| **Replay protection** | `nonce` stored in Redis with TTL = token TTL; reject if nonce already seen |
| **Nonce storage** | Redis key `delegated_token_nonce:{nonce}` with expiry = token TTL |
| **Action binding** | `action_id` in token must match `action_id` in invocation request |
| **Parameter hash binding** | `parameters_hash` in token must match SHA-256 of re-canonicalized request parameters |
| **Revocation / invalidation** | Token invalidated when: user deactivated, role changed, org deactivated, explicit revoke on `context_version` increment |
| **Audience/scope** | `aud: "ai-action-platform"` — token not valid for any other service |
| **Voice token TTL** | Must use `voice_confirmation_ttl_seconds` (default 60s) not standard TTL |

### Tests required before write-tier ships

- [ ] Expired token is rejected (HTTP 401)
- [ ] Already-used nonce is rejected (HTTP 409)
- [ ] Wrong `action_id` in token is rejected (HTTP 403)
- [ ] Parameter hash mismatch is rejected (HTTP 403)
- [ ] Deactivated user's token is rejected even if not expired (HTTP 403)
- [ ] Role-downgraded user's token is rejected even if not expired (HTTP 403)
- [ ] Token from org A cannot execute action in org B (HTTP 403)
- [ ] Voice token (60s) rejected after 61 seconds (HTTP 401)

---

## §09 — Tool Definition / Prompt Injection Safety

> These rules are mandatory. No AI action integration may bypass them.

### Tool definitions are server-side only

1. **Tool definitions come only from the server-side AI Action Registry.** The LLM cannot define new tools.
2. **Tool schemas are read-only for the duration of the session.** The LLM cannot modify a tool's `input_schema`, `output_schema`, or any other descriptor field.
3. **The LLM may not choose executor endpoints directly.** It proposes `action_id` + `parameters` only. The backend selects the executor.
4. **LLM output is candidate intent only.** The backend validates parameters against `input_schema_id` (JSON Schema). Invalid parameters are rejected before any executor is called.
5. **Unauthorized tool schemas are never exposed to the LLM.** The `AIUserCapabilityContext.available_actions` contains only `AIActionSummary` objects for actions the current user is authorized to invoke. Actions for higher roles are omitted entirely — not listed as "unavailable".
6. **`executor_ref` and `executor_type` are never sent to the LLM.** Only `action_id`, `label`, `description`, `input_schema_id` are in `AIActionSummary`.
7. **User prompt cannot override action policy.** An action marked `voice_eligible=false` cannot be made voice-eligible by the user saying "just confirm it anyway" in conversation. Backend rejects at policy check.
8. **LLM output is treated as untrusted input** at the parameter layer — same validation rules as user-submitted form data.

### Prompt injection attack surfaces

| Surface | Mitigation |
|---------|-----------|
| Tool output containing injected instructions | Structured output only; tool results are JSON parsed, not text-interpolated into prompts |
| User message crafted to redefine tool schemas | Tool schemas come from registry, never from conversation context |
| `staticDescription` in `PageAIContext` | Written by developers at build time, never from user input or DB fields controlled by untrusted users |
| `safe_result_summary` template | Template filled server-side before LLM sees it; template is registry-static |
| `AIActionSummary.description` | Registry-static, admin-controlled; not from user input |
| LLM-generated `action_id` | Validated against registry; non-existent action_id is HTTP 404 |
| Parameter values from LLM | Validated against `input_schema_id` JSON Schema before execution |

---

## §10 — Prompt Guidance vs Backend Authorization

> **WARNING — READ BEFORE IMPLEMENTING ANY AI CONTEXT SYSTEM**

The following are **guidance only**. They help the AI respond accurately. They do NOT authorize any action.

| Guidance input | What it affects | What it does NOT do |
|---------------|----------------|---------------------|
| `AIUserCapabilityContext` (doc 36 §23) | AI knows which actions to propose | Does not authorize execution |
| `PageAIContext.availableActionIds` (doc 38 §09) | AI knows which actions are relevant to current page | Does not authorize execution |
| `build_ai_capability_prompt()` output (doc 36 §24) | AI system prompt section | Not an auth token; backend ignores it |
| `AIUserCapabilityContext.available_actions` | AI knows what to offer the user | Stale data, wrong org, or forged context cannot bypass backend check |
| `AIUserCapabilityContext.context_version` | Client knows when to refresh context | Old context does not grant old permissions |
| User Operating Profile / preferences | AI tone, language, suggestions | Not checked at execution |
| Org Discovery Profile (doc 36 §23) | AI onboarding suggestions | Not checked at execution |

**The only authorization gate is `check_execution_viability()` (doc 36 §37) — 22 checks, called server-side, every time, regardless of what the context says.**

If context says "user can do X" and `check_execution_viability()` says "denied": the action is denied. Context loses. Backend wins.

If context is stale (context_version mismatch): HTTP 409. Client must re-fetch context. But the action is not retried automatically — the user must explicitly re-initiate.

---

## §11 — Rollback and Partial Failure Policy

### Rollback rules

1. Every action with `capability_level` in {`EXECUTE`, `BULK`} and `executor_type="http_api"` MUST declare `rollback_supported` explicitly (`true` or `false`). It may not be `None` or absent.
2. Every action with `capability_level` in {`DELETE_SOFT`, `CONFIGURE`, `SYSTEM`} MUST declare `rollback_action_id` if `rollback_supported=true`.
3. If `rollback_supported=false` AND `danger_level >= "high"`: the UI/AI must display a warning before execution: "פעולה זו אינה הפיכה. להמשיך?"
4. Rollback is never automatic. The AI may offer rollback as a follow-up action but must not execute it without explicit user confirmation.

### Partial failure rules (BULK actions)

1. Bulk actions execute item-by-item. One item's failure does not stop the batch.
2. Each item produces one `AIActionInvocation` row (because `bulk_requires_individual_audit=true`).
3. The bulk operation's final result must include: `{total: N, succeeded: M, failed: K, failed_items: [{id, reason}]}`.
4. The AI must report partial failure to the user: "הושלמו {M} מתוך {N} פריטים. {K} נכשלו: ..."
5. No destructive bulk action (`capability_level=BULK` + `danger_level >= "medium"`) may run without explicit per-batch confirmation and a declared `max_batch_size`.
6. Partial failure is always stored in `AIActionInvocation.result_json` — never swallowed silently.

---

## §12 — Remaining Blockers Before Implementation

The following must be resolved before any non-READ AI action ships to production:

| # | Blocker | Owner | Unblocked by |
|---|---------|-------|-------------|
| B1 | **Delegation token design** (§08) — algorithm, signing key, nonce storage | Platform security | ADR + SSM key provisioned |
| B2 | **`AIActionDescriptor v1` Python dataclass** — written using canonical field names from §05 | Backend | B1 not required for read-only |
| B3 | **`AIActionConfirmationToken` TTL separation** — add `voice_confirmation_ttl_seconds` field | Backend | B1 |
| B4 | **`check_execution_viability()` updated** — replace `risk_tier` checks with `capability_level` checks | Backend | B2 |
| B5 | **`ModuleAIAction` TypeScript interface updated** — `voiceInvocable` → `voiceEligible`, add `capabilityLevel`, `rollbackSupported` | Frontend | B2 |
| B6 | **`AIActionSummary` updated** — `voice_invocable` → `voice_eligible`, add `capability_level` | Backend | B2 |
| B7 | **`platform_actions.py` examples updated** — all 10 examples use v1 field names | Backend | B2 |
| B8 | **Prompt injection test** — structured output parsing verified before any tool result is interpolated into prompts | Backend | B2 |
| B9 | **Rollback declared** for all EXECUTE + http_api actions | Registry maintainer | B2 |
| B10 | **Partial failure format** standardized in `execute_bulk_action()` | Backend | B2 |

---

## §13 — Acceptance Criteria

Round 028 (this doc) is complete when:

- [ ] `39-ai-architecture-consistency-pass.md` exists and all sections §01–§12 are present
- [ ] Doc 36 §05 marks old `AIActionDescriptor` as "pre-v1 draft, superseded by doc 39 §05"
- [ ] Doc 36 §06 marks `check_delegated_permission()` as "pre-v1 draft; use §37 viability checks"
- [ ] Doc 36 §09 voice rule "READ and WRITE_LOW only" is corrected or removed
- [ ] Doc 36 §09/§11/§23 `voiceInvocable` / `voice_invocable` → `voice_eligible`
- [ ] ADR-026 in decision log references this document as consistency foundation
- [ ] `15-action-backlog.md` has B1–B10 blocker tasks
- [ ] `35-platform-capabilities-build-order.md` lists consistency-pass gate before R027 implementation
- [ ] `96-rounds-index.md` has Round 028 entry
- [ ] `98-change-log.md` has Round 028 entry

---

_Document created: 2026-04-24 (Round 028 — consistency pass)_
_Implementation gate: B1 (delegation token) must be resolved before write-tier AI actions ship._
