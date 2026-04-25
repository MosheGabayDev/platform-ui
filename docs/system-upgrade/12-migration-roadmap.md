# 12 — Migration Roadmap

_Last updated: 2026-04-26 (Code-First Schema Rule added; R040 schema adoption documented)_

## Code-First Schema Rule (mandatory for all future migrations)

> Before writing any migration, confirm the SQLAlchemy model exists. Before stamping any revision, run the schema adoption checklist. See `CLAUDE.md §Code-First Schema Rule` and `CLAUDE.md §Database`.

**Known violation (R040, 2026-04-26):** 5 tables pre-existed via `db.create_all()`. Stamped after column verification. Drift documented in `99-risk-register.md §R15`. Follow-up fix migrations pending before R042 data ingestion.

---

## Phased Execution Plan

---

## Phase 0 — Stabilization (✅ Complete — R005–R022)

**Goal**: Make platform-ui usable with real data before migrating any features.

### Deliverables

- [x] Real authentication: `next-auth` credentials provider → Flask login API (R005–R009)
- [x] Session-based role loading: `user.role`, `user.org_id`, `user.permissions` in session (R009)
- [x] Next.js middleware: role-based route guards (R006)
- [x] API proxy complete: `/api/proxy/[...path]` with JWT/session (R007–R008)
- [x] Dashboard stats: connected to real data (R008)
- [x] Error boundary: `PlatformErrorBoundary` in dashboard layout (R015)
- [x] Users module: list + detail + create/edit (R010, R017)
- [x] Organizations module: list + detail + create/edit (R013, R019)
- [x] Roles module: list + detail + create/edit (R018)
- [x] Dangerous actions: `useDangerousAction` + `ConfirmActionDialog` (R020)
- [x] Security hardening: JWT, RBAC, audit trail, PII restriction (R021–R022)
- [ ] Delete dead code: `api_auth_OLD_BACKUP.py` + other `*_OLD_*` files — still pending
- [ ] Playwright: 3 smoke tests — still pending

**Dependencies**: None — platform-ui + Flask both available

**Risks**: Flask session cookie → Next.js proxy auth needs care with CSRF and SameSite

---

## Phase 1 — Foundation (Weeks 3-8)

**Goal**: Establish patterns, contracts, and design system that all future features follow.

### Deliverables

- [ ] **Capability layer foundation**: install `nuqs`; create shared `DataTable<T>`, `EmptyState`, `StatCard`, `PermissionGate`, `usePermission()`, date utils (see `25-open-source-capability-layer.md`)
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

## Phase 3.5 — Module Data Export/Import (Weeks 30-38, parallel to Phase 3)

**Goal**: Enable governed tenant data movement — tenant migrations, environment promotions (TEST→PROD), support packages, and disaster recovery snapshots.

### Deliverables

- [ ] `ModuleDataContract` schema defined and validated for top 5 modules (helpdesk, billing, users, knowledge, agents)
- [ ] Secret column registry: platform-managed list, enforced at export build time
- [ ] `ModuleExportJob` + `ModuleImportJob` models in DB + Celery tasks for async execution
- [ ] JSONL export pipeline: query owned tables by `org_id`, write to ZIP, attach manifest + checksums
- [ ] Dry-run import validator: schema check + FK check + PII detection + conflict report
- [ ] ID remapping engine: `id-map.json` generation on export, FK rewrite on import
- [ ] User/org mapping resolver: `user-map.json` + `org-map.json` generation and resolution
- [ ] Import transaction wrapper: full DB transaction with rollback on any error
- [ ] Export/import audit trail: `ModuleImportAuditEvent` for every row action
- [ ] Anonymization mode: PII columns replaced per `anonymizationRules`
- [ ] package signature: SHA256 checksums + system-key signature
- [ ] Time-limited download links via signed S3 URLs
- [ ] platform-ui: export modal, dry-run result screen, conflict resolution, import progress, history tabs

**Dependencies**: Phase 3 domain migrations establishing owned table inventory per module

**Risks**:
- Large tenant data (helpdesk sessions > 100k rows): requires streaming JSONL writer, not in-memory
- FK dependency order bugs: wrong insert order causes constraint violations — test with circular FK scenarios
- Cross-tenant import authorization bypass: must be tested with role injection attacks

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
6. **Cleanup-first per module** — before building a platform-ui page for a module, run the dead-code sweep and create INDEX.md for that module's `apps/<module>/` directory (see `23-ai-maintainability-and-code-cleanup.md §8`)
7. **Delete Jinja2 on parity** — the day a domain reaches feature parity in platform-ui, delete the Jinja2 template in the same PR (not a follow-up); document deleted routes in the PR description
8. **File size gate** — no new file may exceed 300 lines (Python) or 200 lines (TypeScript) without a documented reason; split before merging
9. **Capability-first** — before building any UI feature in a module, check `26-platform-capabilities-catalog.md`. If the feature is a known capability (table, form, detail view, approval flow, etc.), use or extend the shared capability rather than building module-local. A module-local implementation that is duplicated across 2+ modules is a catalog promotion candidate — do not merge the duplication, extract it first.
10. **Platform boundary** — new files under `lib/` must be explicitly classified as `lib/platform/` (cross-platform) or `lib/web/` (Next.js/browser). When in doubt, write the code to be cross-platform first and add the web adapter separately. See `28-cross-platform-structure-audit.md` for rules.

---

## Milestones

| Milestone | Target | Signal |
|-----------|--------|--------|
| Phase 0 complete | +2 weeks | Can log into platform-ui with real credentials and see live dashboard |
| Phase 1 complete | +8 weeks | API types auto-generated; Storybook live; 10 endpoints documented |
| First domain migrated | +14 weeks | User management live in platform-ui; Jinja2 equivalent deleted |
| Helpdesk in platform-ui | +20 weeks | Helpdesk fully functional in Next.js with real-time status |
| All Vite apps retired | +30 weeks | `ai-agents-ui/`, `ala-ui/`, `ops-ui/`, `dyn-dt-ui/` all removed |

---

## Existing DB First — Additive Migration Principle (ADR-036, R039 addendum)

The existing `platformengineer` PostgreSQL database is the migration base. The platform does not require a fresh DB — all evolution is additive.

**Rules (summary — full spec in doc 47 §21.1):**
1. Add new tables/columns side-by-side; never drop old fields in the same migration that replaces them
2. Compatibility layers required before removing any field with callers
3. Destructive migrations: 30-day minimum gap + gate + backup + rollback plan
4. Old Jinja2 session routes may coexist while JWT APIs replace them
5. Every migration: nullable or defaulted columns, `org_id` from day one
6. Runner: `python scripts/migrations/run_migration.py <revision_id>` — never `alembic` CLI directly
7. Naming: `YYYYMMDD_description.py`

This principle extends the migration principles listed above — additive safety takes precedence over any refactoring speed goal.
| Jinja2 fully retired | +52 weeks | `templates/` directory deleted; Flask serves only API |
