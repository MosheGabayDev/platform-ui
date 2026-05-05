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
| **15** | **PlatformWizard** | ❌ | ❌ | ❌ | ❌ | **TODO** |
| 16 | PlatformSettings Engine | ✅ (2026-05-05) | ✅ resolution + secrets | ✅ /admin/settings | ✅ 16 tests | **DONE (frontend)** |
| 17 | PlatformFeatureFlags | ✅ (2026-05-04) | ✅ 4-source resolution | ✅ /admin/feature-flags | ✅ 9 tests | **DONE (frontend)** |
| **18** | **PlatformModuleRegistry** | ❌ | 🔵 partial | ❌ | ❌ | **TODO** |
| 19 | PlatformTenantContext | ✅ | ✅ | n/a | partial | **DONE** |
| **23** | **PlatformRealtime SSE** | ❌ | ❌ | ❌ | ❌ | **TODO (deferred — polling works for now)** |
| **27** | **PlatformPolicy Engine** | ❌ | ❌ | ❌ | ❌ | **TODO** |

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

#### 1.3 — PlatformWizard (cap 15)

Onboarding wizard for new tenants.

- [ ] Spec doc — multi-step wizard contract, validation per step, skip-and-resume, completion audit.
- [ ] Generic `Wizard<TState>` component at `components/shared/wizard/` — step indicator, navigation, validation gates.
- [ ] Hook `useWizardState(key, initial)` with localStorage persistence.
- [ ] Onboarding wizard at `/onboarding` — tenant info → AI provider selection → invite team → first action.
- [ ] Tests: step navigation, validation gates, resume after refresh.

#### 1.4 — PlatformModuleRegistry (cap 18)

Dynamic module enablement per org. Drives nav, dashboard tiles, and AI capability scoping.

- [ ] Spec doc — module manifest shape (key, label, icon, routes, permissions, AI capabilities).
- [ ] Types: `ModuleManifest`, `ModuleEnablement`.
- [ ] Mock registry of all known modules with their manifests.
- [ ] Hook `useEnabledModules()` driving sidebar nav (replace static nav-items with dynamic list).
- [ ] Admin UI at `/admin/modules` — enable/disable per org with confirmation.
- [ ] Tests: enabled-only filtering, admin override flow.

#### 1.5 — PlatformPolicy Engine (cap 27)

Guardrails for AI. Decides whether an AI action is allowed before execution.

- [ ] Spec doc — policy DSL (resource + action + condition), evaluation order, deny precedence, audit on every evaluation.
- [ ] Types: `Policy`, `PolicyRule`, `PolicyDecision`.
- [ ] Mock evaluator: input `(action_id, params, session)`, output `{ allowed, reasons, requires_approval }`.
- [ ] Hook `usePolicyDecision(actionId, params)` for ActionPreviewCard / ConfirmActionDialog gating.
- [ ] Admin UI at `/admin/policies` — list policies, see eval examples, edit conditions.
- [ ] Tests: deny-by-default, allow with conditions, requires-approval branch.

#### 1.6 — Realtime SSE (cap 23) — deferred

Polling at 5–30s works for now. Defer until Phase 5 (backend) since the SSE channel needs Flask support anyway.

---

## Phase 2 — AI Core

### 2.1 — AIProviderGateway frontend

The orchestration layer. Currently `lib/ai/` has scattered pieces; need a unified gateway.

- [ ] Spec doc — provider abstraction (OpenAI/Anthropic/Bedrock/local), per-org selection, key management (encrypted server-side), routing matrix.
- [ ] Mock client `lib/api/ai-providers.ts` — list providers, get/set provider config per org, test connection.
- [ ] Admin UI at `/admin/ai-providers` — pick provider, paste key (server-stored), set default model, run test prompt.
- [ ] Hook `useAiProviderConfig()` so the AI shell knows which provider/model to use.
- [ ] Cost estimate per call: integrate with usage meter (cap 26 stub).

### 2.2 — Capability / Skill registry

Which tools AI can call. Currently `lib/platform/ai-actions/executors.ts` has 4 actions; needs to be discoverable and per-module-pluggable.

- [ ] Spec doc — capability manifest, risk levels, parameter schemas, RBAC requirements per skill.
- [ ] Types: `AISkill`, `SkillRegistry`, with Zod-validated parameters.
- [ ] Module-level skill exports (helpdesk, users, audit) collected at app boot.
- [ ] Admin UI at `/admin/ai-skills` — browse registered skills per module, enable/disable per org, see invocation history.
- [ ] Hook `useAvailableSkills(moduleKey)` for context-aware AI proposals.
- [ ] Tests: manifest validation, RBAC gating, registry discovery.

### 2.3 — AI cost & usage dashboard (cap 26 partial)

- [ ] Spec doc — usage event shape (org_id, provider, model, tokens_in, tokens_out, cost, action_id, ticket_id).
- [ ] Mock client `lib/api/ai-usage.ts` with fixture events.
- [ ] Dashboard at `/admin/ai-usage` — KPI tiles (cost MTD, tokens, top users), time-series chart, table.
- [ ] Per-org budget alert (warning at 80%, hard cap at 100%).
- [ ] Tests.

### 2.4 — AI audit trail wired to PlatformAuditLog

Every AI-initiated action MUST emit an audit entry with category=`ai`. Currently the executor registry doesn't emit audit events.

- [ ] Wire executor registry to call `auditLog.append({ category: "ai", ... })` on success/failure.
- [ ] Action proposals (pre-confirm) also audited so we have a denied/abandoned trail.
- [ ] Test: action take → audit entry exists with category=ai.

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

While Phase 1 is open:

1. **Default to "no" on new modules.** If a request lands that builds a new vertical module, ask whether it can wait for Phase 1 closeout. The exception is bug fixes on Helpdesk (the chosen demonstration vertical).

2. **Default to "yes" on Phase 1 caps.** Anything in §1.1–§1.5 is in-scope. Pick the highest-priority unblocked one.

3. **Every commit updates this file.** When a row's status changes, edit the table at the top of its phase. When a new TODO item is added, add it under the right cap. Stale rows are worse than missing rows.

4. **Specs are mandatory.** Every cap gets a spec doc in `docs/system-upgrade/04-capabilities/<name>-spec.md` BEFORE any code lands. Schema-frozen contracts prevent backend drift later.

5. **Test as you go.** Each cap brings tests with it; no "tests later" debt. ADR-042 floors apply.

6. **Mock-first is fine.** The whole point of this phase is to lock the contract; backend ports follow. But every mock client MUST match its spec verbatim.

---

## Status snapshot (refresh after each commit)

| Section | Items | Done | In Progress | TODO |
|---|---|---|---|---|
| Phase 1 caps | 13 | 9 | 0 | 3 (caps 15, 18, 27) |
| Phase 2 (AI core) | 5 | 0 | 0 | 5 |
| Phase 3 (onboarding) | 3 | 0 | 0 | 3 |
| Phase 4 (helpdesk demo) | 4 | 3 | 0 | 1 |
| Phase 5 (backend) | n/a (other repo) | — | — | — |

**Overall Phase 1 completion: ~69% (9/13).**

**Last reviewed:** 2026-05-05, after cap 16 PlatformSettings Engine landed.
