# 55 — AI System Capability Knowledge Base

> _Created: 2026-04-26 (R041-AI-Knowledge)_
> Defines the global knowledge model for the Chat AI and Voice Agent assistants.
>
> **Relationship to other AI docs:**
> - `../05-ai/assistant-runtime.md` — runtime contract: page context, action proposal flow, backend re-check, confirmation, audit/billing, AI readiness levels §14, test harness §15
> - `../05-ai/action-platform.md` — AI delegated action design, action registry, permission model, capability levels
> - `../05-ai/floating-assistant.md` — UI shell: drawer, lazy loading, route change behavior, session state
> - `../05-ai/canonical-terms.md` — canonical terms: AIActionDescriptor v1, voice_eligible, capability levels
> - `../05-ai/provider-gateway.md` — gateway pipeline, AIUsageLog, billing metering

---

## §1 — Purpose and Product Role

### §1.1 AI Operational Assistant Product Role

"The Global Chat AI and Voice Agent are governed in-platform operational assistants. They combine global system capability knowledge, user runtime capability context, page context, and registered AI actions to advise, guide, and execute approved actions for users according to their permissions."

This is NOT a documentation chatbot. It is an operational assistant that can:
- Understand what the user is trying to accomplish
- Advise on the best solution
- Recommend modules, integrations, dashboards, settings, workflows
- Guide step by step
- Inspect allowed context
- Propose actions
- Execute allowed actions on behalf of the user (with authorization)
- Explain why something is unavailable or denied
- Escalate to admin when needed

All execution is controlled:
- No direct DB writes by LLM
- No arbitrary tool execution
- No unregistered actions
- No permission bypass
- No tenant isolation bypass
- No execution based on prompt text alone
- All actions through AI Action Platform
- All actions re-authorized server-side
- Dangerous actions require confirmation/approval
- All actions audited
- All AI usage logged and billed

### §1.2 Three Assistant Modes

**Mode 1 — Advisory Mode**
Assistant explains capabilities, recommends modules/settings/workflows, and helps design the ideal solution for the organization. No action execution in this mode. Uses Global System Capability Knowledge.

**Mode 2 — Guided Operation Mode**
Assistant guides the user through workflows on the current UI/page, explains fields and actions, and helps the user understand what they are doing. Uses AI Page Context Registry.

**Mode 3 — Delegated Action Mode**
Assistant executes registered backend actions on behalf of the user, only after server-side authorization and required confirmation. Uses AI Action Registry + Runtime User Capability Context.

---

## §2 — Core Distinction: Global Knowledge vs Runtime Context

### §2.1 Global System Capability Knowledge

Represents what the platform is capable of in general. Independent of any specific user or org.

Examples:
- Modules available in the platform
- Capabilities each module provides
- Supported integrations
- Supported data source types
- Supported AI actions
- Supported dashboard widgets
- Supported workflows
- Supported billing/license models
- Supported deployment/storage modes
- Security/multi-tenant rules
- Best-practice solution templates

**Used for:** advice, explanation, onboarding, recommendations, solution design.

### §2.2 User Runtime Capability Context

Represents what the current user/org can actually access or execute right now. Derived from auth, org config, permissions, and DB state.

Includes:
- User identity, org, roles, permissions
- Enabled modules for the org
- Licensed modules
- Feature flags
- Data source access
- Billing/quota state
- Available actions (from AIActionRegistry filtered by permissions)
- Disabled/unavailable actions with reason
- Voice eligibility

**Used for:** execution, tenant-specific data access, action proposals.

### §2.3 The Rule

> **The assistant may describe global capabilities freely. It may only execute actions or access tenant data according to the runtime user capability context. Global knowledge does not grant execution permission.**

---

## §3 — Data Models

### §3.1 SystemCapability

Represents a single platform capability. Registered at build time.

| Field | Type | Description |
|-------|------|-------------|
| capability_id | string | Unique identifier (e.g., `helpdesk.ticket_routing`) |
| name | string | Human-readable name |
| description | string | What this capability does |
| category | enum | See categories below |
| related_modules | string[] | Module keys that implement this capability |
| related_actions | string[] | AIActionDescriptor IDs related to this capability |
| related_permissions | string[] | Permissions required to use this capability |
| related_data_sources | string[] | Data source types this capability supports |
| related_ai_services | string[] | AI service types used (chat, embedding, voice, tts, transcription) |
| required_plan_or_license | string or null | Plan tier required (null = all plans) |
| setup_required | boolean | Requires admin setup before use |
| admin_required | boolean | Only accessible to org-admin or system-admin |
| voice_supported | boolean | Can be accessed/executed via voice agent |
| chat_supported | boolean | Can be explained/guided via chat assistant |
| e2e_coverage_required | boolean | Must have E2E test coverage |
| docs_links | string[] | Links to documentation |
| recommended_for_use_cases | string[] | Business use cases this capability addresses |
| limitations | string[] | Known limits, quotas, or caveats |
| security_notes | string[] | Security considerations for this capability |

**Capability categories:**
`identity`, `tenant`, `module_management`, `data_management`, `data_sources`, `ai`, `voice`, `billing`, `security`, `monitoring`, `dashboards`, `integrations`, `automation`, `devops`

### §3.2 SolutionTemplate

Represents a recommended capability bundle for an org type.

| Field | Type | Description |
|-------|------|-------------|
| template_id | string | Unique identifier |
| name | string | Template name |
| description | string | What org problem this solves |
| target_org_type | string[] | Types of orgs this suits (e.g., IT/MSP, internal helpdesk, legal) |
| recommended_modules | string[] | Module keys to enable |
| required_integrations | string[] | Integration connector IDs |
| recommended_dashboards | string[] | Dashboard widget IDs |
| recommended_ai_actions | string[] | AI action IDs |
| recommended_data_sources | string[] | Data source connector types |
| security_baseline | object | Recommended security settings |
| billing_considerations | string | Cost/plan notes |
| onboarding_questions | string[] | Questions to ask the org admin during setup |

**Example templates:**
- IT/MSP Operations
- Internal Helpdesk
- Knowledge Management
- Document Intelligence
- AI Operations Center
- Voice Support Center
- Data Governance Workspace

### §3.3 CapabilityRecommendation

Represents an advisory recommendation generated by the assistant for a specific user need.

| Field | Type | Description |
|-------|------|-------------|
| user_need | string | What the user described |
| recommended_capabilities | string[] | capability_ids recommended |
| required_permissions | string[] | Permissions needed to use them |
| required_modules | string[] | Modules that must be enabled |
| required_license | string or null | License tier required |
| setup_steps | string[] | Admin steps needed before use |
| estimated_complexity | enum | `low / medium / high` |
| risks | string[] | Known risks or caveats |
| next_best_action | string | Recommended immediate next step |

---

## §4 — Knowledge Sources

The Global AI System Capability Knowledge is built from structured sources, not hardcoded prompt text.

| Source | What it provides |
|--------|-----------------|
| Module manifests | Module key, name, description, capabilities, permissions, plan requirements |
| Module store listings | Commercial descriptions, use cases, target users, pricing tier |
| `dataContract` declarations | Data structures and field descriptions per module |
| AI Action Registry (`AIActionRegistry`) | Available AI actions, permissions, danger levels, voice eligibility |
| AI Page Context Registry (`AIPageContextRegistry`) | Per-page capability context, fields, refusal rules |
| AI Provider Service Registry | Available LLM/STT/TTS/embedding capabilities and configurations |
| Data Sources Hub connector catalog | Supported external connector types (Google Drive, DB, MCP, email, calendar) |
| Dashboard/widget registry | Available widgets, required permissions, data sources |
| Billing/plan catalog | Feature availability per plan tier |
| Integration catalog | Supported third-party integrations |
| Documentation (`docs_links`) | Deep-link references for each capability |
| Solution templates | Pre-built org-type configuration bundles |
| Feature flags | Runtime capability availability per org |
| Runtime module registry | Currently installed/enabled modules per org |

> **Rule:** No capability knowledge should be hardcoded in prompts as the long-term source of truth. All capability knowledge must come from one of the structured sources above.

---

## §5 — Assistant Advisory Flow

### §5.1 Full Advisory Flow

1. User states goal or describes organization/need
2. Assistant uses Global System Capability Knowledge to understand what the platform can do to address the need
3. Assistant checks current org/user Runtime Capability Context
4. Assistant recommends solution or workflow (Advisory Mode)
5. Assistant identifies required modules/settings/integrations/actions
6. Assistant distinguishes:
   - **available now** — enabled, licensed, user has permission
   - **available but disabled** — module exists, not enabled for org
   - **available but unlicensed** — feature requires higher plan
   - **requires admin setup** — user has permission but setup not complete
   - **requires admin permission** — user doesn't have access, admin can grant
   - **not supported yet** — platform does not support this capability
7. Assistant proposes next steps
8. If action is requested (Delegated Action Mode):
   a. Maps request to registered AIActionDescriptor
   b. Validates required inputs
   c. Asks for missing information
   d. Sends proposal to backend
   e. Backend re-checks: permission, tenant scope, module enabled, license, feature flag, rate limit, danger level, context version, approval requirement
   f. UI confirmation/approval happens if required by danger level
   g. Backend executes registered action handler
   h. Audit row (`AIActionInvocation`) written
   i. Usage/billing (`AIUsageLog`) written via `AIProviderGateway`
   j. Assistant reports result and next recommended action

### §5.2 Advisory Questions the Assistant Can Answer

- What can this platform do?
- What modules do I need for my organization?
- How should I configure the platform for my workflow?
- What data sources should I connect?
- What dashboards should I create?
- What can I automate?
- What can the voice agent do?
- What can I do with my current permissions?
- Why can't I access this capability?
- How can an admin enable this capability?
- What is the safest way to perform this task?
- Which features are available in my plan?
- What setup is still missing?

### §5.3 Disambiguation Rules

When the assistant cannot clearly determine the user's intent:
- Ask one clarifying question, not multiple at once
- Offer concrete options when possible
- Do not guess at dangerous or irreversible actions — always ask
- Do not expose internal action schemas to unauthorized users

---

## §6 — Module Contract: Global Capability Metadata

Every module must declare global capability metadata. This can live in module manifest or module docs, but must follow this convention.

### §6.1 Required Fields

Every module's capability declaration must include:

| Field | Description |
|-------|-------------|
| `capability_summary` | One paragraph: what the module does and why |
| `business_use_cases` | List of business problems this module solves |
| `target_users` | Who uses this module (admin, technician, end-user, etc.) |
| `required_setup` | Admin setup steps before the module is usable |
| `required_permissions` | Permission strings needed to use this module |
| `ai_supported_explanations` | What the chat assistant can explain about this module |
| `ai_supported_actions` | AI action IDs available in this module |
| `voice_supported_actions` | Subset of `ai_supported_actions` that are `voice_eligible` |
| `recommended_dashboard_widgets` | Widget IDs relevant to this module |
| `related_data_sources` | Data source types useful for this module |
| `related_integrations` | Third-party integrations supported |
| `plan_or_license_requirements` | Plan tier required (or "all plans") |
| `limitations` | Known limits, quotas, constraints |
| `security_notes` | Security considerations for this module |

### §6.2 Where to Declare

Option A: In module manifest (`apps/<module>/manifest.py` or `apps/<module>/manifest.json`)
Option B: In module docs (`docs/modules/<module_key>/CAPABILITY_METADATA.md`)

The convention must be consistent across modules. Rule: if a module has a manifest file, use it. If not, use the docs path.

---

## §7 — Relationships

### §7.1 Relationship to Module Store

- Module Store is the commercial/discovery UI for humans to browse and install modules
- Global AI System Knowledge uses the same module/capability metadata to advise users
- The assistant may recommend modules from the store
- The assistant must explain if a module requires purchase, trial, or admin approval
- The assistant cannot enable or purchase modules unless the user has the required permission and has confirmed the action

### §7.2 Relationship to AI Action Platform (doc 36)

- Capability Knowledge tells the assistant what exists (advisory)
- AI Action Platform (doc 36) controls what can be registered and executed
- Runtime User Capability Context controls what the current user can execute
- Backend authorization (14-point re-check per doc 54 §9) is always final
- Global knowledge does NOT grant execution permission

### §7.3 Relationship to Data Sources Hub

- Data Sources Hub defines available external knowledge/tool sources (Google Drive, DB, MCP, email, calendar, etc.)
- Capability Knowledge can explain supported connector types to users
- Runtime policies decide what sources the current user/AI can access
- The assistant may recommend connecting a data source but cannot access it until configured and authorized by the appropriate user/admin
- Actual data source access goes through the Data Sources Hub's authorization layer, not through the assistant's capability knowledge

### §7.4 Relationship to AI Assistant Runtime (doc 54)

- Doc 54 §14 defines AI Readiness Levels per module (0–6) — these determine which modes are available
- Doc 54 §15 defines the test harness for validating module AI declarations
- This doc (55) defines what the assistant knows about the platform globally
- A module at Level 0 (Not Ready) still benefits from Global Capability Knowledge for advisory answers
- A module at Level 1+ adds Page Context to the global knowledge base
- A module at Level 3+ adds AI Actions to the global knowledge base

---

## §8 — Tests

### §8.1 Knowledge Completeness Tests (per module)

For every user-facing module, assert:
- Module has `capability_summary` declared
- Module has AI page context registered (if user-facing UI exists)
- Module has AI readiness status declared in `AI_READINESS.md`
- Module has voice readiness status declared
- Module has permission/action mapping documented
- Module has at least one `docs_links` entry

### §8.2 Advisory Behavior Tests (contract-level)

The assistant must:
- Recommend correct capabilities for a sample organization profile
- Distinguish "unavailable" vs "unauthorized" vs "unlicensed" — not collapse them into a single "no"
- Not claim the user can execute actions they cannot
- Suggest admin referral when a capability requires admin permission
- Ask clarifying question when user need is ambiguous (not guess)
- Not expose internal-only capability schemas to unauthorized users
- Not reveal unavailable action schemas to unauthorized users
- Not execute actions without going through the AI Action Platform

### §8.3 E2E Tests (per selected module, Level 1+)

| Test ID | What is tested |
|---------|---------------|
| KB-01 | User asks "what can I do on this page?" — assistant returns page capabilities from AIPageContextRegistry |
| KB-02 | User asks "how can this system help my organization?" — assistant returns relevant SystemCapabilities |
| KB-03 | Org-admin asks for recommended setup — assistant returns SolutionTemplate recommendations |
| KB-04 | Viewer asks for admin-only capability — assistant returns safe referral, no data leaked |
| KB-05 | Assistant recommends a module that is available but not installed — distinguishes "not enabled" from "not supported" |
| KB-06 | Assistant refuses to describe action schema for a capability the user cannot access |
| KB-07 | Advisory mode: no action execution, only explanation |
| KB-08 | Guided operation mode: assistant explains current page fields and actions |
| KB-09 | Delegated action mode: allowed action executes, audit + usage logged |
| KB-10 | Delegated action mode: denied action returns 403, AIActionInvocation row with `status=denied` |
| KB-11 | Unlicensed capability: assistant explains requirement and refers to admin |
| KB-12 | Admin escalation: user lacks permission, assistant says "ask your admin to enable X" |
| KB-13 | Confirmation-required action: assistant proposes, waits for confirm, executes only after confirm |
| KB-14 | Tenant isolation denial: action references org_b resource — 403/404 returned |
| KB-15 | Audit and usage rows created for every delegated action and LLM call |

### §8.4 Mode-Specific Tests

**Advisory Mode:**
- `advisory_recommendation_test`: org profile → correct capability recommendations
- `unavailable_module_recommendation_test`: recommends a module, explains it requires enable/purchase

**Guided Operation Mode:**
- `page_guidance_test`: user on a page → assistant explains fields and available actions

**Delegated Action Mode:**
- `allowed_delegated_action_test`: action executes + `AIActionInvocation.status == "success"`
- `denied_delegated_action_test`: action denied + `AIActionInvocation.status == "denied"` + 403
- `confirmation_required_action_test`: action not executed until `ConfirmActionDialog` confirmed
- `tenant_isolation_denial_test`: cross-tenant resource → 403/404
- `audit_usage_created_test`: `AIActionInvocation` + `AIUsageLog` both exist after action

---

## §9 — Progress Tracker Columns

The following columns must be added to `../06-governance/module-migration-progress.md` to track global AI knowledge status:

| Column | Values | Description |
|--------|--------|-------------|
| `capability_metadata` | `not_started` / `partial` / `complete` | Has capability summary + business use cases + target users declared |
| `global_ai_knowledge` | `not_started` / `partial` / `complete` | Registered in SystemCapability registry (or docs equivalent) |
| `solution_template_coverage` | `none` / `partial` / `template_exists` | Covered by at least one SolutionTemplate |
| `advisory_tested` | `not_started` / `passing` | Knowledge completeness + advisory behavior tests written and passing |
| `user_capability_context` | `not_started` / `partial` / `integrated` | Module contributes to runtime user capability context |

---

## §10 — ADR: Global AI System Capability Knowledge Base

**Context:**
The Chat AI and Voice Agent need to answer advisory questions ("what can this platform do?", "what modules do I need?") without hardcoding answers in prompts. Hardcoded prompt knowledge drifts, cannot be tested, and cannot distinguish between "platform supports this" and "your org has access to this."

**Decision:**
The Chat AI and Voice Agent use a global, structured SystemCapability knowledge base built from: module manifests, module store listings, AI action registry, AI page context registry, AI provider service registry, Data Sources Hub connector catalog, dashboard/widget registry, billing/plan catalog, integration catalog, documentation, and solution templates.

This knowledge is used for explanation, onboarding, recommendations, and solution design. Execution and data access remain governed by runtime user capability context and backend authorization (14-point re-check per doc 54 §9).

**Alternatives considered:**
- Hardcoded prompt context: rejected — drifts, untestable, cannot distinguish platform vs org capabilities
- Live DB query at advisory time: rejected — performance, no stable schema for capability metadata yet
- Separate knowledge LLM: rejected — over-engineered for current scale

**Consequences:**
- Adds per-module capability metadata requirement (§6.1)
- Adds new progress tracker columns to `../06-governance/module-migration-progress.md`
- Adds KB-01–KB-15 E2E test requirements
- The knowledge base is built incrementally as modules are migrated
- Initial state: modules that have completed `AI_READINESS.md` contribute their declarations as the seed

**Affected modules:** all user-facing modules, `floating_assistant`, AI provider gateway

---

## §11 — Enforcement

- A module cannot be marked `capability_metadata = complete` without all §6.1 fields declared
- A module cannot be marked `global_ai_knowledge = complete` without being registered in the capability registry (or docs equivalent)
- Advisory behavior tests (§8.2) are required before `advisory_tested = passing`
- No runtime code grants advisory mode access to unauthorized data
- Global knowledge does NOT grant execution permission — this rule has no exceptions
