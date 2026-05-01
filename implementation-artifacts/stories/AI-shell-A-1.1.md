# Story 1.1: Implement `useAssistantSession` Zustand store with the 9-state machine

Status: ready-for-dev

## Story

As a **frontend developer**,
I want **a Zustand session store that owns the assistant's full 9-state finite machine with explicit idle-path transitions**,
so that **all assistant UI components share consistent state and future LLM/voice rounds plug in without refactor**.

## Acceptance Criteria

1. **Initial state on fresh page load:** state is `closed`, `transcript` is empty array, `pendingConfirmationTokenId` is null, drawer-open flag is false.
2. **Open transition:** when `openDrawer()` is dispatched from `closed`, state transitions to `chatting_idle` and drawer-open becomes true.
3. **Close transition:** when `closeDrawer()` is dispatched from any chat state, state transitions to `closed`, drawer-open becomes false, and any in-flight message draft is cleared.
4. **Error trap:** from any non-error state, `setError(subtype)` transitions to `error` with the subtype recorded in `error.subtype`.
5. **Error dismissal:** from `error[*]`, `dismissError()` transitions back to `chatting_idle`.
6. **Cross-page persistence:** when the user navigates between pages, drawer-open flag and current chat state remain unchanged (the store is a singleton across the SPA session, NOT scoped to route).
7. **No LLM-related transitions wired this round:** transitions FROM idle states TO `chatting_sending`, `awaiting_action_confirmation`, `executing_action`, `voice_*` MUST NOT exist in the store yet (those land in AI-shell-B and AI-shell-C). The store types DO declare those states for future use.
8. **Type safety:** all state types and actions are strictly typed; no `any`. Discriminated union for the `error` state with explicit `subtype: "network" | "llm" | "confirmation_expired" | "backend_recheck_failed"`.
9. **Unit test coverage:** ≥ 8 transitions covered with Vitest tests; each AC above has at least one matching test.

## Tasks / Subtasks

- [ ] **Task 1 — Define types** (AC #1, #4, #7, #8)
  - [ ] Create `lib/hooks/use-assistant-session.ts`.
  - [ ] Export `AssistantState` discriminated union with 9 variants: `{ kind: "closed" }`, `{ kind: "chatting_idle" }`, `{ kind: "chatting_sending" }`, `{ kind: "awaiting_action_confirmation"; expiresAt: number; tokenId: string }`, `{ kind: "executing_action" }`, `{ kind: "voice_idle" }`, `{ kind: "voice_listening" }`, `{ kind: "voice_speaking" }`, `{ kind: "error"; subtype: "network" | "llm" | "confirmation_expired" | "backend_recheck_failed" }`.
  - [ ] Export `Message` type for transcript: `{ id: string; role: "user" | "assistant"; content: string; timestamp: number }`.
  - [ ] Export `AssistantSessionStore` interface with the state fields + actions.

- [ ] **Task 2 — Implement store with idle-path transitions** (AC #1, #2, #3, #5, #6)
  - [ ] Use `create` from `zustand` (already installed v5.x per `package.json`).
  - [ ] No `persist` middleware in this round (drawer survives navigation but not full reload — by design per AC #6 of Story 1.5).
  - [ ] Actions: `openDrawer()`, `closeDrawer()`, `setError(subtype)`, `dismissError()`, `appendMessage(message)` (transcript-only — no LLM yet), `clearTranscript()`.
  - [ ] Action `openDrawer()` MUST be a no-op if state is already in any open state (idempotent).
  - [ ] Action `closeDrawer()` resets `transcript = []`, `inFlightDraft = ""`, but preserves `pendingConfirmationTokenId` (will be used by AI-shell-C).

- [ ] **Task 3 — Document the unwired LLM transitions** (AC #7)
  - [ ] Add a comment block at the top of `use-assistant-session.ts` listing the transitions that AI-shell-B and AI-shell-C will add.
  - [ ] Add `// TODO(AI-shell-B):` markers for the actions to be implemented later: `sendMessage(text)`, `receiveResponse(message)`, `proposeAction(descriptor)`, `confirmAction(tokenId)`, `rejectAction(tokenId, reason)`, `expireConfirmation()`.

- [ ] **Task 4 — Write Vitest tests** (AC #9)
  - [ ] Create `lib/hooks/use-assistant-session.test.ts`.
  - [ ] Test the initial state (AC #1).
  - [ ] Test `openDrawer()` from `closed` (AC #2).
  - [ ] Test `openDrawer()` is idempotent when already open.
  - [ ] Test `closeDrawer()` from `chatting_idle` (AC #3).
  - [ ] Test `closeDrawer()` clears transcript + inFlightDraft.
  - [ ] Test `setError("network")` from `chatting_idle` (AC #4).
  - [ ] Test `dismissError()` returns to `chatting_idle` (AC #5).
  - [ ] Test that no method on the store transitions FROM `chatting_idle` to `chatting_sending` (regression guard for AC #7 — assert the store API does not yet expose that action).
  - [ ] Run `npm run test` — assert all pass.

- [ ] **Task 5 — Verify build + lint + types** (NFR-A07 from epic)
  - [ ] Run `npm run typecheck` — EXIT 0.
  - [ ] Run `npm run lint` — clean.
  - [ ] Run `npm run build` — green.

## Dev Notes

### Architecture patterns to use

- **Zustand v5 with `create`** — the project already uses this pattern in `lib/theme-store.ts` and `lib/hooks/use-nav-history.ts`. Mirror the same style: file exports the hook + types from one module, no separate barrel.
- **Discriminated union state** — preferred over flat boolean flags so future transitions are exhaustive in switch statements. Aligns with how next-auth Session augmentation is typed in `lib/auth/types.ts`.
- **No persist middleware** — `lib/theme-store.ts` uses `persist` for theme preference (which IS cross-reload). Story 1.5 explicitly limits assistant persistence to in-session only. Do NOT add persist to this store.

### Source tree components to touch

- **Create:** `lib/hooks/use-assistant-session.ts` (≤ 150 LOC budget per scoping output).
- **Create:** `lib/hooks/use-assistant-session.test.ts`.
- **Do NOT touch yet:** `components/shell/ai-assistant/*` (those live in Stories 1.3–1.4–1.6).
- **Do NOT touch yet:** `app/(dashboard)/layout.tsx` (Story 1.3 wires the FAB there).

### Testing standards summary

- **Unit tests:** Vitest required (R-OPS-01 prerequisite — if Vitest is not yet configured, this is the first story to surface that gap; flag it at start of Task 4).
- **Coverage gate:** per ADR-042, `lib/hooks/` floor is 80% line coverage. This story adds significantly to that surface; tests must keep the layer at or above the floor.
- **No mocking of Zustand:** test the real store with `create` — Zustand stores are deterministic and don't need mocks.
- **Per `02-rules/testing-standard.md`:** the security/multi-tenant evidence requirements apply to features that touch tenant boundaries. This store is purely client-side UI state with no tenant boundary, so cross-tenant tests are NOT required for this story.

### Project Structure Notes

- **Path alignment:** the store goes in `lib/hooks/` (matches existing `use-nav-history.ts`, `use-feature-flag.ts`, `use-platform-mutation.ts` patterns). It is NOT a `components/` concern — it's a state hook consumed by components.
- **Naming:** `use-assistant-session.ts` (kebab-case file, camelCase hook export `useAssistantSession`). Aligns with existing hook files in `lib/hooks/`.
- **No conflicts detected** — there is no pre-existing `use-assistant-*` file. Component files for the assistant land in Stories 1.3+ under `components/shell/ai-assistant/`.

### References

- Epic specification: [planning-artifacts/epics/AI-shell-A-bmad.md#Story 1.1](../../planning-artifacts/epics/AI-shell-A-bmad.md)
- Native epic context: [docs/system-upgrade/10-tasks/AI-shell-A-fab-drawer/epic.md](../../docs/system-upgrade/10-tasks/AI-shell-A-fab-drawer/epic.md)
- State machine spec: [docs/system-upgrade/10-tasks/AI-shell-scoping/scoping-output.md#State machine (text form)](../../docs/system-upgrade/10-tasks/AI-shell-scoping/scoping-output.md)
- Zustand pattern reference: [lib/theme-store.ts](../../lib/theme-store.ts) and [lib/hooks/use-nav-history.ts](../../lib/hooks/use-nav-history.ts)
- Hook pattern reference: [lib/hooks/use-feature-flag.ts](../../lib/hooks/use-feature-flag.ts)
- Coverage gate floors: [docs/system-upgrade/08-decisions/decision-log.md ADR-042](../../docs/system-upgrade/08-decisions/decision-log.md)
- Workflow rules (commit + push to master, no PR): [CLAUDE.md §Workflow Rules](../../CLAUDE.md)
- Hard rules (hydration, Framer Motion, etc. — not directly applicable here but DEV must know): [CLAUDE.md §Hard Rules](../../CLAUDE.md)
- Testing standard: [docs/system-upgrade/02-rules/testing-standard.md](../../docs/system-upgrade/02-rules/testing-standard.md)
- Development rules: [docs/system-upgrade/02-rules/development-rules.md](../../docs/system-upgrade/02-rules/development-rules.md)

## Dev Agent Record

### Agent Model Used

_(filled by dev agent on implementation)_

### Debug Log References

_(filled by dev agent — Vitest run output URL, build log link, etc.)_

### Completion Notes List

_(filled by dev agent — observations, deviations from plan, follow-ups)_

### File List

_(filled by dev agent — all files created/modified for this story)_

---

## Definition of Done (story-level)

- [ ] All 9 ACs above pass.
- [ ] All 5 tasks complete with subtasks checked.
- [ ] `npm run typecheck` EXIT 0.
- [ ] `npm run lint` clean.
- [ ] `npm run build` green.
- [ ] `npm run test` (Vitest) — ≥ 8 transition tests pass.
- [ ] Coverage gate per ADR-042: `lib/hooks/` ≥ 80% line coverage maintained.
- [ ] Single commit on master, message format: `feat(ai-shell-a): useAssistantSession store with 9-state machine (Story 1.1)`.
- [ ] Pushed to `origin/master`.
- [ ] No new direct LLM imports introduced.
- [ ] Epic doc `AI-shell-A-bmad.md` Story 1.1 marked complete.

## Pre-flight check before dev starts

- [ ] R-OPS-01 (Vitest setup) is complete OR this story includes the Vitest setup as Task 0 if it's the first to need it.
- [ ] No active uncommitted changes on master that would conflict.
- [ ] Latest `master` pulled.
