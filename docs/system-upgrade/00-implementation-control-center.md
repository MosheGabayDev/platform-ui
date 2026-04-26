# 00 — Implementation Control Center

> **This is the first doc to read after `CLAUDE.md`.** Every implementation round starts here.
> _Last updated: 2026-04-26 (R040-post-apply-reconciliation — R040-Fix DB apply complete; R042 unblocked)_

---

## Current Phase

**Phase:** P1 — Shared Foundation Build
**Status:** Active
**Goal:** All 12 P0 gates green. Shared platform services production-ready. Module builds unblocked.

---

## Product Vision (Summary)

ResolveAI is an **AI-native generic organization platform** — a modular, multi-tenant operating system for any type of organization. It manages multiple organizations from one hub, runs AI agents autonomously on behalf of users, and exposes a modular marketplace so each tenant enables only the capabilities they need.

MSP and IT operations is one supported module family (Helpdesk, ALA, Ops Intelligence, Remote Assist), not the platform's entire identity. The same foundation supports legal, medical, educational, and any other domain that needs AI-powered automation and multi-tenant module management.

Full vision: [`47-generic-platform-foundation-roadmap.md §2`](47-generic-platform-foundation-roadmap.md)

---

## Recommended Next Round

> No round is currently in progress. The next agent should start one of the rounds below.

| Candidate | Title | Status | Notes |
|-----------|-------|--------|-------|
| **R041A** | CI Enforcement (LLM import gate) | `[ ] ready` | No blockers. platformengineer only. Script exists. |
| **R041B** | ActionButton Extraction | `[ ] ready` | No blockers. Both repos. Can run parallel to R041A. |
| **R042** | ModuleRegistry + ModuleCompatLayer | `[ ] ready (code)` | Code work unblocked. **3 drift-fix migrations must run before data ingestion** (see §Code-First Schema Rule below). |

---

## Recent Rounds (most recent first)

| Round | Title | Date | Commit |
|-------|-------|------|--------|
| R040-Fix-Post-Apply | Post-Apply Reconciliation (planning/control docs) | 2026-04-26 | this commit (platform-ui) |
| R040-Fix | Schema Drift Fixes — DB Apply Complete | 2026-04-26 | `cc6c9001` (platformengineer) |
| R041-AI-Knowledge | Global System Capability Knowledge Base | 2026-04-26 | `5ea0ba4` (platform-ui) |
| R041-AI-Assist | Mandatory Chat AI + Voice Agent Readiness | 2026-04-26 | `b1da1a3` (platform-ui) |
| R041-WT | Worktree Addendum — Parallel Agent Workflow | 2026-04-26 | platform-ui |
| R041-Gov | Governance Addendum — Legacy Preservation + Agent Handoff | 2026-04-26 | platform-ui |
| R041-AI | AI Assistant Runtime Contract | 2026-04-26 | platform-ui |
| R041-Test | Security/Multi-Tenant Test Standard | 2026-04-26 | platform-ui |
| R040-Control | Implementation Governance Setup | 2026-04-25 | `202d45a6` (platform-ui) / `ed72d279` (platformengineer) |
| R040 | Module Manager Additive Schema Foundation | 2026-04-26 | `abdf3bc3` (platformengineer) |

---

## Next 10 Rounds

| Round | Title | Status | Depends On | Repo |
|-------|-------|--------|------------|------|
| R041-Test | Security/Multi-Tenant Test Standard | `[x] complete 2026-04-26` | R040 merged | platform-ui |
| R041-Gov | Governance Addendum — Legacy Preservation + Agent Handoff | `[x] complete 2026-04-26` | R041-Test | platform-ui |
| R041-WT | Worktree Addendum — Parallel Agent Workflow | `[x] complete 2026-04-26` | R041-Gov | platform-ui |
| R041A | CI Enforcement (LLM import gate in GitHub Actions) | `[ ] ready` | R040 merged ✅ | platformengineer |
| R041B | ActionButton Extraction to shared component | `[ ] ready` | R040 merged ✅ | platform-ui + platformengineer |
| R042 | ModuleRegistry.sync_from_manifests() + ModuleCompatLayer | `[ ] ready (code); data-ingestion blocked until drift migrations run` | R040 migrations live ✅; drift-fix migrations pending | platformengineer |
| R043 | AI Service Routing Matrix Backend | `[ ] ready` | R040 OrgModule tables live ✅ | platformengineer |
| R044 | Navigation API + JWT Route Audit | `[ ] blocked` | R042 CompatLayer | platformengineer |
| R045 | Feature Flags + Settings Engine | `[ ] ready` | R040 in DB ✅ | platformengineer |
| R046 | AuditLog + Notifications Foundation | `[ ] blocked` | R045 | platformengineer |
| R047 | API Keys + Secrets Manager Backend | `[ ] blocked` | R040 ✅, R046 | platformengineer |
| R048 | P0 LLM Direct Import Cleanup | `[ ] partial-ready` | Simple gateway migrations: no extra dep. Full cleanup: R043 preferred | platformengineer |
| R049 | Data Sources Hub Backend Foundation | `[ ] blocked` | R047, R046, R040 ✅ | platformengineer |

> **R041A/B note:** CI enforcement (R041A) is platformengineer only. ActionButton extraction (R041B) requires changes in both platform-ui (component) and platformengineer (shared Python equivalent if any). They can run in parallel.
> **R048 note:** Modules that only need simple `AIProviderGateway.call()` substitution (no service routing needed) can be migrated immediately — start with fitness_nutrition, ala, ai_coach. Full service-routing-aware migration requires R043 routing matrix first.

> Full dependency graph: [`35-platform-capabilities-build-order.md`](35-platform-capabilities-build-order.md)

---

## Current Blockers

| Blocker | Blocks | Action Required |
|---------|--------|----------------|
| R042 ModuleRegistry not implemented | R043, R044 | Start R042 — code work unblocked |
| R045 FeatureFlagService not implemented | R046, R047 | Start R045 — unblocked |
| R041D Secrets Gate baseline failures (D-005) degrade CI trust | R041A full enforcement | Create R041D tracked issue (done in this round); do soon |

> R040-Fix DB apply complete 2026-04-26 — final revision `20260426_fix_r040_indexes`, backend main SHA `cc6c9001c90bc3317a17e1603762564ab23747c7`. G-ModuleDB-DriftFixed ✅. R042 is technically unblocked. Do not start broad module work until planning docs reflect R040-Fix and R041D is at least a tracked issue.

---

## Foundation Gates (P0 — must pass before P2 work)

| Gate | Description | Status |
|------|-------------|--------|
| G-Auth | JWT auth enforced on all /api/* write routes | 🟡 In progress |
| G-Tenant | All DB queries scope by org_id | 🟡 In progress |
| G-RBAC | @role_required / @permission_required on all mutations | 🟡 In progress |
| G-Audit | record_activity() called on all state changes | 🟡 In progress |
| G-LLM | No direct LLM imports outside apps/ai_providers/ | 🔴 55+ violations (R048) |
| G-Billing | AIUsageLog written for all LLM calls | 🟡 Gateway exists, calls not wired |
| G-ModuleDB-SchemaPresent | R040 migrations applied, OrgModule tables live | ✅ Applied 2026-04-26 |
| G-ModuleDB-DriftFixed | 3 drift-fix migrations run (FK cascade, server_defaults, indexes) | ✅ Applied 2026-04-26 — final revision `20260426_fix_r040_indexes` |
| G-ModuleSync | ModuleRegistry.sync_from_manifests() operational | 🔴 R042 not started |
| G-NavAPI | Navigation driven by DB state (not hardcoded) | 🔴 R044 not started |
| G-FeatureFlags | FeatureFlagService operational | 🔴 R045 not started |
| G-Governance | All rounds documented + issue-linked | ✅ R040-Control |
| G-SecretScan | No hardcoded secrets in codebase | 🔴 D-005 baseline failures (pre-existing test secrets / Redis defaults) — R41D tracks cleanup |

---

## Code-First Schema Rule (mandatory — see `CLAUDE.md §Code-First Schema Rule`)

> The codebase (SQLAlchemy models + Alembic migration files) is the source of truth for DB schema.
> The live DB must not define tables or columns independently of tracked code.

**Known violation:** R040 tables created by `db.create_all()` at app startup (`apps/__init__.py:1487`), not migrations. Schema adoption completed 2026-04-26 with drift documented in `99-risk-register.md §R15`.

**R040-Fix drift migrations applied 2026-04-26 (all 3):**
- [x] `20260426_fix_r040_fk_cascade.py` — CASCADE added to 3 FKs ✅
- [x] `20260426_fix_r040_server_defaults.py` — 9 server_defaults applied ✅
- [x] `20260426_fix_r040_indexes.py` — 2 migration-named indexes created ✅ (final revision)

**Backend main SHA after merge:** `cc6c9001c90bc3317a17e1603762564ab23747c7`
**Test evidence:** `test_r040_fix.py` 33/33 ✅ | `test_r040_schema.py` 43/43 ✅
**R042 data ingestion is now unblocked at DB level.**

---

## Do-Not-Start-Yet List

The following are explicitly out of scope until foundation gates are green:

- **TenantDataStore / TenantDataRouter / BYODB** — deferred to P3 per ADR-036
- **ModuleDependency seed from JSON blob** — format unverified per module; deferred to R042
- **ModulePurchase → ModuleLicense backfill** — string→FK mapping ambiguous; deferred to R038I
- **Platform-ui module pages** (modules 03–19) — waiting on R042 CompatLayer for real data
- **S3 / ObjectStorage integration** — deferred to P3 data ownership phase
- **MCP Server Management UI** — deferred to R049+
- **Marketplace public listing** — deferred to P3
- **Multi-DB tenant routing** — ADR-036: not before G-ModuleDB + G-ModuleSync + G-NavAPI all green

---

## How to Start a Round

> A round may **not** start unless all items below are true.

**Definition of Ready checklist:**

- [ ] GitHub issue exists (or entry in [`issues/R040-R049-issue-drafts.md`](issues/R040-R049-issue-drafts.md))
- [ ] Round has a clear, written scope (what is IN scope)
- [ ] Round has explicit out-of-scope items (what is NOT)
- [ ] All dependencies from the table above are satisfied
- [ ] Acceptance criteria are listed (minimum 5 specific, testable criteria)
- [ ] Required tests are identified
- [ ] Security checklist reviewed ([`01-round-review-checklist.md`](01-round-review-checklist.md))
- [ ] Docs that will need updating are identified
- [ ] Rollback/compatibility plan exists if DB schema or API contract changes
- [ ] Previous round is committed and documented in `96-rounds-index.md`
- [ ] If round touches a module: `docs/modules/<module_key>/LEGACY_INVENTORY.md` exists (or is being created in this round)
- [ ] If round touches a module: `docs/modules/<module_key>/E2E_COVERAGE.md` exists (or is being created in this round)
- [ ] If round touches a module: `docs/modules/<module_key>/AI_READINESS.md` exists (or is being created in this round) — see `02-development-rules.md §6`

**Then:**
1. Read `CLAUDE.md` — confirm no rule changes since last session
2. Read this file — confirm blockers, current phase, do-not-start list
3. Read `01-round-review-checklist.md` — know what the reviewer will check
4. Open/confirm GitHub issue for the round
5. Implement scope only
6. Write/run tests before marking done
7. Follow Definition of Done below

---

## How to Finish a Round

> A round is **done** only if all items below are checked.

**Definition of Done checklist:**

- [ ] Scope completed — every acceptance criterion passes
- [ ] Out-of-scope not touched — no "nice to have" items added
- [ ] Tests run and documented (paste counts: X passed / Y total)
- [ ] No legacy patterns introduced (no raw `org_id` from request, no `import openai`, no render_template in /api/*)
- [ ] Security checks passed (see `01-round-review-checklist.md §Security`)
- [ ] Tenant isolation: every new DB query scoped by `org_id`
- [ ] Docs updated: `96-rounds-index.md`, `98-change-log.md`, `15-action-backlog.md`, `03-module-migration-progress.md` (if module touched), affected module `INDEX.md`, `AI_READINESS.md` (if module touched)
- [ ] Risks/follow-ups written as issues or entries in `99-risk-register.md`
- [ ] Commit SHA returned in final response
- [ ] PR opened or review requested (for changes to shared contracts/models)

---

## Review Responsibilities

| What changed | Reviewer |
|---|---|
| DB schema / new table / FK | Architecture review → check `01-round-review-checklist.md §DB` |
| New API route | Security review → `§Auth/RBAC`, `§Tenant` |
| LLM / AI call | Billing review → `§AIProviderGateway` |
| Auth / JWT / RBAC change | Security review + cross-check `apps/authentication/rbac.py` |
| Migration file | Migration safety review → `§Migration` |
| Shared service boundary change | ADR required → `DOCS/execution/DECISIONS_LOG.md` |

---

## Key Governance Documents

| Doc | Purpose |
|-----|---------|
| [`00-implementation-control-center.md`](00-implementation-control-center.md) | This file — start here |
| [`01-round-review-checklist.md`](01-round-review-checklist.md) | What a reviewer checks before approving a round |
| [`99-risk-register.md`](99-risk-register.md) | Active risks, mitigations, blocking status |
| [`47-generic-platform-foundation-roadmap.md`](47-generic-platform-foundation-roadmap.md) | Master platform roadmap |
| [`35-platform-capabilities-build-order.md`](35-platform-capabilities-build-order.md) | Capability dependency graph + build sequence |
| [`15-action-backlog.md`](15-action-backlog.md) | Prioritized task backlog |
| [`96-rounds-index.md`](96-rounds-index.md) | History of every round |
| [`98-change-log.md`](98-change-log.md) | What changed in each round |
| [`43-shared-services-enforcement.md`](43-shared-services-enforcement.md) | Mandatory shared services — no legacy patterns |
| [`48-testing-and-evidence-standard.md`](48-testing-and-evidence-standard.md) | Testing standard — security/multi-tenant/AI governance evidence requirements |
| [`02-development-rules.md`](02-development-rules.md) | Non-negotiable development rules — product, architecture, security, testing, UX, AI, i18n |
| [`03-module-migration-progress.md`](03-module-migration-progress.md) | Central module rewrite tracker — per-module status, blockers, evidence links |
| [`49-legacy-functionality-inventory.md`](49-legacy-functionality-inventory.md) | Standard template for per-module legacy inventory (`docs/modules/<key>/LEGACY_INVENTORY.md`) |
| [`50-module-e2e-coverage-matrix.md`](50-module-e2e-coverage-matrix.md) | Standard for per-module E2E coverage plans (`docs/modules/<key>/E2E_COVERAGE.md`) |
| [`51-agent-handoff-protocol.md`](51-agent-handoff-protocol.md) | Protocol for parallel agents and context handoff between sessions |
| [`52-parallel-worktree-agent-workflow.md`](52-parallel-worktree-agent-workflow.md) | Git worktree workflow — naming, creation, lock list, safe/unsafe parallel tracks, **shared docs reconciliation rule (§6.1)**, PR workflow, cleanup |
| [`53-runtime-deployment-architecture.md`](53-runtime-deployment-architecture.md) | Runtime pod/service separation, Kubernetes topology, deployment boundaries, failure isolation, health checks, migration job rule |
| [`54-ai-assistant-runtime.md`](54-ai-assistant-runtime.md) | Global chat AI assistant + voice agent runtime contract — page context, capability context, action proposal flow, backend re-check, confirmation policy, audit/billing, **AI readiness levels §14**, module contract, test harness §15 |
| [`55-ai-system-capability-knowledge-base.md`](55-ai-system-capability-knowledge-base.md) | Global AI knowledge model — SystemCapability, SolutionTemplate, CapabilityRecommendation, 3 assistant modes (Advisory/Guided/Delegated), advisory flow, module capability metadata contract §6.1, KB-01–KB-15 E2E tests, ADR |
| [`26-platform-capabilities-catalog.md`](26-platform-capabilities-catalog.md) | Shared capability catalog |

---

## GitHub Issues

| Round | Issue | Status |
|-------|-------|--------|
| R040 | Module Manager Additive Schema Foundation | See [`issues/R040-R049-issue-drafts.md`](issues/R040-R049-issue-drafts.md) |
| R041 | CI Enforcement + ActionButton | See issue drafts |
| R042 | ModuleRegistry + CompatLayer | See issue drafts |
| R043 | AI Service Routing Matrix | See issue drafts |
| R044 | Navigation API | See issue drafts |
| R045 | Feature Flags + Settings | See issue drafts |
| R046 | AuditLog + Notifications | See issue drafts |
| R047 | API Keys + Secrets Manager | See issue drafts |
| R048 | P0 LLM Cleanup | See issue drafts |
| R049 | Data Sources Hub | See issue drafts |

Issue drafts: [`docs/system-upgrade/issues/R040-R049-issue-drafts.md`](issues/R040-R049-issue-drafts.md)

---

## Links

- Risk register: [`99-risk-register.md`](99-risk-register.md)
- Shared services contract: [`43-shared-services-enforcement.md`](43-shared-services-enforcement.md)
- ADR log: [`14-decision-log.md`](14-decision-log.md) / `DOCS/execution/DECISIONS_LOG.md`
- Security assessment: [`06-security-assessment.md`](06-security-assessment.md)
- Source of truth registry: [`97-source-of-truth.md`](97-source-of-truth.md)
