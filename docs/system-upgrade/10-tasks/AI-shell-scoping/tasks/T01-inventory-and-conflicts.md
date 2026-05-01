# T01 — Inventory legacy specs + extract conflicts

**Estimate:** 60 min
**Status:** ⬜ todo
**Depends on:** none
**Touches:** scratch notes (no committed deliverable yet)

## Goal
Read all 5 legacy AI specs (`05-ai/floating-assistant.md`, `assistant-runtime.md`, `capability-kb.md`, `action-platform.md`, `canonical-terms.md`). Produce a single conflicts/decisions list ready to feed into T02.

## Acceptance Criteria
- [ ] Each of the 5 docs read end-to-end
- [ ] One markdown scratchpad lists, per topic:
  - Topic name (e.g. "voice eligibility check timing")
  - What each doc says (with anchor §)
  - The conflict or ambiguity in one sentence
  - Proposed resolution + rationale
- [ ] Topics covered (minimum):
  - Component naming (FloatingAIButton vs AIShellButton vs ChatBubble)
  - State model (idle/active/voice — how many states)
  - Page context registration timing (mount vs lazy)
  - Action confirmation flow (token issuance, TTL, refresh)
  - Voice eligibility (per-action vs per-context)
  - Risk tier vs capability_level (canonical-terms says retired — is it?)
  - LLM context payload shape (PageContext + UserContext + diff)
  - Stale context detection (HTTP 409 retry contract)
  - Module manifest action declaration format
- [ ] No code touched

## Implementation Notes
- This is research, not authorship
- Scratchpad lives temporarily in this task file's "Notes" section below — moved to canonical spec in T02
- Don't try to resolve everything — flag the hard ones as "needs user decision"

## Notes (filled during work)
<!-- replace with actual conflict list -->

## Definition of Done
- [ ] All AC checked
- [ ] Scratchpad complete with ≥ 9 topics
- [ ] Hard decisions flagged for user input
- [ ] `epic.md` Tasks: `[x] T01`
