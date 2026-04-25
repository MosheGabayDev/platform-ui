# 50 — Module E2E Coverage Matrix Standard

> **Global standard and index** for end-to-end test coverage per module.
> _Last updated: 2026-04-26 (R041-AI-Assist Governance — Chat AI and Voice E2E flow sets added)_
>
> ## How to use this doc
>
> This doc defines the **standard** (required flows, field definitions, status values).
> Actual per-module E2E coverage plans live at:
>
> ```
> docs/modules/<module_key>/E2E_COVERAGE.md
> ```
>
> A module may not begin rewrite implementation until its `E2E_COVERAGE.md` exists (planned, not necessarily complete).
> A module may not be marked `migrated` until all required flows have evidence or documented blockers.

---

## Why E2E Coverage Planning Comes First

E2E tests are the only mechanism that proves:
1. The new UI actually covers the legacy capability
2. Security controls work end-to-end (not just unit-tested)
3. Multi-tenant isolation holds at the HTTP + UI level
4. The user's real workflow still works after the rewrite

Planning the matrix before implementation means the implementation is driven by observable, testable outcomes — not by what was easiest to build.

---

## Required Base Flows (Every Module)

Every module must have E2E coverage for these flows. A module that skips any of these must document the blocker:

| flow_id | flow_name | priority | notes |
|---------|----------|---------|-------|
| BASE-01 | Module appears in nav only when enabled | P0 | Blocked until R044 NavAPI |
| BASE-02 | Direct URL blocked when module disabled | P0 | Module-unavailable page shown |
| BASE-03 | Page renders for authorized user | P0 | Login + navigate |
| BASE-04 | Unauthorized user denied (wrong role) | P0 | 403 or redirect |
| BASE-05 | Unauthenticated user redirected to login | P0 | 401 or redirect |
| BASE-06 | Org A cannot access Org B data | P0 | Tenant isolation |
| BASE-07 | List page loads with expected columns | P1 | Data-driven |
| BASE-08 | Detail page loads for existing record | P1 | If module has detail pages |
| BASE-09 | Create flow succeeds for authorized user | P1 | If module supports create |
| BASE-10 | Create flow denied for unauthorized user | P1 | Wrong role → 403 |
| BASE-11 | Edit flow succeeds for authorized user | P1 | If module supports edit |
| BASE-12 | Delete/disable succeeds with confirmation | P1 | If module supports destructive actions |
| BASE-13 | Search / filter / sort works | P2 | If module has filterable tables |
| BASE-14 | Export produces correct file | P2 | If module supports export |
| BASE-15 | Import validates and rejects bad data | P2 | If module supports import |
| BASE-16 | Audit event appears after mutation | P1 | Create/update/delete → audit row |
| BASE-17 | AI chat can explain page | P2 | If module is AI-chat-ready (Level 1+) |
| BASE-18 | Voice agent refuses unauthorized action | P2 | If module is voice-ready (Level 5+) |
| BASE-19 | RTL layout renders without overflow | P2 | Hebrew locale |
| BASE-20 | Mobile viewport smoke test | P2 | 375px wide, key flows |

---

## Chat AI E2E Flows (Required for Level 1+)

Every module at AI readiness Level 1+ must cover these flows. Skip with documented blocker if not yet implemented.

| flow_id | flow_name | priority | notes |
|---------|----------|---------|-------|
| AI-01 | Floating assistant icon visible on authenticated page | P1 | Requires Phase A |
| AI-02 | No LLM/API call before user opens assistant | P0 | Assert no `/api/ai/*` call on page load |
| AI-03 | Assistant drawer opens on icon click | P1 | Requires Phase A |
| AI-04 | Assistant identifies current page (page_id in context) | P1 | Requires Phase B |
| AI-05 | Assistant explains page purpose in plain language | P1 | Level 1 minimum |
| AI-06 | Assistant explains at least one field or column | P2 | Level 1 minimum |
| AI-07 | Assistant lists available actions for the user's role | P1 | Level 1+ |
| AI-08 | Assistant refuses action user lacks permission for — safe message | P0 | No internal detail leaked |
| AI-09 | Conversation persists across route navigation | P1 | Same conversationId after nav |
| AI-10 | Current page context updates after navigation | P1 | page_id changes in Zustand store |
| AI-11 | Assistant proposes an allowed action (Level 3+) | P1 | Action proposal card renders |
| AI-12 | ConfirmActionDialog shown for medium/high/critical danger | P0 | Level 4 |
| AI-13 | Confirmed action executes and result shown in chat | P1 | Level 4 |
| AI-14 | Denied action returns safe refusal with reason | P0 | Level 4 |
| AI-15 | AIUsageLog created for every LLM call | P0 | Backend assertion |
| AI-16 | AIActionInvocation created for every execution attempt | P0 | Backend assertion |

---

## Voice Agent E2E Flows (Required for Level 5+)

Every module at AI readiness Level 5+ must cover these flows. If voice is not yet implemented, skip with a documented blocker and planned behavior.

| flow_id | flow_name | priority | notes |
|---------|----------|---------|-------|
| VOICE-01 | Voice session does not auto-start on page load | P0 | Always |
| VOICE-02 | Voice can explain current page | P1 | Level 5 minimum |
| VOICE-03 | Voice can propose a low-risk allowed action | P1 | Level 6 |
| VOICE-04 | Voice reads back action before confirmation | P0 | Level 6 |
| VOICE-05 | Voice confirms on "yes" / cancels on silence or timeout | P0 | Level 6 |
| VOICE-06 | Voice refuses action that is voice_ineligible | P0 | Level 5+ |
| VOICE-07 | Voice refuses high/critical action — escalates to UI | P0 | Level 5+; UI token created |
| VOICE-08 | Voice asks clarification on ambiguous request | P2 | Level 5+ |
| VOICE-09 | Voice billing recorded (AIUsageLog for STT+TTS+LLM) | P0 | Level 5+ |
| VOICE-10 | Voice audit row (AIActionInvocation) created | P0 | Level 6 |
| VOICE-11 | Bulk destructive action refused by voice | P0 | Level 5+ |
| VOICE-12 | Hard delete refused by voice | P0 | Level 5+ |
| VOICE-13 | Voice unavailable state renders gracefully | P1 | When voice service down |
| VOICE-14 | RTL voice UI renders without overflow | P2 | Hebrew locale |

---

## Template: `docs/modules/<module_key>/E2E_COVERAGE.md`

Copy this template when starting a new module's E2E plan.

---

```markdown
# <module_key> — E2E Coverage Plan

> Author: <agent/developer>
> Created: <YYYY-MM-DD>
> Round: <round_id>
> Status: planned | in_progress | complete
>
> Cross-references:
> - Legacy inventory: `docs/modules/<module_key>/LEGACY_INVENTORY.md`
> - Central tracker: `docs/system-upgrade/03-module-migration-progress.md`
> - Global E2E standard: `docs/system-upgrade/50-module-e2e-coverage-matrix.md`
> - Security scaffold specs: `tests/e2e/security/`

---

## Base Flow Coverage

| flow_id | playwright_spec | status | last_run | blocker |
|---------|----------------|--------|---------|---------|
| BASE-01 | `tests/e2e/<module>/nav.spec.ts` | ❌ not_started | — | R044 NavAPI |
| BASE-02 | `tests/e2e/security/module-disabled.spec.ts` | 🟡 scaffolded | — | E2E env vars |
| BASE-03 | `tests/e2e/<module>/<module>-basic.spec.ts` | ❌ not_started | — | — |
| BASE-04 | `tests/e2e/<module>/<module>-basic.spec.ts` | ❌ not_started | — | — |
| BASE-05 | `tests/e2e/security/auth-redirect.spec.ts` | 🟡 scaffolded | — | E2E env vars |
| BASE-06 | `tests/e2e/security/tenant-isolation.spec.ts` | 🟡 scaffolded | — | E2E env vars |
| BASE-07 | — | ❌ not_started | — | — |
| ... | | | | |

---

## Module-Specific Flows

For each flow specific to this module that goes beyond the base set:

| flow_id | flow_name | legacy_capability | user_role | tenant_scenario | route_page | steps | expected_result | security_assertion | tenant_assertion | audit_assertion | ai_voice_assertion | i18n_rtl_assertion | playwright_spec | evidence_artifacts | status | last_run | blocker |
|---------|----------|-------------------|---------|----------------|-----------|-------|----------------|-------------------|-----------------|----------------|------------------|------------------|----------------|-----------------|------|---------|---------|
| MOD-001 | <flow name> | <legacy cap ID> | admin | single-org | `/module/path` | 1. Login<br>2. Navigate<br>3. Action | <expected> | 403 if wrong role | Org A cannot see Org B data | audit row in DB | voice refuses X | RTL layout OK | `tests/e2e/<module>/...spec.ts` | screenshot / network log | ❌ not_started | — | — |

---

## Security Flow Coverage

| flow_id | flow_name | user_role | assertion | playwright_spec | status |
|---------|----------|---------|---------|----------------|--------|
| SEC-001 | Unauthenticated → login redirect | none | URL = /login | auth-redirect.spec.ts | 🟡 scaffolded |
| SEC-002 | Viewer cannot reach create page | viewer | 403 or access-denied UI | permission-denied.spec.ts | 🟡 scaffolded |
| SEC-003 | Org A cannot fetch Org B record | admin | 403 or 404 | tenant-isolation.spec.ts | 🟡 scaffolded |
| SEC-004 | org_id in request body is ignored | admin | created.org_id != spoofed_id | tenant-isolation.spec.ts | 🟡 scaffolded |

---

## Known Gaps and Blockers

| gap_id | flow_id | description | blocking | resolution_plan | target_round |
|--------|---------|-------------|---------|----------------|-------------|
| GAP-001 | BASE-01 | Nav flow requires R044 NavAPI | yes | Wait for R044 | R044 |
| GAP-002 | BASE-02 | E2E_DISABLED_MODULE_* env vars not set | yes | Set in .env.test.local when test DB ready | TBD |

---

## Evidence Artifacts

After tests run, link artifacts here:

| artifact_type | path / URL | date | round |
|--------------|-----------|------|-------|
| Playwright HTML report | `test-results/e2e-report.html` | — | — |
| CI build link | — | — | — |
| Screenshot | — | — | — |
```

---

## Status Values for Flows

| Status | Symbol | Meaning |
|--------|--------|---------|
| `not_started` | ❌ | Spec not yet written |
| `scaffolded` | 🟡 | Spec exists with `test.skip()` guard |
| `skipped_blocked` | 🔴 | Spec exists, blocked by documented issue |
| `partial` | 🟡 | Some assertions passing, not all |
| `passing` | ✅ | All assertions pass, evidence linked |
| `flaky` | ⚠️ | Intermittently fails — investigation needed |

---

## Playwright Spec Location Convention

```
tests/e2e/
  security/              ← cross-module security specs (already scaffolded in R041-Test)
    auth-redirect.spec.ts
    permission-denied.spec.ts
    tenant-isolation.spec.ts
    module-disabled.spec.ts
  <module_key>/          ← per-module specs
    <module_key>-basic.spec.ts
    <module_key>-create.spec.ts
    <module_key>-edit.spec.ts
    <module_key>-delete.spec.ts
    <module_key>-search.spec.ts
    <module_key>-export.spec.ts
```

---

## Evidence Requirement

A flow counts as evidenced when:
1. Playwright spec exists and `test.skip()` guard is removed
2. Test passes in CI (or in local run with env vars set)
3. Evidence artifact linked: HTML report, screenshot, or CI run URL

A "scaffolded" spec with `test.skip()` does NOT count as evidence — it is planned intent only.

---

## Global E2E Coverage Index

> Update this table in the central doc when a per-module `E2E_COVERAGE.md` is created.

| module_key | E2E_COVERAGE.md | base_flows_planned | base_flows_passing | module_flows_planned | module_flows_passing | last_updated |
|-----------|----------------|-------------------|--------------------|---------------------|---------------------|-------------|
| _(none created yet)_ | — | 0 | 0 | 0 | 0 | — |

---

## AI Knowledge E2E Flows (Required for all modules in Advisory Mode)

| Flow ID | Test | P0 | Level Required |
|---------|------|----|----------------|
| KB-01 | User asks "what can I do?" — returns page capabilities from registry | P0 | Level 1+ |
| KB-02 | User asks "how can this platform help?" — returns SystemCapabilities | | Advisory |
| KB-03 | Org-admin asks recommended setup — returns SolutionTemplate | | Advisory |
| KB-04 | Viewer asks admin-only capability — safe referral, no data leaked | P0 | All |
| KB-05 | Available-but-not-installed module recommended — distinguishes "not enabled" | | Advisory |
| KB-06 | Assistant refuses to describe action schema user cannot access | P0 | All |
| KB-07 | Advisory mode confirmed — zero action execution | P0 | Advisory |
| KB-08 | Guided mode — page fields and actions explained | | Level 1+ |
| KB-09 | Delegated action — audit + usage rows created | P0 | Level 3+ |
| KB-10 | Delegated action denied — AIActionInvocation.status=denied | P0 | Level 3+ |
| KB-11 | Unlicensed capability — license requirement explained | | Advisory |
| KB-12 | Admin escalation — user gets "ask your admin to enable X" | | All |
| KB-13 | Confirmation-required action — not executed until confirm | P0 | Level 4+ |
| KB-14 | Tenant isolation denial — 403/404 | P0 | Level 3+ |
| KB-15 | Audit and usage rows created per delegated action and LLM call | P0 | Level 3+ |
