# 98 — Change Log

_Running log of what changed in each update round._
_Newest entry at the top._

---

## Format

```
## YYYY-MM-DD — Round NNN: <topic>
### Files Changed
### New Findings
### Decision Changes
### Backlog Changes
```

---

## 2026-04-25 — Round 034 (Documentation): AI Providers Hub Architecture & UI Plan

### Files Created (platform-ui)
- `docs/system-upgrade/44-ai-providers-hub.md` — **created** (§01 capability assessment, §02 frontend gap, §03 product goals, §04–§13 hub sections + API table, §14 permissions model, §15 security rules, §16 shared capability rules, §17 phased plan, §18 open questions, §19 acceptance criteria, §20 ADR-029; 29 API endpoints; TypeScript interfaces + Zod schemas)

### Files Changed (platform-ui)
- `docs/system-upgrade/14-decision-log.md` — **updated** (ADR-029 added: AI Providers Hub — side-by-side JWT routes)
- `docs/system-upgrade/26-platform-capabilities-catalog.md` — **updated** (§30 AIProviders Hub added to summary table; full §30 section with purpose/files/security/permissions/spec)
- `docs/system-upgrade/35-platform-capabilities-build-order.md` — **updated** (enforcement pointer added to executive summary)
- `docs/system-upgrade/40-ai-provider-gateway-billing.md` — **updated** (§20 Hub reference added: circuit breaker, defaults, module overrides, quotas, migration status all map to Hub sections)
- `docs/system-upgrade/41-direct-llm-call-audit-and-migration.md` — **updated** (§21 Migration Status Hub page reference added)
- `docs/system-upgrade/43-shared-services-enforcement.md` — **updated** (R034 revision history entry added)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (R035/R036/R037 AI Providers Hub task tables added: 5 backend tasks, 11 UI core tasks, 4 advanced UI tasks)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 034 entry added; next round: R035 backend JWT routes)
- `docs/system-upgrade/98-change-log.md` — this entry

### New Findings
- Existing `apps/ai_providers/routes.py` is comprehensive (11 route groups, full CRUD + usage) but uses Flask-Login throughout — all routes must be re-implemented with `@jwt_required` for platform-ui, not proxied
- Provider health state is NOT in DB — only in Redis circuit breaker. Hub health page must poll live Redis state via new backend endpoint
- `api_key_ref` is Fernet-encrypted; frontend must never receive the value — serializer shows `has_api_key: bool` only (already enforced in existing `_provider_to_dict()`)
- Blueprint prefix is `/ai-providers/` (not `/api/ai-providers/`) — new JWT blueprint must use `/api/ai-providers/` prefix to avoid collision

### Backlog Changes
- R035: Backend JWT routes (5 tasks) added
- R036: Hub UI Core (11 tasks) added
- R037: Hub UI Advanced (4 tasks) added

---

## 2026-04-25 — Round 033 Follow-up: Shared Services Enforcement Clarity Pass

### Files Changed (platform-ui)
- `docs/system-upgrade/43-shared-services-enforcement.md` — **updated** (canonical paths table added §01; quick replacement table added §01; ActionButton transition rule added §FE-05; detection script registry table with owner/round/phase added §07; `DetailInfoRow` corrected to `InfoRow`; P0-02/03/04 marked done; acceptance criteria updated; revision history updated)
- `docs/system-upgrade/26-platform-capabilities-catalog.md` — **updated** (§07 PlatformPageShell status corrected: ⬜ Pending → ✅ Implemented R015; §21 PlatformErrorBoundary status corrected: ⬜ Pending → ✅ Implemented R015; canonical file paths updated to actual paths)
- `docs/system-upgrade/35-platform-capabilities-build-order.md` — **updated** (enforcement plan cross-reference added to §1 executive summary)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (P0-02, P0-03 CLAUDE.md tasks marked `[x] R032`; P0-01/05/06/07/08 rounds corrected R033→R034)
- `CLAUDE.md` — **updated** (mandatory read pointer added: docs 43 + 26 + 35 before any module code)

### Files Changed (platformengineer)
- `CLAUDE.md` — **updated** (mandatory read pointer added: docs 43 + 26 + 35 before any module code)

### New Findings
- `components/shared/detail-view/info-row.tsx` exports `InfoRow` (not `DetailInfoRow` as doc 43 previously stated)
- `components/shared/page-shell/` and `components/shared/error-boundary.tsx` / `error-state.tsx` are ✅ Implemented — doc 26 section headers were stale (summary table was already correct)
- `ActionButton` is not yet built; R033 follow-up documents the approved interim pattern (Button + isPending)

### Backlog Changes
- P0 task rounds corrected to R034 (R033 was consumed by enforcement planning)

---

## 2026-04-25 — Round 033 (Documentation): Shared Services and Platform Capabilities Enforcement Plan

### Files Created (platform-ui)
- `docs/system-upgrade/43-shared-services-enforcement.md` — **created** (full enforcement plan: §01–§15 + Appendix A)

### Files Changed (platform-ui)
- `docs/ARCHITECTURE.md` — **updated** (§21.4: gateway files marked implemented R031; §22 new section: Capability-First Rule with mandatory frontend/backend tables)
- `docs/system-upgrade/14-decision-log.md` — **updated** (ADR-028 added: Shared Services Enforcement; ADR-027 field count corrected 12→14)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (P0 enforcement tasks section + P1 enforcement tasks section added)
- `docs/system-upgrade/26-platform-capabilities-catalog.md` — **updated** (Mandatory Rule: enforcement plan cross-reference + PR/AI-agent checklist links added)
- `CLAUDE.md` — **updated** (§Shared Capabilities Enforcement section added with AI-agent guardrail checklist)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 033 entry added; Round 032 next-round pointer corrected)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### Files Changed (platformengineer)
- `CLAUDE.md` — **updated** (§Shared Services Enforcement section added with backend AI-agent guardrail checklist)

### New Findings
- All shared frontend capabilities and backend services now have explicit mandatory/forbidden contracts
- 15 frontend + 14 backend patterns classified as forbidden with FAIL/WARN severity
- ADR-028 establishes Capability-First as an enforced architectural rule (not just a guideline)

### Backlog Changes
- P0 enforcement tasks added: CI wiring, 3 detection scripts, P0 LLM migrations, ActionButton component
- P1 enforcement tasks added: 5 CI gate tasks for R034–R035

---

## 2026-04-25 — Round 032 (Documentation): Master Plan Consistency & Readiness Review

### Files Changed (platform-ui)
- `docs/system-upgrade/42-master-plan-consistency-and-readiness.md` — **created** (15-section master consistency document: 8 conflicts, status matrices, gates A–G, blocker register BLK-01–BLK-10, next 5 rounds)
- `docs/system-upgrade/40-ai-provider-gateway-billing.md` — **updated** (status line: "not started" → "Phase 1 implemented (uncommitted, R031)"; "12 new fields" → "14 new fields")
- `docs/system-upgrade/35-platform-capabilities-build-order.md` — **updated** (§11 header: round offset note added — capability rounds start at R033, not R023)
- `docs/system-upgrade/97-source-of-truth.md` — **updated** (ADR count: "ADR-014" → "ADR-027")
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 032 entry added)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### Files Changed (platformengineer)
- `CLAUDE.md` — **updated** (AI Provider Gateway usage example: `response.content` → `response.output_text`)

### New Findings
- **BLK-01**: Round 031 gateway files exist in working tree but were never committed — `git log` confirms last commit is `0041db7b security(r022)`
- **C5**: Doc 35 §11 used R023–R032 as platform-ui capability round labels, but those global round numbers were consumed by AI architecture + security work — offset note added, no renumbering applied (labels are relative slots now)
- **C6**: Doc 97 ADR-014 stale — actual highest is ADR-027 (24-core-platform-and-module-system.md)

### Backlog Changes
- None (doc-only round)

---

## 2026-04-25 — Round 031 (Implementation): AI Provider Gateway Phase 1

### Files Changed (platformengineer)
- `apps/ai_providers/schemas.py` — **created** (`GatewayRequest` dataclass with `validate()`, `GatewayResponse`, `PolicyDecision`, `VALID_CAPABILITIES` frozenset)
- `apps/ai_providers/gateway.py` — **created** (`AIProviderGateway.call()` full pipeline: validate → policy → resolve → call → log → billing → return; `_execute`, `_resolve_provider`, `_write_usage_log`, `_capability_to_registry`, `_provider_type_from_adapter` helpers)
- `apps/ai_providers/policy.py` — **created** (`AIProviderPolicy.check()` fail-open wrapper; Phase 1 capability validation; Phase 2 TODOs: quota, rate limit, org active, module feature flag)
- `apps/ai_providers/billing_adapter.py` — **created** (`AIProviderBillingAdapter.emit()` bridging to `service_billing.emit_billing_event()`; event type map; tolerates `ImportError` in dev/test)
- `apps/ai_providers/tasks.py` — **updated** (`write_usage_log_extended` task with 14 attribution fields; `_try_set()` migration guard helper)
- `apps/ai_providers/models.py` — **updated** (`AIUsageLog`: 14 new columns — `feature_id`, `conversation_id`, `action_id`, `ai_action_invocation_id`, `status`, `started_at`, `completed_at`, `error_code`, `correlation_id`, `cached_tokens`, `is_estimated`, `billable_cost`, `quota_bucket`, `is_billable`)
- `scripts/migrations/versions/20260424_extend_ai_usage_log.py` — **created** (alembic `op.add_column` for all 14 new columns + 2 indexes; full `downgrade()`)
- `scripts/check_no_direct_llm_imports.py` — **created** (CI lint scanner; scans `apps/`; allows only `apps/ai_providers/adapters/`; exit code 0/1)
- `apps/ai_providers/tests/test_gateway.py` — **created** (8 tests: request validation ×2, policy deny, happy-path chat, failed provider, billable billing emit, non-billable billing skip, lint scanner ×2)
- `apps/fitness_nutrition/ai_service.py` — **rewritten** (removed `google.generativeai` import + `os.getenv('GEMINI_AI_KEY')`; added `org_id`/`user_id` params; uses `AIProviderGateway.call()`)
- `apps/fitness_nutrition/workout_routes.py` — **updated** (passes `org_id=current_user.org_id, user_id=current_user.id` to `generate_workout_plan`)
- `apps/fitness_nutrition/nutrition_routes.py` — **updated** (passes `org_id=current_user.org_id, user_id=current_user.id` to `generate_meal_plan`)

### New Findings
- `_try_set()` pattern is the key to zero-downtime gateway rollout: gateway ships first, migration runs after, no crash window
- `fitness_nutrition` had a module-level `genai.configure()` call that would fail at Flask startup if `GEMINI_AI_KEY` was unset — now fully eliminated
- Billing adapter `ImportError` tolerance means gateway works in dev without billing module registered

### Decision Changes
- ADR-027 Phase 1 now implemented — no new ADR required

### Backlog Changes
- P0 item: `fitness_nutrition/ai_service.py` → **DONE** (remove from P0 migration list in `15-action-backlog.md`)

---

## 2026-04-24 — Round 030 (Audit): Direct LLM Call Audit + Gateway Migration Plan

### Files Changed
- `docs/system-upgrade/41-direct-llm-call-audit-and-migration.md` — **created** (20 sections: executive summary, bypass count, provider/module summary, bypass wrapper deep review, full inventory table P0/P1/P2/P3, billing gaps, attribution gaps, PII risk review, streaming/voice gaps, gateway readiness assessment, migration phases 1–4, P0/P1/P2/P3 lists, enforcement design with CI lint script + allowlist, required tests, deletion criteria, risks, acceptance criteria)
- `docs/system-upgrade/35-platform-capabilities-build-order.md` — **updated** (gateway migration track: P0 migration phase added, audit doc reference added)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (Gateway Phase 2 P0 migration tasks: 9 items added before existing Phase 3 table; Phase 3 file count corrected to match audit)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 030 entry)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### New Findings
- **3 module-level genai imports** found: `voice_support/call_manager.py`, `fitness_nutrition/ai_service.py`, `fitness_nutrition/ai_coach.py` — these fail silently at import time if the API key is missing
- **`personal_info/ai_chat/providers/`** receives raw API key as constructor arg with no key_resolver — Critical PII module with no billing trail
- **`apps/jira_integration/ai_service.py`** is the most complex bypass: 3000+ line file, multi-provider switch (OpenAI + Gemini), 5 direct chat completion calls, no attribution
- **`apps/ai_providers/`** is 70% complete for gateway role — registry, adapters, circuit breaker all production-ready; `gateway.py` wrapper and quota enforcement are the missing 30%
- **Double-fallback risk**: `openai_fallback.py` must be deleted in same PR as `gemini_client.py` migration — leaving both active causes cascading duplicate calls
- **No PII redaction policy** applied anywhere in the 40 bypass files — `personal_info` sends raw diary data, documents, and transcripts to OpenAI/Gemini

### Decision Changes
- No new ADR — audit round only

### Backlog Changes
- Gateway Phase 2 P0 migration section added to `15-action-backlog.md` (9 tasks)
- Gateway Phase 3 module count corrected from "37 files" to accurate P2/P3 split per audit
- Phase 2 migration gate clarified: P0 files must migrate before **any** new AI feature merges

---

## 2026-04-24 — Round 029 (Architecture): AI Provider Gateway + Billing Metering

### Files Changed
- `docs/system-upgrade/40-ai-provider-gateway-billing.md` — **created** (19 sections: executive summary, core rule, current assessment, target architecture, gateway responsibilities, provider registry, extended AIUsageLog model, billing flow, quota enforcement, streaming billing, voice metering, AI Action Platform integration, floating assistant cost policy, provider secrets policy, enforcement rules, testing strategy, migration plan, open questions, acceptance criteria)
- `docs/system-upgrade/36-ai-action-platform.md` — **updated** (§42 added: gateway integration note + GatewayRequest example)
- `docs/system-upgrade/38-floating-ai-assistant.md` — **updated** (§14 added: gateway attribution table + GatewayRequest fields)
- `docs/system-upgrade/39-ai-architecture-consistency-pass.md` — **updated** (§14 added: gateway as enforcement mechanism for §09 tool injection rules)
- `docs/system-upgrade/14-decision-log.md` — **updated** (ADR-027: AI Provider Gateway and Mandatory Billing Metering)
- `docs/system-upgrade/35-platform-capabilities-build-order.md` — **updated** (gateway migration track Phase 1/2/3 before R027)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (Phase 1/2/3 gateway tasks: 30 items)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 029 entry)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### New Findings
- 55+ files bypass the existing `apps/ai_providers/` layer entirely — this is the largest single billing risk in the platform
- Three dedicated bypass wrapper files exist that will need explicit deletion: `life_assistant/services/gemini_client.py`, `life_assistant/services/openai_fallback.py`, `personal_info/ai_chat/providers/gemini_provider.py` + `openai_provider.py`
- `AIUsageLog` is partitioned monthly and already has audio token fields — the 12 new fields are additions, not redesign
- `apps/billing/service_billing.py` `emit_billing_event()` already exists and is reusable — the billing adapter is a thin bridge, not a new system
- No quota pre-check exists anywhere in the current codebase — this is a gap that allows unlimited spend

### Decision Changes
- ADR-027: AI Provider Gateway and Mandatory Billing Metering (new)

### Backlog Changes
- 30 gateway migration tasks added across 3 phases
- Gateway Phase 1 marked as pre-R027 blocker (same priority as consistency-pass B1–B10)

---

## 2026-04-24 — Round 028 (Architecture): AI Architecture Consistency Pass

### Files Changed
- `docs/system-upgrade/39-ai-architecture-consistency-pass.md` — **created** (13 sections: executive summary, ambiguities found/fixed, canonical terms, canonical AIActionDescriptor v1, canonical voice policy, delegated human vs service account, delegation token design placeholder, tool injection safety, prompt guidance vs enforcement, rollback/partial failure policy, implementation blockers B1–B10, acceptance criteria)
- `docs/system-upgrade/36-ai-action-platform.md` — **updated** (deprecated markers on §05/§06/§09/§11/§23/§35; `voiceInvocable`→`voice_eligible` in all locations; §35 header marks intermediate draft; global header consistency note)
- `docs/system-upgrade/14-decision-log.md` — **updated** (ADR-026: AI Architecture Consistency Pass)
- `docs/system-upgrade/35-platform-capabilities-build-order.md` — **updated** (consistency-pass gate table added before R027 implementation track)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (B1–B10 pre-R027 blocker tasks: 12 items)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 028 entry)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### New Findings
- `risk_tier` ("READ"|"WRITE_LOW"|"WRITE_HIGH"|"DESTRUCTIVE") was live code in doc 36 §05/§06/§11 while `capability_level` (10-level) was the intended design — these were genuinely contradictory, not just cosmetic
- The permission check function `check_delegated_permission()` in §06 would be broken at runtime because it checks `action.risk_tier == "DESTRUCTIVE"` — a field that no longer exists in the canonical descriptor
- Three different names for the same voice-eligibility boolean across 4 sections — `voiceInvocable`, `voice_invocable`, `voice_eligible`
- Old voice rule "only READ + WRITE_LOW ≤ low danger" was more restrictive than the §34 formula; the §34 formula allows CREATE/UPDATE/APPROVE/EXECUTE at ≤medium danger — the formula is correct
- No delegation token design means write-tier AI actions cannot safely ship: there is no cryptographic binding between "human said yes" and "action was executed"
- Prompt-is-guidance-only warning was in §23 motivation text but not in a visible callout that engineers would read before implementing context injection

### Decision Changes
- ADR-026: AI Architecture Consistency Pass (new)

### Backlog Changes
- B1–B10 pre-R027 blocker tasks added to `15-action-backlog.md`
- Consistency gate table added before R027 track in `35-platform-capabilities-build-order.md`

---

## 2026-04-24 — Round 027 (Architecture): Global Floating AI Assistant

### Files Changed
- `docs/system-upgrade/38-floating-ai-assistant.md` — **created** (13 sections: lazy loading, persistent conversation, context diffing, session state model, LLM cost-control rules, UX state machine, UX component structure, PageAIContext schema, security/privacy, AI Action Platform integration, implementation phases R032–R035, open questions)
- `docs/system-upgrade/36-ai-action-platform.md` — **updated** (§41 added: frontend surface reference to doc 38, integration points table)
- `docs/system-upgrade/14-decision-log.md` — **updated** (ADR-025: Global Floating AI Assistant and Page Context Registry)
- `docs/system-upgrade/26-platform-capabilities-catalog.md` — **updated** (Global Floating AI Assistant capability entry)
- `docs/system-upgrade/35-platform-capabilities-build-order.md` — **updated** (R032–R035 Floating AI Assistant track + 4 new gate rows in summary table)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (R032–R035 tasks: 39 items across infra, LLM wiring, action proposals, voice mode)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 027 entry)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### New Findings
- Lazy loading is the key constraint: LLM must never fire on page load, route change, or component mount — only on explicit user interaction
- `lastLLMContextHash` comparison is the mechanism for skipping unchanged context; without it, every message would re-send the full capability context
- In-memory Zustand (never localStorage) prevents session state from leaking across user switches on shared devices
- `PageContextDiff.relevantToObjective` check prevents irrelevant page changes from polluting the LLM context mid-conversation
- Session reset on org switch is a security requirement, not a UX choice — same device may have multiple org admins

### Decision Changes
- ADR-025: Global Floating AI Assistant and Page Context Registry (new)

### Backlog Changes
- Added R032–R035 floating assistant tasks (39 items) to `15-action-backlog.md`
- Added R032–R035 build track to `35-platform-capabilities-build-order.md`

---

## 2026-04-24 — Round 026 (Architecture): AI Action Platform Hardening

### Files Changed
- `docs/system-upgrade/36-ai-action-platform.md` — **updated** (header note "AI is not read-only"; §33–§40 added: capability levels, full registry schema, delegated human vs service account, 22-point viability checks, implementation readiness checklist, voice write/delete constraints, delete policy)
- `docs/system-upgrade/14-decision-log.md` — **updated** (ADR-023 updated with capability level + delete policy clarifications; ADR-024: AI Action Capability Levels + Write/Delete Policy added)
- `docs/system-upgrade/26-platform-capabilities-catalog.md` — **updated** (Round 026 hardening section)
- `docs/system-upgrade/35-platform-capabilities-build-order.md` — **updated** (updated header timestamp)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (R027 tasks expanded to 32 items: 10 infra + 22 tests)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 026 entry)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### New Findings
- The design was ambiguous about whether the AI could execute writes — explicit clarification needed for implementers
- Service account delegation was underspecified: `is_ai_agent=True` alone authorizing writes would be a security flaw
- 22 viability checks derived from security threat model: org-switch attack, stale permission, bulk-destructive, audit-skip, arbitrary executor
- Hard delete requires a retention policy that doesn't exist yet — correct to block it at registry level (not just runtime) until the policy is written
- Voice confirmation ceiling (danger_level ≥ high) extends to ALL high-risk action types, not just user deactivation

### Decision Changes
- ADR-023: Updated with capability level clarification, service account rule, delete policy reference
- ADR-024: AI Action Capability Levels + Write/Delete Policy (new)

### Backlog Changes
- R027 expanded: 32 tasks (was 10) — added all 22 positive + negative tests from §38 readiness checklist, idempotency, hard delete gate, §35 JSON schema files

---

## 2026-04-24 — Round 025 (Architecture): AI User Capability Context

### Files Changed
- `docs/system-upgrade/36-ai-action-platform.md` — **updated** (§23–§32 added: AIUserCapabilityContext, prompt builder, context endpoint, action filtering, runtime re-check, prompt invalidation, role-specific policies, voice constraints, personalization, security rules S11–S17)
- `docs/system-upgrade/14-decision-log.md` — **updated** (ADR-023: Personalized AI Capability Context)
- `docs/system-upgrade/10-target-architecture.md` — **updated** (AI Capability Context section)
- `docs/system-upgrade/24-core-platform-and-module-system.md` — **updated** (AI Capability Context reference)
- `docs/system-upgrade/26-platform-capabilities-catalog.md` — **updated** (AI Capability Context section)
- `docs/system-upgrade/35-platform-capabilities-build-order.md` — **updated** (capability context deliverables per round)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (16 context-layer tasks: context endpoint, prompt builder, action filtering, invalidation, security tests)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 025 entry)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### New Findings
- Context must be guidance-only — a forged context injected via network interception cannot authorize actions because the backend re-check (`runtime_permission_check`) is independent
- `context_version` Redis pattern is the correct invalidation mechanism — atomic INCR, checked at execution time (HTTP 409 if stale)
- Denied categories must be human-readable strings (not action IDs) — exposing unauthorized action IDs informs attackers of the platform's action surface
- Voice sessions need a hard ceiling of 8 actions and a `VOICE_PROMPT_ADDENDUM` to prevent verbose/ambiguous voice execution
- AI service accounts (is_ai_agent=True) must never receive confirmation-required actions — no human to confirm
- Personalization (org discovery profile, onboarding mode) must explicitly NOT expand permissions — phrased as "influences suggestions only"

### Decision Changes
- ADR-023: Personalized AI Capability Context

### Backlog Changes
- 16 tasks added across R027–R031: context dataclass, builder, endpoint, prompt builder, action filtering, unavailable category summaries, role-specific policies, voice addendum, stale detection, invalidation hooks, and 5 security tests

---

## 2026-04-24 — Round 024 (Architecture): AI Action Platform

### Files Changed
- `docs/system-upgrade/36-ai-action-platform.md` — **created** (22-section architecture spec)
- `docs/system-upgrade/14-decision-log.md` — **updated** (ADR-021 Dangerous Action Standard formalized; ADR-022 AI Delegated Action Platform added)
- `docs/system-upgrade/10-target-architecture.md` — **updated** (AI Delegated Action Platform section)
- `docs/system-upgrade/24-core-platform-and-module-system.md` — **updated** (§15 module manifest `aiActions` extension)
- `docs/system-upgrade/26-platform-capabilities-catalog.md` — **updated** (AI Delegated Action Platform section; updated timestamp)
- `docs/system-upgrade/35-platform-capabilities-build-order.md` — **updated** (R027–R031 AI Action Platform parallel track; expanded gate summary table)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (16 AI Action Platform tasks across R027–R031)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 024 entry)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### New Findings
- Existing system has two separate action planes that needed bridging: `PlatformAction` (UI/UX) + `AIAction` HTTP model (backend org-defined actions)
- `ToolInvocation` + `ApprovalService` reusable for DESTRUCTIVE tier — no new approval queue required
- `AIActionConfirmationToken` (single-use, 120s TTL, SHA-256 parameter hash) is the correct anti-replay mechanism
- Voice ceiling confirmed: `danger_level >= "high"` cannot use verbal confirm — always requires dashboard approval queue
- AI agents inherit exactly the authenticated user's permissions — no new permission model needed
- `apps/ai_settings/models/action.py` already has org-defined HTTP-callable `AIAction` model — layer 2 of registry is already built
- Platform-static actions (layer 1) need a new `platform_actions.py` registry mirroring TypeScript module manifests

### Decision Changes
- ADR-021: Dangerous Action Standard (formalized — was referenced in code as future ADR, now recorded)
- ADR-022: AI Delegated Action Platform (new — 5-phase implementation, R027–R031)

### Backlog Changes
- 16 implementation tasks added (R027–R031): registry, executor, confirmation flow, voice flow, approval queue, DESTRUCTIVE tier, module manifests, org config UI, command palette integration, AI action test harness

---

## 2026-04-24 — Round 023 (Planning): Platform Capabilities Build Order

### Files Changed

**platform-ui:**
- `docs/system-upgrade/35-platform-capabilities-build-order.md` — **created** (dependency graph, next 10 rounds, anti-overengineering rules, acceptance criteria per round)
- `docs/system-upgrade/26-platform-capabilities-catalog.md` — **updated** summary table with build-order round column
- `docs/system-upgrade/12-migration-roadmap.md` — **updated** Phase 0 marked complete (R005–R022)
- `docs/system-upgrade/15-action-backlog.md` — **updated** capability tasks reorganized by round (R023–R032)
- `docs/system-upgrade/96-rounds-index.md` — **updated** R022 next-round pointer + R023 planning entry
- `docs/system-upgrade/98-change-log.md` — **updated**

### New Findings
- Helpdesk gate requires 6 capability items — 3 can be done in R023 (< 3 hours total)
- Production gate adds 4 more items — all achievable by R026
- 10 capabilities safely deferred to Phase 3+ without blocking any critical module
- `DetailView` extraction is the most visible pending debt — 3rd duplicate will be created if not extracted before Helpdesk

### Decision Changes
- None — planning only; no code changed

### Backlog Changes
- All capability backlog tasks reorganized into R023–R032 rounds with confirmed consumers

---

## 2026-04-24 — Round 022: Security Blockers Closure

### Files Changed

**platformengineer:**
- `apps/authentication/jwt_auth.py` — **added** `record_activity()` helper; **removed** `?token=` query-param fallback from `jwt_required` (L3 fix)
- `apps/authentication/jwt_routes.py` — **added** `auth.login`, `auth.login_failed`, `auth.logout` audit writes using `record_activity`
- `apps/authentication/user_api_routes.py` — **added** `record_activity` import; PII-001: non-admins now see only own record in `GET /api/users`; **added** `user.create`, `user.update`, `user.approve` audit writes
- `apps/admin/org_api_routes.py` — **added** `record_activity` import; **added** `org.create`, `org.update` audit writes
- `apps/authentication/role_api_routes.py` — **added** `record_activity` import; **added** `role.create`, `role.update`, `role.permissions_replace` audit writes

**platform-ui:**
- `lib/platform/auth/types.ts` — **added** `is_system_admin?: boolean` to `FlaskUserPayload`; `is_system_admin: boolean` to `NormalizedAuthUser`
- `lib/auth/options.ts` — **added** `is_system_admin: user.is_system_admin ?? false` to `normalizeFlaskUser()`
- `lib/platform/permissions/rbac.ts` — **fixed** `isSystemAdmin()` to return `user.is_system_admin` instead of `user.is_admin`
- `docs/system-upgrade/31-production-security-headers.md` — **created** (CSP planning doc)
- `docs/system-upgrade/30-security-hardening-audit.md` — **updated** with R022 status (all blockers resolved)
- `docs/system-upgrade/06-security-assessment.md` — **updated** with R022 column
- `docs/system-upgrade/96-rounds-index.md` — **updated** (R022 entry)
- `docs/system-upgrade/98-change-log.md` — **updated**

### New Findings
- All R021 deferred items resolved in this round

### Decision Changes
- `isSystemAdmin()` now correctly distinguishes system-admin from org-admin (was returning `is_admin`)

### Backlog Changes
- AUD-001, PII-001, M2, L3 — all closed
- Remaining open: CSP enforcement (plan created), L4 (15-min JWT window — acceptable)

---

## 2026-04-24 — Round 021: Security Hardening Audit

### Files Changed

**platformengineer:**
- `apps/authentication/user_api_routes.py` — **added** `PATCH /api/users/<id>/active` with admin guard, self-deactivation block, idempotency, `UserActivity` audit write
- `apps/admin/org_api_routes.py` — **added** `PATCH /api/organizations/<id>/active` with system-admin guard, idempotency, `UserActivity` audit write

**platform-ui:**
- `app/api/proxy/[...path]/route.ts` — **hardened** proxy PATH_MAP: strict allowlist, unknown prefix → 404 (removed `?? /api/${prefix}` fallback)
- `lib/platform/request/context.ts` — **hardened** header names: `X-User-Id` → `X-Client-User-Id`, `X-Org-Id` → `X-Client-Org-Id`
- `lib/auth/options.ts` — **added** `events.signOut` handler calling Flask `/api/auth/logout` to invalidate refresh token
- `docs/system-upgrade/30-security-hardening-audit.md` — **created** (full audit findings, RBAC matrix, tenant isolation review, audit readiness matrix)
- `docs/system-upgrade/06-security-assessment.md` — **updated** with R021 status table
- `docs/system-upgrade/96-rounds-index.md` — **updated** (R020 + R021 entries)
- `docs/system-upgrade/98-change-log.md` — **updated**

### New Findings
- **HIGH** Proxy PATH_MAP fallback: authenticated users could reach any Flask endpoint → FIXED
- **HIGH** Missing `/users/<id>/active` and `/organizations/<id>/active` Flask endpoints → FIXED
- **MEDIUM** `X-User-Id`/`X-Org-Id` header names look authoritative → FIXED (renamed)
- **LOW** Logout didn't invalidate Flask refresh token → FIXED
- **DEFERRED** AUD-001: audit trail gaps for create/update events — pre-production blocker
- **DEFERRED** PII-001: email visible in user list to all org members — pre-production blocker
- **DEFERRED** M2: `is_system_admin` not in NormalizedAuthUser — before enterprise multi-tenant
- **DEFERRED** L3: query-param `?token=` in `jwt_required` — before production

### Decision Changes
- Confirmed: backend must never trust `X-Client-*` advisory headers for auth decisions

### Backlog Changes
- AUD-001 added to pre-production backlog (audit trail for create/update)
- PII-001 added to pre-production backlog (email visibility restriction)
- L3 (query-param token removal) added to pre-production backlog

---

## 2026-04-24 — Round 020: Dangerous Actions + ConfirmAction Standard

### Files Changed
- `lib/platform/actions/` — **created** (types.ts, danger-level.ts, definitions.ts, index.ts — ADR-021 cross-platform standard)
- `lib/hooks/use-dangerous-action.ts` — **created** (ties PlatformAction to mutation with dialog state)
- `components/shared/confirm-action-dialog.tsx` — **hardened** (full DangerLevel support: badge, reason textarea, typed confirmation)
- `lib/api/users.ts` — **added** `setUserActive(id, isActive, reason)`
- `lib/api/organizations.ts` — **added** `setOrgActive(id, isActive, reason)`
- `app/(dashboard)/users/[id]/page.tsx` — **added** deactivate/reactivate buttons + ConfirmActionDialog
- `app/(dashboard)/organizations/[id]/page.tsx` — **added** deactivate/reactivate buttons + ConfirmActionDialog
- `lib/auth/options.ts` — **removed** `accessToken` from client session (XSS fix)
- `app/(auth)/login/page.tsx` — **fixed** open redirect on callbackUrl
- `app/api/proxy/[...path]/route.ts` — **fixed** catch block topology leak

### New Findings
- `accessToken` in session.user = XSS/extension exfiltration risk → removed
- `callbackUrl` query param not validated → open redirect → fixed
- Proxy catch block leaked error messages with internal URLs → stripped
- `useCountUp` in `.map()` = React hooks violation → extracted component
- Unstable `reset` function caused infinite render loop → wrapped in `useCallback`

### Decision Changes
- ADR-021: Dangerous Action Standard adopted (`DangerLevel` scale, `useDangerousAction`, `ConfirmActionDialog`)

### Backlog Changes
- Deactivate/reactivate user and org promoted from backlog to done

---

## 2026-04-24 — Round 019: Organizations Phase B + Admin Mutation Standard

### Files Changed
- `apps/admin/org_api_routes.py` — **hardened** (IntegrityError handling, slug regex, name length, no raw exc leak)
- `lib/modules/organizations/schemas.ts` — **created** (createOrgSchema + editOrgSchema)
- `lib/api/organizations.ts` — **updated** (CreateOrgInput/EditOrgInput from schemas)
- `components/modules/organizations/organization-form.tsx` — **created** (OrgCreateSheet + OrgEditSheet)
- `app/(dashboard)/organizations/page.tsx` — **updated** (add create button + OrgCreateSheet)
- `app/(dashboard)/organizations/[id]/page.tsx` — **updated** (add edit button + OrgEditSheet)
- `docs/modules/02-organizations/IMPLEMENTATION.md` — **rewritten** (Phase B complete)
- `docs/modules/02-organizations/module.manifest.json` — **updated** (v1.1.0, Phase B features)

### New Findings
- Backend POST/PATCH were already implemented in R013 — only hardening needed
- Slug auto-generation (client-side only) is idiomatic for org creation UX
- Slug must be immutable after creation — no `slug` field in PATCH, edit form shows it read-only
- `OrgCreateSheet` + `OrgEditSheet` pattern validates the R017 mutation standard on a second multi-tenant module
- `is_active` toggle in edit form is safe UX; dedicated deactivation action with `ConfirmActionDialog` is backlog

### Decision Changes
- No new ADRs — pattern confirms ADR-019 (usePlatformMutation) is reusable across multi-tenant modules

### Backlog Changes
- Organizations: create/edit marked ✅; deactivate-with-confirm + org-members-list remain backlog

---

## 2026-04-24 — Round 018: Roles & Permissions Core Module

### Files Changed
- `apps/authentication/role_api_routes.py` — **created** (platformengineer; 6 endpoints)
- `apps/__init__.py` — **updated** (role_api_bp registration)
- `lib/modules/roles/types.ts` — **created**
- `lib/modules/roles/schemas.ts` — **created**
- `lib/api/roles.ts` — **created**
- `lib/api/query-keys.ts` — **updated** (roles keys)
- `components/modules/roles/role-permission-badge.tsx` — **created**
- `components/modules/roles/roles-table.tsx` — **created**
- `components/modules/roles/role-form.tsx` — **created** (RoleCreateSheet + RoleEditSheet + PermissionChecklist)
- `app/(dashboard)/roles/page.tsx` — **created**
- `app/(dashboard)/roles/[id]/page.tsx` — **created**
- `app/api/proxy/[...path]/route.ts` — **updated** (roles PATH_MAP)
- `docs/modules/03-roles-permissions/PLAN.md` — **updated** (actual implementation)
- `docs/modules/03-roles-permissions/IMPLEMENTATION.md` — **created**
- `docs/modules/03-roles-permissions/module.manifest.json` — **created**

### New Findings
- Roles are GLOBAL (no org_id) — shared across all organizations
- Flask routing order matters: static routes (`/permissions`) must precede param routes (`/<int:id>`)
- Two-mutation edit strategy: PATCH meta first, PATCH permissions only if set changed
- Permission dot-notation (`module.action`) enables client-side grouping via `groupPermissions()`
- All shared capabilities (PageShell, PlatformForm, usePlatformMutation, DataTable, DetailView) reused without modification

### Decision Changes
- Permission model standard: codenames use `module.action` dot-notation; `groupPermissions()` is the client-side splitter

### Backlog Changes
- Roles module backlog: delete-role, role-users-list-tab, permission-create-ui, bulk-role-assign, e2e-tests

---

## 2026-04-24 — Round 017: Users Phase B — Mutations + Form Standard

### Files Changed (platform-ui — commit 2592dde)
- `lib/hooks/use-platform-mutation.ts` — **created** (shared TanStack mutation hook, error normalization, cache invalidation)
- `lib/modules/users/schemas.ts` — **created** (createUserSchema, editUserSchema, Zod v4)
- `lib/modules/users/types.ts` — **updated** (RoleSummary, RolesListResponse, UserMutationResponse, role_id added)
- `lib/api/users.ts` — **updated** (createUser, updateUser, fetchRoles)
- `components/modules/users/user-form.tsx` — **created** (UserCreateSheet, UserEditSheet)
- `app/api/proxy/[...path]/route.ts` — **updated** (PATCH handler added)
- `app/(dashboard)/users/page.tsx` — **updated** ("הוסף משתמש" button + UserCreateSheet)
- `app/(dashboard)/users/[id]/page.tsx` — **updated** ("ערוך" button + UserEditSheet)

### Files Changed (platformengineer — commit a1780f1c)
- `apps/authentication/user_api_routes.py` — **updated**
  - `GET  /api/users/roles` — role dropdown (admin only)
  - `POST /api/users` — create user (admin; org_id from JWT)
  - `PATCH /api/users/<id>` — update user fields (admin or own name)
  - `role_id` added to `_serialize_user_summary` for edit form pre-population

### Mutation Standard Established
| Component | Role |
|-----------|------|
| `usePlatformMutation` | Wraps `useMutation`, normalizes errors, invalidates query cache |
| `PlatformForm` | `<form>` shell with aria-busy + isSubmitting |
| `FormError` | Displays serverError string below form header |
| `FormActions` | Submit + Cancel buttons with loading state |
| `lib/modules/<m>/schemas.ts` | Zod schema + inferred input types |
| `lib/api/<m>.ts` | Mutation API functions (`createX`, `updateX`) |

### Decision Changes
- ADR-019 established (see 14-decision-log.md): usePlatformMutation as the org-wide mutation standard

### Backlog Changes
- Users Phase B ✅ complete
- PlatformForm capability ✅ complete (§03 in catalog)
- PlatformAction 🔵 partial (§04 — usePlatformMutation done; ConfirmDialog pending)

---

## 2026-04-24 — Round 016: CP-0 Boundary Extraction

### Files Changed
- `lib/platform/index.ts` — **created** (root barrel, all platform exports)
- `lib/platform/auth/types.ts` + `index.ts` — **created** (NormalizedAuthUser, FlaskUserPayload — no next-auth)
- `lib/platform/permissions/rbac.ts` + `index.ts` — **created** (pure RBAC functions)
- `lib/platform/formatting/format.ts` + `index.ts` — **created** (pure Intl.* formatters)
- `lib/platform/export/csv.ts` + `index.ts` — **created** (rowsToCsv, escapeCsvCell — no Blob)
- `lib/platform/request/context.ts` + `index.ts` — **created** (buildAuditHeaders, generateRequestId)
- `lib/platform/data-grid/types.ts` + `index.ts` — **created** (SortDirection, TableFilter, PaginationParams, etc.)
- `lib/platform/modules/users/types.ts` — **created** (re-export of lib/modules/users/types)
- `lib/platform/modules/organizations/types.ts` — **created** (re-export)
- `lib/auth/types.ts` — **updated** (re-export platform types + next-auth augmentation only)
- `lib/auth/rbac.ts` — **updated** (re-export shim from lib/platform/permissions/rbac)
- `lib/utils/format.ts` — **updated** (re-export shim from lib/platform/formatting)
- `lib/utils/csv.ts` — **updated** (imports pure CSV from platform; keeps browser download layer)
- `lib/api/request-context.ts` — **updated** (re-export shim from lib/platform/request)
- `lib/api/client.ts` — **updated** (configurable base URL: NEXT_PUBLIC_API_BASE_URL ?? "/api/proxy")
- `docs/system-upgrade/14-decision-log.md` — **updated** (ADR-018: platform boundary)
- `docs/system-upgrade/28-cross-platform-structure-audit.md` — **updated** (CP-0 status, readiness 55→68/100)

### New Findings
- `lib/platform/` creates a clean, checkable boundary — any accidental DOM/next-auth import fails at typecheck time
- Re-export shim pattern is zero-risk: existing web imports continue to work unchanged
- `NEXT_PUBLIC_API_BASE_URL` env var enables future Electron or direct-connect mobile without code changes

### Decision Changes
- ADR-018: `lib/platform/*` = cross-platform only. `lib/` (non-platform) = web OK. All new cross-platform logic goes to platform/ first.

### Backlog Changes
- Marked done: CP-0 type extraction, lib/platform/ creation, rowsToCsv extraction, API base URL parameterization

---

## 2026-04-24 — Round 016 (prep): Cross-Platform Structure Audit

### Files Changed
- `docs/system-upgrade/28-cross-platform-structure-audit.md` — **created** (16 sections)
- `docs/system-upgrade/10-target-architecture.md` — **updated** (CP readiness block + blockers table)
- `docs/system-upgrade/12-migration-roadmap.md` — **updated** (Migration Principle #10: platform boundary)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (CP-0, CP-1, CP-2 task sections)

### New Findings
- `lib/auth/rbac.ts` is already cross-platform — zero changes needed
- `lib/utils/format.ts` uses only `Intl.*` — compatible with React Native 0.70+
- `lib/auth/types.ts` is the single biggest mobile blocker — next-auth augmentation mixed with user types
- `lib/api/client.ts` hardcodes `/api/proxy` — one-line fix unblocks Electron + native HTTP use
- `lib/utils/csv.ts` `rowsToCsv()` is portable; only `downloadCsv()` uses browser APIs — easy split
- Overall readiness 55/100: logic excellent, API transport problematic, shell intentionally web-only

### Decision Changes
- Migration Principle #10 added: new `lib/` files must be classified `lib/platform/` or `lib/web/`

### Backlog Changes
- Added CP-0 (type extraction), CP-1 (transport), CP-2 (component splitting) task sections

---

## 2026-04-24 — Round 015: Capability Hardening

### Files Changed
- `lib/ui/motion.ts` — **created** (shared PAGE_EASE constant)
- `components/shared/detail-view/` — **created** (InfoRow, BoolBadge, DetailSection, DetailHeaderCard, DetailBackButton, DetailLoadingSkeleton + index)
- `components/shared/stats/` — **created** (StatCard, StatsGrid + index)
- `components/shared/page-shell/` — **created** (PageShell + index)
- `components/shared/error-state.tsx` — **created**
- `components/shared/error-boundary.tsx` — **created**
- `components/shared/form/` — **created** (PlatformForm, FormActions, FormError + index)
- `components/shared/confirm-action-dialog.tsx` — **created**
- `app/(dashboard)/users/[id]/page.tsx` — **refactored** (removed local InfoRow/BoolBadge/ease/back button/loading/error)
- `app/(dashboard)/users/page.tsx` — **refactored** (replaced StatChip + LazyMotion header + inline error with PageShell + StatCard + ErrorState)
- `app/(dashboard)/organizations/[id]/page.tsx` — **refactored** (same as users detail page)
- `app/(dashboard)/organizations/page.tsx` — **refactored** (same as users list page)
- `docs/modules/02-organizations/IMPLEMENTATION.md` — **created**
- `docs/system-upgrade/14-decision-log.md` — **updated** (ADR-017 added)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (7 tasks marked done)
- `docs/system-upgrade/26-platform-capabilities-catalog.md` — **updated** (6 capability statuses updated)

### New Findings
- `InfoRow` + `BoolBadge` helpers were character-for-character identical in Users and Orgs detail pages — classic promotion case
- `PageShell` removes ~20 lines of boilerplate from every future module list page
- `DetailBackButton` subsumes `useRouter` — detail pages no longer need the router import for navigation
- `ConfirmActionDialog` uses `shadcn/ui Dialog` (not AlertDialog — not installed); this is the correct pattern

### Decision Changes
- ADR-017: Shared Capabilities Promotion Policy (2+ occurrences → promote to `components/shared/`)

### Backlog Changes
- Marked done: ErrorBoundary, ErrorState, PageShell, DetailView, StatCard, PlatformForm, ConfirmDialog

---

## 2026-04-24 — Round 014: Platform Capabilities Catalog

### Files Created (platform-ui)
- `docs/system-upgrade/26-platform-capabilities-catalog.md` — **created** (30 platform capabilities; 7 fields each: purpose, modules, libraries, first scope, security/multi-tenant, AI-maintainability, priority)

### Files Updated (platform-ui)
- `docs/system-upgrade/10-target-architecture.md` — **updated** (added capability-first AI principle; added Platform Capabilities Layer section with status table)
- `docs/system-upgrade/12-migration-roadmap.md` — **updated** (added migration principle #9: capability-first)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (new "Platform Capabilities Catalog" section: 25 tasks across now/next/later tiers)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 014 entry)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### Capability Status Snapshot (as of Round 014)
| Status | Capabilities |
|--------|-------------|
| ✅ Implemented | DataGrid (01), PermissionGate (05), TenantContext (19), API Client (22) |
| 🔵 Partial | Dashboard (02), ImportExport CSV (06), DetailView (08), ModuleRegistry (18) |
| ⬜ Pending Now | ErrorBoundary (21), PageShell (07), Form (03), Action (04), FeatureFlags (17), Notifications (12) |
| ⬜ Pending Next | Timeline (09), ApprovalFlow (13), Settings (16), Realtime (11+23), JobRunner (14), Wizard (15), Billing (26), Policy (27) |
| ⬜ Pending Later | AuditLog (10), FileManager (24), Integration (25), Privacy (20), Help (28), TestHarness (29), DevDocs (30) |

### New Rules Added
- Capability-First Rule: check `26-platform-capabilities-catalog.md` before building any module feature (added to doc 10 §AI Principles, doc 12 §Migration Principles)
- Module-local implementations used in 2+ modules must be promoted to the catalog

---

## 2026-04-24 — Round 013: Module 02 Organizations

### Files Created (platformengineer)
- `apps/admin/org_api_routes.py` — **created** (Flask JWT blueprint: list/stats/detail/create/update; tenant safety enforced)

### Files Updated (platformengineer)
- `apps/__init__.py` — **updated** (registered `org_api_bp` at `/api/organizations`)

### Files Created (platform-ui)
- `lib/modules/organizations/types.ts` — **created** (OrgSummary, OrgsListResponse, OrgDetailResponse, OrgStatsResponse, CreateOrgResponse, payload types)
- `lib/api/organizations.ts` — **created** (fetchOrgs, fetchOrgStats, fetchOrg, createOrg, updateOrg)
- `components/modules/organizations/org-status-badge.tsx` — **created** (active/inactive badge)
- `components/modules/organizations/orgs-table.tsx` — **created** (uses shared DataTable, defines org columns)
- `app/(dashboard)/organizations/page.tsx` — **created** (list page, system-admin gate via PermissionGate, stats chips)
- `app/(dashboard)/organizations/[id]/page.tsx` — **created** (detail page, own-org or system-admin, formatted fields)
- `docs/modules/02-organizations/module.manifest.json` — **created**

### Files Updated (platform-ui)
- `app/api/proxy/[...path]/route.ts` — **updated** (added `"organizations": "/api/organizations"`)
- `lib/api/query-keys.ts` — **updated** (added `orgs` key group)
- `docs/modules/02-organizations/PLAN.md` — **updated** (DoD: 9 items marked complete)

### Files Deleted (platform-ui)
- `components/shared/data-table-client.tsx` — **deleted** (unused legacy; confirmed no imports)

### New Findings
- `Organization` model in `apps/authentication/models.py` only has `id` column — full org data requires raw SQL (already done in existing admin routes)
- `PermissionGate systemAdminOnly` pattern validated end-to-end

### Capability Reuse Summary (ADR-016 validation)
- `DataTable<OrgSummary>` — used ✓
- `PermissionGate systemAdminOnly` — used ✓
- `formatDate` from lib/utils/format — used ✓
- `OrgStatusBadge` — created following UserStatusBadge pattern ✓

### TypeScript Typecheck
EXIT 0

---

## 2026-04-24 — Round 012: Capability Layer Foundation

### Files Created (platform-ui)
- `components/shared/data-table/types.ts` — **created** (DataTableProps, PaginationState interfaces)
- `components/shared/data-table/table-skeleton.tsx` — **created** (animated skeleton rows for loading state)
- `components/shared/data-table/pagination.tsx` — **created** (RTL-aware prev/next pagination with page indicator)
- `components/shared/data-table/data-table.tsx` — **created** (generic server-side DataTable wrapping TanStack Table)
- `components/shared/data-table/index.ts` — **created** (barrel exports)
- `components/shared/permission-gate.tsx` — **created** (role/permission/adminOnly gate with hide/disable modes)
- `lib/hooks/use-permission.ts` — **created** (session-aware isRole/can/isAdmin helpers)
- `lib/utils/format.ts` — **created** (formatDate, formatDateTime, formatRelativeTime, formatNumber, formatCurrency, formatBytes — he-IL locale, Asia/Jerusalem TZ)
- `lib/utils/csv.ts` — **created** (rowsToCsv, downloadCsv, exportToCsv with BOM for Hebrew Excel compat)
- `lib/api/request-context.ts` — **created** (buildAuditHeaders, generateRequestId)

### Files Updated (platform-ui)
- `components/shared/data-table.tsx` → **renamed** to `components/shared/data-table-client.tsx` (client-side legacy table; avoid directory name collision)
- `components/modules/users/users-table.tsx` — **refactored** (delegates table shell to shared DataTable; uses formatDate from lib/utils/format; reduced from 241 to ~120 lines)
- `app/api/proxy/[...path]/route.ts` — **updated** (attaches X-Request-ID, X-User-Id, X-Org-Id, X-Client-Source audit headers)
- `docs/modules/02-organizations/PLAN.md` — **updated** (full endpoint audit: all routes use session cookie auth, not JWT; ADR-015 pattern required; capability layer alignment section added)
- `docs/system-upgrade/25-open-source-capability-layer.md` — **updated** (implementation status updated, DataTable reference path corrected)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (10 tasks marked done, 2 new tasks added)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 012 entry)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### New Findings
- `components/shared/data-table.tsx` existed (client-side only, no TanStack) — renamed to avoid name conflict
- `components/shared/empty-state.tsx` existed and was already good — no changes needed
- Organizations endpoints all use `_require_admin()` (Flask-Login session) — ADR-015 pattern required again
- JWT token in proxy is `token.user.id` / `token.user.org_id` (not flat `token.userId`)

### Decision Changes
- None new — implements ADR-016

### Backlog Changes
- 10 capability layer tasks marked `[x] 2026-04-24`
- 2 new tasks added: request-context helper, UsersTable refactor

---

## 2026-04-24 — Round 011: Open-Source Capability Layer

### Files Changed (platform-ui)
- `docs/system-upgrade/25-open-source-capability-layer.md` — **created** (18 sections: DataGrid, charts, forms, URL state, import/export, permissions, multi-tenant safety, audit mutations, dashboard layout, dates, toasts, skeletons, empty states, RTL conventions, file gates, install order, what NOT to add, ADR reference)
- `docs/system-upgrade/14-decision-log.md` — **updated** (ADR-016: Open-Source Capability Layer)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (new section: 14 capability layer tasks — install nuqs, shared components, PermissionGate, date utils, CSV export, proxy audit headers)
- `docs/system-upgrade/11-recommended-tech-stack.md` — **updated** (capability layer standards block with approved additions list)
- `docs/system-upgrade/12-migration-roadmap.md` — **updated** (Phase 1: capability layer foundation added as first deliverable)
- `docs/modules/ROADMAP.md` — **updated** (module start checklist: step 3 now requires reading capability layer doc; module file structure expanded)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 011 entry, upcoming rounds updated)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### New Findings
- BOM (`\uFEFF`) required for Hebrew CSV export (Excel on Windows misreads UTF-8 without it)
- `nuqs` not yet installed — blocks all list page filter/pagination URL state
- `PermissionGate` + `usePermission()` missing — must be created before any module with destructive actions
- `react-grid-layout` correctly deferred to Phase 3 (no dashboard builder until Monitoring module)
- `org_id` safety rule formalized: always from `session.user.org_id`, never URL params

### Decision Changes
- ADR-016 added: Open-Source Capability Layer — standardizes library choices for all 19 modules

### Backlog Changes
- Added "Open-Source Capability Layer" section to `15-action-backlog.md` (14 new P1/P2 tasks)

---

## 2026-04-24 — Round 010: Module 01 Users (First Module)

### Files Changed (platformengineer)
- `apps/authentication/user_api_routes.py` — **created** (JWT user management API: list, stats, pending, detail, approve)
- `apps/__init__.py` — **updated** (register user_api_bp at /api/users)

### Files Changed (platform-ui)
- `lib/modules/users/types.ts` — **created** (UserSummary, UserDetail, response envelopes, UsersListParams)
- `lib/api/users.ts` — **created** (fetchUsers, fetchUser, fetchUserStats, fetchPendingUsers, approveUser)
- `lib/api/query-keys.ts` — **updated** (users.all/stats/list/detail/pending keys)
- `lib/auth/options.ts` — **updated** (remove is_admin role-name workaround; Round 009 fix applied)
- `app/api/proxy/[...path]/route.ts` — **updated** (users PATH_MAP: /admin/users → /api/users)
- `app/(dashboard)/users/page.tsx` — **created** (list page: stats, pending banner, search, paginated table, error/empty states)
- `app/(dashboard)/users/[id]/page.tsx` — **created** (detail page: profile, security, permissions)
- `components/modules/users/users-table.tsx` — **created** (TanStack Table with pagination, search, skeleton)
- `components/modules/users/user-status-badge.tsx` — **created** (active/inactive/pending badge)
- `components/modules/users/user-role-badge.tsx` — **created** (colored role badge)
- `docs/modules/01-users/IMPLEMENTATION.md` — **created** (data flow, file map, limitations, agent guide, checklist)
- `docs/modules/01-users/module.manifest.json` — **created** (routes, permissions, endpoints, data ownership)
- `docs/modules/01-users/PLAN.md` — **updated** (actual endpoints, DoD status)
- `docs/modules/ROADMAP.md` — **updated** (Users: ⬜ → 🔵)
- `docs/auth/README.md` — **updated** (resolved Round 009 gaps)
- `docs/system-upgrade/14-decision-log.md` — **updated** (ADR-015 added)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 010 entry)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### New Findings
- `/admin/users` routes are HTML-only (Jinja2) — cannot be used from platform-ui
- `/api/v1/users` uses API Token auth, incompatible with JWT Bearer
- Module-first JSON API pattern needed for every module migration (ADR-015)
- AI agent users are now filtered from all list queries by default

### Decision Changes
- ADR-015 added: module-first JSON API pattern
- ADR-015 superceeds the PLAN.md assumption that `/admin/users` returns JSON

### Backlog Changes
- Users Phase 2: create form, edit form, pending approval page — added as Phase 2 items

---

## 2026-04-24 — Round 009: Backend Auth Contract Hardening

### Files Changed
- `apps/authentication/jwt_routes.py` — **updated** (`_user_to_dict` → `serialize_auth_user` with `permissions[]`, `is_admin`, `is_system_admin`, `is_manager`, `is_ai_agent`; `GET /api/auth/me` fixed with `@jwt_required` + correct response envelope; `POST /api/auth/logout` added)
- `apps/authentication/tests/test_jwt_routes_v2.py` — **created** (10 tests: serialize_auth_user × 4, /me × 3, /logout × 3)
- `apps/authentication/INDEX.md` — **updated** (JWT routes quick lookup expanded; platform-ui integration section added with field table + security rules)
- `docs/system-upgrade/13-open-questions.md` — **updated** (Q14 fully resolved — permissions now returned)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (Phase B all 4 tasks marked done; Phase B.1 follow-ups added: remove is_admin workaround from options.ts, update auth README)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 009 entry added; upcoming rounds updated)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### New Findings
- `apps/__init__.py` CORS `after_request` already matches `http://localhost*` — `localhost:3000` covered, no change needed
- Existing `/me` had two bugs: wrong JWT claim key (`sub` vs `user_id`) and non-standard response format
- `is_admin` is a real DB boolean column — `normalizeFlaskUser()` role-name derivation in `lib/auth/options.ts` can now be removed
- `mobile_refresh_token` stores SHA256 hash — logout can genuinely revoke refresh tokens (not just expiry-based)

### Decision Changes
- None new — Phase B tasks close out ADR-011 implementation

### Backlog Changes
- Phase B: 4 tasks → `[x] 2026-04-24`
- Phase B.1 added: remove is_admin workaround (P1), update auth README (P2)

---

## 2026-04-24 — Round 008: Module Data Export/Import Design

### Files Changed
- `docs/system-upgrade/24-core-platform-and-module-system.md` — **created** (14 sections: data ownership, dataContract spec, package format, export scopes, import modes, ID remapping, tenant mapping, security rules, 7 backend models, UI flows, AI-agent safety, risks, acceptance criteria)
- `docs/system-upgrade/10-target-architecture.md` — **updated** (Module Data Ownership section added before AI-Agent Design Principles)
- `docs/system-upgrade/12-migration-roadmap.md` — **updated** (Phase 3.5 Module Export/Import added)
- `docs/system-upgrade/14-decision-log.md` — **updated** (ADR-014 added)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (Module Data Export/Import section: 35 tasks across foundation, models, export pipeline, import pipeline, security, platform-ui)
- `docs/system-upgrade/13-open-questions.md` — **updated** (Q21–Q25 added: large tables, blob attachments, Celery queues, S3 setup, existing manifests)
- `docs/system-upgrade/97-source-of-truth.md` — **updated** (module system row added; ADR highest updated to ADR-014)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 008 entry added; upcoming rounds updated)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### New Findings
- Raw SQL dump is the anti-pattern to avoid — governed JSONL package is the correct model
- Three table categories (owned/referenced/core) must be declared per module before export is enabled
- Secrets must be excluded at the platform level (registry), not solely at the module level
- `replace-module-data` and `restore-snapshot` import modes are system-admin only
- Download link expiry policy: 24h tenant data, 7d config-only, 4h system-wide
- Q21–Q25 added: need to audit large tables (>100k rows), S3 setup, and existing manifests before implementation

### Decision Changes
- ADR-014 added: Tenant-Aware Module Data Export/Import

### Backlog Changes
- 35 new tasks added in §Module Data Export/Import section of `15-action-backlog.md`
- Covers: dataContract schema, secret registry, 7 backend models, JSONL export writer, ID remapping, dry-run validator, import transaction wrapper, anonymization, checksums, 5 platform-ui screens, 3 security tests

---

## 2026-04-24 — Round 007: Auth Phase A Implementation

### Files Created
- `lib/auth/types.ts` — Flask response types, NormalizedAuthUser, next-auth Session/JWT augmentation
- `lib/auth/options.ts` — authOptions: Credentials provider, jwt callback (with refresh), session callback
- `lib/auth/rbac.ts` — hasRole, hasAnyRole, hasPermission, isSystemAdmin, getOrgId
- `app/api/auth/[...nextauth]/route.ts` — NextAuth handler (thin, no logic)
- `components/providers/session-provider.tsx` — client SessionProvider wrapper
- `middleware.ts` — route guard: 401 for proxy, redirect for pages, RefreshTokenError handling
- `docs/auth/README.md` — auth flow diagram, session shape, proxy behavior, backend gaps, agent guide
- `.env.example` — NEXTAUTH_SECRET, NEXTAUTH_URL, FLASK_API_URL documented

### Files Updated
- `app/(auth)/login/page.tsx` — replaced fake setTimeout with `signIn("credentials")`, Hebrew error state
- `app/api/proxy/[...path]/route.ts` — Bearer token via `getToken()`, added PUT/DELETE handlers, expanded PATH_MAP
- `app/layout.tsx` — added NextAuthSessionProvider wrapper
- `docs/system-upgrade/15-action-backlog.md` — Phase A tasks all marked done
- `docs/system-upgrade/96-rounds-index.md` — Round 007 entry added

### New Findings
- `roles` in Flask JWT response is an array — `roles[0]` is the primary role
- `is_admin` not yet returned by `_user_to_dict()` — derived from role name (tracked: Q14 backlog)
- Typecheck passes (tsc --noEmit exit 0) after all auth files created
- No backend changes needed for Phase A (proxy is server-to-server, CORS not an issue)
- `expiresAt` must be tracked manually in Credentials provider (no `account.expires_at` for non-OAuth)

### Decision Changes
- None new — implements ADR-011 and ADR-012 as designed

### Backlog Changes
- Phase A auth tasks: all 10 marked `[x] 2026-04-24`
- Phase 0 "Wire real auth" marked done
- Phase 0 "Add Next.js middleware" marked done
- Remaining: Phase B (Flask additions) and Phase C (hardening)

---

## 2026-04-24 — Round 006: AI-Maintainability and Code Cleanup Policy

### Files Changed
- `docs/system-upgrade/23-ai-maintainability-and-code-cleanup.md` — **created** (15 sections, full cleanup policy)
- `docs/system-upgrade/08-technical-debt-register.md` — **updated** (3 new AI-maintainability debt items: missing INDEX.md, missing file headers, Vite app duplication, Jinja2 co-existence)
- `docs/system-upgrade/09-modernization-opportunities.md` — **updated** (QW-3 expanded from "Delete Dead Code" stub to full AI-maintainability foundations plan)
- `docs/system-upgrade/10-target-architecture.md` — **updated** (added principle 7 + AI-Agent Design Principles table)
- `docs/system-upgrade/12-migration-roadmap.md` — **updated** (added Migration Principles 6-8: cleanup-first, delete Jinja2 on parity, file size gate)
- `docs/system-upgrade/14-decision-log.md` — **updated** (ADR-013 added)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (Phase 0.5 AI-Maintainability section added: 10 tasks)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 006 entry added; upcoming rounds renumbered)
- `docs/system-upgrade/97-source-of-truth.md` — **updated** (AI-maintainability policy row added; ADR highest updated to ADR-013)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### New Findings
- `api_auth_OLD_BACKUP.py` confirmed dead — no imports found; safe to delete after grep-confirm
- No per-module `INDEX.md` exists in any `apps/<module>/` directory — AI agents read full module without orientation
- 4 Vite apps (`ai-agents-ui/`, `ala-ui/`, `ops-ui/`, `dyn-dt-ui/`) have no inventory of feature-vs-platform-ui parity — must scope before retirement
- Jinja2 templates have no tracked relationship to their `render_template` callers — retirement order undefined
- `run.py` is 15KB god-file — primary driver of incorrect agent module attribution
- 39 Alembic parallel heads are intentional — must NOT be consolidated (documented in MEMORY.md)
- File size limits are undefined in current CLAUDE.md — agents generate unbounded files

### Decision Changes
- ADR-013 added: AI-maintainable codebase and cleanup-first modernization

### Backlog Changes
- Phase 0.5 AI-Maintainability section added to `15-action-backlog.md`: 10 tasks covering dead-code sweep, INDEX.md template, file header standard, oversized file list, platform-ui knip scan, Vite app inventory, Jinja2 template inventory

---

## 2026-04-24 — Round 005: Authentication Bridge

### Files Changed
- `docs/system-upgrade/16-auth-bridge-design.md` — **created** (auth bridge design, 15 sections)
- `docs/system-upgrade/14-decision-log.md` — **updated** (ADR-011, ADR-012 added)
- `docs/system-upgrade/13-open-questions.md` — **updated** (Q1/Q2 resolved; Q13/Q14/Q15 added)
- `docs/system-upgrade/15-action-backlog.md` — **updated** (Phase A/B/C auth tasks added; old tasks marked done)
- `docs/system-upgrade/96-rounds-index.md` — **updated** (Round 005 entry added)
- `docs/system-upgrade/98-change-log.md` — **updated** (this entry)

### New Findings
- Flask has two auth systems: Flask-Login (session) + JWT (`/api/auth/login` for mobile). Platform-ui will use JWT.
- `POST /api/auth/login` returns `{data: {token, refresh_token, user: {id,email,org_id,roles}}}` — clean contract.
- `POST /api/auth/refresh` exists — rotation-based (7-day opaque token, SHA256-hashed in DB).
- `next-auth` v4 is installed but not configured. Login page is a stub (no API call).
- No `middleware.ts` — dashboard routes are publicly accessible.
- CSRF auto-check is disabled Flask-side — no CSRF header needed for platform-ui.
- Flask CORS allows only Flutter/localhost ports, not `localhost:3000` — must fix for dev.
- `SESSION_COOKIE_SECURE` not set in Flask production config — security gap.
- RBAC: `@role_required` / `@permission_required` in `rbac.py`. `is_admin=True` bypasses all.
- `_user_to_dict()` in `jwt_routes.py` does NOT include `permissions[]`, only `roles[]`.
- MFA: TOTP session-based. JSON behavior for MFA users is unresolved (Q13).

### Decision Changes
- ADR-011 added: next-auth Credentials + Flask JWT is the chosen auth bridge
- ADR-012 added: No CSRF token required for platform-ui API calls

### Backlog Changes
- Phase A (Next.js side): 8 tasks added — next-auth handler, options, types, SessionProvider, login page, middleware, proxy Bearer header, env vars
- Phase B (Flask side): 4 tasks added — logout endpoint, /me endpoint, CORS, permissions in JWT response
- Phase C (Hardening): 4 tasks added — SSM secret, role nav, E2E test, Flask cookie security
- Previous Phase 0 tasks updated: proxy route marked done, Q1/Q4 marked done

---

## 2026-04-24 — Round 004: Deep Upgrade Planning

### Files Changed
- `docs/UPGRADE_ROADMAP.md` — **created** (287 lines, 5 tiers, 10 quick wins, dependency order, risk register)
- `docs/system-upgrade/96-rounds-index.md` — **created**
- `docs/system-upgrade/97-source-of-truth.md` — **created**
- `docs/system-upgrade/98-change-log.md` — **created** (this file)

### New Findings
- Recharts 3 already installed — covers all chart types except topology (`@xyflow/react`) and drag layout (`@dnd-kit`)
- React Compiler (babel-plugin) is safe to enable incrementally on `lib/` directory
- RSC migration of dashboard stat fetches cuts estimated TTFB by ~400ms
- SSE hook is the single most reusable infrastructure investment — drives tickets, logs, metrics, presence
- Storybook 9 must use `@storybook/nextjs` (not Vite) due to Tailwind v4 PostCSS pipeline
- `nuqs` v2 is the right tool for URL-driven DataTable and chart state in Next.js App Router
- Flask SSE endpoint does not yet exist — SSE hook must mock first, then wire incrementally

### Decision Changes
- ADR-008 proposed: `nuqs` for URL-driven chart/table state
- ADR-009 proposed: SSE over WebSocket for all read-only real-time paths (simpler, no socket library)
- ADR-010 proposed: OpenAPI codegen replaces hand-written `lib/api/types.ts`

### Backlog Changes
- Added 10 quick-win tasks (all ≤1 day) to `docs/UPGRADE_ROADMAP.md §7`
- Tier ordering established: DX (Tier 4) must precede AI-native UX (Tier 1) in implementation

---

## 2026-04-24 — Round 003: Module Mapping & Roadmap

### Files Changed
- `docs/modules/ROADMAP.md` — **created** (priority table, dependency graph, 19 modules)
- `docs/modules/01-users/PLAN.md` through `19-backups/PLAN.md` — **created** (all 19)
- `components/shell/nav-items.ts` — **updated** (8 groups, all 19 routes, correct hrefs, missing icons added)

### New Findings
- All 19 modules have verified Flask endpoints (grep'd from `routes.py` files)
- 6 new proxy prefixes needed: `helpdesk:/helpdesk`, `ai-agents:/ai-agents`, `ala:/api/ala/v1`, `rag:/api/rag`, `billing:/api/billing`, `automation:/automation`
- Helpdesk is largest module (4 days): tickets, SLA, KB, technicians, approval queue, timeline
- Billing has unusually rich API: balance, history, dashboard charts, usage breakdown, rates CRUD
- Knowledge/RAG split: `/api/rag` (REST API) vs `/admin/rag` (UI-backing pages)
- nav-items.ts had wrong hrefs: `/orgs` → `/organizations`, `/health` → `/monitoring`, `/agents` → `/ai-agents`
- Automation (`/automation`) and Integrations (`/integrations`) were missing from nav entirely

### Decision Changes
- ADR-007 proposed: One `PLAN.md` per module as the single implementation spec for that module
- Settings restructured: moved to its own nav group; integrations moved out of settings to standalone

### Backlog Changes
- All 19 module plans now have explicit Definition of Done checklists
- Critical path clarified: Users (01) → Roles (03) → Helpdesk (04) is the dependency chain

---

## 2026-04-23 — Round 002: Shell & Dashboard Build

### Files Changed
- `CLAUDE.md` — **full rewrite** (proxy pattern, useQuery pattern, keyboard shortcuts, sidebar rules, DoD checklist, file structure map)
- `docs/design/COMPONENTS.md` — **updated** (added TiltCard, CursorGlow, EmptyState, Skeleton, DataTable, ConnectionIndicator, SidebarSearch patterns; 8 new anti-patterns)
- `docs/ARCHITECTURE.md` — **updated** (§18 RTL, §19 AI Dashboard, §20 Real-time added; total 833 lines)
- `components/shell/app-sidebar.tsx` — **full rewrite** (search, pinned, recent, collapsible, motion)
- `components/shell/sidebar-search.tsx` — **created**
- `lib/hooks/use-nav-history.ts` — **created** (Zustand persist, recent + pinned)
- `app/api/proxy/[...path]/route.ts` — **created** (Flask proxy, cookie-forwarding, PATH_MAP)
- `lib/api/client.ts`, `types.ts`, `query-keys.ts` — **created**
- `components/shared/tilt-card.tsx`, `cursor-glow.tsx`, `empty-state.tsx`, `data-table.tsx`, `skeleton-card.tsx` — **created**
- `app/(dashboard)/page.tsx` — **rewritten** (real TanStack Query data, skeletons, service health)
- `public/manifest.json` — **created** (PWA, RTL, Hebrew)
- `public/icons/icon-192.png`, `icon-512.png` — **generated** via sharp

### New Findings
- `TableSkeleton` `style` prop error: `<Shimmer>` doesn't accept `style` → must use raw `div`
- `shadcn/ui` Table and Tooltip not auto-generated — must run `npx shadcn@latest add table tooltip`
- Next.js 16 route params are `Promise<{...}>` — must `await params` in catch-all proxy handler
- Flask `/api/ai-settings/stats` and `/admin/api/monitoring/health` both confirmed working
- RTL: `side="right"` on Sidebar, logical CSS properties throughout (`ps-/pe-`, `ms-/me-`)

### Decision Changes
- ADR-005 ratified: Skeleton on every async load state (standardised across all modules)
- ADR-006 ratified: `mounted` guard mandatory on all theme-dependent rendering

### Backlog Changes
- Phase 0 (stabilisation) tasks clarified: auth bridge is the next blocker after proxy is working
- `lib/api/query-keys.ts` centralisation rule added to `CLAUDE.md` anti-patterns

---

## 2026-04-23 — Round 001: Foundation Investigation

### Files Changed
- `docs/system-upgrade/00-executive-summary.md` — **created**
- `docs/system-upgrade/01-current-system-analysis.md` — **created**
- `docs/system-upgrade/02-product-needs-inferred.md` — **created**
- `docs/system-upgrade/03-technology-inventory.md` — **created**
- `docs/system-upgrade/04-architecture-assessment.md` — **created**
- `docs/system-upgrade/05-ui-ux-assessment.md` — **created**
- `docs/system-upgrade/06-security-assessment.md` — **created**
- `docs/system-upgrade/07-scalability-maintainability.md` — **created**
- `docs/system-upgrade/08-technical-debt-register.md` — **created**
- `docs/system-upgrade/09-modernization-opportunities.md` — **created**
- `docs/system-upgrade/10-target-architecture.md` — **created**
- `docs/system-upgrade/11-recommended-tech-stack.md` — **created**
- `docs/system-upgrade/12-migration-roadmap.md` — **created**
- `docs/system-upgrade/13-open-questions.md` — **created**
- `docs/system-upgrade/14-decision-log.md` — **created** (ADR-001 through ADR-004)
- `docs/system-upgrade/15-action-backlog.md` — **created**
- `docs/system-upgrade/README.md` — **created**

### New Findings
- System is production-deployed on EKS (not prototype) with real MSP customers
- 46+ Flask modules, multi-tenant by `org_id`, PostgreSQL + Redis + Celery
- Auth is dual: Flask-Login (session cookie) + JWT — contract with platform-ui TBD
- ALA Voice AI is a distinct subsystem at `/api/ala/v1` — Gemini Live, billing, transcripts
- Helpdesk has the most complex backend: approval workflows, SLA, device auth, AI sessions
- RBAC decorators exist but applied inconsistently across modules
- FreePBX/Asterisk/PSTN fully removed — voice is now WebRTC + STUNner + Gemini Live only

### Decision Changes
- ADR-001: Next.js App Router as primary frontend
- ADR-002: Flask proxy pattern via `/api/proxy/[...path]`
- ADR-003: TanStack Query v5 for all server state
- ADR-004: RTL-first with Tailwind v4 logical properties

### Backlog Changes
- Phase 0 backlog populated: auth bridge, proxy route, route guards, error boundary
- 7 critical open questions added to `13-open-questions.md`
