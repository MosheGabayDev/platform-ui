# 12 — Migration Roadmap

_Last updated: 2026-04-23_

---

## Phased Execution Plan

---

## Phase 0 — Stabilization (Current → 2 weeks)

**Goal**: Make platform-ui usable with real data before migrating any features.

### Deliverables

- [ ] Real authentication: `next-auth` credentials provider → Flask login API
- [ ] Session-based role loading: expose `user.role`, `user.org_id`, `user.permissions` in next-auth session
- [ ] Next.js middleware: role-based route guards for `/` and all `(dashboard)` routes
- [ ] API proxy complete: `/api/proxy/[...path]` route handler that forwards requests with JWT/session
- [ ] Dashboard stats: connect real data (already partially done) — verify end-to-end
- [ ] Error boundary: wrap dashboard in error boundary component
- [ ] Delete 3 dead files: `api_auth_OLD_BACKUP.py`, etc.
- [ ] Playwright: 3 smoke tests (login, dashboard load, logout)

**Dependencies**: None — platform-ui + Flask both available

**Risks**: Flask session cookie → Next.js proxy auth needs care with CSRF and SameSite

---

## Phase 1 — Foundation (Weeks 3-8)

**Goal**: Establish patterns, contracts, and design system that all future features follow.

### Deliverables

- [ ] OpenAPI setup on Flask: add `flask-smorest` or `apispec` to 10 highest-priority endpoints
- [ ] TypeScript codegen: `openapi-typescript` runs in CI; generates `lib/api/generated/`
- [ ] Standard API response envelope: `{ data, error, meta }` — implement + enforce on annotated endpoints
- [ ] Storybook setup in platform-ui: document all existing components with RTL stories
- [ ] `nuqs` for URL state: replace manual searchParam logic
- [ ] Structured logging: JSON formatter on Flask; Fluent Bit → CloudWatch (or local Loki)
- [ ] Vitest setup: unit tests for `lib/api/`, `lib/hooks/`, utility functions
- [ ] `import-linter` in CI for platformengineer — document boundaries, no enforcement yet

**Dependencies**: Phase 0 complete (auth must work before building features)

**Risks**: OpenAPI annotation of existing Flask routes is tedious — prioritize by usage

---

## Phase 2 — UI Platform Rebuild (Weeks 9-20)

**Goal**: Migrate 3 complete feature domains from Jinja2 → platform-ui. For each: feature-complete, then remove Jinja2 template.

### Domain Migration Order (Recommended)

| Order | Domain | Rationale |
|-------|--------|-----------|
| 1st | **Admin / User Management** | Lowest complexity; no real-time; proves auth + RBAC works |
| 2nd | **Helpdesk Sessions + Tickets** | Core product; needs SSE for live status |
| 3rd | **AI Agents (Investigation Console)** | Most visible; complex but high value |

### Deliverables per Domain

- [ ] List view with filters, pagination (use TanStack Table)
- [ ] Detail view with appropriate state (ticket detail, session detail)
- [ ] Create/edit forms (react-hook-form + zod)
- [ ] Real-time updates where needed (SSE hook)
- [ ] RBAC-enforced: UI hides/shows based on role
- [ ] Remove corresponding Jinja2 template after parity confirmed
- [ ] i18n: move Hebrew strings to `messages/he.json`
- [ ] Playwright e2e tests for each migrated domain

**Dependencies**: Phase 1 API contract + codegen

**Risks**: 
- Jinja2 templates may have undocumented features not obvious from code
- Real-time SSE requires backend work per domain

---

## Phase 3 — Domain Migration (Weeks 21-40)

**Goal**: Migrate remaining domains to platform-ui. Complete the Jinja2 → Next.js transition.

### Remaining Domains

- [ ] ALA (Life Assistant) — migrate `ala-ui/` Vite app into platform-ui
- [ ] Knowledge Base (KB + Runbooks + RAG search)
- [ ] Voice (call history, live session status, ICE config)
- [ ] Billing (usage dashboard, plan management, Stripe portal link)
- [ ] Settings (system, org, features, notifications, integrations)
- [ ] Onboarding wizard (setup_wizard module)
- [ ] Health / Monitoring (service health, Prometheus widgets)
- [ ] Audit Log (user activity, tool invocations)

### Also in Phase 3

- [ ] FastAPI gateway: stand up `platform-api` service; migrate new features there
- [ ] SSE infrastructure: Redis pub/sub → FastAPI SSE → platform-ui for all real-time
- [ ] Module boundary enforcement: activate `import-linter` rules
- [ ] SAML fix: re-enable `python3-saml` for enterprise SSO

**Dependencies**: Phase 2 patterns + design system established

**Risks**: ALA is complex; budget more time than simpler domains

---

## Phase 4 — Hardening and Scale (Weeks 41-52)

**Goal**: Production-grade observability, security, and performance.

### Deliverables

- [ ] Observability stack: Grafana + Loki + Tempo on EKS
- [ ] OpenTelemetry: trace IDs propagated from platform-ui → FastAPI → Flask → DB
- [ ] iOS app: EAS Build + Apple provisioning configured
- [ ] PWA: service worker complete, offline capability for read-only views
- [ ] Storybook + Chromatic: visual regression on every PR
- [ ] Accessibility audit: a11y pass on all platform-ui pages (WCAG 2.1 AA target)
- [ ] Load testing: k6 or Locust against FastAPI + Flask
- [ ] Multi-region DR: document and test recovery procedure
- [ ] Stripe self-service billing portal: end-to-end
- [ ] Decommission Jinja2: remove `templates/` directory entirely

**Dependencies**: Phases 1-3 complete

---

## Migration Principles

1. **Never dual-maintain** — once a feature is in platform-ui, remove the Jinja2 equivalent immediately
2. **API contract before UI** — don't build UI for an undocumented endpoint
3. **RBAC on both sides** — backend `@role_required` + frontend route guard + hidden nav items
4. **RTL always tested** — every new page must pass manual RTL check before merge
5. **No big-bang releases** — each domain migrated independently behind feature flag if needed

---

## Milestones

| Milestone | Target | Signal |
|-----------|--------|--------|
| Phase 0 complete | +2 weeks | Can log into platform-ui with real credentials and see live dashboard |
| Phase 1 complete | +8 weeks | API types auto-generated; Storybook live; 10 endpoints documented |
| First domain migrated | +14 weeks | User management live in platform-ui; Jinja2 equivalent deleted |
| Helpdesk in platform-ui | +20 weeks | Helpdesk fully functional in Next.js with real-time status |
| All Vite apps retired | +30 weeks | `ai-agents-ui/`, `ala-ui/`, `ops-ui/`, `dyn-dt-ui/` all removed |
| Jinja2 fully retired | +52 weeks | `templates/` directory deleted; Flask serves only API |
