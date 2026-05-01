# Adversarial Review — Master Roadmap

**Reviewer:** BMAD `bmad-review-adversarial-general` (Cynical mode)
**Target:** `docs/system-upgrade/03-roadmap/master-roadmap.md` (and supporting docs)
**Date:** 2026-05-01
**Verdict:** 🟡 PROCEED WITH CAVEATS — plan is comprehensive and well-structured, but contains **6 CRITICAL** and **9 HIGH** issues that must be addressed before broad implementation begins.

---

## How to read this report

A cynical review assumes the plan will fail and looks for HOW. Each finding states:
- **Evidence** — the exact line/section and what's there.
- **Why it's a problem** — the failure mode it creates.
- **Recommendation** — concrete change to close the gap.

Severity tiers:
- **CRITICAL** — likely to block or wreck the round if unaddressed.
- **HIGH** — degrades quality, timeline, or trust.
- **MEDIUM** — should be fixed but won't block.
- **LOW** — polish.

---

## CRITICAL findings

### C-01 — Single-trunk workflow contradicts Level 4 risk profile

**Evidence:** `CLAUDE.md §Workflow Rules` mandates direct commits to `master`, no PRs, no feature branches. `bmad/config.yaml` declares `project_level: 4` (enterprise expansion, 40+ stories).

**Why it's a problem:** Level 4 work means database migrations, multi-tenant boundaries, AI billing/audit code — exactly the changes that benefit most from peer review. A single bad commit to `master` ships to production in the next CI run. There's no asynchronous quality gate. The workflow optimizes for solo speed at the cost of catastrophic-error risk on a multi-tenant platform.

**Recommendation:** Either (a) reintroduce a lightweight PR-review step for changes touching `apps/authentication`, `apps/ai_providers`, migrations, or any file in `02-rules/shared-services.md` blacklist; OR (b) document explicitly that the user accepts the failure mode and add compensating controls — pre-commit hooks that block migrations / RBAC changes without a checklist file commit, automated rollback drill weekly, etc. Right now the rule trades safety for velocity without acknowledging the trade.

---

### C-02 — "AI-native" headline contradicts build order

**Evidence:** `master-roadmap §1` opens with "AI is the primary interaction layer." `master-roadmap §5` schedules AI Action Platform at R051 (P2) and Floating Assistant after that (P3). All of P1 (R040–R048) ships zero new AI surface — it's auth, modules, settings, feature flags, audit, secrets.

**Why it's a problem:** The narrative promises AI-first; the schedule delivers an organization platform that happens to have a backend AI gateway. Six-plus months of foundation work before any user sees an "AI-native" experience. If the project is judged on its headline at any milestone before R051 lands, it appears to have missed its own thesis. Stakeholders or future you will ask: "We've been building this for 8 months — where's the AI?"

**Recommendation:** Either (a) reframe the headline as "AI-ready foundation, AI experience later — phase delivery accordingly" and adjust public-facing claims; OR (b) carve a thin AI demonstration path that lands a real AI surface BEFORE R049 — e.g. a minimal "ask the dashboard" overlay using the existing gateway and one read-only action, shipped during P1 to keep the AI thesis visible. Today's `00-control-center.md` lists AI shell as `[ ] not yet scoped` — that's the symptom.

---

### C-03 — R042-BE is the keystone but lives on the "exception-only" repo

**Evidence:** `master-roadmap §5` lists R042-BE (ModuleRegistry sync + CompatLayer) as "🔴 ready" on `platformengineer`. `00-control-center.md` says: "platformengineer is read-only legacy reference… modifications require explicit user authorization." `master-roadmap §5` footer reiterates: "platformengineer is read-only legacy reference."

**Why it's a problem:** R042-BE blocks R043 + R044 + R046 + every module-bound feature. It's the single biggest unblocker in the plan. But the process to start it requires "explicit user authorization in the prompt" because it touches the legacy repo. This means the entire P1 critical path waits on a per-session unblock conversation, not a normal scheduling decision. The contradiction is structural: the rewrite plan needs the legacy repo extended, but the rules say don't extend the legacy repo.

**Recommendation:** Resolve the contradiction explicitly in `master-roadmap`. Two viable options: (a) declare R042–R049 a "joint-repo phase" — temporarily lift the read-only restriction on `platformengineer` for migration backend work, and document the lift as ADR-037; OR (b) accept that the ModuleRegistry must be reimplemented in `platform-ui` (or a new `platform-api` service) and rescope R042-BE accordingly. The current state — keystone work blocked by its own governance rule — guarantees scheduling pain.

---

### C-04 — Helpdesk Phase A is the foundation's only consumer until P3

**Evidence:** `master-roadmap §1-§2` describes Pillar 8 (Experience) and Pillar 3 (Module/Marketplace) as serving "every module." `00-control-center.md` Track A lists Helpdesk as the only specialized module under construction. `10-tasks/helpdesk-phase-a/epic.md` is blocked on R042-BE + R044.

**Why it's a problem:** "Capability with no confirmed consumer is premature abstraction" is a core anti-overengineering rule (`master-roadmap §11` rule #1). The foundation work (R042–R049) is being built for a generic "every module" need, but the only confirmed consumer is Helpdesk. If Helpdesk's actual requirements diverge from what was assumed when designing R042-BE / R045 / R046, large parts of the foundation will be re-implemented, contradicting the rule. The plan violates its own anti-overengineering principle by deferring the first consumer.

**Recommendation:** Build the first foundation slice END-TO-END with Helpdesk as the validating consumer, then extract. Concretely: ship R042-BE minimal (just enough for Helpdesk's `is_module_available("helpdesk")` to work), then Helpdesk Phase A, then R044 minimal (helpdesk nav only), then iterate. Don't build the full R042-BE + R044 + R045 + R046 pyramid upfront — bake in the first consumer at each step.

---

### C-05 — 12 P0 gates assume linear blocking; reality is parallel work loss

**Evidence:** `master-roadmap §4` lists 12 P0 gates with Status column. Six gates show 🔴 not started or blocked. `master-roadmap §5` shows R044 → R046 → R047 → R049 sequential dependency chain.

**Why it's a problem:** Estimated work for R042-BE through R049 (per epic stubs in `10-tasks/`) totals ~45h sequentially. With "single-trunk, single agent" workflow that's ~2 weeks IF nothing breaks. With normal interruptions, debugging, scope creep, and the contradiction in C-03, this becomes 1–2 quarters. During that period zero user-visible features ship. The plan does not articulate a "minimum demo" milestone — what's the stopping point that proves the foundation works before continuing?

**Recommendation:** Define an EXIT GATE at the end of P1: "Helpdesk ticket list visible in production, gated by feature flag, served by Navigation API, with at least one notification flowing through the platform service." Without this gate, P1 can drift indefinitely. Lock the exit gate as a hard deliverable and reduce R042–R049 scope ruthlessly to pass it.

---

### C-06 — Test coverage is mandated per round, not measured project-wide

**Evidence:** `master-roadmap §10` Definition of Done says "Tests run and documented (X passed / Y total)." `02-rules/testing-standard.md` requires security/multi-tenant tests per round. `package.json` has `test:e2e` but no `test:unit` script (Vitest not yet wired per `master-roadmap §3` Phase 1 deliverable).

**Why it's a problem:** Round-level test counts don't compose into project-level coverage. There's no CI gate that says "platform-ui code coverage cannot drop below X%." Without that, every round can pass DoD while the overall coverage trends downward. Worse, no `npm run test:unit` exists today — round-level "tests pass" claim for platform-ui is currently E2E-only, which catches integration but misses unit-level regressions.

**Recommendation:** (a) Add Vitest + an initial unit test sweep within the next R041 sub-round; (b) add a CI gate that compares coverage against a baseline file checked into the repo, fails PRs (or master push) that drop coverage; (c) explicit per-layer coverage targets: `lib/api/` ≥ 90%, `lib/hooks/` ≥ 80%, `components/shared/` ≥ 70%.

---

## HIGH findings

### H-01 — R045 crams Feature Flags + Settings into one round

**Evidence:** `master-roadmap §5` row R045: "Feature Flags + Settings Engine, ⬜ ready, ~6h." `10-tasks/R045-feature-flags-settings/epic.md` lists 7 tasks across both subsystems.

**Why it's a problem:** Feature Flags and Settings have different consumers, different access patterns, different cache invalidation rules, different security surfaces (PII masking on settings, plan-tier on flags). 6h estimate for both is optimistic by 50–100%. Bundling encourages "land both at once" pressure, which raises the chance of partial regression in one when fixing the other.

**Recommendation:** Split to R045A (Feature Flags) and R045B (Settings). Sequence: R045A first (smaller surface, immediate value to FeatureGate consumers), then R045B (depends on R045A's caching pattern lessons). Adjust `master-roadmap §5` accordingly.

---

### H-02 — R048 LLM cleanup partial-ready depends on R043 routing for full value

**Evidence:** `master-roadmap §5` row R048 status `🟡 partial-ready`. Note: "Simple gateway migrations: no extra dep. Full cleanup: R043 preferred." Epic `10-tasks/R048-llm-cleanup/epic.md` Task T01-T03 are "P0 simple" and unblocked.

**Why it's a problem:** Splitting R048 into "do the easy half now, hard half after R043" introduces a long open window (P1) where the codebase has TWO migration patterns active simultaneously: (a) old direct imports, (b) new gateway calls. Developers writing new AI code during this window will copy the nearest example — easy 50/50 odds of perpetuating the old pattern. The CI gate that would prevent this (`check_no_direct_llm_imports.py`) is itself dependent on R041A and is not yet enforced.

**Recommendation:** Activate `check_no_direct_llm_imports.py` as a NON-blocking warning in CI immediately (lift it from R041A's strict "blocking" requirement to a "warn-only" mode). This stops new violations during the cleanup window without requiring R041A to fully merge. Then the R048 cleanup pace becomes a pure refactor concern, not a regression-prevention concern.

---

### H-03 — Module manager R038A–R038I sub-track is not in master-roadmap §5

**Evidence:** `04-capabilities/module-manager-redesign.md` has its own R038A–R038I sub-rounds (referenced in legacy doc 35 §Pre-Launch Gate Summary). Master-roadmap §5 shows R040–R049 only. The relationship between R038x labels and R040+ labels is implicit.

**Why it's a problem:** Round numbers exist in two namespaces. `00-control-center.md §11` has a note about this (R023→R033 mapping), but R038x is an entirely separate scheme. Anyone joining the project mid-stream will struggle to reconcile "R038C is read model" with "R042-BE is ModuleRegistry sync." The risk is duplicate work or skipped work because the same capability appears under two labels.

**Recommendation:** Update `master-roadmap §5` table to include the canonical R038A–R038I phases as either (a) sub-rows under R042-BE / R045 / etc. or (b) explicit aliases ("R042-BE = R038C read model"). Then either retire the R038x labels everywhere or adopt them as the canonical Module Manager track and retire the R042-BE name. Pick one.

---

### H-04 — "30-day destructive migration gap" without emergency-bypass procedure

**Evidence:** `master-roadmap §8` rule 3: "Destructive migrations: 30-day minimum gap + gate + backup + rollback plan."

**Why it's a problem:** No clause for emergency. If a security vulnerability requires immediate column drop (e.g., a leaked secrets column), the rule blocks the fix. The implicit assumption is that you'll discover the need 30 days in advance, which historically doesn't hold for security work.

**Recommendation:** Add an "emergency-override" subsection: who can authorize, what evidence is required (severity assessment + incident-response ticket), what compensating controls (extra audit, post-mortem, retroactive compatibility-layer pattern even after the fact). Without this, the rule will be quietly broken when needed and the discipline erodes.

---

### H-05 — R049 Data Sources Hub is a 10-hour round in 1 epic

**Evidence:** `10-tasks/R049-data-sources-hub/epic.md` self-decomposes to 3 batches (Schema 3h, Policy 4h, Sync+Audit 3h) totaling 10h. Says "multi-task — likely 2 sittings."

**Why it's a problem:** A 10h round is closer to a sub-phase than a round. Mid-flight context loss between sittings raises the risk of inconsistent decisions across batches (e.g., naming, error format, audit field shape). A round that needs "2 sittings" should be 2 rounds.

**Recommendation:** Split to R049A (Schema), R049B (Policy enforcement), R049C (Sync + audit). Each is 3–4h, completable in one sitting, has its own DoD. The current epic.md structure is already half-way there; just promote the batches to rounds.

---

### H-06 — Test "evidence: paste counts on completion" is human-trustworthy only

**Evidence:** Multiple task files (e.g., `10-tasks/R042-BE-module-registry/tasks/T07-coverage-tests.md`) require "Evidence: paste `pytest …` output." `master-roadmap §10` DoD: "Tests run and documented (X passed / Y total)."

**Why it's a problem:** Pasted test output is unverifiable after the fact. There's no commit hook or CI artifact that says "this commit ran tests, here's the output, verified." Six months from now, "paste counts" entries become indistinguishable from each other; nobody re-reads them; if a test was actually skipped or never ran, it's invisible.

**Recommendation:** Replace "paste counts" with "CI run URL" in DoD. A commit cannot close a task unless it has a green CI build. The current `cd-deploy-dual.yml` workflow can be extended to publish artifact URLs into a structured commit trailer (`Tests-CI: <url>`). This shifts evidence from prose to verifiable link.

---

### H-07 — "Polling before SSE" rule has no exit criterion

**Evidence:** `master-roadmap §9` rule 11: "Real-time features start with polling. SSE is added only when polling causes measurable UX problems."

**Why it's a problem:** "Measurable UX problems" is not a definition. With no metric or threshold, every team will read this rule as "we can keep polling forever," which becomes the de facto state. The rule prevents premature SSE but also prevents necessary SSE.

**Recommendation:** Define the threshold: "If a polled view shows stale data >5 seconds for a user-facing state change in normal operation (p95 latency from event to UI), upgrade to SSE." Or pick another concrete metric. Rule with no exit criterion = rule that's never followed in practice.

---

### H-08 — `nav-items.ts` hardcoded but no migration plan

**Evidence:** `components/shell/nav-items.ts` referenced in `bmad-scan/source-tree-analysis.md` as "⚠ HARDCODED until R044 Navigation API." `master-roadmap §5` row R044 status `🔴 blocked`.

**Why it's a problem:** Adding a new module today means editing `nav-items.ts` (forbidden by capability-first rule) and patching the DB (R044 not built). There's no documented migration recipe — every new module's first task collides with this gap. Helpdesk Phase A epic does not address this; it just notes the dependency.

**Recommendation:** Document the temporary procedure in `nav-items.ts` itself: "Until R044 is live, new modules add an entry here AND backfill on R044 deploy by migrating their entry into the manifest's nav section." Or split R044 into a tiny "manifest reads nav-items.ts" pre-cursor that lets each module own its own nav from day one.

---

### H-09 — AI Provider Gateway built but "calls not wired" — billing claim vs reality

**Evidence:** `00-control-center.md §Foundation Gates` table: "G-Billing | AIUsageLog written for all LLM calls | 🟡 Gateway exists, calls not wired."

**Why it's a problem:** The platform claims governed AI billing as a core differentiator (`master-roadmap §1` non-negotiable #1). But P0 status shows billing is not actually written for most calls. Until R048 closes, every dollar of LLM cost flowing through bypassed paths is unbilled and unaudited. If a paying customer asks "show me my AI usage" today, the answer would be incomplete.

**Recommendation:** Add a "user-visible billing accuracy" metric in `09-history/risk-register.md` if not already there, with the specific risk: "AI billing reports under-count actual cost by X% until R048 closes." The risk frames this as an ongoing financial accuracy gap (potential customer-trust issue), not just an engineering gap.

---

## MEDIUM findings

### M-01 — Phase 5 "Hardening" puts security after features
`master-roadmap §3` schedules accessibility, OpenTelemetry, multi-region DR, Jinja2 decommission to P5. Security hardening is reactive, not embedded. Recommendation: make at least 3 P5 items continuous gates rather than terminal-phase items (a11y check on every UI round; OpenTelemetry trace on every new endpoint).

### M-02 — `master-roadmap §3` table has Phase numbers that overlap rounds
P1 = R040–R048, P2 = R048–R053. R048 belongs to both. Recommendation: pick one or document the overlap.

### M-03 — `02-rules/development-rules.md` rule "no capability without confirmed consumer" not actually enforced
There's no checklist item or CI gate that verifies a new shared component has a non-test consumer. Recommendation: add a pre-commit script that flags new files in `components/shared/` whose import graph has no callers in `components/modules/` or `app/`.

### M-04 — Voice agent claimed "operational on EKS" with no test reference
`master-roadmap §2` Pillar 5 status: "voice operational on EKS." No automated regression suite for voice referenced anywhere in `02-rules/testing-standard.md`. If voice silently degrades, nothing catches it. Recommendation: add a voice-specific E2E (or synthetic monitor) before R051.

### M-05 — `00-control-center.md` "Recent Rounds" still says "next: Cap 02 StatCard" — stale
Cap 02 is done (R041G). Recommendation: this file is supposed to be the live status; ensure post-round update is a hard step in the round-close DoD (it already is — but the symptom shows discipline lapsing).

### M-06 — `bmad-scan/` and `docs/system-upgrade/` are parallel hierarchies
This review's existence creates a doc duplication risk. Recommendation: BMAD scan output is a summary-pointer index — never a source of truth. Add a banner to every BMAD scan file: "Authoritative source: `docs/system-upgrade/...`. This file is a navigation aid only."

### M-07 — `_template/` round folder has no README explaining usage
Recommendation: 1-paragraph README in `10-tasks/_template/` describing copy-paste protocol.

### M-08 — Round IDs include letters but ordering is ambiguous
R041A, R041B, R041D-UI, R041E, R041F, R041G — does R041D come before or after R041D-UI? Is R041C alphabetically before R041D-UI? Not stated. Recommendation: define ordering convention in `master-roadmap §5` ("sub-letters scheduling label") more explicitly.

---

## LOW findings

### L-01 — `master-roadmap §11` rule 7 "Deprecation-first refactoring" is good but unenforced
Add as a checklist item in the round-checklist.

### L-02 — Mermaid/ASCII diagrams referenced in task files but no linting
A diagram that doesn't render is worse than no diagram. Recommendation: add a docs-build CI step that fails if mermaid syntax is invalid.

### L-03 — `i18n` mentioned per round but no auto-extraction
Hardcoded strings will accumulate. Recommendation: post-merge job that lists strings not in `messages/he.json`.

### L-04 — Naming inconsistency: "platform-ui" vs "Platform UI" vs "Platform Engineer UI"
`CLAUDE.md` opens with "Platform Engineer UI"; `master-roadmap` uses "ResolveAI Platform"; `bmad-scan/index.md` uses "platform-ui." Pick one user-visible name.

### L-05 — `_legacy/README.md` says files "may be deleted in a future cleanup" with no trigger
Either schedule the deletion (round + date) or commit to keeping forever and remove the maybe-language.

---

## Cross-cutting risks

### R-A — Documentation drift risk (HIGH)
The ratio of docs-to-code is now extreme: `docs/system-upgrade/` has 50+ files; the codebase has ~150 source files. Every code change risks invalidating multiple docs. Without an automated linkcheck + freshness gate, this drift is mathematically certain.

**Recommendation:** Add a CI step that:
1. Checks all internal markdown links resolve.
2. Flags any doc whose mentioned file paths don't exist in the codebase.
3. Reports the most-stale docs (last modified > 60 days while source files in their referenced paths changed).

### R-B — "Read-only platformengineer" governance creates dual-track friction (HIGH)
Most P1 work IS in platformengineer. Each round needs explicit user authorization. This creates approval-fatigue for the user and irregular implementation pacing. See C-03.

### R-C — Solo single-trunk on a Level 4 platform is a single point of failure (CRITICAL)
If the user is unavailable for any extended period, master is the only branch, no PRs queued, no parallel work isolated. The plan has no continuity story. See C-01.

---

## Recommended response

1. **Hold P1 work** until C-03 (R042-BE governance contradiction) is resolved with an ADR.
2. **Add an exit gate** at end of P1 per C-05 — Helpdesk ticket list visible in production.
3. **Reframe AI thesis** per C-02 — pick (a) reframe or (b) inject demo path.
4. **Split R045 + R049** per H-01, H-05.
5. **Activate LLM import warning** per H-02.
6. **Document workflow trade-off** per C-01 — accept or compensate.
7. **Wire CI evidence** per H-06.

These 7 items unblock most of the rest.

---

## Sign-off

This review is intentionally adversarial. Many findings will be partly answered "yes we know, here's why we accept it." Document those answers as ADRs in `08-decisions/decision-log.md`. Findings without ADR responses become open questions in `08-decisions/open-questions.md`.

Continue to `bmad-check-implementation-readiness` only after at least the 6 CRITICAL findings have a documented response (accept / mitigate / fix).
