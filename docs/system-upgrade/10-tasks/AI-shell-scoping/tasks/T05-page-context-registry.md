# T05 — Page Context Registry contract + initial page list

**Estimate:** 30 min
**Status:** ⬜ todo
**Depends on:** T02
**Touches:** `05-ai/floating-assistant.md §Page Context Registry` section

## Goal
Define the contract every page implements to register what's on screen for the assistant. Pick the first 5 pages that wire it.

## Acceptance Criteria
- [ ] `useRegisterPageContext(context: PageAIContext)` hook signature defined with full TypeScript types
- [ ] `PageAIContext` shape:
  - `pageKey: string` (e.g. "users.list", "helpdesk.ticket.detail")
  - `route: string` (current route)
  - `entityType?: string` (e.g. "ticket")
  - `entityId?: string` (when on detail page)
  - `summary: string` (≤300 chars, plain text — what's on the page)
  - `availableActions: ModuleAIAction[]` (filtered subset for current context)
  - `dataSamples?: Record<string, unknown>` (minimal redacted snippets — never PII)
  - `voiceEligible: boolean` (whether this page allows voice actions)
- [ ] Re-registration: hook detects deps change → re-emits context (debounce 300ms)
- [ ] Cleanup on unmount: emits `clearPageContext(pageKey)`
- [ ] `PageContextDiff`: when context changes, send only the diff to the LLM (not full re-emit) — algorithm specified
- [ ] First 5 pages selected to wire (highest signal):
  - Dashboard home
  - Users list + detail
  - Orgs list + detail
  - Roles list
  - (one more — TBD based on most-used in production)
- [ ] Stale context detection: if backend rejects with HTTP 409, frontend re-emits full context + retries

## Implementation Notes
- PII rule: `dataSamples` may include first 1–2 row IDs and counts, NEVER user emails / phones / addresses
- Voice eligibility computed from `voiceEligible` per action AND user's voice permission AND module's voice policy
- Debounce: prevents thrashing during fast filter changes

## Definition of Done
- [ ] AC checked
- [ ] TypeScript types written in spec
- [ ] First 5 pages list approved
- [ ] `epic.md` Tasks: `[x] T05`
