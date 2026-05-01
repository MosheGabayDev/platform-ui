# T07 — Implementation plan: 3-round build sequence

**Estimate:** 30 min
**Status:** ⬜ todo
**Depends on:** T01–T06
**Touches:** `03-roadmap/master-roadmap.md §5`, `10-tasks/` (new round folders)

## Goal
Translate the canonical spec into a concrete build plan: ≥ 3 rounds, each with epic.md ready to start. The scoping round closes when these epic stubs exist.

## Acceptance Criteria
3 build round folders created with `epic.md` (no tasks yet — those split when the round becomes next-up):

- [ ] **AI-shell-A — infra + idle FAB**
  - Components: FloatingAIButton, AIDrawer (empty), Zustand store, useRegisterPageContext hook
  - No LLM wiring yet
  - Wired on 5 pages from T05
  - Dependencies: none
- [ ] **AI-shell-B — chat + LLM context**
  - Components: ChatTranscript, Message, MessageInput
  - Backend: `GET /api/ai/context` endpoint
  - First end-to-end LLM message send + response
  - PageContextDiff transmission
  - Dependencies: AI-shell-A complete; AIProviderGateway live (R048 cleanup at least P0); R045 Settings (for user prefs)
- [ ] **AI-shell-C — actions + confirmation**
  - Components: ActionPreviewCard
  - Backend: token issuance + re-check + audit
  - First module integration (Users — `deactivate_user` action) as proof
  - Dependencies: AI-shell-B + R046 AuditLog + R042-BE (for capability context)

Plus:
- [ ] Optional **AI-shell-D — voice mode** (deferred to post-Helpdesk-Phase-A unless prioritized) — epic stub or `_deferred/` folder

- [ ] `master-roadmap.md §5` table updated with the 3 new rounds + dependencies + status `⬜ ready` or `🔴 blocked`
- [ ] Each new round folder has `epic.md` only (no `tasks/` yet — those get created when the round becomes the next-up active round)
- [ ] `00-control-center.md` "Track A" updated: AI shell row replaced with the 3 rounds

## Definition of Done
- [ ] 3 round folders exist with epic.md
- [ ] master-roadmap + control-center updated
- [ ] Scoping round AI-shell-scoping marked ✅ done in epic.md
- [ ] `09-history/rounds-index.md` entry added for AI-shell-scoping
- [ ] Final commit SHA recorded in scoping epic.md
- [ ] `epic.md` Tasks: `[x] T07`
