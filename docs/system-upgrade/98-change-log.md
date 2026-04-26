# 98 — Change Log

_Running log of what changed in each update round._
_Newest entry at the top._

## R041E — PlatformTimeline Shared Component — 2026-04-26

**Scope:** platform-ui — Track A generic foundation capability (cap 09). No platformengineer changes. No schema changes.

**What changed (platform-ui):**

1. `components/shared/timeline/types.ts` — **new**: `TimelineEvent` interface (`id`, `type`, `timestamp`, `actor?`, `description`, `detail?`, `icon?`)
2. `components/shared/timeline/timeline-event.tsx` — **new**: `TimelineEventItem` — connector line (`start-[15px]` RTL logical), icon dot, actor + description + `formatRelativeTime`, expandable detail via `maxHeight` animation
3. `components/shared/timeline/timeline-skeleton.tsx` — **new**: pulse skeleton with configurable `rows` prop (default 4)
4. `components/shared/timeline/timeline.tsx` — **new**: `PlatformTimeline` — loading → skeleton, empty → `EmptyState`, events → stagger `m.div` inside `LazyMotion domAnimation`
5. `components/shared/timeline/index.ts` — **new**: barrel export
6. `docs/system-upgrade/26-platform-capabilities-catalog.md` — cap 09 status: `⬜ Pending` → `✅ Implemented | R041E`
7. `docs/system-upgrade/43-shared-services-enforcement.md` — PlatformTimeline row added

**Key facts:**

- All Framer Motion rules followed: `LazyMotion domAnimation`, `m` not `motion`, `maxHeight` not `height`, max 0.2s content animations
- All RTL rules followed: `start-[15px]` logical connector line, `ps-`/`pe-` spacing throughout
- Loading, empty, and populated states all handled
- platform-ui PR #6 opened on `feat/r041e-timeline`

**Next recommended:**

Track A: Cap 12 PlatformNotifications (notification bell + feed) — next generic foundation capability, no backend dependency.
Track B: R041A (CI Enforcement — LLM import gate), now unblocked.

---

## R041D — Secrets Gate Baseline Cleanup — 2026-04-26

**Scope:** platformengineer — legacy maintenance exception (Track B). No platform-ui runtime code changes. No schema changes.

**What changed (platformengineer):**

1. `.gitleaks.toml` — extended: `paths` allowlist for 5 directories (legacy K8s, pdfmake source maps, `_bmad/`, `_bmad-output/`, `.claude/`, evidence files, ec2 log); `stopwords` for 215 classified-safe findings (full list with justification per entry)
2. `gitleaks-baseline.json` — **new**: 53-finding baseline file; CI step updated with `--baseline-path gitleaks-baseline.json` so pre-existing pending_review items are suppressed
3. `.gitignore` — `!gitleaks-baseline.json` exception added (was blocked by `*.json` rule)
4. `.github/workflows/ci-platform.yml` — D-005 gitleaks step: added `args: --baseline-path gitleaks-baseline.json`
5. `IaC/asterisk-freepbx/etc/default/asterisk` — OpenAI key replaced: `"sk-proj-..."` → `"${OPENAI_API_KEY}"`
6. `JIRA/jira_mcp_wrapper.py` — Atlassian token + email → `os.environ.get()`
7. `JIRA/scripts/jira_mcp_wrapper.py` — same fix
8. `scripts/check_confluence_spaces.py` — same fix
9. `scripts/create_confluence_standards_page.py` — same fix
10. `evidence/r041d-findings.md` — **new**: full 302-finding classification table
11. `scripts/classify_findings.py` — **new**: classifier script

**What changed (platform-ui docs):**

12. `docs/system-upgrade/99-risk-register.md` — R27 updated: 🔴 Active → 🟡 Mitigated
13. `docs/system-upgrade/96-rounds-index.md` — R041C + R041D entries appended
14. `docs/system-upgrade/00-implementation-control-center.md` — R041D + R041C added to Recent Rounds; Cap 08 marked done (R015); R041A status updated; blocker updated

**Key facts:**

- Scan: 302 findings, all classified. 5 real credentials removed from code (already rotated by owner).
- 215 findings allowlisted with justification. 52 pending_review in baseline + issue #8.
- D-005 gate now functional for new PRs. Risk register R27: 🟡 Mitigated.
- platformengineer PR #9 opened. Do not merge until issue #8 verified.

**Next recommended:**

Track B: R041A (CI Enforcement — LLM import gate), now unblocked.
Track A: Timeline + ActivityFeed generic component, or any explicitly scoped platform-ui capability round.

---

## R041C — Generic Foundation Roadmap Realignment — 2026-04-26

**Scope:** platform-ui docs only. No code. No schema.

**What changed (platform-ui docs):**

1. `docs/system-upgrade/35-platform-capabilities-build-order.md` — §6 renamed "Platform-UI Generic Foundation Track"; §7 AI Agents dependency fixed (was "Helpdesk complete" → `PlatformApprovalFlow` generic capability)
2. `docs/system-upgrade/00-implementation-control-center.md` — Track A expanded to 9-step generic foundation sequence
3. `docs/system-upgrade/47-generic-platform-foundation-roadmap.md` — §1 ActionButton ✅; §8 item 1.3 reframed; §22 "Platform-UI Frontend Capability Build Order" added (3 subsections)
4. `docs/system-upgrade/96-rounds-index.md` — R041C round entry
5. `docs/system-upgrade/98-change-log.md` — this entry

**Key findings:**

- Cap 08 (DetailView) was **already done in R015** — `components/shared/detail-view/` exists with 6 components. No work needed.
- FeatureFlags UI (PR #5) created but immediately blocked on governance: R041D-UI is invalid round ID + FeatureFlags belongs to R045 in required sequence. PR #5 remains draft.

**Next recommended:** R041D → R041A (Track B). Platform-ui Track A: next generic foundation capability after ActionButton + DetailView.

---

## R041B — ActionButton Shared Component — 2026-04-26

**Scope:** platform-ui rewrite — shared capability. No platformengineer changes. No runtime auth/API/proxy changes.

**What changed (platform-ui):**

1. `components/shared/action-button.tsx` — **new** — `ActionButton` wrapper over shadcn `Button`: `isLoading`, `loadingText`, spinner, double-submit guard, `aria-busy`. `type &` intersection props (not `interface extends`). `{...props}` spreads before enforced props — callers cannot override `disabled` or `aria-busy`. Shared services enforcement doc (`43`) marks it ✅ Implemented (R041B).
2. `app/(dashboard)/users/[id]/page.tsx` — deactivate + reactivate buttons migrated from `<Button disabled={*.isPending}>` to `<ActionButton isLoading={*.isPending}>`
3. `app/(dashboard)/organizations/[id]/page.tsx` — same migration as users page
4. `docs/system-upgrade/43-shared-services-enforcement.md` — ActionButton status `⬜ Pending (R034)` → `✅ Implemented (R041B)`

**Post-merge reconciliation docs (this PR):**

5. `00-implementation-control-center.md` — R041B marked complete; Recent Rounds updated; Recommended Next updated; repo model corrected (platform-ui only, not both repos)
6. `15-action-backlog.md` — R041B completed section added; worktree tasks marked done
7. `35-platform-capabilities-build-order.md` — PlatformAction (04) fully complete; dependency graph updated; pre-Helpdesk table updated
8. `96-rounds-index.md` — R041B round entry appended
9. `98-change-log.md` — this entry

**Key facts:**
- PR #2 merged to platform-ui/master. Merge SHA: `5532102`.
- No platformengineer files changed in any R041B commit.
- TypeScript: 0 new errors in changed files. Full clean check limited by missing `node_modules` in worktree (pre-existing condition).
- Prop precedence review fix applied in separate commit `72d1e25` before merge.

**Next recommended:**

Track A — platform-ui rewrite (default): PlatformDetailView extraction (cap 08) or another explicitly scoped platform-ui capability round. platformengineer is read-only reference. R042 UI side only after platformengineer backend/core complete and explicitly scoped.

Track B — platformengineer legacy maintenance (exception-only, requires explicit user authorization): R041D → R041A. Agents must not modify platformengineer during platform-ui rewrite rounds without explicit authorization.

---

## R040-Fix-Post-Apply-Reconciliation — 2026-04-26

**Scope:** Planning/control docs only. No runtime code. No schema. No UI.

**Backend context:** PR #7 merged to platformengineer/main on 2026-04-26.
3 drift-fix migrations applied to EKS DB. Final revision: `20260426_fix_r040_indexes`.
Backend main SHA: `cc6c9001c90bc3317a17e1603762564ab23747c7`.
Tests: `test_r040_fix.py` 33/33 ✅, `test_r040_schema.py` 43/43 ✅.

**What changed (platform-ui docs):**

1. `00-implementation-control-center.md` — G-ModuleDB-DriftFixed updated to ✅; G-SecretScan updated to 🔴 (D-005 baseline failures); blocker for 3 drift migrations removed; Code-First Schema Rule section updated with completion evidence; R040-Fix and reconciliation rounds added to Recent Rounds
2. `99-risk-register.md` — R15 marked RESOLVED; R26 reserved; R27 added (Secrets Gate baseline failures)
3. `15-action-backlog.md` — R040-Fix DB apply status table added; R041D task section added
4. `35-platform-capabilities-build-order.md` — R040-Fix gate summary section added with recommended next execution order
5. `96-rounds-index.md` — R040-Fix + post-apply reconciliation round entry appended
6. `01-round-review-checklist.md` — CI baseline failure acceptance policy note added
7. `03-module-migration-progress.md` — global blocker note updated (Module Manager DB foundation complete at DB level)
8. `issues/R041D-secrets-gate-baseline-cleanup.md` — new issue draft created

**Key decisions:**
- R042 is technically unblocked but should not start until R041D is at least tracked
- R041D should be done before R041A to restore D-005 CI gate trust
- R26 is reserved (gap in sequence); R27 is the Secrets Gate risk

---

## R041-AI-Knowledge — 2026-04-26

**Scope:** Global AI system capability knowledge base — governance and architecture documentation only. No runtime code.

**What changed:**
1. Created `55-ai-system-capability-knowledge-base.md` — full global knowledge model for Chat AI and Voice Agent advisors
2. Defined AI Operational Assistant Product Role: 3 modes (Advisory, Guided Operation, Delegated Action)
3. Defined core distinction: Global System Capability Knowledge vs User Runtime Capability Context
4. Defined data models: SystemCapability, SolutionTemplate, CapabilityRecommendation
5. Defined 14 knowledge sources (module manifests, action registry, billing catalog, etc.)
6. Defined full advisory flow (8-step including execution path)
7. Defined module contract: global capability metadata required (§6.1, 13 fields)
8. Defined KB-01–KB-15 E2E test requirements
9. Added 5 new progress tracker columns to doc 03
10. Added R25 risk: AI capability knowledge drift
11. Added §6.9 to dev rules: global capability metadata requirement
12. Added §2.9 to testing standard: advisory and knowledge tests
13. Added §16 to doc 54: integration with doc 55
14. Added global AI capability knowledge row to source-of-truth registry

**Key rule enforced:** "The assistant may describe global capabilities freely. It may only execute actions or access tenant data according to the runtime user capability context. Global knowledge does not grant execution permission."

---

## R041-AI-Assist Governance — 2026-04-26 — Mandatory Chat AI + Voice Agent Readiness for Every Module

**Scope:** Architecture/governance documentation — AI/voice readiness mandatory gate for all modules
**Tests:** N/A — governance round

### What changed
- **Updated:** `54-ai-assistant-runtime.md` — §14 AI Readiness Levels (0–6) and §15 AI Test Harness design added
- **Updated:** `02-development-rules.md §6` — rewritten as mandatory AI readiness gate: readiness levels, voice capability rules, chat capability rules, Done gate, module contract, refusal rules
- **Updated:** `03-module-migration-progress.md` — `ai_chat`/`voice_agent` status values formalized (7 values); mandatory migrated gate added
- **Updated:** `48-testing-and-evidence-standard.md` — §2.8 AI action backend tests + §3.4 frontend AI/voice UI tests; evidence matrix updated
- **Updated:** `50-module-e2e-coverage-matrix.md` — 16 Chat AI E2E flows (AI-01–AI-16) + 14 Voice Agent E2E flows (VOICE-01–VOICE-14) added
- **Updated:** `51-agent-handoff-protocol.md` — `AI_READINESS.md` added to Before Work checklist; ai_chat/voice_agent columns added to After Work mandatory updates
- **Updated:** `01-round-review-checklist.md` — §14 AI/Voice Readiness Gate: 13 reviewer checks added; blocks round if no AI status declared
- **Updated:** `99-risk-register.md` — R22 (AI readiness omitted), R23 (AI executes unauthorized action), R24 (voice agent performs unsafe action)
- **Updated:** `15-action-backlog.md` — per-module AI_READINESS.md creation tasks + test harness implementation tasks added
- **Updated:** `00-implementation-control-center.md` — DoR + DoD updated; AI_READINESS.md required per module round

### Key rules enforced
- Every module round must declare AI/voice readiness level (even Level 0 + exception is valid — silence is not)
- A module cannot be marked `migrated` without a tested readiness level
- Backend AI action tests mandatory at Level 4+: authorized execute, 403 denial, tenant isolation, audit row, AIUsageLog
- Voice safety tests mandatory at Level 5+: VOICE-06–VOICE-12 flows
- `01-round-review-checklist.md §14` blocks any round touching a module without AI_READINESS.md

---

## R041-AI — 2026-04-26 — AI Assistant Runtime Contract

**Scope:** Architecture clarification and development contract documentation only — no product code, no schema, no UI
**Tests:** N/A — architecture round

### What changed
- **New:** `54-ai-assistant-runtime.md` — end-to-end runtime contract: global chat assistant lifecycle, voice agent safety limits, page context registry structure, user capability context (server-generated only), action proposal flow (9 steps), action registry (`AIActionDescriptor` fields), confirmation/approval policy (low/medium/high/critical), backend authorization re-check (14 checks), audit/billing requirements, module AI/voice contract, required tests (chat + voice + integration), implementation phases (A–F)
- **Updated:** `36-ai-action-platform.md` — cross-reference to 54 added in header
- **Updated:** `38-floating-ai-assistant.md` — cross-reference to 54 §1 added in header
- **Updated:** `39-ai-architecture-consistency-pass.md` — cross-reference to 54 added in header
- **Updated:** `40-ai-provider-gateway-billing.md` — cross-reference to 54 §9 added in header
- **Updated:** `02-development-rules.md §6` — extended AI readiness rules with module contract pointer and `migrated` blocker rule
- **Updated:** `97-source-of-truth.md` — `54` registered
- **Updated:** `00-implementation-control-center.md` — `54` linked in Key Governance Documents
- **Updated:** `15-action-backlog.md` — AI assistant implementation tasks added (Phase A–F)
- **Updated:** `96-rounds-index.md` — R041-AI round entry appended

### Key clarifications
- Assistant must not make any LLM or API call on page load — only on user explicit interaction
- Capability context is server-generated, guidance-only for prompt; backend always re-checks all 14 conditions before execution
- Voice agent is strictly limited: one action per turn, read-back, high/critical always escalate to UI, no bulk destructive, no hard delete, no system action
- Every module page must declare `aiPageContext`; every AI action must be registered in `AIActionRegistry`
- A module cannot be marked `migrated` until `ai_chat != "not_declared"` in progress tracker
- `AIActionInvocation` + `AIUsageLog` rows are mandatory for every action execution and every LLM call

---

## R041-Infra — 2026-04-26 — Runtime Deployment Architecture

**Scope:** Architecture/governance documentation only — no product features, no schema, no UI, no K8s manifest changes
**Tests:** N/A — architecture round

### What changed
- **New:** `53-runtime-deployment-architecture.md` — complete runtime topology: 9 logical services, Phase 1 minimum split, Phase 2/3 target split, service dependency rules, health/readiness check definitions, failure isolation scenarios (7 scenarios), Kubernetes Deployment/Ingress/ConfigMap requirements, resource requests, HPA targets, PDB requirements, migration job rule, `db.create_all()` production ban, scaling rules, security boundaries, observability requirements, CI/CD pipeline implications, current-state-vs-target table, enforcement rules for future rounds
- **Updated:** `99-risk-register.md §R21` — runtime service coupling / monolithic deployment risk
- **Updated:** `97-source-of-truth.md` — `53` registered as runtime topology source of truth
- **Updated:** `00-implementation-control-center.md` — `53` linked in Key Governance Documents
- **Updated:** `15-action-backlog.md` — Runtime Deployment Architecture tasks added (migration job, `db.create_all()` removal, platform-ui Dockerfile, health endpoint hardening)
- **Updated:** `01-round-review-checklist.md §7` — pod separation check added to migration safety section

### ADR recorded
- ADR — Runtime Pod Separation and Failure Isolation (in `53-runtime-deployment-architecture.md §intro`)

### Key decisions
- Phase 1 minimum: `platform-ui-web` + `platform-api` + `platform-worker` + `platform-scheduler` must be separate deployments — UI and API must never share a pod
- `platform-ai-gateway` stays inside `platform-api` in Phase 1 — separate pod only when AI load warrants it
- `db.create_all()` banned from production startup path — violation tracked in R015, must be removed before P2
- Migrations must run as Kubernetes Job (or equivalent controlled step), not inline on pod boot
- Heavy jobs must be queued — API must not require workers to respond to read-only requests

---

## R041-WT — 2026-04-26 — Parallel Worktree Agent Workflow

**Scope:** Governance/process documentation only — no product features, no schema, no UI
**Tests:** N/A — governance round

### What changed
- **New:** `52-parallel-worktree-agent-workflow.md` — complete worktree workflow: directory convention, branch naming, creation commands, agent assignment contract template, parallel safety rules, file lock list, safe/unsafe parallel tracks, PR workflow, merge order, cleanup commands, quick reference card
- **Updated:** `51-agent-handoff-protocol.md` — worktree-first rule added; worktree fields in handoff summary template; orientation checklist updated
- **Updated:** `02-development-rules.md §8` — worktree-first rule + lock list reference added to agent collaboration section
- **Updated:** `00-implementation-control-center.md` — R041-WT recorded; `52` linked in Key Governance Docs
- **Updated:** `01-round-review-checklist.md §11` — branch-from-feature-branch check added
- **Updated:** `15-action-backlog.md` — Parallel Worktree Workflow setup tasks added (5 tasks)
- **Updated:** `97-source-of-truth.md` — `52` registered

### Key decisions
- Worktree directory: `C:\Users\moshe\OneDrive\Documents\Projects\worktrees\`
- Branch naming always includes round ID for traceability
- Locked governance files updated only after PR merge (not by parallel agents)
- R041A (CI, platformengineer) + R041B (ActionButton, platform-ui) identified as first safe parallel pair

---

## R041-Gov — 2026-04-26 — Governance Addendum: Legacy Preservation, Module Inventory, Agent Handoff

**Scope:** Planning, governance, inventory structure, test coverage structure, agent handoff process — no product features, no schema, no UI
**Tests:** N/A — governance round

### What changed
- **New:** `02-development-rules.md` — non-negotiable rules for all agents: product, architecture, security, testing, UX, AI readiness, i18n, agent collaboration, per-module doc convention
- **New:** `03-module-migration-progress.md` — central per-module rewrite tracker (all known modules, all status columns, blockers registry)
- **New:** `49-legacy-functionality-inventory.md` — standard + template for per-module `LEGACY_INVENTORY.md` (required before any module rewrite)
- **New:** `50-module-e2e-coverage-matrix.md` — standard + template for per-module `E2E_COVERAGE.md` (required base flows, status values, evidence requirements)
- **New:** `51-agent-handoff-protocol.md` — agent handoff protocol with before/during/after checklists and handoff summary template
- **Updated:** `01-round-review-checklist.md §13` — Legacy Functionality Preservation gate added (inventory, E2E plan, removal docs, AI/i18n declarations, handoff summary)
- **Updated:** `99-risk-register.md §R17–R20` — four new risks: legacy loss, agent drift, UX simplification removes cap, AI/i18n untracked
- **Updated:** `00-implementation-control-center.md` — R041-Gov recorded; new docs in Key Governance Docs; DoR + DoD extended
- **Updated:** `15-action-backlog.md` — "Legacy Preservation & Module Readiness" section added (11 tasks)
- **Updated:** `35-platform-capabilities-build-order.md` — legacy preservation gate paragraph added
- **Updated:** `48-testing-and-evidence-standard.md` — cross-references to new governance docs added
- **Updated:** `97-source-of-truth.md` — 11 new entries registered (all new docs + per-module file locations)

### Key decisions
- Per-module inventories and E2E plans are per-module files (`docs/modules/<key>/`), NOT stored in the central docs, to support parallel agents and avoid merge conflicts
- Central tracker (`03-module-migration-progress.md`) is the index; it links to per-module docs
- No module rewrite without LEGACY_INVENTORY.md + E2E_COVERAGE.md
- No module marked migrated without AI_READINESS.md + I18N_READINESS.md declared
- Agent handoff summary is required in 96-rounds-index.md entry for every round

---

## R041-Test Addendum — 2026-04-26 — Security/Multi-Tenant Test Standard

**Scope:** Testing standards, governance docs, E2E scaffold, reviewer gate
**Tests:** N/A — governance round

### What changed
- **New:** `48-testing-and-evidence-standard.md` — 9 required test categories with code examples, CI gate plan, evidence matrix, RBAC matrix template, module TESTING.md template, backend helper patterns
- **New:** `tests/e2e/security/` — 4 scaffolded E2E spec files (auth-redirect, permission-denied, tenant-isolation, module-disabled) + env var example
- **Updated:** `01-round-review-checklist.md §12` — new reviewer gate: security/multi-tenant test evidence required on every round
- **Updated:** `99-risk-register.md §R16` — risk: insufficient security test coverage (H impact, H likelihood, gap inventory)
- **Updated:** `00-implementation-control-center.md` — R041-Test complete, testing standard linked in governance docs
- **Updated:** `15-action-backlog.md` — 12 security test tasks added (helpers, module isolation tests, AI governance, Playwright setup, CI gates)
- **Updated:** `35-platform-capabilities-build-order.md` — security test gate mandate added
- **Updated:** `97-source-of-truth.md` — `48-testing-and-evidence-standard.md` registered

### Key decisions
- Every module round is **blocked** until security + tenant isolation evidence exists (§12 gate)
- E2E specs are scaffolded/skipped until Playwright setup + test credentials available
- Backend security helper module (`apps/tests/helpers/security.py`) deferred to first module round that adds security tests
- AI governance test pattern deferred to R048 for existing modules

---

## R040 Schema Adoption + Code-First Rule — 2026-04-26 — Governance clarification

**Commit (platform-ui):** `0dbf0acd32ae34d52aa8e1e25535518bc31bce6b`
**Tests:** N/A — verification + governance round

### Key findings
- 5 R040 tables pre-existed in DB before migrations were applied
- **Origin confirmed:** `apps/__init__.py:1487` `db.create_all()` on app restart after R040 commit
- Revisions stamped after schema verification (see drift inventory below)
- `db.create_all()` creates from Python model `default=` only — does NOT apply `server_default`, `ondelete` cascade, or migration-named indexes

### Stamp justification
Revisions stamped (not run) for 5 tables because:
1. All column names, types, nullability match migration definitions ✅
2. All unique constraints present ✅
3. Tables are empty — no data at risk ✅
4. Drift items documented in R15 risk register — low immediate impact ✅
5. Running the migration would fail with `DuplicateTable` ✅

### Schema drift found
| Type | Count | Risk |
|------|-------|------|
| Missing `server_default` | 9 columns across 4 tables | L |
| Missing FK `ondelete='CASCADE'` | 3 FKs | M |
| Missing migration-named index (`idx_*`) | 2 indexes (ix_* equivalent present) | L |

Full drift inventory: `99-risk-register.md §R15`

### Documentation added
- `CLAUDE.md §Code-First Schema Rule` — new mandatory section
- `01-round-review-checklist.md §7` — 8 new Code-First checks added
- `99-risk-register.md §R15` — drift + follow-up migrations documented
- `96-rounds-index.md` — R040 migration note updated with schema adoption details

### G-ModuleDB status
✅ Green — maintained. Functional correctness unaffected (tables empty, Python defaults handle inserts). Follow-up migrations (`fix_r040_fk_cascade`, `fix_r040_server_defaults`, `fix_r040_indexes`) required before R042 seeds data.

---

## R040 Migrations Applied — 2026-04-26 — DB schema live

**Action:** Applied all 7 R040 migrations to EKS DB via localhost:15432 port-forward
**Scope:** 5 tables created (pre-existing via earlier rounds), 2 column-add migrations run, 5 revisions stamped
**G-ModuleDB gate:** ✅ Active

### Tables now live
- `module_versions` — system version catalog
- `org_modules` — per-org module state
- `module_dependencies` — inter-module dependency graph
- `module_licenses` — org-level license tracking
- `org_module_settings` — per-org per-module settings

### Columns added
- `modules.system_status` (VARCHAR 30, server_default 'active') — fixes startup WARN
- `module_logs.org_id/user_id/module_key` — nullable compat FKs

### Rounds unblocked
- R042 ModuleRegistry + CompatLayer
- R043 AI Service Routing Matrix
- R045 Feature Flags + Settings Engine

---

## R040-Control follow-up — 2026-04-26 — Doc accuracy fixes

**Commit:** TBD (platform-ui, main)
**Tests:** N/A — doc corrections only
- Product vision broadened: "MSP platform" → "AI-native generic organization platform"
- Full SHAs for R040 and R040-Control commits
- R041 split into R041A (CI) + R041B (ActionButton); repos corrected
- R048 readiness clarified: Phase 1 can start now, Phase 2 waits for R043
- GitHub templates copied to platform-ui
- Control Center blockers updated (R040-Control committed, system_status warning documented)

---

## R040-Control — 2026-04-25 — Implementation Governance Setup

**Commit (platform-ui):** `202d45a678745d5d5046e60644751175d3e01340`
**Commit (platformengineer):** `ed72d27913dc581e6553cace8186b3ea58ecefd5`
**Tests:** N/A — governance/process round

### Files Created (platform-ui)
- `docs/system-upgrade/00-implementation-control-center.md` — control center
- `docs/system-upgrade/99-risk-register.md` — 14 risks
- `docs/system-upgrade/01-round-review-checklist.md` — 11-section reviewer checklist
- `docs/system-upgrade/issues/R040-R049-issue-drafts.md` — 10 round issue bodies

### Files Created (platformengineer)
- `.github/ISSUE_TEMPLATE/platform-round.yml` — 14-field issue template
- `.github/pull_request_template.md` (updated) — 9-section governance PR template

### Files Updated (platformengineer)
- `CLAUDE.md` — §Implementation Governance added (10-rule agent contract)

### Files Updated (platform-ui)
- `96-rounds-index.md` (this round + R040-Control entry)
- `98-change-log.md` (this entry)
- `97-source-of-truth.md` (4 governance doc entries added)
- `35-platform-capabilities-build-order.md` (R040-Control table)

### No Product Features
This round added only governance process — no schema, no UI, no API changes.

---

## R040 — 2026-04-25 — Module Manager Additive Schema Foundation

**Commit:** `abdf3bc38985dcf1152a390ea81f3d1675103140` (platformengineer main)
**Tests:** 43 passed, 0 failed

### Files Created (platformengineer)
- `apps/module_manager/models.py` — 5 new model classes appended; Module + ModuleLog patched additively
- `apps/module_manager/seeds.py` — idempotent seed helpers (ModuleVersion, OrgModule core seed)
- `apps/module_manager/tests/test_r040_schema.py` — 43 structural tests
- 7 migration files in `migrations/versions/20260425_*.py`

### New Tables
`module_versions`, `org_modules`, `org_module_settings`, `module_dependencies`, `module_licenses`

### New Columns (additive)
`modules.system_status`, `module_logs.org_id`, `module_logs.user_id`, `module_logs.module_key`

### Deferred
- ModuleDependency JSON seed → R038C
- ModulePurchase backfill → R038I
- Module permissions seed → R038C

### Constraints Met
Additive only · No DROP/RENAME · No BYODB · org_id on all org-scoped tables · 43/43 tests pass

---

## Format

```
## YYYY-MM-DD — Round NNN: <topic>
### Files Changed
### New Findings
### Decision Changes
### Backlog Changes
```

---

## R039 addendum — 2026-04-25 — Data Ownership, Artifacts & Tenant Storage Strategy

### New Content Added
- `47-generic-platform-foundation-roadmap.md §21` — Data Ownership, Artifacts & Tenant Storage Strategy (10 subsections)
- ADR-036: Existing DB First, Data Artifact Registry, Tenant Storage Modes

### Docs Updated
- `12-migration-roadmap.md` — Existing DB-First additive principle section
- `24-core-platform-and-module-system.md` — dataContract manifest section, tenant storage modes
- `45-module-manager-redesign.md` — dataContract manifest extension note
- `35-platform-capabilities-build-order.md` — R039 addendum gate rows
- `15-action-backlog.md` — R039 addendum tasks, deferred items
- `96-rounds-index.md` — R039 addendum entry
- `ARCHITECTURE.md` — Data & Storage Strategy section

### Key Rules Established
- Additive migration only; destructive = 30d gate + backup + rollback
- Every module must declare `dataContract` in manifest.v2.json
- TenantDataRouter is P3 but module code must be router-compatible today (always org_id scoped, no hardcoded connection strings)
- BYODB is enterprise P3 only — strict safety rules defined

---

## R039 — 2026-04-25 — Generic Platform Foundation Roadmap

### Files Created
- `47-generic-platform-foundation-roadmap.md` — 700+ line master platform roadmap (new)

### Decisions Made
- ADR-033: Generic Platform Foundation First — complete foundation before broad module dev
- ADR-034: AI-Native Generic Organization Platform — platform is generic, not helpdesk-only
- ADR-035: Data Sources & Knowledge Connections Platform — new platform domain
- 10 platform pillars finalized (Identity, Tenant, Module, Data, AI, Data Sources, Integration, Operations, Billing, UX, DevOps/Infra)
- 11 capability domains fully inventoried with status, priority, and round estimates
- 12 P0 foundation gates identified that block all broad module development
- Recommended next 10 rounds (R040–R049) with dependency ordering
- Broad module development NOT ready — 12 P0 foundation gates missing
- R040 (R038B schema migrations) is the unblocked next step

### Vision Clarified
Platform is an AI-native generic organization platform, not a single-purpose product. All new development must prioritize generic platform capabilities over vertical features. Modules extend the platform; they do not fork it.

### Files Updated
- `docs/system-upgrade/35-platform-capabilities-build-order.md` — R039 gate row + next rounds updated
- `docs/system-upgrade/15-action-backlog.md` — R039 complete section + R040–R049 phase backlog
- `docs/system-upgrade/96-rounds-index.md` — Round 039 entry
- `docs/system-upgrade/97-source-of-truth.md` — 4 new registry rows
- `docs/system-upgrade/10-target-architecture.md` — AI-Native Generic Platform section
- `docs/ARCHITECTURE.md` — Pillar 24 section

---

## 2026-04-25 — Round 038B0: Module Manager Open Questions & Implementation Inventory

### Files Changed (platform-ui)
- `docs/system-upgrade/46-module-manager-implementation-inventory.md` — **created** v1.0: OQ-01–OQ-07 answered with code evidence, schema inventory (7 tables), manifest inventory (75 files), legacy caller inventory, migration framework findings, FK verification, R038B scope recommendation, ModuleVersion timing decision, ModulePackage/Store timing decision, nav source of truth pre-findings, 13 acceptance criteria
- `docs/system-upgrade/45-module-manager-redesign.md` — **updated** v2.0 → v3.1: header fixed (was stuck at v2.0), §01 manifest filename corrected from `module.manifest.json` to `manifest.v2.json`, §33 Navigation Source of Truth added (manifest nav declaration, runtime resolution algorithm, `GET /api/org/modules/navigation` planned API, 5 UI surfaces affected, hardcoded nav deprecation rule, backend enforcement, disabled/suspended/unlicensed module table)
- `docs/system-upgrade/15-action-backlog.md` — **updated**: R038B0 gate entry added; R038B scope updated (ModuleVersion moved from R038H, module_purchases FK added, pre-migration check added, OrgModuleSettings deferred); R038D updated (nav API task + `/api/modules/enabled-menu` auth fix)
- `docs/system-upgrade/35-platform-capabilities-build-order.md` — **updated** (R038B0 gate row added; R038B description updated; R038H updated — ModuleVersion already in R038B)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 038B0 entry added)
- `docs/system-upgrade/98-change-log.md` — this entry

### New Findings
- Manifest filename is `manifest.v2.json` (not `module.manifest.json`) — doc 45 §01 had an error
- `module_key` concept maps directly to `Module.name` — no new identity column needed
- 75 manifest files across 37+ modules already exist; `manifest.v2.json` already serves `menu_items` nav data
- `Organization` model is a stub (`organizations`, `id` only) — FK confirmed safe
- `/api/modules/enabled-menu` route at routes.py:2027 has no `@login_required` — security gap
- `apps/__init__.py:193` has partial org-filtered nav via `OrgFeatureFlag` (migration hook point for R038E)
- `ModuleVersion` must be in R038B scope to avoid breaking FK migration later

### Decision Changes
- OQ-01: Seed strategy = lazy (non-core) + pre-seed (is_core=True × all orgs)
- OQ-02: No ModuleSettings seed in R038B (defer to R038F)
- OQ-03: Licenses not required until R038I
- OQ-04: FK target = `organizations.id`, `users.id`
- OQ-05: `ScriptExecution` remains system-only, no org scope
- OQ-06: Manifest filename corrected
- OQ-07: `system_status='deprecated'` blocks new org enables
- ModuleVersion: include in R038B (moved from R038H)
- ModulePackage: defer to R038H; ModuleStoreListing: defer to R038I

### Backlog Changes
- R038B0 gate entry added to backlog (done)
- R038B scope updated: ModuleVersion added, module_purchases FK added, OrgModuleSettings deferred
- R038D: `GET /api/org/modules/navigation` task added; auth fix for enabled-menu added
- R038H scope reduced: ModuleVersion already done in R038B

---

## 2026-04-25 — Round 038A2: Module Versioning, Upgrade Jobs, Package Management, and Marketplace

### Files Changed (platform-ui)
- `docs/system-upgrade/45-module-manager-redesign.md` — **updated** v2.0 → v3.0: added §22 (per-org versioning — `ModuleVersion` model, `OrgModule` 6 new version fields), §23 (upgrade workflow — `ModuleUpgradeJob` model, 9-step process, approval matrix), §24 (rollback policy — irreversibility detection, constraints), §25 (package management — `ModulePackage` model, S3 storage, security rules), §26 (marketplace — `ModuleStoreListing` model, store flow), §27 (license/purchase flow — extended `ModuleLicense`, enforcement rules), §28 (store + versioning UI routes — 12 routes), §29 (security requirements for versioning + marketplace), §30 (AI integration v2 — version-aware action registry), §31 (updated phase split R038A-I), §32 (ADR-032)
- `docs/system-upgrade/14-decision-log.md` — **updated** (ADR-032 added)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (R038H: 18 tasks across schema/service/API/UI; R038I: 14 tasks)
- `docs/system-upgrade/35-platform-capabilities-build-order.md` — **updated** (R038H + R038I gate rows added)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (R038A2 entry added)
- `docs/system-upgrade/98-change-log.md` — this entry

### New Findings
- Per-org versioning requires 9-step async Job model — not safe as synchronous API call
- Rollback must be blocked when irreversible migrations run (DROP/TRUNCATE in dry-run)
- Package files must never be stored in DB — S3 with checksum before publish
- No dynamic code loading from uploaded packages — `backend_plugin` requires CI/CD deploy
- Marketplace store visibility must be gated on `required_plan` + `listing_status` per org

### Decision Changes
- ADR-032 added: Module Versioning, Upgrade Jobs, Package Management, and Marketplace
- R038 phases expanded from A-G to A-I (9 total)

### Backlog Changes
- R038H: 18 tasks (schema + upgrade service + Celery task + APIs + 3 UI pages)
- R038I: 14 tasks (schema + 5 APIs + 3 platform-ui pages + types + Zod + query keys)

---

## 2026-04-25 — Round 038 Follow-up: Module Manager Contract Hardening

### Files Changed (platform-ui)
- `docs/system-upgrade/45-module-manager-redesign.md` — **updated** v1.0 → v2.0: added §01 (source of truth — manifest vs DB), §02 (module identity terms: module_key/module_id/org_module_id), §03 (lifecycle model — system: registered/beta/active/deprecated/removed; org: available/installed/enabled/disabled/suspended/uninstalled + transition rules), §04 (manifest integration — canonical schema, sync process, validation, version mismatch handling), §09 (permission model — 9 permissions with role assignments), §10 (dependency & license enforcement — 8-step fail-closed precondition check, disable warnings), §11 (route/nav enforcement — `is_module_available()` + `@module_required` decorator), §12 (audit requirements — 12 action types with required fields), §13 (API contract outline), §14 (testing strategy — 14 required tests), §15 (backward compatibility plan — 4 phases, 30-day gate for cleanup), §16 (AI integration — registry data only, execution via AI Action/Gateway), §21 (R038 phase split: R038A-G with gate conditions); updated §07 model design, §17 migration strategy, §20 ADR-031
- `docs/system-upgrade/15-action-backlog.md` — **updated**: replaced single R038-A/B/C/D with R038A-G (43 tasks: R038A doc, R038B 12 tasks, R038C 6 tasks, R038D 8 tasks, R038E 7 tasks, R038F 8 tasks, R038G 7 tasks)
- `docs/system-upgrade/35-platform-capabilities-build-order.md` — **updated**: added 6 R038B-G gate rows to Gate Summary table
- `docs/system-upgrade/96-rounds-index.md` — **updated**: R038 next-round pointer + Round 038 Follow-up entry added
- `docs/system-upgrade/98-change-log.md` — this entry

### New Findings
- Original R038 would have been a big-bang migration (schema + models + APIs + UI all at once)
- `module_key` must be primary identity for all references — not `module_id`
- `apps/*/module.manifest.json` is the correct source of truth for all static module metadata
- `ModuleCompatLayer` read-through is required during transition to avoid breaking old callers
- Disable operation must warn on dependents, not auto-cascade

### Decision Changes
- ADR-031 clarified: manifest-first rule + `module_key` primary identity added
- R038 split into 7 phases — first implementation round is R038B (additive schema only)

### Backlog Changes
- R038 (4 old tasks) → R038A-G (43 tasks across 7 phases)
- Gate condition added: OQ-01–OQ-07 must be answered before R038B starts

---

## 2026-04-25 — Round 038: Module Manager Multi-Tenant Redesign

### Files Changed (platform-ui)
- `docs/system-upgrade/45-module-manager-redesign.md` — **created** (11 sections: problem diagnosis, design goals, 9 new model definitions — Module/OrgModule/OrgModuleSettings/ModuleDependency/ModuleLicense/ModulePermission/ModuleLog/ScriptExecution/ModuleChangelog, schema diagram, API redesign, permissions, migration strategy, open questions, acceptance criteria, ADR-031, R038-A/B/C/D backlog)
- `docs/system-upgrade/14-decision-log.md` — **updated** (ADR-031 added: Module Manager Multi-Tenant Model Split)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (R038-A/B/C/D tasks added: 19 total items)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 034 Follow-up + Round 038 entries added)
- `docs/system-upgrade/98-change-log.md` — this entry

### New Findings
- `Module.is_installed` + `Module.is_enabled` are system-wide — no per-org module state is structurally possible
- `ModulePurchase.organization` is `String(255)` with no FK — license ownership not queryable by org
- `Module.dependencies` is a JSON Text blob — no referential integrity, no version constraints
- `ModuleSettings` has no org scoping — per-org config is not possible without schema change
- Auth pattern is Flask-Login throughout — violates ADR-028 BE-01/BE-03

### Decision Changes
- ADR-031 added: Module Manager Multi-Tenant Model Split

### Backlog Changes
- R038-A: 10 schema migration tasks
- R038-B: 2 model rewrite tasks
- R038-C: 2 JWT route tasks
- R038-D: 6 platform-ui page tasks

---

## 2026-04-25 — Round 034 Follow-up: AI Service-to-Provider Routing Matrix

### Files Changed (platform-ui)
- `docs/system-upgrade/44-ai-providers-hub.md` — **updated** v1.0 → v2.0: added §16 (core routing rule), §17 (gap analysis — existing models insufficient for feature-level routing), §18 (AIServiceDefinition + AIServiceProviderRoute model designs), §19 (9-step routing resolution order), §20 (Gateway integration changes — GatewayRequest API cleanup, GatewayResponse route_debug, AIUsageLog 5 new columns), §21 (Section 11–13 UI design: Service Routing Matrix list/detail/edit), §22 (service routing API: 10 new endpoints), §23 (service routing permissions: 6 new), §24 (seed data: 27 known services), §25 (migration status linkage), §26 (open questions OQ-08–12), §27 (acceptance criteria for service routing), §28 (ADR-030 text); patched §01/§04/§06/§07/§10/§11/§12
- `docs/system-upgrade/14-decision-log.md` — **updated** (ADR-030 added: AI Service-to-Provider Routing Matrix)
- `docs/system-upgrade/40-ai-provider-gateway-billing.md` — **updated** (§20 addendum: gateway changes from ADR-030)
- `docs/system-upgrade/41-direct-llm-call-audit-and-migration.md` — **updated** (§22 added: legacy file → service_id mapping table for 23 bypass files)
- `docs/system-upgrade/35-platform-capabilities-build-order.md` — **updated** (R035 backend entry expanded; R037 UI entry expanded to include service routing sections)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (R035 expanded: 11 tasks; R037 expanded: +4 service routing UI tasks)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (R034 next-round pointer expanded)
- `docs/system-upgrade/98-change-log.md` — this entry

### New Findings
- **Existing models are insufficient for feature-level routing.** `AIModuleOverride` keys on `(org_id, module_name, capability)` — two features in the same module+capability share one provider. Example: `helpdesk.screen_analysis` (vision, Anthropic) and `helpdesk.vision_description` (vision, Gemini) cannot have different providers today.
- **`GatewayRequest` currently accepts `provider_id`/`model` overrides** — allows service code to hardcode routing, defeating the purpose of the provider layer. These must be removed.
- **No service registry exists.** `feature_id` in `AIUsageLog` is free-form String(60) — unindexed, unenforced, invisible to any management UI.
- **`AIModuleOverride` is NOT replaced** — it remains as the coarser-grained step 3 fallback in the 9-step hierarchy. New `AIServiceProviderRoute` adds step 2 (feature-level) above it.
- **27 services mapped** from doc 41 bypass file audit to canonical `service_id` values in §24 seed data.

### Backlog Changes
- R035 tasks expanded from 5 → 11 (add service routing models, registry, gateway cleanup)
- R037 tasks expanded (+4 Service Routing Matrix UI pages)

### Decisions
- ADR-030: AI Service-to-Provider Routing Matrix

---

## 2026-04-25 — Round 034 (Documentation): AI Providers Hub Architecture & UI Plan

### Files Created (platform-ui)
- `docs/system-upgrade/44-ai-providers-hub.md` — **created** (§01 capability assessment, §02 frontend gap, §03 product goals, §04–§13 hub sections + API table, §14 permissions model, §15 security rules, §16 shared capability rules, §17 phased plan, §18 open questions, §19 acceptance criteria, §20 ADR-029; 29 API endpoints; TypeScript interfaces + Zod schemas)

### Files Changed (platform-ui)
- `docs/system-upgrade/14-decision-log.md` — **updated** (ADR-029 added: AI Providers Hub — side-by-side JWT routes)
- `docs/system-upgrade/26-platform-capabilities-catalog.md` — **updated** (§30 AIProviders Hub added to summary table; full §30 section with purpose/files/security/permissions/spec)
- `docs/system-upgrade/35-platform-capabilities-build-order.md` — **updated** (enforcement pointer added to executive summary)
- `docs/system-upgrade/40-ai-provider-gateway-billing.md` — **updated** (§20 Hub reference added: circuit breaker, defaults, module overrides, quotas, migration status all map to Hub sections)
- `docs/system-upgrade/41-direct-llm-call-audit-and-migration.md` — **updated** (§21 Migration Status Hub page reference added)
- `docs/system-upgrade/43-shared-services-enforcement.md` — **updated** (R034 revision history entry added)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (R035/R036/R037 AI Providers Hub task tables added: 5 backend tasks, 11 UI core tasks, 4 advanced UI tasks)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 034 entry added; next round: R035 backend JWT routes)
- `docs/system-upgrade/98-change-log.md` — this entry

### New Findings
- Existing `apps/ai_providers/routes.py` is comprehensive (11 route groups, full CRUD + usage) but uses Flask-Login throughout — all routes must be re-implemented with `@jwt_required` for platform-ui, not proxied
- Provider health state is NOT in DB — only in Redis circuit breaker. Hub health page must poll live Redis state via new backend endpoint
- `api_key_ref` is Fernet-encrypted; frontend must never receive the value — serializer shows `has_api_key: bool` only (already enforced in existing `_provider_to_dict()`)
- Blueprint prefix is `/ai-providers/` (not `/api/ai-providers/`) — new JWT blueprint must use `/api/ai-providers/` prefix to avoid collision

### Backlog Changes
- R035: Backend JWT routes (5 tasks) added
- R036: Hub UI Core (11 tasks) added
- R037: Hub UI Advanced (4 tasks) added

---

## 2026-04-25 — Round 033 Follow-up: Shared Services Enforcement Clarity Pass

### Files Changed (platform-ui)
- `docs/system-upgrade/43-shared-services-enforcement.md` — **updated** (canonical paths table added §01; quick replacement table added §01; ActionButton transition rule added §FE-05; detection script registry table with owner/round/phase added §07; `DetailInfoRow` corrected to `InfoRow`; P0-02/03/04 marked done; acceptance criteria updated; revision history updated)
- `docs/system-upgrade/26-platform-capabilities-catalog.md` — **updated** (§07 PlatformPageShell status corrected: ⬜ Pending → ✅ Implemented R015; §21 PlatformErrorBoundary status corrected: ⬜ Pending → ✅ Implemented R015; canonical file paths updated to actual paths)
- `docs/system-upgrade/35-platform-capabilities-build-order.md` — **updated** (enforcement plan cross-reference added to §1 executive summary)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (P0-02, P0-03 CLAUDE.md tasks marked `[x] R032`; P0-01/05/06/07/08 rounds corrected R033→R034)
- `CLAUDE.md` — **updated** (mandatory read pointer added: docs 43 + 26 + 35 before any module code)

### Files Changed (platformengineer)
- `CLAUDE.md` — **updated** (mandatory read pointer added: docs 43 + 26 + 35 before any module code)

### New Findings
- `components/shared/detail-view/info-row.tsx` exports `InfoRow` (not `DetailInfoRow` as doc 43 previously stated)
- `components/shared/page-shell/` and `components/shared/error-boundary.tsx` / `error-state.tsx` are ✅ Implemented — doc 26 section headers were stale (summary table was already correct)
- `ActionButton` is not yet built; R033 follow-up documents the approved interim pattern (Button + isPending)

### Backlog Changes
- P0 task rounds corrected to R034 (R033 was consumed by enforcement planning)

---

## 2026-04-25 — Round 033 (Documentation): Shared Services and Platform Capabilities Enforcement Plan

### Files Created (platform-ui)
- `docs/system-upgrade/43-shared-services-enforcement.md` — **created** (full enforcement plan: §01–§15 + Appendix A)

### Files Changed (platform-ui)
- `docs/ARCHITECTURE.md` — **updated** (§21.4: gateway files marked implemented R031; §22 new section: Capability-First Rule with mandatory frontend/backend tables)
- `docs/system-upgrade/14-decision-log.md` — **updated** (ADR-028 added: Shared Services Enforcement; ADR-027 field count corrected 12→14)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (P0 enforcement tasks section + P1 enforcement tasks section added)
- `docs/system-upgrade/26-platform-capabilities-catalog.md` — **updated** (Mandatory Rule: enforcement plan cross-reference + PR/AI-agent checklist links added)
- `CLAUDE.md` — **updated** (§Shared Capabilities Enforcement section added with AI-agent guardrail checklist)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 033 entry added; Round 032 next-round pointer corrected)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### Files Changed (platformengineer)
- `CLAUDE.md` — **updated** (§Shared Services Enforcement section added with backend AI-agent guardrail checklist)

### New Findings
- All shared frontend capabilities and backend services now have explicit mandatory/forbidden contracts
- 15 frontend + 14 backend patterns classified as forbidden with FAIL/WARN severity
- ADR-028 establishes Capability-First as an enforced architectural rule (not just a guideline)

### Backlog Changes
- P0 enforcement tasks added: CI wiring, 3 detection scripts, P0 LLM migrations, ActionButton component
- P1 enforcement tasks added: 5 CI gate tasks for R034–R035

---

## 2026-04-25 — Round 032 (Documentation): Master Plan Consistency & Readiness Review

### Files Changed (platform-ui)
- `docs/system-upgrade/42-master-plan-consistency-and-readiness.md` — **created** (15-section master consistency document: 8 conflicts, status matrices, gates A–G, blocker register BLK-01–BLK-10, next 5 rounds)
- `docs/system-upgrade/40-ai-provider-gateway-billing.md` — **updated** (status line: "not started" → "Phase 1 implemented (uncommitted, R031)"; "12 new fields" → "14 new fields")
- `docs/system-upgrade/35-platform-capabilities-build-order.md` — **updated** (§11 header: round offset note added — capability rounds start at R033, not R023)
- `docs/system-upgrade/97-source-of-truth.md` — **updated** (ADR count: "ADR-014" → "ADR-027")
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 032 entry added)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### Files Changed (platformengineer)
- `CLAUDE.md` — **updated** (AI Provider Gateway usage example: `response.content` → `response.output_text`)

### New Findings
- **BLK-01**: Round 031 gateway files exist in working tree but were never committed — `git log` confirms last commit is `0041db7b security(r022)`
- **C5**: Doc 35 §11 used R023–R032 as platform-ui capability round labels, but those global round numbers were consumed by AI architecture + security work — offset note added, no renumbering applied (labels are relative slots now)
- **C6**: Doc 97 ADR-014 stale — actual highest is ADR-027 (24-core-platform-and-module-system.md)

### Backlog Changes
- None (doc-only round)

---

## 2026-04-25 — Round 031 (Implementation): AI Provider Gateway Phase 1

### Files Changed (platformengineer)
- `apps/ai_providers/schemas.py` — **created** (`GatewayRequest` dataclass with `validate()`, `GatewayResponse`, `PolicyDecision`, `VALID_CAPABILITIES` frozenset)
- `apps/ai_providers/gateway.py` — **created** (`AIProviderGateway.call()` full pipeline: validate → policy → resolve → call → log → billing → return; `_execute`, `_resolve_provider`, `_write_usage_log`, `_capability_to_registry`, `_provider_type_from_adapter` helpers)
- `apps/ai_providers/policy.py` — **created** (`AIProviderPolicy.check()` fail-open wrapper; Phase 1 capability validation; Phase 2 TODOs: quota, rate limit, org active, module feature flag)
- `apps/ai_providers/billing_adapter.py` — **created** (`AIProviderBillingAdapter.emit()` bridging to `service_billing.emit_billing_event()`; event type map; tolerates `ImportError` in dev/test)
- `apps/ai_providers/tasks.py` — **updated** (`write_usage_log_extended` task with 14 attribution fields; `_try_set()` migration guard helper)
- `apps/ai_providers/models.py` — **updated** (`AIUsageLog`: 14 new columns — `feature_id`, `conversation_id`, `action_id`, `ai_action_invocation_id`, `status`, `started_at`, `completed_at`, `error_code`, `correlation_id`, `cached_tokens`, `is_estimated`, `billable_cost`, `quota_bucket`, `is_billable`)
- `scripts/migrations/versions/20260424_extend_ai_usage_log.py` — **created** (alembic `op.add_column` for all 14 new columns + 2 indexes; full `downgrade()`)
- `scripts/check_no_direct_llm_imports.py` — **created** (CI lint scanner; scans `apps/`; allows only `apps/ai_providers/adapters/`; exit code 0/1)
- `apps/ai_providers/tests/test_gateway.py` — **created** (8 tests: request validation ×2, policy deny, happy-path chat, failed provider, billable billing emit, non-billable billing skip, lint scanner ×2)
- `apps/fitness_nutrition/ai_service.py` — **rewritten** (removed `google.generativeai` import + `os.getenv('GEMINI_AI_KEY')`; added `org_id`/`user_id` params; uses `AIProviderGateway.call()`)
- `apps/fitness_nutrition/workout_routes.py` — **updated** (passes `org_id=current_user.org_id, user_id=current_user.id` to `generate_workout_plan`)
- `apps/fitness_nutrition/nutrition_routes.py` — **updated** (passes `org_id=current_user.org_id, user_id=current_user.id` to `generate_meal_plan`)

### New Findings
- `_try_set()` pattern is the key to zero-downtime gateway rollout: gateway ships first, migration runs after, no crash window
- `fitness_nutrition` had a module-level `genai.configure()` call that would fail at Flask startup if `GEMINI_AI_KEY` was unset — now fully eliminated
- Billing adapter `ImportError` tolerance means gateway works in dev without billing module registered

### Decision Changes
- ADR-027 Phase 1 now implemented — no new ADR required

### Backlog Changes
- P0 item: `fitness_nutrition/ai_service.py` → **DONE** (remove from P0 migration list in `15-action-backlog.md`)

---

## 2026-04-24 — Round 030 (Audit): Direct LLM Call Audit + Gateway Migration Plan

### Files Changed
- `docs/system-upgrade/41-direct-llm-call-audit-and-migration.md` — **created** (20 sections: executive summary, bypass count, provider/module summary, bypass wrapper deep review, full inventory table P0/P1/P2/P3, billing gaps, attribution gaps, PII risk review, streaming/voice gaps, gateway readiness assessment, migration phases 1–4, P0/P1/P2/P3 lists, enforcement design with CI lint script + allowlist, required tests, deletion criteria, risks, acceptance criteria)
- `docs/system-upgrade/35-platform-capabilities-build-order.md` — **updated** (gateway migration track: P0 migration phase added, audit doc reference added)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (Gateway Phase 2 P0 migration tasks: 9 items added before existing Phase 3 table; Phase 3 file count corrected to match audit)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 030 entry)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### New Findings
- **3 module-level genai imports** found: `voice_support/call_manager.py`, `fitness_nutrition/ai_service.py`, `fitness_nutrition/ai_coach.py` — these fail silently at import time if the API key is missing
- **`personal_info/ai_chat/providers/`** receives raw API key as constructor arg with no key_resolver — Critical PII module with no billing trail
- **`apps/jira_integration/ai_service.py`** is the most complex bypass: 3000+ line file, multi-provider switch (OpenAI + Gemini), 5 direct chat completion calls, no attribution
- **`apps/ai_providers/`** is 70% complete for gateway role — registry, adapters, circuit breaker all production-ready; `gateway.py` wrapper and quota enforcement are the missing 30%
- **Double-fallback risk**: `openai_fallback.py` must be deleted in same PR as `gemini_client.py` migration — leaving both active causes cascading duplicate calls
- **No PII redaction policy** applied anywhere in the 40 bypass files — `personal_info` sends raw diary data, documents, and transcripts to OpenAI/Gemini

### Decision Changes
- No new ADR — audit round only

### Backlog Changes
- Gateway Phase 2 P0 migration section added to `15-action-backlog.md` (9 tasks)
- Gateway Phase 3 module count corrected from "37 files" to accurate P2/P3 split per audit
- Phase 2 migration gate clarified: P0 files must migrate before **any** new AI feature merges

---

## 2026-04-24 — Round 029 (Architecture): AI Provider Gateway + Billing Metering

### Files Changed
- `docs/system-upgrade/40-ai-provider-gateway-billing.md` — **created** (19 sections: executive summary, core rule, current assessment, target architecture, gateway responsibilities, provider registry, extended AIUsageLog model, billing flow, quota enforcement, streaming billing, voice metering, AI Action Platform integration, floating assistant cost policy, provider secrets policy, enforcement rules, testing strategy, migration plan, open questions, acceptance criteria)
- `docs/system-upgrade/36-ai-action-platform.md` — **updated** (§42 added: gateway integration note + GatewayRequest example)
- `docs/system-upgrade/38-floating-ai-assistant.md` — **updated** (§14 added: gateway attribution table + GatewayRequest fields)
- `docs/system-upgrade/39-ai-architecture-consistency-pass.md` — **updated** (§14 added: gateway as enforcement mechanism for §09 tool injection rules)
- `docs/system-upgrade/14-decision-log.md` — **updated** (ADR-027: AI Provider Gateway and Mandatory Billing Metering)
- `docs/system-upgrade/35-platform-capabilities-build-order.md` — **updated** (gateway migration track Phase 1/2/3 before R027)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (Phase 1/2/3 gateway tasks: 30 items)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 029 entry)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### New Findings
- 55+ files bypass the existing `apps/ai_providers/` layer entirely — this is the largest single billing risk in the platform
- Three dedicated bypass wrapper files exist that will need explicit deletion: `life_assistant/services/gemini_client.py`, `life_assistant/services/openai_fallback.py`, `personal_info/ai_chat/providers/gemini_provider.py` + `openai_provider.py`
- `AIUsageLog` is partitioned monthly and already has audio token fields — the 12 new fields are additions, not redesign
- `apps/billing/service_billing.py` `emit_billing_event()` already exists and is reusable — the billing adapter is a thin bridge, not a new system
- No quota pre-check exists anywhere in the current codebase — this is a gap that allows unlimited spend

### Decision Changes
- ADR-027: AI Provider Gateway and Mandatory Billing Metering (new)

### Backlog Changes
- 30 gateway migration tasks added across 3 phases
- Gateway Phase 1 marked as pre-R027 blocker (same priority as consistency-pass B1–B10)

---

## 2026-04-24 — Round 028 (Architecture): AI Architecture Consistency Pass

### Files Changed
- `docs/system-upgrade/39-ai-architecture-consistency-pass.md` — **created** (13 sections: executive summary, ambiguities found/fixed, canonical terms, canonical AIActionDescriptor v1, canonical voice policy, delegated human vs service account, delegation token design placeholder, tool injection safety, prompt guidance vs enforcement, rollback/partial failure policy, implementation blockers B1–B10, acceptance criteria)
- `docs/system-upgrade/36-ai-action-platform.md` — **updated** (deprecated markers on §05/§06/§09/§11/§23/§35; `voiceInvocable`→`voice_eligible` in all locations; §35 header marks intermediate draft; global header consistency note)
- `docs/system-upgrade/14-decision-log.md` — **updated** (ADR-026: AI Architecture Consistency Pass)
- `docs/system-upgrade/35-platform-capabilities-build-order.md` — **updated** (consistency-pass gate table added before R027 implementation track)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (B1–B10 pre-R027 blocker tasks: 12 items)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 028 entry)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### New Findings
- `risk_tier` ("READ"|"WRITE_LOW"|"WRITE_HIGH"|"DESTRUCTIVE") was live code in doc 36 §05/§06/§11 while `capability_level` (10-level) was the intended design — these were genuinely contradictory, not just cosmetic
- The permission check function `check_delegated_permission()` in §06 would be broken at runtime because it checks `action.risk_tier == "DESTRUCTIVE"` — a field that no longer exists in the canonical descriptor
- Three different names for the same voice-eligibility boolean across 4 sections — `voiceInvocable`, `voice_invocable`, `voice_eligible`
- Old voice rule "only READ + WRITE_LOW ≤ low danger" was more restrictive than the §34 formula; the §34 formula allows CREATE/UPDATE/APPROVE/EXECUTE at ≤medium danger — the formula is correct
- No delegation token design means write-tier AI actions cannot safely ship: there is no cryptographic binding between "human said yes" and "action was executed"
- Prompt-is-guidance-only warning was in §23 motivation text but not in a visible callout that engineers would read before implementing context injection

### Decision Changes
- ADR-026: AI Architecture Consistency Pass (new)

### Backlog Changes
- B1–B10 pre-R027 blocker tasks added to `15-action-backlog.md`
- Consistency gate table added before R027 track in `35-platform-capabilities-build-order.md`

---

## 2026-04-24 — Round 027 (Architecture): Global Floating AI Assistant

### Files Changed
- `docs/system-upgrade/38-floating-ai-assistant.md` — **created** (13 sections: lazy loading, persistent conversation, context diffing, session state model, LLM cost-control rules, UX state machine, UX component structure, PageAIContext schema, security/privacy, AI Action Platform integration, implementation phases R032–R035, open questions)
- `docs/system-upgrade/36-ai-action-platform.md` — **updated** (§41 added: frontend surface reference to doc 38, integration points table)
- `docs/system-upgrade/14-decision-log.md` — **updated** (ADR-025: Global Floating AI Assistant and Page Context Registry)
- `docs/system-upgrade/26-platform-capabilities-catalog.md` — **updated** (Global Floating AI Assistant capability entry)
- `docs/system-upgrade/35-platform-capabilities-build-order.md` — **updated** (R032–R035 Floating AI Assistant track + 4 new gate rows in summary table)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (R032–R035 tasks: 39 items across infra, LLM wiring, action proposals, voice mode)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 027 entry)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### New Findings
- Lazy loading is the key constraint: LLM must never fire on page load, route change, or component mount — only on explicit user interaction
- `lastLLMContextHash` comparison is the mechanism for skipping unchanged context; without it, every message would re-send the full capability context
- In-memory Zustand (never localStorage) prevents session state from leaking across user switches on shared devices
- `PageContextDiff.relevantToObjective` check prevents irrelevant page changes from polluting the LLM context mid-conversation
- Session reset on org switch is a security requirement, not a UX choice — same device may have multiple org admins

### Decision Changes
- ADR-025: Global Floating AI Assistant and Page Context Registry (new)

### Backlog Changes
- Added R032–R035 floating assistant tasks (39 items) to `15-action-backlog.md`
- Added R032–R035 build track to `35-platform-capabilities-build-order.md`

---

## 2026-04-24 — Round 026 (Architecture): AI Action Platform Hardening

### Files Changed
- `docs/system-upgrade/36-ai-action-platform.md` — **updated** (header note "AI is not read-only"; §33–§40 added: capability levels, full registry schema, delegated human vs service account, 22-point viability checks, implementation readiness checklist, voice write/delete constraints, delete policy)
- `docs/system-upgrade/14-decision-log.md` — **updated** (ADR-023 updated with capability level + delete policy clarifications; ADR-024: AI Action Capability Levels + Write/Delete Policy added)
- `docs/system-upgrade/26-platform-capabilities-catalog.md` — **updated** (Round 026 hardening section)
- `docs/system-upgrade/35-platform-capabilities-build-order.md` — **updated** (updated header timestamp)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (R027 tasks expanded to 32 items: 10 infra + 22 tests)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 026 entry)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### New Findings
- The design was ambiguous about whether the AI could execute writes — explicit clarification needed for implementers
- Service account delegation was underspecified: `is_ai_agent=True` alone authorizing writes would be a security flaw
- 22 viability checks derived from security threat model: org-switch attack, stale permission, bulk-destructive, audit-skip, arbitrary executor
- Hard delete requires a retention policy that doesn't exist yet — correct to block it at registry level (not just runtime) until the policy is written
- Voice confirmation ceiling (danger_level ≥ high) extends to ALL high-risk action types, not just user deactivation

### Decision Changes
- ADR-023: Updated with capability level clarification, service account rule, delete policy reference
- ADR-024: AI Action Capability Levels + Write/Delete Policy (new)

### Backlog Changes
- R027 expanded: 32 tasks (was 10) — added all 22 positive + negative tests from §38 readiness checklist, idempotency, hard delete gate, §35 JSON schema files

---

## 2026-04-24 — Round 025 (Architecture): AI User Capability Context

### Files Changed
- `docs/system-upgrade/36-ai-action-platform.md` — **updated** (§23–§32 added: AIUserCapabilityContext, prompt builder, context endpoint, action filtering, runtime re-check, prompt invalidation, role-specific policies, voice constraints, personalization, security rules S11–S17)
- `docs/system-upgrade/14-decision-log.md` — **updated** (ADR-023: Personalized AI Capability Context)
- `docs/system-upgrade/10-target-architecture.md` — **updated** (AI Capability Context section)
- `docs/system-upgrade/24-core-platform-and-module-system.md` — **updated** (AI Capability Context reference)
- `docs/system-upgrade/26-platform-capabilities-catalog.md` — **updated** (AI Capability Context section)
- `docs/system-upgrade/35-platform-capabilities-build-order.md` — **updated** (capability context deliverables per round)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (16 context-layer tasks: context endpoint, prompt builder, action filtering, invalidation, security tests)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 025 entry)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### New Findings
- Context must be guidance-only — a forged context injected via network interception cannot authorize actions because the backend re-check (`runtime_permission_check`) is independent
- `context_version` Redis pattern is the correct invalidation mechanism — atomic INCR, checked at execution time (HTTP 409 if stale)
- Denied categories must be human-readable strings (not action IDs) — exposing unauthorized action IDs informs attackers of the platform's action surface
- Voice sessions need a hard ceiling of 8 actions and a `VOICE_PROMPT_ADDENDUM` to prevent verbose/ambiguous voice execution
- AI service accounts (is_ai_agent=True) must never receive confirmation-required actions — no human to confirm
- Personalization (org discovery profile, onboarding mode) must explicitly NOT expand permissions — phrased as "influences suggestions only"

### Decision Changes
- ADR-023: Personalized AI Capability Context

### Backlog Changes
- 16 tasks added across R027–R031: context dataclass, builder, endpoint, prompt builder, action filtering, unavailable category summaries, role-specific policies, voice addendum, stale detection, invalidation hooks, and 5 security tests

---

## 2026-04-24 — Round 024 (Architecture): AI Action Platform

### Files Changed
- `docs/system-upgrade/36-ai-action-platform.md` — **created** (22-section architecture spec)
- `docs/system-upgrade/14-decision-log.md` — **updated** (ADR-021 Dangerous Action Standard formalized; ADR-022 AI Delegated Action Platform added)
- `docs/system-upgrade/10-target-architecture.md` — **updated** (AI Delegated Action Platform section)
- `docs/system-upgrade/24-core-platform-and-module-system.md` — **updated** (§15 module manifest `aiActions` extension)
- `docs/system-upgrade/26-platform-capabilities-catalog.md` — **updated** (AI Delegated Action Platform section; updated timestamp)
- `docs/system-upgrade/35-platform-capabilities-build-order.md` — **updated** (R027–R031 AI Action Platform parallel track; expanded gate summary table)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (16 AI Action Platform tasks across R027–R031)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 024 entry)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### New Findings
- Existing system has two separate action planes that needed bridging: `PlatformAction` (UI/UX) + `AIAction` HTTP model (backend org-defined actions)
- `ToolInvocation` + `ApprovalService` reusable for DESTRUCTIVE tier — no new approval queue required
- `AIActionConfirmationToken` (single-use, 120s TTL, SHA-256 parameter hash) is the correct anti-replay mechanism
- Voice ceiling confirmed: `danger_level >= "high"` cannot use verbal confirm — always requires dashboard approval queue
- AI agents inherit exactly the authenticated user's permissions — no new permission model needed
- `apps/ai_settings/models/action.py` already has org-defined HTTP-callable `AIAction` model — layer 2 of registry is already built
- Platform-static actions (layer 1) need a new `platform_actions.py` registry mirroring TypeScript module manifests

### Decision Changes
- ADR-021: Dangerous Action Standard (formalized — was referenced in code as future ADR, now recorded)
- ADR-022: AI Delegated Action Platform (new — 5-phase implementation, R027–R031)

### Backlog Changes
- 16 implementation tasks added (R027–R031): registry, executor, confirmation flow, voice flow, approval queue, DESTRUCTIVE tier, module manifests, org config UI, command palette integration, AI action test harness

---

## 2026-04-24 — Round 023 (Planning): Platform Capabilities Build Order

### Files Changed

**platform-ui:**
- `docs/system-upgrade/35-platform-capabilities-build-order.md` — **created** (dependency graph, next 10 rounds, anti-overengineering rules, acceptance criteria per round)
- `docs/system-upgrade/26-platform-capabilities-catalog.md` — **updated** summary table with build-order round column
- `docs/system-upgrade/12-migration-roadmap.md` — **updated** Phase 0 marked complete (R005–R022)
- `docs/system-upgrade/15-action-backlog.md` — **updated** capability tasks reorganized by round (R023–R032)
- `docs/system-upgrade/96-rounds-index.md` — **updated** R022 next-round pointer + R023 planning entry
- `docs/system-upgrade/98-change-log.md` — **updated**

### New Findings
- Helpdesk gate requires 6 capability items — 3 can be done in R023 (< 3 hours total)
- Production gate adds 4 more items — all achievable by R026
- 10 capabilities safely deferred to Phase 3+ without blocking any critical module
- `DetailView` extraction is the most visible pending debt — 3rd duplicate will be created if not extracted before Helpdesk

### Decision Changes
- None — planning only; no code changed

### Backlog Changes
- All capability backlog tasks reorganized into R023–R032 rounds with confirmed consumers

---

## 2026-04-24 — Round 022: Security Blockers Closure

### Files Changed

**platformengineer:**
- `apps/authentication/jwt_auth.py` — **added** `record_activity()` helper; **removed** `?token=` query-param fallback from `jwt_required` (L3 fix)
- `apps/authentication/jwt_routes.py` — **added** `auth.login`, `auth.login_failed`, `auth.logout` audit writes using `record_activity`
- `apps/authentication/user_api_routes.py` — **added** `record_activity` import; PII-001: non-admins now see only own record in `GET /api/users`; **added** `user.create`, `user.update`, `user.approve` audit writes
- `apps/admin/org_api_routes.py` — **added** `record_activity` import; **added** `org.create`, `org.update` audit writes
- `apps/authentication/role_api_routes.py` — **added** `record_activity` import; **added** `role.create`, `role.update`, `role.permissions_replace` audit writes

**platform-ui:**
- `lib/platform/auth/types.ts` — **added** `is_system_admin?: boolean` to `FlaskUserPayload`; `is_system_admin: boolean` to `NormalizedAuthUser`
- `lib/auth/options.ts` — **added** `is_system_admin: user.is_system_admin ?? false` to `normalizeFlaskUser()`
- `lib/platform/permissions/rbac.ts` — **fixed** `isSystemAdmin()` to return `user.is_system_admin` instead of `user.is_admin`
- `docs/system-upgrade/31-production-security-headers.md` — **created** (CSP planning doc)
- `docs/system-upgrade/30-security-hardening-audit.md` — **updated** with R022 status (all blockers resolved)
- `docs/system-upgrade/06-security-assessment.md` — **updated** with R022 column
- `docs/system-upgrade/96-rounds-index.md` — **updated** (R022 entry)
- `docs/system-upgrade/98-change-log.md` — **updated**

### New Findings
- All R021 deferred items resolved in this round

### Decision Changes
- `isSystemAdmin()` now correctly distinguishes system-admin from org-admin (was returning `is_admin`)

### Backlog Changes
- AUD-001, PII-001, M2, L3 — all closed
- Remaining open: CSP enforcement (plan created), L4 (15-min JWT window — acceptable)

---

## 2026-04-24 — Round 021: Security Hardening Audit

### Files Changed

**platformengineer:**
- `apps/authentication/user_api_routes.py` — **added** `PATCH /api/users/<id>/active` with admin guard, self-deactivation block, idempotency, `UserActivity` audit write
- `apps/admin/org_api_routes.py` — **added** `PATCH /api/organizations/<id>/active` with system-admin guard, idempotency, `UserActivity` audit write

**platform-ui:**
- `app/api/proxy/[...path]/route.ts` — **hardened** proxy PATH_MAP: strict allowlist, unknown prefix → 404 (removed `?? /api/${prefix}` fallback)
- `lib/platform/request/context.ts` — **hardened** header names: `X-User-Id` → `X-Client-User-Id`, `X-Org-Id` → `X-Client-Org-Id`
- `lib/auth/options.ts` — **added** `events.signOut` handler calling Flask `/api/auth/logout` to invalidate refresh token
- `docs/system-upgrade/30-security-hardening-audit.md` — **created** (full audit findings, RBAC matrix, tenant isolation review, audit readiness matrix)
- `docs/system-upgrade/06-security-assessment.md` — **updated** with R021 status table
- `docs/system-upgrade/96-rounds-index.md` — **updated** (R020 + R021 entries)
- `docs/system-upgrade/98-change-log.md` — **updated**

### New Findings
- **HIGH** Proxy PATH_MAP fallback: authenticated users could reach any Flask endpoint → FIXED
- **HIGH** Missing `/users/<id>/active` and `/organizations/<id>/active` Flask endpoints → FIXED
- **MEDIUM** `X-User-Id`/`X-Org-Id` header names look authoritative → FIXED (renamed)
- **LOW** Logout didn't invalidate Flask refresh token → FIXED
- **DEFERRED** AUD-001: audit trail gaps for create/update events — pre-production blocker
- **DEFERRED** PII-001: email visible in user list to all org members — pre-production blocker
- **DEFERRED** M2: `is_system_admin` not in NormalizedAuthUser — before enterprise multi-tenant
- **DEFERRED** L3: query-param `?token=` in `jwt_required` — before production

### Decision Changes
- Confirmed: backend must never trust `X-Client-*` advisory headers for auth decisions

### Backlog Changes
- AUD-001 added to pre-production backlog (audit trail for create/update)
- PII-001 added to pre-production backlog (email visibility restriction)
- L3 (query-param token removal) added to pre-production backlog

---

## 2026-04-24 — Round 020: Dangerous Actions + ConfirmAction Standard

### Files Changed
- `lib/platform/actions/` — **created** (types.ts, danger-level.ts, definitions.ts, index.ts — ADR-021 cross-platform standard)
- `lib/hooks/use-dangerous-action.ts` — **created** (ties PlatformAction to mutation with dialog state)
- `components/shared/confirm-action-dialog.tsx` — **hardened** (full DangerLevel support: badge, reason textarea, typed confirmation)
- `lib/api/users.ts` — **added** `setUserActive(id, isActive, reason)`
- `lib/api/organizations.ts` — **added** `setOrgActive(id, isActive, reason)`
- `app/(dashboard)/users/[id]/page.tsx` — **added** deactivate/reactivate buttons + ConfirmActionDialog
- `app/(dashboard)/organizations/[id]/page.tsx` — **added** deactivate/reactivate buttons + ConfirmActionDialog
- `lib/auth/options.ts` — **removed** `accessToken` from client session (XSS fix)
- `app/(auth)/login/page.tsx` — **fixed** open redirect on callbackUrl
- `app/api/proxy/[...path]/route.ts` — **fixed** catch block topology leak

### New Findings
- `accessToken` in session.user = XSS/extension exfiltration risk → removed
- `callbackUrl` query param not validated → open redirect → fixed
- Proxy catch block leaked error messages with internal URLs → stripped
- `useCountUp` in `.map()` = React hooks violation → extracted component
- Unstable `reset` function caused infinite render loop → wrapped in `useCallback`

### Decision Changes
- ADR-021: Dangerous Action Standard adopted (`DangerLevel` scale, `useDangerousAction`, `ConfirmActionDialog`)

### Backlog Changes
- Deactivate/reactivate user and org promoted from backlog to done

---

## 2026-04-24 — Round 019: Organizations Phase B + Admin Mutation Standard

### Files Changed
- `apps/admin/org_api_routes.py` — **hardened** (IntegrityError handling, slug regex, name length, no raw exc leak)
- `lib/modules/organizations/schemas.ts` — **created** (createOrgSchema + editOrgSchema)
- `lib/api/organizations.ts` — **updated** (CreateOrgInput/EditOrgInput from schemas)
- `components/modules/organizations/organization-form.tsx` — **created** (OrgCreateSheet + OrgEditSheet)
- `app/(dashboard)/organizations/page.tsx` — **updated** (add create button + OrgCreateSheet)
- `app/(dashboard)/organizations/[id]/page.tsx` — **updated** (add edit button + OrgEditSheet)
- `docs/modules/02-organizations/IMPLEMENTATION.md` — **rewritten** (Phase B complete)
- `docs/modules/02-organizations/module.manifest.json` — **updated** (v1.1.0, Phase B features)

### New Findings
- Backend POST/PATCH were already implemented in R013 — only hardening needed
- Slug auto-generation (client-side only) is idiomatic for org creation UX
- Slug must be immutable after creation — no `slug` field in PATCH, edit form shows it read-only
- `OrgCreateSheet` + `OrgEditSheet` pattern validates the R017 mutation standard on a second multi-tenant module
- `is_active` toggle in edit form is safe UX; dedicated deactivation action with `ConfirmActionDialog` is backlog

### Decision Changes
- No new ADRs — pattern confirms ADR-019 (usePlatformMutation) is reusable across multi-tenant modules

### Backlog Changes
- Organizations: create/edit marked ✅; deactivate-with-confirm + org-members-list remain backlog

---

## 2026-04-24 — Round 018: Roles & Permissions Core Module

### Files Changed
- `apps/authentication/role_api_routes.py` — **created** (platformengineer; 6 endpoints)
- `apps/__init__.py` — **updated** (role_api_bp registration)
- `lib/modules/roles/types.ts` — **created**
- `lib/modules/roles/schemas.ts` — **created**
- `lib/api/roles.ts` — **created**
- `lib/api/query-keys.ts` — **updated** (roles keys)
- `components/modules/roles/role-permission-badge.tsx` — **created**
- `components/modules/roles/roles-table.tsx` — **created**
- `components/modules/roles/role-form.tsx` — **created** (RoleCreateSheet + RoleEditSheet + PermissionChecklist)
- `app/(dashboard)/roles/page.tsx` — **created**
- `app/(dashboard)/roles/[id]/page.tsx` — **created**
- `app/api/proxy/[...path]/route.ts` — **updated** (roles PATH_MAP)
- `docs/modules/03-roles-permissions/PLAN.md` — **updated** (actual implementation)
- `docs/modules/03-roles-permissions/IMPLEMENTATION.md` — **created**
- `docs/modules/03-roles-permissions/module.manifest.json` — **created**

### New Findings
- Roles are GLOBAL (no org_id) — shared across all organizations
- Flask routing order matters: static routes (`/permissions`) must precede param routes (`/<int:id>`)
- Two-mutation edit strategy: PATCH meta first, PATCH permissions only if set changed
- Permission dot-notation (`module.action`) enables client-side grouping via `groupPermissions()`
- All shared capabilities (PageShell, PlatformForm, usePlatformMutation, DataTable, DetailView) reused without modification

### Decision Changes
- Permission model standard: codenames use `module.action` dot-notation; `groupPermissions()` is the client-side splitter

### Backlog Changes
- Roles module backlog: delete-role, role-users-list-tab, permission-create-ui, bulk-role-assign, e2e-tests

---

## 2026-04-24 — Round 017: Users Phase B — Mutations + Form Standard

### Files Changed (platform-ui — commit 2592dde)
- `lib/hooks/use-platform-mutation.ts` — **created** (shared TanStack mutation hook, error normalization, cache invalidation)
- `lib/modules/users/schemas.ts` — **created** (createUserSchema, editUserSchema, Zod v4)
- `lib/modules/users/types.ts` — **updated** (RoleSummary, RolesListResponse, UserMutationResponse, role_id added)
- `lib/api/users.ts` — **updated** (createUser, updateUser, fetchRoles)
- `components/modules/users/user-form.tsx` — **created** (UserCreateSheet, UserEditSheet)
- `app/api/proxy/[...path]/route.ts` — **updated** (PATCH handler added)
- `app/(dashboard)/users/page.tsx` — **updated** ("הוסף משתמש" button + UserCreateSheet)
- `app/(dashboard)/users/[id]/page.tsx` — **updated** ("ערוך" button + UserEditSheet)

### Files Changed (platformengineer — commit a1780f1c)
- `apps/authentication/user_api_routes.py` — **updated**
  - `GET  /api/users/roles` — role dropdown (admin only)
  - `POST /api/users` — create user (admin; org_id from JWT)
  - `PATCH /api/users/<id>` — update user fields (admin or own name)
  - `role_id` added to `_serialize_user_summary` for edit form pre-population

### Mutation Standard Established
| Component | Role |
|-----------|------|
| `usePlatformMutation` | Wraps `useMutation`, normalizes errors, invalidates query cache |
| `PlatformForm` | `<form>` shell with aria-busy + isSubmitting |
| `FormError` | Displays serverError string below form header |
| `FormActions` | Submit + Cancel buttons with loading state |
| `lib/modules/<m>/schemas.ts` | Zod schema + inferred input types |
| `lib/api/<m>.ts` | Mutation API functions (`createX`, `updateX`) |

### Decision Changes
- ADR-019 established (see 14-decision-log.md): usePlatformMutation as the org-wide mutation standard

### Backlog Changes
- Users Phase B ✅ complete
- PlatformForm capability ✅ complete (§03 in catalog)
- PlatformAction 🔵 partial (§04 — usePlatformMutation done; ConfirmDialog pending)

---

## 2026-04-24 — Round 016: CP-0 Boundary Extraction

### Files Changed
- `lib/platform/index.ts` — **created** (root barrel, all platform exports)
- `lib/platform/auth/types.ts` + `index.ts` — **created** (NormalizedAuthUser, FlaskUserPayload — no next-auth)
- `lib/platform/permissions/rbac.ts` + `index.ts` — **created** (pure RBAC functions)
- `lib/platform/formatting/format.ts` + `index.ts` — **created** (pure Intl.* formatters)
- `lib/platform/export/csv.ts` + `index.ts` — **created** (rowsToCsv, escapeCsvCell — no Blob)
- `lib/platform/request/context.ts` + `index.ts` — **created** (buildAuditHeaders, generateRequestId)
- `lib/platform/data-grid/types.ts` + `index.ts` — **created** (SortDirection, TableFilter, PaginationParams, etc.)
- `lib/platform/modules/users/types.ts` — **created** (re-export of lib/modules/users/types)
- `lib/platform/modules/organizations/types.ts` — **created** (re-export)
- `lib/auth/types.ts` — **updated** (re-export platform types + next-auth augmentation only)
- `lib/auth/rbac.ts` — **updated** (re-export shim from lib/platform/permissions/rbac)
- `lib/utils/format.ts` — **updated** (re-export shim from lib/platform/formatting)
- `lib/utils/csv.ts` — **updated** (imports pure CSV from platform; keeps browser download layer)
- `lib/api/request-context.ts` — **updated** (re-export shim from lib/platform/request)
- `lib/api/client.ts` — **updated** (configurable base URL: NEXT_PUBLIC_API_BASE_URL ?? "/api/proxy")
- `docs/system-upgrade/14-decision-log.md` — **updated** (ADR-018: platform boundary)
- `docs/system-upgrade/28-cross-platform-structure-audit.md` — **updated** (CP-0 status, readiness 55→68/100)

### New Findings
- `lib/platform/` creates a clean, checkable boundary — any accidental DOM/next-auth import fails at typecheck time
- Re-export shim pattern is zero-risk: existing web imports continue to work unchanged
- `NEXT_PUBLIC_API_BASE_URL` env var enables future Electron or direct-connect mobile without code changes

### Decision Changes
- ADR-018: `lib/platform/*` = cross-platform only. `lib/` (non-platform) = web OK. All new cross-platform logic goes to platform/ first.

### Backlog Changes
- Marked done: CP-0 type extraction, lib/platform/ creation, rowsToCsv extraction, API base URL parameterization

---

## 2026-04-24 — Round 016 (prep): Cross-Platform Structure Audit

### Files Changed
- `docs/system-upgrade/28-cross-platform-structure-audit.md` — **created** (16 sections)
- `docs/system-upgrade/10-target-architecture.md` — **updated** (CP readiness block + blockers table)
- `docs/system-upgrade/12-migration-roadmap.md` — **updated** (Migration Principle #10: platform boundary)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (CP-0, CP-1, CP-2 task sections)

### New Findings
- `lib/auth/rbac.ts` is already cross-platform — zero changes needed
- `lib/utils/format.ts` uses only `Intl.*` — compatible with React Native 0.70+
- `lib/auth/types.ts` is the single biggest mobile blocker — next-auth augmentation mixed with user types
- `lib/api/client.ts` hardcodes `/api/proxy` — one-line fix unblocks Electron + native HTTP use
- `lib/utils/csv.ts` `rowsToCsv()` is portable; only `downloadCsv()` uses browser APIs — easy split
- Overall readiness 55/100: logic excellent, API transport problematic, shell intentionally web-only

### Decision Changes
- Migration Principle #10 added: new `lib/` files must be classified `lib/platform/` or `lib/web/`

### Backlog Changes
- Added CP-0 (type extraction), CP-1 (transport), CP-2 (component splitting) task sections

---

## 2026-04-24 — Round 015: Capability Hardening

### Files Changed
- `lib/ui/motion.ts` — **created** (shared PAGE_EASE constant)
- `components/shared/detail-view/` — **created** (InfoRow, BoolBadge, DetailSection, DetailHeaderCard, DetailBackButton, DetailLoadingSkeleton + index)
- `components/shared/stats/` — **created** (StatCard, StatsGrid + index)
- `components/shared/page-shell/` — **created** (PageShell + index)
- `components/shared/error-state.tsx` — **created**
- `components/shared/error-boundary.tsx` — **created**
- `components/shared/form/` — **created** (PlatformForm, FormActions, FormError + index)
- `components/shared/confirm-action-dialog.tsx` — **created**
- `app/(dashboard)/users/[id]/page.tsx` — **refactored** (removed local InfoRow/BoolBadge/ease/back button/loading/error)
- `app/(dashboard)/users/page.tsx` — **refactored** (replaced StatChip + LazyMotion header + inline error with PageShell + StatCard + ErrorState)
- `app/(dashboard)/organizations/[id]/page.tsx` — **refactored** (same as users detail page)
- `app/(dashboard)/organizations/page.tsx` — **refactored** (same as users list page)
- `docs/modules/02-organizations/IMPLEMENTATION.md` — **created**
- `docs/system-upgrade/14-decision-log.md` — **updated** (ADR-017 added)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (7 tasks marked done)
- `docs/system-upgrade/26-platform-capabilities-catalog.md` — **updated** (6 capability statuses updated)

### New Findings
- `InfoRow` + `BoolBadge` helpers were character-for-character identical in Users and Orgs detail pages — classic promotion case
- `PageShell` removes ~20 lines of boilerplate from every future module list page
- `DetailBackButton` subsumes `useRouter` — detail pages no longer need the router import for navigation
- `ConfirmActionDialog` uses `shadcn/ui Dialog` (not AlertDialog — not installed); this is the correct pattern

### Decision Changes
- ADR-017: Shared Capabilities Promotion Policy (2+ occurrences → promote to `components/shared/`)

### Backlog Changes
- Marked done: ErrorBoundary, ErrorState, PageShell, DetailView, StatCard, PlatformForm, ConfirmDialog

---

## 2026-04-24 — Round 014: Platform Capabilities Catalog

### Files Created (platform-ui)
- `docs/system-upgrade/26-platform-capabilities-catalog.md` — **created** (30 platform capabilities; 7 fields each: purpose, modules, libraries, first scope, security/multi-tenant, AI-maintainability, priority)

### Files Updated (platform-ui)
- `docs/system-upgrade/10-target-architecture.md` — **updated** (added capability-first AI principle; added Platform Capabilities Layer section with status table)
- `docs/system-upgrade/12-migration-roadmap.md` — **updated** (added migration principle #9: capability-first)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (new "Platform Capabilities Catalog" section: 25 tasks across now/next/later tiers)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 014 entry)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### Capability Status Snapshot (as of Round 014)
| Status | Capabilities |
|--------|-------------|
| ✅ Implemented | DataGrid (01), PermissionGate (05), TenantContext (19), API Client (22) |
| 🔵 Partial | Dashboard (02), ImportExport CSV (06), DetailView (08), ModuleRegistry (18) |
| ⬜ Pending Now | ErrorBoundary (21), PageShell (07), Form (03), Action (04), FeatureFlags (17), Notifications (12) |
| ⬜ Pending Next | Timeline (09), ApprovalFlow (13), Settings (16), Realtime (11+23), JobRunner (14), Wizard (15), Billing (26), Policy (27) |
| ⬜ Pending Later | AuditLog (10), FileManager (24), Integration (25), Privacy (20), Help (28), TestHarness (29), DevDocs (30) |

### New Rules Added
- Capability-First Rule: check `26-platform-capabilities-catalog.md` before building any module feature (added to doc 10 §AI Principles, doc 12 §Migration Principles)
- Module-local implementations used in 2+ modules must be promoted to the catalog

---

## 2026-04-24 — Round 013: Module 02 Organizations

### Files Created (platformengineer)
- `apps/admin/org_api_routes.py` — **created** (Flask JWT blueprint: list/stats/detail/create/update; tenant safety enforced)

### Files Updated (platformengineer)
- `apps/__init__.py` — **updated** (registered `org_api_bp` at `/api/organizations`)

### Files Created (platform-ui)
- `lib/modules/organizations/types.ts` — **created** (OrgSummary, OrgsListResponse, OrgDetailResponse, OrgStatsResponse, CreateOrgResponse, payload types)
- `lib/api/organizations.ts` — **created** (fetchOrgs, fetchOrgStats, fetchOrg, createOrg, updateOrg)
- `components/modules/organizations/org-status-badge.tsx` — **created** (active/inactive badge)
- `components/modules/organizations/orgs-table.tsx` — **created** (uses shared DataTable, defines org columns)
- `app/(dashboard)/organizations/page.tsx` — **created** (list page, system-admin gate via PermissionGate, stats chips)
- `app/(dashboard)/organizations/[id]/page.tsx` — **created** (detail page, own-org or system-admin, formatted fields)
- `docs/modules/02-organizations/module.manifest.json` — **created**

### Files Updated (platform-ui)
- `app/api/proxy/[...path]/route.ts` — **updated** (added `"organizations": "/api/organizations"`)
- `lib/api/query-keys.ts` — **updated** (added `orgs` key group)
- `docs/modules/02-organizations/PLAN.md` — **updated** (DoD: 9 items marked complete)

### Files Deleted (platform-ui)
- `components/shared/data-table-client.tsx` — **deleted** (unused legacy; confirmed no imports)

### New Findings
- `Organization` model in `apps/authentication/models.py` only has `id` column — full org data requires raw SQL (already done in existing admin routes)
- `PermissionGate systemAdminOnly` pattern validated end-to-end

### Capability Reuse Summary (ADR-016 validation)
- `DataTable<OrgSummary>` — used ✓
- `PermissionGate systemAdminOnly` — used ✓
- `formatDate` from lib/utils/format — used ✓
- `OrgStatusBadge` — created following UserStatusBadge pattern ✓

### TypeScript Typecheck
EXIT 0

---

## 2026-04-24 — Round 012: Capability Layer Foundation

### Files Created (platform-ui)
- `components/shared/data-table/types.ts` — **created** (DataTableProps, PaginationState interfaces)
- `components/shared/data-table/table-skeleton.tsx` — **created** (animated skeleton rows for loading state)
- `components/shared/data-table/pagination.tsx` — **created** (RTL-aware prev/next pagination with page indicator)
- `components/shared/data-table/data-table.tsx` — **created** (generic server-side DataTable wrapping TanStack Table)
- `components/shared/data-table/index.ts` — **created** (barrel exports)
- `components/shared/permission-gate.tsx` — **created** (role/permission/adminOnly gate with hide/disable modes)
- `lib/hooks/use-permission.ts` — **created** (session-aware isRole/can/isAdmin helpers)
- `lib/utils/format.ts` — **created** (formatDate, formatDateTime, formatRelativeTime, formatNumber, formatCurrency, formatBytes — he-IL locale, Asia/Jerusalem TZ)
- `lib/utils/csv.ts` — **created** (rowsToCsv, downloadCsv, exportToCsv with BOM for Hebrew Excel compat)
- `lib/api/request-context.ts` — **created** (buildAuditHeaders, generateRequestId)

### Files Updated (platform-ui)
- `components/shared/data-table.tsx` → **renamed** to `components/shared/data-table-client.tsx` (client-side legacy table; avoid directory name collision)
- `components/modules/users/users-table.tsx` — **refactored** (delegates table shell to shared DataTable; uses formatDate from lib/utils/format; reduced from 241 to ~120 lines)
- `app/api/proxy/[...path]/route.ts` — **updated** (attaches X-Request-ID, X-User-Id, X-Org-Id, X-Client-Source audit headers)
- `docs/modules/02-organizations/PLAN.md` — **updated** (full endpoint audit: all routes use session cookie auth, not JWT; ADR-015 pattern required; capability layer alignment section added)
- `docs/system-upgrade/25-open-source-capability-layer.md` — **updated** (implementation status updated, DataTable reference path corrected)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (10 tasks marked done, 2 new tasks added)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 012 entry)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### New Findings
- `components/shared/data-table.tsx` existed (client-side only, no TanStack) — renamed to avoid name conflict
- `components/shared/empty-state.tsx` existed and was already good — no changes needed
- Organizations endpoints all use `_require_admin()` (Flask-Login session) — ADR-015 pattern required again
- JWT token in proxy is `token.user.id` / `token.user.org_id` (not flat `token.userId`)

### Decision Changes
- None new — implements ADR-016

### Backlog Changes
- 10 capability layer tasks marked `[x] 2026-04-24`
- 2 new tasks added: request-context helper, UsersTable refactor

---

## 2026-04-24 — Round 011: Open-Source Capability Layer

### Files Changed (platform-ui)
- `docs/system-upgrade/25-open-source-capability-layer.md` — **created** (18 sections: DataGrid, charts, forms, URL state, import/export, permissions, multi-tenant safety, audit mutations, dashboard layout, dates, toasts, skeletons, empty states, RTL conventions, file gates, install order, what NOT to add, ADR reference)
- `docs/system-upgrade/14-decision-log.md` — **updated** (ADR-016: Open-Source Capability Layer)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (new section: 14 capability layer tasks — install nuqs, shared components, PermissionGate, date utils, CSV export, proxy audit headers)
- `docs/system-upgrade/11-recommended-tech-stack.md` — **updated** (capability layer standards block with approved additions list)
- `docs/system-upgrade/12-migration-roadmap.md` — **updated** (Phase 1: capability layer foundation added as first deliverable)
- `docs/modules/ROADMAP.md` — **updated** (module start checklist: step 3 now requires reading capability layer doc; module file structure expanded)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 011 entry, upcoming rounds updated)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### New Findings
- BOM (`\uFEFF`) required for Hebrew CSV export (Excel on Windows misreads UTF-8 without it)
- `nuqs` not yet installed — blocks all list page filter/pagination URL state
- `PermissionGate` + `usePermission()` missing — must be created before any module with destructive actions
- `react-grid-layout` correctly deferred to Phase 3 (no dashboard builder until Monitoring module)
- `org_id` safety rule formalized: always from `session.user.org_id`, never URL params

### Decision Changes
- ADR-016 added: Open-Source Capability Layer — standardizes library choices for all 19 modules

### Backlog Changes
- Added "Open-Source Capability Layer" section to `15-action-backlog.md` (14 new P1/P2 tasks)

---

## 2026-04-24 — Round 010: Module 01 Users (First Module)

### Files Changed (platformengineer)
- `apps/authentication/user_api_routes.py` — **created** (JWT user management API: list, stats, pending, detail, approve)
- `apps/__init__.py` — **updated** (register user_api_bp at /api/users)

### Files Changed (platform-ui)
- `lib/modules/users/types.ts` — **created** (UserSummary, UserDetail, response envelopes, UsersListParams)
- `lib/api/users.ts` — **created** (fetchUsers, fetchUser, fetchUserStats, fetchPendingUsers, approveUser)
- `lib/api/query-keys.ts` — **updated** (users.all/stats/list/detail/pending keys)
- `lib/auth/options.ts` — **updated** (remove is_admin role-name workaround; Round 009 fix applied)
- `app/api/proxy/[...path]/route.ts` — **updated** (users PATH_MAP: /admin/users → /api/users)
- `app/(dashboard)/users/page.tsx` — **created** (list page: stats, pending banner, search, paginated table, error/empty states)
- `app/(dashboard)/users/[id]/page.tsx` — **created** (detail page: profile, security, permissions)
- `components/modules/users/users-table.tsx` — **created** (TanStack Table with pagination, search, skeleton)
- `components/modules/users/user-status-badge.tsx` — **created** (active/inactive/pending badge)
- `components/modules/users/user-role-badge.tsx` — **created** (colored role badge)
- `docs/modules/01-users/IMPLEMENTATION.md` — **created** (data flow, file map, limitations, agent guide, checklist)
- `docs/modules/01-users/module.manifest.json` — **created** (routes, permissions, endpoints, data ownership)
- `docs/modules/01-users/PLAN.md` — **updated** (actual endpoints, DoD status)
- `docs/modules/ROADMAP.md` — **updated** (Users: ⬜ → 🔵)
- `docs/auth/README.md` — **updated** (resolved Round 009 gaps)
- `docs/system-upgrade/14-decision-log.md` — **updated** (ADR-015 added)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 010 entry)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### New Findings
- `/admin/users` routes are HTML-only (Jinja2) — cannot be used from platform-ui
- `/api/v1/users` uses API Token auth, incompatible with JWT Bearer
- Module-first JSON API pattern needed for every module migration (ADR-015)
- AI agent users are now filtered from all list queries by default

### Decision Changes
- ADR-015 added: module-first JSON API pattern
- ADR-015 superceeds the PLAN.md assumption that `/admin/users` returns JSON

### Backlog Changes
- Users Phase 2: create form, edit form, pending approval page — added as Phase 2 items

---

## 2026-04-24 — Round 009: Backend Auth Contract Hardening

### Files Changed
- `apps/authentication/jwt_routes.py` — **updated** (`_user_to_dict` → `serialize_auth_user` with `permissions[]`, `is_admin`, `is_system_admin`, `is_manager`, `is_ai_agent`; `GET /api/auth/me` fixed with `@jwt_required` + correct response envelope; `POST /api/auth/logout` added)
- `apps/authentication/tests/test_jwt_routes_v2.py` — **created** (10 tests: serialize_auth_user × 4, /me × 3, /logout × 3)
- `apps/authentication/INDEX.md` — **updated** (JWT routes quick lookup expanded; platform-ui integration section added with field table + security rules)
- `docs/system-upgrade/13-open-questions.md` — **updated** (Q14 fully resolved — permissions now returned)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (Phase B all 4 tasks marked done; Phase B.1 follow-ups added: remove is_admin workaround from options.ts, update auth README)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 009 entry added; upcoming rounds updated)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### New Findings
- `apps/__init__.py` CORS `after_request` already matches `http://localhost*` — `localhost:3000` covered, no change needed
- Existing `/me` had two bugs: wrong JWT claim key (`sub` vs `user_id`) and non-standard response format
- `is_admin` is a real DB boolean column — `normalizeFlaskUser()` role-name derivation in `lib/auth/options.ts` can now be removed
- `mobile_refresh_token` stores SHA256 hash — logout can genuinely revoke refresh tokens (not just expiry-based)

### Decision Changes
- None new — Phase B tasks close out ADR-011 implementation

### Backlog Changes
- Phase B: 4 tasks → `[x] 2026-04-24`
- Phase B.1 added: remove is_admin workaround (P1), update auth README (P2)

---

## 2026-04-24 — Round 008: Module Data Export/Import Design

### Files Changed
- `docs/system-upgrade/24-core-platform-and-module-system.md` — **created** (14 sections: data ownership, dataContract spec, package format, export scopes, import modes, ID remapping, tenant mapping, security rules, 7 backend models, UI flows, AI-agent safety, risks, acceptance criteria)
- `docs/system-upgrade/10-target-architecture.md` — **updated** (Module Data Ownership section added before AI-Agent Design Principles)
- `docs/system-upgrade/12-migration-roadmap.md` — **updated** (Phase 3.5 Module Export/Import added)
- `docs/system-upgrade/14-decision-log.md` — **updated** (ADR-014 added)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (Module Data Export/Import section: 35 tasks across foundation, models, export pipeline, import pipeline, security, platform-ui)
- `docs/system-upgrade/13-open-questions.md` — **updated** (Q21–Q25 added: large tables, blob attachments, Celery queues, S3 setup, existing manifests)
- `docs/system-upgrade/97-source-of-truth.md` — **updated** (module system row added; ADR highest updated to ADR-014)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 008 entry added; upcoming rounds updated)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### New Findings
- Raw SQL dump is the anti-pattern to avoid — governed JSONL package is the correct model
- Three table categories (owned/referenced/core) must be declared per module before export is enabled
- Secrets must be excluded at the platform level (registry), not solely at the module level
- `replace-module-data` and `restore-snapshot` import modes are system-admin only
- Download link expiry policy: 24h tenant data, 7d config-only, 4h system-wide
- Q21–Q25 added: need to audit large tables (>100k rows), S3 setup, and existing manifests before implementation

### Decision Changes
- ADR-014 added: Tenant-Aware Module Data Export/Import

### Backlog Changes
- 35 new tasks added in §Module Data Export/Import section of `15-action-backlog.md`
- Covers: dataContract schema, secret registry, 7 backend models, JSONL export writer, ID remapping, dry-run validator, import transaction wrapper, anonymization, checksums, 5 platform-ui screens, 3 security tests

---

## 2026-04-24 — Round 007: Auth Phase A Implementation

### Files Created
- `lib/auth/types.ts` — Flask response types, NormalizedAuthUser, next-auth Session/JWT augmentation
- `lib/auth/options.ts` — authOptions: Credentials provider, jwt callback (with refresh), session callback
- `lib/auth/rbac.ts` — hasRole, hasAnyRole, hasPermission, isSystemAdmin, getOrgId
- `app/api/auth/[...nextauth]/route.ts` — NextAuth handler (thin, no logic)
- `components/providers/session-provider.tsx` — client SessionProvider wrapper
- `middleware.ts` — route guard: 401 for proxy, redirect for pages, RefreshTokenError handling
- `docs/auth/README.md` — auth flow diagram, session shape, proxy behavior, backend gaps, agent guide
- `.env.example` — NEXTAUTH_SECRET, NEXTAUTH_URL, FLASK_API_URL documented

### Files Updated
- `app/(auth)/login/page.tsx` — replaced fake setTimeout with `signIn("credentials")`, Hebrew error state
- `app/api/proxy/[...path]/route.ts` — Bearer token via `getToken()`, added PUT/DELETE handlers, expanded PATH_MAP
- `app/layout.tsx` — added NextAuthSessionProvider wrapper
- `docs/system-upgrade/15-action-backlog.md` — Phase A tasks all marked done
- `docs/system-upgrade/96-rounds-index.md` — Round 007 entry added

### New Findings
- `roles` in Flask JWT response is an array — `roles[0]` is the primary role
- `is_admin` not yet returned by `_user_to_dict()` — derived from role name (tracked: Q14 backlog)
- Typecheck passes (tsc --noEmit exit 0) after all auth files created
- No backend changes needed for Phase A (proxy is server-to-server, CORS not an issue)
- `expiresAt` must be tracked manually in Credentials provider (no `account.expires_at` for non-OAuth)

### Decision Changes
- None new — implements ADR-011 and ADR-012 as designed

### Backlog Changes
- Phase A auth tasks: all 10 marked `[x] 2026-04-24`
- Phase 0 "Wire real auth" marked done
- Phase 0 "Add Next.js middleware" marked done
- Remaining: Phase B (Flask additions) and Phase C (hardening)

---

## 2026-04-24 — Round 006: AI-Maintainability and Code Cleanup Policy

### Files Changed
- `docs/system-upgrade/23-ai-maintainability-and-code-cleanup.md` — **created** (15 sections, full cleanup policy)
- `docs/system-upgrade/08-technical-debt-register.md` — **updated** (3 new AI-maintainability debt items: missing INDEX.md, missing file headers, Vite app duplication, Jinja2 co-existence)
- `docs/system-upgrade/09-modernization-opportunities.md` — **updated** (QW-3 expanded from "Delete Dead Code" stub to full AI-maintainability foundations plan)
- `docs/system-upgrade/10-target-architecture.md` — **updated** (added principle 7 + AI-Agent Design Principles table)
- `docs/system-upgrade/12-migration-roadmap.md` — **updated** (added Migration Principles 6-8: cleanup-first, delete Jinja2 on parity, file size gate)
- `docs/system-upgrade/14-decision-log.md` — **updated** (ADR-013 added)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (Phase 0.5 AI-Maintainability section added: 10 tasks)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 006 entry added; upcoming rounds renumbered)
- `docs/system-upgrade/97-source-of-truth.md` — **updated** (AI-maintainability policy row added; ADR highest updated to ADR-013)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### New Findings
- `api_auth_OLD_BACKUP.py` confirmed dead — no imports found; safe to delete after grep-confirm
- No per-module `INDEX.md` exists in any `apps/<module>/` directory — AI agents read full module without orientation
- 4 Vite apps (`ai-agents-ui/`, `ala-ui/`, `ops-ui/`, `dyn-dt-ui/`) have no inventory of feature-vs-platform-ui parity — must scope before retirement
- Jinja2 templates have no tracked relationship to their `render_template` callers — retirement order undefined
- `run.py` is 15KB god-file — primary driver of incorrect agent module attribution
- 39 Alembic parallel heads are intentional — must NOT be consolidated (documented in MEMORY.md)
- File size limits are undefined in current CLAUDE.md — agents generate unbounded files

### Decision Changes
- ADR-013 added: AI-maintainable codebase and cleanup-first modernization

### Backlog Changes
- Phase 0.5 AI-Maintainability section added to `15-action-backlog.md`: 10 tasks covering dead-code sweep, INDEX.md template, file header standard, oversized file list, platform-ui knip scan, Vite app inventory, Jinja2 template inventory

---

## 2026-04-24 — Round 005: Authentication Bridge

### Files Changed
- `docs/system-upgrade/16-auth-bridge-design.md` — **created** (auth bridge design, 15 sections)
- `docs/system-upgrade/14-decision-log.md` — **updated** (ADR-011, ADR-012 added)
- `docs/system-upgrade/13-open-questions.md` — **updated** (Q1/Q2 resolved; Q13/Q14/Q15 added)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (Phase A/B/C auth tasks added; old tasks marked done)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 005 entry added)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### New Findings
- Flask has two auth systems: Flask-Login (session) + JWT (`/api/auth/login` for mobile). Platform-ui will use JWT.
- `POST /api/auth/login` returns `{data: {token, refresh_token, user: {id,email,org_id,roles}}}` — clean contract.
- `POST /api/auth/refresh` exists — rotation-based (7-day opaque token, SHA256-hashed in DB).
- `next-auth` v4 is installed but not configured. Login page is a stub (no API call).
- No `middleware.ts` — dashboard routes are publicly accessible.
- CSRF auto-check is disabled Flask-side — no CSRF header needed for platform-ui.
- Flask CORS allows only Flutter/localhost ports, not `localhost:3000` — must fix for dev.
- `SESSION_COOKIE_SECURE` not set in Flask production config — security gap.
- RBAC: `@role_required` / `@permission_required` in `rbac.py`. `is_admin=True` bypasses all.
- `_user_to_dict()` in `jwt_routes.py` does NOT include `permissions[]`, only `roles[]`.
- MFA: TOTP session-based. JSON behavior for MFA users is unresolved (Q13).

### Decision Changes
- ADR-011 added: next-auth Credentials + Flask JWT is the chosen auth bridge
- ADR-012 added: No CSRF token required for platform-ui API calls

### Backlog Changes
- Phase A (Next.js side): 8 tasks added — next-auth handler, options, types, SessionProvider, login page, middleware, proxy Bearer header, env vars
- Phase B (Flask side): 4 tasks added — logout endpoint, /me endpoint, CORS, permissions in JWT response
- Phase C (Hardening): 4 tasks added — SSM secret, role nav, E2E test, Flask cookie security
- Previous Phase 0 tasks updated: proxy route marked done, Q1/Q4 marked done

---

## 2026-04-24 — Round 004: Deep Upgrade Planning

### Files Changed
- `docs/UPGRADE_ROADMAP.md` — **created** (287 lines, 5 tiers, 10 quick wins, dependency order, risk register)
- `docs/system-upgrade/96-rounds-index.md` — **created**
- `docs/system-upgrade/97-source-of-truth.md` — **created**
- `docs/system-upgrade/98-change-log.md` — **created** (this file)

### New Findings
- Recharts 3 already installed — covers all chart types except topology (`@xyflow/react`) and drag layout (`@dnd-kit`)
- React Compiler (babel-plugin) is safe to enable incrementally on `lib/` directory
- RSC migration of dashboard stat fetches cuts estimated TTFB by ~400ms
- SSE hook is the single most reusable infrastructure investment — drives tickets, logs, metrics, presence
- Storybook 9 must use `@storybook/nextjs` (not Vite) due to Tailwind v4 PostCSS pipeline
- `nuqs` v2 is the right tool for URL-driven DataTable and chart state in Next.js App Router
- Flask SSE endpoint does not yet exist — SSE hook must mock first, then wire incrementally

### Decision Changes
- ADR-008 proposed: `nuqs` for URL-driven chart/table state
- ADR-009 proposed: SSE over WebSocket for all read-only real-time paths (simpler, no socket library)
- ADR-010 proposed: OpenAPI codegen replaces hand-written `lib/api/types.ts`

### Backlog Changes
- Added 10 quick-win tasks (all ≤1 day) to `docs/UPGRADE_ROADMAP.md §7`
- Tier ordering established: DX (Tier 4) must precede AI-native UX (Tier 1) in implementation

---

## 2026-04-24 — Round 003: Module Mapping & Roadmap

### Files Changed
- `docs/modules/ROADMAP.md` — **created** (priority table, dependency graph, 19 modules)
- `docs/modules/01-users/PLAN.md` through `19-backups/PLAN.md` — **created** (all 19)
- `components/shell/nav-items.ts` — **updated** (8 groups, all 19 routes, correct hrefs, missing icons added)

### New Findings
- All 19 modules have verified Flask endpoints (grep'd from `routes.py` files)
- 6 new proxy prefixes needed: `helpdesk:/helpdesk`, `ai-agents:/ai-agents`, `ala:/api/ala/v1`, `rag:/api/rag`, `billing:/api/billing`, `automation:/automation`
- Helpdesk is largest module (4 days): tickets, SLA, KB, technicians, approval queue, timeline
- Billing has unusually rich API: balance, history, dashboard charts, usage breakdown, rates CRUD
- Knowledge/RAG split: `/api/rag` (REST API) vs `/admin/rag` (UI-backing pages)
- nav-items.ts had wrong hrefs: `/orgs` → `/organizations`, `/health` → `/monitoring`, `/agents` → `/ai-agents`
- Automation (`/automation`) and Integrations (`/integrations`) were missing from nav entirely

### Decision Changes
- ADR-007 proposed: One `PLAN.md` per module as the single implementation spec for that module
- Settings restructured: moved to its own nav group; integrations moved out of settings to standalone

### Backlog Changes
- All 19 module plans now have explicit Definition of Done checklists
- Critical path clarified: Users (01) → Roles (03) → Helpdesk (04) is the dependency chain

---

## 2026-04-23 — Round 002: Shell & Dashboard Build

### Files Changed
- `CLAUDE.md` — **full rewrite** (proxy pattern, useQuery pattern, keyboard shortcuts, sidebar rules, DoD checklist, file structure map)
- `docs/design/COMPONENTS.md` — **updated** (added TiltCard, CursorGlow, EmptyState, Skeleton, DataTable, ConnectionIndicator, SidebarSearch patterns; 8 new anti-patterns)
- `docs/ARCHITECTURE.md` — **updated** (§18 RTL, §19 AI Dashboard, §20 Real-time added; total 833 lines)
- `components/shell/app-sidebar.tsx` — **full rewrite** (search, pinned, recent, collapsible, motion)
- `components/shell/sidebar-search.tsx` — **created**
- `lib/hooks/use-nav-history.ts` — **created** (Zustand persist, recent + pinned)
- `app/api/proxy/[...path]/route.ts` — **created** (Flask proxy, cookie-forwarding, PATH_MAP)
- `lib/api/client.ts`, `types.ts`, `query-keys.ts` — **created**
- `components/shared/tilt-card.tsx`, `cursor-glow.tsx`, `empty-state.tsx`, `data-table.tsx`, `skeleton-card.tsx` — **created**
- `app/(dashboard)/page.tsx` — **rewritten** (real TanStack Query data, skeletons, service health)
- `public/manifest.json` — **created** (PWA, RTL, Hebrew)
- `public/icons/icon-192.png`, `icon-512.png` — **generated** via sharp

### New Findings
- `TableSkeleton` `style` prop error: `<Shimmer>` doesn't accept `style` → must use raw `div`
- `shadcn/ui` Table and Tooltip not auto-generated — must run `npx shadcn@latest add table tooltip`
- Next.js 16 route params are `Promise<{...}>` — must `await params` in catch-all proxy handler
- Flask `/api/ai-settings/stats` and `/admin/api/monitoring/health` both confirmed working
- RTL: `side="right"` on Sidebar, logical CSS properties throughout (`ps-/pe-`, `ms-/me-`)

### Decision Changes
- ADR-005 ratified: Skeleton on every async load state (standardised across all modules)
- ADR-006 ratified: `mounted` guard mandatory on all theme-dependent rendering

### Backlog Changes
- Phase 0 (stabilisation) tasks clarified: auth bridge is the next blocker after proxy is working
- `lib/api/query-keys.ts` centralisation rule added to `CLAUDE.md` anti-patterns

---

## 2026-04-23 — Round 001: Foundation Investigation

### Files Changed
- `docs/system-upgrade/00-executive-summary.md` — **created**
- `docs/system-upgrade/01-current-system-analysis.md` — **created**
- `docs/system-upgrade/02-product-needs-inferred.md` — **created**
- `docs/system-upgrade/03-technology-inventory.md` — **created**
- `docs/system-upgrade/04-architecture-assessment.md` — **created**
- `docs/system-upgrade/05-ui-ux-assessment.md` — **created**
- `docs/system-upgrade/06-security-assessment.md` — **created**
- `docs/system-upgrade/07-scalability-maintainability.md` — **created**
- `docs/system-upgrade/08-technical-debt-register.md` — **created**
- `docs/system-upgrade/09-modernization-opportunities.md` — **created**
- `docs/system-upgrade/10-target-architecture.md` — **created**
- `docs/system-upgrade/11-recommended-tech-stack.md` — **created**
- `docs/system-upgrade/12-migration-roadmap.md` — **created**
- `docs/system-upgrade/13-open-questions.md` — **created**
- `docs/system-upgrade/14-decision-log.md` — **created** (ADR-001 through ADR-004)
- `docs/system-upgrade/15-action-backlog.md` — **created**
- `docs/system-upgrade/README.md` — **created**

### New Findings
- System is production-deployed on EKS (not prototype) with real MSP customers
- 46+ Flask modules, multi-tenant by `org_id`, PostgreSQL + Redis + Celery
- Auth is dual: Flask-Login (session cookie) + JWT — contract with platform-ui TBD
- ALA Voice AI is a distinct subsystem at `/api/ala/v1` — Gemini Live, billing, transcripts
- Helpdesk has the most complex backend: approval workflows, SLA, device auth, AI sessions
- RBAC decorators exist but applied inconsistently across modules
- FreePBX/Asterisk/PSTN fully removed — voice is now WebRTC + STUNner + Gemini Live only

### Decision Changes
- ADR-001: Next.js App Router as primary frontend
- ADR-002: Flask proxy pattern via `/api/proxy/[...path]`
- ADR-003: TanStack Query v5 for all server state
- ADR-004: RTL-first with Tailwind v4 logical properties

### Backlog Changes
- Phase 0 backlog populated: auth bridge, proxy route, route guards, error boundary
- 7 critical open questions added to `13-open-questions.md`
