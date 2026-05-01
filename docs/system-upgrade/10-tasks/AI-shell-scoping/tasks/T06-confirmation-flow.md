# T06 — Action proposal + confirmation flow

**Estimate:** 45 min
**Status:** ⬜ todo
**Depends on:** T02, T04
**Touches:** `05-ai/floating-assistant.md §Confirmation Flow` section

## Goal
Specify the end-to-end flow when the assistant proposes an action that needs user confirmation. Cover token issuance, TTL, backend re-check, audit, and rejection paths.

## Acceptance Criteria
- [ ] Sequence diagram (mermaid) covering:
  1. User asks the assistant to do something
  2. LLM produces an `AIActionDescriptor` proposal
  3. Backend receives proposal → validates against current capability context → issues `AIActionConfirmationToken` (with TTL)
  4. Frontend renders `ActionPreviewCard` showing: action name, target entity, parameters, danger level, "Confirm" / "Reject" / countdown
  5. User confirms → frontend POSTs token + final params → backend re-checks (RBAC, tenant, capability still allowed) → executes → returns result
  6. User rejects → token invalidated → audit reason
  7. TTL expires → frontend transitions to `error/confirmation_expired` → user must re-issue
- [ ] Re-check on confirmation: backend verifies BEFORE executing, even if frontend believes token is valid (defense in depth)
- [ ] Audit: every issued token + every confirm/reject/expire logged via R046 AuditLog (when live)
- [ ] Token contents specified (signed JWT or DB row) — pick one with rationale
- [ ] Rollback rule: if action declares `rollbackSupported=true`, executor stores `rollback_payload` for ≥ 24h
- [ ] Voice confirmation: same flow, but spoken phrase replaces button click; STT match against expected phrase

## Implementation Notes
- Use DB-row-backed token (not JWT) so revocation on disable/logout is instant
- TTL default: 60s for WRITE_LOW, 30s for WRITE_HIGH, 15s for DESTRUCTIVE
- Voice confirmation phrase: `"yes confirm"` / `"כן אישור"` (i18n) — fail closed on partial match

## Definition of Done
- [ ] AC checked
- [ ] Sequence diagram present in spec
- [ ] Token contents decision recorded with rationale
- [ ] `epic.md` Tasks: `[x] T06`
