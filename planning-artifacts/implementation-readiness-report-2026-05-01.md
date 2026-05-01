# Implementation Readiness Assessment Report

**Date:** 2026-05-01
**Project:** platform-ui (Level 4)
**Assessor:** BMAD `bmad-check-implementation-readiness`
**Scope:** Validate PRD-equivalent (master-roadmap), UX, Architecture, and Epics for implementation readiness — with focus on **AI-shell-A** (first target round per user request).

---

## Step 1 — Document Discovery

### PRD-equivalent

✅ `docs/system-upgrade/03-roadmap/master-roadmap.md` — Master Roadmap acts as PRD. Vision, pillars, phases, gates, build order all defined. Updated 2026-05-01 with AI delivery phasing per ADR-038.

### UX / Design

✅ `docs/design/` — full design system:
- `DESIGN_SYSTEM.md` — visual language, colors, spacing, typography
- `TOKENS.md` — CSS variables, animation timing, z-index scale
- `ANIMATIONS.md` — motion rules + Framer Motion variant library
- `COMPONENTS.md` — component patterns + anti-patterns
- `MOBILE.md` — mobile rules, PWA, iOS Safari specifics

### Architecture

✅ Two complementary docs:
- `docs/ARCHITECTURE.md` — full Next.js architecture blueprint
- `docs/system-upgrade/01-foundations/10-architecture-target.md` — target full-stack
- `docs/bmad-scan/architecture.md` — BMAD scan summary (cross-references both)

### Epics + Stories

🟡 **Partial**:
- 9 epic stubs in `docs/system-upgrade/10-tasks/`
- 2 epics fully decomposed to tasks (R042-BE: 7 tasks; AI-shell-scoping: 7 tasks)
- 7 epics still stub-only (R043, R044, R045, R046, R047, R048, R049, helpdesk-phase-a)
- AI-shell-scoping is a **scoping** round, not a **build** round — produces 3 future build rounds (AI-shell-A/B/C) per its T07. AI-shell-A epic itself **does not yet exist**.

### ADRs

✅ 36 ADRs total (ADR-001 through ADR-042, with 033-036 in legacy doc 47, formal log goes 001-032 + 037-042). 6 new ADRs (037-042) respond to the adversarial review CRITICALs.

### Open Questions

🟡 `docs/system-upgrade/08-decisions/open-questions.md` exists but content unknown — needs read.

### Risk Register

✅ `docs/system-upgrade/09-history/risk-register.md` exists with R01–R20+ risks.

---

## Step 2 — PRD Analysis

### Completeness

| PRD section | Status | Evidence |
|---|---|---|
| Vision / problem statement | ✅ | `master-roadmap §1` |
| Target users | ✅ | `master-roadmap §1` Target users list (9 user types) |
| Target organizations | ✅ | `master-roadmap §1` 10 verticals as modules |
| Functional pillars | ✅ | `master-roadmap §2` 10 pillars with status |
| Phases / milestones | ✅ | `master-roadmap §3` 6 phases P0-P5 |
| Acceptance criteria (P1) | ✅ NEW | `00-control-center §P1 Exit Gate` 8 concrete items (added by ADR-041) |
| Build order | ✅ | `master-roadmap §5` round table |
| Capability dependency graph | ✅ | `master-roadmap §6` |
| Pre-launch gates | ✅ | `master-roadmap §7` |
| Migration principles | ✅ | `master-roadmap §8-§9` |
| Anti-overengineering rules | ✅ | `master-roadmap §11` |

### PRD Quality

✅ **STRONG** — the master-roadmap is among the most thorough PRDs reviewable: explicit anti-patterns, explicit out-of-scope items, dependency-aware build order, named consumers, and (post-ADR-040) sliced delivery.

### Issues found

- ⚠ **PRD-1 (MEDIUM):** §5 round table has no estimate column — eyeballing total P1 effort requires opening each `epic.md` (each lists Estimate). Add an "Est" column to §5 for at-a-glance planning.
- ⚠ **PRD-2 (LOW):** §3 phases use rough timelines like "R048–R053" but no calendar dates; for a Level 4 plan with stakeholders, anchor at least P1 completion target to a calendar date.
- ⚠ **PRD-3 (MEDIUM):** §5 does not yet show the `-min` rounds from ADR-040. The slicing is decided but not yet reflected in the plan table. Action item from ADR-040 not yet applied.

---

## Step 3 — Epic Coverage Validation

### Coverage matrix: PRD requirement → Epic

| PRD requirement (master-roadmap §) | Required round | Epic exists? | Tasks split? |
|---|---|---|---|
| §4 Gate 1 — OrgModule schema | R040 | ✅ done | n/a (round complete) |
| §4 Gate 3 — CI enforcement | R041A | 🟡 ready | ❌ no epic stub |
| §4 Gate 4 — ActionButton + DetailView | R041B+R041C | ✅ partially done | n/a |
| §4 Gate 5 — ModuleRegistry sync | R042-BE | ✅ epic + 7 tasks | ✅ |
| §4 Gate 6 — AI Routing Matrix | R043 | ✅ epic stub | ❌ |
| §4 Gate 7 — Navigation API | R044 | ✅ epic stub | ❌ |
| §4 Gate 8 — Feature Flags + Settings | R045 | ✅ epic stub | ❌ |
| §4 Gate 9 — AuditLog + Notifications | R046 | ✅ epic stub | ❌ |
| §4 Gate 10 — API Keys + Secrets | R047 | ✅ epic stub | ❌ |
| §4 Gate 11 — LLM cleanup | R048 | ✅ epic stub | ❌ |
| §4 Gate 12 — Data Sources Hub | R049 | ✅ epic stub | ❌ |
| ADR-038 — AI demo slice | R049.5 | ❌ no epic | ❌ |
| ADR-040 — `-min` rounds (4) | R042-BE-min, R044-min, R045-min, R046-min | ❌ no epics | ❌ |
| ADR-041 — P1 Exit | P1-Exit gate review | ❌ no epic (gate-only) | n/a |
| ADR-037+042 — Compensating controls + coverage gate | R-OPS-01 | ❌ no epic | ❌ |
| Helpdesk Phase A | helpdesk-phase-a | ✅ epic stub | ❌ |
| AI Shell scoping | AI-shell-scoping | ✅ epic + 7 tasks | ✅ |
| AI Shell build A/B/C | AI-shell-A/B/C | ❌ no epics yet (created by AI-shell-scoping T07) | ❌ |

### Issues found

- ❌ **EPIC-1 (CRITICAL):** **AI-shell-A epic does not exist.** It will be created by `AI-shell-scoping` task T07 once scoping completes. Currently the user wants to "start with AI-shell-A" but the epic for AI-shell-A is **not yet ready to start**. The proper sequence:
  1. Run AI-shell-scoping T01-T07 (this round produces the AI-shell-A epic)
  2. Then run AI-shell-A
- ❌ **EPIC-2 (HIGH):** ADR-038 R049.5 demo slice has no epic.
- ❌ **EPIC-3 (HIGH):** ADR-040 `-min` rounds have no epics yet.
- ❌ **EPIC-4 (HIGH):** ADR-037+042 R-OPS-01 (compensating controls + coverage gate) has no epic.
- 🟡 **EPIC-5 (MEDIUM):** R041A (CI enforcement) is `ready` but has no epic stub. Currently mentioned only in `00-control-center.md`.

---

## Step 4 — UX Alignment

### Coverage

| UX deliverable | Status |
|---|---|
| Visual language | ✅ `docs/design/DESIGN_SYSTEM.md` |
| Design tokens | ✅ `docs/design/TOKENS.md` |
| Component patterns | ✅ `docs/design/COMPONENTS.md` (live components ✅ R041B, R041D-UI, R041E, R041G, R042) |
| Animation library | ✅ `docs/design/ANIMATIONS.md` (Framer Motion variants) |
| Mobile + PWA | ✅ `docs/design/MOBILE.md` |
| RTL rules | ✅ enforced in `CLAUDE.md §RTL/Layout` + `02-rules/development-rules.md` |
| i18n strategy | ✅ `02-rules/development-rules.md §i18n`; concrete file: `messages/he.json` (other locales planned) |
| Accessibility | 🟡 mentioned in P5 hardening only — not embedded per round (M-01 from review) |

### Issues found

- 🟡 **UX-1 (MEDIUM):** No per-round a11y check. Ship a11y violations now, fix later in P5 = 6+ months of accumulated issues.
- ✅ **UX-2:** Existing capability components have visual evidence (R041G KpiCard merged with screenshots in commits) — UX is being validated incrementally.

### AI-shell-A specific UX

- 🟡 **UX-A1 (HIGH):** AI-shell-A epic.md does not yet exist (per EPIC-1). UX for the floating assistant is partially specified in `05-ai/floating-assistant.md` but COMPONENT BREAKDOWN + STATE MACHINE + CONFIRMATION FLOW + PAGE CONTEXT REGISTRY all live in **AI-shell-scoping tasks T03-T06** which haven't been executed yet.

---

## Step 5 — Epic Quality Review

### Sample epics reviewed

#### R042-BE-module-registry/epic.md ✅ HIGH QUALITY

- Scope, out-of-scope, why-now, decomposition rationale ✅
- 7 tasks, all sized 30-90 min ✅
- AC + DoD clearly defined ✅
- Each task has Goal, AC, Implementation Notes, Test, DoD ✅
- **Verdict:** Ready to start (with ADR-040 caveat — ADR mandates -min slicing first, current epic is "full")

#### AI-shell-scoping/epic.md ✅ HIGH QUALITY

- Scoping-only round, explicit "no code" ✅
- 7 tasks ranging 30-90 min, total 3h ✅
- T07 explicitly creates the build epics ✅
- **Verdict:** Ready to start. **Must start before AI-shell-A is achievable.**

#### R043 through R049 epic stubs 🟡 MEDIUM QUALITY

- Scope + AC defined ✅
- Tasks listed but not split into individual files ❌
- Implementation notes minimal ❌
- **Verdict:** Need decomposition before any of these is "ready." Per `10-tasks/README.md`, tasks split when round becomes next-up.

#### helpdesk-phase-a/epic.md 🟡 MEDIUM QUALITY

- Scope clear, blocked status documented ✅
- Tasks listed but not split ❌
- Depends on R042-BE + R044 (now subject to ADR-040 slicing) — dependencies need re-evaluation
- **Verdict:** Not ready — needs R042-BE-min + R044-min to be split first per ADR-040.

### Issues found

- 🟡 **QUAL-1 (MEDIUM):** 7 of 9 epics are stubs only. Per `10-tasks/README.md` this is intentional ("split just-in-time when round becomes next-up"). But the next-up rounds are exactly R042-BE-min (per ADR-040) which doesn't exist yet — so right now NO foundation round is fully ready to start.

---

## Step 6 — Final Assessment

### Overall Readiness Status

**🟡 NEEDS WORK** — for the specific goal of "start AI-shell-A":
- The plan is structurally sound (PRD ✅ STRONG, UX ✅, Architecture ✅).
- ADRs 037-042 close the 6 critical review findings.
- **But AI-shell-A is not ready to start.** It depends on:
  1. AI-shell-scoping completion (produces the AI-shell-A epic via T07)
  2. ADR-040 slicing application (creates the `-min` rounds that AI-shell-A may depend on, depending on what scoping decides)

### Critical Issues Requiring Immediate Action

1. **EPIC-1 — AI-shell-A epic does not exist.** Path forward: complete AI-shell-scoping first. After that, AI-shell-A is ready.
2. **EPIC-3 — ADR-040 action items not applied.** The `-min` rounds (R042-BE-min, R044-min, R045-min, R046-min) need epics created. Without these, the foundation track has no current "next-up" round.
3. **EPIC-4 — R-OPS-01 epic missing.** ADR-037 + ADR-042 require compensating controls + coverage gate to be added. These are P1 prerequisites per ADR-041 (gate item #7 implicitly requires the warn-only mode that R-OPS-01 stands up).
4. **PRD-3 — `master-roadmap §5` does not yet reflect ADR-040 slicing.** The plan table is now inconsistent with the latest ADR.

### Recommended Next Steps (in order)

1. **Apply ADR-040 + ADR-038 action items**: update `master-roadmap §5` to add `-min` rounds + R049.5 + R-OPS-01. ~30 min.
2. **Create `-min` epic stubs** (R042-BE-min, R044-min, R045-min, R046-min) under `10-tasks/`. Each <100 lines, scope = "Helpdesk-validating subset of the full round." ~1h.
3. **Create R-OPS-01 epic** for compensating controls + coverage gate. ~30 min.
4. **Run AI-shell-scoping T01-T07** as planned. Produces AI-shell-A/B/C epics. ~3h.
5. **Then AI-shell-A is ready.** Split it into tasks per `10-tasks/README.md` template, then execute.

### Alternative path (if user wants AI-shell-A urgently)

If the user chooses to **skip ADR-040 application** and run AI-shell-A immediately:
- Skip steps 1-3 above.
- Run AI-shell-scoping T01-T07 (~3h) — this produces the AI-shell-A epic.
- Run AI-shell-A.
- Foundation track stays paused; ADR-040 applied later.

This is acceptable IF the user accepts that:
- The platform's AI demo slice (ADR-038) ships before R042-BE-min is even sliced.
- R-OPS-01 compensating controls are deferred.
- The P1 Exit Gate clock starts ticking on a path that doesn't yet have all its rounds defined.

### Final Note

This assessment identified **1 CRITICAL**, **3 HIGH**, **5 MEDIUM** readiness gaps across **PRD, Epics, and UX-for-target-round**. The plan is structurally strong; the gaps are application-of-recent-ADRs gaps rather than design gaps. Address the top 4 issues (~2h of doc work) before declaring "ready to implement."

For the user's stated goal (start AI-shell-A): the **fastest correct path** is to run AI-shell-scoping first, which produces the AI-shell-A epic ready to split into tasks.

---

**Recommended pipeline next step:** **Run AI-shell-scoping** (this is the next BMAD epic regardless of which alternative you pick). Then bmad-create-epics-and-stories for AI-shell-A.

_Assessment complete. Readiness: 🟡 NEEDS WORK — gaps are well-defined and addressable in ~2h of doc work, OR proceed with the alternative path accepting deferred ADR-040 application._
