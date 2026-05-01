# Master Roadmap — ResolveAI Platform

> **Single source of truth** for the platform plan: vision, pillars, phases, gates, build order.
> Replaces and supersedes three legacy roadmap docs (the original migration roadmap, capabilities build order, and generic foundation roadmap), now archived under `_legacy/`.
> _Last updated: 2026-05-01_

---

## 1. Vision

ResolveAI is an **AI-native generic organization platform** — a modular, multi-tenant operating system that any kind of organization can install. The platform itself ships no domain logic: helpdesk, CRM, knowledge management, voice support, etc. are all delivered as modules.

Three non-negotiables:

1. **AI is the primary interaction layer.** Most users won't navigate menus — they'll ask. The platform enforces RBAC, tenant isolation, billing, audit, and data-access policy *architecturally* so AI can be deployed broadly with enterprise confidence.
2. **Every cross-module concern is a platform service.** Auth, RBAC, billing, audit, notifications, file storage, search, AI gateway — built once, consumed by every module.
3. **Modules extend, never fork the core.** A module registers AI actions, data sources, nav items, settings, audit events. It cannot modify auth, billing, tenant isolation, or data ownership.

### AI delivery phasing (per ADR-038)

The platform is "AI-native" architecturally from day one — every API call routes through the governed `AIProviderGateway`, every action is audit-able for AI consumption, every module declares its AI capabilities. The user-visible AI experience, however, lands in phases:

- **P1 — AI-Ready Platform** (current): backend governance complete, gateway routes all calls, billing accurate. No new user-facing AI surface.
- **P2 demo slice (R049.5)** — minimal floating "Ask the Dashboard" overlay (read-only, single page context). Validates the foundation with real users.
- **P2 full (R051)** — AI Action Platform with write actions + confirmation tokens.
- **P3** — Full Floating Assistant + voice + cross-module actions.

This phasing is honest about delivery while preserving the AI-native architectural commitment.

### Target users

Owner · System Administrator · Org Administrator · Manager · Technician/Operator · Regular Employee · External Customer · AI Agent · Developer/Integration Admin.

### Target organization types (delivered as modules, not hardcoded verticals)

IT/MSP · Helpdesk/Support · Knowledge Management · Internal Operations · Sales/CRM · Document Management · Voice Support · Automation · Analytics · Compliance/Audit/Security.

---

## 2. Platform Pillars

Each pillar is a domain of platform responsibility. No module may own these — they are platform infrastructure.

| # | Pillar | Status | Key capabilities |
|---|--------|--------|---------|
| 1 | **Identity & Trust** | foundation-built | Users, roles, RBAC, JWT, sessions, MFA, SSO, API keys, service accounts |
| 2 | **Organization & Tenant** | partial | Org CRUD, tenant isolation, settings registry, feature flags, plan/tier state, audit trail |
| 3 | **Module & Marketplace** | partial | Manifests, OrgModule, dependencies, versioning, upgrade jobs, store, licenses, nav API |
| 4 | **Data & Knowledge** | not-started | Data registry, ownership model, import/export, backup, retention, file manager, search |
| 5 | **AI Operation** | partial | AIProviderGateway, AI Providers Hub, service-routing matrix, AIUsageLog, AI Action Platform, floating assistant, voice agent |
| 6 | **Data Sources & Knowledge Connections** | not-started | DataConnection, DataSource, MCP servers, DB governance, source access policies, sync, RAG |
| 7 | **Workflow & Automation** | partial | Job runner, approval workflows, notifications, timelines, automation triggers, outbox |
| 8 | **Experience** | partial | Design system, DataGrid, Form, ActionButton, DetailView, dashboard builder, command palette |
| 9 | **Billing & Commercial** | partial | Plans, subscriptions, usage metering, AI billing, licenses, quotas, invoicing, trials |
| 10 | **Operations & Infrastructure** | foundation-built | Logs, metrics, health checks, Celery, K8s, CI/CD, secrets, monitoring |

Capability inventory by pillar — see `pillars-capabilities-inventory.md` (one row per capability with status, priority, target round).

---

## 3. Phases

The plan runs as 6 sequenced phases. Phase numbers map to time order, not parallelism — each phase has a defined entry gate.

| Phase | Goal | Rough timeline | Entry gate |
|-------|------|---------------|-----------|
| **P0 — Stabilization** | Platform-ui usable with real Flask data; auth + RBAC + 3 base modules live | ✅ R005–R022 done | — |
| **P1 — Foundation Gates** | All 12 P0 gates green; shared platform services production-ready | 🟢 active (R040–R048) | P0 complete |
| **P2 — Core Platform Hubs** | Generic shared services usable by all modules: Data Sources, Integration, MFA, AI Action Platform, file/media, search, billing-quota | R048–R053 | P1 gates green |
| **P3 — AI/Automation Platform** | AI Providers Hub UI, personalized context, workflow engine, voice service, AI agents | R054–R057 | P2 hubs operational |
| **P4 — Marketplace/Enterprise** | Module store, SSO, MFA enforcement, backup/restore, dashboard builder, Stripe, dev portal | R057–R060 | P3 stable |
| **P5 — DevOps Hardening** | Observability stack, OpenTelemetry, accessibility audit, load testing, multi-region DR, decommission Jinja2 | R060+ | P4 features stable |

---

## 4. P0 Foundation Gates (12)

Must close before any new feature module is built at scale. Ordered by dependency.

| # | Gate | Round | Status | Blocks |
|---|------|-------|--------|--------|
| 1 | OrgModule schema (OrgModule, OrgModuleSettings, ModuleDependency, ModuleVersion, ModuleLicense) | R040 | ✅ applied 2026-04-26 | All per-org module state |
| 2 | OrgModule schema drift fixes (FK cascade, server defaults, named indexes) | R040-Fix | ✅ applied 2026-04-26 | R042 data ingestion |
| 3 | CI enforcement (LLM import gate in PR CI + ADR-028 check) | R041A | 🟡 ready to start | Governance regression |
| 4 | ActionButton + DetailView extraction | R041B+R041C | ✅ R041B done; DetailView pending | Generic UI consistency |
| 5 | ModuleRegistry.sync_from_manifests() + ModuleCompatLayer | R042 (backend) | 🔴 not started | Module-aware everything |
| 6 | AI Service-to-Provider Routing Matrix backend | R043 | 🔴 not started | Feature-level AI routing |
| 7 | Navigation API (`/api/org/modules/navigation`) | R044 | 🔴 blocked on R042 | Module-aware nav |
| 8 | Feature Flags Engine + Settings Engine | R045 | 🔴 not started | Plan-gating, module preferences |
| 9 | AuditLog Platform Service + Notification Platform Service | R046 | 🔴 blocked on R045 | Audit + notification consistency |
| 10 | API Keys + Secrets Manager backend | R047 | 🔴 blocked on R046 | Integration auth, connector secrets |
| 11 | LLM direct import cleanup (55+ files → AIProviderGateway) | R048 | 🟡 partial-ready | AI billing completeness |
| 12 | Data Sources Hub backend foundation (DataConnection, DataSource, SourceAccessPolicy, sync) | R049 | 🔴 blocked on R047 | AI knowledge access |

**Why blocked broad module dev:** all 12 above. Specifically — no per-org module state, no generic settings, partial feature flags, no audit/notification platform service, no API keys, no integration secrets, 55+ LLM import violations bypassing billing, no nav API, no CompatLayer to migrate existing callers, no Data Sources Hub for AI access.

---

## 5. Build Order — Active and Near Rounds (R040–R049)

Authoritative round sequence. Each row is a single round; epic + atomic tasks live under `../10-tasks/<round>/`.

| Round | Title | Track | Depends on | Status |
|-------|-------|-------|-----------|--------|
| R040 | OrgModule additive schema foundation | platformengineer | — | ✅ done 2026-04-26 |
| R040-Fix | Schema drift fixes (FK cascade, defaults, indexes) | platformengineer | R040 | ✅ done 2026-04-26 |
| R041-Test | Security/multi-tenant test standard | platform-ui | R040 | ✅ done |
| R041-Gov | Governance addendum (legacy preservation, agent handoff) | platform-ui | R041-Test | ✅ done |
| R041A | CI enforcement (LLM import gate) | platformengineer | R041D PR open | 🟡 ready |
| R041B | ActionButton shared component | platform-ui | R041-Gov | ✅ done |
| R041C | Generic foundation roadmap realignment (docs) | platform-ui | R041B | ✅ done |
| R041D | Secrets Gate baseline cleanup | platformengineer | — | 🟡 PR #9 open |
| R041D-UI | PlatformFeatureFlags fail-closed FeatureGate + useFeatureFlag | platform-ui | R041C | ✅ done |
| R041E | PlatformTimeline shared component | platform-ui | R041C | ✅ done |
| R041F | E2E Playwright foundation (smoke + users) | platform-ui | — | ✅ done 2026-05-01 |
| R041G | KpiCard / PlatformDashboard | platform-ui | R041C | ✅ done 2026-05-01 |
| R042 | PlatformNotifications bell + drawer | platform-ui | R041G | ✅ done |
| **R-OPS-01** | **Compensating controls + coverage gate** (ADR-037, ADR-042) | both | R041F ✅ | ⬜ ready |
| **R042-BE-min** | ModuleRegistry sync — Helpdesk-validating subset (T01-T03 of R042-BE) | platformengineer | R040-Fix ✅, R-OPS-01 | ⬜ ready |
| **R044-min** | Navigation API for already-built routes only | platformengineer | R042-BE-min | 🔴 blocked |
| **R045-min** | Feature Flags only (one flag: `helpdesk.enabled`) | platformengineer | R040 ✅ | ⬜ ready |
| **R046-min** | One Helpdesk notification flow + Helpdesk audit | platformengineer | R045-min | 🔴 blocked |
| **Helpdesk Phase A** | Ticket list + KPI dashboard (validates -min foundation) | platform-ui | R042-BE-min, R044-min, R045-min, R046-min | 🔴 blocked |
| **P1-Exit Gate** | All 8 ADR-041 criteria pass | review-only | Helpdesk Phase A | 🔴 blocked |
| R042-BE | ModuleRegistry full (T04-T07: CompatLayer, enforcement, startup, ≥20 tests) | platformengineer | Helpdesk Phase A | 🔴 blocked |
| R043 | AI Service Routing Matrix backend | platformengineer | R040 ✅ | 🔴 blocked on Helpdesk validation |
| R044 | Navigation API full (manifest-driven) + JWT route audit | platformengineer | Helpdesk Phase A | 🔴 blocked |
| R045 | Settings Engine (Feature Flags split out as R045-min) | platformengineer | Helpdesk Phase A | 🔴 blocked |
| R046 | AuditLog + Notifications full | platformengineer | Helpdesk Phase A | 🔴 blocked |
| R047 | API Keys + Secrets Manager backend | platformengineer | R046 | 🔴 blocked |
| R048 | P0 LLM direct import cleanup | platformengineer | R043 | 🟡 partial-ready |
| **R049.5** | **AI demo slice — minimal "Ask the Dashboard"** (ADR-038) | platform-ui | R048 (warn-only ≥7 days) | 🔴 blocked |
| R049 | Data Sources Hub backend foundation | platformengineer | R047, R046 | 🔴 blocked |

> **Repo model (UPDATED per ADR-039):** During P1 (R040–R048) both repos are in active joint development. After P1-Exit Gate, platformengineer reverts to read-only.

> **Round sub-letter convention:** A/B/C/D/E/F/G suffixes mark parallel sub-rounds within a numeric round. The `-min` / `-full` split (per ADR-040) is a slicing convention: `-min` ships first as a Helpdesk-validating subset, `-full` completes after Helpdesk Phase A validates the slice.

---

## 6. Capability Dependency Graph

```
[Auth/JWT/RBAC] ✅ ────────────────→ all protected routes
[OrgModule (R040)] ✅ ─────────────→ module-scoped routes, feature flags, nav, licenses
[ModuleRegistry sync (R042)] ─────→ OrgModule state valid
[ModuleCompatLayer (R042)] ───────→ existing callers safe during migration
[Navigation API (R044)] ──────────→ sidebar shows only enabled modules
[Feature Flags (R045)] ───────────→ plan-gated features across modules
[Settings Engine (R045)] ─────────→ all org/user preferences
[AuditLog (R046)] ────────────────→ comprehensive audit trail
[Notification (R046)] ────────────→ all module notifications
[API Keys (R047)] ────────────────→ integrations, service accounts, dev API
[Secrets Manager (R047)] ─────────→ integration connectors, data source auth
[LLM Cleanup (R048)] ─────────────→ AI billing complete + governance enforced
[AI Routing (R043)] ──────────────→ feature-level AI provider resolution
[Data Sources Hub (R049)] ────────→ AI assistants safely access org data; MCP + DB governance
[Media/File Manager (R052)] ──────→ Knowledge, Helpdesk attachments, HR
[Global Search (R053)] ───────────→ command palette, cross-module search
[Billing & Quota (R045)] ─────────→ AI usage limits, module trial management
[Dashboard Builder (R055)] ───────→ org-configurable home pages
```

UI capability graph — see `../04-capabilities/catalog.md`.

---

## 7. Pre-Launch Gate Summary

| Gate | Required to ship |
|------|---------|
| **Helpdesk Phase A** (ticket list + KPI dashboard) | ActionButton ✅, DetailView, FeatureFlags ✅, Timeline ✅, KpiCard ✅, Notifications ✅ |
| **Helpdesk Phase B** (ticket detail + timeline) | + Phase A capabilities + ticket detail |
| **Helpdesk Phase C** (approvals) | + ApprovalFlow + PolicyEngine |
| **Helpdesk Phase D** (live status) | + PlatformRealtime (SSE) |
| **AI Agents Phase A** | All Helpdesk + JobRunner + investigation stream |
| **AI Action Platform — READ tier** | AIActionRegistry + invocation audit |
| **AI Action Platform — WRITE tier** | + ConfirmationToken + useAIAction hook |
| **AI Action Platform — Voice tier** | + voice confirm flow + ALA wiring |
| **AI Action Platform — Full** | + ApprovalQueue + module manifests |
| **Floating AI Assistant — infra** | FloatingAIButton + session state + page-context registry |
| **Floating AI Assistant — LLM wired** | Drawer + chat + AI context API + PageContextDiff |
| **Floating AI Assistant — actions** | AIActionPreviewCard + confirmation flow |
| **Floating AI Assistant — voice** | Voice mode + objective persistence + workflow resumption |
| **AI Providers Hub backend** | 39 JWT endpoints + permissions + service routing models + AIUsageLog extension |
| **AI Providers Hub UI core** | Overview + Providers + Defaults + Overrides + Usage |
| **Module Manager — read model** | sync + is_module_available + EnforcementService + CompatLayer |
| **Module Manager — read APIs** | 6 JWT read endpoints + register blueprint |
| **Module Manager — enable/disable** | Write APIs + precondition enforcement + write tests |
| **Module Manager — versioning + upgrade** | ModuleUpgradeJob + 9-step workflow + rollback + checksums |
| **Module Manager — marketplace** | ModuleStoreListing + store UI + trial/purchase/license |
| **Data Sources Hub — foundation** | DataConnection + DataSource + SourceAccessPolicy + connector secrets + AI retrieval policy + sync jobs |
| **Production cutover** | All P0 gates green; CSP headers; cookie security; quota enforcement; observability; accessibility audit |

---

## 8. Existing-DB-First Migration Principle (ADR-036)

The existing `platformengineer` PostgreSQL DB is the migration base. The platform does not require a fresh DB — all evolution is additive.

**Rules:**
1. Add new tables/columns side-by-side; never drop old fields in the same migration that replaces them.
2. Compatibility layers are required before removing any field with callers.
3. Destructive migrations: 30-day minimum gap + gate + backup + rollback plan.
4. Old Jinja2 session routes may coexist while JWT APIs replace them.
5. Every migration: nullable or defaulted columns; `org_id` from day one.
6. Runner: `python scripts/migrations/run_migration.py <revision_id>` — never `alembic` CLI directly.
7. Naming: `YYYYMMDD_description.py`.

**Code-First Schema Rule (mandatory):** Before writing any migration, confirm the SQLAlchemy model exists. The codebase (models + migration files) is the source of truth for DB schema. The live DB must not define tables independently of tracked code.

> Known historical violation: R040 tables created via `db.create_all()` then stamped after column verification. Drift documented in `../09-history/risk-register.md §R15`. Drift fixes ✅ applied 2026-04-26.

---

## 9. Migration Principles (every round)

1. **Never dual-maintain.** Once a feature lives in platform-ui, remove the Jinja2 equivalent in the same PR.
2. **API contract before UI.** Don't build UI for an undocumented endpoint.
3. **RBAC on both sides.** Backend `@role_required` + frontend route guard + hidden nav items.
4. **RTL always tested.** Every new page passes manual RTL check before merge.
5. **No big-bang releases.** Each domain migrates independently behind feature flag if needed.
6. **Cleanup-first per module.** Before building a platform-ui page for a module, run the dead-code sweep and create `INDEX.md` for that module's `apps/<module>/`.
7. **Capability-first.** Before building any UI feature, check `../04-capabilities/catalog.md`. If it's a known capability, use or extend the shared component — don't reinvent.
8. **Module-local before promotion.** A new pattern stays module-local until it appears in 2 modules; only then does it become a shared capability.
9. **No capability without a confirmed first consumer.** Don't build skeletons "just in case." Name the consumer page + file path or don't ship.
10. **File size gate.** No new file exceeds 300 lines (Python) or 200 lines (TypeScript) without a documented reason.
11. **Polling before SSE.** Real-time features start with polling. SSE is added only when polling causes measurable UX problems.
12. **Platform boundary.** Files under `lib/` must be classified `lib/platform/` (cross-platform) or `lib/web/` (Next.js/browser). When in doubt, write cross-platform first and add the web adapter separately.

---

## 10. Definition of Ready / Done (per round)

### Definition of Ready
- [ ] GitHub issue or `issues/` draft exists
- [ ] Round has clear written scope (in scope, out of scope)
- [ ] All dependencies satisfied (see `5. Build Order`)
- [ ] Acceptance criteria listed (≥5 testable)
- [ ] Required tests identified
- [ ] Security checklist reviewed (`../06-governance/round-checklist.md`)
- [ ] Docs that need updating identified
- [ ] Rollback/compatibility plan if DB schema or API contract changes
- [ ] If touches a module: `LEGACY_INVENTORY.md`, `E2E_COVERAGE.md`, `AI_READINESS.md` exist or are being created in this round
- [ ] Previous round committed and documented in `../09-history/rounds-index.md`

### Definition of Done
- [ ] Every acceptance criterion passes
- [ ] Out-of-scope not touched
- [ ] Tests run and documented (X passed / Y total)
- [ ] No legacy patterns introduced (no raw `org_id` from request, no `import openai`, no `render_template` in `/api/*`)
- [ ] Security checks passed
- [ ] Tenant isolation: every new DB query scoped by `org_id`
- [ ] Docs updated: `rounds-index.md`, `change-log.md`, `action-backlog.md`, `module-migration-progress.md`
- [ ] Risks/follow-ups written as issues or risk-register entries
- [ ] Commit SHA returned
- [ ] PR opened or review requested for shared contracts/models *(N/A under main-only workflow — see `../../CLAUDE.md §Workflow Rules`)*

---

## 11. Anti-Overengineering Rules

Reviewers reject violations.

1. **No capability without a confirmed consumer.** Premature abstraction kills clarity.
2. **No props "for future use."** Components accept only props a current consumer uses.
3. **No shared state for what should be local.** Notification count lives in React Query cache, not Zustand, until 2 unrelated components share it.
4. **Capability tests = consumer tests.** Don't test capability components in isolation — the consumer working IS the test.
5. **No configuration over composition.** Use `children` and typed props, not `config` objects mirroring JSX in JSON form.
6. **Zero cross-capability coupling.** A capability may depend on `lib/utils/` or `lib/api/`, never on another capability's internals.
7. **Deprecation-first refactoring.** When a capability API changes: add new alongside old, migrate consumers, delete old in a single PR.

---

## 12. Document Map

| Topic | Where |
|-------|-------|
| This file (master roadmap) | `03-roadmap/master-roadmap.md` |
| Active round + blockers | `../00-control-center.md` |
| Capability inventory by pillar | `../04-capabilities/catalog.md` |
| Atomic tasks per round | `../10-tasks/<round>/` |
| Action backlog (cross-cutting) | `action-backlog.md` |
| Modernization opportunities | `modernization-opportunities.md` |
| Pillars + full capability inventory (long form) | `pillars-capabilities-inventory.md` *(to be written from doc 47 §3-4)* |
| Decision log (ADRs) | `../08-decisions/decision-log.md` |
| Open questions | `../08-decisions/open-questions.md` |
| Round history | `../09-history/rounds-index.md` |
| Change log | `../09-history/change-log.md` |
| Risk register | `../09-history/risk-register.md` |
| Development rules (non-negotiable) | `../02-rules/development-rules.md` |
| Shared services contract (ADR-028) | `../02-rules/shared-services.md` |
| Testing standard | `../02-rules/testing-standard.md` |
| Round review checklist | `../06-governance/round-checklist.md` |
| Module migration tracker | `../06-governance/module-migration-progress.md` |
| Per-module inventories | `../../modules/<key>/{LEGACY_INVENTORY,E2E_COVERAGE,AI_READINESS,I18N_READINESS,TESTING}.md` |
| Legacy detail (archived) | `_legacy/12-migration-roadmap.md` · `_legacy/35-platform-capabilities-build-order.md` · `_legacy/47-generic-platform-foundation-roadmap.md` |
