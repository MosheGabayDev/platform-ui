# 00 — Implementation Control Center

> **This is the first doc to read after `CLAUDE.md`.** Every implementation round starts here.
> _Last updated: 2026-04-26 (R042 — PlatformNotifications cap 12 merged; R041C + R041D-UI + R042 all merged to master; next: Cap 02 StatCard/PlatformDashboard)_

---

## Current Phase

**Phase:** P1 — Shared Foundation Build
**Status:** Active
**Goal:** All 12 P0 gates green. Shared platform services production-ready. Module builds unblocked.

---

## Product Vision (Summary)

ResolveAI is an **AI-native generic organization platform** — a modular, multi-tenant operating system for any type of organization. It manages multiple organizations from one hub, runs AI agents autonomously on behalf of users, and exposes a modular marketplace so each tenant enables only the capabilities they need.

MSP and IT operations is one supported module family (Helpdesk, ALA, Ops Intelligence, Remote Assist), not the platform's entire identity. The same foundation supports legal, medical, educational, and any other domain that needs AI-powered automation and multi-tenant module management.

Full vision: [`03-roadmap/master-roadmap.md §2`](03-roadmap/master-roadmap.md)

---

## Recommended Next Round

> No round is currently in progress. The next agent should start one of the rounds below.

**R042 ✅ (platform-ui PR #7 merged 2026-04-26, SHA `deb32c4`). R041C ✅ (merged 2026-04-26). R041D-UI ✅ (PR #5 merged 2026-04-26). R041E ✅ (PR #6 merged 2026-04-26). R041B ✅ (PR #2 merged 2026-04-26, SHA `5532102`).**

**Next: R043 — Cap 02 StatCard / PlatformDashboard (KPI stat cards for any module home page). ~1h, no backend dependency.**

**Track A — platform-ui rewrite (default path)**

> Build the **Generic Platform Foundation** first. This is generic infrastructure that serves every entity-management page and every module UI. Helpdesk is the first specialized module consumer of this foundation — it is not the driver. The order below is the definitive sequence.

| Step | Candidate | Title | Status | Notes |
|------|-----------|-------|--------|-------|
| 1 | **Cap 08** | `DetailView` extraction | `[x] done — R015` | Extract `DetailView` shared components to `components/shared/detail-view/`. Serves Users, Orgs, Roles, and every future module detail page. |
| 2 | **Cap 17** | `PlatformFeatureFlags` UI | `[x] complete — R041D-UI` | Plan-gated module surfaces + beta feature rollout. Needed before any module goes to production. |
| 3 | **Cap 09** | `PlatformTimeline` | `[x] complete — R041E` | Activity history component for any entity (users, orgs, tickets, jobs). |
| 3 | **Cap 12** | `PlatformNotifications` UI | `[x] complete — R042` | Notification bell + drawer — consumed by every module with async events. |
| 3 | **Cap 02** | `StatCard` / `PlatformDashboard` | `[ ] ready` | KPI stat cards for any module home page. |
| 4 | **AI shell** | Global floating chat + voice agent | `[ ] not yet scoped` | Chat overlay + voice agent entry point visible from every page. Requires scoping. |
| 5 | **Data Sources Hub** | Data Sources Hub UI | `[ ] not yet scoped` | Connector registry, credential vault, sync status. Platform-wide data ingestion layer. |
| 6 | **Helpdesk Phase A** | Helpdesk ticket list + route shell | `[ ] blocked on step 2+3` | First specialized module consumer of the foundation. Starts after cap 08 + cap 17. |
| — | **R042 UI side** | ModuleRegistry UI — platform-ui | `[ ] not yet scoped` | Only after platformengineer backend/core side complete and dependency explicitly declared. Not auto-next. |
**Track B — platformengineer legacy maintenance (exception-only — requires explicit user authorization)**

> **platformengineer is read-only reference** during platform-ui rewrite rounds. Agents must not modify platformengineer unless the user explicitly authorizes a legacy maintenance exception in the prompt.

| Candidate | Title | Status | Notes |
|-----------|-------|--------|-------|
| **R041D** | Secrets Gate Baseline Cleanup | `[x] PR #9 opened 2026-04-26` | platformengineer PR #9 open. Do not merge until issue #8 pending_review findings verified. |
| **R041A** | CI Enforcement (LLM import gate) | `[ ] ready` | platformengineer only. R041D PR opened — R041A can start. Requires explicit start instruction. |

---

## Recent Rounds (most recent first)

| Round | Title | Date | Commit |
|-------|-------|------|--------|
| R042 | PlatformNotifications bell + drawer — PR #7 | 2026-04-26 | `943ca4b` (platform-ui) |
| R041E | PlatformTimeline shared component — PR #6 | 2026-04-26 | `1b1853b` (platform-ui) |
| R041D | Secrets Gate Baseline Cleanup — PR #9 | 2026-04-26 | `09b0234c` (platformengineer) |
| R041C | Generic Foundation Roadmap Realignment (docs) | 2026-04-26 | platform-ui (docs only) |
| R041B | ActionButton shared component — PR #2 | 2026-04-26 | `5532102` (platform-ui) |
| R040-Fix-Post-Apply | Post-Apply Reconciliation (planning/control docs) | 2026-04-26 | `c974aad` (platform-ui) |
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
| R041A | CI Enforcement (LLM import gate in GitHub Actions) | `[ ] ready` | R041D PR #9 opened ✅ | platformengineer |
| R041B | ActionButton shared component — `components/shared/action-button.tsx` | `[x] complete 2026-04-26` | PR #2 merged ✅ | platform-ui |
| R042 | ModuleRegistry.sync_from_manifests() + ModuleCompatLayer | `[ ] ready` | R040 migrations ✅; R040-Fix drift migrations ✅ 2026-04-26; start after R041D tracked | platformengineer |
| R043 | AI Service Routing Matrix Backend | `[ ] ready` | R040 OrgModule tables live ✅ | platformengineer |
| R044 | Navigation API + JWT Route Audit | `[ ] blocked` | R042 CompatLayer | platformengineer |
| R045 | Feature Flags + Settings Engine | `[ ] ready` | R040 in DB ✅ | platformengineer |
| R046 | AuditLog + Notifications Foundation | `[ ] blocked` | R045 | platformengineer |
| R047 | API Keys + Secrets Manager Backend | `[ ] blocked` | R040 ✅, R046 | platformengineer |
| R048 | P0 LLM Direct Import Cleanup | `[ ] partial-ready` | Simple gateway migrations: no extra dep. Full cleanup: R043 preferred | platformengineer |
| R049 | Data Sources Hub Backend Foundation | `[ ] blocked` | R047, R046, R040 ✅ | platformengineer |

> **Repo model (UPDATED per ADR-039 — 2026-05-01):** During **P1 (R040–R048)** both repos are in active joint development. The "platformengineer read-only" rule is **lifted** for P1 backend foundation work. Each backend round still requires its `epic.md` in `10-tasks/`. Cross-repo commits land within 24h and reference each other's SHA. After P1 closes (P1-Exit gate per ADR-041), platformengineer reverts to read-only for all subsequent rounds. **Single-trunk rule applies to BOTH repos during this window.**
> **R048 note:** Modules that only need simple `AIProviderGateway.call()` substitution (no service routing needed) can be migrated immediately — start with fitness_nutrition, ala, ai_coach. Full service-routing-aware migration requires R043 routing matrix first.

> Full dependency graph: [`03-roadmap/master-roadmap.md §6`](03-roadmap/master-roadmap.md)

---

## Current Blockers

| Blocker | Blocks | Action Required |
|---------|--------|----------------|
| R042 ModuleRegistry not implemented | R043, R044 | Start R042 — code work unblocked |
| R045 FeatureFlagService not implemented | R046, R047 | Start R045 — unblocked |
| R041D PR #9 pending merge — 52 pending_review findings need owner verification (issue #8) | R041A full enforcement | R041D allowlist + baseline in place. Merge PR #9 after issue #8 verified. R041A can start in parallel. |

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

### P1 Exit Gate (per ADR-041) — must ALL pass to declare P1 complete

| # | Gate item | Status |
|---|---|--------|
| 1 | `/helpdesk` + `/helpdesk/tickets` routes live (TEST min, PROD preferred) | 🔴 |
| 2 | Routes gated by real `FeatureGate flag="helpdesk.enabled"` (not stub) | 🔴 |
| 3 | Helpdesk nav served by Navigation API (not hardcoded `nav-items.ts`) | 🔴 |
| 4 | One Helpdesk event → platform Notification Service → user bell | 🔴 |
| 5 | One Helpdesk action audited via platform AuditLog Service | 🔴 |
| 6 | Cross-tenant test passes: org A cannot see org B Helpdesk data | 🔴 |
| 7 | `check_no_direct_llm_imports.py` warn-only AND non-increasing 7 days | 🔴 |
| 8 | AI demo slice (ADR-038) in development (epic + ≥2 tasks complete) | 🔴 |

> Until ALL 8 pass: no new module work, no new shared capabilities. Round selection constrained to gate items only.

---

## Code-First Schema Rule (mandatory — see `CLAUDE.md §Code-First Schema Rule`)

> The codebase (SQLAlchemy models + Alembic migration files) is the source of truth for DB schema.
> The live DB must not define tables or columns independently of tracked code.

**Known violation:** R040 tables created by `db.create_all()` at app startup (`apps/__init__.py:1487`), not migrations. Schema adoption completed 2026-04-26 with drift documented in `09-history/risk-register.md §R15`.

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
- [ ] Security checklist reviewed ([`06-governance/round-checklist.md`](06-governance/round-checklist.md))
- [ ] Docs that will need updating are identified
- [ ] Rollback/compatibility plan exists if DB schema or API contract changes
- [ ] Previous round is committed and documented in `09-history/rounds-index.md`
- [ ] If round touches a module: `docs/modules/<module_key>/LEGACY_INVENTORY.md` exists (or is being created in this round)
- [ ] If round touches a module: `docs/modules/<module_key>/E2E_COVERAGE.md` exists (or is being created in this round)
- [ ] If round touches a module: `docs/modules/<module_key>/AI_READINESS.md` exists (or is being created in this round) — see `02-rules/development-rules.md §6`

**Then:**
1. Read `CLAUDE.md` — confirm no rule changes since last session
2. Read this file — confirm blockers, current phase, do-not-start list
3. Read `06-governance/round-checklist.md` — know what the reviewer will check
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
- [ ] Security checks passed (see `06-governance/round-checklist.md §Security`)
- [ ] Tenant isolation: every new DB query scoped by `org_id`
- [ ] Docs updated: `09-history/rounds-index.md`, `09-history/change-log.md`, `03-roadmap/action-backlog.md`, `06-governance/module-migration-progress.md` (if module touched), affected module `INDEX.md`, `AI_READINESS.md` (if module touched)
- [ ] Risks/follow-ups written as issues or entries in `09-history/risk-register.md`
- [ ] Commit SHA returned in final response
- [ ] Pushed to `origin/master` *(no PR — single-trunk workflow per CLAUDE.md §Workflow Rules)*

---

## Review Responsibilities

| What changed | Reviewer |
|---|---|
| DB schema / new table / FK | Architecture review → check `06-governance/round-checklist.md §DB` |
| New API route | Security review → `§Auth/RBAC`, `§Tenant` |
| LLM / AI call | Billing review → `§AIProviderGateway` |
| Auth / JWT / RBAC change | Security review + cross-check `apps/authentication/rbac.py` |
| Migration file | Migration safety review → `§Migration` |
| Shared service boundary change | ADR required → `DOCS/execution/DECISIONS_LOG.md` |

---

## Key Governance Documents

| Doc | Purpose |
|-----|---------|
| [`00-control-center.md`](00-control-center.md) | This file — start here |
| [`03-roadmap/master-roadmap.md`](03-roadmap/master-roadmap.md) | **Single SSOT plan** — vision, pillars, phases, gates, build order |
| [`02-rules/development-rules.md`](02-rules/development-rules.md) | Non-negotiable development rules |
| [`02-rules/shared-services.md`](02-rules/shared-services.md) | Mandatory shared services contract (ADR-028) |
| [`02-rules/testing-standard.md`](02-rules/testing-standard.md) | Testing + evidence standard |
| [`02-rules/legacy-inventory.md`](02-rules/legacy-inventory.md) | Per-module legacy inventory template |
| [`02-rules/e2e-coverage.md`](02-rules/e2e-coverage.md) | Per-module E2E coverage template |
| [`03-roadmap/action-backlog.md`](03-roadmap/action-backlog.md) | Prioritized cross-cutting task backlog |
| [`04-capabilities/catalog.md`](04-capabilities/catalog.md) | Shared capability catalog |
| [`06-governance/round-checklist.md`](06-governance/round-checklist.md) | Reviewer checklist before approving a round |
| [`06-governance/handoff-protocol.md`](06-governance/handoff-protocol.md) | Agent handoff protocol |
| [`06-governance/module-migration-progress.md`](06-governance/module-migration-progress.md) | Per-module rewrite tracker |
| [`08-decisions/decision-log.md`](08-decisions/decision-log.md) | ADRs |
| [`08-decisions/open-questions.md`](08-decisions/open-questions.md) | Unresolved questions |
| [`09-history/rounds-index.md`](09-history/rounds-index.md) | History of every round |
| [`09-history/change-log.md`](09-history/change-log.md) | What changed each round |
| [`09-history/risk-register.md`](09-history/risk-register.md) | Active risks + mitigations |
| [`10-tasks/`](10-tasks/) | Atomic ≤2h task breakdown per round |
| [`97-source-of-truth.md`](97-source-of-truth.md) | Which file owns which concern |
| [`README.md`](README.md) | Navigation index |

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

- Risk register: [`09-history/risk-register.md`](09-history/risk-register.md)
- Shared services contract: [`02-rules/shared-services.md`](02-rules/shared-services.md)
- ADR log: [`08-decisions/decision-log.md`](08-decisions/decision-log.md) / `DOCS/execution/DECISIONS_LOG.md`
- Security assessment: [`01-foundations/07-security.md`](01-foundations/07-security.md)
- Source of truth registry: [`97-source-of-truth.md`](97-source-of-truth.md)
- Master roadmap: [`03-roadmap/master-roadmap.md`](03-roadmap/master-roadmap.md)
