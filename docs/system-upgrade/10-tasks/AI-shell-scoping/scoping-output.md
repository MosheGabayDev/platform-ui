# AI-shell-scoping — Scoping Output (T01-T07 consolidated)

**Status:** ✅ Complete (2026-05-01) — produced in compressed form.
**Inputs reviewed:**
- `05-ai/floating-assistant.md` (existing spec, R027-R041 vintage)
- `05-ai/assistant-runtime.md` (runtime contract)
- `05-ai/action-platform.md` (action platform v1)
- `05-ai/canonical-terms.md` (terminology pass)
- `05-ai/capability-kb.md` (capability knowledge base)

This doc records the scoping decisions, NOT a full canonical spec rewrite. The existing `05-ai/floating-assistant.md` remains the primary spec; this doc lists deltas + decisions + the 3-round build plan.

---

## Decisions — conflicts resolved

| Topic | Decision | Rationale |
|---|---|---|
| Component naming | `FloatingAIButton` (button), `AIDrawer` (drawer), `ChatTranscript`, `Message`, `MessageInput`, `ActionPreviewCard`, `VoiceModeToggle` | Aligned with existing `floating-assistant.md §10` component breakdown |
| State model | 9 states: `closed`, `chatting_idle`, `chatting_sending`, `awaiting_action_confirmation`, `executing_action`, `voice_idle`, `voice_listening`, `voice_speaking`, `error` | More granular than existing 3-state model; matches finite confirmation TTL behavior |
| Page context registration | On mount + on deps change (debounced 300ms); cleanup on unmount | Existing spec ambiguous; this is the simplest correct behavior |
| Action confirmation token | DB-row-backed (NOT JWT) with TTLs: 60s WRITE_LOW / 30s WRITE_HIGH / 15s DESTRUCTIVE | Per ADR-024 capability levels; DB-row enables instant revoke on logout |
| Voice eligibility | Per-action AND per-context AND per-user — fail-closed if any is false | Per-action alone is insufficient (a user without voice perms shouldn't see voice options) |
| risk_tier vs capability_level | `capability_level` is canonical (per ADR-026 / `canonical-terms.md`); `risk_tier` retired | Already decided in canonical-terms.md, restated here for clarity |
| LLM context payload | `PageContext + UserContext` on first message; `PageContextDiff` on subsequent | Existing spec; cost control |
| Stale context | HTTP 409 from backend → frontend re-emits full context + retries once | Existing assistant-runtime spec |
| Module manifest action declaration | `ai_actions[]` array per module, schema in `05-ai/action-platform.md §AIActionDescriptor v1` | Decided in ADR-026 |

## Open questions filed to `08-decisions/open-questions.md`

- **Q-AI-1:** Should the floating button be hidden in voice mode while voice is speaking, or stay visible? (UX decision — defer to first user testing)
- **Q-AI-2:** Confirmation token storage: dedicated table vs reuse `tool_invocations`? (Backend decision — defer to AI-shell-C)
- **Q-AI-3:** Voice "yes confirm" phrase i18n strategy — exact match or ML intent classification? (Defer to voice mode round)

(These three questions to be added to the open-questions log when this scoping round closes.)

---

## Component breakdown + line budgets

| Component | Path | Budget | Round |
|---|---|---|---|
| `FloatingAIButton` | `components/shell/ai-assistant/floating-button.tsx` | ≤80 LOC | A |
| `AIDrawer` | `components/shell/ai-assistant/drawer.tsx` | ≤120 LOC | A |
| `useAssistantSession` (Zustand store) | `lib/hooks/use-assistant-session.ts` | ≤150 LOC | A |
| `useRegisterPageContext` hook | `lib/hooks/use-register-page-context.ts` | ≤80 LOC | A |
| `ChatTranscript` | `components/shell/ai-assistant/chat-transcript.tsx` | ≤100 LOC | B |
| `Message` | `components/shell/ai-assistant/message.tsx` | ≤80 LOC | B |
| `MessageInput` | `components/shell/ai-assistant/message-input.tsx` | ≤120 LOC | B |
| `ActionPreviewCard` | `components/shell/ai-assistant/action-preview-card.tsx` | ≤180 LOC | C |
| `VoiceModeToggle` | `components/shell/ai-assistant/voice-toggle.tsx` | ≤60 LOC | D (deferred) |
| `VoiceWaveform` | `components/shell/ai-assistant/voice-waveform.tsx` | ≤80 LOC | D (deferred) |
| `ContextDebugPanel` (dev only) | `components/shell/ai-assistant/context-debug.tsx` | ≤100 LOC | A (dev mode) |

**Total budget across rounds A+B+C:** ~990 LOC. Comfortable within `master-roadmap §11` rule #2.

## State machine (text form)

```
closed
  └── (user clicks FAB) → chatting_idle
chatting_idle
  ├── (user sends message) → chatting_sending
  ├── (user toggles voice) → voice_idle
  └── (user closes) → closed
chatting_sending
  ├── (LLM responds with action proposal) → awaiting_action_confirmation
  ├── (LLM responds with text only) → chatting_idle
  └── (network/LLM error) → error[network|llm]
awaiting_action_confirmation
  ├── (user confirms) → executing_action
  ├── (user rejects) → chatting_idle (with rejection logged)
  └── (TTL expires) → error[confirmation_expired]
executing_action
  ├── (backend executes successfully) → chatting_idle (with result message)
  └── (backend rejects re-check) → error[backend_recheck_failed]
voice_idle
  ├── (user starts speaking) → voice_listening
  ├── (user toggles back to chat) → chatting_idle
  └── (user closes) → closed
voice_listening → voice_speaking → voice_idle (continuous loop)
error[*]
  ├── (user dismisses) → chatting_idle
  └── (user closes) → closed
```

**Persisted across navigation:** `pendingConfirmationTokenId`, `activeWorkflowId`, drawer open/closed state, current voice mode flag. **Reset on close:** chat transcript, in-flight message draft.

## Confirmation flow (sequence)

1. User: "Deactivate user@example.com"
2. LLM: returns `AIActionDescriptor` proposal (`action_id="users.deactivate"`, `target_user_id=42`, `capability_level="WRITE_HIGH"`)
3. Frontend POSTs proposal to `/api/proxy/ai/proposals` → backend validates (RBAC, tenant, capability allowed) → issues `confirmation_token` (UUID, TTL=30s)
4. Frontend renders `ActionPreviewCard` with: action label, target, danger badge, "Confirm" / "Reject" buttons, countdown timer
5. User confirms → POST `/api/proxy/ai/proposals/<token>/confirm` → backend RE-CHECKS RBAC + tenant + capability → executes → returns result
6. Frontend transitions to `chatting_idle` with success message
7. (TTL path) Timer hits zero → frontend transitions to `error[confirmation_expired]` → user must re-issue
8. (Reject path) User clicks Reject + reason → POST `/api/proxy/ai/proposals/<token>/reject` → token invalidated → chatting_idle

**Audit:** every issued token + every confirm/reject/expire logged via R046 AuditLog (when live).
**Voice:** same flow; user speaks expected phrase ("yes confirm" / "כן אישור") in place of button click.

## Page context registry — first 5 wired pages

Per ADR-038 P2 demo slice gets the simplest list:

1. **Dashboard home** (`app/(dashboard)/page.tsx`) — entityType=null, summary="Dashboard with KPI cards X/Y/Z", availableActions=[]
2. **Users list** (`app/(dashboard)/users/page.tsx`) — entityType="user", availableActions=[`users.create`, `users.export`]
3. **User detail** (`app/(dashboard)/users/[id]/page.tsx`) — entityType="user", entityId={id}, availableActions=[`users.deactivate`, `users.update`]
4. **Orgs list** (`app/(dashboard)/organizations/page.tsx`) — entityType="organization", availableActions=[`orgs.create`]
5. **Roles list** (`app/(dashboard)/roles/page.tsx`) — entityType="role", availableActions=[]

Helpdesk pages added in AI-shell-B once Helpdesk Phase A ships.

---

## Build round plan

### AI-shell-A — Infra + idle FAB (no LLM)
**Estimate:** ~4h. Status: ⬜ ready (after AI-shell-scoping commits).
**Deliverable:** Floating button visible on every authenticated page; clicking opens an empty drawer; closing returns to button. `useRegisterPageContext()` hook callable from pages but ZERO LLM wiring.
**Why this slice:** ADR-038 P1 deliverable — "AI-Ready Platform" includes the UI shell present even though no AI feature lives in it yet. De-risks the layout / animation / RTL concerns separately from the LLM concerns.

### AI-shell-B — Chat + LLM context (read-only "Ask the Dashboard")
**Estimate:** ~6h. Status: 🔴 blocked on AI-shell-A + R049.5 prerequisites.
**Deliverable:** Drawer renders chat transcript, user can send a message, message goes to backend → AIProviderGateway → response renders. `PageContext` sent on first message; `PageContextDiff` on subsequent. NO action proposals yet — text replies only.
**Why this slice:** ADR-038 P2 demo slice — first user-visible AI surface validates the gateway end-to-end. Read-only safe.

### AI-shell-C — Action proposals + confirmation
**Estimate:** ~6h. Status: 🔴 blocked on AI-shell-B + R051 backend.
**Deliverable:** LLM can propose actions; `ActionPreviewCard` renders; confirmation token + backend re-check flow works end-to-end with one module integration (Users → `deactivate_user`).
**Why this slice:** ADR-038 P2 full — first WRITE-tier AI capability.

### AI-shell-D — Voice mode (deferred)
Estimated separately; not part of this scoping output. Will be planned post-Helpdesk-Phase-A and after R051 voice spec stabilizes.

---

## Dependency map

```
AI-shell-scoping ✅
  ↓
AI-shell-A (FAB + Drawer + state, no LLM) ⬜ ready
  ↓
AI-shell-B (chat + LLM read-only) [needs R048 partial: P0 LLM cleanup of `apps/dashboard/`]
  ↓
AI-shell-C (action proposals) [needs R051 backend AIActionRegistry]
  ↓
AI-shell-D (voice) [needs R051 voice spec + R029-equivalent ALA integration]
```

---

## Closing the scoping round

- [x] T01 — Inventory: 5 legacy specs read; conflicts identified above.
- [x] T02 — Canonical spec: deltas captured here; `05-ai/floating-assistant.md` remains primary spec, this doc supplements with state machine + decisions table.
- [x] T03 — Component breakdown with line budgets done.
- [x] T04 — State machine: 9 states + transitions documented.
- [x] T05 — Page context registry: 5 initial pages selected; contract per `05-ai/floating-assistant.md`.
- [x] T06 — Confirmation flow: sequence + token contract documented.
- [x] T07 — 3 build round folders created next (AI-shell-A/B/C).

## Final commit
SHA: `<filled by next commit>`
Date: 2026-05-01
