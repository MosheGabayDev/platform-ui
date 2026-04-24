# 38 — Global Floating AI Assistant

_Round 027 — 2026-04-24_
_Status: Architecture design complete. Implementation not started._

> **Cost-control invariant**: The floating icon is visible everywhere. No LLM call occurs until the user explicitly interacts with the assistant (opens drawer, sends message, confirms action, or continues a workflow). Page navigation never triggers an LLM call by itself.

> **Conversation-continuity invariant**: The assistant session persists across route changes. A multi-page workflow is not interrupted by navigation. Context is updated on route change but never sent to the LLM until the user next interacts.

---

## §01 — What the Floating AI Assistant Is

The Floating AI Assistant is a persistent UI element present on every authenticated platform-ui page. It surfaces the AI Action Platform (doc 36) and AI User Capability Context (doc 36 §23–§32) through a conversational UX that adapts to the user's current page and ongoing tasks.

It is NOT:
- A chatbot that loads eagerly on every page
- A UI widget that calls the LLM on hover or focus
- A component that resets when the user navigates

It IS:
- A lazy-loaded, session-persistent conversational layer
- The primary UI surface for AI-delegated actions (doc 36)
- Context-aware but cost-controlled
- Persistent across the user's authenticated session (not just a page)

---

## §02 — Lazy AI Context Loading

### Rule: the icon is never expensive

The floating icon (`FloatingAIButton`) renders a static icon with an unread-notification badge. It performs no LLM calls, no capability context fetches, and no page analysis while idle.

```
[page load]
  → render FloatingAIButton (static icon, badge from lightweight store)
  → NO: GET /api/ai/context
  → NO: LLM call
  → NO: page context analysis
  → NO: prompt construction
```

### When context loads

Context loads **only on explicit user interaction**:

| Trigger | What loads |
|---------|-----------|
| User clicks floating icon (first time in session) | `GET /api/ai/context` → session initialized |
| User opens assistant drawer | Drawer renders with session state (already loaded) |
| User sends a message | Current page context diff attached to next LLM call |
| User confirms a pending action | Confirmation token fetched from session state |
| Active workflow resumes on a new page | Diff of previous → current page attached to continuation prompt |

### Lightweight local tracking (allowed without LLM)

These are allowed while the assistant is idle:

| What | How |
|------|-----|
| Track current route (`currentPageId`) | React Router / Next.js `usePathname()` — local only |
| Track previous route (`previousPageId`) | In-memory store — local only |
| Compute `currentPageContextHash` | Hash of `pageId + moduleVersion + selectedResourceId` — local only |
| Show unread badge on icon | From session state in memory — no API call |
| Show "active workflow" banner | From session `activeObjective` field — already loaded in session state |

### Static page explanations (no LLM required)

When the user first opens the assistant on a page, the assistant may show a static description of the page sourced from `PageAIContext` metadata — without calling the LLM:

```
"ברוך הבא לעמוד ניהול משתמשים. כאן תוכל לצפות, ליצור, לעדכן ולנהל משתמשים בארגון שלך."
```

This is rendered from the page's `PageAIContext.staticDescription` field — plain metadata, not LLM output. The LLM is called only when the user sends a free-text message or starts a task.

---

## §03 — Persistent Conversation Across Navigation

### The conversation does not reset on route change

```
User: "Create onboarding flow for 5 new users"
Assistant: "Let's start. What department are they in?"
[User navigates to /users/create]
Assistant: "I see you moved to the Create User page. I can help you create the first user in the onboarding flow."
```

The conversation ID, active objective, pending actions, and workflow state all persist across route changes. Only the page context diff is updated.

### What persists vs what updates on route change

| State | Route change behavior |
|-------|-----------------------|
| `conversationId` | Unchanged |
| `userId`, `orgId` | Unchanged |
| `status` | Unchanged (e.g., `awaiting_user` stays) |
| `activeObjective` | Unchanged |
| `activeWorkflowId` | Unchanged |
| `pendingActionId` | Unchanged |
| `pendingConfirmationTokenId` | Unchanged (subject to TTL) |
| `contextVersion` | Re-fetched if stale (silent, no LLM call) |
| `currentPageId` | **Updated** to new route |
| `previousPageId` | **Replaced** with old `currentPageId` |
| `lastPageContextHash` | **Updated** to new page hash |
| `lastLLMContextHash` | Unchanged (reflects last context sent to LLM) |

### Route change LLM policy

```
[route change]
  → update currentPageId
  → update previousPageId
  → compute new currentPageContextHash
  → compare with lastLLMContextHash
  → if different AND (active_workflow OR user_sends_next_message):
      attach page context diff to next LLM call
  → if different AND assistant is idle:
      store diff locally — do NOT send to LLM
```

---

## §04 — Context Diffing

On every route change, the assistant computes a **page context diff** — the minimum change description needed for the LLM to understand the new page context.

### Diff computation

```typescript
// lib/platform/ai-assistant/context-diff.ts

interface PageContextDiff {
  previousPageId: string | null;
  currentPageId: string;
  // Actions that appeared (user navigated to a page with more actions)
  addedActions: string[];           // action_ids
  // Actions that disappeared
  removedActions: string[];         // action_ids
  // Resource context changed (e.g., user navigated to a different ticket)
  resourceChanged: boolean;
  newResourceId?: string;
  newResourceType?: string;
  // Whether the diff is relevant to the active objective
  relevantToObjective: boolean;
}

function computePageContextDiff(
  prev: PageAIContext | null,
  next: PageAIContext,
  activeObjective: string | null,
): PageContextDiff {
  // ...
}
```

### Diff send policy

| Condition | Send diff to LLM? |
|-----------|-----------------|
| Diff is empty (same page, same resource) | No |
| Diff non-empty, assistant is idle | No — stored locally |
| Diff non-empty, user sends next message | Yes — prepended to message context |
| Diff non-empty, active workflow on new page | Yes — prepended automatically |
| Diff is irrelevant to active objective | No — suppressed |

### Relevance check

`relevantToObjective` is computed by matching the new page's module + actions against the active objective's declared modules:

```typescript
// Objective: "create onboarding flow for new users"
// New page: /users/create (module: "users", actions: ["users.create"])
// Match: objective mentions "users" → relevantToObjective = true

// Objective: "create onboarding flow for new users"
// New page: /settings/billing (module: "billing")
// Match: objective does not mention "billing" → relevantToObjective = false
// → diff suppressed
```

---

## §05 — Session State Model

### Client-side session state

Stored in Zustand (in-memory, never persisted to localStorage by default).

```typescript
// lib/platform/ai-assistant/session-store.ts

export type AIAssistantStatus =
  | "idle"
  | "active"
  | "awaiting_user"
  | "awaiting_confirmation"
  | "awaiting_approval"
  | "completed";

export interface AIAssistantSessionState {
  // ─── Identity ────────────────────────────────────────────────────
  conversationId: string;           // UUID — stable for session lifetime
  userId: number;
  orgId: number;

  // ─── Status ──────────────────────────────────────────────────────
  status: AIAssistantStatus;

  // ─── Task ────────────────────────────────────────────────────────
  activeObjective?: string;         // human-readable task description
  activeWorkflowId?: string;        // links to structured workflow if any

  // ─── Pending action ──────────────────────────────────────────────
  pendingActionId?: string;         // action_id awaiting confirmation
  pendingConfirmationTokenId?: string; // AIActionConfirmationToken.id

  // ─── Page context ────────────────────────────────────────────────
  currentPageId?: string;           // "/users" | "/helpdesk/tickets/42" etc.
  previousPageId?: string;
  lastPageContextHash?: string;     // hash of currentPageId + resource + actions
  lastLLMContextHash?: string;      // hash of the context last sent to LLM

  // ─── Capability context ──────────────────────────────────────────
  contextVersion: number;           // from GET /api/ai/context
  capabilityContextLoadedAt?: string; // ISO timestamp

  // ─── UI state ────────────────────────────────────────────────────
  drawerOpen: boolean;
  drawerMinimized: boolean;
  unreadCount: number;

  // ─── Timestamps ──────────────────────────────────────────────────
  sessionStartedAt: string;
  updatedAt: string;
}
```

### What lives where

| Field | Lives | Persisted? |
|-------|-------|-----------|
| `conversationId` | Client Zustand store | No (session memory only) |
| `userId`, `orgId` | Client Zustand store | No — derived from JWT on session start |
| `status`, `activeObjective`, `activeWorkflowId` | Client Zustand store | No |
| `pendingActionId`, `pendingConfirmationTokenId` | Client Zustand store | No — confirmation token has server TTL |
| `currentPageId`, `lastPageContextHash` | Client Zustand store | No |
| `lastLLMContextHash` | Client Zustand store | No |
| `contextVersion` | Client Zustand store + Redis (server) | Server-side only (Redis) |
| Conversation messages (chat history) | Client Zustand store | Optional — see retention policy below |
| AI action audit (`AIActionInvocation`) | Server DB (monthly partitioned) | Yes — permanent audit |
| Confirmation tokens (`AIActionConfirmationToken`) | Server DB | Yes — until TTL + 24h |
| Conversation summaries | Server DB (optional) | Yes — if periodic summarization enabled |

### Conversation retention policy

- **Default:** conversation messages are in-memory only; lost on page refresh
- **Optional:** server-side conversation storage (future feature) — each message stored with TTL (7 days)
- **Stored summaries:** if the conversation exceeds N messages, a summary is periodically generated and stored (server-side, no secrets)
- **What stored summaries must never contain:** secrets, API keys, PII beyond display names, raw data from table rows, confirmation token IDs

---

## §06 — LLM Cost-Control Rules

These rules are non-negotiable. Any implementation that violates them is incorrect.

### Hard rules (never allowed)

| Rule | Detail |
|------|--------|
| No LLM call on page load | `FloatingAIButton` renders without any API call |
| No LLM call on route change | Route change updates local state only |
| No LLM call on hover or focus | Tooltip is static |
| No LLM call while icon is idle | Idle = drawer closed and no active workflow |
| No LLM call just to show the floating icon | Icon state comes from local Zustand |
| Never send full table data to LLM | Max: paginated row summaries if user explicitly requests and authorizes |
| Never send secrets to LLM context | Secrets never in prompt under any circumstances |

### Soft rules (implement to reduce cost)

| Rule | Detail |
|------|--------|
| Cache capability context by `context_version` | `GET /api/ai/context` → cache 60s in memory; don't re-fetch until `context_version` changes |
| Cache page context by `pageId + moduleVersion` | `PageAIContext` summaries can be cached 5 minutes |
| Static help before LLM | Show `PageAIContext.staticDescription` without LLM for "What is this page?" |
| Context diff not full context resend | On route change, send only the diff, not the full capability context again |
| Trim transcript sent to LLM | Keep last N turns (default: 10) + periodic summary of older turns |
| Summarize long conversations | After 20 messages, generate a summary and use it as context prefix (server-side) |
| Suppress irrelevant page diffs | Don't send page context diff if diff is not relevant to active objective |

---

## §07 — UX State Machine

### States

```
idle
  → [user clicks icon] → initializing
  → [active workflow on load] → show_banner (no LLM)

initializing
  → [GET /api/ai/context succeeds] → ready
  → [error] → error_state

ready (drawer open, no active task)
  → [user sends message] → active
  → [user closes drawer] → idle
  → [route change] → ready (page context updated, no LLM)

active (LLM call in flight or awaiting user)
  → [LLM responds] → awaiting_user
  → [error] → error_state

awaiting_user
  → [user sends message] → active
  → [user requests action] → awaiting_confirmation or awaiting_approval
  → [user closes drawer] → minimized_active
  → [route change] → awaiting_user (context diff stored, not sent)

minimized_active (open but minimized — active task ongoing)
  → [user opens drawer] → awaiting_user
  → [route change] → minimized_active (update page context diff)
  → [active workflow arrives on relevant page] → show_page_note

awaiting_confirmation
  → [user confirms] → executing_action
  → [user cancels] → awaiting_user
  → [TTL expires] → awaiting_user (token expired message shown)
  → [route change] → awaiting_confirmation (token still pending, banner shown)

awaiting_approval
  → [approval queue event received] → executing_action
  → [user cancels] → awaiting_user
  → [route change] → awaiting_approval (banner shown on new page)

executing_action
  → [success] → awaiting_user (result shown)
  → [failure] → awaiting_user (error shown)

completed
  → [user starts new task] → active
  → [user clears conversation] → ready
```

### Route change behavior by state

| State | Route change behavior |
|-------|-----------------------|
| `idle` | Update `currentPageId`, `previousPageId` — nothing shown |
| `ready` | Update page context. If drawer is open: show system note "עברת ל-[PageName]" (not LLM) |
| `awaiting_user` | Update page context diff. Show system note. Next user message will include diff. |
| `minimized_active` | Update page context diff. Show/update active workflow banner. |
| `awaiting_confirmation` | Keep confirmation UI visible. Show warning: "ביצוע הפעולה ממתין לאישורך." |
| `awaiting_approval` | Keep approval-pending UI. Show banner: "הפעולה ממתינה לאישור מנהל." |

---

## §08 — UX Component Structure

```
FloatingAIButton         — always visible, no API calls
├── UnreadBadge          — from Zustand store (no API)
└── WorkflowBanner       — when activeObjective set (from store)

AIAssistantDrawer        — renders when drawerOpen=true
├── DrawerHeader
│   ├── PageContextNote  — "כעת בעמוד: ניהול משתמשים" (from PageAIContext, no LLM)
│   └── ClearButton / NewTaskButton
├── ChatThread           — message history from Zustand
│   └── MessageBubble
├── ActionPreviewCard    — when pendingActionId set (from store)
│   └── ConfirmActionDialog — reuses existing component
├── ApprovalPendingBanner — when status=awaiting_approval
├── ChatInput
│   ├── QuickActionsBar  — voice/attachment/help shortcuts
│   └── SendButton
└── ContextRefreshButton — manual "refresh context" (triggers re-fetch)
```

### Key UX behaviors

| Interaction | Behavior |
|-------------|----------|
| "Continue previous task?" | Shown if `activeObjective` set and session just re-opened after idle |
| "Context updated" system note | Plain text, not LLM-generated: "עברת ל-[PageName]. ההקשר עודכן." |
| Manual "Refresh context" button | Triggers `GET /api/ai/context` + recompute `currentPageContextHash` |
| Clear conversation | Resets `conversationId`, messages, `activeObjective`, pending action. Does NOT revoke confirmation token. |
| Start new task | Preserves `conversationId` but creates new objective — previous summary retained as context |
| Resume task | Loads `activeObjective` into fresh LLM call with summary as prefix |

---

## §09 — PageAIContext Schema

Each platform-ui page exports a `PageAIContext` object. This is static metadata — not LLM-generated.

```typescript
// lib/platform/ai-assistant/page-context.ts

export interface PageAIContext {
  /** Stable ID for this page/route. */
  pageId: string;                   // "users.list" | "helpdesk.ticket.detail" | etc.
  /** Human-readable page name (Hebrew). */
  pageName: string;
  /** Static one-sentence description shown in assistant without LLM. */
  staticDescription: string;
  /** Module this page belongs to. */
  module: string;
  /** AI actions available from this page (subset of full registry). */
  availableActionIds: string[];
  /** Currently selected resource, if any. */
  selectedResource?: {
    type: string;   // "user" | "ticket" | "org" | ...
    id: string;
    displayName: string;
  };
  /** Page version for cache invalidation. */
  moduleVersion: string;
}
```

Pages declare their `PageAIContext` via a `useRegisterPageContext(context)` hook called once on mount. This writes to the Zustand store — no API call.

---

## §10 — Security and Privacy Rules

### Conversation continuity must not bypass permissions

1. On every AI action execution, backend re-checks permissions (§27 of doc 36) — stale conversation context cannot authorize anything.
2. On `context_version` increment (role/module/flag change), the client re-fetches `GET /api/ai/context` silently. The assistant notifies: "ההרשאות שלך עודכנו. ממשיך עם ההרשאות החדשות."
3. If a resource the conversation was discussing becomes inaccessible after a permission change or navigation, the assistant drops it from active context: "המשאב שדנו בו אינו נגיש עוד. מה תרצה לעשות?"

### Org switch rule

If the user's `org_id` changes (e.g., system admin switches tenant context):

- All conversation state is reset: `conversationId` regenerated, messages cleared, `activeObjective` cleared, pending action cleared
- Pending confirmation tokens from the previous org are invalidated client-side (they also expire server-side by TTL)
- The assistant shows: "עברת לארגון [OrgName]. שיחה חדשה נפתחה."
- Conversation history from the previous org must never be carried into the new org context

### Page context must be permission-filtered

The `PageAIContext.availableActionIds` attached to an LLM call must be intersected with the current session's `available_actions` from `AIUserCapabilityContext`. Actions that appear on the page but are not in the user's capability context are stripped before sending.

### Stored summaries

- Must not contain: secrets, API keys, confirmation token IDs, raw DB values, PII beyond display names
- Retention: 7 days (configurable) with explicit expiry
- Deletion: user may request conversation data deletion via settings (future)

### What the assistant never does based on stale context

| Stale state | Correct behavior |
|-------------|----------------|
| Old `context_version` | Re-fetch before next action proposal |
| Old `lastLLMContextHash` | Recompute diff and attach to next message |
| Expired confirmation token | Show error, offer to request a new token |
| Permission revoked mid-session | Next execution blocked by backend; assistant notifies user |

---

## §11 — Integration with AI Action Platform (doc 36)

The Floating AI Assistant is the primary **frontend surface** for the AI Action Platform. Key integration points:

| AI Action Platform component | Assistant integration |
|-----------------------------|-----------------------|
| `GET /api/ai/context` | Called once on assistant open; result cached in session store |
| `POST /api/ai-actions/request-confirmation` | Called when AI proposes a write action; result stored as `pendingConfirmationTokenId` |
| `POST /api/ai-actions/confirm` | Called when user confirms in `ConfirmActionDialog` |
| `POST /api/ai-actions/invoke` (READ) | Called inline for READ queries |
| `AIActionPreviewCard` | Rendered inline in `ChatThread` when pending action |
| `AIActionHistory` | Shown in drawer footer / history tab |
| Approval queue SSE | Listened to in `awaiting_approval` state; notification updates badge |
| `context_version` invalidation | Triggers silent re-fetch of capability context; does not call LLM |

---

## §12 — Implementation Phases

### Phase 1 (R032 equivalent — after AI Action Platform READ tier)

- `FloatingAIButton` + Zustand session store (no LLM, no API)
- `AIAssistantDrawer` — static open/close + page context note
- `PageAIContext` schema + `useRegisterPageContext()` hook
- Static help (no LLM): "What is this page?" from `staticDescription`
- Capability context fetch on drawer open (`GET /api/ai/context`)

### Phase 2 (R033 — after confirmation flow)

- LLM integration: first message → LLM call with capability context + page context
- `ChatThread`, `MessageBubble`, `ChatInput`
- Context diffing: `computePageContextDiff()` + `lastLLMContextHash` tracking
- `ActionPreviewCard` inline for pending actions
- Route-change UX: system note + active workflow banner

### Phase 3 (R034 — after voice confirmation)

- Voice mode: mic input, read-back, voice-specific prompt constraints (from doc 36 §39)
- Conversation summarization: after 20 messages, server-side summary
- "Continue previous task?" re-entry prompt
- Org switch session reset

### Phase 4 (R035 — after SSE infrastructure)

- `awaiting_approval` banner + SSE notification on approval
- Server-side conversation storage (optional, 7-day retention)
- `ContextRefreshButton` + manual capability context refresh

---

## §13 — Open Questions

| # | Question | Impact |
|---|----------|--------|
| Q1 | Should the conversation persist across browser refreshes (server-side storage) in V1, or is in-memory sufficient? | Storage complexity |
| Q2 | "Continue previous task?" — how does the assistant identify a resumable task after a browser refresh without server storage? | UX + cost |
| Q3 | What is the maximum transcript length before summarization must run? (20 messages? 40?) | Token cost |
| Q4 | Should `PageAIContext.availableActionIds` be computed at build time (static) or at runtime (dynamic, role-aware)? Runtime is more accurate; build time is cheaper. | Accuracy vs cost |
| Q5 | When the user navigates during an `awaiting_confirmation` state, should the confirmation dialog follow (float over the new page) or stay in the drawer? | UX |
| Q6 | Is the system note "עברת ל-[PageName]" sent to the LLM at all, or is it purely UI? | Context accuracy |

---

---

## §14 — AI Provider Gateway Integration

> **All LLM calls from the Floating AI Assistant must go through the AI Provider Gateway. No direct provider SDK usage.**
> Full spec: `docs/system-upgrade/40-ai-provider-gateway-billing.md`

### When LLM is called (billed) vs not called (free)

| Trigger | LLM call? | Gateway attribution |
|---------|----------|---------------------|
| User sends first free-text message | ✅ Yes | `module_id="floating_assistant"`, `feature_id="chat_message"` |
| User sends follow-up | ✅ Yes | Same |
| Long conversation summarization | ✅ Yes | `feature_id="conversation_summary"` |
| Active workflow continuation (route change) | ✅ Yes (on next user message) | `feature_id="workflow_continuation"` |
| Page load, route change, hover, icon click | ❌ No | — |
| Static page description (PageAIContext) | ❌ No | — |
| Capability context fetch (GET /api/ai/context) | ❌ No (REST, no LLM) | — |
| Confirmation UI rendered | ❌ No | — |

### GatewayRequest fields for floating assistant

```typescript
// Frontend passes these to Flask proxy endpoint
// Flask calls AIProviderGateway.call(GatewayRequest(...))
{
  org_id: user.orgId,
  user_id: user.id,
  module_id: "floating_assistant",
  feature_id: "chat_message",         // or "conversation_summary" | "workflow_continuation"
  capability: "chat",
  conversation_id: session.conversationId,
  session_id: undefined,              // no voice session
}
```

---

_Document created: 2026-04-24 (Round 027) | Updated Round 029 (§14: gateway integration)_
_Spec builds on: `docs/system-upgrade/36-ai-action-platform.md` (AI Action Platform)_
_Billing spec: `docs/system-upgrade/40-ai-provider-gateway-billing.md`_
_Next implementation round: R032 — Floating AI Assistant Phase 1 (static shell + context registry)_
