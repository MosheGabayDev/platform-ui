# 02 — Product Needs Inferred from Code

_Last updated: 2026-04-23_

---

## Apparent Users

| User Type | Evidence |
|-----------|----------|
| **System Admin** | `is_system_admin` flag, system-wide config, org management |
| **Org Admin** | `is_admin` per org, org settings, user management within org |
| **IT Technician** | `TechnicianProfile`, `interface_mode='technician'`, session routing |
| **End User (requester)** | `interface_mode='end_user'`, voice/chat channels, ticket creation |
| **AI Agent** | `users.is_ai_agent`, agent-initiated sessions |

Target customers (inferred from marketing artifacts): **MSPs** (Managed Service Providers) — companies that manage IT infrastructure for multiple client organizations.

---

## Primary Workflows

### 1. AI Helpdesk Investigation

A user (end_user or technician) opens a support session via voice call, chat, or API. The AI:
- Identifies the problem (triage phase)
- Runs investigation tools (SSH, API calls, K8s queries, screen analysis)
- Forms an `InvestigationDecision` with options
- Gates destructive actions via approval workflow (`PolicyRule`)
- Resolves or escalates to human technician
- Records outcome + writes to billing outbox

Evidence: `apps/helpdesk/services/` — 60+ service files; `apps/helpdesk/models.py` — 37+ tables

### 2. Voice-First AI Interaction

Mobile app user calls in → WebRTC establishes connection → Gemini Live processes audio in real-time → AI speaks back → session recorded + billed.

Evidence: `realtime-voice-go/`, `apps/mobile_voice/`, `voice-edge/`

### 3. Autonomous IT Remediation

AI agent detects a known pattern (via `SelfHealingPattern` table), autonomously executes remediation without human approval (within `OrgAutonomy` limits), logs every action to `AutonomousActionLog`.

Evidence: `apps/helpdesk/services/autonomous_loop_service.py`, `OrgAutonomy` model, `SelfHealingPattern`

### 4. AI Life Assistant (ALA)

A personal assistant that:
- Manages calendar, email, reminders on behalf of the user
- Applies trust/consent model before taking actions
- Supports inbound (user → AI) and outbound (AI → execute) flows
- Has separate billing, memory, and policy subsystems

Evidence: `apps/ala/` — 30+ files, own `openapi.yaml`, own routing, multi-provider support

### 5. Knowledge Management (RAG)

Org-scoped knowledge base of articles and runbooks. Articles are auto-embedded to a dedicated RAG PostgreSQL DB (`rag-db`) for semantic retrieval during investigations.

Evidence: `apps/helpdesk/models.py` — `KBArticle`, `Runbook`; `apps/rag/`

### 6. Infrastructure Topology

Org topology graph (nodes = endpoints, servers, routers, DCs; edges = dependencies). Used to scope AI investigations and understand blast radius.

Evidence: `OrgTopologyNode`, `OrgTopologyEdge` in `helpdesk/models.py`

### 7. Multi-Tenant SaaS Management

System admins manage orgs, plans, quotas, feature flags. Each org has isolated data, AI provider config, autonomy level, and billing.

Evidence: `OrgPlan`, `OrgFeatureFlag`, `OrgAutonomy`, org_id everywhere

---

## Likely Business Goals

1. **Reduce MSP Tier-1 ticket volume** — autonomous resolution before human escalation
2. **Reduce MTTR** — AI investigation faster than manual triage
3. **Monetize per AI usage** — `AIUsageLog`, cost tracking, billing per org
4. **Sell SaaS to MSPs** — multi-tenant, per-org plans ($5/endpoint Starter, $8 Pro inferred from `project_resolveai_launch.md`)
5. **Voice as a differentiator** — AI answers the phone; competitors don't do this well
6. **Compliance/audit trail** — `TicketTimeline`, `AutonomousActionLog`, `ToolInvocation` audit

---

## What Exists

| Feature | Status |
|---------|--------|
| Helpdesk AI sessions | Production |
| Approval workflow | Production |
| Voice AI (Gemini) | Production |
| Multi-provider AI | Production |
| RAG knowledge base | Production |
| Autonomous remediation | Production |
| Mobile app | Production (Android APK) |
| Billing/Stripe | Partial (integration exists, full flow unclear) |
| SaaS onboarding | Partial (setup wizard exists) |
| ALA (life assistant) | Active development |
| Observability stack | Partial (Prometheus metrics, no central logging) |

---

## What is Missing or Underdeveloped

| Gap | Evidence | Impact |
|----|----------|--------|
| **API contract** | No OpenAPI spec except ALA; frontend must guess endpoint shapes | High — blocks platform-ui development |
| **Web admin UI** | Jinja2 admin templates; no modern management console | High — friction for system admins |
| **Real-time UI updates** | No WebSocket/SSE in frontend; polling only | High — live investigation status not visible |
| **iOS app** | Android only; iOS build not present | Medium |
| **Desktop app** | No Electron or Tauri equivalent | Low-medium |
| **Role-based UI routing** | Backend RBAC exists; frontend doesn't enforce role-based page access yet | Medium |
| **Onboarding flow** | `setup_wizard` module exists but UX unclear | Medium |
| **Stripe billing UI** | `stripe_integration.py` exists; no self-service billing portal observed | Medium |
| **Observability UI** | Prometheus metrics exist; no Grafana/dashboard exposed to admins | Low-medium |
| **Accessibility (a11y)** | Not evidenced anywhere in codebase | Medium — required for enterprise |
