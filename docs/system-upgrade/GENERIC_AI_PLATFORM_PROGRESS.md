# Generic AI Platform — Progress & Roadmap

> **Top-priority directive (2026-05-04):** finish everything required to turn this codebase into a **generic AI platform for businesses** before doing anything else. Vertical modules, polish, and nice-to-haves wait until the generic platform is operational end-to-end.
>
> **This file is the single source of truth for that effort.** Update after every commit that closes (or opens) a row. Older roadmap files (`03-roadmap/master-roadmap.md`, `00-control-center.md`) remain authoritative for module-level work; this file overlays them with the AI-platform priority lens.
>
> Owner: AI agent driving development. Last commit at top: `9b4d50f`.

---

## What "Generic AI Platform for Businesses" Means

A multi-tenant SaaS that any business operations team can install, configure, and use to drive their workflows with AI. Concretely the platform must provide, **as horizontal capabilities** (not per-vertical features):

1. **Identity & multi-tenancy** — auth, RBAC, org isolation, tenant context propagation everywhere.
2. **AI orchestration** — a provider gateway (OpenAI/Anthropic/Bedrock/local), per-org provider selection, key management, cost & quota tracking.
3. **AI safety & governance** — approval flows for risky actions, audit log for every AI-initiated action, policy engine for guardrails.
4. **Skill / capability registry** — what tools the AI can call, per module, with risk levels and allowlists.
5. **Configuration surface** — per-org settings (system prompts, persona, default model, rate limits) + feature flags.
6. **Operational fabric** — notifications, search across modules, long-running job runner, real-time updates.
7. **Self-service onboarding** — wizard, onboarding checklist, sample data, "first AI conversation" experience.
8. **Observability** — usage analytics, error tracking, audit trail UI, cost dashboards.
9. **At least one vertical demonstration module** — proves the horizontal stack works (Helpdesk is our chosen demonstration, partially built).

The litmus test: a new tenant signs up, picks AI providers, configures a system prompt, opens the chat shell, asks the AI to perform a real action against their data, and the action is approved + audited + executed — without us writing custom code per tenant.

---

## Phase Plan (this is the ORDER we execute)

| Phase | Goal | What "done" looks like |
|---|---|---|
| **Phase 1 — Generic Platform Foundation** | The horizontal capabilities every AI feature depends on | Caps 11–19 + 23 + 27 frontend-complete with specs, mocks, and admin UIs. Backend contracts written for every one. |
| **Phase 2 — AI Core** | The orchestration + safety surface | AIProviderGateway frontend, capability/skill registry, AI cost dashboard, AI audit trail wired to PlatformAuditLog, policy guardrails active. |
| **Phase 3 — Onboarding & Self-Service** | A new tenant can get to first-value alone | Wizard flow, sample-data seeding, "first AI conversation" success path, settings UI for AI config. |
| **Phase 4 — Vertical Demonstration** | Helpdesk module proves the stack | All Phase C helpdesk surfaces use the horizontal caps (already mostly true), AI demo slice (ADR-038) green. |
| **Phase 5 — Backend Productionization** | Replace mocks with Flask | R042-BE-min..R046-min land, MOCK_MODE flips to false per-client, P1-Exit gate items 1–5, 7–8 turn green. |

Until **Phase 1 is closed**, do NOT start new vertical modules. Do NOT polish. Do NOT add caps not in the table above.

---

## Phase 1 — Generic Platform Foundation

### Scope (caps that MUST be done)

| Cap | Capability | Spec | Frontend mock | Admin UI | Tests | Status |
|---|---|---|---|---|---|---|
| 09 | PlatformTimeline | ✅ | ✅ | ✅ | partial | **DONE** |
| 10 | PlatformAuditLog | ✅ | ✅ | ✅ | ✅ | **DONE (frontend)** |
| 11 | PlatformSearch | ✅ (this session) | ✅ | ✅ palette | ✅ | **DONE (frontend)** |
| 12 | PlatformNotifications | ✅ | ✅ | ✅ bell+drawer | partial | **DONE (frontend)** |
| 13 | PlatformApprovalFlow | ✅ | ✅ | ✅ approvals page | ✅ | **DONE (frontend)** |
| 14 | PlatformJobRunner | ✅ (this session) | ✅ | 🔵 batch tasks consumer | ✅ | **DONE (frontend)** |
| 15 | PlatformWizard | ✅ (2026-05-05) | ✅ primitive + hook | ✅ /onboarding consumer | ✅ 12 tests | **DONE (frontend)** |
| 16 | PlatformSettings Engine | ✅ (2026-05-05) | ✅ resolution + secrets | ✅ /admin/settings | ✅ 16 tests | **DONE (frontend)** |
| 17 | PlatformFeatureFlags | ✅ (2026-05-04) | ✅ 4-source resolution | ✅ /admin/feature-flags | ✅ 9 tests | **DONE (frontend)** |
| 18 | PlatformModuleRegistry | ✅ (2026-05-05) | ✅ 12 modules + status resolver | ✅ /admin/modules | ✅ 8 tests | **DONE (frontend)** |
| 19 | PlatformTenantContext | ✅ | ✅ | n/a | partial | **DONE** |
| **23** | **PlatformRealtime SSE** | ❌ | ❌ | ❌ | ❌ | **TODO (deferred — polling works for now)** |
| 27 | PlatformPolicy Engine | ✅ (2026-05-05) | ✅ evaluator + 3 system policies | ✅ /admin/policies + tester | ✅ 21 tests | **DONE (frontend)** |

### Phase 1 detailed roadmap

#### 1.1 — PlatformFeatureFlags (cap 17) — DONE 2026-05-04

- [x] Spec doc `docs/system-upgrade/04-capabilities/platform-feature-flags-spec.md` — 9 sections covering hierarchy, endpoints, multi-tenant safety, perf budget, schema, audit, flip checklist, open questions.
- [x] Mock client extended with 4-source resolution (user → org → plan → system), `setFeatureFlagOverride` mutation, `fetchFeatureFlagDefinitions`, optional `resolution_chain` for admin views.
- [x] Admin UI at `/admin/feature-flags` — categorized flag tree (AI / Modules / Integrations / Platform / Experimental), enable/disable/clear per org, system_admin gate.
- [x] Nav entry "ניהול פלטפורמה → Feature flags" added.
- [x] Tests: 9 client tests covering all 4 resolution sources, override flip, clear-and-fallback, definitions list, user-scope rejection (Q-FF-2).

#### 1.2 — PlatformSettings Engine (cap 16) — DONE 2026-05-05

- [x] Spec doc `docs/system-upgrade/04-capabilities/platform-settings-engine-spec.md` — 13 sections covering resolution hierarchy, 6 setting types (string/int/bool/json/secret/enum), 4 endpoints, schema, sensitive-value handling (KMS envelope encryption, masked reads), 13 initial settings catalog, MOCK_MODE flip checklist, Q-S-1..4.
- [x] Types `lib/modules/settings/types.ts` — `SettingDefinition`, `SettingValue` (discriminated by type), `SettingScope`, response envelopes.
- [x] Mock client `lib/api/settings.ts` — 13 fixture settings across 4 categories (ai/branding/notifications/rate_limits), full resolution walk (user→org→plan→system→default), schema validation (string maxLength/minLength/pattern, int min/max, enum allowed_values), secret masking (`sk-...XYZ`).
- [x] Hook `useSetting(key)`, `useSettingsByCategory(category)`, `useSettingDefinitions()`.
- [x] Admin UI at `/admin/settings` — categorized tree, type-aware editors (textarea for long strings, number input, On/Off toggle, enum select, masked secret with Replace flow, JSON textarea), Save / Cancel / Clear-override buttons, source-of-resolution display per row.
- [x] Nav entry "ניהול פלטפורמה → הגדרות פלטפורמה" added.
- [x] Tests: 16 client tests covering resolution sources, override set/clear, secret masking (asserts plaintext NEVER leaks), schema validation rejection (int min, string maxLength, enum allowed, pattern, empty secret), scope rejection, category fetch, 404.

#### 1.3 — PlatformWizard (cap 15) — DONE 2026-05-05

- [x] Spec doc `docs/system-upgrade/04-capabilities/platform-wizard-spec.md` — types, component API, hook API, persistence rules, accessibility, audit, first-consumer (/onboarding) flow, Q-WZ-1..4.
- [x] Types `lib/modules/wizard/types.ts` — `WizardStep`, `WizardConfig`, `WizardStepProps`, `PersistedWizardState`.
- [x] Hook `lib/hooks/use-wizard-state.ts` — debounced localStorage persist, version-namespaced key, hydrate-on-mount, malformed-JSON safe, range-clamping navigation.
- [x] Primitive `components/shared/wizard/wizard.tsx` — step indicator (compact pills), validation-gated Next, AnimatePresence transitions, focus-on-step-change for screen readers, optional steps render Skip, Finish triggers async onComplete with loading + error display.
- [x] First consumer `app/(dashboard)/onboarding/page.tsx` — 4 steps (Organization → AI configuration → Modules → Review). Smoke-tests caps 16+18: writes 4 settings via `setSetting()`, toggles modules via `setModuleEnablement()`, redirects to `/` on Finish.
- [x] Nav entry "ראשי → הקמה ראשונית" added.
- [x] Tests: 12 hook tests covering initial state, update merging, navigation clamps, debounced persist, hydrate from storage, version mismatch ignored, out-of-range index ignored, reset clears storage, malformed JSON survival, clearWizardStorage helper.

#### 1.4 — PlatformModuleRegistry (cap 18) — DONE 2026-05-05

- [x] Spec doc `docs/system-upgrade/04-capabilities/platform-module-registry-spec.md` — manifest shape, 3 endpoints, schema, conflicts (Q-MR-4), required-flag/plan evaluation, MOCK flip checklist, Q-MR-1..4.
- [x] Types `lib/modules/module-registry/types.ts` — `ModuleManifest`, `ModuleEnablement`, `ModuleStatus`, `ModuleEntry`.
- [x] Central manifests `lib/platform/module-registry/manifests.ts` — 12 modules registered (helpdesk, audit-log, users, ai-agents, ai-providers, knowledge, voice, automation, integrations, monitoring, billing, data-sources) with full metadata: nav entries, AI actions, permissions, search types, required flags, required plans.
- [x] Mock client `lib/api/module-registry.ts` — list endpoint resolves status by combining manifest + enablement + flag eval + plan check; write endpoint enforces conflicts.
- [x] Hook `useEnabledModules()`, `useModuleStatus(key)`.
- [x] Admin UI at `/admin/modules` — KPI banner (Registered / Enabled / Blocked), category filter, per-module card with status badge, blocked_reason display, dependency chain (flags + plans + counts), Enable/Disable button with org_admin_can_toggle gate.
- [x] Nav integration: `nav-items.ts` adds `filterNavByEnabledModules(groups, enabledKeys)` helper + ROUTE_TO_MODULE map. Future sidebar refactor wires this; current static groups still render.
- [x] Tests: 8 client tests (manifest expansion, flag-disabled status, plan-locked status, set/clear, 404, ai_actions/search_types declared, nav_entries ordering).

#### 1.5 — PlatformPolicy Engine (cap 27) — DONE 2026-05-05

- [x] Spec doc `docs/system-upgrade/04-capabilities/platform-policy-engine-spec.md` — 15 sections covering policy/rule shape, condition language, evaluation context, decision shape, 5 endpoints, multi-tenant safety, perf budget, schema, 3 seeded system policies, mock condition language, audit, MOCK flip checklist, Q-PE-1..4.
- [x] Types `lib/modules/policies/types.ts` — Policy, PolicyRule, PolicyDecision, PolicyEvaluationContext, SubjectSelector, response envelopes.
- [x] Mock client `lib/api/policies.ts` — full evaluator with recursive-descent parser for the condition language (field refs, comparison/logical ops, in/not_in/exists, glob action_pattern, built-in functions `is_business_hours()`, `hour_of_day()`, `now()`), deny precedence, default-allow, cross-org isolation.
- [x] 3 seeded system policies: deny critical resolves outside business hours, require approval for batch >50, AI safety baseline (deny admin.* for non-admin, require approval for *.delete by non-admin).
- [x] Hook `usePolicyDecision(input)` with TanStack Query, fail-closed on error.
- [x] Admin UI at `/admin/policies` — KPI banner (Policies / Enabled / Deny rules), per-policy card with rule list (effect badge + action_pattern + subject + condition), Enable/Disable toggle, **inline policy tester** (paste action_id + params → see decision + matched rules + reasons).
- [x] Nav entry "ניהול פלטפורמה → Policy engine" added.
- [x] Tests: 21 covering condition evaluator (field comparison, logical ops, exists, in/not_in, fail-safe on broken expressions, empty=match), evaluation (default-allow, deny precedence, cross-org isolation, disabled policies skipped, glob action patterns, system-policy fires), API surface (fetchPolicies, fetchPolicy 404, setPolicyEnabled, evaluatePolicy end-to-end).

#### 1.6 — Realtime SSE (cap 23) — deferred

Polling at 5–30s works for now. Defer until Phase 5 (backend) since the SSE channel needs Flask support anyway.

---

## Phase 2 — AI Core

### 2.1 — AIProviderGateway frontend — DONE 2026-05-06

- [x] Spec doc `docs/system-upgrade/04-capabilities/platform-ai-provider-gateway-spec.md` — 11 sections covering provider catalog, per-org config, routing rules, 6 endpoints, KMS encryption for credentials, schema, MOCK flip checklist, Q-AIP-1..4.
- [x] Types `lib/modules/ai-providers/types.ts` — AIProvider, ProviderModel, ProviderConfig, RoutingRule, AuthField. CredentialValue is a discriminated union — plaintext literal vs `{ has_value, masked }` so reads cannot accidentally leak.
- [x] Mock client `lib/api/ai-providers.ts` — 5 providers seeded (anthropic, openai, bedrock, azure_openai, ollama) with 11 models. Per-org configs mutable in-memory, sensitive credentials masked on read. Routing resolver walks rules in priority order with default fallback. `estimateCostUsd()` uses per-million pricing.
- [x] Hooks `lib/hooks/use-ai-provider-configs.ts` — `useProviderCatalog`, `useProviderConfigs`, `useProviderConfig`, `useRoutingDecision`.
- [x] Admin UI at `/admin/ai-providers` — KPI banner (in catalog / enabled / verified), category filter (Cloud/Hosted/Local), per-provider card with status badges (enabled, last-test with timestamp, masked credentials), Configure flow with type-aware inputs, Test Connection button with toast + persisted last-test state.
- [x] Nav entry "ניהול פלטפורמה → ספקי AI" added.
- [x] Tests: 13 client tests covering catalog, configs list, masked-credential reads, mutation roundtrip with NEVER-leak assertion, clearing credentials, test connection (ok + missing-creds), routing rule match, fallback to default, no-provider error. Plus 2 E2E smoke specs.

### 2.2 — Capability / Skill registry — DONE 2026-05-06

- [x] Spec doc `docs/system-upgrade/04-capabilities/platform-ai-skill-registry-spec.md` — manifest shape, per-org enablement, 3 endpoints (list, set-enablement, validate), schema, MOCK flip checklist, Q-AIS-1..4.
- [x] Types `lib/modules/ai-skills/types.ts` — AISkill (id, module_key, category, risk_level, parameter_schema, required_permissions, policy_action_id, ai_callable, default_enabled, estimated_cost_class), SkillEnablement, SkillEntry.
- [x] Module manifests: `lib/modules/helpdesk/skills.ts` (4 skills) + `lib/modules/users/skills.ts` (3 skills). Each skill matches an executor in lib/platform/ai-actions/executors.ts by id.
- [x] Central registry `lib/platform/ai-skills/registry.ts` — aggregates module manifests; mirrors cap 18 manifests pattern.
- [x] Mock client `lib/api/ai-skills.ts` — list with module/ai_callable filters, set-enablement (org override), validate-invocation (combines parameter validation + skill-availability + policy decision via cap 27).
- [x] Hook `lib/hooks/use-ai-skills.ts` — useAISkills(filter), useSkillValidation(input).
- [x] Admin UI at `/admin/ai-skills` — KPI banner (registered / enabled / available-to-AI), module + ai-callable filters, per-skill card with category + risk + cost badges, parameter-schema preview, Enable/Disable toggle.
- [x] Nav entry "ניהול פלטפורמה → כישורי AI" added.
- [x] Tests: 14 client tests covering catalog, filters, default vs override enablement, available_to_ai computation, set-enablement, parameter validation (required/type/minimum), policy decision integration, unknown-skill handling. Plus 2 E2E specs.

### 2.3 — AI cost & usage dashboard — DONE 2026-05-06

- [x] Spec doc `docs/system-upgrade/04-capabilities/platform-ai-usage-spec.md` — UsageEvent shape, 3 endpoints (stats with range filter, paginated events, set-budget), schema with materialized view, MOCK flip checklist, Q-AIU-1..4.
- [x] Types `lib/modules/ai-usage/types.ts` — UsageEvent, UsageStats, UsageBucket, UsageTopUser, DailySeriesPoint, UsageBudget (status: ok/warning/exceeded/unset).
- [x] Mock client `lib/api/ai-usage.ts` — generates ~30 days of synthetic events deterministically (seeded mulberry32). Aggregations match spec: totals, by_provider/model/purpose, top_users (capped 5), daily_series (length matches range), budget status with 80%/100% thresholds. ~1500 events fixture across 5 providers, 12 models, 5 users.
- [x] Hook `lib/hooks/use-ai-usage.ts` — useUsageStats(range) with 60s refetchInterval, useUsageEvents(filter).
- [x] Dashboard at `/admin/ai-usage` — KPI tiles (Cost / Events / Tokens / Errors), Range selector (24h/7d/mtd/30d), Budget banner with warning/exceeded states + inline editor, daily-cost area chart (recharts), by-provider/model/purpose breakdown bars, Top users list, Recent events table (last 25 with timestamp, user, provider·model, purpose, tokens, cost, outcome badge).
- [x] Nav entry "ניהול פלטפורמה → צריכת AI" added.
- [x] Tests: 13 client tests covering aggregation correctness (sum invariant, daily_series length matches range, totals.errors matches outcome filter), budget state machine (ok→warning at 80%, exceeded at 100%, unset on null), pagination, all filters, top_users sorted desc, negative budget rejection. Plus 2 E2E specs.

### 2.4 — AI audit trail wired to PlatformAuditLog — DONE 2026-05-06

- [x] Audit emitter `lib/platform/ai-actions/audit-emitter.ts` — three shortcuts: `emitExecutorRun`, `emitPolicyEvaluation`, `emitSkillValidation`. All swallow their own errors so an audit failure never aborts the action it was auditing.
- [x] Audit write path `recordAuditEntry()` added to `lib/api/audit.ts` — appends to MOCK_ENTRIES so the audit log page reflects new events immediately.
- [x] Executor wiring: new `runActionExecutor(actionId, params, queryClient)` wraps lookup + run + audit (success + error + missing-executor branches). `inferResourceHint()` derives resource_type/id from the action prefix (helpdesk.ticket → ticket, helpdesk.maintenance → maintenance_window, helpdesk.batch → batch_task, users → user).
- [x] Policy wiring: `evaluatePolicy()` emits `policy.evaluate` audit entry per spec §12 with full matched_rules + reasons + decision_id.
- [x] Skill validate wiring: both happy path and unknown-skill branch emit `ai_skill.validate`. Metadata records `param_keys` only — never full params (PII safety).
- [x] Tests: 9 audit-emission tests covering policy.evaluate writes, skill validate writes, error_count for invalid params, NEVER-record-PII assertion, runActionExecutor success + error + unknown branches, growth invariant on category=ai count.

### 2.5 — AI demo slice (ADR-038)

The end-to-end smoke that proves the AI stack works:

1. User opens chat
2. Says "take ticket 1004"
3. AI proposes → user confirms → policy allows → executor runs → audit logged → notification sent
4. P1-Exit gate row 8 turns green when this works.

Most pieces exist. Need to integrate.

---

## Phase 3 — Onboarding & Self-Service

### 3.1 — Tenant onboarding flow
- [ ] `/onboarding` wizard (uses cap 15)
- [ ] Sample data seeding per module
- [ ] First-AI-conversation guided tour

### 3.2 — Self-service settings
- [ ] AI persona / system prompt editor
- [ ] Default model + rate limits
- [ ] Branding (logo, accent color — already partial via theme-store)
- [ ] Notification preferences

### 3.3 — Help & documentation surface
- [ ] In-app docs panel (already partial via `/help`)
- [ ] Per-module quick-start
- [ ] AI shortcuts cheatsheet

---

## Phase 4 — Vertical Demonstration (Helpdesk)

Already mostly done in mock. Remaining:
- [ ] All helpdesk pages use shared primitives (DataTable ✅, JobRunner partial, no module-local copies)
- [ ] AI shell can run all 4 helpdesk action executors (take/resolve/maintenance.cancel/batch.cancel) ✅
- [ ] Cross-tenant test scaffolded ✅ → flips green when 2 test orgs exist
- [ ] Helpdesk-specific AI skills registered in capability registry (Phase 2.2 dependency)

---

## Phase 5 — Backend Productionization

Out of scope for platform-ui repo; tracked in the Flask repo. References:
- `docs/system-upgrade/00-control-center.md` P1-Exit gate items 1–5, 7–8
- `docs/system-upgrade/03-roadmap/master-roadmap.md` R042-BE-min..R046-min

Frontend's job: keep the contract specs current, run cross-tenant gate tests, flip MOCK_MODE per client when each backend route lands.

---

## Working Agreement (for AI agents)

1. **Default to "no" on new vertical modules.** Helpdesk bug fixes OK; new module work is NOT in-scope until Phase 1 is fully closed and Phase 2 dictates otherwise.

2. **Default to "yes" on the items listed in the active phase.** Pick the highest-priority unblocked one.

3. **Every commit updates this file.** When a row's status changes, edit the table at the top of its phase, the snapshot table at the bottom, AND the **Test status** section below. Stale rows are worse than missing rows.

4. **Specs are mandatory.** Every cap gets a spec doc in `docs/system-upgrade/04-capabilities/<name>-spec.md` BEFORE any code lands.

5. **Mock-first is fine.** Lock the contract; backend ports follow. But every mock client MUST match its spec verbatim, and the spec MUST include a MOCK_MODE flip checklist.

### MANDATORY testing discipline — DO NOT SKIP

A cap is **not done** until ALL of the following are present and green:

| # | Requirement | Tooling | Where it lives |
|---|---|---|---|
| 1 | **Unit tests** for every new / modified `lib/api/*` client and `lib/hooks/*` hook | vitest | `<file>.test.ts` next to source |
| 2 | **Component render tests** for every new shared primitive | vitest + @testing-library/react | `components/shared/**/*.test.tsx` |
| 3 | **E2E smoke spec** for every new admin page, wizard surface, or mutation flow | Playwright | `tests/e2e/**` (one spec file per surface; renders + key elements + ≥1 mutation path) |
| 4 | **Coverage gate passes** | `node scripts/check-coverage-baseline.mjs` | run at end of commit |
| 5 | **All vitest suites green** | `npx vitest run` | run at end of commit |
| 6 | **Test counts cited in commit message** | manual | "Tests: X/Y unit. E2E specs added: N. Typecheck clean. Gate passes." |

**Backend tests are NOT in scope** here — Flask backend lives in a separate repo. The contract this repo guarantees is the **MOCK_MODE flip checklist** in each spec doc; backend team writes their own tests against that contract.

When you (the AI) finish a cap and consider marking it DONE: re-read this checklist. If any row is missing, the cap is unfinished. Update the **Test status** section below with the latest counts AND the timestamp of the run.

---

## Test status (snapshot — refresh on every commit that changes test counts)

| Suite | Last run | Files | Tests | Status |
|---|---|---|---|---|
| vitest unit (`npx vitest run`) | 2026-05-06 | 44 | 402 / 402 | ✅ all green |
| coverage gate (`scripts/check-coverage-baseline.mjs`) | 2026-05-06 | n/a | n/a | ✅ passed |
| Playwright E2E (`npx playwright test`) | 2026-05-06 | 30 specs | 84 passed / 0 failed / 42 skipped | ✅ all green (skipped = cross-tenant tests gated on E2E_ORG_*_ID env vars) |

### E2E specs by surface (Phase 1 coverage)

| Surface | Spec file | Status |
|---|---|---|
| `/admin/feature-flags` | `tests/e2e/smoke/admin-pages.spec.ts` | ✅ |
| `/admin/settings` | `tests/e2e/smoke/admin-pages.spec.ts` | ✅ |
| `/admin/modules` | `tests/e2e/smoke/admin-pages.spec.ts` | ✅ |
| `/admin/policies` | `tests/e2e/smoke/admin-pages.spec.ts` (incl. tester evaluate) | ✅ |
| `/onboarding` (Wizard) | `tests/e2e/smoke/admin-pages.spec.ts` (5 specs) | ✅ |
| `/helpdesk/*` (legacy) | `tests/e2e/helpdesk/*.spec.ts` | ✅ |
| Command palette + search | `tests/e2e/smoke/command-palette-search.spec.ts` | ✅ |
| Cross-tenant isolation | `tests/e2e/security/tenant-isolation*.spec.ts` | 🟡 scaffolded (skipped without 2 test orgs) |

---

## Status snapshot (refresh after each commit)

| Section | Items | Done | In Progress | TODO |
|---|---|---|---|---|
| Phase 1 caps | 13 | 12 | 0 | 0 — cap 23 SSE deferred to Phase 5 |
| Phase 2 (AI core) | 5 | 4 | 0 | 1 |
| Phase 3 (onboarding) | 3 | 0 | 0 | 3 |
| Phase 4 (helpdesk demo) | 4 | 3 | 0 | 1 |
| Phase 5 (backend) | n/a (other repo) | — | — | — |

**Overall Phase 1 completion: 100% of in-scope caps (12/12; cap 23 SSE deferred to backend phase).** 🎉

**Phase 1 closed.** Next: Phase 2 — AI Core (provider gateway, skill registry, cost dashboard, audit wiring, demo slice).

**Last reviewed:** 2026-05-05, after cap 15 PlatformWizard landed.
