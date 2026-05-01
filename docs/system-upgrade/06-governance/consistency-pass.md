# 42 — Master Plan Consistency & Readiness Review

_Round 032 — 2026-04-25_
_Status: Review complete. Conflicts fixed. Plan is implementation-ready for platform-ui capability rounds._

---

## §01 — Executive Summary

The modernization plan spans 28 documents, 27 ADRs, and 31 planning/implementation rounds. The AI architecture layer (Rounds 024–031) is now designed and partially implemented. A review across all documents found 8 conflicts — all fixed in this round. The plan is now coherent and ready for platform-ui capability implementation starting at R033.

**Key finding:** Round 031 was implemented (files written, syntax-clean, tests passing) but NOT committed to git. The last commit is `0041db7b` (Round 022). Round 031 status = **IMPLEMENTED, UNCOMMITTED**.

**Critical rule reaffirmed:** No Helpdesk, Floating Assistant, or any module-level AI feature may proceed until the AI Provider Gateway (Round 031 files) is committed AND the P0 LLM migrations are complete.

---

## §02 — Documents Reviewed

| Doc | Title | Last Updated |
|-----|-------|-------------|
| `10` | Target Architecture | 2026-04-24 |
| `12` | Migration Roadmap | 2026-04-24 |
| `14` | Decision Log (27 ADRs) | 2026-04-24 |
| `15` | Action Backlog | 2026-04-24 |
| `24` | Core Platform + Module System | 2026-04-24 |
| `26` | Platform Capabilities Catalog | 2026-04-24 |
| `30` | Security Hardening Audit | 2026-04-24 |
| `31` | Production Security Headers | 2026-04-24 |
| `35` | Platform Capabilities Build Order | 2026-04-24 |
| `36` | AI Action Platform | 2026-04-24 |
| `38` | Global Floating AI Assistant | 2026-04-24 |
| `39` | AI Architecture Consistency Pass | 2026-04-24 |
| `40` | AI Provider Gateway + Billing | 2026-04-24 |
| `41` | Direct LLM Call Audit + Migration | 2026-04-24 |
| `96` | Rounds Index | 2026-04-25 |
| `97` | Source of Truth Registry | 2026-04-24 |
| `98` | Change Log | 2026-04-25 |
| `docs/ARCHITECTURE.md` | Platform UI Architecture Blueprint | 2026-04-24 |
| `CLAUDE.md` | Project instructions | 2026-04-25 |

**Also inspected (platformengineer):**
- `apps/ai_providers/gateway.py`, `policy.py`, `billing_adapter.py`, `schemas.py` (all exist, uncommitted)
- `apps/ai_providers/models.py` (14 new columns added, uncommitted)
- `apps/ai_providers/tasks.py` (`write_usage_log_extended` + `_try_set`, uncommitted)
- `scripts/migrations/versions/20260424_extend_ai_usage_log.py` (exists, uncommitted)
- `scripts/check_no_direct_llm_imports.py` (exists, uncommitted)
- `apps/ai_providers/tests/test_gateway.py` (exists, uncommitted)
- `apps/fitness_nutrition/ai_service.py` (P0 migrated, uncommitted)
- `git log` — last commit: `0041db7b security(r022)` — R031 is **uncommitted**

---

## §03 — Conflicts Found

| ID | Location | Conflict |
|----|----------|---------|
| C1 | doc `40` §01 header | Status says "Implementation not started" — but R031 implemented all 4 gateway files |
| C2 | doc `40` §01 §03 | Lists `gateway.py`, `policy.py`, `billing_adapter.py`, `schemas.py` as "not exist yet" — all exist (uncommitted) |
| C3 | doc `35` §11 round labels | Capability rounds labeled R023–R032 clash with actual rounds R023–R031 (used for AI architecture/gateway work). R031 in the capability plan = PlatformJobRunner; R031 globally = Gateway Phase 1. Same number, different work. |
| C4 | doc `35` §8 | "Backend Phase 3.5 design is complete. UI work begins after R031." — `R031` here means capability-plan R031 (PlatformImportExport/PlatformWizard), not gateway R031 |
| C5 | doc `97` | ADR count says "Current highest: ADR-014" — ADR-027 exists |
| C6 | doc `97` | No registry entries for docs 35–41 (Gateway, AI Action Platform, Floating Assistant, etc.) |
| C7 | doc `35` §25 and §6 | "Can start Helpdesk Phase A after R023" does not distinguish Helpdesk non-AI from Helpdesk AI features |
| C8 | doc `40` §05 | Says "12 new fields" for AIUsageLog extension — actual migration adds 14 fields |

---

## §04 — Conflicts Fixed

| ID | Fix | Doc Updated |
|----|-----|-------------|
| C1 | doc 40 status → "Phase 1 implemented (uncommitted, R031)" | `40` |
| C2 | doc 40 §01/§03 note added: gateway files exist in working tree | `40` |
| C3 | doc 35 §11 renamed to "Next Capability Rounds (starting R033)" with note explaining round label offset | `35` |
| C4 | doc 35 §8 clarified: R031 = capability plan label, not global round | `35` |
| C5 | doc 97 ADR count → ADR-027 | `97` |
| C6 | doc 97 new category entries added for docs 35–41 | `97` |
| C7 | doc 35 Helpdesk AI gate rule added (§6 and §25) | `35` |
| C8 | doc 40 field count corrected to 14 | `40` |

---

## §05 — Canonical Document Hierarchy

For each implementation area, one document is authoritative. When documents conflict, the canonical one wins.

| Area | Canonical Doc | Secondary (cross-ref only) | Notes |
|------|-------------|---------------------------|-------|
| Target architecture (full-stack) | `10` | `docs/ARCHITECTURE.md` (Next.js view) | `docs/ARCHITECTURE.md` is the frontend-specific view |
| Migration phases | `12` | `docs/modules/ROADMAP.md` | Module-level details in PLAN.md files |
| Architecture decisions | `14` | `CLAUDE.md §Hard Rules` | ADR consequences propagated to CLAUDE.md |
| Implementation backlog | `15` | `docs/modules/*/PLAN.md` | Per-module DoD in module PLAN.md |
| Platform capabilities (catalog) | `26` | `35` (build order), `10` (context) | `26` owns capability specs; `35` owns build sequence |
| Capability build order | `35` | `26` | `35` owns dependency graph and round assignments |
| Security posture | `30` | `06`, `31` | `30` = audit; `31` = headers implementation detail |
| Core module system | `24` | `10` | Data contracts, export/import, module lifecycle |
| **AI Action Platform — terms/schema** | **`39`** | `36` | `39` is the consistency pass; `36` has functional design (pre-v1 schema in `36` §05 is deprecated) |
| **AI Action Platform — functional design** | **`36`** | `39` (canonical terms) | `36` §33–§40 is the authoritative capability/voice/delete policy |
| **Floating AI Assistant** | **`38`** | `36` §23–§32 (context schema) | `38` owns session/UX/lazy-load design |
| **AI Provider Gateway + Billing** | **`40`** | `41` (migration inventory) | `40` owns gateway architecture; `41` owns bypass file classification |
| **LLM call migration inventory** | **`41`** | `40` (gateway spec) | `41` owns the 40-file P0/P1/P2/P3 list and deletion criteria |
| Source of truth registry | `97` | — | Meta-document: routing rules for all other docs |
| Round history | `96` | — | Append-only; never edit old entries |
| Change log | `98` | — | Append-only; newest entry at top |

**Rule for conflicts:** When two documents say different things about the same topic, the canonical document wins. The secondary must be updated to match or removed.

---

## §06 — Current Implementation Status Matrix

### Platform-UI Implementation

| Area | Status | Evidence | Next Round |
|------|--------|---------|------------|
| Auth bridge | ✅ Implemented | R005–R009; `lib/auth/`, next-auth, middleware | — |
| Users module | ✅ Implemented | R010, R017; list + detail + create/edit | — |
| Organizations module | ✅ Implemented | R013, R019; list + detail + create/edit | — |
| Roles module | ✅ Implemented | R018; list + detail | — |
| Dangerous actions (PlatformAction base) | ✅ Implemented | R020; `useDangerousAction`, `ConfirmActionDialog` | — |
| Security hardening | ✅ Implemented | R021–R022; score 9.2/10 | — |
| PlatformDataGrid | ✅ Implemented | R012 | — |
| PlatformForm | ✅ Implemented | R017–019 | — |
| PermissionGate | ✅ Implemented | R012 | — |
| PlatformPageShell | ✅ Implemented | R015 | — |
| PlatformTenantContext | ✅ Implemented | R007 | — |
| PlatformErrorBoundary | ✅ Implemented | R015 | — |
| PlatformAPI Client | ✅ Implemented | R008 | — |
| ActionButton (PlatformAction complete) | ⬜ Pending | Missing component | R033 |
| PlatformDetailView extraction | ⬜ Pending | Pattern exists inline; not extracted | R033 |
| PlatformFeatureFlags | ⬜ Pending | Not started | R033 |
| PlatformTimeline | ⬜ Pending | Not started | R034 |
| PlatformNotifications | ⬜ Pending | Not started | R034 |
| StatCard / PlatformDashboard | ⬜ Pending | Inline only | R034 |
| PlatformAuditLog | ⬜ Pending | Not started | R036 |
| PlatformApprovalFlow | ⬜ Pending | Not started | R038 |
| PlatformRealtime (SSE) | ⬜ Pending | Not started | R040 |
| PlatformJobRunner | ⬜ Pending | Not started | R041 |

### Backend / Gateway Implementation

| Area | Status | Evidence | Next Round |
|------|--------|---------|------------|
| AI Provider Registry | ✅ Implemented | `registry.py`, circuit breaker, Redis cache | — |
| AI Provider Adapters | ✅ Implemented | OpenAI, Gemini, Anthropic, Ollama, VLLM | — |
| AIUsageLog (base) | ✅ Implemented | `models.py`, monthly partitions | — |
| AI Provider Gateway Phase 1 | ⚠️ Impl, uncommitted | `gateway.py`, `policy.py`, `billing_adapter.py`, `schemas.py` in working tree; 0 commits | **Commit R032** |
| AIUsageLog 14-field extension | ⚠️ Impl, uncommitted | `20260424_extend_ai_usage_log.py` in working tree | **Commit R032** |
| CI lint scanner | ⚠️ Impl, uncommitted | `check_no_direct_llm_imports.py` in working tree | **Commit R032** |
| Gateway tests (8) | ⚠️ Impl, uncommitted | `test_gateway.py` in working tree | **Commit R032** |
| fitness_nutrition P0 migration | ⚠️ Impl, uncommitted | `ai_service.py` rewritten in working tree | **Commit R032** |
| P0 migrations remaining | ⬜ Pending | `ai_coach.py`, `voice_support/call_manager.py`, `personal_info/ai_chat/providers/`, `jira_integration/` | R033 |
| P1 migrations | ⬜ Pending | Helpdesk, mobile_voice, ai_agents, ala | R034 |
| AI Action Registry (READ) | ⬜ Pending | Not started | After Gate D |
| Floating Assistant backend | ⬜ Pending | Not started | After Gate F |

---

## §07 — Capability Readiness Matrix

| Capability | Status | Can Implement Now? | Blocker |
|-----------|--------|-------------------|---------|
| PlatformDataGrid | ✅ | Extend only | — |
| PlatformForm | ✅ | Extend only | — |
| PermissionGate | ✅ | Extend only | — |
| PlatformAction (base) | ✅ | — | — |
| **ActionButton** | ⬜ | **YES** | None — 30 min task |
| **PlatformDetailView extract** | ⬜ | **YES** | None — 45 min task |
| **PlatformFeatureFlags** | ⬜ | **YES** | None — 1 hr task |
| PlatformTimeline | ⬜ | YES (after R033) | R033 must complete first |
| PlatformNotifications | ⬜ | YES (after R033) | R033 must complete first |
| StatCard | ⬜ | YES (after R033) | R033 must complete first |
| PlatformAuditLog | ⬜ | YES (after R034) | — |
| PlatformApprovalFlow | ⬜ | YES (after R034) | — |
| PlatformRealtime | ⬜ | YES (after R035) | — |
| PlatformJobRunner | ⬜ | YES (after R035) | — |

---

## §08 — AI Readiness Matrix

| AI Component | Status | Can Implement Now? | Hard Blockers |
|-------------|--------|-------------------|--------------|
| AI Provider Gateway Phase 1 | ⚠️ Uncommitted | **COMMIT FIRST** | Uncommitted files |
| Policy quota enforcement (Phase 2) | ⬜ Pending | No | Gateway must be committed + Redis quota design |
| P0 LLM migrations (4 remaining) | ⬜ Pending | No (after gateway committed) | Gateway commit |
| P1 LLM migrations | ⬜ Pending | No | P0 must complete |
| AI Action READ tier | ⬜ Pending | No | B1 (delegation token) + B2 (AIActionDescriptor v1 Python dataclass) |
| AI Action WRITE tier | ⬜ Pending | No | B1 (delegation token) blocks all writes |
| AI Action DESTRUCTIVE tier | ⬜ Pending | No | WRITE tier must be complete |
| AI User Capability Context endpoint | ⬜ Pending | No | Gateway commit first |
| Floating Assistant (infrastructure) | ⬜ Pending | No | Gateway + AI context endpoint + AI Action READ |
| Floating Assistant (LLM wiring) | ⬜ Pending | No | Infrastructure phase first |
| Voice AI confirmation | ⬜ Pending | No | AI Action WRITE tier first |

---

## §09 — Helpdesk Readiness Matrix

Helpdesk has three distinct readiness states that must not be conflated:

| Track | Status | Gate | Can Start? |
|-------|--------|------|-----------|
| **Non-AI list/detail/tickets UI** | ⬜ Pending | Gate B (ActionButton + DetailView + FeatureFlags + Timeline + Notifications) | **YES — after R033–R034** |
| **Approval queue UI** | ⬜ Pending | Gate B + PlatformApprovalFlow | Yes — after R038 |
| **Helpdesk AI summaries/analysis** | ⬜ Pending | Gate C (Gateway committed + P0 migrations done) | **NO** — Gateway uncommitted |
| **Helpdesk AI actions** | ⬜ Pending | Gate D + E (AI Action READ + WRITE) | **NO** — B1 token blocker |
| **Helpdesk live status** | ⬜ Pending | Gate B + PlatformRealtime | Yes — after R040 |

**Rule (binding):** Any Helpdesk feature that calls an LLM must use `AIProviderGateway.call()`. No direct `openai`/`anthropic`/`genai` import anywhere in `apps/helpdesk/`. This gate is hard — no exceptions.

---

## §10 — Production Readiness Matrix

| Requirement | Status | Blocker | Round |
|------------|--------|---------|-------|
| Security score ≥ 9.2/10 | ✅ Done | — | R022 |
| NEXTAUTH_SECRET in SSM | ⬜ Pending | — | R033 |
| Flask `SESSION_COOKIE_SECURE=True` | ⬜ Pending | — | R033 |
| Role-aware nav filtering | ⬜ Pending | — | R033 |
| CSP headers (doc 31) | ⬜ Pending | — | R033 |
| Gateway committed | ⬜ Pending | **NEXT** | R032 commit |
| P0 LLM migrations | ⬜ Pending | Gateway committed | R033 |
| PlatformFeatureFlags | ⬜ Pending | — | R033 |
| PlatformAuditLog | ⬜ Pending | — | R036 |
| Playwright smoke tests (3) | ⬜ Pending | Auth bridge done | R033 |
| Dead-code deletion (`*_OLD_*`) | ⬜ Pending | — | R033 |
| CI lint rule enforced (gateway) | ⚠️ Script exists, not in CI pipeline | Script written, not wired to `.github/workflows/` | R033 |

---

## §11 — Blocker Register

| ID | Blocker | What It Blocks | Owner Doc | Resolved? |
|----|---------|---------------|-----------|----------|
| **BLK-01** | Gateway R031 files not committed | Everything downstream: P0 migrations, Helpdesk AI, Floating Assistant, AI Action Platform | `40`, `41` | **No — commit R032** |
| **BLK-02** | P0 LLM migrations not done (4 remaining) | Any new AI feature shipping with unbilled calls | `41` §13 | No — after BLK-01 |
| **BLK-03** | B1: Delegation token design (algorithm, signing key, nonce storage) | All AI Action WRITE/DESTRUCTIVE tiers | `39` §08 | No |
| **BLK-04** | B2: `AIActionDescriptor v1` Python dataclass | AI Action registry, all READ tier | `39` §05 | No |
| **BLK-05** | B4: `check_execution_viability()` implementation | AI Action Platform any tier | `36` §37 | No |
| **BLK-06** | Floating Assistant depends on Gateway (BLK-01) + AI context endpoint | Floating Assistant implementation | `38` §02 | No — after BLK-01 |
| **BLK-07** | Helpdesk AI depends on Gateway (BLK-01) + AI Action Platform (BLK-04) | Helpdesk AI features | `35`, `36` | No |
| **BLK-08** | Production: NEXTAUTH_SECRET not in SSM | Auth security before prod | `30`, `15` | No — R033 |
| **BLK-09** | Production: Flask SESSION_COOKIE_SECURE not set | Auth security before prod | `30`, `15` | No — R033 |
| **BLK-10** | CI lint not wired to GitHub Actions | Direct LLM imports not blocked in CI | `41` | No — R033 |

---

## §12 — Implementation Gates

### Gate A — Core UI Module Development
_What must be done before building any new non-AI module page._

- [x] Auth bridge working (R005–R009)
- [x] PlatformDataGrid, PlatformForm, PermissionGate, PlatformPageShell implemented
- [ ] `ActionButton` component complete (R033)
- [ ] `PlatformDetailView` extracted to shared (R033)
- [ ] `PlatformFeatureFlags` (`useFeatureFlag`, `<FeatureFlag>`) (R033)

**Can start non-AI module pages (Users/Orgs/Roles basic CRUD) NOW — gate A is partially open (base capabilities done).**

---

### Gate B — Helpdesk Basic UI (non-AI only)

All Gate A items plus:
- [ ] `PlatformTimeline` (R034)
- [ ] `StatCard` / `PlatformDashboard` (R034)
- [ ] `PlatformNotifications` polling (R034)

**Can start Helpdesk Phase A (ticket list + stats) after R034.**
**Cannot start Helpdesk ticket detail or approvals without Gate B complete.**

---

### Gate C — Any LLM Feature (mandatory before any AI call)

- [ ] AI Provider Gateway committed to git (R032) — BLK-01
- [ ] DB migration `20260424_extend_ai_usage_log` run on production DB
- [ ] P0 LLM migrations complete (R033) — BLK-02: `ai_coach.py`, `voice_support/call_manager.py`, `personal_info/ai_chat/providers/`, `jira_integration/ai_service.py`
- [ ] CI lint rule wired to GitHub Actions (R033) — BLK-10

**No module may ship any LLM-calling feature until Gate C is complete.**

---

### Gate D — AI Action READ Tier

All Gate C items plus:
- [ ] `AIActionDescriptor v1` Python dataclass (BLK-04) — `apps/ai_providers/action_schema.py`
- [ ] AI Action registry READ tier implemented — `apps/ai_providers/action_registry.py`
- [ ] `check_execution_viability()` stub (BLK-05)
- [ ] AI User Capability Context endpoint (`GET /api/ai/context`)

**AI can read data and answer questions on behalf of user. No writes.**

---

### Gate E — AI Action WRITE Tier

All Gate D items plus:
- [ ] Delegation token design resolved (BLK-03) — `AIActionConfirmationToken` signing key + nonce
- [ ] `AIActionConfirmationToken` implementation
- [ ] WRITE tier capability levels (CREATE/UPDATE/APPROVE/EXECUTE/CONFIGURE) wired
- [ ] Confirmation modal in platform-ui (`ApprovalModal`)
- [ ] Audit trail for all write actions

**AI can create, update, configure. Still no DELETE.**

---

### Gate F — Floating AI Assistant

All Gate C items plus:
- [ ] `GET /api/ai/context` endpoint (personalized capability context)
- [ ] `FloatingAIButton` + `AssistantDrawer` (platform-ui, lazy)
- [ ] `AIAssistantSessionState` Zustand store
- [ ] `useRegisterPageContext()` hook
- Optionally Gate D (for action capability, not required for read-only assistant)

---

### Gate G — Production Readiness

All Gate C items plus:
- [ ] BLK-08: NEXTAUTH_SECRET in SSM
- [ ] BLK-09: Flask SESSION_COOKIE_SECURE=True
- [ ] CSP headers (doc 31)
- [ ] Role-aware nav filtering
- [ ] BLK-10: CI lint gate in `.github/workflows/`
- [ ] Playwright smoke tests (3 tests)
- [ ] Dead-code deletion complete
- [ ] PlatformFeatureFlags live (plan-gating)

---

## §13 — Correct Next 5 Rounds

> Round 031 is implemented but uncommitted. Round 032 must commit it before any new work.

### Round 032 — Commit Gateway Phase 1 + CLAUDE.md Update
_Estimated: 30 min_

**Goal:** Commit all Round 031 files that are sitting in the working tree. Update CLAUDE.md Gateway pattern to reference `response.output_text` (not `response.content`). Wire lint script reference in CLAUDE.md.

**Deliverables:**
1. `git commit` all Round 031 files (gateway.py, policy.py, billing_adapter.py, schemas.py, tasks.py, models.py, migration, lint script, tests, fitness_nutrition P0)
2. CLAUDE.md usage example corrected from `response.content` → `response.output_text`
3. CLAUDE.md §AI Provider — add `check_no_direct_llm_imports.py` reference
4. Update doc 40 status to "Phase 1 COMMITTED"

**Acceptance criteria:**
- [ ] `git log --oneline` shows a new `feat(ai-providers): R031 gateway phase 1` commit
- [ ] `python scripts/check_no_direct_llm_imports.py apps` exits 1 (expected: 64 violations minus fitness_nutrition)
- [ ] `python -c "from apps.ai_providers.gateway import AIProviderGateway"` — no ImportError
- [ ] Doc 40 status updated

---

### Round 033 — P0 LLM Migrations + Security Hygiene + Gate C Complete
_Estimated: 4 hours_

**Goal:** Close Gate C (any LLM feature gate). Migrate remaining P0 bypass files. Wire CI lint. Fix deferred security items.

**Deliverables:**
1. P0 migrations: `apps/fitness_nutrition/ai_coach.py`, `apps/voice_support/call_manager.py`, `apps/personal_info/ai_chat/providers/openai_provider.py` + `gemini_provider.py` (delete), `apps/jira_integration/ai_service.py`
2. Wire `check_no_direct_llm_imports.py` to `.github/workflows/` (warn-only for now)
3. NEXTAUTH_SECRET SSM documentation (BLK-08)
4. Flask SESSION_COOKIE_SECURE documentation (BLK-09)
5. Dead-code deletion sweep (`api_auth_OLD_BACKUP.py` + others)
6. Remove `is_admin` role-name workaround from `lib/auth/options.ts`

**Acceptance criteria:**
- [ ] `check_no_direct_llm_imports.py` shows ≤60 violations (P0 files removed)
- [ ] `fitness_nutrition/ai_coach.py` uses AIProviderGateway
- [ ] `personal_info/ai_chat/providers/` deleted or replaced
- [ ] CI lint step exists in `.github/workflows/`

---

### Round 034 — ActionButton + DetailView + PlatformFeatureFlags (Gate A complete)
_Estimated: 2 hours_

**Goal:** Close Gate A. Ship the three missing partial capabilities.

**Deliverables (platform-ui):**
1. `components/shared/action-button.tsx` — loading spinner + disabled during mutation
2. `components/shared/detail-view/` — extract from Users + Orgs detail pages
3. `lib/hooks/use-feature-flag.ts` + `<FeatureFlag>` component + `lib/api/feature-config.ts`
4. Update Users + Orgs detail pages to use shared DetailView

**Acceptance criteria:**
- [ ] ActionButton spinner visible during mutation; disabled when `isPending=true`
- [ ] Users detail and Orgs detail use shared DetailView (no duplicate `InfoRow`, `BoolBadge`)
- [ ] `useFeatureFlag('helpdesk.enabled')` returns correct value from API
- [ ] TypeScript: EXIT 0

---

### Round 035 — PlatformTimeline + StatCard + PlatformNotifications
_Estimated: 7 hours_

**Goal:** Close Gate B (Helpdesk non-AI pre-requisites).

**Deliverables (platform-ui):**
1. `components/shared/timeline/` — `Timeline`, `TimelineEvent`, `TimelineSkeleton`
2. `components/shared/stat-card.tsx` — extract from inline Dashboard pattern
3. `NotificationBell` + `NotificationDrawer` + `useNotifications` polling (30s)
4. Wire `NotificationBell` into dashboard layout header
5. `StatCard` replaces inline Dashboard stat display

**Acceptance criteria:**
- [ ] PlatformTimeline renders 0, 1, N events with skeleton on load
- [ ] NotificationBell badge updates on polling
- [ ] StatCard renders value + label + trend + icon
- [ ] TypeScript: EXIT 0

---

### Round 036 — Helpdesk Phase A (Route Shell + Ticket List)
_Estimated: 4 hours (Gate B complete)_

**Goal:** First Helpdesk page. Non-AI only.

**Deliverables (platform-ui):**
1. `app/(dashboard)/helpdesk/page.tsx` — KPI dashboard (StatCard grid)
2. `app/(dashboard)/helpdesk/tickets/page.tsx` — ticket list (DataTable + filters)
3. `lib/modules/helpdesk/types.ts`, `lib/api/helpdesk.ts`
4. `TicketStatusBadge`, `TicketPriorityBadge` components
5. Backend: verify `/helpdesk/api/tickets` + `/helpdesk/api/dashboard/stats` exist

**No AI features in this round. All content is display-only.**

**Acceptance criteria:**
- [ ] `/helpdesk` loads with real KPI stats
- [ ] `/helpdesk/tickets` shows paginated ticket list with status filter
- [ ] FeatureFlag gates the route
- [ ] TypeScript: EXIT 0

---

## §14 — Remaining Ambiguities

| # | Ambiguity | Where | Resolution Path |
|---|-----------|-------|----------------|
| Q1 | `migration_20260424_extend_ai_usage_log.py` — does it work on partitioned table? PostgreSQL DDL on partitioned tables requires running on each partition or the parent. | `scripts/migrations/versions/` | Test on dev DB before running on production. File a test result in the change log. |
| Q2 | `AIProviderGateway._write_usage_log()` always returns `None` — callers cannot get the `usage_log_id` synchronously. Some future callers (billing reconciliation) may need it. | `gateway.py:296` | Accepted for Phase 1. Phase 2: add sync write path for callers that need the ID. |
| Q3 | `apps/voice_support/call_manager.py` has module-level `genai` import — this crashes the module at import time if `GEMINI_AI_KEY` is missing. Is it used in production paths? | `apps/voice_support/` | Verify usage before Round 033 migration. If unused, delete instead of migrate. |
| Q4 | Delegation token (BLK-03): signing key location in SSM? In-memory? Per-org or platform-wide? | `39` §08 | Must be resolved before Gate E. Document in `../08-decisions/decision-log.md` as ADR-028. |
| Q5 | The platform-ui CLAUDE.md says `response.content` for the LLM reply but the actual `GatewayResponse` field is `output_text`. Which is used? | `CLAUDE.md`, `schemas.py` | Fix in Round 032: CLAUDE.md must say `response.output_text`. |

---

## §15 — Acceptance Criteria for "Plan Is Implementation-Ready"

The plan is implementation-ready when all of the following are true:

- [x] All ADRs have sequential IDs (ADR-001 → ADR-027)
- [x] Canonical document hierarchy defined (§05 this doc)
- [x] Round numbering conflict in doc 35 resolved (§11 renamed to start at R033)
- [x] Helpdesk AI vs non-AI readiness explicitly distinguished (§09 this doc, doc 35 §6)
- [ ] **Gateway files committed** (BLK-01 — needed before Round 033)
- [x] Status matrix shows implemented vs planned vs uncommitted (§06 this doc)
- [x] Blocker register complete (§11 this doc)
- [x] Implementation gates defined (A–G, §12 this doc)
- [x] Next 5 rounds specified with clear deliverables and acceptance criteria
- [x] doc 97 source of truth registry updated (ADR count + missing categories)
- [x] doc 40 status corrected from "not started" to "Phase 1 implemented, uncommitted"
- [ ] CLAUDE.md `response.content` → `response.output_text` corrected (Round 032)
- [x] Remaining ambiguities documented (§14 this doc)

**Current verdict:** Plan is ready for platform-ui capability implementation. One hard prerequisite: commit Round 031 files (Round 032 task, ~30 min).
