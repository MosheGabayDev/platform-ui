# platform-ui — Project Documentation Index

**Generated:** 2026-05-01 by BMAD `bmad-document-project` (Deep Scan, brownfield).
**Primary entry point** for AI-assisted development per BMAD method.

## Project Overview

- **Type:** monolith — single Next.js web app
- **Primary Language:** TypeScript 5
- **Architecture:** Component-based, App Router, proxy-mediated Flask integration
- **Project level:** 4 (enterprise expansion — full platform with 10 pillars, 12 P0 gates, 30+ capabilities)

## Quick Reference

- **Tech stack:** Next.js 16, React 19, TanStack Query 5, Tailwind 4, Radix/shadcn, Framer Motion 12, Zustand 5, next-auth, next-intl, RHF + Zod, Recharts, Playwright
- **Entry point:** `app/layout.tsx` (root) + `app/(dashboard)/layout.tsx` (authenticated shell)
- **Proxy:** `app/api/proxy/[...path]/route.ts` — single Flask channel
- **Architecture pattern:** Layered (shell → page → module → shared → lib) + server-state-first

## BMAD-Generated Documentation (this directory)

- [Project Overview](./project-overview.md)
- [Architecture](./architecture.md)
- [Source Tree Analysis](./source-tree-analysis.md)
- [Component Inventory](./component-inventory.md)
- [Development Guide](./development-guide.md)
- [API Contracts](./api-contracts.md)
- [Deployment Guide](./deployment-guide.md)

## Pre-existing Authoritative Documentation

The platform plan and rules pre-date BMAD adoption and remain authoritative. BMAD-generated docs above are summaries pointing into these:

### Plan + governance

- [`CLAUDE.md`](../../CLAUDE.md) — AI agent project rules (NEVER BREAK)
- [Master Roadmap (SSOT plan)](../system-upgrade/03-roadmap/master-roadmap.md)
- [Control Center (active round + blockers)](../system-upgrade/00-control-center.md)
- [Source of Truth Registry](../system-upgrade/97-source-of-truth.md)
- [Atomic Tasks per Round](../system-upgrade/10-tasks/)

### Rules (non-negotiable)

- [Development Rules](../system-upgrade/02-rules/development-rules.md)
- [Shared Services Contract (ADR-028)](../system-upgrade/02-rules/shared-services.md)
- [Testing + Evidence Standard](../system-upgrade/02-rules/testing-standard.md)
- [Per-module Legacy Inventory Template](../system-upgrade/02-rules/legacy-inventory.md)
- [Per-module E2E Coverage Template](../system-upgrade/02-rules/e2e-coverage.md)

### Foundations

- [Architecture Blueprint](../ARCHITECTURE.md) — full Next.js arch detail
- [Target Architecture](../system-upgrade/01-foundations/10-architecture-target.md) — full-stack target
- [Tech Inventory](../system-upgrade/01-foundations/04-tech-inventory.md)
- [Security Assessment](../system-upgrade/01-foundations/07-security.md)
- [Tech Debt Register](../system-upgrade/01-foundations/09-tech-debt.md)

### Capabilities

- [Capability Catalog](../system-upgrade/04-capabilities/catalog.md)
- [Module System](../system-upgrade/04-capabilities/module-system.md)
- [Module Manager Redesign](../system-upgrade/04-capabilities/module-manager-redesign.md)
- [Runtime Deployment](../system-upgrade/04-capabilities/runtime-deployment.md)
- [OSS Capability Layer](../system-upgrade/04-capabilities/oss-layer.md)
- [Auth Bridge Design](../system-upgrade/04-capabilities/auth-bridge.md)

### AI specs

- [AI Action Platform](../system-upgrade/05-ai/action-platform.md)
- [AI Canonical Terms](../system-upgrade/05-ai/canonical-terms.md)
- [Floating AI Assistant](../system-upgrade/05-ai/floating-assistant.md)
- [AI Assistant Runtime](../system-upgrade/05-ai/assistant-runtime.md)
- [AI Capability KB](../system-upgrade/05-ai/capability-kb.md)
- [AI Provider Gateway](../system-upgrade/05-ai/provider-gateway.md)
- [AI Providers Hub](../system-upgrade/05-ai/providers-hub.md)
- [Direct LLM Migration](../system-upgrade/05-ai/llm-migration.md)

### Design

- [Design System](../design/DESIGN_SYSTEM.md)
- [Tokens](../design/TOKENS.md)
- [Animations](../design/ANIMATIONS.md)
- [Components](../design/COMPONENTS.md)
- [Mobile + PWA](../design/MOBILE.md)

### History + decisions

- [Decision Log](../system-upgrade/08-decisions/decision-log.md) — ADRs
- [Open Questions](../system-upgrade/08-decisions/open-questions.md)
- [Rounds Index](../system-upgrade/09-history/rounds-index.md)
- [Change Log](../system-upgrade/09-history/change-log.md)
- [Risk Register](../system-upgrade/09-history/risk-register.md)

## Getting Started

1. Read [`CLAUDE.md`](../../CLAUDE.md) — confirm hard rules + workflow.
2. Read [`docs/system-upgrade/00-control-center.md`](../system-upgrade/00-control-center.md) — see active round + blockers.
3. Read [`docs/system-upgrade/03-roadmap/master-roadmap.md`](../system-upgrade/03-roadmap/master-roadmap.md) — orient on the plan.
4. Pick a task from `docs/system-upgrade/10-tasks/<round>/tasks/T*.md`.
5. Follow the per-task workflow in [Development Guide](./development-guide.md).

## BMAD Pipeline Status

Per `planning-artifacts/workflow-status.yaml`:

- [x] **Phase 1 — Analysis:** product-brief + research → pre-existing
- [x] **Phase 2 — Planning:** PRD + tech-spec + UX → pre-existing
- [x] **Phase 3 — Solutioning:** architecture + epics-stories → architecture pre-existing; epics in `10-tasks/`
- [ ] **Phase 4 — Implementation:** sprint-planning + dev-story (next BMAD steps: review → readiness → epics+stories → dev-story)

**Next BMAD step:** `bmad-review-adversarial-general` on the master roadmap.

---

_BMAD adopted as the review + implementation framework on top of the pre-existing comprehensive plan (2026-05-01). Both layers are authoritative — BMAD docs in this directory are summaries; pre-existing docs in `docs/system-upgrade/` are the canonical source._
