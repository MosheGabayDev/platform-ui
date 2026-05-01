# Reorg Coverage Audit — Old Plan vs New Plan

**Date:** 2026-05-01
**Audit goal:** Verify the post-reorg `docs/system-upgrade/` contains all content from the pre-reorg layout. Nothing critical lost.

**Verdict: 🟢 PASS WITH 3 SMALL FIXES** — 49/55 files identical (R100 git rename detection); 3 merged to `master-roadmap.md` with originals preserved at `_legacy/`; 1 deliberately retired; 2 rewrote with broader content (README, 97-SoT). Two gap items in 97-SoT were missing — fixed in this audit. One enhancement to the high-risk-commit gate was made.

---

## File-by-file mapping (55 source files)

### Group A — R100 renames (49 files, 100% content preserved)

Git's rename-detection (`R100`) confirms these files moved with identical content:

| Old path | New path |
|---|---|
| `00-executive-summary.md` | `01-foundations/01-executive-summary.md` |
| `00-implementation-control-center.md` | `00-control-center.md` (root) |
| `01-current-system-analysis.md` | `01-foundations/02-current-system.md` |
| `01-round-review-checklist.md` | `06-governance/round-checklist.md` |
| `02-development-rules.md` | `02-rules/development-rules.md` |
| `02-product-needs-inferred.md` | `01-foundations/03-product-needs.md` |
| `03-module-migration-progress.md` | `06-governance/module-migration-progress.md` |
| `03-technology-inventory.md` | `01-foundations/04-tech-inventory.md` |
| `04-architecture-assessment.md` | `01-foundations/05-architecture-current.md` |
| `05-ui-ux-assessment.md` | `01-foundations/06-ux-assessment.md` |
| `06-security-assessment.md` | `01-foundations/07-security.md` |
| `07-scalability-maintainability.md` | `01-foundations/08-scalability.md` |
| `08-technical-debt-register.md` | `01-foundations/09-tech-debt.md` |
| `09-modernization-opportunities.md` | `03-roadmap/modernization-opportunities.md` |
| `10-target-architecture.md` | `01-foundations/10-architecture-target.md` |
| `11-recommended-tech-stack.md` | `01-foundations/11-recommended-tech-stack.md` |
| `13-open-questions.md` | `08-decisions/open-questions.md` |
| `14-decision-log.md` | `08-decisions/decision-log.md` (extended with ADRs 037-042) |
| `15-action-backlog.md` | `03-roadmap/action-backlog.md` |
| `16-auth-bridge-design.md` | `04-capabilities/auth-bridge.md` |
| `23-ai-maintainability-and-code-cleanup.md` | `06-governance/ai-maintainability.md` |
| `24-core-platform-and-module-system.md` | `04-capabilities/module-system.md` |
| `25-open-source-capability-layer.md` | `04-capabilities/oss-layer.md` |
| `26-platform-capabilities-catalog.md` | `04-capabilities/catalog.md` |
| `28-cross-platform-structure-audit.md` | `07-audits/cross-platform-structure.md` |
| `30-security-hardening-audit.md` | `07-audits/security-hardening.md` |
| `31-production-security-headers.md` | `07-audits/production-security-headers.md` |
| `36-ai-action-platform.md` | `05-ai/action-platform.md` |
| `38-floating-ai-assistant.md` | `05-ai/floating-assistant.md` |
| `39-ai-architecture-consistency-pass.md` | `05-ai/canonical-terms.md` |
| `40-ai-provider-gateway-billing.md` | `05-ai/provider-gateway.md` |
| `41-direct-llm-call-audit-and-migration.md` | `05-ai/llm-migration.md` |
| `42-master-plan-consistency-and-readiness.md` | `06-governance/consistency-pass.md` |
| `43-shared-services-enforcement.md` | `02-rules/shared-services.md` |
| `44-ai-providers-hub.md` | `05-ai/providers-hub.md` |
| `45-module-manager-redesign.md` | `04-capabilities/module-manager-redesign.md` |
| `46-module-manager-implementation-inventory.md` | `04-capabilities/module-manager-inventory.md` |
| `48-testing-and-evidence-standard.md` | `02-rules/testing-standard.md` |
| `49-legacy-functionality-inventory.md` | `02-rules/legacy-inventory.md` |
| `50-module-e2e-coverage-matrix.md` | `02-rules/e2e-coverage.md` |
| `51-agent-handoff-protocol.md` | `06-governance/handoff-protocol.md` |
| `53-runtime-deployment-architecture.md` | `04-capabilities/runtime-deployment.md` |
| `54-ai-assistant-runtime.md` | `05-ai/assistant-runtime.md` |
| `55-ai-system-capability-knowledge-base.md` | `05-ai/capability-kb.md` |
| `96-rounds-index.md` | `09-history/rounds-index.md` |
| `98-change-log.md` | `09-history/change-log.md` |
| `99-risk-register.md` | `09-history/risk-register.md` |
| `issues/R040-R049-issue-drafts.md` | `issues/R040-R049-issue-drafts.md` (unchanged) |
| `issues/R041D-secrets-gate-baseline-cleanup.md` | `issues/R041D-secrets-gate-baseline-cleanup.md` (unchanged) |

**Verification:** `git log --diff-filter=R --name-status` shows R100 (100% content match) for all 49.

✅ **No content lost.** Cross-references inside these files were updated by the bulk-rewrite script in commit `86a6dcc`.

---

### Group B — Merged to master-roadmap.md, originals at `_legacy/` (3 files)

| Old path | New paths |
|---|---|
| `12-migration-roadmap.md` | (a) `03-roadmap/_legacy/12-migration-roadmap.md` (R100 — full original) (b) Folded into `03-roadmap/master-roadmap.md §3 Phases, §8 Existing-DB-First, §9 Migration Principles` |
| `35-platform-capabilities-build-order.md` | (a) `03-roadmap/_legacy/35-platform-capabilities-build-order.md` (R100) (b) Folded into `03-roadmap/master-roadmap.md §5 Build Order, §6 Dependency Graph, §11 Anti-Overengineering` |
| `47-generic-platform-foundation-roadmap.md` | (a) `03-roadmap/_legacy/47-generic-platform-foundation-roadmap.md` (R100) (b) Folded into `03-roadmap/master-roadmap.md §1 Vision, §2 Pillars, §4 P0 Foundation Gates` |

**Spot-checks against master-roadmap §:**

- ✅ §1 Vision text matches doc 47 §2 Vision intent (AI-native, modular, three non-negotiables).
- ✅ §2 Pillars table has all 10 pillars from doc 47 §3 (Identity, Org/Tenant, Module/Marketplace, Data/Knowledge, AI Operation, Data Sources, Workflow/Automation, Experience, Billing, Operations).
- ✅ §3 Phases has 6 phases matching doc 12 (Phase 0–4) extended with P5 Hardening.
- ✅ §4 P0 Gates lists all 12 from doc 47 §6 Missing P0 Foundations.
- ✅ §5 Build Order has all R040–R049 rounds from `00-control-center.md` plus the new `-min` slice rounds (per ADR-040).
- ✅ §6 Dependency Graph reproduces doc 47 §7 graph structure.
- ✅ §8 Existing-DB-First Migration Principle copies doc 12 §"Existing DB First" rules verbatim.
- ✅ §9 Migration Principles lists 12 items derived from doc 12 §"Migration Principles" (10 in original, 2 new).

**What lives in `_legacy/` that DIDN'T get folded into master-roadmap:**

The `_legacy/` archive preserves these for audit / deep reference:

- Full prose explaining each capability dependency edge (master-roadmap shows the graph; legacy has paragraphs for each)
- R023–R032 historical round labels (master-roadmap uses R040+ labels; legacy retains the R023–R032 mapping for back-references)
- doc 47 §9 (Data Sources & Knowledge Connections full schema spec) — partial content only in master-roadmap; full in `_legacy/47…`
- doc 47 §4 Capability Inventory by domain (11 domains × ~10 capabilities) — too detailed for master-roadmap; available in `_legacy/`
- doc 47 §13 Risks register — overlaps with `09-history/risk-register.md`
- doc 47 §17 Open questions — overlaps with `08-decisions/open-questions.md`

✅ **Decision: keep `_legacy/` indefinitely** as canonical source for the deep prose. master-roadmap is the SSOT for plan-level decisions; `_legacy/` is the SSOT for the deep capability/pillar prose. Both are valid reads. (See `_legacy/README.md` which notes "may be deleted in future cleanup once full content is verified" — this audit is that verification, and the recommendation is to KEEP, not delete.)

---

### Group C — Deliberately retired (1 file)

| Old path | Disposition |
|---|---|
| `52-parallel-worktree-agent-workflow.md` | DELETED in commit `2e1f62a`. Document was ALREADY marked `SUPERSEDED 2026-04-26 — branch-only workflow adopted` at the top. ADR-037 (single-trunk on master) further superseded the branch model. |

**Content audit of doc 52 — what was lost vs preserved:**

| §  | Topic | Status |
|---|---|---|
| §1 | Purpose (worktrees for parallel agents) | OBSOLETE — single-agent main-only per ADR-037; intentional removal |
| §2 | Directory convention (`worktrees/<repo>-<round>-<desc>`) | OBSOLETE — no worktrees |
| §3 | Branch naming (`feat/r<NNN>-<slug>`) | OBSOLETE — main-only per CLAUDE.md §Workflow Rules |
| §4 | Worktree creation commands | OBSOLETE |
| §5 | Agent assignment contract | OBSOLETE |
| §6 | Parallel safety rules | OBSOLETE |
| §6.1 | Shared docs reconciliation rule | PRESERVED — captured in ADR-037 compensating control #1 (high-risk file allowlist + checklist requirement) |
| §7 | **Central File Lock List** | PRESERVED → `scripts/check-high-risk-commit.mjs` patterns. AUDIT FINDING: the lock list was incomplete in the gate; FIXED in this audit (see "Fixes applied" below). |
| §8 | Safe and unsafe parallel tracks | OBSOLETE — single-trunk |
| §9 | PR workflow | OBSOLETE — no PRs per CLAUDE.md |
| §10 | Cleanup | OBSOLETE |

✅ **No content lost.** The only piece of doc 52 that remains relevant in the main-only world is the high-risk file list, which IS preserved (with audit fixes — see below).

---

### Group D — Rewritten in place (2 files)

| Path | Disposition |
|---|---|
| `README.md` (root of system-upgrade) | Rewritten in commit `86a6dcc`. New version is a SUPERSET of the old: includes all old sections (Purpose, File Organization, How to Update, What This Is Not) plus full folder structure tree + Workflow Rules pointer + entry-point guidance for the 4 first-read docs. |
| `97-source-of-truth.md` | Rewritten in commit `86a6dcc`. New has 89 table rows vs old's 69 — covers more concerns. AUDIT FINDING: 2 entries from old were missing → FIXED in this audit. |

✅ **No content lost** in README.

⚠ **2 entries missing** in new 97-SoT (FIXED below):
- `docs/UPGRADE_ROADMAP.md` (Deep upgrade roadmap) — file exists, was registered in old 97; not in new 97.
- `issues/R040-R049-issue-drafts.md` and `issues/R041D-…` — files exist, were registered in old 97; not in new 97.

---

## Fixes applied during this audit

### Fix 1 — Restore missing entries to `97-source-of-truth.md`

Added rows for:
- Deep upgrade roadmap (`docs/UPGRADE_ROADMAP.md`)
- Implementation issue drafts (`issues/R040-R049-issue-drafts.md`)
- Round-specific issue drafts (`issues/R041D-…` and future)

### Fix 2 — Extend high-risk-commit gate to cover all of doc 52 §7's locked file list

`scripts/check-high-risk-commit.mjs` was missing patterns for:
- `apps/__init__.py` (Flask app factory — global blast radius)
- `apps/module_manager/models.py` (OrgModule registry — central)
- `middleware.ts` (Auth + route protection)
- `app/api/proxy/[...path]/route.ts` (Proxy — consumed everywhere)
- `components/ui/**` (read-only shadcn primitives — modification = anti-pattern)

These have been added to the gate's `HIGH_RISK_PATTERNS`.

### Fix 3 — Document the `_legacy/` retention decision

Updated `03-roadmap/_legacy/README.md` to reflect this audit's recommendation: keep indefinitely (do NOT delete in a future cleanup) because the deep prose has no equivalent in master-roadmap.

---

## Cross-cutting verification

### Folder structure completeness

Themes covered in the new layout (verified per the structure tree in `README.md`):
- ✅ `01-foundations/` — assessments + targets (11 files)
- ✅ `02-rules/` — non-negotiable rules (5 files)
- ✅ `03-roadmap/` — SSOT plan + supplementary + `_legacy/` archive
- ✅ `04-capabilities/` — shared platform specs (7 files)
- ✅ `05-ai/` — all AI specs (8 files)
- ✅ `06-governance/` — process + handoff (5 files)
- ✅ `07-audits/` — one-off reports (3 files)
- ✅ `08-decisions/` — ADRs + open questions (2 files)
- ✅ `09-history/` — rounds, change log, risks (3 files)
- ✅ `10-tasks/` — atomic task breakdown (NEW — 9 epics + AI-shell-A complete)
- ✅ `issues/` — GitHub issue drafts (2 files unchanged)

**Total file count:** 49 themed + 3 root (README, 00-control-center, 97-source-of-truth) + 3 `_legacy/` originals + tasks structure = **complete**.

### CLAUDE.md alignment

`CLAUDE.md` was updated in commit `6b019be` to reference the new paths in §Must-Read and §Workflow Rules. Per-task evidence pasting (`Tests-CI: <url>`) added in commit `470c3b7` per ADR-042. ✅

### ADR continuity

- ADR-001..036 from `_legacy/47…` and `08-decisions/decision-log.md` — preserved.
- ADR-037..042 (response to adversarial review) — added in commit `3495b27`.
- Cross-references between ADRs and master-roadmap — verified (master-roadmap §1, §5 explicitly cite ADR-038, ADR-039, ADR-040, ADR-041 sections).

---

## Summary

**Files audited:** 55 source files in pre-reorg `docs/system-upgrade/`.

| Outcome | Count |
|---|---|
| R100 rename, content identical | 49 |
| Merged to `master-roadmap.md` + preserved at `_legacy/` (R100 to legacy + folded content) | 3 |
| Deliberately retired (worktree workflow superseded by main-only) | 1 |
| Rewritten in place, content superset | 2 (README, 97-SoT) |

**Net loss of substantive content:** **ZERO.**

**Fixes applied:**
- 2 entries restored to `97-source-of-truth.md` (UPGRADE_ROADMAP.md, issues/)
- 5 patterns added to high-risk-commit gate (covering all of doc 52 §7 lock list)
- `_legacy/README.md` retention decision documented

**Recommendation:** **🟢 APPROVED.** The new plan is structurally cleaner than the old AND has strictly more content (89 SoT rows vs 69, broader README, ADRs 037-042, BMAD pipeline outputs, full 10-tasks structure with AI-shell-A complete).
