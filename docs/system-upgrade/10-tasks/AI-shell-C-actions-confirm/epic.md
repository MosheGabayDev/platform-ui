# AI-shell-C — Action Proposals + Confirmation Flow

**Phase:** P2 full (per ADR-038)
**Track:** platform-ui + platformengineer
**Status:** 🔴 blocked on AI-shell-B + R051 backend (AIActionRegistry)
**Depends on:** AI-shell-B, R051
**Estimate:** ~6 hours

## Scope
First write-tier AI capability. LLM proposes an action; backend issues confirmation token; UI renders preview card; user confirms; backend re-checks and executes; result returns. ONE module integration as proof: Users → `users.deactivate`.

- `ActionPreviewCard` component — shows action label, target, danger badge (color-coded by capability_level), parameters, "Confirm" / "Reject" buttons, countdown timer
- Backend: `POST /api/ai/proposals` — accepts `AIActionDescriptor`, validates, issues token (DB-row, TTL by capability_level)
- Backend: `POST /api/ai/proposals/<token>/confirm` — re-checks RBAC + tenant + capability + re-validates parameters, then executes
- Backend: `POST /api/ai/proposals/<token>/reject` — invalidates token + records reason via R046 AuditLog
- Frontend transitions: `chatting_idle → chatting_sending → awaiting_action_confirmation → executing_action → chatting_idle | error[*]`
- TTL handling: countdown visible on card; expiry → state transitions to `error[confirmation_expired]`
- Cancel flow: user closes drawer mid-confirmation → token invalidated server-side
- ONE concrete action wired: `users.deactivate` (already exists as a `useDangerousAction` flow in Users module — reuse the executor)

## Out of scope (deferred to AI-shell-D / later)
- Voice confirmation (spoken phrase replaces button click)
- Multi-action proposals in one LLM turn
- Streaming proposals (SSE)
- Approval queue (DESTRUCTIVE tier requiring manager approval)

## Why now
ADR-038 P2 full deliverable. Validates the full proposal-token-confirm-execute-audit cycle with one safe action before broadening to all modules.

## Tasks (to be split when round is next-up)
- [ ] T01 — Backend: `AIActionConfirmationToken` model + migration (id, action_id, payload, capability_level, ttl_seconds, expires_at, status, ack_at, rejection_reason)
- [ ] T02 — Backend: `POST /api/ai/proposals` — validate + issue token + audit
- [ ] T03 — Backend: `POST /api/ai/proposals/<token>/confirm` — re-check + execute via existing `users.deactivate` executor + audit
- [ ] T04 — Backend: `POST /api/ai/proposals/<token>/reject` — invalidate + audit reason
- [ ] T05 — Frontend: `lib/api/ai.ts` extension — `submitProposal()`, `confirmProposal()`, `rejectProposal()`
- [ ] T06 — `ActionPreviewCard` component (capability_level color mapping, countdown, focus management)
- [ ] T07 — Session store: extended state machine for `awaiting_action_confirmation` + `executing_action` + TTL timer
- [ ] T08 — Wire LLM response: when LLM returns an action proposal in `AI-shell-B` chat path, transition to action confirmation instead of plain text render
- [ ] T09 — End-to-end smoke: user types "Deactivate user@example.com" → preview card appears → confirm → user is deactivated → audit log row exists
- [ ] T10 — Tests: backend re-check logic (token valid but RBAC changed mid-flight → reject), frontend TTL expiry, cross-tenant tokens

## Acceptance Criteria
- [ ] User issues a deactivate command → preview card renders with target user name + danger badge
- [ ] Confirmation within TTL → user actually deactivated; AuditLog row written with action="users.deactivate" + AI flag
- [ ] Rejection with reason → token invalidated; reason in audit log
- [ ] TTL expiry → frontend shows "Confirmation expired, please re-issue" — backend rejects late confirm
- [ ] Mid-flight RBAC change (revoke deactivate permission) → backend re-check rejects → frontend shows error
- [ ] Cross-tenant: org A user cannot use org B's confirmation token
- [ ] DESTRUCTIVE-tier action proposed (e.g. `users.delete`) → backend rejects in this round (reserved for approval queue)
- [ ] Coverage gate does not regress

## Definition of Done
- [ ] AC met
- [ ] Audit trail proven complete: every issued/confirmed/rejected/expired token has matching AuditLog rows
- [ ] AIUsageLog includes the proposal generation cost (LLM call) and execution cost (backend work)
- [ ] `09-history/rounds-index.md` + `change-log.md` entries
- [ ] First write-tier AI capability shipped — milestone documented

## Final commit
SHA: `<filled on close>`
Date: `<YYYY-MM-DD>`
