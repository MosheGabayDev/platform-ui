# PlatformAIDemo Slice — End-to-End Smoke Spec

> **Status:** spec drafted 2026-05-06 (Phase 2.5 of GENERIC_AI_PLATFORM_PROGRESS, closes Phase 2 — AI Core).
> Tracks ADR-038 "AI demo slice" P1-Exit gate item #8.
>
> **Why this matters:** all of Phase 1 (foundation: caps 11, 14–18, 27, wizard) and Phase 2.1–2.4 (AI provider + skill + usage + audit wiring) are individually testable but the value is the chain. This slice asserts the chain end-to-end against the mock backend so we can reliably demo "tenant types `take ticket 1004` → AI proposes → user confirms → action runs → audit logged → toast shown" before any real backend ships.

---

## 1. The slice

```
┌───────────────┐  text  ┌───────────────┐ proposal  ┌──────────────────┐
│ MessageInput  │ ─────► │   mock LLM    │ ───────►  │ ActionPreviewCard│
│ (chat box)    │        │ (lib/api/ai)  │           │ (preview drawer) │
└───────────────┘        └───────────────┘           └──────────────────┘
                                                              │ confirm
                                                              ▼
                          ┌─────────────────────────────────────┐
                          │   runActionExecutor(actionId, ...)  │
                          │   ↓                                  │
                          │   executor mutates mock client       │
                          │   ↓                                  │
                          │   emitExecutorRun() ─→ AuditLog (ai) │
                          │   ↓                                  │
                          │   toast.success(message)             │
                          └─────────────────────────────────────┘
```

Each arrow is an existing primitive. The slice is the explicit assertion that they compose end-to-end.

---

## 2. Mock LLM intent grammar

`lib/api/ai.ts extractIntent()` recognizes these natural-language phrasings and emits the corresponding action proposal:

| User input | actionId | capability | Risk |
|---|---|---|---|
| `take ticket 1004` | `helpdesk.ticket.take` | WRITE_LOW | low |
| `resolve ticket 1003` | `helpdesk.ticket.resolve` | WRITE_HIGH | medium |
| `cancel maintenance 9001` | `helpdesk.maintenance.cancel` | DESTRUCTIVE | high |
| `cancel batch 7001` | `helpdesk.batch.cancel` | WRITE_HIGH | medium |
| `search users for tim` | `users.search` | READ | low |
| anything else | (no proposal — plain text) | n/a | n/a |

When the user input matches one of the patterns, the proposal flows through `useAssistantSession.proposeAction()` → ActionPreviewCard renders → confirm/reject path.

---

## 3. Confirmation path

`ActionPreviewCard.handleConfirm()`:

1. Calls `confirmAction(tokenId)` → state machine transitions `awaiting_action_confirmation → executing_action`.
2. Calls `runActionExecutor(actionId, params, queryClient)` — the Phase 2.4 wrapper that:
   - Looks up the executor.
   - Runs it, awaiting the mutation.
   - Emits `category=ai` audit entry on success or error (or "executor not registered").
   - Returns or throws.
3. On success: `receiveResponse("✅ ...")` appends an assistant message, `toast.success()` notifies the user.
4. On failure: `failChat("backend_recheck_failed")` transitions to error state, `toast.error()` surfaces the message.

The 60-second confirmation token expiry is enforced client-side (`ActionPreviewCard.tsx` interval) — when remaining ≤0 the proposal is discarded via `expireConfirmation()`.

---

## 4. Audit chain

Three audit entries per successful demo iteration:

| Event | action | category | resource_type |
|---|---|---|---|
| Mock LLM proposes (no audit yet — could be added in P3) | — | — | — |
| User confirms → executor runs | `helpdesk.ticket.take` | `ai` | `ticket` |
| If skill validate was called pre-confirm | `ai_skill.validate` | `ai` | `ai_skill` |
| If policy was evaluated | `policy.evaluate` | `ai` | `policy_decision` |

The audit log page (`/audit-log`) shows all three in real time when `Category: AI` is selected.

---

## 5. P1-Exit gate item #8 — what flips it green

ADR-041's gate item #8 is "AI demo slice (ADR-038) in development". It flips from 🔴 → 🟢 when ALL of these are demonstrably true via E2E:

- [x] User opens chat (drawer renders, `chatting_idle`).
- [x] User sends a recognized phrase ("take ticket 1004").
- [x] Mock LLM responds with text + action proposal.
- [x] ActionPreviewCard renders the proposal with capability badge + token expiry.
- [x] User clicks Confirm.
- [x] Executor runs against the mock client (the ticket's assignee_id changes).
- [x] Audit log surfaces a `category=ai` entry for the executor run.
- [x] Toast notification fires with the success message.
- [x] State machine settles back to `chatting_idle`.

When backend (R051 AIActionRegistry + R046 audit + notifications) lands, MOCK_MODE flips and the same E2E spec runs against live services.

---

## 6. Test coverage

### Unit / integration

- `lib/platform/ai-actions/audit-emitter.test.ts` — already covers the audit emission paths (Phase 2.4).
- `components/shell/ai-assistant/action-preview-card.test.tsx` — already covers the confirm/reject UX.
- `lib/platform/ai-actions/demo-slice.test.tsx` (new) — drives the full chain in a single test: send `take ticket NNNN` → assert proposal in store → confirm → assert audit entry written → assert state returned to idle.

### E2E

- `tests/e2e/ai-shell/demo-slice.spec.ts` (new) — opens the floating button, sends the phrase, confirms, asserts toast, asserts /audit-log shows the entry.

---

## 7. Open questions (Q-AID-*)

- **Q-AID-1** — Should the proposal flow consult `validateSkillInvocation()` BEFORE the user sees the preview, so policy/RBAC denials surface immediately? Recommendation: yes, in P3 — current flow lets the user see the preview then fails at confirm. v1 demo accepts that lag because the executor's RBAC re-check is the safety net.
- **Q-AID-2** — Can the mock LLM grammar grow to include cross-module skills (`search users`, `deactivate user 5`)? Recommendation: yes — already added `search users for ...`. Any new skill manifest should also get a phrasing here.
- **Q-AID-3** — Voice mode (AI-shell-D) integration with this slice? Recommendation: defer to Phase 3 onboarding. Voice transcript flows the same way once `voice_listening → chatting_sending` is wired.
- **Q-AID-4** — Should we keep test artifacts (toasts, audit entries) in the demo or clear them? Recommendation: keep — that's the value of the slice. Clear-on-test-finish in vitest only.

---

## 8. Frontend wiring (this commit)

- `lib/api/ai.ts` mock LLM grammar extended with `cancel maintenance`, `cancel batch`, `search users`.
- `components/shell/ai-assistant/action-preview-card.tsx` confirmation now calls `runActionExecutor` (audit-emitting wrapper from Phase 2.4) instead of bare `getActionExecutor`.
- `lib/platform/ai-actions/demo-slice.test.tsx` (new) integration test driving the full chain.
- `tests/e2e/ai-shell/demo-slice.spec.ts` (new) E2E spec.
