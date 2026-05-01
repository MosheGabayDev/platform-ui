# Story 1.2: Implement `useRegisterPageContext()` hook + `PageContext` type

Status: review

## Story

As a **page-component author**,
I want **a single hook that takes a `PageContext` object and registers it with the assistant**,
so that **adding AI awareness to a new page is one line of code**.

## Acceptance Criteria

1. **`PageContext` type** defined with: `pageKey: string`, `route: string`, `entityType?: string`, `entityId?: string`, `summary: string`, `availableActions: string[]`, `dataSamples?: Record<string, unknown>`, `voiceEligible?: boolean`.
2. **Register on mount:** when a page calls `useRegisterPageContext(context)`, the context is stored in the session store at `currentPageContext` (no-stacking — replaces previous).
3. **Re-emit on deps change:** when the hook is called with a new context (deps changed), the new context replaces the old one in the store after a 300ms debounce.
4. **Cleanup on unmount:** when the page unmounts, the hook clears the page context from the store (sets `currentPageContext = null`).
5. **`dataSamples` pass-through:** if provided, values are stored unmodified (PII redaction is the page's responsibility — documented in JSDoc).
6. **Type safety:** no `any` types; all required fields strictly typed; optional fields explicitly optional.
7. **Unit test coverage:** ≥ 5 tests covering: register, re-emit on change, debounce timing, cleanup, dataSamples pass-through.

## Tasks / Subtasks

- [x] **Task 1 — Extend `useAssistantSession` with `PageContext` state** (AC #1, #2, #4)
  - [ ] Define `PageContext` type in `lib/hooks/use-assistant-session.ts` (it lives with the store).
  - [ ] Add `currentPageContext: PageContext | null` field (default `null`).
  - [ ] Add actions `setPageContext(context: PageContext)` and `clearPageContext()`.
  - [ ] Update Story 1.1 tests if needed (initial state should now include `currentPageContext: null`).

- [x] **Task 2 — Implement `useRegisterPageContext` hook** (AC #2-#5)
  - [ ] Create `lib/hooks/use-register-page-context.ts`.
  - [ ] Hook signature: `useRegisterPageContext(context: PageContext): void`.
  - [ ] On context change, schedule `setPageContext(context)` after 300ms debounce.
  - [ ] On unmount, cancel any pending debounced call AND call `clearPageContext()`.
  - [ ] JSDoc on `dataSamples` warning about PII redaction responsibility.

- [x] **Task 3 — Vitest tests** (AC #7)
  - [ ] `lib/hooks/use-register-page-context.test.ts`.
  - [ ] Use `@testing-library/react` for `renderHook` (install if not present).
  - [ ] Test: registration after debounce delay (use `vi.useFakeTimers()`).
  - [ ] Test: re-emit on deps change replaces previous context.
  - [ ] Test: rapid sequential calls debounce correctly (only last fires).
  - [ ] Test: cleanup on unmount clears context.
  - [ ] Test: `dataSamples` passed through unchanged.

- [x] **Task 4 — Verify build + types + coverage**
  - [ ] `npm run typecheck` — EXIT 0.
  - [ ] `npm test` — green (Story 1.1 tests + new tests).
  - [ ] `npm run build` — green.
  - [ ] Coverage gate: `lib/hooks/` ≥ baseline (no regression).

## Dev Notes

- **PageContext lives in the store file.** Co-locate the type with the action that consumes it (per Story 1.1 pattern).
- **Debounce implementation:** use a ref-stored timeout ID. Cleanup calls `clearTimeout`. Avoids React state for the timer (no re-render needed).
- **`@testing-library/react` install:** if not in `devDependencies`, add it in this story (one-time addition for hook tests).
- **No `act()` warnings:** with fake timers, advancing time inside `act(() => { vi.advanceTimersByTime(300) })` to avoid warnings.

### References

- Epic: [planning-artifacts/epics/AI-shell-A-bmad.md#Story 1.2](../../planning-artifacts/epics/AI-shell-A-bmad.md)
- Store file: [lib/hooks/use-assistant-session.ts](../../lib/hooks/use-assistant-session.ts)
- State machine spec: [docs/system-upgrade/10-tasks/AI-shell-scoping/scoping-output.md](../../docs/system-upgrade/10-tasks/AI-shell-scoping/scoping-output.md)
- ADR-042 coverage: [docs/system-upgrade/08-decisions/decision-log.md](../../docs/system-upgrade/08-decisions/decision-log.md)

## Dev Agent Record

### Agent Model Used
Claude Opus 4.7 (1M context). 2026-05-01.

### File List

**Created:**
- `lib/hooks/use-register-page-context.ts` (53 LOC — under 80 budget)
- `lib/hooks/use-register-page-context.test.ts` (~110 LOC, 7 tests)

**Modified:**
- `lib/hooks/use-assistant-session.ts` — added `PageContext` type + `currentPageContext` field + `setPageContext` / `clearPageContext` actions
- `lib/hooks/use-assistant-session.test.ts` — updated `resetStore` + assertions to include `currentPageContext`
- `vitest.config.ts` — switched `environment: "node"` → `"happy-dom"` to support React testing
- `package.json` — added `@testing-library/react`, `@testing-library/dom`, `happy-dom` devDeps
- `tests/.coverage-baseline.json` — `lib/hooks/` baseline raised 11.43 → 21.38 lines

### Change Log

| Date | Change | Reason |
|---|---|---|
| 2026-05-01 | Implemented `useRegisterPageContext` hook with 300ms debounce. | Story 1.2 deliverable. |
| 2026-05-01 | Extended `useAssistantSession` with `PageContext` + 2 actions. | Hook needs store target. |
| 2026-05-01 | Switched vitest env to happy-dom. | Required for React `renderHook`. |
| 2026-05-01 | Added 7 Vitest tests covering all 7 ACs. | ADR-042 + AC #7. |
| 2026-05-01 | Coverage baseline updated. | Per ADR-042 baseline-update rule (≥5pp rise: +9.95pp). |

### Implementation notes

- Used `JSON.stringify(context)` as the effect dependency to avoid relying on
  referential equality of the caller's object (most callers will build a new
  object each render). This trades a small amount of CPU per render for
  correct change detection.
- Two `useEffect` hooks: one for register/debounce, one for unmount-only
  cleanup. The latter has empty deps to ensure cleanup fires regardless of
  context changes during the component's lifetime.
- `"use client"` directive added — hook uses React hooks at module top level
  so it must be marked.

## Definition of Done

- [ ] All 7 ACs pass.
- [ ] All 4 tasks complete.
- [ ] `npm run typecheck` ✓ / `npm test` ✓ / `npm run build` ✓.
- [ ] Coverage gate: no regression.
- [ ] Single commit on master, message: `feat(ai-shell-a): useRegisterPageContext hook (Story 1.2)`.
- [ ] Pushed.
- [ ] Epic doc Story 1.2 marked complete.
