# Docs Reorg — File Mapping Matrix

> Created 2026-05-01. Tracks the move from flat numeric `00-55` layout into themed folders.
> After all moves complete and all cross-references updated, this file may be deleted.

## Folder Structure

```
docs/system-upgrade/
├── README.md                ← navigation index (rewritten)
├── 00-control-center.md     ← active round, blockers (was 00-implementation-control-center.md)
├── 97-source-of-truth.md    ← SoT registry (rewritten with new paths)
├── REORG_MAPPING.md         ← THIS FILE (temporary)
│
├── 01-foundations/          ← assessments + targets (current state, target state, debt)
├── 02-rules/                ← non-negotiable rules and standards
├── 03-roadmap/              ← single SSOT roadmap + backlog
├── 04-capabilities/         ← shared platform capabilities specs
├── 05-ai/                   ← all AI-related specs in one place
├── 06-governance/           ← process, handoff, checklists
├── 07-audits/               ← one-off audit reports
├── 08-decisions/            ← ADRs + open questions
├── 09-history/              ← rounds index, change log, risk register
├── 10-tasks/                ← atomic ≤2h task breakdowns per round
└── issues/                  ← GitHub issue drafts
```

## File Mapping

| Old path | New path | Notes |
|---|---|---|
| `README.md` | `README.md` | rewrite content |
| `00-executive-summary.md` | `01-foundations/01-executive-summary.md` | |
| `00-implementation-control-center.md` | `00-control-center.md` | stays at root, central |
| `01-current-system-analysis.md` | `01-foundations/02-current-system.md` | |
| `01-round-review-checklist.md` | `06-governance/round-checklist.md` | |
| `02-development-rules.md` | `02-rules/development-rules.md` | |
| `02-product-needs-inferred.md` | `01-foundations/03-product-needs.md` | |
| `03-module-migration-progress.md` | `06-governance/module-migration-progress.md` | |
| `03-technology-inventory.md` | `01-foundations/04-tech-inventory.md` | |
| `04-architecture-assessment.md` | `01-foundations/05-architecture-current.md` | |
| `05-ui-ux-assessment.md` | `01-foundations/06-ux-assessment.md` | |
| `06-security-assessment.md` | `01-foundations/07-security.md` | |
| `07-scalability-maintainability.md` | `01-foundations/08-scalability.md` | |
| `08-technical-debt-register.md` | `01-foundations/09-tech-debt.md` | |
| `09-modernization-opportunities.md` | `03-roadmap/modernization-opportunities.md` | |
| `10-target-architecture.md` | `01-foundations/10-architecture-target.md` | |
| `11-recommended-tech-stack.md` | `01-foundations/11-recommended-tech-stack.md` | |
| `12-migration-roadmap.md` | **MERGED → `03-roadmap/master-roadmap.md`** | content folded into master |
| `13-open-questions.md` | `08-decisions/open-questions.md` | |
| `14-decision-log.md` | `08-decisions/decision-log.md` | |
| `15-action-backlog.md` | `03-roadmap/action-backlog.md` | |
| `16-auth-bridge-design.md` | `04-capabilities/auth-bridge.md` | |
| `23-ai-maintainability-and-code-cleanup.md` | `06-governance/ai-maintainability.md` | |
| `24-core-platform-and-module-system.md` | `04-capabilities/module-system.md` | |
| `25-open-source-capability-layer.md` | `04-capabilities/oss-layer.md` | |
| `26-platform-capabilities-catalog.md` | `04-capabilities/catalog.md` | |
| `28-cross-platform-structure-audit.md` | `07-audits/cross-platform-structure.md` | |
| `30-security-hardening-audit.md` | `07-audits/security-hardening.md` | |
| `31-production-security-headers.md` | `07-audits/production-security-headers.md` | |
| `35-platform-capabilities-build-order.md` | **MERGED → `03-roadmap/master-roadmap.md`** | dependency graph + build order folded into master |
| `36-ai-action-platform.md` | `05-ai/action-platform.md` | |
| `38-floating-ai-assistant.md` | `05-ai/floating-assistant.md` | |
| `39-ai-architecture-consistency-pass.md` | `05-ai/canonical-terms.md` | |
| `40-ai-provider-gateway-billing.md` | `05-ai/provider-gateway.md` | |
| `41-direct-llm-call-audit-and-migration.md` | `05-ai/llm-migration.md` | |
| `42-master-plan-consistency-and-readiness.md` | `06-governance/consistency-pass.md` | |
| `43-shared-services-enforcement.md` | `02-rules/shared-services.md` | |
| `44-ai-providers-hub.md` | `05-ai/providers-hub.md` | |
| `45-module-manager-redesign.md` | `04-capabilities/module-manager-redesign.md` | |
| `46-module-manager-implementation-inventory.md` | `04-capabilities/module-manager-inventory.md` | |
| `47-generic-platform-foundation-roadmap.md` | **MERGED → `03-roadmap/master-roadmap.md`** | pillars + capability inventory + AI vision folded into master |
| `48-testing-and-evidence-standard.md` | `02-rules/testing-standard.md` | |
| `49-legacy-functionality-inventory.md` | `02-rules/legacy-inventory.md` | |
| `50-module-e2e-coverage-matrix.md` | `02-rules/e2e-coverage.md` | |
| `51-agent-handoff-protocol.md` | `06-governance/handoff-protocol.md` | |
| `52-parallel-worktree-agent-workflow.md` | **DELETED** | superseded by main-only workflow rule in CLAUDE.md |
| `53-runtime-deployment-architecture.md` | `04-capabilities/runtime-deployment.md` | |
| `54-ai-assistant-runtime.md` | `05-ai/assistant-runtime.md` | |
| `55-ai-system-capability-knowledge-base.md` | `05-ai/capability-kb.md` | |
| `96-rounds-index.md` | `09-history/rounds-index.md` | |
| `97-source-of-truth.md` | `97-source-of-truth.md` | rewrite with new paths |
| `98-change-log.md` | `09-history/change-log.md` | |
| `99-risk-register.md` | `09-history/risk-register.md` | |
| `issues/` | `issues/` | unchanged |

## Cross-Reference Update Targets

After all moves, these files contain old-path references that must be updated:

- `CLAUDE.md` (root)
- `docs/system-upgrade/README.md`
- `docs/system-upgrade/97-source-of-truth.md`
- All files in `docs/system-upgrade/**/*.md` (cross-links between docs)
- `docs/modules/**/INDEX.md` and per-module docs
- `docs/ARCHITECTURE.md`
- `docs/UPGRADE_ROADMAP.md`
- Any remaining `docs/design/*.md` references
