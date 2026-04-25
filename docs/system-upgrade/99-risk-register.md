# 99 — Risk Register

> Active platform risks with mitigations and blocking status.
> _Last updated: 2026-04-26 (R041-AI-Assist Governance — R22–R24 added)_
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
| **Next Review** | N/A — resolved |
| **Status** | 🟢 [RESOLVED 2026-04-26] — All 7 migrations applied. 5 tables + 4 columns live. G-ModuleDB gate ✅ |

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

---

## R15 — DB Schema Drift: R040 Tables Created via `db.create_all()` Not Migrations

| Field | Value |
|-------|-------|
| **Description** | 5 R040 tables (`module_versions`, `org_modules`, `module_dependencies`, `module_licenses`, `org_module_settings`) were created by `apps/__init__.py:1487` `db.create_all()` on app restart after R040 commit, not by running the migration files. Three drift categories identified and documented. |
| **Impact** | M — drift between migration spec and live DB; will affect new environment setup unless migrations are re-tested |
| **Likelihood** | H — already happened; ongoing risk from `db.create_all()` in startup code |
| **Mitigation** | Code-First Schema Rule added to `CLAUDE.md`. Drift documented. Fix migrations required before R042 data ingestion (see follow-ups below). |
| **Blocking** | No — tables are empty; functional correctness unaffected for now |
| **Owner/Area** | DB operations; platformengineer |
| **Next Review** | Before R042 seeds any OrgModule data |
| **Status** | 🟡 Documented — low immediate risk, fix required before data ingestion |

**Drift inventory (all 5 tables, identified 2026-04-26):**

| Drift Type | Columns/Objects Affected | Risk |
|-----------|--------------------------|------|
| Missing DB `server_default` | `dependency_type`, `status` (org_modules, module_licenses), `auto_update_policy`, `release_channel_allowed`, `release_channel` (module_versions), `migration_required`, `rollback_supported`, `license_type`, `created_at` on all 5 tables | L — Python `default=` handles these for ORM inserts; raw SQL inserts could miss values |
| Missing FK `ondelete='CASCADE'` | `module_dependencies.module_id`, `module_licenses.org_id`, `org_modules.org_id` | M — orphan rows if parent deleted; no data currently at risk |
| Duplicate / misnamed indexes | `idx_mdep_module_id` and `idx_mv_module_id` missing; `ix_*` equivalents present from `index=True` on model columns | L — functionally equivalent; wastes index namespace |

**Root cause:** `db.create_all()` in `apps/__init__.py:1487` creates tables from model Python `default=` values only — it does not apply migration `server_default`, `ondelete` cascade rules, or explicitly named indexes from `op.create_index()` calls.

**Required follow-up migrations (before R042 data ingestion):**
- `20260426_fix_r040_fk_cascade.py` — add CASCADE to 3 FKs via `op.drop_constraint()` + `op.create_foreign_key()`
- `20260426_fix_r040_server_defaults.py` — add server_defaults to nullable-constrained columns
- `20260426_fix_r040_indexes.py` — create `idx_mdep_module_id`, `idx_mv_module_id` (currently only `ix_*` equivalents exist)

**Verification evidence (2026-04-26):**
- Column names: ✅ All match migration definitions
- Column types: ✅ All match
- Column nullability: ✅ All match
- Unique constraints: ✅ All present
- Primary keys: ✅ All correct
- Server defaults: ❌ Missing on 9 columns across 4 tables (see table above)
- FK cascade: ❌ 3 FKs have NO ACTION instead of CASCADE
- Named indexes: ⚠️ 2 migration-named indexes missing; functionally-equivalent `ix_*` present

---

## R16 — Insufficient Security and Multi-Tenant Test Coverage

| Field | Value |
|-------|-------|
| **Description** | Existing modules and API routes lack systematic security tests: authentication (401), authorization (403), tenant isolation, audit assertions, safe error responses, and AI governance. Cross-tenant data exposure or unauthorized mutations could ship undetected. |
| **Impact** | H — critical security or compliance incident if cross-tenant leak or privilege escalation reaches production undetected |
| **Likelihood** | H — no security test standard existed before R041-Test Addendum; most modules have no isolation or RBAC tests |
| **Mitigation** | `48-testing-and-evidence-standard.md` — mandatory test categories; `01-round-review-checklist.md §12` — reviewer gate; E2E security scaffold (`tests/e2e/security/`) created; backend security helper pattern documented; CI gate plan defined in §5 of standard |
| **Blocking** | Implicit blocker on every round that adds API routes, DB queries, or UI mutations — `§12` in the round review checklist enforces this |
| **Owner/Area** | All modules; enforced per-round via `01-round-review-checklist.md §12` |
| **Next Review** | R042 (first round to add new API routes post-R041-Test) |
| **Status** | 🟡 Active — standard now defined; retroactive coverage per-module pending |

**Immediate gaps (as of 2026-04-26):**

| Gap | Severity | Plan |
|-----|----------|------|
| No tenant isolation tests in any existing module | H | Per-module task; prioritize helpdesk + users + orgs first |
| No audit assertion tests in any module | M | Per-module task when module round runs |
| E2E security specs scaffolded/skipped (no test credentials yet) | M | Unblock via `E2E_ORG_*` env vars in TEST env setup |
| Backend security helper module (`apps/tests/helpers/security.py`) not created | M | Create in first round that adds security tests |
| AI governance tests not applied to existing AI modules (fitness_nutrition, ala, ai_coach) | H | R048 cleanup round |
| No CI gate for LLM import scan in GitHub Actions yet | H | R041A CI enforcement round |

---

## R17 — Legacy Functionality Loss During Rewrite

| Field | Value |
|-------|-------|
| **Description** | During the platform-ui rewrite, existing module capabilities are silently removed because no formal inventory was done before implementation started. Users discover missing features only after migration. |
| **Impact** | Critical — lost user-facing functionality; potential customer churn and data inaccessibility |
| **Likelihood** | H — no per-module inventory process existed before R041-Governance; rewrite pressure creates incentive to simplify by removing rather than redesigning |
| **Mitigation** | Mandatory `LEGACY_INVENTORY.md` before any module rewrite (enforced by `01-round-review-checklist.md §13`); `02-development-rules.md §No Feature Loss During Rewrite`; Removal/Deprecation log required per capability; `03-module-migration-progress.md` tracks must-preserve status |
| **Blocking** | Blocks any module from entering rewrite phase without its inventory |
| **Owner/Area** | All module rounds; enforced via `01-round-review-checklist.md §13` |
| **Next Review** | First module round that starts implementation |
| **Status** | 🟡 Active — standard defined; no inventories created yet |

---

## R18 — Agent Context Loss / Parallel Work Drift

| Field | Value |
|-------|-------|
| **Description** | Multiple AI agents work on the same codebase in separate sessions. Without a handoff protocol, each agent starts without context of prior decisions, creates conflicting implementations, or re-implements already-solved problems. |
| **Impact** | H — duplicate work, conflicting implementations, orphaned code, broken dependencies, lost architectural decisions |
| **Likelihood** | H — multi-agent parallel work is planned; session context is ephemeral; memory is limited |
| **Mitigation** | `51-agent-handoff-protocol.md` — mandatory before/during/after work; handoff summary required in `96-rounds-index.md`; `03-module-migration-progress.md` as shared state; issue-based workflow with round contracts; `CLAUDE.md` auto-memory system |
| **Blocking** | No — process control risk |
| **Owner/Area** | All agents; enforced via `51-agent-handoff-protocol.md` |
| **Next Review** | First parallel-agent session |
| **Status** | 🟡 Active — protocol defined; not yet tested under parallel load |

---

## R19 — UI Simplification Removes Required Capability

| Field | Value |
|-------|-------|
| **Description** | A designer or agent simplifies a UI flow by merging, removing, or reorganizing screens, inadvertently losing a required user capability that was only available through the removed path. |
| **Impact** | H — specific user workflows break; power users lose required features; potential data inaccessibility |
| **Likelihood** | M — simplification is explicitly encouraged by product rules; risk exists when simplification decisions are made without capability mapping |
| **Mitigation** | UX simplification allowed only if capability mapping is preserved (documented in `LEGACY_INVENTORY.md`); all removed or merged flows must be in §Removal/Deprecation; stakeholder approval required for intentional removals; `02-development-rules.md §No Feature Loss During Rewrite` |
| **Blocking** | Blocks a round if removed capability not documented |
| **Owner/Area** | All UI/module rounds |
| **Next Review** | First module UI round |
| **Status** | 🟡 Active — rule defined; enforcement is per-round code review |

---

## R20 — AI / i18n Readiness Not Tracked During Module Development

| Field | Value |
|-------|-------|
| **Description** | Modules are built and shipped without declaring AI readiness or i18n readiness. Adding these capabilities later requires invasive refactoring. Hardcoded strings accumulate and become expensive to extract. |
| **Impact** | M/H — delayed AI feature integration; expensive retroactive i18n work; poor international/RTL user experience |
| **Likelihood** | H — without a tracking requirement, these are easy to skip under time pressure |
| **Mitigation** | AI readiness and i18n readiness columns in `03-module-migration-progress.md`; required declaration in `docs/modules/<key>/AI_READINESS.md` and `I18N_READINESS.md`; `01-round-review-checklist.md §13` requires status declaration before module marked Done; `02-development-rules.md §AI Readiness` and `§i18n` define minimum requirements |
| **Blocking** | Blocks a module from being marked `migrated` (not from shipping in-progress state) |
| **Owner/Area** | All module rounds |
| **Next Review** | First module marked ready_for_review |
| **Status** | 🟡 Active — tracking requirements defined; no modules have declarations yet |

---

## R21 — Runtime Service Coupling / Monolithic Deployment Risk

| Field | Value |
|-------|-------|
| **Description** | UI, API, and workers are collocated in the same pod or started from the same process. A UI crash or memory spike kills API capacity. An AI workload degrades normal user requests. A migration bug prevents startup and takes down all services simultaneously. No independent scaling per service. |
| **Impact** | H — correlated failures; single outage takes down all platform capabilities simultaneously; no ability to scale hot paths independently |
| **Likelihood** | M — current EKS deployment already has API and workers separated; main risk is that `db.create_all()` still runs at app startup and `platform-ui` Dockerfile does not exist yet |
| **Mitigation** | `53-runtime-deployment-architecture.md` — Phase 1 minimum split defined; Phase 2/3 target split documented; `db.create_all()` production ban documented; migration job rule defined; service dependency rules explicit |
| **Blocking** | No — architecture is partially correct; gaps are tracked |
| **Owner/Area** | Deployment, CI/CD, `apps/__init__.py` (db.create_all removal), platform-ui (Dockerfile) |
| **Next Review** | Before P2 module work begins |
| **Status** | 🟡 Active — standard defined; 3 gaps remain: `db.create_all()` in startup, platform-ui Dockerfile missing, migration Job resource not yet created |

---

## R22 — AI/Voice Readiness Omitted From Module Development

| Field | Value |
|-------|-------|
| **Description** | Modules are built and shipped without declaring AI/voice readiness level, registering page contexts, or declaring AI actions. The platform's core AI-native product promise fails silently — the assistant cannot help users on those pages. Adding AI support retroactively requires invasive, expensive refactoring. |
| **Impact** | Critical — the platform's defining differentiator (AI-native experience) is absent from completed modules |
| **Likelihood** | H — without an enforced gate, this is easy to defer under time pressure |
| **Mitigation** | `02-development-rules.md §6` — mandatory AI readiness rule; `01-round-review-checklist.md §14` — reviewer gate; `03-module-migration-progress.md` — mandatory `ai_chat`/`voice_agent` columns; `AI_READINESS.md` required per module; `54-ai-assistant-runtime.md §10–§14` — full contract |
| **Blocking** | Blocks a round from being marked Done if no AI/voice status declared (§14 gate) |
| **Owner/Area** | All module rounds |
| **Next Review** | First module marked ready_for_review |
| **Status** | 🟡 Active — gate defined; no modules have AI declarations yet |

---

## R23 — AI Agent Executes Unauthorized Action

| Field | Value |
|-------|-------|
| **Description** | The AI assistant or voice agent executes an action the user does not have permission for, or against a resource in another tenant, because the frontend context was accepted as the authorization source. |
| **Impact** | Critical — unauthorized data modification, privilege escalation, cross-tenant data breach |
| **Likelihood** | M — risk exists whenever prompt-injected or client-supplied parameters are used for authorization |
| **Mitigation** | 14-check backend re-authorization on every action (`54-ai-assistant-runtime.md §8`); `org_id` always from JWT; `AIActionRegistry` — unregistered actions rejected; `AIActionInvocation` audit row mandatory; per-action permission re-check; tenant scope re-check on target record; stale context detection (`context_version`); AI action denial tests mandatory (`48-testing-and-evidence-standard.md §2.8`) |
| **Blocking** | Blocks a round if AI action tests do not include authorization denial tests |
| **Owner/Area** | All AI action capable modules (Level 4+) |
| **Next Review** | Phase C implementation (AI action execution) |
| **Status** | 🟡 Active — controls designed; not yet implemented |

---

## R24 — Voice Agent Performs Unsafe or Unauthorized Action

| Field | Value |
|-------|-------|
| **Description** | The voice agent executes a dangerous action (high/critical danger level, bulk destructive, hard delete) via verbal confirmation only, without UI approval — or executes against a resource the user cannot modify. |
| **Impact** | Critical — irreversible destructive action triggered by a voice misunderstanding, ambient noise, or voice spoofing |
| **Likelihood** | M — risk exists in any voice-interactive system; one-action-per-turn and read-back reduce but do not eliminate it |
| **Mitigation** | Voice safety rules (`02-development-rules.md §6.6`): one action per turn, read-back before confirm, high/critical always escalate to UI, no bulk destructive by voice, no hard delete by voice, silence/timeout cancels; voice uses same backend authorization as chat; `voice_eligible: false` enforced in registry; voice E2E flows VOICE-06 through VOICE-12 must pass before Level 5+ claimed; `AIActionInvocation` created for every voice attempt |
| **Blocking** | Blocks a module from claiming Level 5+ without voice safety tests |
| **Owner/Area** | All voice-capable modules (Level 5+) |
| **Next Review** | Phase E implementation (voice agent) |
| **Status** | 🟡 Active — safety rules defined; voice Phase E not yet implemented |
