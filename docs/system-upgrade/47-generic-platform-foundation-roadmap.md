# R039 — Generic Platform Foundation Roadmap
## AI-Native Generic Organization Platform

**Status:** v1.0 | **Date:** 2026-04-25 | **Supersedes:** —

---

## 1. Executive Summary

- **What exists:** Auth/RBAC (JWT complete), AI Provider Gateway (new files, not yet wired universally), partial UI shared capabilities (PlatformDataGrid, PlatformForm, partial ActionButton), Module Manager redesign spec (R038B schema migrations pending), AIUsageLog billing scaffold, partial OrgFeatureFlag.
- **What's needed:** Before any new feature module can be safely built at scale, 12 P0 foundation gates must be completed: per-org module state (OrgModule), feature flags engine, audit log platform service, notifications foundation, API key management, settings engine, LLM import cleanup, navigation API, CI enforcement, and the generic Data Sources Hub backend.
- **What's blocked:** Broad multi-tenant module development is blocked on missing OrgModule schema (blocks per-org feature gating), missing Settings Engine (blocks all org/user preferences), missing AuditLog service (blocks RBAC audit completeness), and 55+ direct LLM import violations that bypass the billing/governance layer.
- **The plan:** Complete 5 platform foundation phases across R040–R060+. Phase 1 (R040–R048) closes all P0 gates. Phase 2 (R048–R058) builds generic shared hubs. Phase 3 builds AI/automation platform. Phase 4 adds marketplace/enterprise. Phase 5 hardens DevOps/infrastructure.

---

## 2. AI-Native Generic Organization Platform Vision

### 2.1 Product Purpose

The platform is a generic, AI-powered operating layer for organizations. It is not a single-purpose helpdesk. It is not a CRM. It is not a project tool. It is the platform on which such tools are built as modules. The distinction matters: vertical products ship code for a specific use case; this platform ships infrastructure that any use case can safely compose.

Every capability that two or more modules need is a platform service. Every AI call goes through a governed gateway. Every user action is scoped to an org and subject to RBAC. Every module is independently enabled, configured, licensed, and audited per organization.

### 2.2 Target Users

**Organization Owner**
Owns one or more organizations on the platform. Needs visibility into AI usage cost, user activity, module spend, and compliance posture. AI helps surface anomalies, summarize usage, and recommend configuration. Constrained by system-admin platform policies and plan tier entitlements.

**System Administrator**
Cross-tenant platform operator. Can create/manage orgs, assign system-level plans, view global usage, and manage platform infrastructure. AI helps identify anomalies and summarize operational state. Has the widest permission scope; audit logging is mandatory.

**Org Administrator**
Manages a single organization. Configures modules, manages users, sets policies, controls feature flags, manages integrations and data sources. AI helps onboard users, recommend module configurations, and surface errors. Cannot grant `auto_approve_commands` or bypass platform-level BLOCK rules.

**Manager**
Manages a team or department within an org. Assigns work, approves actions, views team analytics, configures department-level settings. AI helps summarize team performance, suggest next actions, draft approvals. Constrained by org-level RBAC and module policies.

**Technician/Operator**
Day-to-day user of module functionality: executes tasks, handles tickets, runs investigations, manages assets. AI is the primary interaction layer — answering questions, executing allowed actions, generating summaries, guiding through workflows. Constrained by role permissions and module-level approvals.

**Regular Employee**
Non-technical end user. Raises requests, checks status, receives notifications, uses the self-service portal. AI onboards them, answers questions, and routes their requests. Most restricted permission set. Cannot configure anything.

**External Customer/User (future)**
Third-party portal user. Accesses only the external-facing module surfaces. AI handles first-contact support and escalation. Completely isolated from internal org data.

**AI Agent / Service Account**
Automated agents that execute tasks on behalf of users or orgs. Has `is_ai_agent=true` flag. Cannot bypass approval workflows. All actions audited. Token-based auth only (no session cookie). Subject to `auto_approve_commands` controls and the Helpdesk Approval Policy.

**Developer / Integration Admin**
Builds custom modules, configures webhooks, manages API keys, operates MCP servers, and writes integration scripts. AI helps with code generation, debugging, and integration testing. Access to developer-tier APIs; constrained by org-level integration policies.

### 2.3 Target Organizations

The platform supports organizations across the following categories — through modules, not hardcoded verticals. The platform itself has no domain logic for any of these; they are delivered as installed modules.

- **IT/MSP operations** — asset management, monitoring, remote support, patch management
- **Helpdesk and support** — ticket management, SLA, approval workflows, escalation
- **Knowledge management** — documentation, wikis, Q&A, search, semantic retrieval
- **Internal operations** — HR workflows, onboarding, policy management, compliance tracking
- **Sales/customer workflows** — CRM, pipeline, communication, deal tracking
- **Document/data management** — file storage, version control, review workflows, retention
- **Voice-based support** — voice AI agents, call transcripts, STT/TTS pipelines
- **Automation and task execution** — scheduled jobs, event-driven automation, approval chains
- **Analytics and dashboards** — custom reports, KPI tracking, usage analytics, AI-generated insights
- **Compliance/audit/security operations** — audit trails, policy enforcement, incident management

The platform supports these through its module system. New verticals require new modules, not changes to the platform core.

### 2.4 Core Value Proposition

- **Unified AI operating layer:** every organizational workflow gains AI assistance without each team building their own LLM integration from scratch
- **Instant multi-tenant SaaS foundation:** any new module inherits auth, RBAC, billing, audit, notifications, and tenant isolation automatically
- **Governed AI access:** AI cannot access org data, call LLMs, or execute actions outside the permission and billing envelope — giving enterprises confidence to deploy AI broadly
- **Module marketplace:** organizations discover, trial, license, and deploy capability modules without engineering effort — extending their platform like an app store
- **Cross-platform reach:** the same governed platform serves web, mobile (React Native), PWA, voice-first, and future desktop clients through portable business logic and shared AI/action schemas

### 2.5 Why AI Is Central, Not Optional

AI is the primary interaction layer for non-technical users. Most platform users do not navigate menus — they ask questions, describe what they want, and let AI translate that into platform actions. This makes AI infrastructure as foundational as authentication.

**AI can:** explain platform state and data, guide users through workflows, answer questions using org knowledge, execute allowed actions within the user's permission scope, summarize activity and generate reports, assist with onboarding and personalization, conduct voice interactions, recommend modules and configurations, transcribe and analyze calls.

**AI cannot:** bypass RBAC permissions, skip tenant isolation or cross org boundaries, access modules that are disabled for the org, call LLM providers directly (must go through AIProviderGateway), skip billing/audit, expose PII without classification policy allowing it, make destructive changes without confirmation and appropriate approval, access data sources without a SourceAccessPolicy granting AI access.

The platform enforces these constraints architecturally, not through policy documentation alone. The AI Provider Gateway, Module Manager, RBAC layer, and Data Sources access policy system form a closed boundary that AI operates within.

### 2.6 How Modules/Marketplace Fit

**Module types:**
- **Core** — always enabled, cannot be disabled (auth, users, orgs, billing core)
- **Optional** — enabled by org admin, free tier
- **Paid** — requires active license/subscription
- **Trial** — time-limited free access with conversion prompt
- **Enterprise** — plan-gated, requires enterprise tier
- **Custom/Private** — built by org or partner, not in public marketplace
- **Integration** — connects to an external service (Google, Jira, GitHub, Slack, etc.)
- **AI-powered** — declares AI capabilities, data access requirements, and voice eligibility
- **Workflow/template packs** — automation templates, prompt sets, reporting templates

**Marketplace lifecycle:** discovery (search/browse) → detail page (capabilities, permissions required, pricing, reviews) → trial/purchase → install (schema migration run in org context) → enable/disable per org → configure (OrgModuleSettings) → upgrade (versioned migration path) → rollback (defined rollback hooks) → uninstall (data retention per dataContract) → billing reconciliation → AI capability declaration (what AI actions the module exposes).

### 2.7 Personalization Model

Personalization covers: org branding and profile, user operating profile (timezone, language, display preferences), enabled modules and feature flags per org, preferred dashboard layouts and widget selection, AI behavior preferences (response style, verbosity, language), notification preferences (channels, frequency, digest), role-based home pages and default views, saved table filters and sort orders, workflow template defaults, and module recommendations based on org size and usage patterns.

**Key rule:** personalization never grants permissions. A user with a preference to see the admin dashboard still hits RBAC on every API call. Preferences are display and UX hints only.

### 2.8 Cross-Platform Application Goal

Target surfaces: web (Next.js), PWA (service worker, offline-capable), mobile (React Native / Expo), desktop (Electron — future), voice-first (AI agent over WebRTC), local assistant mode (on-device AI with privacy guarantees).

Rules for cross-platform compatibility: all business logic lives in `lib/platform/` (portable, no Next.js dependency), portable core types shared via `lib/platform/` barrel, reusable AI/context/action schemas defined in `lib/platform/ai/`, API client parameterized by base URL (not hardcoded to Next.js proxy), no `window`/`document` references in platform logic, feature flags evaluated server-side at session start.

### 2.9 What "Generic" Means

Not industry-specific: the platform ships with no domain models for tickets, assets, contacts, or documents. All domain models live in modules.

Configuration, not code, for new verticals: a new industry deployment installs a module pack, sets configuration, and the platform adapts — no forking.

Modules extend, never fork the core: a module may register AI actions, data sources, nav items, settings schemas, notification types, and audit event types — but it may not modify auth, billing, tenant isolation, or core data ownership rules.

Every feature that multiple modules would need is a platform capability: when two modules need file attachments, the file manager becomes a platform service. When three modules need approval workflows, the approval platform becomes a platform capability. The platform grows by extraction, not by copy-paste.

---

## 3. Platform Pillars

Each pillar defines a domain of platform responsibility. No module may own these domains — they are platform infrastructure.

### Pillar 1 — Identity & Trust Platform
**Purpose:** Establish and verify the identity of all actors and control their access to every resource.
**Key capabilities:** User accounts, user profiles, role definitions, permission grants, MFA (TOTP/SMS), SSO (SAML 2.0, OIDC), session lifecycle, API key management, service accounts, delegated access, security policy enforcement.
**Status:** foundation-built (JWT + RBAC complete; MFA, SSO, API keys missing)

### Pillar 2 — Organization & Tenant Control
**Purpose:** Define, isolate, and govern each tenant organization and its configuration state.
**Key capabilities:** Organization creation and management, strict tenant isolation (every query scoped by org_id), org settings registry, tenant-level feature flags, org-level policies, org audit trail, plan/tier state management.
**Status:** partial (Org model stub; OrgFeatureFlag partial; OrgModule missing; full settings engine missing)

### Pillar 3 — Module & Marketplace Layer
**Purpose:** Enable organizations to discover, install, license, configure, and manage capability modules.
**Key capabilities:** Module registry (manifest-driven), module manifests (v2), per-org module state (OrgModule), org module settings, dependency resolution, module versioning, upgrade jobs, rollback hooks, module packages, module store/marketplace, license management, dynamic navigation API.
**Status:** partial (manifest files exist; OrgModule schema pending R038B; marketplace missing)

### Pillar 4 — Data & Knowledge Layer
**Purpose:** Manage all organizational data assets: files, documents, exports, backups, and search indexes.
**Key capabilities:** Data registry, data ownership model (owned/referenced/core), import/export pipeline, backup/restore, data retention policies, anonymization, media/file manager, attachment handling, document management, full-text and semantic search.
**Status:** not-started (dataContract spec exists in docs; no implementation)

### Pillar 5 — AI Operation Layer
**Purpose:** Provide a governed, metered, audited AI operation infrastructure that all modules use.
**Key capabilities:** AI Provider Gateway (AIProviderGateway.call()), AI providers hub (per-org configuration), service-to-provider routing matrix, usage billing and AIUsageLog, AI Action Platform (declarative action registry), personalized AI context, global floating assistant, local AI agent, voice agent (WebRTC + Gemini), AI onboarding/personalization, prompt/context governance.
**Status:** partial (gateway.py, policy.py, billing_adapter.py built but not universally wired; 55+ direct LLM imports bypass gateway; routing matrix spec complete but not implemented; voice operational on EKS)

### Pillar 6 — Data Sources & Knowledge Connections
**Purpose:** Connect, govern, index, and expose organizational data sources to users and AI assistants.
**Key capabilities:** Connection registry (MCP servers, databases, SaaS, APIs), data source registry, connector secrets management, source access policies, sync/discovery jobs, indexing/embeddings/RAG pipeline, data classification and PII handling, AI retrieval policy, connector health monitoring, connector usage billing, audit logs.
**Status:** not-started (ops_intelligence has ad-hoc connectors; no generic platform system)

### Pillar 7 — Workflow & Automation Layer
**Purpose:** Orchestrate multi-step workflows, approvals, notifications, and automated jobs across modules.
**Key capabilities:** Job runner (async task queue), approval workflow engine, notification platform (email, push, in-app), event timelines, event-driven automation triggers, scheduled jobs, outbox pattern for reliable delivery.
**Status:** partial (Celery jobs exist; outbox_writer exists; approval flows exist in helpdesk only; no generic platform service)

### Pillar 8 — Experience Layer
**Purpose:** Deliver consistent, discoverable, AI-augmented user experiences across all surfaces.
**Key capabilities:** Design system (component library), PlatformDataGrid, PlatformForm, ActionButton, DetailView, dashboard builder, custom widgets, global search + command palette, notification UI, page-level help, cross-platform app shell.
**Status:** partial (DataGrid, Form, PageShell built; dashboard builder, global search, command palette missing)

### Pillar 9 — Billing & Commercial Layer
**Purpose:** Track and enforce plans, usage quotas, AI billing, module licenses, and commercial entitlements.
**Key capabilities:** Plan definitions, org subscriptions, usage metering, AI usage billing (per-token, per-call), module license management, invoice generation, quota enforcement, trial management, entitlement checking.
**Status:** partial (AIUsageLog done; plan/subscription stubs; no quota enforcement; no invoicing)

### Pillar 10 — Operations & Infrastructure Layer
**Purpose:** Support platform health, deployment, secrets management, monitoring, and incident response.
**Key capabilities:** Structured logs, audit logs, Prometheus metrics, health check endpoints, distributed job runner, queue monitoring, alert routing, incident/event timeline, Docker image management, Terraform/IaC, EKS deployment, CI/CD pipelines, environment management, secrets management (SSM).
**Status:** foundation-built (observability, deployment, secrets management operational; some gaps in CI enforcement)

---

## 4. Full Capability Inventory

### Domain 1: Identity & Access Platform

| Capability | Status | Priority | Round | Notes |
|-----------|--------|----------|-------|-------|
| User Management (CRUD) | implemented | P0 | — | Complete via R017 |
| User Profiles | partial | P1 | R045 | Basic fields exist; profile page missing |
| Role Management | implemented | P0 | — | Complete via R018 |
| Permission System | implemented | P0 | — | @role_required, @permission_required complete |
| JWT Auth | implemented | P0 | — | @jwt_required complete |
| Session Management | implemented | P0 | — | JWT + session dual system |
| MFA (TOTP/SMS) | missing | P1 | R050 | Not started |
| SSO / SAML 2.0 | missing | P2 | R055 | Enterprise requirement |
| OIDC Provider | missing | P2 | R055 | Enterprise requirement |
| API Key Management | missing | P1 | R047 | Needed for integrations + service accounts |
| Service Accounts | missing | P1 | R047 | AI agents need non-session auth |
| Delegated Access | missing | P2 | R057 | Cross-org access patterns |
| Security Policies | missing | P1 | R050 | Password policies, session timeout rules |

### Domain 2: Tenant & Organization Platform

| Capability | Status | Priority | Round | Notes |
|-----------|--------|----------|-------|-------|
| Organization CRUD | partial | P0 | — | Model stub only (id column) |
| Org Settings Registry | missing | P0 | R045 | Needed for all org configuration |
| Tenant Isolation (query scoping) | implemented | P0 | — | org_id scoping throughout |
| Feature Flags (per org) | partial | P0 | R045 | OrgFeatureFlag partial; not generic |
| Org Policies | missing | P1 | R046 | Policy enforcement engine |
| Org-Level Audit Trail | partial | P1 | R046 | record_activity() exists; not comprehensive |
| Plan/Tier State | partial | P1 | R045 | Stubs exist; no enforcement |
| Org Suspension/Deactivation | missing | P1 | R049 | Needed for billing enforcement |

### Domain 3: Module Platform

| Capability | Status | Priority | Round | Notes |
|-----------|--------|----------|-------|-------|
| Module Registry (system catalog) | partial | P0 | R040 | Module model exists; needs R038B migrations |
| Module Manifests (manifest.v2.json) | implemented | P0 | — | 75 files across 37+ modules |
| Per-Org Module State (OrgModule) | missing | P0 | R040 | Blocks all per-org module features |
| Org Module Settings | missing | P1 | R042 | OrgModuleSettings deferred from R038B |
| Module Dependencies | partial | P1 | R042 | JSON blob; needs ModuleDependency table |
| Module Versioning | missing | P0 | R040 | ModuleVersion in R038B scope |
| Upgrade Jobs | missing | P1 | R043 | Async module upgrade pipeline |
| Rollback Hooks | missing | P1 | R043 | Per-module rollback support |
| Module Packages | missing | P2 | R053 | Deferred to R038H |
| Module Store | missing | P2 | R054 | Deferred to R038I |
| Module Licenses | missing | P1 | R042 | ModuleLicense with org_id FK |
| Module Navigation API | missing | P0 | R044 | GET /api/org/modules/navigation |
| ModuleRegistry sync | missing | P0 | R042 | sync_from_manifests() bridge |
| Module CompatLayer | missing | P0 | R042 | Read-through for gradual migration |

### Domain 4: Data Platform

| Capability | Status | Priority | Round | Notes |
|-----------|--------|----------|-------|-------|
| Data Registry | missing | P2 | R056 | Data ownership model per module |
| Data Ownership Classification | partial | P1 | R043 | dataContract spec exists; no implementation |
| Import/Export Pipeline | missing | P1 | R056 | Backend spec complete in doc 24 |
| Backup/Restore | missing | P2 | R058 | Enterprise requirement |
| Data Retention Policies | missing | P2 | R058 | GDPR requirement |
| Anonymization Engine | missing | P2 | R058 | PII anonymization on export |
| Media/File Manager | missing | P1 | R052 | Needed by Knowledge, HR, Helpdesk modules |
| Attachment Handling | missing | P1 | R052 | Ticket attachments, document uploads |
| Document Management | missing | P2 | R056 | Version control, review workflows |
| Full-Text Search | missing | P1 | R053 | pg_trgm baseline |
| Semantic Search / RAG | partial | P1 | R049 | rag-db exists; no platform service |

### Domain 5: AI Platform

| Capability | Status | Priority | Round | Notes |
|-----------|--------|----------|-------|-------|
| AI Provider Gateway | partial | P0 | R048 | gateway.py built; not universally wired |
| AI Providers Hub (per-org config UI) | partial | P1 | R043 | Spec in doc 44; backend JWT routes pending |
| Service-to-Provider Routing Matrix | partial | P0 | R043 | Spec in doc 44 §16-28; backend not built |
| AI Usage Log | implemented | P0 | — | AIUsageLog model complete |
| AI Usage Billing | partial | P1 | R045 | billing_adapter.py built; not wired |
| AI Action Platform | partial | P1 | R051 | Spec in doc 36/39; no generic registry |
| Personalized AI Context | partial | P1 | R051 | _build_user_context() exists in helpdesk only |
| Global Floating Assistant | partial | P1 | R051 | Spec in doc 38; no implementation |
| Local AI Agent | missing | P2 | R057 | On-device privacy mode |
| Voice Agent (WebRTC + Gemini) | implemented | P0 | — | Operational on EKS |
| AI Onboarding/Personalization | missing | P2 | R055 | AI-guided org setup |
| Prompt/Context Governance | missing | P1 | R051 | Prompt audit, injection prevention |
| LLM Direct Import Cleanup | partial | P0 | R048 | 55+ files bypass gateway — must be resolved |

### Domain 6: Data Sources & Knowledge Connections

| Capability | Status | Priority | Round | Notes |
|-----------|--------|----------|-------|-------|
| Connection Registry (DataConnection) | missing | P1 | R049 | New platform domain — see §9 |
| Data Source Registry (DataSource) | missing | P1 | R049 | Per-source metadata + classification |
| MCP Server Registry | missing | P1 | R049 | Tool/resource/prompt discovery + allowlist |
| Database Connection Registry | missing | P1 | R049 | Read-only by default, governed queries |
| Connector Secrets Management | missing | P0 | R049 | OAuth tokens, API keys — never to frontend |
| Source Access Policies | missing | P0 | R049 | SourceAccessPolicy per principal |
| Source Sync Jobs | missing | P1 | R052 | Discover, sync, incremental, permission sync |
| Indexing/Embeddings/RAG Pipeline | partial | P1 | R052 | rag-db exists; no platform orchestration |
| Data Classification / PII Handling | missing | P1 | R052 | Classification levels + PII detection |
| AI Retrieval Policy | missing | P0 | R049 | Must enforce before AI can use any source |
| Connector Health Monitoring | missing | P2 | R054 | Degraded state detection |
| Connector Usage Billing | missing | P2 | R054 | Indexing cost, LLM retrieval cost |
| Data Sources Audit Logs | missing | P1 | R052 | Every sync/query/tool execution audited |

### Domain 7: Integration Platform

| Capability | Status | Priority | Round | Notes |
|-----------|--------|----------|-------|-------|
| Google OAuth Connections | partial | P1 | R049 | Exists in ops_intelligence; needs migration |
| Microsoft Graph / Teams | missing | P2 | R055 | Future |
| Jira Integration | partial | P1 | R049 | Exists in ops_intelligence; needs migration |
| GitHub Integration | partial | P1 | R049 | Exists in ops_intelligence; needs migration |
| Slack Integration | missing | P2 | R055 | Future |
| Webhooks (inbound/outbound) | partial | P1 | R050 | Outbound exists; no platform management |
| External API Connectors | missing | P1 | R050 | Generic HTTP connector framework |
| Integration Secrets | missing | P0 | R047 | SSM-backed secret references for connectors |
| Integration Health | missing | P2 | R054 | Circuit breaker state + health UI |
| Integration Marketplace | missing | P2 | R054 | Discover and install integration modules |

### Domain 8: Operations Platform

| Capability | Status | Priority | Round | Notes |
|-----------|--------|----------|-------|-------|
| Structured Logs | implemented | P0 | — | Python logging + EKS |
| Audit Logs (platform service) | partial | P0 | R046 | record_activity() exists; not comprehensive service |
| Prometheus Metrics | implemented | P0 | — | apps/observability/metrics.py |
| Health Check Endpoints | implemented | P0 | — | /admin/api/monitoring/health |
| Distributed Job Runner | implemented | P0 | — | Celery + Redis |
| Queue Monitoring | partial | P1 | R046 | Basic Flower; no platform UI |
| Notification Platform (backend) | partial | P0 | R046 | platform_outbox exists; no platform service |
| Alerts / Incident Detection | missing | P2 | R054 | Prometheus alerting rules |
| Event/Incident Timeline | partial | P1 | R046 | ticket_timeline exists; not generic |

### Domain 9: Billing & Commercial Platform

| Capability | Status | Priority | Round | Notes |
|-----------|--------|----------|-------|-------|
| Plan Definitions | partial | P1 | R045 | Stubs exist; no enforcement |
| Org Subscriptions | partial | P1 | R045 | Stubs exist; no billing integration |
| Usage Metering | partial | P0 | R045 | AIUsageLog; no quota enforcement |
| AI Usage Billing | partial | P0 | R045 | billing_adapter.py; not wired |
| Module License Management | missing | P1 | R042 | ModuleLicense model needed |
| Invoice Generation | missing | P2 | R057 | Stripe integration |
| Quota Enforcement | missing | P0 | R045 | Hard stop when quota exceeded |
| Trial Management | missing | P1 | R054 | Time-limited module trials |
| Entitlement Checking | missing | P1 | R045 | Plan-gated feature access |
| Stripe Integration | missing | P2 | R057 | Payment processing |

### Domain 10: UX Platform

| Capability | Status | Priority | Round | Notes |
|-----------|--------|----------|-------|-------|
| Design System (component library) | partial | P0 | R041 | Tailwind + shadcn; missing key patterns |
| PlatformDataGrid | implemented | P0 | — | R012 complete |
| PlatformForm | implemented | P0 | — | R015-019 complete |
| ActionButton | partial | P0 | R041 | Spec done; not extracted to shared/ |
| DetailView | partial | P0 | R041 | Pattern used; not fully extracted |
| Dashboard Builder | missing | P2 | R055 | Custom widget layouts |
| Custom Widgets | missing | P2 | R055 | Org-configurable dashboard tiles |
| Global Search (cmd+K) | missing | P1 | R053 | Full-text + semantic + nav search |
| Command Palette | missing | P1 | R053 | Action shortcuts |
| Notifications UI | partial | P1 | R046 | Spec done; NotificationBell not implemented |
| Page-Level Help | missing | P2 | R056 | Contextual help system |
| Onboarding UI | missing | P2 | R055 | AI-guided setup flows |

### Domain 11: DevOps / Infrastructure Platform

| Capability | Status | Priority | Round | Notes |
|-----------|--------|----------|-------|-------|
| Docker Image Management | implemented | P0 | — | ECR + GitHub Actions |
| Terraform / IaC | implemented | P0 | — | EKS cluster, networking |
| Kubernetes / EKS | implemented | P0 | — | Operational |
| CI/CD Pipelines | implemented | P0 | — | cd-deploy-dual.yml |
| CI Enforcement (LLM import check) | partial | P0 | R041 | check_no_direct_llm_imports.py exists; not in CI |
| Environment Management | implemented | P0 | — | PROD/TEST via Cloudflare tunnels |
| Secrets Management (SSM) | implemented | P0 | — | SSM → K8s Secret → Pod env |
| Deployment Status API | partial | P1 | R046 | No platform-ui visibility |
| Infrastructure Monitoring | implemented | P0 | — | Prometheus + Grafana |

---

## 5. Current Implementation Status Matrix

| Domain | Implemented | Partial | Missing | % Rough Estimate |
|--------|------------|---------|---------|-----------------|
| Identity & Access | 5 | 1 | 7 | 38% |
| Tenant & Org | 1 | 3 | 4 | 25% |
| Module Platform | 2 | 3 | 9 | 20% |
| Data Platform | 0 | 1 | 9 | 5% |
| AI Platform | 3 | 5 | 5 | 35% |
| Data Sources | 0 | 1 | 12 | 5% |
| Integration | 0 | 4 | 6 | 15% |
| Operations | 5 | 3 | 1 | 65% |
| Billing & Commercial | 0 | 4 | 6 | 15% |
| UX Platform | 3 | 3 | 6 | 35% |
| DevOps / Infra | 7 | 2 | 0 | 85% |

**What is blocking broad module development:**

- OrgModule table does not exist — no module can safely have per-org enable/disable state
- Settings Engine does not exist — no module can store org or user preferences generically
- Feature Flags engine is partial — plan-gating modules is unreliable
- AuditLog platform service does not exist — modules log inconsistently
- Notification platform service does not exist — modules cannot send notifications generically
- API Keys do not exist — integrations and service accounts cannot authenticate
- Navigation API does not exist — all sidebar nav is hardcoded (bypasses module enable/disable)
- 55+ files call LLM providers directly — AI billing and governance are being bypassed
- AIServiceRoutingMatrix backend not built — module AI calls use ad-hoc provider resolution
- OrgModule CompatLayer not built — cannot migrate existing callers without breaking them
- Data Sources Hub backend does not exist — AI assistants cannot safely access org data sources
- CI does not enforce the LLM gateway rule — violations will continue accumulating

---

## 6. Missing P0 Foundations

These must be completed before any new feature module is built. They are ordered by dependency.

1. **OrgModule schema migrations (R038B)** — `OrgModule`, `OrgModuleSettings`, `ModuleDependency`, `ModuleVersion`, `ModuleLicense` tables. No per-org module state is possible without this.
2. **ModuleRegistry.sync_from_manifests() (R042)** — bridge between 75 manifest files and the DB catalog. Without this, manifest data and DB state are permanently out of sync.
3. **ModuleCompatLayer (R042)** — read-through shim for existing callers of `Module.is_enabled` / `Module.is_installed`. Without this, migrating to OrgModule breaks all current route checks.
4. **Navigation API (R044)** — `GET /api/org/modules/navigation` returns org-specific nav from manifests + OrgModule state. Without this, disabled modules still appear in sidebar.
5. **Feature Flags Engine (R045)** — generic `OrgFeatureFlag` service with `useFeatureFlag()` hook. Currently partial; plan-gating is unreliable.
6. **Settings Engine (R045)** — generic org/user settings registry. Without this, every module invents its own settings storage pattern.
7. **AuditLog Platform Service (R046)** — standardize `record_activity()` into a proper audit log service with structured fields, retention, and UI. Currently inconsistent across modules.
8. **Notification Platform Service (R046)** — generic notification service backed by `platform_outbox`. Currently helpdesk-only ad-hoc code.
9. **API Keys Backend (R047)** — API key management for integrations, service accounts, and developer access. Without this, no integration module can authenticate properly.
10. **Secrets Manager Backend (R047)** — generic connector secrets management (SSM-backed) for integration credentials. Without this, each module stores credentials differently.
11. **LLM Direct Import Cleanup (R048)** — eliminate 55+ direct `import openai` / `import anthropic` / `import google.generativeai` calls that bypass AIProviderGateway. Without this, billing is incomplete and the governance layer is porous.
12. **CI Enforcement (R041)** — `check_no_direct_llm_imports.py` must run in CI on every PR. Without enforcement, the cleanup regresses immediately.

---

## 7. Dependency Graph

```
[Auth/JWT/RBAC] ──────────────────→ [All protected API routes]
[OrgModule (R040)] ────────────────→ [Module-scoped routes]
                                    → [Feature flags per org]
                                    → [Navigation API (R044)]
                                    → [Org module settings]
                                    → [Module licenses]
[ModuleRegistry sync (R042)] ──────→ [OrgModule state is valid]
[ModuleCompatLayer (R042)] ────────→ [Existing callers safe during migration]
[Navigation API (R044)] ───────────→ [Sidebar shows only enabled modules]
[Feature Flags Engine (R045)] ─────→ [Plan-gated features across all modules]
[Settings Engine (R045)] ──────────→ [All org/user preferences]
[AuditLog Service (R046)] ─────────→ [Comprehensive audit trail]
[Notification Service (R046)] ─────→ [All module notifications]
[API Keys (R047)] ─────────────────→ [Integration auth]
                                    → [Service account auth]
                                    → [Developer API access]
[Secrets Manager (R047)] ──────────→ [Integration connector secrets]
                                    → [Data Sources connector auth]
[LLM Import Cleanup (R048)] ───────→ [AI billing complete]
                                    → [AI governance enforced]
[AI Provider Gateway wired] ───────→ [All AI calls metered]
                                    → [All AI calls audited]
[AI Service Routing Matrix (R043)] → [Feature-level AI provider resolution]
[Data Sources Hub (R049)] ─────────→ [AI assistants access org data safely]
                                    → [MCP server governance]
                                    → [Database query governance]
[Media/File Manager (R052)] ───────→ [Knowledge module]
                                    → [Helpdesk attachments]
[Global Search (R053)] ────────────→ [Command palette]
                                    → [Cross-module search]
[Billing & Quota (R045)] ──────────→ [AI usage limits]
                                    → [Module trial management]
[Dashboard Builder (R055)] ────────→ [Org-configurable home pages]
```

---

## 8. Correct Build Order

### Phase 1 — Foundation Gates (complete before broad module dev)

These deliverables are prerequisites for all multi-tenant module development.

| # | Deliverable | Round | Blocks |
|---|------------|-------|--------|
| 1.1 | OrgModule + ModuleVersion + ModuleLicense schema migrations (R038B) | R040 | Per-org module state everywhere |
| 1.2 | CI enforcement gate (LLM import check in PR CI + ADR-028 check) | R041 | Governance regression |
| 1.3 | ActionButton extraction + DetailView extraction (complete partials) | R041 | UI consistency; Helpdesk forms |
| 1.4 | ModuleRegistry.sync_from_manifests() + ModuleCompatLayer | R042 | All module callers |
| 1.5 | AI Service-to-Provider Routing Matrix backend (AIServiceDefinition + AIServiceProviderRoute) | R043 | Feature-level AI routing |
| 1.6 | Navigation API (GET /api/org/modules/navigation + sidebar wiring) | R044 | Module-aware nav |
| 1.7 | Feature Flags Engine (generic OrgFeatureFlag service + useFeatureFlag hook) | R045 | Plan-gating, beta features |
| 1.8 | Settings Engine (generic org/user settings registry + useSettings hook) | R045 | All module preferences |
| 1.9 | AuditLog Platform Service + Notification Platform Service | R046 | All module audit + notifications |
| 1.10 | API Keys + Secrets Manager backend | R047 | Integration auth, connector secrets |

### Phase 2 — Core Platform Hubs (generic shared services, usable by all modules)

| # | Deliverable | Round | Blocks |
|---|------------|-------|--------|
| 2.1 | LLM direct import cleanup (55+ files → AIProviderGateway) | R048 | AI billing completeness |
| 2.2 | Data Sources Hub backend foundation (DataConnection, DataSource, SourceAccessPolicy, sync jobs) | R049 | All org knowledge AI access |
| 2.3 | Integration Platform backend (Google OAuth, Jira, GitHub as DataConnections) | R050 | Integration modules |
| 2.4 | MFA backend (TOTP + SMS) | R050 | Security baseline |
| 2.5 | AI Action Platform generic registry (AIActionDescriptor v1, risk_tier, voice_eligible) | R051 | All AI-powered modules |
| 2.6 | Global Floating Assistant wired to AIProviderGateway | R051 | Cross-module AI UX |
| 2.7 | Media/File Manager (S3-backed, multi-tenant, virus scan hook) | R052 | Knowledge, Helpdesk, HR modules |
| 2.8 | Data Sources indexing/RAG pipeline (embeddings, KnowledgeIndex, retrieval policy) | R052 | AI knowledge access |
| 2.9 | Global Search + Command Palette (full-text + semantic + nav) | R053 | Cross-module discoverability |
| 2.10 | Billing quota enforcement + entitlement checking | R053 | Plan-gated access correctness |

### Phase 3 — AI/Automation Platform

| # | Deliverable | Round |
|---|------------|-------|
| 3.1 | AI Providers Hub JWT API routes (side-by-side, @jwt_required throughout) | R054 |
| 3.2 | Personalized AI Context platform service (user + org context injection) | R054 |
| 3.3 | Workflow Automation Engine (event triggers, condition evaluation, action execution) | R055 |
| 3.4 | AI Onboarding flows (AI-guided org setup, module recommendations) | R055 |
| 3.5 | Voice Agent platform service (abstract WebRTC + provider) | R056 |
| 3.6 | Prompt governance + injection prevention | R056 |
| 3.7 | AI Agents platform (autonomous investigation, cross-module context) | R057 |

### Phase 4 — Marketplace/Enterprise Features

| # | Deliverable | Round |
|---|------------|-------|
| 4.1 | Module Store / Marketplace (discovery, install, trial, purchase) | R057 |
| 4.2 | SSO / SAML 2.0 + OIDC | R058 |
| 4.3 | MFA enforcement policies (org-level MFA requirement) | R058 |
| 4.4 | Backup/Restore + Data Retention Engine | R058 |
| 4.5 | Dashboard Builder (org-configurable widget layouts) | R059 |
| 4.6 | Stripe integration + Invoice generation | R059 |
| 4.7 | Delegated Access + Cross-org permissions | R060 |
| 4.8 | Developer portal + API documentation | R060 |

### Phase 5 — DevOps/Infrastructure Management

| # | Deliverable | Round |
|---|------------|-------|
| 5.1 | Deployment Status API + platform-ui visibility | R046 |
| 5.2 | Infrastructure monitoring platform-ui dashboard | R054 |
| 5.3 | Alerting rules + incident timeline | R055 |
| 5.4 | CI/CD enhancement (per-service promotion gates, canary) | R057 |
| 5.5 | Database migration management UI (migration history, status, rollback) | R058 |

---

## 9. Data Sources & Knowledge Connections Platform (full spec)

### 9.1 Purpose

Organizations connect, govern, index, search, and use their own information sources through the platform and AI assistants. The Data Sources & Knowledge Connections Platform is the generic layer that manages these connections. It answers: what data sources does this org have? Who can access them? Can AI use them? What has been indexed? What has been queried?

This is a new top-level platform domain. It is distinct from AI Providers (which manage LLM/STT/TTS model providers) and from integration modules (which implement specific connector behavior). The Data Sources Hub governs access and indexing; modules consume it.

### 9.2 Conceptual Models (high-level schema spec)

#### DataConnection
Represents an authenticated connection to an external system or internal data store.

```
id              — UUID primary key
org_id          — FK organizations.id (NOT NULL, indexed)
name            — display name
connection_type — enum: mcp_server | database | google_drive | gmail | google_calendar |
                         microsoft_graph | sharepoint | teams | jira | github |
                         slack | s3 | api | webhook | file_repository | logs |
                         monitoring | custom
status          — enum: draft | active | degraded | disabled | error
auth_type       — enum: oauth | api_key | service_account | connection_string | mcp_auth | none
secret_ref      — SSM parameter name (never store raw credential in DB)
owner_user_id   — FK users.id
created_at, updated_at
```

#### DataSource
Represents a specific data entity within a connection (a Gmail inbox, a specific database schema, a GitHub repository, an MCP server resource).

```
id              — UUID primary key
org_id          — FK organizations.id (NOT NULL, indexed)
connection_id   — FK data_connections.id
source_type     — string (gmail_inbox | jira_project | github_repo | db_schema | mcp_resource | ...)
source_key      — unique key within the connection
display_name    — human-readable name
metadata        — JSONB (source-specific metadata)
sync_enabled    — boolean (default false)
index_enabled   — boolean (default false)
classification  — enum: public | internal | confidential | restricted | pii | secret
created_at, updated_at
```

#### SourceAccessPolicy
Defines who can access a data source and at what level. Evaluated on every access attempt.

```
id              — UUID primary key
org_id          — FK organizations.id (NOT NULL, indexed)
source_id       — FK data_sources.id
principal_type  — enum: user | role | module | ai_agent | service_account
principal_id    — string (user_id, role_id, module_key, etc.)
access_level    — enum: none | read_metadata | read_content | query | execute_tool | write | admin
ai_allowed      — boolean (can AI assistants access this source?)
voice_allowed   — boolean (can voice agents access this source?)
export_allowed  — boolean (can data be exported from this source?)
pii_allowed     — boolean (can PII fields be returned in queries?)
created_at, updated_at
```

#### SourceSyncJob
Tracks sync and discovery operations on data sources.

```
id                       — UUID primary key
org_id                   — FK organizations.id
connection_id            — FK data_connections.id
source_id                — FK data_sources.id (nullable — discovery job has no source yet)
job_type                 — enum: discover | sync | incremental_sync | index | reindex | permission_sync
status                   — enum: pending | running | completed | failed | cancelled
started_at, completed_at
rows_or_files_processed  — integer
errors_count             — integer
safe_error_message       — string (never stack trace — internal details stay in logs)
```

#### KnowledgeIndex
Tracks the indexing state of a data source for search and AI retrieval.

```
id                       — UUID primary key
org_id                   — FK organizations.id
source_id                — FK data_sources.id
index_type               — enum: keyword | vector | hybrid
embedding_provider_route — FK ai_service_provider_routes.id (nullable)
status                   — enum: building | ready | stale | error
last_indexed_at          — timestamp
document_count           — integer
chunk_count              — integer
storage_backend          — string (rag-db | elasticsearch | pgvector | ...)
```

### 9.3 MCP Server Management

MCP (Model Context Protocol) servers expose tools, resources, and prompts to AI agents. Rules for platform-governed MCP:

- Register URL/transport (stdio | http | sse) with auth securely stored as `secret_ref`
- On registration: auto-discover available tools, resources, and prompts via protocol handshake
- Each tool/resource classified at registration: danger level (read_safe | write | destructive | admin)
- Tool allowlist per org / per module / per user role — no tool is callable without explicit allowlist entry
- AI invoke policy per tool: allowed | requires_confirmation | requires_approval | blocked
- Voice invoke policy per tool: separate from text AI policy
- Rate limits per tool call (org-level and user-level)
- Every tool invocation audited: tool name, parameters (sanitized), result status, user_id, org_id, module_id
- Destructive tools blocked by default; require explicit dangerous_tools_enabled org policy
- MCP server secrets never returned to frontend — resolved server-side only
- Tool execution that modifies org data: must be registered in AI Action Platform + permission required + confirmation/approval for danger_level=destructive + audit required
- Cross-org MCP access: prohibited. Each MCP server registration is scoped to one org.

### 9.4 Database Connection Management

Rules for platform-governed database connections:

- Read-only mode by default: connection.write_enabled=false (requires explicit org admin override)
- Schema discovery requires admin approval before AI can query
- AI query generation constrained to allowlisted tables/views only — no arbitrary SQL
- No full table dump to LLM: row limits mandatory (default max 500 rows per query), enforced server-side
- No arbitrary destructive SQL by AI under any circumstances
- Sensitive column classification required before any query can be run (classification=pii → requires pii_allowed policy)
- Connection strings stored as SSM parameter references — never in the DB
- Every query audited: SQL (sanitized), row count, user, org, module, source_id, timestamp
- Cross-tenant DB access: prohibited regardless of connection configuration
- AI may only query a database if SourceAccessPolicy exists granting AI access at the appropriate level
- Query timeouts enforced server-side (default 30s)
- No direct database connections from the browser — all queries go through platform API

### 9.5 AI Knowledge Access Policy

AI assistants (floating, voice, module-embedded) can use connected org data only if ALL of the following hold:

1. The data source belongs to the current org (org_id match)
2. The requesting user has access to the source (SourceAccessPolicy at read_content or higher)
3. The source policy has ai_allowed=true
4. The module making the AI call is enabled for the org (OrgModule.status='enabled')
5. The data classification does not exceed the user's clearance level
6. PII fields are only returned if pii_allowed=true in the policy AND the query explicitly requests PII
7. The retrieval purpose is logged (module_id + feature_id from GatewayRequest)
8. The retrieval is audited in SourceSyncJob or a dedicated retrieval audit table
9. Retrieval cost is metered and billed via AIUsageLog
10. Secrets (classification=secret) are never retrievable by AI under any circumstances

AI retrieval uses scoped patterns: summaries (not raw dumps), row limits, source citations in responses, semantic search over indexed content (not raw queries on production tables).

### 9.6 Planned UI Hub

Routes under `/data-sources`:

| Route | Purpose |
|-------|---------|
| `/data-sources` | Overview: connection count, source count, sync status, index status |
| `/data-sources/connections` | All connections list with status, type, last sync |
| `/data-sources/connections/[id]` | Connection detail: sources, sync jobs, health, settings |
| `/data-sources/mcp` | MCP server list, tool allowlists, discovery status |
| `/data-sources/databases` | Database connections, schema browser, query allowlist |
| `/data-sources/sources` | All data sources, classification, index status |
| `/data-sources/policies` | Source access policies by source + principal |
| `/data-sources/sync-jobs` | Sync job history and status |
| `/data-sources/indexes` | Knowledge index status, rebuild triggers |
| `/data-sources/usage` | Indexing cost, retrieval cost by source + module |

### 9.7 Permissions

| Permission | Scope |
|-----------|-------|
| `data_sources.view` | List connections and sources |
| `data_sources.manage` | Create, update, delete connections |
| `data_sources.connect` | Create a new connection (requires auth) |
| `data_sources.disable` | Disable a connection without deleting |
| `data_sources.secrets.manage` | Rotate credentials (system admin only) |
| `data_sources.policies.manage` | Create/update SourceAccessPolicy |
| `data_sources.sync.run` | Trigger sync/discovery jobs |
| `data_sources.index.run` | Trigger index/reindex jobs |
| `data_sources.usage.view` | View retrieval cost and usage reports |
| `data_sources.system.manage` | Platform-level connector configuration (system admin) |

### 9.8 Relationship to Existing Modules

- **ops_intelligence:** currently owns ad-hoc connector logic for Google, Jira, GitHub. After Data Sources Hub: ops_intelligence becomes a consumer/reference implementation. It registers its data connections via the platform API and accesses them through SourceAccessPolicy. The connector logic migrates gradually — ops_intelligence continues to work through a CompatLayer during migration.
- **Existing Google/Jira/GitHub integrations:** should register as DataConnections + DataSources in the Data Sources Hub. Their OAuth tokens should be stored as SSM secret_refs. This migration is planned for R049-R050.
- **AI Providers (apps/ai_providers):** manages LLM/STT/TTS/embedding model providers. Different domain — model access, not data source access.
- **AI Action Platform:** executes governed AI actions that may use data sources. Consumes the SourceAccessPolicy to determine if an action may query a given source.
- **Module Manager:** controls whether a given connector module is available per org. Data Sources Hub manages the connection once the connector module is enabled.

### 9.9 Security Requirements

- Tenant isolation: every DataConnection, DataSource, SourceAccessPolicy, SourceSyncJob, and KnowledgeIndex is scoped to one org. Cross-org access is structurally impossible.
- Secrets never returned to frontend: secret_ref is a pointer to SSM — never the value.
- OAuth tokens stored as SSM parameters, rotated on expiry, never logged.
- Source access policies enforced server-side on every access — never trusted from client.
- AI access permission-filtered: AI cannot access sources where ai_allowed=false.
- All sync/query/tool execution audited with user, org, module, source, timestamp.
- PII classification respected: pii columns masked or blocked unless policy explicitly permits.
- Destructive MCP/DB actions blocked by default; require explicit dangerous_tools_enabled.
- DB writes disabled by default; require explicit write_enabled=true (org admin + audit).
- No arbitrary SQL by AI; no full table dump to LLM.
- Usage and billing recorded for indexing and LLM retrieval via AIUsageLog.
- Deletion of a connection requires confirmation + audit + data retention check.

---

## 10. Generic Service Rules

1. **Two-module rule:** Any capability used by 2 or more modules must become a platform service, not a module-local implementation.
2. **No module owns auth:** Authentication, session management, and JWT issuance are platform-only. Modules call the auth service; they do not implement it.
3. **No module owns audit logging:** All modules write to the platform AuditLog service. No module maintains its own audit table.
4. **No module owns media/files:** File storage, virus scanning, and CDN delivery are platform services. Modules call the file manager; they do not upload to S3 directly.
5. **No module owns search:** Full-text and semantic search are platform capabilities. Modules do not maintain their own search indexes.
6. **No module owns notifications:** Email, push, in-app, and SMS notifications go through the platform notification service backed by platform_outbox. No module sends email directly.
7. **Settings engine for all preferences:** Org settings and user preferences are stored through the Settings Engine. No module stores preferences in ad-hoc model fields.
8. **All AI calls through the gateway:** No module may call openai, anthropic, or google.generativeai directly. Every AI call uses AIProviderGateway.call(GatewayRequest(...)). This is enforced by CI.
9. **All media through the media service:** No module uploads files directly to S3 or stores blob data in the DB. All binary data goes through the platform file manager.
10. **All connector secrets through Secrets Manager:** Integration credentials, API keys, OAuth tokens, and database connection strings are stored as SSM references. No module stores raw credentials in the DB or environment.
11. **All billing through AIUsageLog:** Every AI call, embedding operation, and retrieval operation writes an AIUsageLog row. Modules do not implement their own billing tracking.
12. **All background jobs through Celery:** No module implements its own threading, subprocess, or async background work outside the Celery task system.
13. **All external HTTP calls through the integration framework:** Modules do not make raw `requests.get()` calls to external APIs without going through the platform integration framework (which handles retries, circuit breakers, rate limiting, and audit).
14. **All DB queries scoped by org_id:** No query on a multi-tenant table may omit the WHERE org_id = g.jwt_user.org_id clause. This is enforced by code review and integration test.
15. **Capability registry before implementation:** Before building any new shared capability, check `docs/system-upgrade/26-platform-capabilities-catalog.md`. If the capability should be shared, add it to the catalog first and build it as a platform service.

---

## 11. Shared Capability Requirements

| Capability | Must Be Shared | Reason |
|-----------|---------------|--------|
| Authentication / JWT | Yes | Used by 100% of routes |
| RBAC / Permissions | Yes | Used by 100% of modules |
| Tenant Isolation | Yes | Used by 100% of DB queries |
| Audit Logging | Yes | Used by all write operations across all modules |
| Notifications | Yes | Used by helpdesk, AI agents, billing, approvals |
| Settings / Preferences | Yes | Used by every org-configurable module |
| Feature Flags | Yes | Used by plan-gated features across all modules |
| File Manager | Yes | Used by helpdesk, knowledge, HR, compliance |
| AI Provider Gateway | Yes | Used by all AI-powered modules |
| Background Jobs | Yes | Used by every async operation |
| Search | Yes | Used by helpdesk, knowledge, data sources, nav |
| Notifications UI | Yes | Used by all modules that send alerts |
| DataGrid | Yes | Used by all modules with list views |
| Form Engine | Yes | Used by all modules with CRUD forms |
| Approval Flow | Yes | Used by helpdesk, AI agents, data source access |
| Data Export | Yes | Used by reporting, compliance, user data requests |

---

## 12. Security Baseline

Every platform module and feature must meet this baseline before merge:

1. **All /api/* routes require @jwt_required** — no unauthenticated read endpoints that return org data
2. **All write endpoints require @role_required or @permission_required** — no unguarded mutations
3. **All DB queries scoped by org_id from g.jwt_user.org_id** — never from request.json
4. **No raw exception messages to client** — return {"success": false, "error": "user-friendly message"}; log the full exception server-side
5. **No secrets in logs** — API keys, tokens, credentials must be redacted before logging
6. **No direct LLM imports** — import openai / anthropic / google.generativeai outside apps/ai_providers/adapters/ is a hard CI failure
7. **Audit record on every create/update/delete/security action** — call record_activity() or the platform AuditLog service
8. **No org_id from request body** — derive tenant scope from authenticated session only
9. **Input validation on all endpoints** — validate type, length, enum values; reject invalid input with 400 before DB access
10. **No hardcoded credentials** — all secrets via SSM → K8s Secret → env var
11. **RBAC on every module-level setting endpoint** — org admins cannot grant system-admin permissions
12. **Multi-tenant isolation test required** — every new module must have a test asserting cross-org data leakage is impossible

---

## 13. Multi-Tenant Baseline

Every module must enforce these rules to prevent cross-tenant data exposure:

1. Every DB model with org data has `org_id` as a non-nullable indexed column
2. Every query on a multi-tenant model includes `WHERE org_id = g.jwt_user.org_id`
3. URL path parameters (`/api/users/42`) validated against authenticated user's org — never rely on the path parameter alone to scope access
4. Celery tasks include `org_id` in their payload and enforce org scope within the task
5. Export/import pipelines include org_id in every exported row and validate on import
6. Module settings stored with org_id — never global defaults that bleed across orgs
7. AI context built per org — never share AI conversation state, prompt context, or retrieved documents across org boundaries
8. Feature flags evaluated per org — flag enabled for org A does not enable it for org B
9. Audit logs scoped per org — org admins see only their org's audit trail
10. Notifications scoped per org — no cross-org notification delivery

---

## 14. Testing Baseline

Every round is not complete until:

1. **Module unit tests pass:** `pytest apps/<module>/tests/ -v` exits 0
2. **No direct LLM import violations:** `python scripts/check_no_direct_llm_imports.py` exits 0
3. **TypeScript typecheck passes:** `npx tsc --noEmit` exits 0
4. **Cross-tenant isolation test:** at least one pytest test asserts that a query for org A does not return data for org B
5. **RBAC test:** at least one pytest test asserts that a route requires a specific permission and returns 403 without it
6. **Regression gate:** `bash scripts/test_steps/00_regression.sh` exits PASSED before any PR merge
7. **New shared capability has tests:** any new component in `components/shared/` or `lib/platform/` has a test or Storybook story

---

## 15. Review/CI Baseline

Required before merging any PR:

1. `check_no_direct_llm_imports.py` passes (no direct LLM imports outside adapters/)
2. `pytest apps/` runs without error on changed modules
3. `npx tsc --noEmit` passes
4. No new `request.json.get("org_id")` patterns (ESLint/grep rule)
5. All new API routes documented with HTTP method, auth requirement, and tenant scope in docstring
6. No new raw `str(exc)` in error responses (grep rule)
7. ADR added for any component boundary change, DB schema change, or new external dependency

---

## 16. Recommended Next 10 Rounds

| # | Round ID | Title | Size | Gate | Blocked By |
|---|----------|-------|------|------|-----------|
| 1 | R040 | R038B — Module Manager additive schema migrations | Medium | OQ-01–OQ-07 answered (done), FK targets confirmed, acceptance criteria in doc 46; **storage constraint: `platform_managed_shared_db` only, no BYODB, additive migrations only, all tables org_id-scoped, no hardcoded connection strings** | Nothing — UNBLOCKED |
| 2 | R041 | CI enforcement + ActionButton + shared UI gates | Small | CI gate added to CD workflow; ActionButton extracted; DetailView fully extracted | R040 preferred first but R041 is independent |
| 3 | R042 | R038C — ModuleRegistry sync + CompatLayer | Medium | ModuleRegistry.sync_from_manifests() + ModuleCompatLayer + module_key identity migration | R040 (OrgModule tables must exist) |
| 4 | R043 | AI Service Routing Matrix backend | Medium | AIServiceDefinition + AIServiceProviderRoute tables + 9-step resolver + 27-service seed | R040 (tables need org_id scoping via OrgModule) |
| 5 | R044 | R038D — Navigation API + JWT route audit | Medium | GET /api/org/modules/navigation + sidebar wired + /api/modules/enabled-menu @jwt_required fix | R042 (ModuleCompatLayer must exist) |
| 6 | R045 | Feature Flags + Settings Engine + Billing quota scaffold | Medium | Generic OrgFeatureFlag service + Settings Engine + quota enforcement hooks | R040 (OrgModule must exist for feature flag scoping) |
| 7 | R046 | AuditLog + Notifications foundation | Medium | Platform AuditLog service + Notification service backed by platform_outbox | R045 (Settings Engine needed for notification preferences) |
| 8 | R047 | API Keys + Secrets Manager backend | Medium | API key model + rotation + SSM-backed connector secrets interface | R040, R046 (audit required on key operations) |
| 9 | R048 | P0 LLM direct import cleanup | Large | All 55+ direct LLM imports migrated to AIProviderGateway; CI gate passes | R043 (routing matrix must be available for migration targets) |
| 10 | R049 | Data Sources Hub backend foundation | Large | DataConnection + DataSource + SourceAccessPolicy + connector secrets + AI retrieval policy | R047 (Secrets Manager), R046 (audit), R040 (org scope) |

---

## 17. Anti-Overengineering Rules

1. **Do not build a platform capability until 2 confirmed module consumers exist.** A capability with one consumer is a module-local component. Promote only when genuinely shared.
2. **Do not introduce microservices until a Flask module hits measurable scale limits.** The current monolith on EKS is the right architecture for this scale. Premature service extraction creates deployment complexity and distributed system failure modes without benefit.
3. **Do not create a new database until the existing schema is clean.** Before adding a new database (search, graph, vector store), verify the existing PostgreSQL + rag-db cannot serve the use case. Each new database is operational overhead.
4. **Do not add a new external dependency without explicit approval.** Every new Python package is a supply chain risk, a version conflict candidate, and a licensing concern. Prefer stdlib and existing dependencies.
5. **Do not abstract before the second consumer.** One usage does not warrant a generic framework. Write the concrete implementation first; abstract when duplication appears.
6. **Do not build the UI before the API contract is tested.** Every new frontend route should be preceded by a working Flask API route with at least one integration test.
7. **Do not implement the full marketplace before the first paid module exists.** The marketplace is built for the need, not ahead of it.
8. **Do not auto-generate migrations.** Every migration script is written by hand, reviewed for backward compatibility, and tested against a copy of production data before merging.
9. **Do not build observability for things that don't exist yet.** Add metrics and tracing when a component exists and is deployed. Pre-emptive observability on hypothetical components is noise.
10. **Do not build AI features on top of an ungoverned AI layer.** No new AI-powered module feature is built while there are active LLM direct import violations (R048 is a hard prerequisite for new AI features).

---

## 18. Acceptance Criteria Before Broad Module Development

Module development is "ready" only when all items below are checked. This gate prevents building features on a broken foundation.

**Schema & storage (R040 gates):**
- [ ] All R040 migrations are additive — no DROP COLUMN, no DROP TABLE, no data-losing ALTER
- [ ] All new org-scoped tables include `org_id FK → organizations.id` (non-nullable)
- [ ] No new hardcoded DB connection strings in any module code
- [ ] No TenantDataStore, TenantDataRouter, or BYODB code introduced
- [ ] All new model queries scope by `org_id` (future-router-compatible)
- [ ] Any schema decision that would complicate future TenantDataStore routing is documented in doc 45 §21 R038B section

**Module platform (R040–R042 gates):**
- [ ] OrgModule table exists with org_id FK, status enum, and is populated by sync_from_manifests()
- [ ] ModuleCompatLayer exists and all existing is_enabled/is_installed callers pass through it
- [ ] ModuleVersion table exists and module versions are tracked

**Navigation & features (R044–R045 gates):**
- [ ] Navigation API returns org-specific nav items based on OrgModule state
- [ ] Sidebar in platform-ui calls Navigation API (not hardcoded items)
- [ ] Feature Flags Engine returns correct flag values per org_id from the database
- [ ] Settings Engine allows reading/writing org and user settings generically

**Audit & infrastructure (R046–R048 gates):**
- [ ] AuditLog service receives record_activity() calls from all write endpoints
- [ ] Notification service can send in-app notifications backed by platform_outbox
- [ ] API Keys model exists with rotation and audit
- [ ] check_no_direct_llm_imports.py runs in CI and fails on violation

**Quality gates:**
- [ ] TypeScript typecheck exits 0
- [ ] Cross-tenant isolation test passes for at least 3 modules
- [ ] No new request.json.get("org_id") patterns in any route
- [ ] 00_regression.sh passes with "REGRESSION PASSED — Failed: 0"

---

## 19. ADRs Added This Round

### ADR-033: Generic Platform Foundation First

- **Context:** Multiple feature modules were being built independently (helpdesk, ALA, ops_intelligence, AI agents) without the generic platform infrastructure that all modules depend on. This resulted in duplicated patterns for settings, notifications, audit, and AI access that will require rework.
- **Decision:** Before building additional feature modules beyond the current set, complete the generic foundation capabilities that all modules depend on: OrgModule, Settings Engine, AuditLog service, Notification service, API Keys, Feature Flags, Navigation API, and LLM import cleanup.
- **Alternatives:** Build features first, refactor shared patterns later. Rejected because rework cost grows with each additional module that embeds ad-hoc patterns.
- **Consequences:** Slower short-term feature velocity (R040–R048). Significantly lower long-term technical debt. Safe multi-tenant expansion with correct isolation from day one.
- **Affected modules:** all

---

### ADR-034: AI-Native Generic Organization Platform

- **Context:** The platform was evolving as a helpdesk product with AI features added on top. This framing limited architectural decisions and caused vertical-specific assumptions to creep into the platform core.
- **Decision:** The system is positioned as an AI-native generic organization platform. Core development prioritizes generic platform capabilities, modular marketplace architecture, secure AI operation, tenant-aware data management, and cross-platform experience before vertical expansion. The helpdesk is one module, not the product.
- **Alternatives:** Remain a single-purpose helpdesk product. Rejected because the existing codebase already has 10+ distinct module domains that are not helpdesk-specific.
- **Consequences:** Broader addressable market. More complex initial scope. Forces generic architecture for all new modules. Requires clearing the generic foundation gates (ADR-033) before accelerating vertical feature work.
- **Affected modules:** all

---

### ADR-035: Data Sources & Knowledge Connections Platform

- **Context:** ops_intelligence owned all connector logic for Google Workspace, Jira, and GitHub. There was no generic system for organizations to connect, govern, and use their own data sources through AI. Each new AI-powered module would need to re-implement connector management.
- **Decision:** Organization data and tool connections are managed through a generic Data Sources & Knowledge Connections Platform. MCP servers, databases, external SaaS, file repositories, logs, and APIs are registered as governed, tenant-scoped connections and sources with access policies, sync/indexing, audit, and AI retrieval controls. ops_intelligence becomes a consumer and reference implementation of this platform, not the owner of connector logic.
- **Alternatives:** Embed connector logic per-module. Rejected because it creates 10 separate connector security models, 10 secret storage patterns, and 10 AI access control implementations.
- **Consequences:** More upfront schema design (R049). All AI-powered modules benefit from a single, audited, permission-controlled access layer. AI assistants can safely use any org data source. ops_intelligence connector migration required.
- **Affected modules:** ops_intelligence, ai_providers, module_manager, all new AI-powered modules

---

## 21. Data Ownership, Artifacts & Tenant Storage Strategy

> Added: R039 addendum, 2026-04-25. Supersedes any informal assumptions about data placement.

### 21.1 Existing DB First, Additive Migration

**Principle:** The existing `platformengineer` PostgreSQL database is the migration base. All platform evolution uses additive migrations on top of the existing schema.

**Rules:**
- Add new tables/columns side-by-side; never drop old fields in the same round they are replaced
- Introduce compatibility layers before removing any field that has callers
- Destructive migrations (DROP COLUMN, DROP TABLE) require: explicit gate approval, regression tests passing, verified backup, documented rollback plan, 30-day minimum gap after replacement goes live
- Old Jinja2 session routes may coexist temporarily while JWT APIs replace them — this is intentional, not technical debt
- Every migration must be tenant-safe: new columns are nullable or have defaults; new tables include `org_id` from day one
- Migration runner: `python scripts/migrations/run_migration.py <revision_id>` (custom Alembic runner in `scripts/migrations/versions/`)
- Never use `alembic` CLI directly
- Migration file naming: `YYYYMMDD_description.py`

### 21.2 Platform Data & Artifact Registry

**Purpose:** Central registry of all data and artifacts owned or used by each module. Every module must declare its ownership before install, upgrade, or export/import can safely operate.

**Registry serves:**
- Module installation: create owned tables/indexes/S3 prefixes
- Module upgrade: run migration handlers, update schema version
- Module removal: run cleanup handlers, preserve retained data
- Export/import: enumerate owned tables and files
- Backup/restore: include/exclude based on contract
- Tenant data routing: know where each module's data lives
- AI data access policy: restrict AI to declared, governed sources
- Compliance/audit: data classification and retention policy per module

**Every module must declare in its manifest:**

#### DB Ownership
- `owned` tables (module is responsible for schema)
- `referenced` tables (module reads, does not own schema)
- `core` tables (platform core — module only reads, never writes except via platform APIs)
- Migration scripts (Alembic files under `scripts/migrations/versions/`)
- Seed scripts
- Schema version
- Data classification (public / internal / confidential / restricted / pii)
- Retention policy (days; pii handling)

#### Object/File Ownership
- S3 bucket or prefix (e.g. `org/{org_id}/helpdesk/attachments/`)
- Media collections
- Document collections
- Attachment storage
- Package storage
- Export package storage

#### Derived Data
- Search indexes
- Vector indexes / embeddings
- Cache key namespaces
- Generated reports
- AI memory stores

#### Sensitive Resources
- Secret references (SSM paths, never values)
- API key references
- OAuth token storage keys
- Connection string references
- Encryption key references

#### Operation Handlers
- Import handler (function path)
- Export handler (function path)
- Backup handler (function path)
- Restore handler (function path)
- Upgrade handler (function path)
- Rollback handler (function path)
- Cleanup handler (function path)

**Enforcement (later CI phase):**
- Modules cannot own data silently — undeclared table/file/index ownership fails CI review in a later round
- Export/import reads contracts to enumerate scope
- Module install/upgrade uses contracts to create/migrate resources
- AI access policy reads contracts to gate data access
- Backup/restore uses contracts to determine inclusion and restore order

### 21.3 Manifest dataContract Extension

All module `manifest.v2.json` files must include a `dataContract` section. Modules without `dataContract` will be treated as legacy and flagged for audit.

**Full example:**
```json
{
  "dataContract": {
    "tables": {
      "owned": ["helpdesk_tickets", "helpdesk_comments", "helpdesk_sessions"],
      "referenced": ["users", "organizations", "roles"],
      "core": ["permissions", "feature_flags"]
    },
    "objectStorage": {
      "s3Prefixes": ["org/{org_id}/helpdesk/attachments/"],
      "mediaCollections": ["helpdesk_attachments"],
      "documentCollections": [],
      "exportStorage": "org/{org_id}/exports/helpdesk/"
    },
    "indexes": {
      "search": ["helpdesk_tickets_search"],
      "vector": ["helpdesk_ticket_embeddings"]
    },
    "secrets": {
      "refs": ["helpdesk.integration.api_key"]
    },
    "retention": {
      "defaultDays": 365,
      "pii": "restricted",
      "anonymizationSupported": true
    },
    "importExport": {
      "exportable": true,
      "importable": true,
      "requiresDryRun": true,
      "supportsAnonymization": true,
      "exportFormat": "jsonl"
    },
    "backupRestore": {
      "includedInOrgBackup": true,
      "restoreOrder": 50
    },
    "upgrade": {
      "migrationHandlers": ["apps.helpdesk.migrations.v2_upgrade"],
      "rollbackHandlers": ["apps.helpdesk.migrations.v2_rollback"],
      "requiresBackupBeforeUpgrade": true
    }
  }
}
```

**Fields spec:**

| Field | Required | Notes |
|-------|----------|-------|
| `tables.owned` | yes | Tables the module is responsible for creating/migrating |
| `tables.referenced` | yes | Tables the module reads but does not own |
| `tables.core` | no | Platform core tables consumed read-only |
| `objectStorage.s3Prefixes` | if module uses files | Use `{org_id}` placeholder |
| `retention.defaultDays` | yes | 0 = indefinite |
| `importExport.exportable` | yes | — |
| `backupRestore.includedInOrgBackup` | yes | — |
| `upgrade.requiresBackupBeforeUpgrade` | yes | — |

### 21.4 Tenant Storage Modes

The platform is architected to support multiple tenant data storage modes. The default is platform-managed shared DB. Future modes enable enterprise isolation and BYODB.

| Mode | Description | Target |
|------|-------------|--------|
| `platform_managed_shared_db` | Default. All orgs share platform DB, all tables scoped by `org_id`. | All orgs today |
| `platform_managed_dedicated_db` | Platform manages a separate DB/schema for a single tenant. Useful for enterprise isolation, compliance, or performance. | Enterprise tier |
| `customer_managed_db` | Customer provides their own DB in their own cloud/account. Platform connects using stored credentials and manages schema/data per the module data contracts. | Enterprise+ / BYODB |
| `hybrid` | Core platform identity, billing, and governance remain in platform DB; module-owned data may live in tenant DB. | Enterprise+ hybrid |

**Constraints:**
- All modes use the same API, governance, and audit layer
- Mode is set per org and per module (a module may be excluded from BYODB)
- Mode changes require migration job and admin approval
- Platform-managed shared DB remains the only tested mode until R060+

### 21.5 TenantDataStore Conceptual Model

Represents the data store configuration for a tenant org.

```
TenantDataStore
├── id
├── org_id
├── storage_mode             (see §21.4)
├── db_type                  (postgres | mysql | mssql | sqlite | external_api | object_storage_only)
├── connection_secret_ref    (SSM path — never stored plaintext)
├── host_alias               (human-readable label)
├── database_name
├── schema_name
├── region
├── cloud_provider           (aws | azure | gcp | self_hosted | platform)
├── status                   (draft | active | degraded | disabled | migration_required | error)
├── schema_version           (per-org tracked version)
├── last_health_check_at
├── created_by               (user_id)
├── created_at
└── updated_at
```

**Rules:**
- Connection string never stored plaintext — always as `connection_secret_ref` (SSM SecureString path)
- Connection secret never returned to frontend
- All connection tests are audited
- Customer DB must use TLS
- Least-privilege DB user required
- Write permissions are optional and explicitly approved per module
- Cross-org shared DB credentials forbidden (except platform-level dedicated design)
- Schema version tracked per org/data store; mismatch triggers `migration_required` status

### 21.6 TenantDataRouter Abstraction

A routing abstraction layer responsible for resolving where an org/module's data lives and returning a scoped database session.

**Responsibilities:**
- Resolve which `TenantDataStore` handles `(org_id, module_key)` pair
- Return correct SQLAlchemy bind / connection / session
- Apply tenant scoping (ensure `org_id` filter is present on all queries)
- Enforce module data contracts (block access to tables not declared in `dataContract`)
- Support both platform DB and BYODB transparently to module code
- Log and audit connection health and migration activity

**Rules:**
- Module code must NOT open arbitrary DB connections
- Module code asks for a module-scoped data session from the router
- Direct DB connection strings in module code are forbidden
- AI never connects directly to a tenant DB
- All AI queries go through governed data/query services (Data Sources Hub)
- Cross-module data access requires explicit platform API, not direct DB join

**Implementation note:** TenantDataRouter is a P3 feature. For now (P0/P1 phases), platform-managed shared DB is assumed; the router is a future abstraction boundary. Module code should write DB queries in a way that is compatible with a future router (i.e., always scope by `org_id`, never hardcode connection strings).

### 21.7 S3 / Object Storage Strategy

All file and media paths must be declared in module data contracts. No module writes random S3 paths.

**ObjectStorageResource conceptual model:**

```
ObjectStorageResource
├── id
├── org_id (nullable — platform-level resources have no org_id)
├── module_key
├── resource_type            (media | attachment | document | export_package | import_package |
│                             module_package | backup | generated_report | embedding_artifact)
├── bucket
├── prefix                   (may include {org_id} placeholder)
├── storage_class            (standard | ia | glacier | etc.)
├── encryption_mode          (sse_s3 | sse_kms | client_side)
├── retention_policy         (days or "indefinite")
├── lifecycle_policy         (S3 lifecycle rule reference)
├── created_at
└── updated_at
```

**Rules:**
- Every module file/media path declared in `manifest.v2.json dataContract.objectStorage`
- Module package files live in controlled package storage (`module_packages/`)
- Org media lives in org-scoped prefixes (`org/{org_id}/`)
- Export/import packages: checksums required, signed manifests required
- Backups: lifecycle policies required (no indefinite storage without explicit policy)
- Deletion: requires cleanup handlers and audit event
- No module writes random S3 paths at runtime

**Planned S3 bucket structure:**
```
platform-data/
  org/{org_id}/
    {module_key}/
      media/
      attachments/
      documents/
      exports/
      indexes/
  packages/
    {module_key}/
      {version}/
  backups/
    org/{org_id}/
      {timestamp}/
  artifacts/
    embeddings/
      org/{org_id}/
```

### 21.8 Export / Import / Install / Upgrade Integration

The Data & Artifact Registry drives all lifecycle operations.

#### Export Flow
1. Read `dataContract.tables.owned` — stream each table as JSONL/Parquet (scoped to `org_id`)
2. Read `dataContract.objectStorage.s3Prefixes` — enumerate and stream files
3. Include manifest (module version, schema version, export timestamp)
4. Include schema snapshot (column names/types)
5. Include checksums (SHA-256 per file and table dump)
6. Include ID mapping file (for import remapping)
7. Sign package (HMAC or asymmetric signature)

#### Import Flow
1. Validate package signature and checksums
2. Dry-run: validate schema compatibility against target module version
3. Validate `TenantStorageMode` compatibility
4. Remap IDs (primary keys, FK references) using mapping file
5. Restore files to org-scoped S3 prefixes
6. Run DB import in transaction; rollback on error if supported
7. Record audit event with row counts and error summary

#### Module Install
1. Read `dataContract` from manifest
2. Create owned tables/indexes in correct `TenantDataStore`
3. Create S3 prefixes (if applicable)
4. Seed permissions and settings declared in manifest
5. Register module data ownership in Platform Data & Artifact Registry
6. Record install audit event

#### Module Upgrade
1. Dry-run migration against schema snapshot
2. Backup org data if `upgrade.requiresBackupBeforeUpgrade = true`
3. Run `upgrade.migrationHandlers` in declared order
4. Update `schema_version` only after all handlers succeed
5. Run rollback handlers if any handler fails
6. Record upgrade audit event (success or failure with safe error message)

#### Module Uninstall
1. Disable module first (soft state)
2. Export org data if required by org admin (honor `importExport.exportable`)
3. Run `cleanup.handlers` to delete owned S3 files and indexes
4. Preserve retained data per `retention` policy (do not delete PII-classified data without explicit confirmation)
5. Record uninstall audit event

### 21.9 BYODB Safety Rules

Customer-managed DB is an enterprise-only feature with strict safety requirements.

**Access rules:**
- Enterprise tier only — requires system-admin + org-admin approval
- Connection test required before activation (results audited)
- TLS required (plaintext connections rejected at connection layer)
- Least-privilege DB user required (documented minimum permissions per DB type)
- Schema dry-run required before any migration runs against customer DB
- No destructive schema changes without approval flow
- Backup/export required before upgrade migrations

**Query safety:**
- Query timeouts mandatory (configurable, default 30s)
- Row limits mandatory (configurable, default 10,000 for AI queries)
- No arbitrary SQL execution by AI (governed query builder or allowlisted queries only)
- No full table dump to LLM (scoped retrieval only)
- All queries audited (table, filter, row count, execution time)
- Data classification required for all indexed columns (PII handling enforced)

**Operational rules:**
- Customer DB health monitored (connection check every 5 minutes)
- Fallback behavior defined per module if customer DB is unavailable
- SLA and responsibility boundaries documented in org contract
- Platform never modifies tables not declared in active module data contracts

### 21.10 Relationship Between TenantDataStore and Data Sources Hub

These are two distinct but related systems:

| Concern | TenantDataStore / Data Artifact Registry | Data Sources Hub |
|---------|------------------------------------------|-----------------|
| **What it is** | Where platform-managed, module-owned org data lives | External knowledge/tool sources connected to the platform |
| **Who manages it** | Platform (or customer in BYODB mode) | Organization admin connects external services |
| **Examples** | helpdesk_tickets table, org media files, module indexes | Google Drive folder, Jira project, GitHub repo, MCP server |
| **AI access** | AI queries only through governed data/query services | AI accesses via SourceAccessPolicy + governed retrieval |
| **Secrets** | Connection string in SSM (if BYODB) | OAuth tokens / API keys in SSM |
| **Audit** | Migration events, schema version changes, health checks | Sync jobs, tool executions, retrieval events |
| **BYODB overlap** | Customer DB can also register as a DataSource for AI querying | Only through SourceAccessPolicy — governed, row-limited, classification-checked |

**Rule:** The same customer-provided database can appear as both a `TenantDataStore` (for platform module data) and as a `DataSource` in the Data Sources Hub (for AI retrieval) — but the two access paths are independent, separately audited, and separately governed.

---

### ADR-036: Existing DB First, Data Artifact Registry, and Tenant Storage Modes

- **Context:** Multiple platform modules were beginning to own data without declaring it. There was no central registry of what data each module owns. The database evolution strategy was informal. Enterprise organizations would eventually require dedicated or customer-managed data stores.
- **Decision:** (1) The existing `platformengineer` DB is the migration base — all changes are additive. (2) Every module must declare DB tables, object storage, indexes, secrets, and lifecycle handlers in a `dataContract` manifest section. (3) The platform supports `platform_managed_shared_db` (default), `platform_managed_dedicated_db`, `customer_managed_db`, and `hybrid` tenant storage modes. (4) A `TenantDataRouter` abstraction provides a future boundary for multi-DB routing without requiring module code changes.
- **Alternatives:** Informal data placement (rejected — creates import/export, backup, and multi-tenancy failures); Big-bang DB rewrite (rejected — violates existing DB-first principle); BYODB now (rejected — P3 feature, premature complexity).
- **Consequences:** Module development is slightly more formal (manifest dataContract required). Foundation phases gain clear data ownership for export/import/backup. BYODB is possible in the future without breaking existing module code.
- **Affected modules:** all modules with DB tables; module_manager; data platform; backup/export infrastructure

---

## 20. Revision History

| Version | Date | Author | Notes |
|---------|------|--------|-------|
| v1.0 | 2026-04-25 | R039 | Initial creation — full platform roadmap |
| v1.1 | 2026-04-25 | R039 addendum | Added §21: Data Ownership, Artifacts & Tenant Storage Strategy; ADR-036 |
