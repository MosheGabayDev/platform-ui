# 97 — Source of Truth Registry

_Defines which file owns each concern. When you have new information, look up the category and write it there — not anywhere else._

---

## The Rule

> **One category → one file.** If content belongs in two categories, write it in the primary file and add a cross-reference line in the secondary.

---

## Registry

| Category | Primary File | Secondary / Cross-ref | Notes |
|----------|-------------|----------------------|-------|
| **Executive summary** | `00-executive-summary.md` | — | High-level status, maturity, direction. Update after each round that changes the overall picture. |
| **Current system analysis** | `01-current-system-analysis.md` | `03-technology-inventory.md` | Code-derived facts about platformengineer. Add new discoveries here. |
| **Product needs** | `02-product-needs-inferred.md` | — | Inferred user/business requirements. Update when a new module or user story is uncovered. |
| **Technology inventory** | `03-technology-inventory.md` | `11-recommended-tech-stack.md` | Every library/service with version + assessment. Keep in sync with `package.json`. |
| **Architecture assessment** | `04-architecture-assessment.md` | `10-target-architecture.md` | Strengths and weaknesses of current architecture. |
| **UI/UX assessment** | `05-ui-ux-assessment.md` | `docs/design/DESIGN_SYSTEM.md` | Frontend condition + design decisions. |
| **Security** | `06-security-assessment.md` | `14-decision-log.md` (security ADRs) | Findings by severity. New CVEs or auth issues go here first. |
| **Scalability** | `07-scalability-maintainability.md` | — | Performance bottlenecks, scale limits. |
| **Technical debt** | `08-technical-debt-register.md` | `15-action-backlog.md` | Debt items with priority. Resolved debt → mark as `[x]` and add resolution date. |
| **Modernization opportunities** | `09-modernization-opportunities.md` | `docs/UPGRADE_ROADMAP.md` | Opportunities with effort/impact rating. Quick wins cross-reference `UPGRADE_ROADMAP.md §7`. |
| **Target architecture** | `10-target-architecture.md` | `docs/ARCHITECTURE.md` | Future-state system design. `docs/ARCHITECTURE.md` is the Next.js-specific view; this file is the full-stack view. |
| **Recommended tech stack** | `11-recommended-tech-stack.md` | `CLAUDE.md §Tech Stack` | Frontend + backend library choices with rationale. `CLAUDE.md` has the definitive dev-time table. |
| **Migration roadmap** | `12-migration-roadmap.md` | `docs/modules/ROADMAP.md` | Phased plan (Phase 0-4). Module-level plan lives in `docs/modules/`. |
| **Open questions** | `13-open-questions.md` | — | Every unresolved question. Mark answered questions `[RESOLVED]` with the answer inline. Never delete — history is valuable. |
| **Decision log** | `14-decision-log.md` | `CLAUDE.md §Hard Rules` | ADRs. When an ADR affects dev rules, propagate the consequence to `CLAUDE.md`. |
| **Action backlog** | `15-action-backlog.md` | `docs/modules/*/PLAN.md` | Prioritized tasks. Module-specific tasks live in each module's PLAN.md; this file has cross-cutting and Phase 0 tasks. |
| **Module specs** | `docs/modules/<N>-<name>/PLAN.md` | `15-action-backlog.md` | One file per module. Flask endpoints, TypeScript types, pages, components, DoD. |
| **Deep upgrade roadmap** | `docs/UPGRADE_ROADMAP.md` | `09-modernization-opportunities.md` | 5-tier upgrade plan with quick wins, dependency order, risk register. |
| **Round history** | `96-rounds-index.md` (this workspace) | — | Every investigation round. |
| **Change log** | `98-change-log.md` (this workspace) | — | What changed in each round. |

---

## Routing Rules

### Where new findings go

| Type of finding | Write to |
|-----------------|---------|
| New Flask endpoint discovered | `01-current-system-analysis.md` + relevant `docs/modules/*/PLAN.md` |
| New security vulnerability | `06-security-assessment.md` |
| New tech debt item | `08-technical-debt-register.md` |
| New upgrade opportunity | `09-modernization-opportunities.md` or `docs/UPGRADE_ROADMAP.md` |
| New library version conflict | `03-technology-inventory.md` |
| New product requirement discovered | `02-product-needs-inferred.md` |

### Where decisions go

| Type of decision | Write to |
|-----------------|---------|
| Architecture / tech choice | `14-decision-log.md` (ADR format) |
| Dev coding rule | `CLAUDE.md §Hard Rules` |
| Design pattern | `docs/design/COMPONENTS.md` |
| Migration phase change | `12-migration-roadmap.md` |

### Where unresolved questions go

→ `13-open-questions.md`, categorized by domain (Authentication, API, Data, etc.).
Add the question immediately when it arises, not after the round ends.

### Where implementation tasks go

| Scope | Write to |
|-------|---------|
| Single module | `docs/modules/<N>/PLAN.md §Definition of Done` |
| Cross-cutting (auth, proxy, CI) | `15-action-backlog.md` |
| Upgrade / non-module feature | `docs/UPGRADE_ROADMAP.md §7 Quick Wins` or a new backlog section |

---

## Consistency Rules

1. **Same terminology throughout**: "platform-ui" (frontend), "platformengineer" (backend), "Flask" (never "Django"), "TanStack Query" (never "React Query").
2. **Dates**: ISO format `YYYY-MM-DD` everywhere.
3. **ADR IDs**: sequential, never reuse. Current highest: ADR-010.
4. **Module numbers**: always zero-padded two digits (`01`, `04`, `17`).
5. **Status markers**: `[ ]` TODO, `[~]` In Progress, `[x]` Done, `[!]` Blocked.
