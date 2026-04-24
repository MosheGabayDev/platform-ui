# 36 — AI Action Platform Architecture

_Round 024 — 2026-04-24 | Updated Round 026 (§33–§40) | Updated Round 027 (§41) | Updated Round 028 (consistency pass — deprecated sections marked)_
_Status: Design complete. Implementation not started._

> **Consistency note (Round 028):** Sections §05 (old AIActionDescriptor), §06 (old permission check), §09 (old voice rules), and §11/§23 (`voiceInvocable`) contain pre-v1 drafts that conflict with the canonical definitions in `docs/system-upgrade/39-ai-architecture-consistency-pass.md`. The deprecated sections are marked below. Implementers must follow doc 39, not the deprecated sections.

> **The AI is not read-only.** The AI may execute CREATE, UPDATE, DELETE_SOFT, CONFIGURE, APPROVE, EXECUTE, BULK, and SYSTEM operations — wherever the authenticated human user is authorized to do the same. The constraint is the user's permission set, not the channel. See §33.

---

## §01 — Overview and Motivation

Voice and chat AI agents in this platform (ALA, Helpdesk AI, Investigation Console) can answer questions and describe what should happen, but cannot yet safely **act** on behalf of users. Every non-read operation still requires the user to navigate to a page and perform the action manually.

This document designs a generic **AI Delegated Action Platform** — a set of contracts, registries, runtime components, and security controls that allow any conversational or voice agent to execute platform actions on behalf of an authenticated user, with appropriate confirmation and full audit traceability.

### What this is NOT

- Not an AI agent orchestrator (that already exists in `apps/ai_agents/` + `apps/helpdesk/services/`)
- Not a replacement for the existing `AIAction` HTTP-callable action system in `apps/ai_settings/`
- Not a new approval queue (the helpdesk approval queue in `apps/helpdesk/services/approval_service.py` is reused)
- Not a new danger-level UX system (`lib/platform/actions/` already has `PlatformAction` + `DangerLevel`)

### What this IS

An extension layer that bridges:
1. The existing `PlatformAction` (UI confirmation standard) with
2. The existing `AIAction` (backend HTTP-callable action model) and
3. The existing `ToolInvocation` + `ApprovalService` (helpdesk approval queue)

...into a unified system where an AI agent can say "I want to execute `users.deactivate` on user 42" and the platform handles: permission check → user confirmation → execution → audit write — consistently across voice, chat, and web.

---

## §02 — Core Principle: AI as Delegated Actor

```
authenticated user → initiates session with AI agent
                   ↓
         AI agent → requests action on user's behalf
                   ↓
      delegated permission check (user's role + action's min_role)
                   ↓
      confirmation/approval (verbal, typed, or async approval queue)
                   ↓
      backend API execution (scoped to user's org_id)
                   ↓
      audit write: (actor_user_id, ai_session_id, action_id, confirmation_nonce)
```

**Invariants (non-negotiable):**

1. The AI agent never holds its own permissions. It acts as a **proxy for the authenticated human**. All permission checks use the human's `user_id`, `org_id`, `roles`, and `permissions`.
2. The human's `org_id` is always derived from auth — never from the AI's output or any request body.
3. Every execution produces a `AIActionInvocation` row linking `user_id`, `session_id`, `action_id`, and `confirmation_nonce`. There is no "fire and forget" path.
4. A `DangerLevel >= medium` action always requires explicit human confirmation, even in voice. The AI cannot self-confirm.
5. The AI's output is treated as **untrusted input** at the action parameter layer — same as user input.

---

## §03 — Current State Analysis

### What already exists (reuse, do not rebuild)

| Component | Location | Role in new system |
|-----------|----------|--------------------|
| `PlatformAction` type + `DangerLevel` | `lib/platform/actions/types.ts` | Extended with `aiInvocable` flag + `voiceConfirmable` flag |
| `ConfirmActionDialog` | `components/shared/confirm-action-dialog.tsx` | Reused unchanged for chat/web confirmation |
| `useDangerousAction()` | `lib/hooks/use-dangerous-action.ts` | Reused; extended for AI-initiated trigger |
| `AIAction` model | `apps/ai_settings/models/action.py` | Backend action catalog; extended with platform linkage |
| `ToolInvocation` model | `apps/helpdesk/models.py` | Extended to cover AI delegated action invocations |
| `ApprovalService` | `apps/helpdesk/services/approval_service.py` | Reused for high/critical danger actions |
| `record_activity()` | `apps/authentication/jwt_auth.py` | Used for audit writes on every AI action execution |
| `hasRole()`, `hasPermission()` | `lib/platform/permissions/rbac.ts` | Permission gate for AI-invocable actions |
| `RBAC decorators` | `apps/authentication/rbac.py` | Backend permission enforcement |

### Gap analysis — what does NOT exist yet

| Gap | Description |
|-----|-------------|
| `aiInvocable` extension on `PlatformAction` | Frontend doesn't know which actions AI can invoke |
| AI delegated invocation endpoint | No `POST /api/ai-actions/invoke` endpoint exists |
| Confirmation nonce/token | No cryptographic link between AI's request and human's confirm tap |
| Voice confirmation flow | No "say 'confirm' or 'cancel'" loop exists in ALA/voice agents |
| `AIActionInvocation` model | No unified audit table for AI-delegated action execution |
| Action parameter validation | AI outputs are not schema-validated before execution |
| PII redaction for transcripts | AI action results may contain PII returned to voice transcripts |
| Rate limiting on AI action invocations | No per-org, per-action rate limit exists |
| Module manifest `aiActions` section | Module manifests have no `aiActions` field yet |
| Frontend action preview card | No UI component to show "AI wants to execute X — confirm?" |
| Chat/voice command panel | No unified UI for AI action history in a session |

---

## §04 — Target Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  FRONTEND (Next.js / React Native)                                  │
│                                                                     │
│  Voice Session       Chat Session         Admin Dashboard           │
│  ┌─────────────┐    ┌──────────────┐     ┌────────────────────┐   │
│  │VoiceConfirm │    │ActionPreview │     │AIActionHistory     │   │
│  │Dialog       │    │Card          │     │Table               │   │
│  └──────┬──────┘    └──────┬───────┘     └────────────────────┘   │
│         │                  │                                        │
│  ┌──────▼──────────────────▼────────────────────────────────────┐ │
│  │  useAIAction(action, sessionId)                               │ │
│  │  — generates confirmation nonce                               │ │
│  │  — calls POST /api/proxy/ai-actions/invoke                   │ │
│  │  — handles pending/confirmed/denied states                    │ │
│  └──────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                              │
                    Authorization: Bearer <jwt>
                              │
┌─────────────────────────────▼───────────────────────────────────────┐
│  BACKEND (Flask)                                                     │
│                                                                     │
│  POST /api/ai-actions/invoke                                        │
│  ├── 1. Validate JWT → extract user_id, org_id, roles              │
│  ├── 2. Load action from registry (module manifest aiActions)       │
│  ├── 3. Check delegated permission (user role >= action.min_role)  │
│  ├── 4. Validate AI-provided parameters against input_schema        │
│  ├── 5. Verify confirmation nonce (if dangerLevel >= medium)       │
│  ├── 6. Execute via ActionExecutor (HTTP or internal function)      │
│  ├── 7. Write AIActionInvocation audit row                          │
│  └── 8. Return safe result summary (PII-redacted)                  │
│                                                                     │
│  GET /api/ai-actions/registry?module=<module>                      │
│  └── Returns AI-invocable actions for a module (role-filtered)     │
│                                                                     │
│  POST /api/ai-actions/request-confirmation                         │
│  └── Creates pending confirmation token; returns to AI agent        │
│                                                                     │
│  POST /api/ai-actions/confirm                                       │
│  └── Human submits confirmation nonce → unblocks invoke            │
└─────────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────────┐
│  ACTION REGISTRY (module manifests + ai_settings DB)                │
│                                                                     │
│  Module manifest aiActions[] + AIAction rows (ai_settings_actions)  │
│  → merged by AIActionRegistry at runtime                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## §05 — AI Action Registry

> **⚠ DEPRECATED — PRE-V1 DRAFT.** The `AIActionDescriptor` dataclass below (14 fields, using `risk_tier`, `name`, `module`, `handler_type`, `handler_config`) is a pre-v1 draft superseded by:
> - `AIActionDescriptor v1` in `docs/system-upgrade/39-ai-architecture-consistency-pass.md §05` (canonical, 30 fields)
> - `AIActionDescriptor` in §35 of this document (25-field intermediate draft, also superseded)
>
> **Do not implement the §05 schema.** Use doc 39 §05 exclusively.

The registry is the single source of truth for what actions an AI agent may invoke.

### Two-layer registry

**Layer 1: Static module manifest** (`module-manifest.ts` for each module)

Platform-defined actions (create user, deactivate org, send notification, etc.) are declared in the module manifest's `aiActions` array. These are code-defined and deployed with the platform.

**Layer 2: Dynamic org-level actions** (`ai_settings_actions` DB table)

Org admins can define custom HTTP-callable actions (external API calls) via the `apps/ai_settings/` module. These supplement the static manifest actions without modifying code.

### Registry interface (backend Python)

```python
# apps/ai_action_platform/registry.py

@dataclass
class AIActionDescriptor:
    action_id: str          # "users.deactivate" or custom slug
    module: str             # "users", "helpdesk", "ala", etc.
    name: str
    description: str
    input_schema: dict      # JSON Schema for parameter validation
    output_schema: dict     # JSON Schema for result normalization
    min_role: str           # "manager" | "admin" | "system_admin"
    risk_tier: str          # "READ" | "WRITE_LOW" | "WRITE_HIGH" | "DESTRUCTIVE"
    requires_confirmation: bool
    danger_level: str       # mirrors PlatformAction.dangerLevel
    handler_type: str       # "internal_function" | "http_api"
    handler_config: dict    # function name OR AIAction HTTP config
    pii_fields: list[str]   # output fields to redact in transcripts
    org_id: int | None      # None = platform-wide, int = org-specific
```

### Registry contract for module manifests

```typescript
// lib/platform/modules/manifest.ts (extension)

export interface ModuleAIAction {
  /** Matches AIActionDescriptor.action_id — "module.verb" format. */
  actionId: string;
  /** Human-readable display name for action preview card. */
  label: string;
  /** Shown in confirmation dialog. Hebrew/i18n ready. */
  description: string;
  /** Mirrors PlatformAction.dangerLevel. */
  dangerLevel: DangerLevel;
  /** Whether human confirmation is required before execution. */
  requiresConfirmation: boolean;
  /** Whether this action can be invoked via voice session. See doc 39 §05 for canonical v1 field name: voiceEligible. */
  voiceEligible: boolean;  // was: voiceInvocable (retired)
  /** Roles that may invoke this action via AI delegation. */
  requiredRoles: string[];
  /** JSON schema ID for input parameter validation. */
  inputSchemaId: string;
}

export interface ModuleManifest {
  // ... existing fields ...
  aiActions?: ModuleAIAction[];
}
```

---

## §06 — Delegated Permission Runtime

> **⚠ DEPRECATED — PRE-V1 DRAFT.** The `check_delegated_permission()` function below uses `risk_tier` which is retired. The canonical permission check is `check_execution_viability()` in §37 of this document (22 checks, uses `capability_level`). The role rank table below remains valid but the function body must not be implemented as written.
>
> See also: `docs/system-upgrade/39-ai-architecture-consistency-pass.md §07` for delegated human vs service account rules.

The delegated permission model is deliberately simple: the AI agent inherits **exactly the permissions of the human who initiated the session**. There is no privilege escalation.

### Permission check algorithm (backend)

```python
def check_delegated_permission(
    actor_user: User,
    action: AIActionDescriptor,
    org_id: int,
) -> PermissionResult:
    # 1. Org scope — action must belong to actor's org or be platform-wide
    if action.org_id is not None and action.org_id != actor_user.org_id:
        return PermissionResult.FORBIDDEN("cross-org action denied")

    # 2. Risk tier × role matrix
    role_rank = ROLE_RANK[actor_user.primary_role]  # system_admin > admin > manager > technician > viewer
    required_rank = ROLE_RANK[action.min_role]
    if role_rank < required_rank:
        return PermissionResult.FORBIDDEN(f"role {actor_user.primary_role} < required {action.min_role}")

    # 3. DESTRUCTIVE tier requires explicit permission codename
    if action.risk_tier == "DESTRUCTIVE":
        if not actor_user.has_permission("ai_actions.destructive"):
            return PermissionResult.FORBIDDEN("missing ai_actions.destructive permission")

    # 4. Org-disabled check — org admin may disable specific action IDs
    if is_action_disabled_for_org(action.action_id, org_id):
        return PermissionResult.FORBIDDEN("action disabled for this org")

    return PermissionResult.ALLOWED
```

### Role rank table

| Role | Rank | Can invoke |
|------|------|-----------|
| `viewer` | 0 | READ only |
| `technician` | 1 | READ + WRITE_LOW |
| `manager` | 2 | READ + WRITE_LOW + WRITE_HIGH |
| `admin` | 3 | All except DESTRUCTIVE (needs explicit permission) |
| `system_admin` | 4 | All |

### Principle: no permission elevation

- AI agent never executes with more permissions than the authenticated user
- AI agent cannot re-invoke an action already denied in the current session
- Session context does not persist permissions across user sessions

---

## §07 — Execution Flow (Step-by-Step)

### Phase A: AI requests action (no confirmation required, READ tier)

```
1. AI agent produces action_id + parameters from LLM output
2. AI agent calls POST /api/ai-actions/invoke with:
   { action_id, parameters, session_id, invocation_nonce }
3. Backend validates JWT → user_id, org_id
4. Backend loads AIActionDescriptor from registry
5. Backend checks delegated permission
6. Backend validates parameters against input_schema (JSON Schema draft-07)
7. Backend executes via ActionExecutor
8. Backend writes AIActionInvocation (status=success, no confirmation)
9. Backend returns PII-redacted result summary
10. AI agent incorporates result into response
```

### Phase B: AI requests action (confirmation required, WRITE tier)

```
1. AI agent requests action_id + parameters
2. AI agent calls POST /api/ai-actions/request-confirmation with:
   { action_id, parameters, session_id }
3. Backend validates, creates ConfirmationToken (TTL: 120s):
   { token_id, action_id, parameters_hash, user_id, expires_at }
4. Backend returns { token_id, action_id, label, description, danger_level }
5. Frontend receives pending action state
6. Frontend renders ActionPreviewCard (or VoiceConfirmDialog for voice)
7. Human confirms → frontend calls POST /api/ai-actions/confirm
   { token_id, reason (if required) }
8. Backend verifies token (not expired, not used, user_id matches)
9. Backend executes via ActionExecutor
10. Backend marks token as used (idempotency — second confirm is no-op)
11. Backend writes AIActionInvocation (status=success, confirmed_at, reason)
12. Frontend updates UI + AI agent receives result
```

### Phase C: High/DESTRUCTIVE action → async approval queue

```
1-4. Same as Phase B
5. danger_level >= "high" → backend creates ApprovalQueueItem instead of ConfirmationToken
6. Session enters waiting_approval state
7. Approval queue notifies technician/admin
8. Human approves via dashboard approval queue
9. Celery task: execute_approved_ai_action.delay(invocation_id, org_id)
10. Celery executes, writes AIActionInvocation (status=success, approved_by)
11. SSE event notifies original session that action completed
12. AI agent receives result via SSE callback
```

---

## §08 — Confirmation and Approval Model

### Confirmation token

```python
# apps/ai_action_platform/models.py

class AIActionConfirmationToken(db.Model):
    """Short-lived token linking AI's action request to human confirmation.

    Prevents replay attacks and ensures the human confirmed the exact
    parameters the AI proposed — not a stale or substituted set.
    """
    __tablename__ = "ai_action_confirmation_tokens"

    id = db.Column(db.String(36), primary_key=True)  # UUID
    org_id = db.Column(db.Integer, nullable=False, index=True)
    user_id = db.Column(db.Integer, nullable=False)
    session_id = db.Column(db.BigInteger, nullable=True)  # helpdesk or ALA session
    action_id = db.Column(db.String(128), nullable=False)
    parameters_json = db.Column(JSONB, nullable=False)
    parameters_hash = db.Column(db.String(64), nullable=False)  # SHA-256 of canonical params
    danger_level = db.Column(db.String(16), nullable=False)
    status = db.Column(db.String(16), nullable=False, default="pending")
    # status: pending | confirmed | denied | expired | used
    confirmed_at = db.Column(db.DateTime(timezone=True), nullable=True)
    reason = db.Column(db.Text, nullable=True)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), server_default=db.func.now())
```

### Confirmation token rules

| Rule | Detail |
|------|--------|
| TTL | 120 seconds from creation (configurable per action) |
| Single-use | `status='used'` after first successful invocation — second confirm is HTTP 409 |
| User-bound | `user_id` on token must match JWT `user_id` on confirm call |
| Hash-verified | Parameters JSON is re-hashed on confirm and must match token's `parameters_hash` |
| Expired token | HTTP 410 Gone — AI agent must request new token |
| Denied token | HTTP 403 — session records denial; AI agent may not re-request same action for 60s |

### Approval queue (high/critical)

For `danger_level >= "high"`, confirmation tokens are not used. Instead:

1. An `AIActionApprovalRequest` row is written (mirrors `ToolInvocation.approval_required=True`)
2. The existing `ApprovalService.get_pending_approvals()` returns it alongside session tool approvals
3. Existing approval dashboard UI works without changes
4. On approval: `execute_approved_ai_action` Celery task runs the action

---

## §09 — Voice-Specific Confirmation Flow

> **⚠ PARTIALLY SUPERSEDED.** The `voiceInvocable` flag name and the rule "only READ and WRITE_LOW with dangerLevel <= 'low' may be voiceInvocable" in this section are retired. Canonical voice policy is in `docs/system-upgrade/39-ai-architecture-consistency-pass.md §06`. Key corrections:
> - Flag name: `voiceInvocable` → `voice_eligible` (everywhere)
> - Eligible levels: READ, CREATE, UPDATE, APPROVE, EXECUTE (not just READ + WRITE_LOW)
> - Danger ceiling: "medium" (not just "low")
> - Voice token TTL: use `voice_confirmation_ttl_seconds` field (separate from `confirmation_ttl_seconds`)

Voice sessions (ALA / Gemini Live) cannot render a modal dialog. Confirmation must happen via:

1. **Verbal confirmation** — AI agent says the action aloud and asks user to say "confirm" or "cancel"
2. **Tap confirmation** — mobile app shows a push notification with "Confirm / Cancel" buttons
3. **Deferred** — for high-risk actions during voice, the action is queued to the approval dashboard and the user is told "this requires review"

### Voice confirmation protocol

```
AI: "אני רוצה להשבית את המשתמש יוסי כהן. האם לאשר?"
User: "כן, אשר"

→ AI agent calls POST /api/ai-actions/request-confirmation
  { action_id: "users.deactivate", parameters: { user_id: 42 }, session_id: "ala-123" }

→ Backend creates ConfirmationToken (TTL: 60s for voice — shorter window)
  Returns: { token_id, label, description, danger_level: "medium" }

→ AI agent calls POST /api/ai-actions/confirm
  { token_id, voice_session_id: "ala-123", verbal_confirm: true }

→ Backend executes, writes audit (confirmed_via: "voice")
```

### Voice-specific rules

1. `voice_eligible: false` actions are never proposed during voice sessions
2. `danger_level >= "high"` is never executed via verbal confirm — always requires tap or dashboard approval
3. The AI must read back the action and affected resource name before requesting confirmation
4. Confirmation window is 60s for voice (shorter than 120s for chat)
5. If user says "cancel" or is silent for 10s, token is marked `denied` and session continues

### `voiceEligible` flag

> **Canonical name is `voiceEligible` (TypeScript) / `voice_eligible` (Python). `voiceInvocable` is retired.**

```typescript
// In ModuleAIAction (canonical v1 — see doc 39 §05):
voiceEligible: boolean;
// true: AI may propose this action in a voice session
// false: action is text/web only (too complex to confirm verbally)
// Rule: see doc 39 §06 for canonical formula — capability_level ∈ {READ,CREATE,UPDATE,APPROVE,EXECUTE}
//       AND danger_level ≤ "medium" AND bulk_allowed=false AND hard_delete_allowed=false
// RETIRED rule: "only READ and WRITE_LOW with dangerLevel <= 'low'" — do not use
```

---

## §10 — Audit and Traceability

Every AI action execution — whether confirmed, denied, or failed — writes an `AIActionInvocation` row.

### AIActionInvocation model

```python
# apps/ai_action_platform/models.py

class AIActionInvocation(db.Model):
    """Audit log for every AI-delegated action execution attempt.

    Partitioned monthly by created_at. Never deleted — compliance archive.
    Links: authenticated user ↔ AI session ↔ action ↔ confirmation.
    """
    __tablename__ = "ai_action_invocations"
    __table_args__ = (db.PrimaryKeyConstraint("id", "created_at"),)

    id = db.Column(db.BigInteger, autoincrement=True)
    org_id = db.Column(db.Integer, nullable=False)
    actor_user_id = db.Column(db.Integer, nullable=False)   # human initiating the session
    ai_session_id = db.Column(db.String(128), nullable=True) # ALA / helpdesk / chat session
    action_id = db.Column(db.String(128), nullable=False)
    module = db.Column(db.String(64), nullable=False)
    parameters_json = db.Column(JSONB, nullable=False)       # AI-provided params (pre-execution)
    result_json = db.Column(JSONB, nullable=True)            # Backend result (PII redacted)
    status = db.Column(db.String(24), nullable=False)
    # status: success | denied | failed | timeout | permission_denied | confirmation_expired
    confirmation_token_id = db.Column(db.String(36), nullable=True)
    confirmed_via = db.Column(db.String(16), nullable=True)  # "dialog" | "voice" | "approval_queue" | null
    confirmed_at = db.Column(db.DateTime(timezone=True), nullable=True)
    reason = db.Column(db.Text, nullable=True)               # actor's reason (for high+)
    approved_by_user_id = db.Column(db.Integer, nullable=True)  # for approval_queue flow
    error_message = db.Column(db.Text, nullable=True)
    duration_ms = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=db.func.now(), nullable=False)
```

### Audit integration with existing UserActivity

In addition to `AIActionInvocation`, write a `UserActivity` row for every execution:

```python
record_activity(
    actor_id=actor_user_id,
    action=f"ai_action.{action_id}",  # e.g. "ai_action.users.deactivate"
    description=f"AI action {action_id} executed via {confirmed_via}",
    ip_address=request.remote_addr,
    additional_data={
        "ai_session_id": ai_session_id,
        "invocation_id": invocation.id,
        "status": status,
    },
)
```

This ensures AI actions appear in the existing audit trail UI without requiring a new audit UI.

---

## §11 — Module Manifest Integration

Module manifests (currently in `lib/modules/<module>/`) gain an `aiActions` section:

```typescript
// lib/modules/users/manifest.ts (example)

export const USERS_MODULE_MANIFEST = {
  moduleId: "users",
  label: "ניהול משתמשים",
  // ... existing fields ...
  aiActions: [
    {
      actionId: "users.deactivate",
      label: "השבת משתמש",
      description: "מונע מהמשתמש להתחבר למערכת.",
      dangerLevel: "medium" as const,
      requiresConfirmation: true,
      voiceEligible: false,          // too consequential for voice-only confirm
      requiredRoles: ["admin", "system_admin"],
      inputSchemaId: "users.deactivate.v1",
    },
    {
      actionId: "users.lookup",
      label: "חיפוש משתמש",
      description: "מחזיר פרטי משתמש לפי מזהה או אימייל.",
      dangerLevel: "none" as const,
      requiresConfirmation: false,
      voiceEligible: true,
      requiredRoles: ["technician", "manager", "admin", "system_admin"],
      inputSchemaId: "users.lookup.v1",
    },
  ],
} satisfies ModuleManifest;
```

### Backend manifest loading

The backend loads manifest data from the `AIAction` DB rows (for org-specific actions) and from a static Python registry (for platform actions). The Python static registry mirrors the TypeScript module manifests:

```python
# apps/ai_action_platform/platform_actions.py

PLATFORM_AI_ACTIONS: list[AIActionDescriptor] = [
    AIActionDescriptor(
        action_id="users.deactivate",
        module="users",
        name="השבת משתמש",
        description="מונע מהמשתמש להתחבר למערכת.",
        input_schema={"type": "object", "properties": {"user_id": {"type": "integer"}}, "required": ["user_id"]},
        output_schema={"type": "object", "properties": {"success": {"type": "boolean"}}},
        min_role="admin",
        risk_tier="WRITE_HIGH",
        requires_confirmation=True,
        danger_level="medium",
        handler_type="internal_function",
        handler_config={"function": "apps.authentication.user_api_routes.deactivate_user"},
        pii_fields=[],
        org_id=None,
    ),
    # ... more platform actions
]
```

---

## §12 — Backend Architecture

### New module: `apps/ai_action_platform/`

```
apps/ai_action_platform/
├── INDEX.md
├── __init__.py
├── models.py              # AIActionInvocation, AIActionConfirmationToken
├── registry.py            # AIActionRegistry (loads platform + org actions)
├── executor.py            # ActionExecutor (internal_function + http_api handlers)
├── permission_check.py    # check_delegated_permission()
├── platform_actions.py    # Static platform action descriptors (mirrors TS manifests)
├── routes.py              # /api/ai-actions/* endpoints
├── schemas/               # JSON Schema files for input validation
│   ├── users.deactivate.v1.json
│   └── ...
└── tests/
    ├── test_registry.py
    ├── test_permission_check.py
    ├── test_executor.py
    └── test_routes.py
```

### Route contract

```
POST /api/ai-actions/invoke
  Auth: JWT Bearer (required)
  Body: { action_id, parameters, session_id?, invocation_nonce }
  Returns: { status, result_summary, invocation_id }
  Notes: Only for READ actions and actions with requires_confirmation=false

POST /api/ai-actions/request-confirmation
  Auth: JWT Bearer (required)
  Body: { action_id, parameters, session_id? }
  Returns: { token_id, action_id, label, description, danger_level, expires_in_seconds }
  Notes: Creates ConfirmationToken; frontend shows dialog

POST /api/ai-actions/confirm
  Auth: JWT Bearer (required)
  Body: { token_id, reason?, verbal_confirm? }
  Returns: { status, result_summary, invocation_id }
  Notes: Verifies token, executes, writes audit

GET /api/ai-actions/registry
  Auth: JWT Bearer (required)
  Query: module= (optional filter)
  Returns: { actions: AIActionDescriptor[] } filtered by caller's role
  Notes: Used by AI agents to discover available actions

GET /api/ai-actions/history
  Auth: JWT Bearer (required)
  Query: session_id=, limit=
  Returns: { invocations: AIActionInvocation[] } scoped to org_id
```

### ActionExecutor (backend)

```python
# apps/ai_action_platform/executor.py

class ActionExecutor:
    def execute(
        self,
        action: AIActionDescriptor,
        parameters: dict,
        actor_user: User,
        org_id: int,
    ) -> ActionResult:
        if action.handler_type == "internal_function":
            return self._execute_internal(action, parameters, actor_user, org_id)
        elif action.handler_type == "http_api":
            return self._execute_http(action, parameters, actor_user, org_id)
        else:
            raise ValueError(f"Unknown handler_type: {action.handler_type}")

    def _execute_internal(self, action, parameters, actor, org_id) -> ActionResult:
        """Call a platform-internal Python function directly."""
        # Import and call the registered function
        # Function signature: fn(parameters: dict, actor: User, org_id: int) -> dict
        ...

    def _execute_http(self, action, parameters, actor, org_id) -> ActionResult:
        """Call an external HTTP API (org-defined AIAction). Uses SSR-F allowlist."""
        ai_action = AIAction.query.filter_by(
            action_id=action.action_id, org_id=org_id
        ).first()
        # Build request from ai_action.url_template + parameters
        # Check allowed_hosts_json before making request (SSRF protection)
        # Resolve secret from SSM (ai_action.auth_secret_env)
        ...
```

---

## §13 — Frontend Architecture

### New files

```
lib/platform/ai-actions/
├── index.ts                   # public exports
├── types.ts                   # AIActionRequest, AIActionResult, ConfirmationToken
└── hooks/
    └── use-ai-action.ts       # Primary hook for AI action invocation

components/shared/
├── ai-action-preview-card.tsx # "AI wants to execute X — confirm?" card
└── ai-action-history.tsx      # Table of past AI action invocations in a session
```

### `useAIAction` hook

```typescript
// lib/platform/ai-actions/hooks/use-ai-action.ts

export interface UseAIActionOptions {
  actionId: string;
  sessionId?: string;
  onSuccess?: (result: AIActionResult) => void;
  onDenied?: () => void;
}

export interface UseAIActionResult {
  /** AI agent calls this to request action execution with given parameters. */
  request: (parameters: Record<string, unknown>) => Promise<void>;
  /** Current state: idle | requesting | awaiting_confirmation | executing | success | denied | failed */
  state: AIActionState;
  /** Spread onto <AIActionPreviewCard> */
  previewProps: AIActionPreviewCardProps | null;
  isPending: boolean;
  result: AIActionResult | null;
  error: string | null;
}
```

### `AIActionPreviewCard` component

Shown in the chat/voice UI when an AI action requires confirmation:

```
┌─────────────────────────────────────────────────────┐
│ 🤖 הפעולה הבאה מבוקשת על ידי הסוכן                  │
│                                                     │
│  ⚠️  השבת משתמש                                      │
│  המשתמש יוסי כהן לא יוכל להתחבר למערכת.             │
│                                                     │
│  פרמטרים: user_id=42, email=yossi@example.com        │
│                                                     │
│  [ביטול]                      [אשר פעולה]           │
└─────────────────────────────────────────────────────┘
```

Reuses `ConfirmActionDialog` internals but rendered inline (not in a modal) for chat flows.

### Integration with existing `useDangerousAction`

`useDangerousAction` remains the standard for **human-initiated** dangerous actions.
`useAIAction` is the standard for **AI-initiated** actions.

They share `PlatformAction` type and `ConfirmActionDialog` but have separate state machines because:
- AI-initiated actions have a server-side token that must be validated
- Voice confirmation has a timeout and verbal-confirm path
- AI actions may be queued to an approval dashboard (async)

---

## §14 — Security Rules (Non-Negotiable)

These rules cannot be bypassed by any module or extension:

1. **No permission elevation**: AI agent permissions = actor user permissions. Period.
2. **org_id from JWT only**: `org_id` for all DB queries is derived from `jwt_user.org_id`, never from AI output or request body.
3. **Parameter validation is mandatory**: All AI-provided parameters pass through JSON Schema validation before execution. Invalid parameters → HTTP 422, invocation logged as `status='validation_failed'`.
4. **SSRF allowlist enforced**: HTTP-type actions must have `allowed_hosts_json`. Any request to a non-allowed host is rejected before the HTTP call.
5. **Confirmation token is single-use**: Once a token is used (successfully or denied), it cannot be reused. Attempt returns HTTP 409.
6. **Secrets never in AI context**: `auth_secret_env` stores SSM key name only. The actual secret value is never passed to LLM context or returned in any response.
7. **Audit write is mandatory**: Every invocation (success, failure, denial) writes an `AIActionInvocation` row. The executor does not return results to the caller until the audit write is committed.
8. **Voice confirmation ceiling**: `danger_level >= "high"` is never executable via verbal confirm. Voice sessions see "this action requires dashboard approval."
9. **Rate limiting**: Per-org, per-action rate limit (default: 10 invocations/minute for WRITE tier). Exceeding returns HTTP 429 and writes a `rate_limit_exceeded` audit event.
10. **Bulk constraint**: A single AI session may not invoke destructive actions on more than 5 distinct resources within a 60s window (anti-bulk-delete protection).

---

## §15 — Safe Result Summarization and PII Redaction

AI agents incorporate action results into their responses (including voice transcripts). Results must be safe to present without exposing raw PII.

### PII redaction pipeline

```python
# apps/ai_action_platform/pii_redactor.py

PII_FIELD_PATTERNS = {
    "email": r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+",
    "phone": r"(\+\d{1,3}[-.\s]?)?\(?\d{1,3}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}",
    "id_number": r"\b\d{9}\b",  # Israeli ID
}

def redact_for_voice(result: dict, pii_fields: list[str]) -> dict:
    """Remove or mask PII fields from action result before returning to AI agent.

    For voice: aggressive — mask email domain, truncate phone to last 4.
    For chat: light — show email with masked domain.
    """
    ...
```

### Summary generation

Each `AIActionDescriptor` optionally defines a `summary_template`:

```python
summary_template="השבתת המשתמש בוצעה בהצלחה. המשתמש {user_name} אינו יכול עוד להתחבר."
```

The executor fills the template from the (already PII-redacted) result and returns it as `result_summary`. The AI agent uses this for voice/chat response rather than the raw result.

---

## §16 — Rate Limiting and Abuse Prevention

```python
# Per-org, per-action-id, per-minute sliding window via Redis

RATE_LIMITS = {
    "READ":        (60, 60),   # 60 calls per 60 seconds
    "WRITE_LOW":   (30, 60),
    "WRITE_HIGH":  (10, 60),
    "DESTRUCTIVE": (5, 300),   # 5 calls per 5 minutes
}

def check_rate_limit(action_id: str, org_id: int, risk_tier: str) -> bool:
    key = f"ai_action_rate:{org_id}:{action_id}"
    limit, window = RATE_LIMITS[risk_tier]
    return redis_client.incr_expire(key, window) <= limit
```

### Abuse prevention heuristics

- Same `(action_id, parameters_hash)` called > 3 times in 60s → `suspicious_repetition` audit event, block for 120s
- DESTRUCTIVE tier called for > 5 distinct `resource_id` values in 60s → `bulk_destructive_block` event, block session
- Failed confirmation attempts > 3 in 60s → `confirmation_abuse` event, lock user from AI actions for 300s

---

## §17 — Bulk Action Constraints

Bulk operations (e.g., "deactivate all users in department X") are explicitly NOT supported via the AI Action Platform V1.

**Rationale**: Bulk destructive operations have outsized blast radius. Each resource must go through its own confirmation + audit cycle.

**Enforcement**: The `invoke` and `confirm` endpoints accept `parameters` for exactly one resource. The `user_id` field accepts a single integer, not an array. Passing an array returns HTTP 400 with `bulk_not_supported`.

**Future**: Bulk AI actions (V2) will require a separate approval flow with an explicit "bulk operation" confirmation modal and a cap of N resources defined per org.

---

## §18 — Error Handling and Fallback

| Error condition | AI agent behavior | Backend response |
|----------------|-------------------|-----------------|
| Permission denied | AI tells user: "אין לי הרשאה לבצע פעולה זו עבורך." | HTTP 403 + `permission_denied` audit |
| Confirmation expired | AI requests new confirmation token | HTTP 410 + `confirmation_expired` audit |
| Parameter validation failed | AI reports which parameter was invalid | HTTP 422 + `validation_failed` audit |
| Rate limit exceeded | AI tells user to wait | HTTP 429 + `rate_limit_exceeded` audit |
| Backend execution error | AI tells user action failed, gives invocation_id for support | HTTP 500 + `execution_failed` audit |
| Action not found in registry | AI reports action unavailable | HTTP 404 + no audit (no execution attempted) |
| Action disabled for org | AI reports action not available for this org | HTTP 403 + `action_disabled` audit |

**Critical rule**: The AI agent must never retry a failed action autonomously. If execution fails, the agent presents the error to the user and stops. Retry is a human decision.

---

## §19 — Testing Strategy

### Unit tests (backend)

- `test_permission_check.py`: role matrix exhaustive, org-scope, DESTRUCTIVE permission
- `test_executor.py`: internal_function + http_api handlers; SSRF allowlist; parameter injection
- `test_registry.py`: platform actions loaded; org actions merged; role filtering
- `test_pii_redactor.py`: email, phone, ID number redacted; template filled

### Integration tests (backend)

- `test_routes.py`: full request cycle for READ, WRITE, DESTRUCTIVE tiers
- Confirmation token TTL: token expires after 120s (use `freezegun`)
- Single-use: second confirm on same token returns 409
- Audit write verified: every status code produces `AIActionInvocation` row
- Rate limit: 11th WRITE_LOW call in 60s returns 429

### Frontend tests

- `useAIAction` hook: requesting → awaiting_confirmation state machine
- `AIActionPreviewCard`: renders correct danger level styling; confirm button disabled until token
- Voice path: `voiceInvocable=false` actions never appear in voice session registry response

### End-to-end test (ALA text-chat API)

```bash
# Request and confirm a users.lookup action via ALA text session
curl -X POST "https://ai-data-platform.com/admin/api/internal/ala/text-chat" \
  -H "X-API-Key: $API_KEY" \
  -d '{"scenario_id": 37, "message": "who is user 42?", "user_id": 1, "org_id": 1}'
# Expected: function_calls=[{function: "users.lookup", result: {...}}]
```

---

## §20 — Integration with Existing Systems

### ALA (Voice Life Assistant)

ALA scenarios (`apps/ala/scenarios/`) will gain an `aiActions` section listing which platform actions the ALA agent may invoke for a given scenario type. The ALA handler calls `POST /api/ai-actions/request-confirmation` when the LLM produces an action tool call.

### Helpdesk AI Sessions

The Helpdesk investigation engine (`apps/helpdesk/engine/`) already uses `ToolInvocation` for tracking. AI Action Platform invocations from within a helpdesk session will additionally write to `AIActionInvocation` (both tables for full traceability). The helpdesk approval queue (`ApprovalService`) is reused for `danger_level >= "high"` actions.

### AI Agents module

The agents module (`apps/agents/`) can invoke platform actions as part of autonomous investigation workflows. The executor's `internal_function` handler is the same function the agents module already calls — no new backend code needed for existing agent tools, only the registry and audit wrapper.

---

## §21 — Migration Path and Phases

### Phase 1 (R027) — Registry and audit foundation
- Create `apps/ai_action_platform/` module
- `AIActionInvocation` + `AIActionConfirmationToken` models + migration
- `AIActionRegistry` loads platform static actions
- `POST /api/ai-actions/invoke` for READ-tier actions only
- No confirmation flow yet
- Audit writes verified

### Phase 2 (R028) — Confirmation flow
- `POST /api/ai-actions/request-confirmation` + `POST /api/ai-actions/confirm`
- `ConfirmationToken` TTL, single-use, hash verification
- Frontend: `useAIAction` hook + `AIActionPreviewCard` component
- WRITE_LOW and WRITE_HIGH tiers enabled

### Phase 3 (R029) — Voice confirmation
- `voiceInvocable` registry extension
- ALA integration: action request/confirm in Gemini tool calls
- Verbal confirm flow (60s TTL, danger_level ceiling)
- Voice-specific PII redaction

### Phase 4 (R030) — Approval queue + DESTRUCTIVE tier
- High/critical: route to helpdesk approval queue
- `execute_approved_ai_action` Celery task
- SSE notification back to session on approval
- DESTRUCTIVE tier enabled with `ai_actions.destructive` permission

### Phase 5 (R031) — Module manifest integration
- All existing modules gain `aiActions` in their manifests
- `GET /api/ai-actions/registry` returns role-filtered list
- Admin UI: org-level action disable/enable
- Rate limiting enabled

---

## §22 — Open Questions and Future Work

| # | Question | Impact |
|---|----------|--------|
| Q1 | Should `AIActionInvocation` be a separate table or extend `ToolInvocation`? | Schema design — keep separate (different lifecycle, different modules) |
| Q2 | How does the ALA voice session receive the confirmation result? Currently ALA uses Gemini Live websocket — does this require SSE or polling? | Voice confirmation timing |
| Q3 | Should platform actions be declared in TypeScript manifests and auto-generated into Python, or maintained separately in both? | Maintenance burden |
| Q4 | What is the maximum parameter payload size? AI output can be verbose. | DoS surface |
| Q5 | Should the AI agent be able to propose action alternatives if confirmation is denied? | UX design |
| Q6 | How are org-admin-disabled actions surfaced in the AI response? ("I cannot do that for you" vs silent omission) | UX |
| Q7 | `AIActionConfirmationToken` TTL for mobile push: push delivery latency can be 5-30s — is 120s long enough? | Mobile UX |
| Q8 | Bulk operations V2: what is the right cap (10? 50? org-configurable)? | Future design |
| Q9 | Should the AI Action Registry be exposed to the LLM as tool definitions (function calling schema)? If yes, does this create a prompt-injection surface where malicious tool output redefines allowed actions? | Security |
| Q10 | Rate limit storage: Redis key-value is sufficient for V1 but does not survive Redis restart (limits reset). Is this acceptable? | Reliability |

---

---

## §23 — AI User Capability Context

_Added: Round 025_

### Motivation

The AI agent must serve both regular users and system administrators, but it must never guess what a user is allowed to do. Currently, the agent has no structured understanding of who it is talking to. An org admin asking "can you deactivate this user?" gets the same response as a viewer — either both get refused (friction) or both get offered the action (security gap).

The solution is a **server-generated AI User Capability Context** — a structured snapshot of what one specific authenticated user can do at this moment. This context is generated at session start from trusted server-side data, injected into the AI system prompt, and used to personalize the agent's behavior.

**Critical design invariant: the context is guidance, not authorization.** Every action execution still goes through the full backend permission stack. A stale or forged context cannot authorize anything — the `check_delegated_permission()` call at execution time is the real gate.

### Context data model

```python
# apps/ai_action_platform/context.py

@dataclass
class AIUserCapabilityContext:
    # ─── Identity ─────────────────────────────────────────────────────
    user_id: int
    org_id: int
    user_name: str              # display name (not email — PII reduction)
    user_role: str              # "technician" | "manager" | "admin" | "system_admin"
    is_system_admin: bool
    is_ai_agent: bool           # True if this is a service account

    # ─── Org / Tenant ─────────────────────────────────────────────────
    org_name: str
    org_tier: str               # "starter" | "pro" | "enterprise"
    org_is_active: bool

    # ─── Permissions ──────────────────────────────────────────────────
    permissions: list[str]      # dot-notation codenames e.g. ["ops.admin", "ai.read"]

    # ─── Modules ──────────────────────────────────────────────────────
    enabled_modules: list[str]  # ["helpdesk", "ala", "agents", "billing"]
    disabled_modules: list[str] # ["voice", "saml"] — included for safe refusal guidance

    # ─── Feature Flags ────────────────────────────────────────────────
    feature_flags: dict[str, bool]  # {"ai_actions_write": True, "bulk_import": False}

    # ─── AI Actions ───────────────────────────────────────────────────
    available_actions: list[AIActionSummary]       # full schema — may invoke
    confirmation_required_actions: list[str]       # action_ids requiring confirm
    approval_required_actions: list[str]           # action_ids going to approval queue
    dangerous_actions: list[str]                   # action_ids with dangerLevel >= "high"
    unavailable_action_categories: list[str]       # safe natural-language categories
    #   e.g. ["billing management", "cross-org user management"]
    #   NOT a list of specific action IDs the user cannot see

    # ─── Privacy / PII ────────────────────────────────────────────────
    can_see_pii: bool           # may see full email, phone, ID numbers
    can_see_billing_data: bool
    can_see_audit_log: bool
    pii_field_restrictions: list[str]  # ["phone", "id_number"] fields to never speak aloud

    # ─── Profile ──────────────────────────────────────────────────────
    preferred_language: str     # "he" | "en"
    voice_enabled: bool         # user has active voice capability
    timezone: str

    # ─── Org Discovery Profile ────────────────────────────────────────
    org_discovery_profile: dict | None  # optional: {industry, size, primary_use_cases}

    # ─── Support / Onboarding ─────────────────────────────────────────
    onboarding_mode: bool       # user is in onboarding — offer step-by-step guidance
    support_tier: str           # "self-service" | "managed" — affects escalation guidance

    # ─── Session ──────────────────────────────────────────────────────
    context_generated_at: str   # ISO timestamp — used for staleness detection
    context_version: int        # incremented on any permission/module change
```

### AIActionSummary (subset of AIActionDescriptor for context)

```python
@dataclass
class AIActionSummary:
    action_id: str
    label: str              # Hebrew/i18n display name
    description: str
    danger_level: str       # "none" | "low" | "medium" | "high" | "critical"
    requires_confirmation: bool
    requires_approval: bool  # True for danger_level >= "high"
    voice_eligible: bool     # canonical name (was: voice_invocable — retired)
    input_schema_id: str     # reference to JSON Schema file (was: input_schema dict — retired in v1)
    # NOTE: executor_ref, executor_type, handler_config, auth_secret_env are NOT included
```

### Context generation

The context is generated entirely server-side. The client supplies only the Bearer JWT.

```python
# apps/ai_action_platform/context_builder.py

def build_user_capability_context(
    user: User,
    org: Organization,
    registry: AIActionRegistry,
) -> AIUserCapabilityContext:
    """Generate a complete AI capability context for one authenticated user.

    All data sourced from DB + registry + feature flag store.
    Nothing from request body or query parameters.
    """
    # 1. Determine role rank
    role = user.primary_role  # "system_admin" | "admin" | "manager" | "technician" | "viewer"
    is_system_admin = user.is_system_admin

    # 2. Load enabled modules for org
    enabled_modules = get_enabled_modules(org.id)
    disabled_modules = get_disabled_modules(org.id)

    # 3. Load feature flags
    flags = get_feature_flags(org.id)

    # 4. Filter registry to actions this user can perform
    available_actions = registry.get_actions_for_user(user, org.id)
    available_summaries = [a.to_summary() for a in available_actions]

    # 5. Classify confirmation/approval/dangerous
    confirmation_ids = [a.action_id for a in available_actions if a.requires_confirmation]
    approval_ids = [a.action_id for a in available_actions if a.danger_level in ("high", "critical")]
    dangerous_ids = [a.action_id for a in available_actions if a.danger_level in ("high", "critical")]

    # 6. Build unavailable action categories (safe summaries, not action IDs)
    unavailable = _summarize_unavailable_categories(user, org, registry)

    # 7. PII visibility
    can_see_pii = is_system_admin or role in ("admin",) or user.has_permission("pii.read")
    can_see_billing = is_system_admin or role == "admin"
    can_see_audit = is_system_admin or role == "admin" or user.has_permission("audit.read")

    return AIUserCapabilityContext(
        user_id=user.id,
        org_id=org.id,
        user_name=user.display_name or user.email.split("@")[0],
        user_role=role,
        is_system_admin=is_system_admin,
        is_ai_agent=user.is_ai_agent,
        org_name=org.name,
        org_tier=org.tier or "starter",
        org_is_active=org.is_active,
        permissions=user.permission_list,
        enabled_modules=enabled_modules,
        disabled_modules=disabled_modules,
        feature_flags=flags,
        available_actions=available_summaries,
        confirmation_required_actions=confirmation_ids,
        approval_required_actions=approval_ids,
        dangerous_actions=dangerous_ids,
        unavailable_action_categories=unavailable,
        can_see_pii=can_see_pii,
        can_see_billing_data=can_see_billing,
        can_see_audit_log=can_see_audit,
        pii_field_restrictions=_get_pii_restrictions(role, flags),
        preferred_language=user.preferred_language or org.default_language or "he",
        voice_enabled=_user_has_voice(user, org, flags),
        timezone=user.timezone or org.timezone or "Asia/Jerusalem",
        org_discovery_profile=_get_org_discovery_profile(org),
        onboarding_mode=_is_onboarding(user, org),
        support_tier=org.support_tier or "self-service",
        context_generated_at=datetime.utcnow().isoformat(),
        context_version=_get_context_version(user.id, org.id),
    )
```

---

## §24 — Personalized AI System Prompt

### Design principle

The capability context is machine-readable (JSON). The AI receives a **compact natural-language prompt section** derived from it — not the raw JSON. The prompt section:

- Is short enough to fit in the system prompt budget (target: ≤400 tokens)
- Uses the user's preferred language (Hebrew by default)
- Is generated deterministically from the context object
- Excludes all secrets, internal IDs, and raw SQL
- Tells the AI what the user can do, cannot do, and how to respond to permission-denied requests

### Prompt builder function

```python
# apps/ai_action_platform/prompt_builder.py

def build_ai_capability_prompt(ctx: AIUserCapabilityContext) -> str:
    """Convert AIUserCapabilityContext into a compact AI system prompt section.

    Deterministic: same context → same prompt (safe to cache by context_version).
    Target: ≤400 tokens.
    """
    lines = []

    # ─── Identity ─────────────────────────────────────────────────────
    lines.append(f"אתה עוזר ל{ctx.user_name} ({ctx.user_role}) בארגון {ctx.org_name}.")
    if ctx.is_system_admin:
        lines.append("המשתמש הוא מנהל מערכת ראשי (system admin) עם גישה לכל הארגונים.")

    # ─── Modules ──────────────────────────────────────────────────────
    if ctx.enabled_modules:
        mod_list = "، ".join(ctx.enabled_modules)
        lines.append(f"מודולים פעילים: {mod_list}.")
    if ctx.disabled_modules:
        disabled_list = "، ".join(ctx.disabled_modules)
        lines.append(f"מודולים לא זמינים: {disabled_list}. אל תציע פעולות הקשורות אליהם.")

    # ─── Actions ──────────────────────────────────────────────────────
    if ctx.available_actions:
        lines.append("פעולות זמינות:")
        for action in ctx.available_actions[:20]:  # cap to first 20 to manage token budget
            note = ""
            if action.requires_approval:
                note = " (דורש אישור מנהל)"
            elif action.requires_confirmation:
                note = " (דורש אישור מהמשתמש)"
            lines.append(f"  - {action.action_id}: {action.description}{note}")

    if ctx.unavailable_action_categories:
        lines.append("קטגוריות שאינך יכול לבצע עבור משתמש זה:")
        for cat in ctx.unavailable_action_categories:
            lines.append(f"  - {cat}")
        lines.append("אם המשתמש יבקש פעולה מקטגוריות אלו, הסבר בנימוס שאין לו הרשאה ומי יכול לעזור.")

    # ─── Privacy ──────────────────────────────────────────────────────
    if not ctx.can_see_pii:
        lines.append("אל תציג מידע אישי מזהה (כתובת דוא\"ל מלאה, טלפון, מספר זהות) בתשובות.")
    if not ctx.can_see_billing_data:
        lines.append("אין למשתמש גישה לנתוני חיוב. הפנה לאדמין.")
    if ctx.pii_field_restrictions:
        restricted = "، ".join(ctx.pii_field_restrictions)
        lines.append(f"שדות הגנה על פרטיות שלא לדבר בקול: {restricted}.")

    # ─── Onboarding ───────────────────────────────────────────────────
    if ctx.onboarding_mode:
        lines.append("המשתמש בתהליך הכנסה (onboarding). הצע הדרכה שלב אחר שלב.")

    # ─── Safety rules ─────────────────────────────────────────────────
    lines.append("חוקים בלתי ניתנים לשינוי:")
    lines.append("  - כל פעולה כפופה לאימות הרשאה בשרת, גם אם מוזכרת בהקשר זה.")
    lines.append("  - אל תגלה מפתחות API, סיסמאות, נתיבי DB, או מידע פנימי.")
    lines.append("  - פעולות קריטיות תמיד דורשות אישור מפורש — לא ניתן לדלג.")

    return "\n".join(lines)
```

### Role-specific prompt policies

| Role | Prompt behavior |
|------|----------------|
| `viewer` | Only READ actions listed. "מדיניות הארגון אינה מאפשרת לך לבצע שינויים." |
| `technician` | READ + WRITE_LOW listed. Confirmation required shown inline. |
| `manager` | READ + WRITE_LOW + WRITE_HIGH listed. Approval queue for high-risk. |
| `admin` | All org-scoped actions. Cross-org explicitly blocked. Billing visible if `can_see_billing_data`. |
| `system_admin` | All actions including cross-org + module management. Critical still requires typed/voice+UI confirm. |
| `ai_agent` (service account) | No confirmation-required actions. READ + pre-authorized WRITE_LOW only. |

### What the prompt NEVER contains

| Never included | Why |
|---------------|-----|
| Raw API keys or secrets | Leak risk |
| Database paths or schema names | Attack surface |
| Action handler internals | Implementation leak |
| Specific user IDs beyond the actor | Cross-user data |
| Raw SQL or template strings | Injection risk |
| The full list of all platform actions | Informs adversaries of unexposed surface |

---

## §25 — Context Endpoint

```
GET /api/ai/context
Authorization: Bearer <jwt>
```

Returns a safe structured context for the authenticated user. Designed to be called at AI session start to bootstrap the capability prompt.

### Response shape

```json
{
  "user_id": 42,
  "org_id": 7,
  "user_role": "admin",
  "is_system_admin": false,
  "org_name": "Acme IT",
  "org_tier": "pro",
  "enabled_modules": ["helpdesk", "ala", "agents"],
  "disabled_modules": ["voice", "billing"],
  "feature_flags": {
    "ai_actions_write": true,
    "bulk_import": false
  },
  "available_actions": [
    {
      "action_id": "users.deactivate",
      "label": "השבת משתמש",
      "description": "מונע מהמשתמש להתחבר",
      "danger_level": "medium",
      "requires_confirmation": true,
      "requires_approval": false,
      "voice_invocable": false,
      "input_schema": { "type": "object", "properties": { "user_id": { "type": "integer" } } }
    }
  ],
  "unavailable_action_categories": [
    "ניהול ארגונים",
    "ניהול חיוב"
  ],
  "can_see_pii": true,
  "can_see_billing_data": false,
  "can_see_audit_log": true,
  "pii_field_restrictions": [],
  "preferred_language": "he",
  "voice_enabled": true,
  "onboarding_mode": false,
  "support_tier": "pro",
  "context_version": 14,
  "context_generated_at": "2026-04-24T10:00:00Z"
}
```

### What the endpoint NEVER returns

- Secrets, tokens, API keys
- Other users' data
- Internal function names or handler config
- Raw permission codenames list (permissions are pre-evaluated into available_actions)
- Cross-org data for non-system-admin users

### Caching

The context may be cached per `(user_id, org_id, context_version)` for up to 60 seconds. On any permission change event (see §28), `context_version` is incremented and the cache is invalidated.

### Security

- Auth: `@jwt_required` — no client-supplied role/permissions accepted
- Org scope: always from `g.jwt_user.org_id`
- Rate limit: max 10 calls/minute per user (context is session-start only)
- Audit: no audit write (read-only; no sensitive data returned)

---

## §26 — Action Filtering Rules

### What a user's session receives

| Category | Included in context | Detail level |
|----------|-------------------|--------------|
| Actions user **can run** | ✅ Full `AIActionSummary` with input schema | Ready to invoke |
| Actions user **can request approval for** | ✅ With `requires_approval: true` flag | Listed in available_actions |
| Actions user **can ask about** (module enabled, role insufficient) | ✅ Safe category summary only in `unavailable_action_categories` | No schema, no action_id |
| Actions from **disabled modules** | ✅ Module listed in `disabled_modules`; no action details | Category refusal only |
| Actions **internal-only** (no user-facing invocable path) | ❌ Never included | Not shown at all |
| Actions from **other orgs** | ❌ Never included (non-system-admin) | Not shown at all |

### Forbidden action summary (unavailable_action_categories)

Rather than listing specific action IDs the user cannot execute (which reveals the action surface), the prompt receives human-readable category strings:

```python
ROLE_CATEGORY_RESTRICTIONS = {
    "viewer": [
        "ניהול משתמשים",
        "שינוי הגדרות ארגון",
        "גישה לנתוני חיוב",
        "ניהול תפקידים והרשאות",
    ],
    "technician": [
        "ניהול הגדרות ארגון",
        "גישה לנתוני חיוב",
        "ניהול תפקידים",
    ],
    "manager": [
        "גישה לנתוני חיוב",
        "ניהול ארגונים אחרים",
    ],
    "admin": [
        "ניהול ארגונים אחרים",
        "הענקת תפקיד system_admin",
    ],
    "system_admin": [],  # no category restrictions — but still needs confirmation for critical
}
```

### AI agent guidance for denied categories

When the AI encounters a request in a denied category, it uses the prompt's guidance:

```
"אין לך הרשאה לניהול חיוב. לביצוע פעולות חיוב, פנה לאדמין של הארגון או למנהל מערכת."
```

The AI does NOT say "I don't have permission" (implies AI limitation) — it says "You don't have permission" (correct attribution — the user's role limits, not the AI).

---

## §27 — Runtime Re-Check

Every execution of an AI action goes through a fresh server-side permission check, regardless of what the capability context said at session start.

### Re-check checklist

```python
def runtime_permission_check(
    action: AIActionDescriptor,
    actor_user_id: int,
    org_id: int,
) -> PermissionResult:
    """Full re-authorization check at action execution time.

    Called by ActionExecutor._execute_internal() and _execute_http()
    regardless of what was in the session's capability context.
    """
    # 1. User still exists and is active
    user = User.query.filter_by(id=actor_user_id, is_active=True).first()
    if not user:
        return PermissionResult.FORBIDDEN("user deactivated or not found")

    # 2. Org still exists and is active
    org = Organization.query.filter_by(id=org_id, is_active=True).first()
    if not org:
        return PermissionResult.FORBIDDEN("org deactivated")

    # 3. User belongs to this org (prevents org-switch attack)
    if user.org_id != org_id and not user.is_system_admin:
        return PermissionResult.FORBIDDEN("org scope mismatch")

    # 4. Role still valid for action
    if not role_satisfies_min_role(user.primary_role, action.min_role):
        return PermissionResult.FORBIDDEN("role insufficient")

    # 5. Required permission still granted
    for perm in (action.required_permissions or []):
        if not user.has_permission(perm):
            return PermissionResult.FORBIDDEN(f"missing permission: {perm}")

    # 6. Module still enabled for org
    if not is_module_enabled(action.module, org_id):
        return PermissionResult.FORBIDDEN(f"module {action.module} disabled")

    # 7. Feature flag still on
    if action.feature_flag and not get_feature_flag(action.feature_flag, org_id):
        return PermissionResult.FORBIDDEN(f"feature flag {action.feature_flag} disabled")

    # 8. Action not disabled for this org
    if is_action_disabled_for_org(action.action_id, org_id):
        return PermissionResult.FORBIDDEN("action disabled for org")

    # 9. Confirmation token valid (if required)
    # — handled by confirm endpoint before executor is called

    # 10. Tenant scope (DESTRUCTIVE actions additional check)
    if action.risk_tier == "DESTRUCTIVE":
        if not user.has_permission("ai_actions.destructive"):
            return PermissionResult.FORBIDDEN("missing ai_actions.destructive")

    return PermissionResult.ALLOWED
```

### Why this matters despite the capability context

The capability context is generated at session **start**. Between session start and action execution:

- A role may have been changed by an admin
- A module may have been disabled mid-session
- A feature flag may have been toggled
- The user may have been deactivated
- An org may have been suspended
- A policy may have been updated

The context tells the AI what to offer. The re-check enforces what actually executes. These are two independent gates.

---

## §28 — Prompt Invalidation

The `context_version` counter increments whenever any permission-relevant state changes. When the AI session's cached context version is stale, the agent must fetch a fresh context before making further action proposals.

### Invalidation triggers

| Event | Mechanism |
|-------|-----------|
| User role changed | `user.primary_role` write → increment `context_version` |
| Permission granted/revoked | `user_permissions` write → increment |
| Module enabled/disabled for org | Module registry write → increment for all users in org |
| Feature flag toggled | Feature flag write → increment for all affected users |
| User deactivated | `user.is_active = False` → increment |
| Org deactivated | `org.is_active = False` → increment for all users in org |
| Org tier changed (unlocks/locks modules) | Org tier write → increment for all users in org |
| Policy rule added/modified | PolicyRule write → increment for org |
| Org discovery profile updated | Profile write → increment (personalization only, soft refresh) |
| User's own preferences changed | User profile write → increment (language, timezone) |

### Context version storage

```python
# Redis key: ai_ctx_version:{user_id}:{org_id}
# Incremented atomically via INCR on any trigger event
# Read by build_user_capability_context() and included in context response

def increment_context_version(user_id: int, org_id: int) -> int:
    """Increment the context version counter atomically.

    Called from any service that changes permission-relevant state.
    """
    key = f"ai_ctx_version:{user_id}:{org_id}"
    return redis_client.incr(key)

def get_context_version(user_id: int, org_id: int) -> int:
    key = f"ai_ctx_version:{user_id}:{org_id}"
    return int(redis_client.get(key) or 0)
```

### Client-side stale detection

The AI session stores `context_version` at session start. On each action request, the agent sends the stored version. If the backend detects the version is outdated (current > stored), it returns HTTP 409 Conflict with `context_stale: true` — the client must re-fetch context and re-inject the updated prompt before proceeding.

```json
HTTP 409
{
  "error": "context_stale",
  "message": "Your session capabilities have changed. Please refresh.",
  "current_version": 15,
  "your_version": 14
}
```

---

## §29 — Role-Specific Prompt Policies

### Regular User (viewer / technician)

```
System prompt section:
- Can view: own profile, assigned tickets, own ALA sessions
- Cannot perform: user management, org settings, billing, role assignment
- If asked about restricted areas: "הפעולה אינה זמינה לתפקידך. לעזרה נוספת, פנה למנהל."
- Onboarding: if onboarding_mode=true, offer step-by-step guidance
```

### Manager

```
System prompt section:
- Can view + create + manage: tickets, sessions, team members (not user create)
- Cannot perform: org-level settings, billing, role assignment
- Approval queue: high-risk actions go to approval — explain to user that they are pending
```

### Org Admin

```
System prompt section:
- Can manage: users in own org, org settings, roles, modules configuration
- Cannot: manage other organizations, assign system_admin role, access cross-org audit
- Billing: visible if can_see_billing_data=true
- All dangerous actions: require typed confirmation or dashboard approval
```

### System Admin

```
System prompt section:
- Can manage: all organizations, all modules, system settings, audit logs
- Cross-org actions: available but require explicit confirmation
- Critical actions: typed confirmation + reason required — never skip
- Never: expose secrets, raw DB, bypass audit, bulk-delete without typed confirmation
- Reminder in prompt: "בתור מנהל מערכת, כל הפעולות שלך מתועדות. פעולות קריטיות דורשות אישור מפורש."
```

### AI / Service Account

```
System prompt section:
- Only pre-authorized READ and WRITE_LOW actions
- No confirmation dialog (automated pipeline — no human to confirm)
- All actions audited with is_ai_agent=true flag
- Cannot invoke actions with requires_confirmation=true
- Cannot invoke actions with danger_level >= "medium"
```

---

## §30 — Voice-Specific Prompt Constraints

When the session channel is `voice`, the capability context and prompt are modified:

### Action list trimming

Only actions where `voice_invocable: true` appear in the voice session's action list. The voice prompt receives at most 8 actions (vs 20 for text). Action descriptions are condensed to one sentence.

### Voice prompt additions

```python
# Appended to system prompt for voice sessions
VOICE_PROMPT_ADDENDUM = """
הנחיות לשיחת קול:
- שאל שאלות מבהירות לפני ביצוע פעולות.
- אל תבצע פעולות כאשר הכוונה אינה ברורה.
- לפעולות הדורשות אישור: הקרא בקול את שם הפעולה והמושפע ממנה לפני הבקשה לאישור.
- אל תאמר בקול: מפתחות API, סיסמאות, מספרי זהות, פרטי תשלום.
- פעולות קריטיות (dangerLevel=critical): "פעולה זו דורשת אישור דרך הממשק הגרפי. אפתח עבורך את מסך האישור."
- אל תקרא רשימות ארוכות בקול. סכם: "מצאתי 4 רשומות. האם להציג בממשק?"
"""
```

### Voice-specific rules

| Rule | Detail |
|------|--------|
| `voice_invocable: false` | Action never proposed in voice; if user asks, redirect to UI |
| `danger_level >= "high"` | Never executable via verbal confirm. AI says: "פעולה זו דורשת אישור דרך הממשק. שולח לינק." |
| PII reading aloud | Only if `can_see_pii=true` AND user explicitly asked. Never proactively. |
| Ambiguous commands | AI asks clarifying question before requesting confirmation token |
| Silence > 10s during confirm | Confirmation auto-cancelled; AI says "ביטלתי את הפעולה." |
| Multiple actions in one turn | AI executes one at a time; never chains two confirmation flows |

---

## §31 — Personalization and Onboarding Integration

The `org_discovery_profile` and user preferences influence the agent's **suggestions and tone** — not its permissions.

### Personalization rules

| Context field | AI behavior |
|--------------|-------------|
| `onboarding_mode: true` | Proactively offer next-step guidance. "האם תרצה שאסביר לך איך לנהל משתמשים?" |
| `preferred_language: "he"` | All responses in Hebrew by default |
| `support_tier: "managed"` | Offer to create a support ticket for complex issues |
| `support_tier: "self-service"` | Provide self-help documentation links |
| `org_discovery_profile.primary_use_cases` | Prioritize relevant module actions in suggestions |
| `org_discovery_profile.industry` | Adjust terminology (e.g., "technician" → "מנהל רשת" for IT-focused orgs) |

### Personalization does NOT

- Grant access to modules not in `enabled_modules`
- Allow actions not in `available_actions`
- Override privacy restrictions
- Change confirmation requirements

---

## §32 — Security Model Update

This section updates §14 (Security Rules) with context-specific additions.

### Additional security rules (context layer)

| # | Rule |
|---|------|
| S11 | **Context is guidance only.** The AI capability context is NOT a security gate. Every action execution re-checks permissions server-side (§27). A compromised or forged context cannot authorize any action. |
| S12 | **Client cannot supply context.** `GET /api/ai/context` accepts Bearer JWT only. Any attempt to POST a context or override fields returns HTTP 400. |
| S13 | **Context version checked at execution.** If `context_version` is stale by >2 versions at action execution time, return HTTP 409 and require context refresh. |
| S14 | **No action IDs for unauthorized actions.** The `unavailable_action_categories` list contains only human-readable category names — never action IDs, schemas, or handler configs for actions the user cannot execute. |
| S15 | **Prompt injection protection.** The capability prompt is generated server-side and injected as a system message, not a user message. LLM output from the user turn cannot override or append to the system capability section. |
| S16 | **AI agent accounts (service accounts)** may only invoke READ and pre-authorized WRITE_LOW actions. `requires_confirmation: true` actions are never in an AI agent's `available_actions`. |
| S17 | **Personalization data never expands permissions.** Org discovery profiles, user preferences, and onboarding state influence suggestions only — they do not appear in `available_actions` or change role-based filters. |

---

---

## §33 — The AI Is Not Read-Only

_Added: Round 026_

This section exists to remove all ambiguity from the design.

### The AI may execute the full write surface

The AI assistant may execute READ, CREATE, UPDATE, DELETE_SOFT, CONFIGURE, APPROVE, EXECUTE, BULK, and SYSTEM operations — wherever the authenticated human user is authorized to do the same.

There is no architectural restriction that limits the AI to read-only. The AI is a **delegated actor**, not a viewer. The constraint is the **user's permission set**, not the channel.

Examples of AI-executable non-read operations:
- Create a helpdesk ticket
- Update a user's department
- Deactivate a user (soft-delete, with confirmation)
- Replace a role's permission set
- Approve a pending tool invocation
- Close a helpdesk session
- Disable a module for an org
- Run an investigation automation
- Configure an AI provider setting
- Perform a bulk status update (with caps)
- Create/update org-level policy rules (system admin)
- Run an audit log search and return results

### What constrains the AI's write surface

| Constraint | Description |
|-----------|-------------|
| Authenticated user's role | The AI can only do what that user's role permits |
| Authenticated user's permissions | Dot-notation codenames checked at execution |
| Tenant scope | `org_id` from JWT — no cross-org writes for non-system-admin |
| `capabilityLevel` of action | Certain levels require higher roles (see §34) |
| `dangerLevel` | Controls confirmation/approval requirements |
| Module enabled | Write action blocked if its module is disabled |
| Feature flag | Write action blocked if its flag is off |
| Org active | No writes to suspended orgs |
| Delete policy | Hard delete blocked unless policy explicitly allows (see §38) |
| Confirmation/approval | Required for medium+/high+/critical — cannot be skipped |
| Audit | Write audit row is mandatory — execution fails if audit write fails |
| Rate limit | Per-org, per-action sliding window |
| Idempotency key | Required for all write/delete — prevents duplicate execution |

### What the AI may NEVER do regardless of user role

1. Execute actions not in the AI Action Registry
2. Expand its own permissions (e.g., by crafting prompts)
3. Bypass confirmation requirements because "the user said it was OK" in conversation
4. Hard-delete unless delete policy explicitly permits it
5. Execute bulk destructive operations without a per-item audit trail
6. Read or return secrets, tokens, API keys
7. Execute SYSTEM-tier actions via voice-only confirmation
8. Perform cross-tenant actions without system-admin role + explicit confirmation
9. Skip the audit write under any circumstances

---

## §34 — AI Action Capability Levels

Every AI-executable action has a `capabilityLevel` that defines its risk, confirmation requirements, and eligibility rules.

### Capability level taxonomy

| Level | Description | Typical modules |
|-------|-------------|----------------|
| `READ` | Fetch/list/summarize data | All modules |
| `CREATE` | Create records/resources | Users, Helpdesk, Billing, ALA |
| `UPDATE` | Modify existing records or settings | Users, Orgs, Helpdesk, Settings |
| `DELETE_SOFT` | Deactivate/archive/disable — reversible | Users, Orgs, Modules, Tickets |
| `DELETE_HARD` | Permanent deletion — irreversible | Settings, Data Erasure (restricted) |
| `CONFIGURE` | Change org/module/system settings | Settings, AI Providers, Modules |
| `APPROVE` | Approve/reject pending actions | Helpdesk approvals, Workflow |
| `EXECUTE` | Run operational tasks, automations, jobs | Agents, Helpdesk, ALA, Voice |
| `BULK` | Same action on multiple records | Users, Tickets, Data operations |
| `SYSTEM` | Cross-tenant or platform-wide admin | Orgs, Modules, Audit, System config |

### Capability level × role matrix

| Level | viewer | technician | manager | admin | system_admin |
|-------|--------|-----------|---------|-------|-------------|
| `READ` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `CREATE` | ❌ | ✅ (own scope) | ✅ | ✅ | ✅ |
| `UPDATE` | ❌ | ✅ (own scope) | ✅ | ✅ | ✅ |
| `DELETE_SOFT` | ❌ | ❌ | ✅ (own scope) | ✅ | ✅ |
| `DELETE_HARD` | ❌ | ❌ | ❌ | ❌ | ✅ (policy gated) |
| `CONFIGURE` | ❌ | ❌ | ❌ | ✅ (org-scoped) | ✅ |
| `APPROVE` | ❌ | ✅ (limited) | ✅ | ✅ | ✅ |
| `EXECUTE` | ❌ | ✅ (assigned) | ✅ | ✅ | ✅ |
| `BULK` | ❌ | ❌ | ✅ (capped) | ✅ (capped) | ✅ (capped) |
| `SYSTEM` | ❌ | ❌ | ❌ | ❌ | ✅ |

_"Own scope" = records in their assigned department/queue. Exact scoping is module-defined._

### Capability level requirements

| Level | Confirm | Reason | Approval queue | Voice eligible | Rollback expected | Audit required |
|-------|---------|--------|---------------|---------------|------------------|----------------|
| `READ` | ❌ | ❌ | ❌ | ✅ | N/A | Optional |
| `CREATE` | ✅ (medium) | ❌ | ❌ | ✅ (low-risk only) | Soft-delete equivalent | ✅ |
| `UPDATE` | ✅ (medium) | ❌ | ❌ | ✅ (low-risk only) | Revert via UPDATE | ✅ |
| `DELETE_SOFT` | ✅ (medium/high) | ✅ if high | ❌ / ✅ if critical | ❌ | Reactivate | ✅ |
| `DELETE_HARD` | ✅ (critical) | ✅ | ✅ always | ❌ always | Export before delete | ✅ |
| `CONFIGURE` | ✅ (medium/high) | ✅ if high | ❌ / ✅ if critical | ❌ | Revert config | ✅ |
| `APPROVE` | ✅ | ❌ | N/A | ✅ (low-risk) | N/A | ✅ |
| `EXECUTE` | ✅ (high risk) | ✅ if high | ✅ if critical | ✅ (low-risk) | Job cancel if running | ✅ |
| `BULK` | ✅ always | ✅ always | ✅ if DELETE_SOFT+ | ❌ always | Per-item rollback | ✅ per item |
| `SYSTEM` | ✅ always | ✅ always | ✅ always | ❌ always | Varies | ✅ |

### Voice eligibility rule

`voiceEligible = true` requires ALL of:
- `capabilityLevel` in (`READ`, `CREATE`, `UPDATE`, `APPROVE`, `EXECUTE`)
- `dangerLevel` ≤ `"medium"`
- `bulkAllowed = false` (or batch size = 1)
- `hardDeleteAllowed = false`

`DELETE_SOFT`, `DELETE_HARD`, `CONFIGURE`, `BULK`, and `SYSTEM` are never voice-eligible.

---

## §35 — Complete AI Action Registry Schema

> **NOTE (Round 028):** The schema below is a 25-field intermediate draft (Round 026). The canonical `AIActionDescriptor v1` with 30 fields and corrected field names is in `docs/system-upgrade/39-ai-architecture-consistency-pass.md §05`. Key differences: `module` → `module_id`, `name` → `label`, `handler_type` → `executor_type`, `handler_config` → `executor_ref`, `executor_allowlisted + allowed_hosts` → `executor_allowlist_policy`, plus 5 new fields. The §35 schema is a valid reference for field semantics; use doc 39 §05 for canonical names.

### Updated `AIActionDescriptor` (intermediate — see doc 39 §05 for canonical v1)

```python
@dataclass
class AIActionDescriptor:
    # ─── Identity ─────────────────────────────────────────────────────
    action_id: str              # "module.verb" e.g. "users.deactivate"
    module: str                 # "users" | "helpdesk" | "ala" | ...
    name: str                   # Human-readable name (Hebrew/i18n)
    description: str            # One-sentence description for AI context

    # ─── Capability ───────────────────────────────────────────────────
    capability_level: str       # READ | CREATE | UPDATE | DELETE_SOFT | DELETE_HARD |
                                # CONFIGURE | APPROVE | EXECUTE | BULK | SYSTEM
    danger_level: str           # "none" | "low" | "medium" | "high" | "critical"
    min_role: str               # "viewer" | "technician" | "manager" | "admin" | "system_admin"

    # ─── Authorization ────────────────────────────────────────────────
    required_permissions: list[str]  # all must be present (AND logic)
    required_roles: list[str]        # any one sufficient (OR logic)

    # ─── Confirmation ─────────────────────────────────────────────────
    requires_confirmation: bool
    requires_reason: bool        # required for danger_level "high" | "critical"
    requires_approval: bool      # goes to approval queue (danger_level "high" | "critical")
    confirmation_ttl_seconds: int  # default 120; 60 for voice

    # ─── Execution ────────────────────────────────────────────────────
    handler_type: str           # "internal_function" | "http_api"
    handler_config: dict        # function ref OR AIAction HTTP config
    executor_allowlisted: bool  # must be True — no arbitrary endpoints
    idempotency_key_strategy: str  # "user+action+target" | "confirmation_token" | "custom"

    # ─── Bulk ─────────────────────────────────────────────────────────
    bulk_allowed: bool          # whether batch execution is permitted
    max_batch_size: int         # max items in a bulk operation (default 1)
    bulk_requires_individual_audit: bool  # each item gets own audit row

    # ─── Delete policy ────────────────────────────────────────────────
    hard_delete_allowed: bool   # False by default — system policy override only
    soft_delete_reversal: str | None  # action_id that reverses this (e.g. "users.reactivate")

    # ─── Rollback ─────────────────────────────────────────────────────
    rollback_supported: bool
    rollback_action_id: str | None  # action_id to call for rollback

    # ─── Voice ────────────────────────────────────────────────────────
    voice_eligible: bool        # computed from capabilityLevel + dangerLevel rules

    # ─── Audit ────────────────────────────────────────────────────────
    audit_event: str            # "module.action_verb" — written on every execution
    pii_redaction_policy: str   # "none" | "mask_email" | "redact_all" | "voice_safe"

    # ─── Result ───────────────────────────────────────────────────────
    input_schema: dict          # JSON Schema for parameter validation
    output_schema: dict         # JSON Schema for result normalization
    safe_result_summary: str | None  # template: "השבתת {user_name} בוצעה בהצלחה."

    # ─── Feature gating ───────────────────────────────────────────────
    feature_flag: str | None    # optional feature flag that must be enabled
    org_id: int | None          # None = platform-wide; int = org-specific

    # ─── Input validation ─────────────────────────────────────────────
    input_schema_id: str        # e.g. "users.deactivate.v1" — file in schemas/
    allowed_hosts: list[str]    # SSRF allowlist for http_api handlers
```

### Action registry examples

```python
PLATFORM_AI_ACTIONS = [

    # ─── users.create ────────────────────────────────────────────────
    AIActionDescriptor(
        action_id="users.create",
        module="users",
        name="צור משתמש חדש",
        description="יוצר חשבון משתמש חדש בארגון.",
        capability_level="CREATE",
        danger_level="low",
        min_role="admin",
        required_permissions=["users.write"],
        required_roles=["admin", "system_admin"],
        requires_confirmation=True,
        requires_reason=False,
        requires_approval=False,
        confirmation_ttl_seconds=120,
        handler_type="internal_function",
        handler_config={"function": "apps.authentication.user_api_routes.create_user"},
        executor_allowlisted=True,
        idempotency_key_strategy="user+action+email",
        bulk_allowed=False,
        max_batch_size=1,
        bulk_requires_individual_audit=False,
        hard_delete_allowed=False,
        soft_delete_reversal=None,
        rollback_supported=True,
        rollback_action_id="users.deactivate",
        voice_eligible=False,  # admin-only, CREATE → medium risk in practice
        audit_event="users.create",
        pii_redaction_policy="mask_email",
        input_schema={"type": "object", "required": ["email", "name", "role_id"]},
        output_schema={"type": "object", "properties": {"user_id": {"type": "integer"}}},
        safe_result_summary="המשתמש {user_name} נוצר בהצלחה.",
        feature_flag=None,
        org_id=None,
        input_schema_id="users.create.v1",
        allowed_hosts=[],
    ),

    # ─── users.update ────────────────────────────────────────────────
    AIActionDescriptor(
        action_id="users.update",
        module="users",
        name="עדכן פרטי משתמש",
        description="מעדכן שדות פרופיל של משתמש קיים.",
        capability_level="UPDATE",
        danger_level="low",
        min_role="admin",
        required_permissions=["users.write"],
        required_roles=["admin", "system_admin"],
        requires_confirmation=True,
        requires_reason=False,
        requires_approval=False,
        confirmation_ttl_seconds=120,
        handler_type="internal_function",
        handler_config={"function": "apps.authentication.user_api_routes.update_user"},
        executor_allowlisted=True,
        idempotency_key_strategy="confirmation_token",
        bulk_allowed=False,
        max_batch_size=1,
        bulk_requires_individual_audit=False,
        hard_delete_allowed=False,
        soft_delete_reversal=None,
        rollback_supported=True,
        rollback_action_id=None,  # reversible via another UPDATE
        voice_eligible=False,
        audit_event="users.update",
        pii_redaction_policy="mask_email",
        input_schema={"type": "object", "required": ["user_id"], "additionalProperties": True},
        output_schema={"type": "object", "properties": {"success": {"type": "boolean"}}},
        safe_result_summary="פרטי המשתמש עודכנו בהצלחה.",
        feature_flag=None,
        org_id=None,
        input_schema_id="users.update.v1",
        allowed_hosts=[],
    ),

    # ─── users.deactivate ────────────────────────────────────────────
    AIActionDescriptor(
        action_id="users.deactivate",
        module="users",
        name="השבת משתמש",
        description="מונע מהמשתמש להתחבר. ניתן לשחזור.",
        capability_level="DELETE_SOFT",
        danger_level="medium",
        min_role="admin",
        required_permissions=["users.write"],
        required_roles=["admin", "system_admin"],
        requires_confirmation=True,
        requires_reason=False,
        requires_approval=False,
        confirmation_ttl_seconds=120,
        handler_type="internal_function",
        handler_config={"function": "apps.authentication.user_api_routes.deactivate_user"},
        executor_allowlisted=True,
        idempotency_key_strategy="confirmation_token",
        bulk_allowed=False,
        max_batch_size=1,
        bulk_requires_individual_audit=False,
        hard_delete_allowed=False,
        soft_delete_reversal="users.reactivate",
        rollback_supported=True,
        rollback_action_id="users.reactivate",
        voice_eligible=False,  # DELETE_SOFT → never voice
        audit_event="users.deactivate",
        pii_redaction_policy="mask_email",
        input_schema={"type": "object", "required": ["user_id"]},
        output_schema={"type": "object", "properties": {"success": {"type": "boolean"}}},
        safe_result_summary="המשתמש {user_name} הושבת. ניתן לשחזר בכל עת.",
        feature_flag=None,
        org_id=None,
        input_schema_id="users.deactivate.v1",
        allowed_hosts=[],
    ),

    # ─── organizations.update ────────────────────────────────────────
    AIActionDescriptor(
        action_id="organizations.update",
        capability_level="UPDATE",
        danger_level="medium",
        min_role="system_admin",
        requires_confirmation=True,
        requires_reason=False,
        requires_approval=False,
        bulk_allowed=False,
        hard_delete_allowed=False,
        voice_eligible=False,
        audit_event="orgs.update",
        # ... other fields omitted for brevity
    ),

    # ─── organizations.deactivate ─────────────────────────────────────
    AIActionDescriptor(
        action_id="organizations.deactivate",
        capability_level="DELETE_SOFT",
        danger_level="high",
        min_role="system_admin",
        requires_confirmation=True,
        requires_reason=True,
        requires_approval=True,    # high → approval queue
        bulk_allowed=False,
        hard_delete_allowed=False,
        voice_eligible=False,
        audit_event="orgs.deactivate",
    ),

    # ─── roles.permissions_replace ───────────────────────────────────
    AIActionDescriptor(
        action_id="roles.permissions_replace",
        capability_level="CONFIGURE",
        danger_level="high",
        min_role="admin",
        requires_confirmation=True,
        requires_reason=True,
        requires_approval=True,
        bulk_allowed=False,
        hard_delete_allowed=False,
        voice_eligible=False,     # CONFIGURE → never voice
        audit_event="roles.permissions_replace",
    ),

    # ─── modules.disable ─────────────────────────────────────────────
    AIActionDescriptor(
        action_id="modules.disable",
        capability_level="SYSTEM",
        danger_level="high",
        min_role="system_admin",
        requires_confirmation=True,
        requires_reason=True,
        requires_approval=True,
        bulk_allowed=False,
        hard_delete_allowed=False,
        voice_eligible=False,     # SYSTEM → never voice
        audit_event="modules.disable",
    ),

    # ─── audit.search ────────────────────────────────────────────────
    AIActionDescriptor(
        action_id="audit.search",
        capability_level="READ",
        danger_level="none",
        min_role="admin",
        required_permissions=["audit.read"],
        requires_confirmation=False,
        requires_reason=False,
        requires_approval=False,
        bulk_allowed=False,
        hard_delete_allowed=False,
        voice_eligible=False,     # result sets too large for voice
        audit_event="audit.search",
        pii_redaction_policy="voice_safe",
    ),

    # ─── helpdesk.ticket.close ───────────────────────────────────────
    AIActionDescriptor(
        action_id="helpdesk.ticket.close",
        capability_level="UPDATE",
        danger_level="low",
        min_role="technician",
        requires_confirmation=True,
        requires_reason=False,
        requires_approval=False,
        bulk_allowed=False,
        hard_delete_allowed=False,
        voice_eligible=True,      # UPDATE + low → eligible
        audit_event="helpdesk.ticket.close",
    ),

    # ─── ai.approval.approve ─────────────────────────────────────────
    AIActionDescriptor(
        action_id="ai.approval.approve",
        capability_level="APPROVE",
        danger_level="medium",
        min_role="manager",
        requires_confirmation=True,
        requires_reason=False,
        requires_approval=False,  # approval itself doesn't need another approval
        bulk_allowed=False,
        hard_delete_allowed=False,
        voice_eligible=True,      # APPROVE + medium → eligible (manager+)
        audit_event="ai.approval.approve",
    ),
]
```

---

## §36 — Delegated Human vs Service Account

### The critical distinction

| | Delegated human actor | AI/service account (is_ai_agent) |
|--|----------------------|----------------------------------|
| **Identity** | Authenticated user (JWT) | Service token (JWT with is_ai_agent=True) |
| **Business authorization** | User's own role + permissions | Always based on delegated human actor |
| **Can determine write authorization** | ✅ | ❌ — never alone |
| **Can authorize CREATE/UPDATE/DELETE** | ✅ (if role permits) | ❌ without human delegation |
| **Available actions** | All role-appropriate actions | READ + pre-authorized WRITE_LOW only |
| **Confirmation-required actions** | ✅ with human confirmation | ❌ never — no human to confirm |
| **Used for** | AI sessions on behalf of a logged-in human | Background jobs, webhooks, integrations |

### Service account restriction (non-negotiable)

A service account JWT (`is_ai_agent=True`) **alone** cannot authorize any business write operation. It must carry delegated human context:

```python
# Service-to-service request with delegated actor
{
    "Authorization": "Bearer <service_token>",
    "X-Delegated-User-Id": "42",          # JWT-signed by issuing service
    "X-Delegated-Org-Id": "7",
    "X-Delegation-Token": "<signed_token>"  # verified by backend before trusting
}
```

The backend **validates the delegation token** before using the delegated user context. If delegation is missing or invalid, the request is treated as the service account acting alone — which is only authorized for READ.

### Implications for the AI Action Platform

- The ALA voice gateway (a service) carries the caller's user_id in the delegation context
- The Helpdesk AI engine carries the session's technician_user_id
- The Investigation Console carries the analyst's user_id
- None of these services authorize writes using their own service token — they delegate to the human

---

## §37 — Execution Viability Checks

Before any action executes, the backend runs a viability check. **Execution fails closed** — if any check is uncertain, the action does not run.

```python
@dataclass
class ViabilityCheckResult:
    allowed: bool
    failure_reason: str | None
    failure_code: str | None  # for structured error responses

def check_execution_viability(
    action: AIActionDescriptor,
    actor_user_id: int,
    org_id: int,
    parameters: dict,
    confirmation_token: AIActionConfirmationToken | None,
    idempotency_key: str | None,
) -> ViabilityCheckResult:
```

### Viability check sequence

| # | Check | Failure code | Notes |
|---|-------|-------------|-------|
| 1 | Action exists in registry | `action_not_found` | |
| 2 | Action is active/enabled | `action_disabled` | `AIAction.active = True` |
| 3 | Module is enabled for org | `module_disabled` | |
| 4 | Feature flag is on | `feature_flag_disabled` | Skip if `action.feature_flag is None` |
| 5 | Authenticated user is active | `user_deactivated` | `User.is_active = True` |
| 6 | Organization is active | `org_deactivated` | `Organization.is_active = True` |
| 7 | User belongs to org (or is system_admin) | `org_scope_mismatch` | Anti org-switch attack |
| 8 | User role ≥ `action.min_role` | `role_insufficient` | Role rank comparison |
| 9 | User has required permissions | `permission_denied` | All `required_permissions` must be present |
| 10 | `capabilityLevel` allowed for user role | `capability_level_denied` | See §34 matrix |
| 11 | Target resource belongs to user's org | `target_scope_violation` | Checked per action |
| 12 | Confirmation token valid (if required) | `confirmation_invalid` | Not expired, not used, hash matches |
| 13 | Approval valid (if required) | `approval_not_found` | For approval_queue flow |
| 14 | Reason present (if required) | `reason_required` | |
| 15 | Idempotency key present for write/delete | `idempotency_key_missing` | All CREATE/UPDATE/DELETE* |
| 16 | Idempotency key not already used | `idempotency_duplicate` | Redis check, TTL = 60s |
| 17 | Rate limit allows execution | `rate_limit_exceeded` | Per-org, per-action |
| 18 | Bulk size ≤ `action.max_batch_size` | `bulk_size_exceeded` | |
| 19 | `hard_delete_allowed = True` for DELETE_HARD | `hard_delete_blocked` | Policy gate |
| 20 | `DESTRUCTIVE` permission for DESTRUCTIVE tier | `destructive_permission_denied` | |
| 21 | Executor is allowlisted | `executor_not_allowlisted` | `executor_allowlisted = True` |
| 22 | Audit write will be possible | `audit_unavailable` | Pre-check DB connectivity |

**Failure behavior:** Return structured error with `failure_code` and user-safe `message`. Never expose internal details (DB paths, function names, stack traces). Always log the full detail server-side.

---

## §38 — Implementation Readiness Checklist

The AI Action Platform is **not implementation-ready** until all items below are checked. This checklist is the gate for starting R027 backend work.

### Core infrastructure

- [ ] `AIActionDescriptor` dataclass with all fields from §35 is defined
- [ ] `AIActionRegistry` loads static platform actions + org-level `AIAction` DB rows
- [ ] Registry produces only allowlisted executor references — no arbitrary endpoint execution
- [ ] `AIActionRegistry.get_actions_for_user()` returns role-filtered summaries
- [ ] `AIActionConfirmationToken` model with TTL, single-use, SHA-256 hash
- [ ] `AIActionInvocation` audit model (monthly partitioned)
- [ ] `AIUserCapabilityContext` dataclass + `build_user_capability_context()`
- [ ] `build_ai_capability_prompt()` function
- [ ] JSON Schema files for all platform actions under `apps/ai_action_platform/schemas/`
- [ ] `check_execution_viability()` with all 22 checks from §37
- [ ] Idempotency key Redis mechanism (SETNX, 60s TTL)
- [ ] Audit write is mandatory — executor does not return until audit is committed

### Tests (must pass before R027 ships)

**Positive path tests:**

- [ ] `READ` action: list users → success + audit row
- [ ] `CREATE` action: create user → success + audit row + idempotency enforced
- [ ] `UPDATE` action: update user field → success + audit + rollback available
- [ ] `DELETE_SOFT` action: deactivate user → success + audit + reversal action present
- [ ] `APPROVE` action: approve pending tool invocation → success + session resumes
- [ ] `EXECUTE` action: run automation → success + job audit
- [ ] `BULK` action: bulk status update (≤ max_batch_size) → per-item audit rows

**Negative / security tests:**

- [ ] Unauthorized action: viewer tries `users.deactivate` → `permission_denied`, no execution
- [ ] Wrong org: user in org 7 tries to target resource in org 8 → `target_scope_violation`
- [ ] Stale context: permission revoked mid-session → re-check blocks execution (not context)
- [ ] Expired confirmation token: invoke after TTL → `confirmation_invalid`
- [ ] Duplicate idempotency key within 60s → `idempotency_duplicate`
- [ ] Bulk over max_batch_size → `bulk_size_exceeded`
- [ ] Hard delete attempted by admin (not system_admin) → `hard_delete_blocked`
- [ ] Hard delete with `hard_delete_allowed = False` → `hard_delete_blocked`
- [ ] Prompt injection: LLM output attempts to add new action to registry → rejected (registry is static)
- [ ] Service account alone (no delegated user) tries `users.create` → `permission_denied`
- [ ] Voice session requests `DELETE_SOFT` → `voice_ineligible`
- [ ] Voice session requests `SYSTEM` action → `voice_ineligible`
- [ ] Voice session requests `BULK` action → `voice_ineligible`
- [ ] Audit write fails: action execution rolled back
- [ ] `audit.search` with `pii_redaction_policy="voice_safe"` → PII fields redacted in result

---

## §39 — Voice Write/Delete Constraints

Voice sessions may initiate write actions. This section defines exactly which writes are permitted and which are not.

### Permitted in voice

| Action | Level | Max danger | Condition |
|--------|-------|-----------|-----------|
| Create ticket | CREATE | low | ticket form simple enough to confirm verbally |
| Close ticket | UPDATE | low | `helpdesk.ticket.close` |
| Approve pending action | APPROVE | medium | confirmation: read action name + target aloud |
| Execute automation (simple) | EXECUTE | low | pre-configured job with no parameters |
| Look up / search | READ | none | always |

### Prohibited in voice (non-overridable)

| Action | Why |
|--------|-----|
| Any `DELETE_SOFT` | Must use UI confirmation — too consequential for voice |
| Any `DELETE_HARD` | Always prohibited in voice |
| Any `CONFIGURE` | Settings changes require UI — too complex for verbal accuracy |
| Any `BULK` | Multiple targets cannot be safely confirmed verbally |
| Any `SYSTEM` | Cross-tenant/platform-wide — always requires UI + approval |
| `danger_level >= "high"` | Hard ceiling — no exceptions |
| Actions with `voice_eligible = false` | Registry-declared |

### Voice write behavior rules

1. **Read-back required:** Before requesting confirmation for any write, the AI reads aloud the action name, the target resource name/identifier, and the change summary. Example: "אני עומד להשעות את ג'וב ראנר 12. האם לאשר?"
2. **One action at a time:** If the user requests multiple writes in one turn, the AI handles them sequentially — one confirmation at a time. Never batches confirmations.
3. **Ambiguous commands require clarification:** If the target is not clear (e.g. "close that ticket" when multiple are open), the AI asks before requesting a confirmation token. No speculative token creation.
4. **10-second silence = cancel:** If the AI is waiting for verbal confirm and hears silence for 10 seconds, the confirmation token is marked `denied` and the AI says "ביטלתי".
5. **AI never reads PII aloud proactively:** Before reading back a target resource, the AI checks `pii_redaction_policy`. If `voice_safe`, it uses a safe identifier (display name or masked ID) — never full email, phone, or ID number.
6. **No chaining:** Voice confirmation flows are never chained. One write per conversational turn.

---

## §40 — Delete Policy

### Default: prefer soft delete

All AI-executable delete-type operations default to soft delete (deactivate/archive/disable). Hard delete is **disabled by default** for all AI actions.

### Hard delete requirements

Hard delete may only be enabled when ALL of the following are true:

| Requirement | Enforced by |
|-------------|------------|
| `capability_level = "DELETE_HARD"` | Registry field |
| `hard_delete_allowed = true` | Registry field (default false) |
| `danger_level = "critical"` | Registry field |
| `min_role = "system_admin"` | Registry field |
| `requires_confirmation = true` with typed phrase | ConfirmActionDialog |
| `requires_reason = true` | Enforced at execution |
| `requires_approval = true` | Goes to approval queue |
| Retention policy documented | Before hard delete action can be added to registry |
| Restore/export policy: data exported before deletion | Executor runs export before delete |
| Audit row committed before delete executes | Transaction order enforced |
| `ai_actions.destructive` permission granted | User permission check |

### Current registry state

No action in the initial platform registry has `hard_delete_allowed = true`. Hard delete actions are blocked from registry addition until:

1. The platform has a data retention policy document
2. A pre-delete export mechanism exists
3. The legal/compliance team has reviewed the action

### AI behavior on hard delete request

If a user asks the AI to permanently delete something:

1. AI checks registry — no hard delete action available
2. AI responds: "מחיקה סופית אינה זמינה דרך הסוכן. להסרת נתונים באופן סופי, פנה למנהל המערכת לביצוע ידני עם מדיניות שמירת נתונים."
3. AI may offer the soft-delete equivalent if available: "האם להשבית במקום למחוק?"

---

---

## §41 — Frontend Surface: Global Floating AI Assistant

The primary frontend delivery mechanism for the AI Action Platform is the Global Floating AI Assistant, designed in `docs/system-upgrade/38-floating-ai-assistant.md`.

Key integration points between this platform and the assistant:

| This document | Floating Assistant |
|--------------|-------------------|
| `AIUserCapabilityContext` (§23) | Loaded once on first interaction; `availableActionIds` drives action proposals |
| `AIActionConfirmationToken` (§06) | `pendingConfirmationTokenId` tracked in `AIAssistantSessionState` |
| `context_version` (§28) | Checked before each request; `contextVersion` field in session state |
| `check_execution_viability()` (§37) | Called server-side before every execution regardless of client state |
| `AIActionInvocation` audit (§07) | Writes before returning; session resumption reads last audit row |
| Voice eligibility formula (§39) | Controls which actions appear in voice-mode assistant action list |

The assistant makes **zero LLM calls** until explicit user interaction. Page navigation never triggers an API call. See doc 38 for lazy loading rules, session state model, and cost-control hard rules.

---

_Document updated: 2026-04-24 (Round 026 — §33–§40 added; Round 027 — §41 added)_
_Next implementation round: R027 — AI Action Platform Foundation_
