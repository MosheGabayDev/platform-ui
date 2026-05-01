# T02 — Write canonical floating-assistant.md (consolidated)

**Estimate:** 90 min
**Status:** ⬜ todo
**Depends on:** T01
**Touches:** `05-ai/floating-assistant.md` (rewrite), legacy specs marked as superseded

## Goal
Produce ONE definitive spec for the global floating AI assistant, resolving all conflicts identified in T01. After this task, `floating-assistant.md` is the SSOT for the assistant; older specs become reference-only.

## Acceptance Criteria
- [ ] `05-ai/floating-assistant.md` rewritten (≤ 600 lines) covering:
  - Vision (1 paragraph)
  - User-visible behavior (idle, chat, action proposal, voice)
  - Architecture overview (drawer + button + state machine + page context)
  - Component tree with line budgets
  - State machine diagram (mermaid or ASCII)
  - Page context registration contract
  - Confirmation flow end-to-end (sequence diagram or ASCII)
  - Voice mode behavior + safety rules
  - Telemetry + audit requirements
  - Open questions (carried forward to `08-decisions/open-questions.md`)
- [ ] Cross-refs only to other current specs (no `_legacy/`)
- [ ] Old `05-ai/assistant-runtime.md` and `05-ai/action-platform.md` marked at top: "Reference only — canonical: `floating-assistant.md`"
- [ ] `05-ai/canonical-terms.md` updated to reflect any term decisions made in T01

## Implementation Notes
- Pull good prose from legacy docs; don't write everything from scratch
- Use the structure of `03-roadmap/master-roadmap.md` as a template (concise, indexed sections)
- Flag everything still open to `08-decisions/open-questions.md` rather than guessing

## Definition of Done
- [ ] AC checked
- [ ] No conflicts remain inside the canonical spec
- [ ] Open questions filed
- [ ] `epic.md` Tasks: `[x] T02`
