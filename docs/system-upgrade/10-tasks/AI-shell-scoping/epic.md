# AI-shell-scoping — Global Floating Chat + Voice Agent (scope-only round)

**Phase:** P2 / P3 boundary
**Track:** platform-ui
**Status:** ⬜ ready (scoping work, not implementation)
**Depends on:** R045 (Settings Engine for prefs), R049 (Data Sources for retrieval)
**Estimate:** ~3 hours

## Scope
Define the UI scope for the global floating AI assistant before implementation begins.
This round produces NO code — only a written spec ready to feed into a build round.

References:
- `05-ai/floating-assistant.md` (existing spec — drawer UX, page context)
- `05-ai/assistant-runtime.md` (runtime contract)
- `05-ai/action-platform.md` (action proposal flow)
- `05-ai/canonical-terms.md` (terminology)

## Out of scope
- Implementation of any component
- Voice agent runtime work (separate round once scoped)

## Why now
The "Global floating chat + voice agent" is listed as `[ ] not yet scoped` in `00-control-center.md §Track A`. It's the next platform-ui-side capability after the foundation backend rounds. Scoping here unblocks the build round.

## Tasks
- [ ] T01 — Inventory existing specs (38, 54, 55, 36, 39 in `_legacy/`) and consolidate canonical decisions into a single spec doc at `05-ai/floating-assistant.md`
- [ ] T02 — Component breakdown: `FloatingAIButton`, `AIDrawer`, `ChatTranscript`, `MessageInput`, `ActionPreviewCard`, `VoiceModeToggle` — line budgets per `02-rules/development-rules.md`
- [ ] T03 — State machine: idle / chatting / awaiting-confirmation / voice-active / error
- [ ] T04 — Page context registry: `useRegisterPageContext()` hook contract + initial page list (Helpdesk, Users, Orgs, AI Agents)
- [ ] T05 — Confirmation flow: how `AIActionPreviewCard` integrates with `useAIAction` hook
- [ ] T06 — Open questions documented to `08-decisions/open-questions.md` if any remain
- [ ] T07 — Final spec + 3-round implementation plan added to master-roadmap or new round folders

## Acceptance Criteria
- [ ] One canonical floating-assistant spec doc, all conflicts in legacy specs resolved
- [ ] Component diagram + state machine in spec
- [ ] Implementation plan lists ≥3 build rounds with dependencies
- [ ] Open questions either answered or filed
- [ ] No code committed (this is a planning round)

## Final commit
SHA: `<filled on close>`
Date: `<YYYY-MM-DD>`
