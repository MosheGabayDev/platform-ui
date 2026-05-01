# System Upgrade Planning Workspace

Living source of truth for the modernization of `platformengineer` (Flask backend) into the `platform-ui` (Next.js frontend-first, API-driven) product architecture.

> **Active phase:** P1 — Foundation Gates (R040–R048). See `00-control-center.md`.

---

## Where to start

1. **`00-control-center.md`** — what's active, what's blocked, what to start next.
2. **`03-roadmap/master-roadmap.md`** — single source of truth for the plan: vision, pillars, phases, gates, build order.
3. **`02-rules/development-rules.md`** — non-negotiable rules every contributor follows.
4. **`10-tasks/<round>/`** — atomic ≤2h task breakdown per active round.

---

## Folder Structure

```
docs/system-upgrade/
├── README.md                ← this file
├── 00-control-center.md     ← active round, blockers, gates, do-not-start list
├── 97-source-of-truth.md    ← which file owns which concern
│
├── 01-foundations/          ← assessments and target state
│   ├── 01-executive-summary.md
│   ├── 02-current-system.md
│   ├── 03-product-needs.md
│   ├── 04-tech-inventory.md
│   ├── 05-architecture-current.md
│   ├── 06-ux-assessment.md
│   ├── 07-security.md
│   ├── 08-scalability.md
│   ├── 09-tech-debt.md
│   ├── 10-architecture-target.md
│   └── 01-foundations/11-recommended-tech-stack.md
│
├── 02-rules/                ← mandatory rules and standards
│   ├── development-rules.md
│   ├── shared-services.md          (ADR-028)
│   ├── testing-standard.md
│   ├── legacy-inventory.md         (per-module template)
│   └── e2e-coverage.md             (per-module template)
│
├── 03-roadmap/              ← single SSOT plan
│   ├── master-roadmap.md           ← THE plan
│   ├── action-backlog.md
│   ├── modernization-opportunities.md
│   └── _legacy/                    ← archived 12+35+47 (audit only)
│
├── 04-capabilities/         ← shared platform capability specs
│   ├── catalog.md                  (capability inventory)
│   ├── module-system.md
│   ├── module-manager-redesign.md
│   ├── module-manager-inventory.md
│   ├── oss-layer.md
│   ├── runtime-deployment.md
│   └── auth-bridge.md
│
├── 05-ai/                   ← all AI specs in one place
│   ├── action-platform.md
│   ├── canonical-terms.md          (consistency-pass)
│   ├── floating-assistant.md
│   ├── assistant-runtime.md
│   ├── capability-kb.md
│   ├── provider-gateway.md
│   ├── providers-hub.md
│   └── llm-migration.md            (direct-import audit)
│
├── 06-governance/           ← process, handoff, checklists
│   ├── round-checklist.md
│   ├── handoff-protocol.md
│   ├── module-migration-progress.md
│   ├── ai-maintainability.md
│   └── consistency-pass.md
│
├── 07-audits/               ← one-off audit reports
│   ├── cross-platform-structure.md
│   ├── security-hardening.md
│   └── production-security-headers.md
│
├── 08-decisions/            ← ADRs and open questions
│   ├── decision-log.md
│   └── open-questions.md
│
├── 09-history/              ← audit trail
│   ├── rounds-index.md
│   ├── change-log.md
│   └── risk-register.md
│
├── 10-tasks/                ← atomic ≤2h task breakdowns per round
│   ├── README.md                   (task structure standard)
│   └── R{NNN}-<slug>/
│       ├── epic.md
│       └── tasks/T01-….md
│
└── issues/                  ← GitHub issue drafts
```

---

## Workflow

- **Single trunk on `master`** — see `../../CLAUDE.md §Workflow Rules`. No feature branches, no worktrees, no PRs.
- **Atomic tasks** — every round is broken into ≤2h units under `10-tasks/<round>/`. Pick one, complete it, commit, push, next.
- **Update governance docs after each task:** `09-history/rounds-index.md`, `09-history/change-log.md`, `03-roadmap/action-backlog.md`, `06-governance/module-migration-progress.md` (if module touched).

---

## What this is not

- Not a task management system — that's GitHub Issues + `10-tasks/`.
- Not a code review document — that's git history.
- Not an operational runbook — see `DOCS/` in `platformengineer`.

---

_First populated 2026-04-23. Reorganized 2026-05-01 — flat numeric layout (00–55) merged into themed folders; three overlapping roadmaps consolidated into `03-roadmap/master-roadmap.md`._
