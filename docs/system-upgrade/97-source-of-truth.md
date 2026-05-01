# Source of Truth Registry

> Defines which file owns each concern. When you have new information, look up the category and write it there — not anywhere else.

---

## The Rule

> **One category → one file.** If content belongs in two categories, write it in the primary file and add a cross-reference line in the secondary.

---

## Registry

### Active plan and governance

| Category | Primary file |
|----------|-------------|
| Active round, blockers, gates, do-not-start list | `00-control-center.md` |
| Master plan (vision, pillars, phases, gates, build order) | `03-roadmap/master-roadmap.md` |
| Action backlog (cross-cutting tasks) | `03-roadmap/action-backlog.md` |
| Modernization opportunities (quick wins → strategic) | `03-roadmap/modernization-opportunities.md` |
| Atomic task breakdown per round | `10-tasks/<round>/epic.md` + `10-tasks/<round>/tasks/T*.md` |

### Foundations (current state, target state, assessments)

| Category | Primary file |
|----------|-------------|
| Executive summary (high-level status, direction, maturity) | `01-foundations/01-executive-summary.md` |
| Current system analysis | `01-foundations/02-current-system.md` |
| Product needs (inferred user/business requirements) | `01-foundations/03-product-needs.md` |
| Technology inventory (current libraries with assessments) | `01-foundations/04-tech-inventory.md` |
| Current architecture (strengths and weaknesses) | `01-foundations/05-architecture-current.md` |
| UI/UX assessment | `01-foundations/06-ux-assessment.md` |
| Security assessment (findings by severity) | `01-foundations/07-security.md` |
| Scalability and maintainability | `01-foundations/08-scalability.md` |
| Technical debt register | `01-foundations/09-tech-debt.md` |
| Target architecture | `01-foundations/10-architecture-target.md` |
| Recommended tech stack | `01-foundations/11-recommended-tech-stack.md` |

### Rules (non-negotiable)

| Category | Primary file |
|----------|-------------|
| Development rules (product, architecture, security, testing, UX, AI, i18n) | `02-rules/development-rules.md` |
| Shared services contract (ADR-028) | `02-rules/shared-services.md` |
| Testing and evidence standard | `02-rules/testing-standard.md` |
| Per-module legacy inventory template | `02-rules/legacy-inventory.md` |
| Per-module E2E coverage template | `02-rules/e2e-coverage.md` |

### Capabilities (shared platform services)

| Category | Primary file |
|----------|-------------|
| Capability catalog (inventory by domain) | `04-capabilities/catalog.md` |
| Core platform + module system | `04-capabilities/module-system.md` |
| Module Manager redesign | `04-capabilities/module-manager-redesign.md` |
| Module Manager implementation inventory | `04-capabilities/module-manager-inventory.md` |
| Open-source capability layer | `04-capabilities/oss-layer.md` |
| Runtime deployment architecture | `04-capabilities/runtime-deployment.md` |
| Auth bridge design | `04-capabilities/auth-bridge.md` |

### AI (all AI-related specs)

| Category | Primary file |
|----------|-------------|
| AI Action Platform | `05-ai/action-platform.md` |
| AI canonical terms (consistency-pass) | `05-ai/canonical-terms.md` |
| Floating AI Assistant | `05-ai/floating-assistant.md` |
| AI assistant runtime contract | `05-ai/assistant-runtime.md` |
| AI system capability KB | `05-ai/capability-kb.md` |
| AI Provider Gateway architecture | `05-ai/provider-gateway.md` |
| AI Providers Hub (per-org config) | `05-ai/providers-hub.md` |
| Direct LLM call migration inventory | `05-ai/llm-migration.md` |

### Governance (process)

| Category | Primary file |
|----------|-------------|
| Round review checklist (11 sections) | `06-governance/round-checklist.md` |
| Agent handoff protocol | `06-governance/handoff-protocol.md` |
| Module migration progress tracker | `06-governance/module-migration-progress.md` |
| AI-maintainability and code cleanup | `06-governance/ai-maintainability.md` |
| Master plan consistency pass | `06-governance/consistency-pass.md` |

### Audits (one-off reports)

| Category | Primary file |
|----------|-------------|
| Cross-platform structure audit | `07-audits/cross-platform-structure.md` |
| Security hardening audit | `07-audits/security-hardening.md` |
| Production security headers | `07-audits/production-security-headers.md` |

### Decisions

| Category | Primary file |
|----------|-------------|
| Decision log (ADRs) | `08-decisions/decision-log.md` |
| Open questions | `08-decisions/open-questions.md` |

### History (audit trail)

| Category | Primary file |
|----------|-------------|
| Round history (every investigation round) | `09-history/rounds-index.md` |
| Change log (what changed each round) | `09-history/change-log.md` |
| Risk register (R01–RXX with mitigations) | `09-history/risk-register.md` |

### Per-module docs

| Category | Path |
|----------|------|
| Module spec (Flask endpoints, types, pages, DoD) | `../modules/<module_key>/PLAN.md` |
| Module legacy inventory | `../modules/<module_key>/LEGACY_INVENTORY.md` |
| Module E2E coverage plan | `../modules/<module_key>/E2E_COVERAGE.md` |
| Module testing evidence | `../modules/<module_key>/TESTING.md` |
| Module AI readiness | `../modules/<module_key>/AI_READINESS.md` |
| Module i18n readiness | `../modules/<module_key>/I18N_READINESS.md` |

### External references

| Category | Path |
|----------|------|
| AI agent project instructions | `../../CLAUDE.md` |
| Next.js architecture blueprint | `../ARCHITECTURE.md` |
| Deep upgrade roadmap (5-tier upgrade plan, quick wins, dependency order, risk register) | `../UPGRADE_ROADMAP.md` |
| Design system | `../design/DESIGN_SYSTEM.md` |
| Design tokens | `../design/TOKENS.md` |
| Animation library | `../design/ANIMATIONS.md` |
| Component patterns | `../design/COMPONENTS.md` |
| Mobile/PWA rules | `../design/MOBILE.md` |
| Auth bridge readme | `../auth/README.md` |

### Issue drafts (round contracts)

| Category | Path |
|----------|------|
| Round R040–R049 issue bodies (until GitHub issues created) | `issues/R040-R049-issue-drafts.md` |
| Round-specific issue drafts (e.g. R041D secrets gate) | `issues/R041D-secrets-gate-baseline-cleanup.md`, `issues/<round>-<slug>.md` |

---

## Routing Rules

### Where new findings go

| Type of finding | Write to |
|-----------------|---------|
| New Flask endpoint discovered | `01-foundations/02-current-system.md` + relevant `../modules/*/PLAN.md` |
| New security vulnerability | `01-foundations/07-security.md` |
| New tech debt item | `01-foundations/09-tech-debt.md` |
| New upgrade opportunity | `03-roadmap/modernization-opportunities.md` |
| New library version conflict | `01-foundations/04-tech-inventory.md` |
| New product requirement | `01-foundations/03-product-needs.md` |

### Where decisions go

| Type of decision | Write to |
|-----------------|---------|
| Architecture or tech choice | `08-decisions/decision-log.md` (ADR format) |
| Coding rule for AI agents | `../../CLAUDE.md §Hard Rules` |
| Design pattern | `../design/COMPONENTS.md` |
| Phase or build-order change | `03-roadmap/master-roadmap.md` |

### Where unresolved questions go

→ `08-decisions/open-questions.md`, categorized by domain. Add immediately when the question arises, not after the round ends. Mark answered with `[RESOLVED]` and the answer inline. Never delete — history is valuable.

### Where implementation tasks go

| Scope | Write to |
|-------|---------|
| Single module | `../modules/<key>/PLAN.md §Definition of Done` |
| Cross-cutting (auth, proxy, CI) | `03-roadmap/action-backlog.md` |
| Atomic ≤2h task within an active round | `10-tasks/<round>/tasks/T{NN}.md` |

---

## Consistency Rules

1. **Same terminology throughout:** "platform-ui" (frontend), "platformengineer" (backend), "Flask" (never "Django"), "TanStack Query" (never "React Query").
2. **Dates:** ISO format `YYYY-MM-DD` everywhere.
3. **ADR IDs:** sequential, never reuse. Current highest: ADR-036.
4. **Module numbers:** zero-padded two digits (`01`, `04`, `17`).
5. **Status markers:** `[ ]` TODO, `[~]` In Progress, `[x]` Done, `[!]` Blocked.
6. **Round IDs:** `R040`, `R041A`, `R041B`, … sub-letters mark parallel sub-rounds within a numeric round.
