# 03 — Module Migration Progress Tracker

> Central tracker for the platform rewrite. Updated after every module-related round.
> _Last updated: 2026-04-26 (R041-AI-Assist Governance — ai_chat/voice_agent status values formalized)_
>
> **Rules:**
> - This file is updated after every round that touches a module.
> - Per-module docs live at `docs/modules/<module_key>/` — see links in each row.
> - A module may not start rewrite until `legacy_inventory` = `inventory_complete`.
> - A module may not be marked `migrated` until all evidence columns are green.
> - **AI/Voice readiness is mandatory.** A module cannot be marked `migrated` until `ai_chat != "not_started"`. `exception_approved` counts if documented.
>
> **Status values (overall):** `not_started` | `inventory_in_progress` | `inventory_complete` | `api_in_progress` | `ui_in_progress` | `tests_in_progress` | `blocked` | `ready_for_review` | `migrated` | `deprecated` | `intentionally_removed`
>
> **Status values (`ai_chat` / `voice_agent` columns):**
> - `not_started` — no AI metadata declared (Level 0)
> - `not_applicable` — no user-facing pages (system-only or infra module)
> - `exception_approved` — AI not required; documented reason + issue ref in `AI_READINESS.md`
> - `read_only_ready` — Level 1–2: page context declared, explanation tested
> - `action_ready` — Level 3–4: actions registered, execution + audit tested
> - `voice_ready` — Level 5–6: voice eligible declared, voice tests pass
> - `blocked` — blocked on dependency; reason documented in this row
> - `tested` — all required tests for declared level pass and are documented
>
> Full readiness level spec: `54-ai-assistant-runtime.md §14`

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Complete / passing |
| 🟡 | In progress |
| ❌ | Not started |
| 🔴 | Blocked |
| ➖ | Not applicable |

---

## Module Registry

> **Note:** Per-module inventory and E2E docs must exist before rewrite can start.
> Links are placeholders — create the file when the module's round begins.

---

### Core Platform Modules

| module_key | display_name | legacy_location | legacy_inventory | backend_api | platform_ui | shared_caps | security_tests | tenant_tests | e2e_tests | i18n | ai_chat | voice_agent | data_contract | module_manifest | docs | last_round | overall_status |
|-----------|-------------|----------------|-----------------|-------------|-------------|------------|---------------|-------------|----------|------|--------|------------|--------------|---------------|------|-----------|---------------|
| `authentication` | Auth & Sessions | `apps/authentication/` | ❌ | 🟡 | 🟡 | ✅ jwt | ❌ | ❌ | ❌ | ❌ | ➖ | ➖ | ❌ | ❌ | ❌ | R041 | `api_in_progress` |
| `admin` | Admin / Orgs | `apps/admin/` | ❌ | 🟡 | 🟡 | ✅ jwt+rbac | ❌ | ❌ | ❌ | ❌ | ❌ | ➖ | ❌ | ❌ | ❌ | R022 | `api_in_progress` |
| `users` | Users & Roles | `apps/authentication/` | ❌ | 🟡 | 🟡 | ✅ jwt+rbac | ❌ | ❌ | 🟡 scaffolded | ❌ | ❌ | ➖ | ❌ | ❌ | ❌ | R022 | `api_in_progress` |
| `modules` | Module Manager | `apps/modules/` | ❌ | 🟡 | ❌ | ✅ jwt+rbac | ❌ | ❌ | ❌ | ❌ | ❌ | ➖ | 🟡 | 🟡 | ❌ | R040 | `api_in_progress` |
| `roles` | Roles & Permissions | `apps/authentication/` | ❌ | ✅ | 🟡 | ✅ jwt+rbac | ❌ | ❌ | 🟡 scaffolded | ❌ | ❌ | ➖ | ❌ | ❌ | ❌ | R022 | `api_in_progress` |
| `settings` | Platform Settings | `apps/admin/settings_routes.py` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ➖ | ❌ | ❌ | ❌ | — | `not_started` |
| `notifications` | Notifications | `apps/notifications/` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ➖ | ❌ | ❌ | ❌ | — | `not_started` |
| `audit` | Audit Log | `apps/admin/activity_routes.py` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ➖ | ❌ | ❌ | ❌ | — | `not_started` |
| `billing` | Billing & Usage | `apps/billing/` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ➖ | ❌ | ❌ | ❌ | — | `not_started` |
| `api_keys` | API Keys | `apps/admin/api_key_routes.py` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ➖ | ❌ | ❌ | ❌ | — | `not_started` |

---

### AI & Automation Modules

| module_key | display_name | legacy_location | legacy_inventory | backend_api | platform_ui | shared_caps | security_tests | tenant_tests | e2e_tests | i18n | ai_chat | voice_agent | data_contract | module_manifest | docs | last_round | overall_status |
|-----------|-------------|----------------|-----------------|-------------|-------------|------------|---------------|-------------|----------|------|--------|------------|--------------|---------------|------|-----------|---------------|
| `ai_providers` | AI Provider Gateway | `apps/ai_providers/` | ❌ | 🟡 | ❌ | ✅ gateway | ❌ | ❌ | ❌ | ➖ | ➖ | ➖ | ❌ | ❌ | ❌ | R031 | `api_in_progress` |
| `helpdesk` | IT Helpdesk | `apps/helpdesk/` | ❌ | 🟡 | ❌ | 🟡 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | R040 | `api_in_progress` |
| `ala` | ALA Voice Agent | `apps/ala/` | ❌ | 🟡 | ❌ | 🟡 | ❌ | ❌ | ❌ | ❌ | ❌ | 🟡 | ❌ | ❌ | ❌ | R040 | `api_in_progress` |
| `ai_agents` | AI Agents Platform | `apps/ai_agents/` | ❌ | 🟡 | ❌ | 🟡 | ❌ | ❌ | ❌ | ❌ | ❌ | ➖ | ❌ | ❌ | ❌ | Sprint4 | `api_in_progress` |
| `floating_assistant` | Floating AI Assistant | `apps/floating_assistant/` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | — | `not_started` |
| `data_sources` | Data Sources Hub | `apps/data_sources/` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ➖ | ❌ | ❌ | ❌ | — | `not_started` |

---

### Health & Fitness Modules

| module_key | display_name | legacy_location | legacy_inventory | backend_api | platform_ui | shared_caps | security_tests | tenant_tests | e2e_tests | i18n | ai_chat | voice_agent | data_contract | module_manifest | docs | last_round | overall_status |
|-----------|-------------|----------------|-----------------|-------------|-------------|------------|---------------|-------------|----------|------|--------|------------|--------------|---------------|------|-----------|---------------|
| `fitness_nutrition` | Fitness & Nutrition | `apps/fitness_nutrition/` | ❌ | 🟡 | ❌ | 🔴 direct LLM | ❌ | ❌ | ❌ | ❌ | ❌ | ➖ | ❌ | ❌ | ❌ | — | `blocked` |
| `activity_log` | Activity Log | `apps/fitness_nutrition/` | ❌ | 🟡 | ❌ | 🔴 direct LLM | ❌ | ❌ | ❌ | ❌ | ❌ | ➖ | ❌ | ❌ | ❌ | — | `blocked` |

---

### Voice & Communication Modules

| module_key | display_name | legacy_location | legacy_inventory | backend_api | platform_ui | shared_caps | security_tests | tenant_tests | e2e_tests | i18n | ai_chat | voice_agent | data_contract | module_manifest | docs | last_round | overall_status |
|-----------|-------------|----------------|-----------------|-------------|-------------|------------|---------------|-------------|----------|------|--------|------------|--------------|---------------|------|-----------|---------------|
| `voice_edge` | Voice Edge / WebRTC | `realtime-voice-go/` | ❌ | 🟡 | ❌ | ✅ stunner | ❌ | ❌ | ❌ | ➖ | ➖ | ✅ | ❌ | ❌ | ❌ | voice-infra | `api_in_progress` |
| `remote_assist` | Remote Assist | `apps/remote_assist/` | ❌ | 🟡 | ❌ | 🟡 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | V2 | `api_in_progress` |

---

## Per-Module Docs Index

> Update this table when a per-module doc is created.

| module_key | LEGACY_INVENTORY.md | E2E_COVERAGE.md | TESTING.md | IMPLEMENTATION.md | AI_READINESS.md | I18N_READINESS.md |
|-----------|-------------------|----------------|-----------|-----------------|----------------|-----------------|
| _(none created yet)_ | — | — | — | — | — | — |

---

## Blockers Registry

| module_key | Blocker | Blocked since | Blocking what |
|-----------|---------|--------------|--------------|
| `fitness_nutrition` | Direct LLM imports — requires R048 cleanup | R031 | Security tests, migrated status |
| `ala` | Direct LLM imports — requires R048 cleanup | R031 | Security tests, migrated status |
| `modules` | R042 ModuleRegistry.sync_from_manifests() not done | R040 | Module manifest status |
| `helpdesk` | R043 AI Service Routing Matrix not done | R043 | AI routing, migrated status |
| `data_sources` | R049 Data Sources Hub not started | — | Full module |
| `settings` | R045 Feature Flags + Settings Engine not done | — | Full module |
| `api_keys` | R047 API Keys + Secrets Manager not done | — | Full module |

---

## Update Protocol

When updating this file after a round:

1. Find the module row(s) touched in the round.
2. Update every column that changed.
3. Update the "last_round" column to the current round ID.
4. Update the "Per-Module Docs Index" table if a new doc was created.
5. Add a new row to "Blockers Registry" if a new blocker was discovered.
6. Update the file header date.

> **Owner:** the agent completing the round is responsible for updating this file.
