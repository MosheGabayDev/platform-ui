# 00 — Implementation Control Center

> **This is the first doc to read after `CLAUDE.md`.** Every implementation round starts here.
> _Last updated: 2026-04-26 (R040-Control follow-up — doc accuracy fixes)_

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

## Current Active Round

| Field | Value |
|-------|-------|
| **Round** | R040-Control — Implementation Governance Setup |
| **Status** | ✅ Complete (2026-04-25) |
| **Commit (platform-ui)** | `202d45a678745d5d5046e60644751175d3e01340` |
| **Commit (platformengineer)** | `ed72d27913dc581e6553cace8186b3ea58ecefd5` |
| **Branch** | main (both repos) |
| **Purpose** | Establish governance system — no product features, no schema, no UI |

**Previous completed:** R040 — Module Manager Additive Schema Foundation (`abdf3bc38985dcf1152a390ea81f3d1675103140`)

---

## Next 10 Rounds

| Round | Title | Status | Depends On | Repo |
|-------|-------|--------|------------|------|
| R041A | CI Enforcement (LLM import gate in GitHub Actions) | `[ ] ready` | R040 merged | platformengineer |
| R041B | ActionButton Extraction to shared component | `[ ] ready` | R040 merged | platform-ui + platformengineer |
| R042 | ModuleRegistry.sync_from_manifests() + ModuleCompatLayer | `[ ] blocked` | R040 migrations in DB | platformengineer |
| R043 | AI Service Routing Matrix Backend | `[ ] blocked` | R040 OrgModule tables live | platformengineer |
| R044 | Navigation API + JWT Route Audit | `[ ] blocked` | R042 CompatLayer | platformengineer |
| R045 | Feature Flags + Settings Engine | `[ ] blocked` | R040 in DB | platformengineer |
| R046 | AuditLog + Notifications Foundation | `[ ] blocked` | R045 | platformengineer |
| R047 | API Keys + Secrets Manager Backend | `[ ] blocked` | R040, R046 | platformengineer |
| R048 | P0 LLM Direct Import Cleanup | `[ ] partial-ready` | Simple gateway migrations: no extra dep. Full cleanup: R043 preferred | platformengineer |
| R049 | Data Sources Hub Backend Foundation | `[ ] blocked` | R047, R046, R040 | platformengineer |

> **R041A/B note:** CI enforcement (R041A) is platformengineer only. ActionButton extraction (R041B) requires changes in both platform-ui (component) and platformengineer (shared Python equivalent if any). They can run in parallel.
> **R048 note:** Modules that only need simple `AIProviderGateway.call()` substitution (no service routing needed) can be migrated immediately — start with fitness_nutrition, ala, ai_coach. Full service-routing-aware migration requires R043 routing matrix first.

> Full dependency graph: [`35-platform-capabilities-build-order.md`](35-platform-capabilities-build-order.md)

---

## Current Blockers

| Blocker | Blocks | Action Required |
|---------|--------|----------------|
| R042 ModuleRegistry.sync_from_manifests() not implemented | R043, R044 | Start R042 (R040 migrations now live) |
| R045 FeatureFlagService not implemented | R046, R047 | Start R045 (R040 migrations now live) |

> R040 migrations applied 2026-04-26 — G-ModuleDB gate ✅. R042, R043, R045 unblocked.

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
| G-ModuleDB | R040 migrations applied, OrgModule tables live | ✅ Applied 2026-04-26 |
| G-ModuleSync | ModuleRegistry.sync_from_manifests() operational | 🔴 R042 not started |
| G-NavAPI | Navigation driven by DB state (not hardcoded) | 🔴 R044 not started |
| G-FeatureFlags | FeatureFlagService operational | 🔴 R045 not started |
| G-Governance | All rounds documented + issue-linked | ✅ R040-Control |
| G-SecretScan | No hardcoded secrets in codebase | ✅ bandit-baseline.json + CI gate |

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
- [ ] Docs updated: `96-rounds-index.md`, `98-change-log.md`, `15-action-backlog.md`, affected module `INDEX.md`
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
