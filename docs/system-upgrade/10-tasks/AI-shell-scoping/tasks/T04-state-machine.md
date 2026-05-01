# T04 — State machine + transitions

**Estimate:** 30 min
**Status:** ⬜ todo
**Depends on:** T02
**Touches:** `05-ai/floating-assistant.md §State Machine` section

## Goal
Define the assistant's full state machine — every state, every transition trigger, every persisted vs in-memory field. This is what `useAssistantSession` Zustand store implements.

## Acceptance Criteria
- [ ] States enumerated:
  - `closed` (FAB only)
  - `chatting_idle` (drawer open, no in-flight)
  - `chatting_sending` (LLM call in flight)
  - `awaiting_action_confirmation` (action proposed, user yet to confirm/reject)
  - `executing_action` (confirmed, backend re-checking + running)
  - `voice_idle` (drawer in voice mode, mic off)
  - `voice_listening`
  - `voice_speaking`
  - `error` (with subtype: network | llm | confirmation_expired | backend_recheck_failed)
- [ ] Each transition documented as `from → to (trigger)`
- [ ] Persisted state (across page navigation): list which fields survive
- [ ] In-memory state (resets on close/refresh): list which fields don't
- [ ] Diagram in mermaid or ASCII (≥ 1 of these formats)
- [ ] Confirmation token TTL handling: state `awaiting_action_confirmation` has a `expires_at` field; transition to `error/confirmation_expired` on TTL hit

## Implementation Notes
- Persistence boundary: actively-running workflow (e.g. multi-step form) needs to survive nav; idle chat history can be transient
- TTL: timer in store; on expiry transition AND show user-visible "Confirmation expired, please re-issue"
- Voice states are mutually exclusive with chat states — the drawer is in one mode at a time

## Definition of Done
- [ ] All AC checked
- [ ] Diagram readable
- [ ] No transition leaves a state unreachable
- [ ] `epic.md` Tasks: `[x] T04`
