# 00 — Executive Summary

_Last updated: 2026-04-23 | Based on: platformengineer codebase investigation_

---

## What This System Is

**ResolveAI** — an AI-powered IT helpdesk SaaS platform targeting Managed Service Providers (MSPs).

The system enables IT organizations to run autonomous AI investigations, manage IT tickets, handle multi-channel support (voice, chat, web), integrate with customer infrastructure via SSH/API, and operate self-healing playbooks — all within a multi-tenant, per-org isolated architecture.

The product is production-deployed on AWS EKS and is actively used. It is not a prototype.

---

## What It Solves

- Helpdesk automation: AI agent replaces or augments Tier-1 technicians
- Voice-first IT support: mobile app + Gemini Live API handles real-time voice investigation
- Autonomous remediation: agents SSH into servers, query APIs, run playbooks autonomously
- Multi-tenant SaaS: org-isolated data, per-org AI provider config, per-org feature flags
- Approval workflows: human-in-the-loop safety gates before destructive actions

---

## Maturity Level

**Production-grade backend, pre-production frontend.**

| Layer | Maturity |
|-------|----------|
| Backend domain logic | High — deep, production-tested, complex |
| Database model | High — 37+ tables, multi-tenant, partitioned |
| Backend API surface | Medium — Flask routes, some REST, no formal API contract |
| Voice pipeline | High — deployed, EKS + STUNner + Gemini Live |
| Mobile app | Medium — React Native, functional but constrained |
| Frontend (Jinja2) | Low — server-rendered, inconsistent, not redesign-ready |
| Frontend (platform-ui) | Early — scaffold only, not connected to real data |
| Documentation | Medium — CLAUDE.md + INDEX.md pattern, not complete |
| Testing | Low-medium — tests exist but coverage inconsistent |
| Security posture | Medium — RBAC, multi-tenant, some audit, gaps exist |

---

## The Modernization Need

The backend has outgrown its UI. The existing Jinja2 templating layer (in `templates/`) is:
- Fragmented across 20+ template directories
- Inconsistent in design and interaction patterns
- Not RTL-first despite Hebrew-primary user base
- Not mobile-first
- Not capable of reflecting the backend's actual sophistication

**`platform-ui` is the right move.** A dedicated Next.js frontend decouples UI iteration from backend stability, enables proper design-system-driven development, and prepares for multi-platform delivery.

---

## Foundation Verdict

The backend **is a solid foundation** — not trivially, but genuinely. It has:
- Correct multi-tenancy enforcement throughout
- Non-trivial domain modeling (37+ tables, approval workflows, circuit breakers)
- Proper outbox pattern for event propagation
- Real circuit breaker and degraded-mode logic
- Structured AI provider abstraction across OpenAI, Anthropic, Gemini, Ollama

The backend does **not** need a rewrite. It needs:
1. A formal API contract layer (REST or tRPC-style)
2. An official separation between frontend and backend
3. Systematic security hardening (see `06-security-assessment.md`)
4. Observability improvements
5. Test coverage expansion

---

## Recommended Direction

**Evolutionary modernization, not revolution.**

1. Build `platform-ui` as the primary frontend — Next.js 16 + React 19 (already started correctly)
2. Expose stable, versioned API endpoints from Flask (or migrate key paths to FastAPI)
3. Implement a proper authentication bridge (`next-auth` + Flask session/JWT)
4. Migrate UI feature-by-feature from Jinja2 → Next.js
5. Never dual-maintain a feature — once migrated, remove the Jinja2 template
6. Eventually extract bounded domains from the Flask monolith into separate services — but only after the frontend stabilization is complete

---

## Top 3 Risks

1. **Authentication bridge**: `platform-ui` has no real auth wired yet — login is a stub. Must be solved first.
2. **API contract vacuum**: Flask routes have no schema contract. Frontend must not depend on undocumented endpoints.
3. **RTL completeness**: Hebrew-first product needs every UI component tested RTL — missing this will cause regressions throughout the migration.
