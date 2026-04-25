# 99 — Risk Register

> Active platform risks with mitigations and blocking status.
> _Last updated: 2026-04-25 (R040-Control — Governance Setup)_
> _Review: update after every round that changes risk status._

---

## How to Use

- **Impact:** H/M/L — how bad if it happens
- **Likelihood:** H/M/L — how likely without mitigation
- **Blocking:** whether this risk actively blocks a round
- Add new risks as you discover them; never delete — mark `[RESOLVED]` with date

---

## R01 — Scope Creep

| Field | Value |
|-------|-------|
| **Description** | Agent or developer implements features outside the round's defined scope, creating untested/undocumented code that diverges from the plan |
| **Impact** | H — leads to orphaned code, missing tests, doc drift, and broken dependencies in future rounds |
| **Likelihood** | H — LLM agents are prone to "while I'm here" additions |
| **Mitigation** | Every round has explicit out-of-scope list; Definition of Done requires scope adherence check; `01-round-review-checklist.md` has scope section |
| **Blocking** | No — ongoing control risk |
| **Owner/Area** | All implementation rounds |
| **Next Review** | R041 |
| **Status** | 🟡 Active — governance docs in place as of R040-Control |

---

## R02 — Plan/Code Drift

| Field | Value |
|-------|-------|
| **Description** | Docs (backlog, roadmap, index files) fall out of sync with actual code. Agents in future sessions make decisions based on stale docs. |
| **Impact** | H — wrong architectural assumptions, duplicate work, conflicting implementations |
| **Likelihood** | M — happens when rounds end without doc updates |
| **Mitigation** | Definition of Done requires doc updates; `CLAUDE.md` Index Maintenance Protocol is mandatory; `96-rounds-index.md` append-only rule |
| **Blocking** | No — ongoing control risk |
| **Owner/Area** | All rounds; post-commit step |
| **Next Review** | R042 |
| **Status** | 🟡 Active — partially mitigated by protocol |

---

## R03 — Missing Tests

| Field | Value |
|-------|-------|
| **Description** | Rounds ship without tests or with inadequate coverage. Future rounds break existing behavior silently. |
| **Impact** | H — regressions undetected until PROD impact |
| **Likelihood** | M — structural tests exist for R040 (43/43 pass); integration tests deferred |
| **Mitigation** | Definition of Done requires tests run and documented; `scripts/test_steps/00_regression.sh` is the regression gate |
| **Blocking** | No |
| **Owner/Area** | All implementation rounds |
| **Next Review** | R041 |
| **Status** | 🟡 Active — structural tests good, integration tests missing for R040 models |

---

## R04 — Direct LLM Bypass (P0 Security)

| Field | Value |
|-------|-------|
| **Description** | Code directly imports `openai`, `anthropic`, or `google.generativeai` outside `apps/ai_providers/`. Bypasses billing, rate limiting, key rotation, and provider failover. |
| **Impact** | H — billing leakage, untracked usage, key exposure risk |
| **Likelihood** | H — 55+ existing violations identified in R031 audit; new code can reintroduce |
| **Mitigation** | `scripts/check_no_direct_llm_imports.py` enforcement script; `CLAUDE.md` NEVER list; CI gate planned for R041; `43-shared-services-enforcement.md` blacklist |
| **Blocking** | R048 addresses this — blocking full billing accuracy |
| **Owner/Area** | `apps/ai_providers/`, all modules |
| **Next Review** | R041 (CI gate); R048 (remediation) |
| **Status** | 🔴 Active — 55+ violations unresolved |

---

## R05 — Tenant Isolation Regression

| Field | Value |
|-------|-------|
| **Description** | A new DB query or route omits `WHERE org_id = g.jwt_user.org_id`, leaking cross-tenant data. |
| **Impact** | H — critical security incident; regulatory exposure |
| **Likelihood** | M — pattern is documented but not CI-enforced |
| **Mitigation** | `CLAUDE.md` checklist item 2; `01-round-review-checklist.md §Tenant`; `@role_required` + org scoping enforced at code review |
| **Blocking** | Implicit blocker on every round that adds DB queries |
| **Owner/Area** | All routes and services |
| **Next Review** | Every round with new routes |
| **Status** | 🟡 Active — code review enforced, no automated gate yet |

---

## R06 — Destructive DB Migrations

| Field | Value |
|-------|-------|
| **Description** | A migration DROPs a column, renames a table, or backfills data without a 30-day transition gate. Breaks existing callers. |
| **Impact** | H — data loss risk, PROD outage |
| **Likelihood** | L — ADR-036 additive-migration principle is documented; R040 demonstrates correct pattern |
| **Mitigation** | ADR-036: additive-only for 30 days; `01-round-review-checklist.md §Migration`; all R040 migrations are additive and verified |
| **Blocking** | No |
| **Owner/Area** | Any round touching DB schema |
| **Next Review** | Next migration round |
| **Status** | 🟢 Low risk — ADR-036 enforced |

---

## R07 — BYODB Overengineering Too Early

| Field | Value |
|-------|-------|
| **Description** | TenantDataStore, TenantDataRouter, or BYODB infrastructure is implemented before foundation gates are green, adding complexity that blocks simpler foundations. |
| **Impact** | M — delays P1 completion; creates untested multi-DB paths |
| **Likelihood** | M — roadmap mentions BYODB as a P3 goal; agents may implement early |
| **Mitigation** | ADR-036: platform_managed_shared_db is the ONLY storage mode until explicitly unlocked; Do-Not-Start-Yet list in `00-implementation-control-center.md`; `test_no_byodb_in_seeds` test in R040 |
| **Blocking** | No — pre-emptively blocked |
| **Owner/Area** | `apps/module_manager/`, future data ownership rounds |
| **Next Review** | R049 (Data Sources Hub) |
| **Status** | 🟢 Blocked by ADR-036 |

---

## R08 — Module Navigation Hardcoded

| Field | Value |
|-------|-------|
| **Description** | Navigation items in `apps/` or `platform-ui` are hardcoded rather than derived from Module/OrgModule state. Breaks when modules are enabled/disabled per org. |
| **Impact** | M — wrong nav per org, security leak (showing menu items for disabled modules) |
| **Likelihood** | H — current state: navigation is hardcoded in Jinja2 templates + `nav-items.ts` |
| **Mitigation** | R044 Navigation API will fix this; interim: document the hardcoded state, don't add more |
| **Blocking** | R044 |
| **Owner/Area** | `apps/`, `platform-ui/components/shell/nav-items.ts` |
| **Next Review** | R044 |
| **Status** | 🔴 Active — R044 not started |

---

## R09 — Incomplete Audit Trail

| Field | Value |
|-------|-------|
| **Description** | `record_activity()` not called on all create/update/delete/revoke/disable/security operations. Compliance gaps and incident investigation gaps. |
| **Impact** | M — compliance risk; difficult incident forensics |
| **Likelihood** | M — R022 added audit to security routes; many business operations still missing |
| **Mitigation** | `01-round-review-checklist.md §Audit`; `CLAUDE.md` checklist item 4; R046 AuditLog foundation will enforce |
| **Blocking** | R046 |
| **Owner/Area** | All mutation routes |
| **Next Review** | R046 |
| **Status** | 🟡 Active — partial coverage |

---

## R10 — Incomplete Billing Coverage

| Field | Value |
|-------|-------|
| **Description** | LLM calls that bypass AIProviderGateway do not write AIUsageLog rows. Revenue leakage and usage reporting gaps. |
| **Impact** | H — billing inaccuracy; incorrect cost attribution |
| **Likelihood** | H — 55+ direct LLM calls identified (same as R04) |
| **Mitigation** | AIProviderGateway.call() is the required path; R041 CI gate; R048 cleanup; `40-ai-provider-gateway-billing.md` spec |
| **Blocking** | R043 (routing matrix), R048 (cleanup) |
| **Owner/Area** | `apps/ai_providers/`, all modules using LLM |
| **Next Review** | R048 |
| **Status** | 🔴 Active — same remediation path as R04 |

---

## R11 — Docs Not Updated After Rounds

| Field | Value |
|-------|-------|
| **Description** | After a round completes, `96-rounds-index.md`, `98-change-log.md`, `15-action-backlog.md`, and affected `INDEX.md` files are not updated. Future agents operate on stale state. |
| **Impact** | M — duplicate work; wrong dependency assumptions |
| **Likelihood** | M — happened before governance docs existed |
| **Mitigation** | Definition of Done item; `CLAUDE.md` Index Maintenance Protocol; `00-implementation-control-center.md` enforces this |
| **Blocking** | No |
| **Owner/Area** | Every round |
| **Next Review** | Every round completion |
| **Status** | 🟢 Mitigated by governance setup |

---

## R12 — Out-of-Order Implementation

| Field | Value |
|-------|-------|
| **Description** | A round is started before its dependencies are met (e.g., R042 started before R040 migrations applied). Results in code that cannot be tested or that builds on wrong assumptions. |
| **Impact** | H — wasted work; broken inter-round contracts |
| **Likelihood** | M — dependency graph is complex; agents may miss blockers |
| **Mitigation** | `00-implementation-control-center.md §Current Blockers`; `35-platform-capabilities-build-order.md` dependency graph; Definition of Ready blockers check |
| **Blocking** | Indirect — enforced at round start |
| **Owner/Area** | All rounds |
| **Next Review** | Before every round start |
| **Status** | 🟢 Mitigated by control center |

---

## R13 — R040 Migrations Not Applied to Live DB

| Field | Value |
|-------|-------|
| **Description** | 7 R040 migration files are committed but not yet run against EKS PostgreSQL. All rounds that depend on `org_modules`, `module_versions`, `module_licenses`, etc. cannot be tested. |
| **Impact** | H — R042, R043, R045 all blocked |
| **Likelihood** | N/A — this is a known pending action |
| **Mitigation** | Run `python scripts/migrations/run_migration.py` for each file in order; requires EKS port-forward on localhost:5444 |
| **Blocking** | R042, R043, R044, R045 |
| **Owner/Area** | DB operations; platformengineer |
| **Next Review** | Immediately before R042 starts |
| **Status** | 🔴 Active — pending manual action |

---

## R14 — GitHub Issues Not Created

| Field | Value |
|-------|-------|
| **Description** | Rounds R041–R049 do not have GitHub issues. Work is tracked only in markdown files. No cross-linking between PRs and work items. |
| **Impact** | L — reduced traceability; harder onboarding for new contributors |
| **Likelihood** | H — current state |
| **Mitigation** | `issues/R040-R049-issue-drafts.md` created as interim; create actual GitHub issues when GitHub CLI available |
| **Blocking** | No |
| **Owner/Area** | Project management |
| **Next Review** | R041 start |
| **Status** | 🟡 Mitigated by drafts file; full resolution pending |
