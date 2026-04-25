# R040–R049 — GitHub Issue Drafts

> Interim tracking until GitHub issues are created via CLI.
> _Created: 2026-04-25 (R040-Control)_
> When creating real issues: use `.github/ISSUE_TEMPLATE/platform-round.yml`

---

## R040 — Module Manager Additive Schema Foundation

**Status:** ✅ Complete — commit `abdf3bc3`
**Repo:** platformengineer

**Goal:** Add 5 new SQLAlchemy models (ModuleVersion, OrgModule, OrgModuleSettings, ModuleDependency, ModuleLicense) plus 7 additive migrations and idempotent seeds, side-by-side with all existing Module Manager models unchanged.

**Acceptance criteria (all met):**
- [x] 5 new models exist and are importable
- [x] 7 migration files in `migrations/versions/`
- [x] All migrations are additive (no DROP, no RENAME)
- [x] Old fields/tables remain untouched
- [x] No BYODB/TenantDataStore code
- [x] All org-scoped tables have `org_id FK → organizations.id`
- [x] 43/43 structural tests pass
- [x] Seeds are idempotent or explicitly deferred

**Pending action:** Apply 7 migration files to EKS DB (see R13 in risk register).

---

## R040-Control — Implementation Governance Setup

**Status:** ✅ Complete — commit TBD
**Repo:** platformengineer + platform-ui

**Goal:** Establish governance system. Control Center, Risk Register, Issue Template, PR Template, Review Checklist, issue drafts, CLAUDE.md updates.

---

## R041 — CI Enforcement + ActionButton Extraction

**Status:** `[ ] ready to start`
**Repo:** platformengineer
**Dependencies:** R040 merged ✅

**Goal:** Prevent future LLM bypass violations from being merged. Extract ActionButton as a shared reusable component.

**Scope:**
- Wire `scripts/check_no_direct_llm_imports.py` into GitHub Actions (warning mode — non-blocking at first)
- Add CI job to `.github/workflows/` that runs the script on every PR
- Extract `ActionButton` from helpdesk module into `apps/shared/components/`
- Write tests for the CI script

**Out of scope:**
- Fixing existing 55 LLM violations (R048)
- Any new routes or DB changes
- UI changes in platform-ui

**Acceptance criteria:**
- [ ] CI job runs on every PR and reports direct LLM imports
- [ ] `scripts/check_no_direct_llm_imports.py` reports file + line for each violation
- [ ] ActionButton in shared location, original import still works (backwards compat)
- [ ] Regression gate green
- [ ] Docs updated

**Security checklist:** N/A — no routes, no DB
**Tests required:** test_check_no_direct_llm_imports.py (unit)

---

## R042 — ModuleRegistry.sync_from_manifests() + ModuleCompatLayer

**Status:** `[ ] blocked — R040 migrations must be applied to EKS DB first`
**Repo:** platformengineer
**Dependencies:** R040 migrations live in DB, R041 complete

**Goal:** Bridge old `Module.is_enabled` world with new `OrgModule` world. Modules can be resolved per-org without touching existing code.

**Scope:**
- `ModuleRegistry.sync_from_manifests()` — reads all `manifest.json` files, upserts `Module` + `ModuleVersion` rows
- `is_module_available(org_id, module_key) -> bool` helper
- `ModuleCompatLayer` — translates `Module.is_enabled` reads to `OrgModule` queries for new callers
- `ModuleEnforcementService` — checks module availability before expensive operations
- Seed `OrgModule` rows for `is_core=True` modules × all orgs (deferred in R040, now implemented)

**Out of scope:**
- ModuleDependency seed (format unverified, deferred to R038C)
- ModulePurchase backfill (deferred to R038I)
- Navigation changes (R044)
- Any platform-ui changes

**Acceptance criteria:**
- [ ] `sync_from_manifests()` runs idempotently
- [ ] `is_module_available()` returns correct value for enabled/disabled orgs
- [ ] All `is_core=True` modules have OrgModule rows for all orgs after seed
- [ ] ModuleCompatLayer passes existing module-enable tests unchanged
- [ ] Regression gate green

**Security:** org_id scoping on all new OrgModule queries
**Tests required:** test_r042_registry.py, test_r042_compat_layer.py

---

## R043 — AI Service Routing Matrix Backend

**Status:** `[ ] blocked — R040 OrgModule tables must be live`
**Repo:** platformengineer
**Dependencies:** R040 in DB, R042 CompatLayer

**Goal:** Route AI capability requests to the correct provider per org, using OrgModule state to determine which AI modules are enabled.

**Scope:**
- `AIServiceRoutingMatrix` — maps (org_id, capability, module_key) to provider config
- Integration with `AIProviderGateway` — routing uses OrgModule state
- Per-org routing config stored in `OrgModuleSettings`
- Admin endpoint to view/update routing matrix per org

**Out of scope:**
- Platform-ui routing matrix UI (future round)
- Billing changes
- Voice routing (separate flow)

**Acceptance criteria:**
- [ ] Routing resolves correctly per org based on OrgModule state
- [ ] Disabled module → request rejected with 403 (not routed to provider)
- [ ] `OrgModuleSettings` consulted for provider preference
- [ ] All existing AI calls still work (backwards compat via CompatLayer)
- [ ] Tests: unit (routing logic) + integration (gateway end-to-end)

**Security:** every routing query scopes by org_id

---

## R044 — Navigation API + JWT Route Audit

**Status:** `[ ] blocked — R042 CompatLayer`
**Repo:** platformengineer
**Dependencies:** R042

**Goal:** Replace hardcoded navigation with DB-driven nav items based on OrgModule state. Audit all JWT routes for missing auth decorators.

**Scope:**
- `GET /api/navigation` — returns nav items filtered by enabled modules for the requesting org
- JWT route audit: scan all `apps/*/routes.py` for missing `@jwt_required` on write endpoints
- Fix any missing decorators found in audit
- Remove hardcoded nav arrays from Jinja2 templates (replace with API call)

**Out of scope:**
- platform-ui nav component changes (consuming the new API is a separate UI round)
- Module marketplace UI

**Acceptance criteria:**
- [ ] `/api/navigation` returns org-specific nav items
- [ ] All write endpoints under `/api/*` have `@jwt_required` (audit complete)
- [ ] Route audit results documented
- [ ] Regression gate green

---

## R045 — Feature Flags + Settings Engine

**Status:** `[ ] blocked — R040 in DB`
**Repo:** platformengineer
**Dependencies:** R040

**Goal:** Implement a production-ready FeatureFlagService that replaces the current ad-hoc `feature_config` cache approach.

**Scope:**
- `FeatureFlagService` with per-org flag evaluation
- Cache layer (`feature_config:{org_id}`) with correct TTL
- Admin endpoint to set/get flags per org
- Migrate existing flag checks to use the service

**Out of scope:**
- Global (non-org) feature flags
- Platform-ui feature flag management UI

**Acceptance criteria:**
- [ ] Flag evaluation is consistent with existing `feature_config:{org_id}` cache key
- [ ] Cache invalidation works on flag update
- [ ] Existing flag checks migrated without behavior change
- [ ] Tests: unit + cache invalidation

---

## R046 — AuditLog + Notifications Foundation

**Status:** `[ ] blocked — R045`
**Repo:** platformengineer
**Dependencies:** R045

**Goal:** Formalize audit trail and notification dispatch. All state changes write consistent audit rows. Notification dispatch is reliable and retryable.

**Scope:**
- Standardize `record_activity()` — consistent schema, indexed, queryable
- `NotificationDispatcher` via `platform_outbox` (`domain='notification'`, `event_type='notify.send'`)
- Audit query API: `GET /api/admin/audit-log` (system-admin only)
- Backfill: identify and fix routes missing `record_activity()`

**Out of scope:**
- Notification delivery integrations (email, Slack) — those are P2
- Platform-ui audit log viewer

**Acceptance criteria:**
- [ ] All routes from R022 security audit have record_activity() calls
- [ ] Notification via outbox is idempotent (retries don't double-send)
- [ ] Audit query API returns paginated results scoped by org
- [ ] Tests: audit writing, outbox dispatch

---

## R047 — API Keys + Secrets Manager Backend

**Status:** `[ ] blocked — R040, R046`
**Repo:** platformengineer
**Dependencies:** R040, R046

**Goal:** Formal API key management — create, revoke, scope, audit. Replace manual SSM operations for org-level secrets.

**Scope:**
- `APIKey` model (org-scoped, hashed storage, scope list, expiry)
- CRUD endpoints: create/list/revoke under `/api/admin/api-keys`
- Audit: every create/revoke writes an audit row (R046 service)
- Replace `get_api_key(org_id, capability)` callers with new service where appropriate

**Out of scope:**
- Platform-ui API key management UI
- SSM integration (keep as-is for system secrets)

**Acceptance criteria:**
- [ ] API key creation returns unhashed key once only
- [ ] Key verification is constant-time (timing attack safe)
- [ ] Revoked keys rejected immediately (no cache lag)
- [ ] Audit trail for every create/revoke

---

## R048 — P0 LLM Direct Import Cleanup

**Status:** `[ ] ready to start (independent of blocked rounds)`
**Repo:** platformengineer
**Dependencies:** R041 CI gate preferred (so cleanup is verified by CI)

**Goal:** Eliminate all 55+ direct `import openai` / `import anthropic` / `import google.generativeai` violations. Route all calls through `AIProviderGateway.call()`.

**Scope:**
- Migrate each violation file from direct LLM SDK to `AIProviderGateway.call(GatewayRequest(...))`
- Verify `AIUsageLog` rows are written for each migrated call
- Remove any dead `*_client.py` / `*_wrapper.py` files that were legacy bypass wrappers
- CI gate (from R041) must pass after cleanup

**Out of scope:**
- Voice gateway — it uses HTTP-based provider resolution, not the Python SDK path
- Adding new AI features

**Acceptance criteria:**
- [ ] `check_no_direct_llm_imports.py` reports zero violations
- [ ] All migrated calls produce `AIUsageLog` rows
- [ ] Existing behavior unchanged (responses same shape)
- [ ] Regression gate green
- [ ] Dead wrapper files deleted

---

## R049 — Data Sources Hub Backend Foundation

**Status:** `[ ] blocked — R047, R046, R040`
**Repo:** platformengineer
**Dependencies:** R047, R046, R040

**Goal:** Implement the Data Sources & Knowledge Connections Hub backend. Orgs can connect external data sources (Google Calendar, email, CRM); AI agents can query with access policy enforcement.

**Scope:**
- `DataConnection` model (org-scoped, provider type, credentials ref)
- `DataSource` model (configured source from a connection)
- `SourceAccessPolicy` model (which agents/modules can access which sources)
- CRUD endpoints for connections and sources
- `KnowledgeIndexService` stub (async indexing, deferred full impl)
- MCP Server governance layer (per ADR-035)

**Out of scope:**
- Actual MCP server implementations (Google Calendar, email connectors) — those are P2
- Full semantic search / RAG integration
- Platform-ui Data Sources UI

**Acceptance criteria:**
- [ ] DataConnection CRUD working with audit trail
- [ ] SourceAccessPolicy enforced before any AI agent accesses a source
- [ ] Credentials stored via SSM ref (never in DB directly)
- [ ] Tests: model structural + route auth + policy enforcement
