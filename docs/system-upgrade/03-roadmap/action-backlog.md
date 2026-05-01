# 15 — Action Backlog

_Last updated: 2026-04-26 (R041B-post-merge-reconciliation — ActionButton complete; worktree tasks updated)_

---

## R040-Fix — DB Apply Status

| Item | Status |
|------|--------|
| R040-Fix migrations applied to EKS DB | `[x] 2026-04-26` — 3/3 migrations applied. Final revision: `20260426_fix_r040_indexes`. |
| PR #7 merged to platformengineer/main | `[x] 2026-04-26` — SHA `cc6c9001c90bc3317a17e1603762564ab23747c7` |
| `test_r040_fix.py` 33/33 pass | `[x] 2026-04-26` |
| `test_r040_schema.py` 43/43 pass | `[x] 2026-04-26` |
| Post-apply reconciliation in platform-ui | `[x] 2026-04-26` — this round |

---

## R041D — Secrets Gate Baseline Cleanup / Allowlist Policy (P0 — do before R041A full enforcement)

> Issue draft: `docs/system-upgrade/issues/R041D-secrets-gate-baseline-cleanup.md`
> Risk: R27 in `../09-history/risk-register.md`

| Task | Scope | Priority | Status |
|------|-------|----------|--------|
| **Run D-005 scanner against platformengineer/main** | Capture full output; baseline findings list | P1 | `[ ]` |
| **Classify every finding** | Real secret / test fixture / safe local default / legacy dead code / false positive | P1 | `[ ]` |
| **Remediate real secrets** | Remove or rotate any genuine credential in tracked code | P0 | `[ ]` |
| **Replace test secrets with fixtures/env injection** | Where practical — `os.environ.get(...)` or pytest fixtures | P1 | `[ ]` |
| **Document allowlist entries with justification** | Per-finding rationale; owner; reviewer | P1 | `[ ]` |
| **Update scanner policy / config if needed** | Exclude patterns with justification | P1 | `[ ]` |
| **Verify D-005 green on main** | Or clearly reduced to justified allowlist | P1 | `[ ]` |
| **Ensure future PRs fail only on new findings** | Baseline anchored; no pre-existing noise | P1 | `[ ]` |
| **Move R27 from OPEN to MITIGATED/RESOLVED** | When D-005 green or clearly allowlisted | P1 | `[ ]` |

---

## R041B — ActionButton Shared Component (Complete ✅ 2026-04-26)

> PR #2 merged to platform-ui/master at `5532102`. Worktree removed. Branch deleted.

| Item | Status |
|------|--------|
| `components/shared/action-button.tsx` created | `[x] 2026-04-26` |
| Users `[id]/page.tsx` — deactivate + reactivate migrated | `[x] 2026-04-26` |
| Organizations `[id]/page.tsx` — deactivate + reactivate migrated | `[x] 2026-04-26` |
| `../02-rules/shared-services.md` marked ✅ Implemented (R041B) | `[x] 2026-04-26` |
| Prop precedence review fix applied | `[x] 2026-04-26` |
| TypeScript: 0 new errors in changed files | `[x] 2026-04-26` |

---

## Now (Phase 0 — highest urgency)

| Task | Why It Matters | Dependencies | Status |
|------|---------------|--------------|--------|
| **Wire real auth in platform-ui** | Platform-ui is useless without real login. Everything downstream depends on this. | Phase A complete (Round 006) | `[x] 2026-04-24` |
| **Implement `/api/proxy/[...path]` route handler** | Dashboard API calls proxy to Flask | ✅ Proxy route exists, cookie forwarding implemented | `[x]` Done |
| **Verify dashboard stats work end-to-end** | Dashboard fetches from Flask via proxy | Confirmed working in TEST | `[x]` Done |
| **Add Next.js middleware for route guards** | Unauthenticated users can access dashboard routes | next-auth must be configured first | `[x] 2026-04-24` |
| **Add error boundary to dashboard layout** | API failures may crash the page silently | — | `[ ]` TODO |
| **Answer Q1 (auth contract)** | Flask auth response shape | `[RESOLVED]` JWT + session both exist; using JWT for platform-ui | `[x]` Done |
| **Answer Q4 (API paths)** | Confirm API endpoint paths | `[RESOLVED]` Paths confirmed correct in TEST | `[x]` Done |

---

## Auth Bridge Implementation (Phase A — current sprint)

| Task | File(s) | Priority | Status |
|------|---------|----------|--------|
| **Create next-auth handler** | `app/api/auth/[...nextauth]/route.ts` | P1 | `[x] 2026-04-24` |
| **Create auth options** | `lib/auth/options.ts` (authOptions, Credentials provider → `POST /api/auth/login`) | P1 | `[x] 2026-04-24` |
| **Define session + JWT types** | `lib/auth/types.ts` (next-auth module augmentation) | P1 | `[x] 2026-04-24` |
| **Create RBAC helpers** | `lib/auth/rbac.ts` — hasRole, hasPermission, getOrgId | P1 | `[x] 2026-04-24` |
| **Wire SessionProvider** | `app/layout.tsx` → `components/providers/session-provider.tsx` | P1 | `[x] 2026-04-24` |
| **Update login page** | `app/(auth)/login/page.tsx` — calls `signIn("credentials")`, real error state | P1 | `[x] 2026-04-24` |
| **Add middleware.ts** | `middleware.ts` (project root) — protects all routes, 401 for proxy, redirect for pages | P1 | `[x] 2026-04-24` |
| **Update proxy to use Bearer** | `app/api/proxy/[...path]/route.ts` — `getToken()` + `Authorization: Bearer` | P1 | `[x] 2026-04-24` |
| **Add env vars to .env.example** | `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `FLASK_API_URL` documented | P1 | `[x] 2026-04-24` |
| **Create auth documentation** | `docs/auth/README.md` — flow diagram, session shape, proxy behavior, gaps, agent guide | P1 | `[x] 2026-04-24` |

## Auth Bridge Implementation (Phase B — Flask additions)

| Task | File(s) | Priority | Status |
|------|---------|----------|--------|
| **Add POST /api/auth/logout** | `apps/authentication/jwt_routes.py` — invalidate refresh token | P1 | `[x] 2026-04-24` |
| **Add GET /api/auth/me** | `apps/authentication/jwt_routes.py` — JWT required, returns serialize_auth_user() | P2 | `[x] 2026-04-24` |
| **Add localhost:3000 to CORS** | `apps/__init__.py` — dev origin for platform-ui | P1 | `[x] 2026-04-24` (already covered by `http://localhost` prefix match in after_request handler — no change needed) |
| **Add permissions to JWT response** | `apps/authentication/jwt_routes.py:serialize_auth_user` — includes `permissions[]`, `is_admin`, `is_system_admin`, `is_manager`, `is_ai_agent` | P2 | `[x] 2026-04-24` |

## Auth Bridge Implementation (Phase B.1 — Follow-up from Round 009)

| Task | File(s) | Priority | Status |
|------|---------|----------|--------|
| **Remove is_admin role-name workaround** | `lib/auth/options.ts:normalizeFlaskUser` — backend now returns `is_admin` directly; remove `primaryRole === "admin"` derivation | P1 | `[ ]` |
| **Remove is_admin workaround note from auth docs** | `docs/auth/README.md` — update backend gaps table; logout + /me now exist | P2 | `[ ]` |

## Auth Bridge Implementation (Phase C — Hardening)

| Task | File(s) | Priority | Status |
|------|---------|----------|--------|
| **Add NEXTAUTH_SECRET to SSM** | `scripts/secrets/ssm-secrets.sh` | P1 (before prod) | `[ ]` |
| **Role-aware nav filtering** | `components/shell/app-sidebar.tsx` | P2 | `[ ]` |
| **Auth E2E test** | `e2e/auth.spec.ts` — login, session, logout flow | P2 | `[ ]` |
| **Set Flask cookie security** | `SESSION_COOKIE_SECURE=True`, `SESSION_COOKIE_SAMESITE=Lax` in prod | P1 (before prod) | `[ ]` |

---

## Parallel Worktree Workflow (P1 — required before first parallel agent session)

> Standard: `_(deleted: see CLAUDE.md §Workflow Rules)_`

| Task | Scope | Priority | Status |
|------|-------|----------|--------|
| **Create worktrees directory** | `mkdir C:\Users\moshe\OneDrive\Documents\Projects\worktrees` | P1 | `[ ]` |
| **Create worktree for R041A** | `git worktree add ..\worktrees\platformengineer-r041a-ci -b feat/r041a-ci-enforcement main` | P1 | `[ ]` |
| **Create worktree for R041B** | `git worktree add ..\worktrees\platform-ui-r041b-actionbutton -b feat/r041b-actionbutton master` | P1 | `[x] 2026-04-26` |
| **Verify worktree setup before each parallel session** | `git worktree list` + `git branch --show-current` in each worktree | P1 | `[ ]` |
| **Cleanup worktrees after PR merge** | `git worktree remove` + `git branch -d` + `git worktree prune` | P1 | `[x] 2026-04-26 (R041B worktree cleaned up)` |

---

## Legacy Preservation & Module Readiness (P1 — required before any module rewrite round)

> Standard: `../02-rules/legacy-inventory.md` | Progress tracker: `../06-governance/module-migration-progress.md`
> Enforced by: `../06-governance/round-checklist.md §13` | Rules: `../02-rules/development-rules.md §No Module Rewrite Without Inventory`

| Task | Scope | Priority | Status |
|------|-------|----------|--------|
| **Create per-module `LEGACY_INVENTORY.md` template** | Already defined in `../02-rules/legacy-inventory.md` — create first real inventory when first module round starts | P1 | `[ ]` |
| **Inventory `users` module** | `docs/modules/users/LEGACY_INVENTORY.md` — pages, routes, capabilities, must-preserve list | P1 | `[ ]` |
| **Inventory `roles` module** | `docs/modules/roles/LEGACY_INVENTORY.md` | P1 | `[ ]` |
| **Inventory `admin/orgs` module** | `docs/modules/admin/LEGACY_INVENTORY.md` | P1 | `[ ]` |
| **Inventory `helpdesk` module** | `docs/modules/helpdesk/LEGACY_INVENTORY.md` | P1 | `[ ]` |
| **Create `E2E_COVERAGE.md` for `users` module** | `docs/modules/users/E2E_COVERAGE.md` — base flows + module-specific flows | P1 | `[ ]` |
| **Create `E2E_COVERAGE.md` for `roles` module** | `docs/modules/roles/E2E_COVERAGE.md` | P1 | `[ ]` |
| **Create `E2E_COVERAGE.md` for `helpdesk` module** | `docs/modules/helpdesk/E2E_COVERAGE.md` | P1 | `[ ]` |
| **Update `../06-governance/module-migration-progress.md` after each module round** | Keep status columns current; link to per-module docs as created | P1 | `[~]` (initial table created R041-Gov) |
| **Declare AI readiness for each module** | `docs/modules/<key>/AI_READINESS.md` — even if "not applicable" | P2 | `[ ]` |
| **Declare i18n readiness for each module** | `docs/modules/<key>/I18N_READINESS.md` — hardcoded strings inventory | P2 | `[ ]` |

---

## Security & Multi-Tenant Test Coverage (P1 — required before each module round)

> Standard: `../02-rules/testing-standard.md` | Enforced by: `../06-governance/round-checklist.md §12`

| Task | Scope | Priority | Status |
|------|-------|----------|--------|
| **Create `apps/tests/helpers/security.py`** | Backend test helpers: `make_jwt`, `admin_headers`, `viewer_headers`, `assert_401`, `assert_403`, `assert_audit_exists`, `assert_no_pii_leaked` | P1 | `[ ]` |
| **Add tenant isolation tests: Users module** | `apps/admin/tests/` — Org A cannot read/write Org B users | P1 | `[ ]` |
| **Add tenant isolation tests: Orgs module** | `apps/admin/tests/` — Org A cannot read/write Org B orgs | P1 | `[ ]` |
| **Add tenant isolation tests: Roles module** | `apps/authentication/tests/` — Org A cannot read/write Org B roles | P1 | `[ ]` |
| **Add audit assertion tests: Users/Orgs/Roles mutations** | Assert `UserActivity` row exists after create/update/delete | P1 | `[ ]` |
| **Add safe-error tests: all protected endpoints** | No `str(exc)`, no stack traces in error responses | P1 | `[ ]` |
| **Playwright setup: install + `playwright.config.ts`** | platform-ui root — configure for TEST env | P1 | `[ ]` |
| **Create E2E security spec scaffolds** | `tests/e2e/security/auth-redirect.spec.ts`, `permission-denied.spec.ts`, `tenant-isolation.spec.ts`, `module-disabled.spec.ts` — scaffolded/skipped until credentials available | P2 | `[~]` (scaffolds created R041-Test) |
| **Add AI governance tests: fitness_nutrition module** | `AIProviderGateway.call()` used; `AIUsageLog` row asserted | P1 | `[ ]` (R048) |
| **Add AI governance tests: ala module** | Same pattern | P1 | `[ ]` (R048) |
| **CI gate: Playwright smoke in PR checks** | `.github/workflows/` — after Playwright setup complete | P2 | `[ ]` (R041A) |
| **CI gate: LLM import scan in GitHub Actions** | `scripts/check_no_direct_llm_imports.py` as PR gate | P1 | `[ ]` (R041A) |

---

## AI-Maintainability (Phase 0.5 — alongside auth, before module builds)

| Task | File(s) | Priority | Status |
|------|---------|----------|--------|
| **Dead-code inventory** | Run `find apps/ -name "*_OLD*" -o -name "*_BACKUP*"` + `vulture apps/ --min-confidence 80` | P1 | `[ ]` |
| **Delete `api_auth_OLD_BACKUP.py`** | `apps/authentication/api_auth_OLD_BACKUP.py` — grep-confirm, then delete | P1 | `[ ]` |
| **Delete all other `*_OLD_*`/`*_BACKUP*` files** | Full `apps/` sweep; archive to `.archive/` first if uncertain | P2 | `[ ]` |
| **Module INDEX.md template** | Create `DOCS/templates/MODULE_INDEX_TEMPLATE.md` for `apps/<module>/INDEX.md` | P1 | `[ ]` |
| **Platform-ui route README template** | Create `DOCS/templates/ROUTE_README_TEMPLATE.md` for `app/(dashboard)/<route>/README.md` | P2 | `[ ]` |
| **File header standard** | Document Python + TypeScript header format in `CLAUDE.md §Code Documentation`; add to PR checklist | P1 | `[ ]` |
| **Oversized file list** | `find apps/ -name "*.py" | xargs wc -l | sort -rn | head -20` — identify top 20 biggest files | P2 | `[ ]` |
| **platform-ui knip scan** | `npx knip --no-exit-code` — find unused exports, files, dependencies | P2 | `[ ]` |
| **Vite app inventory** | Document exactly what each Vite app (`ai-agents-ui/`, `ala-ui/`, `ops-ui/`, `dyn-dt-ui/`) does that platform-ui doesn't yet — scope the migration | P2 | `[ ]` |
| **Jinja2 template inventory** | List all active templates + their Flask `render_template` callers — baseline for retirement | P2 | `[ ]` |

---

## Module Data Export/Import (Phase 3.5 — design complete, implementation in Phase 3)

### Foundation

| Task | File(s) | Priority | Status |
|------|---------|----------|--------|
| **Define `dataContract` schema** | Create JSON Schema for `dataContract` section of module manifests; validate in CI | P1 | `[ ]` |
| **Owned table inventory** | For each of 19 modules: classify every table as owned/referenced/core in PLAN.md | P1 | `[ ]` |
| **Secret column registry** | `apps/core/secret_columns.py` — authoritative list checked at export build time | P1 | `[ ]` |
| **PII column declaration** | Audit all owned tables; add `piiColumns` declarations to each module's dataContract | P2 | `[ ]` |

### Backend models

| Task | File(s) | Priority | Status |
|------|---------|----------|--------|
| **`ModuleExportJob` model** | `apps/module_system/models.py` — export job with status, scope, row counts, download URL | P1 | `[ ]` |
| **`ModuleImportJob` model** | `apps/module_system/models.py` — import job with mode, status, validation result | P1 | `[ ]` |
| **`ModuleDataContract` model** | `apps/module_system/models.py` — persisted dataContract per module version | P1 | `[ ]` |
| **`ModuleImportValidationResult` model** | `apps/module_system/models.py` | P1 | `[ ]` |
| **`ModuleImportRowError` model** | `apps/module_system/models.py` — quarantine table | P2 | `[ ]` |
| **`ModuleImportAuditEvent` model** | `apps/module_system/models.py` — per-row audit trail | P1 | `[ ]` |
| **DB migration** | `scripts/migrations/` — add all 6 models above | P1 | `[ ]` |

### Export pipeline

| Task | File(s) | Priority | Status |
|------|---------|----------|--------|
| **JSONL export writer** | `apps/module_system/export_writer.py` — streams owned table rows to .jsonl files | P1 | `[ ]` |
| **id-map.json generator** | Part of export writer — records original_id → export_uuid | P1 | `[ ]` |
| **user-map.json + org-map.json generator** | Part of export writer — records referenced user/org identifiers | P1 | `[ ]` |
| **Anonymization engine** | `apps/module_system/anonymizer.py` — replaces PII columns per anonymizationRules | P2 | `[ ]` |
| **Checksum + signature** | `apps/module_system/packager.py` — SHA256 checksums.sha256 + signature.json | P1 | `[ ]` |
| **Signed S3 download URL** | `apps/module_system/export_routes.py` — time-limited pre-signed URL | P2 | `[ ]` |
| **Celery export task** | `apps/module_system/tasks.py` — async export with progress updates | P1 | `[ ]` |

### Import pipeline

| Task | File(s) | Priority | Status |
|------|---------|----------|--------|
| **Package validator** | `apps/module_system/import_validator.py` — signature + checksum + schema compat | P1 | `[ ]` |
| **Dry-run import validator** | `apps/module_system/dry_run.py` — FK check, PII check, conflict report, no DB write | P1 | `[ ]` |
| **ID remapping engine** | `apps/module_system/id_remapper.py` — applies id-map.json to all FK columns | P1 | `[ ]` |
| **User/org resolver** | `apps/module_system/tenant_mapper.py` — resolves user-map.json + org-map.json against target DB | P1 | `[ ]` |
| **Import writer** | `apps/module_system/import_writer.py` — transactional JSONL row insert/upsert per import mode | P1 | `[ ]` |
| **Rollback engine** | `apps/module_system/rollback.py` — calls rollbackHooks + deletes in reverse FK order | P1 | `[ ]` |
| **Celery import task** | `apps/module_system/tasks.py` — async import with progress, error quarantine | P1 | `[ ]` |

### Security + compliance

| Task | File(s) | Priority | Status |
|------|---------|----------|--------|
| **Cross-tenant leakage test** | `apps/module_system/tests/test_cross_tenant.py` — assert org_id filter never crossed | P1 | `[ ]` |
| **Secret exclusion test** | `apps/module_system/tests/test_secret_exclusion.py` — assert secretColumns never in package | P1 | `[ ]` |
| **system-admin scope enforcement** | Import routes: assert `is_system_admin` for `replace-module-data` and `restore-snapshot` | P1 | `[ ]` |

### Platform-UI

| Task | File(s) | Priority | Status |
|------|---------|----------|--------|
| **Export modal** | `app/(dashboard)/settings/modules/[id]/export/` — scope select, filter, PII ack, progress | P2 | `[ ]` |
| **Dry-run result screen** | Show valid/invalid/conflict counts, schema compat, user mapping status | P2 | `[ ]` |
| **Conflict resolution screen** | Per-table strategy selector; user remapping table | P2 | `[ ]` |
| **Import progress screen** | Table-by-table progress, live row count, error count | P2 | `[ ]` |
| **Export/Import history** | Tabs on module management page — date, scope, user, status, download | P2 | `[ ]` |

---

## Platform Capabilities Catalog (Phase 1 — shared building blocks)

_Reference: `docs/system-upgrade/26-platform-capabilities-catalog.md`_

> **Rule:** Before building any new module feature, check whether it belongs in the catalog. If yes — build/extend the shared capability first.

### Round 023 — Complete Partials + FeatureFlags + Security Hygiene

| Task | Capability | File(s) | Priority | Status |
|------|-----------|---------|----------|--------|
| **Add `PlatformErrorBoundary`** | §21 | `components/shared/error-boundary.tsx` + wire into `app/(dashboard)/layout.tsx` | P1 | `[x]` R015 |
| **Extract `ErrorState` component** | §21 | `components/shared/error-state.tsx` | P1 | `[x]` R015 |
| **Extract `PageShell` component** | §07 | `components/shared/page-shell/` | P1 | `[x]` R015 |
| **Extract `DetailView` components** | §08 | `components/shared/detail-view/` — extraction from users/orgs | P1 | `[ ]` R023 |
| **Extract `StatCard` component** | §02 | `components/shared/stats/stat-card.tsx` | P1 | `[x]` R015 |
| **Build `PlatformForm` wrapper** | §03 | `components/shared/form/` | P1 | `[x]` R015 |
| **Build `usePlatformMutation` hook** | §03/04 | `lib/hooks/use-platform-mutation.ts` | P1 | `[x]` R017 |
| **Build `ConfirmDialog` component** | §04 | `components/shared/confirm-action-dialog.tsx` | P1 | `[x]` R020 |
| **Build `ActionButton` component** | §04 | `components/shared/action-button.tsx` — loading state + disabled during mutation | P1 | `[ ]` R023 |
| **Build `PlatformFeatureFlags` hook** | §17 | `lib/hooks/use-feature-flag.ts` + `components/shared/feature-flag.tsx` + `lib/api/feature-config.ts` | P1 | `[ ]` R023 |
| **Role-aware nav filtering** | — | `components/shell/app-sidebar.tsx` — hide admin items from non-admins | P1 | `[ ]` R023 |
| **Flask security headers** | — | `apps/__init__.py` after_request: `X-Frame-Options`, `X-Content-Type-Options` | P1 | `[ ]` R023 |
| **NEXTAUTH_SECRET in SSM** | — | `scripts/secrets/ssm-secrets.sh` push + doc update | P1 | `[ ]` R023 |

### Round 024 — PlatformTimeline + PlatformNotifications + StatCard

| Task | Capability | File(s) | Priority | Status |
|------|-----------|---------|----------|--------|
| **Build `PlatformTimeline`** | §09 | `components/shared/timeline/` — Timeline, TimelineEvent, TimelineSkeleton, types | P1 | `[ ]` R024 |
| **Build `NotificationBell` (polling)** | §12 | `components/shell/notification-bell.tsx` + `lib/hooks/use-notifications.ts` (30s poll) | P1 | `[ ]` R024 |
| **Build `NotificationDrawer`** | §12 | `components/shell/notification-drawer.tsx` + `lib/api/notifications.ts` | P1 | `[ ]` R024 |
| **Build `ChartCard` wrapper** | §02 | `components/shared/chart-card.tsx` — title + subtitle + recharts children | P2 | `[ ]` R024 |

### Round 028 — PlatformApprovalFlow + PlatformPolicy Engine

| Task | Capability | File(s) | Priority | Status |
|------|-----------|---------|----------|--------|
| **Build `ApprovalQueue` UI** | §13 | `components/shared/approval/` — approval table + modal + status badge | P1 | `[ ]` R028 |
| **Build `PolicyRuleTable` + form** | §27 | `components/modules/settings/policy-rule-*.tsx` — BLOCK/ALLOW rules | P1 | `[ ]` R028 |

### Round 029 — PlatformSettings Engine

| Task | Capability | File(s) | Priority | Status |
|------|-----------|---------|----------|--------|
| **Build `SettingsLayout`** | §16 | `components/shared/settings/settings-layout.tsx` — sidebar nav + content area | P2 | `[ ]` R029 |

### Round 030 — PlatformRealtime

| Task | Capability | File(s) | Priority | Status |
|------|-----------|---------|----------|--------|
| **Build `useEventSource` SSE hook** | §23 | `lib/hooks/use-event-source.ts` — auto-reconnect, org-scoped | P1 | `[ ]` R030 |

### Round 031 — PlatformJobRunner + PlatformImportExport full

| Task | Capability | File(s) | Priority | Status |
|------|-----------|---------|----------|--------|
| **Build `JobProgress` + polling hook** | §14 | `components/shared/job-runner/` + `lib/hooks/use-job-polling.ts` | P2 | `[ ]` R031 |
| **Build `ExportButton` component** | §06 | `components/shared/export-button.tsx` — wraps existing csv.ts | P2 | `[ ]` R031 |

### Round 032 — PlatformSearch + nuqs

| Task | Capability | File(s) | Priority | Status |
|------|-----------|---------|----------|--------|
| **Build `CommandPalette` (nav only)** | §11 | `components/shell/command-palette.tsx` — ⌘K, nav shortcuts only | P2 | `[ ]` R032 |
| **Install `nuqs`** | — | `package.json` — URL filter state for all list pages | P1 | `[ ]` R032 |
| **Migrate list pages to `nuqs` filters** | — | Users, Orgs, Tickets list pages | P2 | `[ ]` R032 |

### Later (Phase 3+)

| Task | Capability | Priority | Status |
|------|-----------|----------|--------|
| **Build `FileUploadZone`** | §24 | P2 | `[ ]` |
| **Build `IntegrationCard` framework** | §25 | P2 | `[ ]` |
| **Build `PiiField` masking** | §20 | P2 | `[ ]` |
| **Build `PlatformWizard`** | §15 | P2 | `[ ]` |
| **Build `ModuleRegistry` loader** | §18 | P2 | `[ ]` |
| **Build `UsageMeter`** | §26 | P2 | `[ ]` |
| **Build `FeatureTour`** | §28 | P3 | `[ ]` |
| **Build `TestRunner` UI** | §29 | P3 | `[ ]` |
| **Build Developer Docs portal** | §30 | P3 | `[ ]` |

### Next (Phase 1-2 — Weeks 3-20)

| Task | Capability | File(s) | Priority | Status |
|------|-----------|---------|----------|--------|
| **Build `PlatformTimeline`** | §09 | `components/shared/timeline/` — when Helpdesk (04) starts | P1 | `[ ]` |
| **Build `ApprovalQueue` UI** | §13 | `components/shared/approval/` — approval table + modal + status badge | P1 | `[ ]` |
| **Build `SettingsLayout`** | §16 | `components/shared/settings/` — sidebar nav + section cards | P2 | `[ ]` |
| **Build `useEventSource` SSE hook** | §23 | `lib/hooks/use-event-source.ts` — when AI Agents (05) starts | P1 | `[ ]` |
| **Build `CommandPalette` (nav only)** | §11 | `components/shell/command-palette.tsx` — ⌘K, nav shortcuts only | P2 | `[ ]` |
| **Build `JobProgress` + polling hook** | §14 | `components/shared/job-runner/` — when Module Export/Import starts | P2 | `[ ]` |
| **Build `PlatformWizard`** | §15 | `components/shared/wizard/` — when Onboarding starts | P2 | `[ ]` |
| **Build `UsageMeter`** | §26 | `components/modules/billing/usage-meter.tsx` — when Billing (08) starts | P2 | `[ ]` |
| **Build `PolicyRuleTable` + form** | §27 | `components/modules/settings/policy-rule-*.tsx` — when Helpdesk (04) settings | P1 | `[ ]` |
| **Build `ExportButton` component** | §06 | `components/shared/export-button.tsx` — wraps existing csv.ts | P2 | `[ ]` |
| **Build `AuditLogTable`** | §10 | `components/shared/audit-log/` — when Audit Log (13) starts | P2 | `[ ]` |
| **Promote to `ModuleRegistry`** | §18 | `lib/modules/registry.ts` + wire into nav-items.ts | P2 | `[ ]` |

### Later (Phase 3+)

| Task | Capability | Priority | Status |
|------|-----------|----------|--------|
| **Build `FileUploadZone`** | §24 | P2 | `[ ]` |
| **Build `IntegrationCard` framework** | §25 | P2 | `[ ]` |
| **Build `PiiField` masking** | §20 | P2 | `[ ]` |
| **Build `FeatureTour`** | §28 | P3 | `[ ]` |
| **Build `TestRunner` UI** | §29 | P3 | `[ ]` |
| **Build Developer Docs portal** | §30 | P3 | `[ ]` |

---

## Module 02 — Organizations Phase B (R019 ✅ Complete)

| Task | Status |
|------|--------|
| Harden backend (IntegrityError, slug regex, name length, no raw exc) | `[x]` R019 |
| `lib/modules/organizations/schemas.ts` (Zod) | `[x]` R019 |
| `lib/api/organizations.ts` use Zod-inferred types | `[x]` R019 |
| `OrgCreateSheet` (slug auto-generate, system_admin only) | `[x]` R019 |
| `OrgEditSheet` (slug read-only, is_active toggle) | `[x]` R019 |
| Wire create/edit into list + detail pages | `[x]` R019 |
| Module docs updated (IMPLEMENTATION.md + manifest) | `[x]` R019 |
| Dedicated deactivate org + ConfirmActionDialog | `[ ]` backlog |
| Org members list tab (cross-module Users) | `[ ]` backlog |
| E2E tests | `[ ]` backlog |

---

## Module 03 — Roles & Permissions (R018 ✅ Complete)

| Task | Status |
|------|--------|
| Flask role API (6 endpoints) | `[x]` R018 |
| Proxy PATH_MAP: roles → /api/roles | `[x]` R018 |
| `lib/modules/roles/types.ts` + `schemas.ts` | `[x]` R018 |
| `lib/api/roles.ts` (6 API functions) | `[x]` R018 |
| `queryKeys.roles.*` | `[x]` R018 |
| `RolePermissionBadge` component | `[x]` R018 |
| `RolesTable` component | `[x]` R018 |
| `RoleCreateSheet` + `RoleEditSheet` forms | `[x]` R018 |
| `/roles` list page | `[x]` R018 |
| `/roles/[id]` detail page | `[x]` R018 |
| Module docs (PLAN, IMPLEMENTATION, manifest) | `[x]` R018 |
| Delete role (system_admin only) | `[ ]` backlog |
| Role users list tab in detail | `[ ]` backlog |
| E2E tests | `[ ]` backlog |

---

## Cross-Platform Readiness (Phase CP — prerequisite for mobile/desktop)

_Reference: `docs/system-upgrade/28-cross-platform-structure-audit.md`_
_Current readiness: 55/100. Block mobile work until CP-0 complete._

### CP-0 — Type Extraction (no runtime impact, ~2 hours)

| Task | File(s) | Priority | Status |
|------|---------|----------|--------|
| **Extract `NormalizedAuthUser` + `FlaskUserPayload`** | `lib/platform/auth/types.ts` — re-export shim at `lib/auth/types.ts` | P1 | `[x]` R016 |
| **Create `lib/platform/` directory** | 7 subdirs: auth, permissions, formatting, export, request, data-grid, modules | P1 | `[x]` R016 |
| **Extract `rowsToCsv()` from csv.ts** | `lib/platform/export/csv.ts` — no Blob/DOM deps | P2 | `[x]` R016 |

### CP-1 — API Transport (prerequisite for non-browser consumers, ~4 hours)

| Task | File(s) | Priority | Status |
|------|---------|----------|--------|
| **Parameterize API base URL** | `lib/api/client.ts` — `NEXT_PUBLIC_API_BASE_URL ?? "/api/proxy"` | P1 | `[x]` R016 |
| **Add `@platform: web` / `@platform: cross` comments** | All `lib/platform/*` files — classification explicit | P2 | `[x]` R016 |

### CP-2 — Component Splitting (when mobile prototype begins)

| Task | File(s) | Priority | Status |
|------|---------|----------|--------|
| **Create `components/platform/` directory** | Move InfoRow, BoolBadge, ErrorBoundary, ErrorState | P1 | `[ ]` |
| **Remove `useRouter` from `DetailBackButton`** | `components/shared/detail-view/detail-back-button.tsx` — accept `onBack` prop | P1 | `[ ]` |
| **Fix `theme-store.ts` side effect** | Wrap `document.documentElement` call in platform check | P2 | `[ ]` |

---

## Open-Source Capability Layer (Phase 1 — install + shared components)

_Reference: `docs/system-upgrade/25-open-source-capability-layer.md` | ADR-016_

| Task | File(s) | Priority | Status |
|------|---------|----------|--------|
| **Install `nuqs`** | `package.json` — URL filter state for all list pages | P1 | `[ ]` |
| **Create shared `DataTable<T>` component** | `components/shared/data-table/` — wraps TanStack Table with standard skeleton, empty, error states | P1 | `[x] 2026-04-24` |
| **Create `StatCard` + `ChartCard` wrappers** | `components/ui/stat-card.tsx`, `components/ui/chart-card.tsx` | P1 | `[ ]` |
| **Create `EmptyState` component** | `components/shared/empty-state.tsx` — standard empty/no-results/error states | P1 | `[x]` already existed |
| **Create `TableRowSkeleton`** | `components/shared/data-table/table-skeleton.tsx` | P1 | `[x] 2026-04-24` |
| **Create `usePermission()` hook** | `lib/hooks/use-permission.ts` — wraps session, hasRole, hasPermission | P1 | `[x] 2026-04-24` |
| **Create `<PermissionGate>` component** | `components/shared/permission-gate.tsx` — permission/role/adminOnly/mode props | P1 | `[x] 2026-04-24` |
| **Create date utilities** | `lib/utils/format.ts` — `formatDate()`, `formatDateTime()`, `formatRelativeTime()`, `formatNumber()`, `formatCurrency()` | P1 | `[x] 2026-04-24` |
| **Install `papaparse`** | `package.json` + `@types/papaparse` — CSV export/import | P2 | `[ ]` |
| **Create CSV export utility** | `lib/utils/csv.ts` — `exportToCsv()`, `rowsToCsv()` with BOM for Hebrew Excel compat | P2 | `[x] 2026-04-24` |
| **Install `@tanstack/react-virtual`** | `package.json` — virtual scroll for tables >500 rows | P2 | `[ ]` |
| **Add shadcn Calendar + DatePicker** | `npx shadcn@latest add calendar date-picker` | P2 | `[ ]` |
| **Update proxy to attach audit headers** | `app/api/proxy/[...path]/route.ts` — add `X-Request-ID`, `X-User-Id`, `X-Org-Id`, `X-Client-Source` | P1 | `[x] 2026-04-24` |
| **Create request context helper** | `lib/api/request-context.ts` — `buildAuditHeaders()`, `generateRequestId()` | P1 | `[x] 2026-04-24` |
| **Migrate Users list to `nuqs` filters** | `app/(dashboard)/users/page.tsx` — replace manual searchParams with `useQueryState` | P2 | `[ ]` |
| **Refactor `UsersTable` to use shared `DataTable`** | `components/modules/users/users-table.tsx` — delegates skeleton/pagination to shared component | P1 | `[x] 2026-04-24` |

---

## Next (Phase 1 — 2-8 weeks)

| Task | Why It Matters | Dependencies | Status |
|------|---------------|--------------|--------|
| Add `flask-smorest` to platformengineer + annotate top 10 endpoints | Enables TypeScript codegen | Phase 0 complete | `[ ]` TODO |
| Set up `openapi-typescript` codegen in platform-ui | Eliminates manual type drift | OpenAPI spec available | `[ ]` TODO |
| Implement standard API response envelope in Flask | Frontend gets consistent shapes | — | `[ ]` TODO |
| Set up Storybook in platform-ui | Design system documentation; component catalog | — | `[ ]` TODO |
| Move hardcoded Hebrew strings to `messages/he.json` | i18n correctness; required for full next-intl | — | `[ ]` TODO |
| Add Playwright smoke tests (login, dashboard, logout) | Any refactor without tests is dangerous | Auth working | `[ ]` TODO |
| Add Vitest for `lib/` utilities | Unit test coverage for API client, hooks | — | `[ ]` TODO |
| Add `nuqs` for URL search param state | Filter/pagination state survives navigation | — | `[ ]` TODO |
| Set up `import-linter` in platformengineer CI | Document module boundaries before they get worse | — | `[ ]` TODO |
| Structured logging (JSON formatter) in Flask | Incident debugging currently impossible | — | `[ ]` TODO |
| Delete dead code: `api_auth_OLD_BACKUP.py` + other clearly dead files | Reduces confusion | — | `[ ]` TODO |
| Answer open questions Q1-Q9 | Block on multiple Phase 1 tasks | — | `[ ]` TODO |

---

## Later (Phase 2-3 — 8+ weeks)

| Task | Why It Matters | Dependencies | Status |
|------|---------------|--------------|--------|
| Migrate User Management to platform-ui | First full domain migration — proves pattern | Phase 1 API contract | `[ ]` TODO |
| Migrate Helpdesk Sessions + Tickets to platform-ui | Core product — high value | User management migration as test | `[ ]` TODO |
| Implement SSE endpoint + useEventSource hook | Live investigation status | Helpdesk migration | `[ ]` TODO |
| Migrate AI Agents console to platform-ui | Most visible feature | SSE infrastructure | `[ ]` TODO |
| Stand up FastAPI gateway service | New API surface with auto-generated OpenAPI | Phase 1 patterns established | `[ ]` TODO |
| Migrate ALA interface from `ala-ui/` Vite app to platform-ui | Consolidate 4 Vite apps into one | ALA domain mapping | `[ ]` TODO |
| Migrate `ops-ui/`, `dyn-dt-ui/`, `ai-agents-ui/` into platform-ui | Retire all embedded Vite builds | Per-domain migration | `[ ]` TODO |
| Fix SAML build dependency (python3-saml/xmlsec) | Enterprise SSO unblocked | Docker build environment | `[ ]` TODO |
| Add iOS EAS Build pipeline | Expand mobile reach | Apple Developer account | `[ ]` TODO |
| Complete PWA service worker in platform-ui | Offline-capable web app | Dashboard migration complete | `[ ]` TODO |
| Stripe self-service billing portal UI | Revenue-critical for self-service sales | Billing module mapped | `[ ]` TODO |
| Setup Grafana + Loki on EKS | Observability — currently flying blind | Fluent Bit DaemonSet | `[ ]` TODO |

---

---

## AI Action Platform (R027–R031)

_Spec: `docs/system-upgrade/36-ai-action-platform.md` | ADR-022_

### R026.5 — AI Capability Context (can start alongside R027)

| Task | File/Location | Effort | Status |
|------|--------------|--------|--------|
| `AIUserCapabilityContext` dataclass + `AIActionSummary` | `apps/ai_action_platform/context.py` | 1 hr | `[ ]` R027 |
| `build_user_capability_context()` — full builder from JWT+DB | `apps/ai_action_platform/context_builder.py` | 2 hr | `[ ]` R027 |
| `build_ai_capability_prompt()` — context → compact Hebrew prompt | `apps/ai_action_platform/prompt_builder.py` | 1 hr | `[ ]` R027 |
| `GET /api/ai/context` endpoint (JWT-only, rate-limited, cached) | `apps/ai_action_platform/routes.py` | 1 hr | `[ ]` R027 |
| `context_version` Redis counter + `increment_context_version()` | `apps/ai_action_platform/context_builder.py` | 30 min | `[ ]` R027 |
| Invalidation hooks: role/module/flag/deactivation writes increment version | `apps/authentication/`, `apps/admin/` | 1 hr | `[ ]` R027 |
| Action filtering: `registry.get_actions_for_user()` — role-filtered summaries | `apps/ai_action_platform/registry.py` | 1 hr | `[ ]` R027 |
| `unavailable_action_categories` builder — safe category strings, not action IDs | `apps/ai_action_platform/context_builder.py` | 30 min | `[ ]` R027 |
| Role-specific prompt policies: viewer/technician/manager/admin/system_admin/ai_agent | `apps/ai_action_platform/prompt_builder.py` | 1 hr | `[ ]` R027 |
| Voice session prompt: `VOICE_PROMPT_ADDENDUM` + 8-action cap | `apps/ai_action_platform/prompt_builder.py` | 30 min | `[ ]` R029 |
| Stale context detection: HTTP 409 on context_version mismatch | `apps/ai_action_platform/routes.py` | 30 min | `[ ]` R027 |
| **Security tests: context layer** | | | |
| Test: context never returns secrets, tokens, or unauthorized action IDs | `apps/ai_action_platform/tests/test_context.py` | 1 hr | `[ ]` R027 |
| Test: stale permission — deactivate user mid-session, verify re-check blocks | `apps/ai_action_platform/tests/test_runtime_check.py` | 1 hr | `[ ]` R027 |
| Test: prompt injection — LLM output cannot override system capability section | `apps/ai_action_platform/tests/test_prompt_security.py` | 1 hr | `[ ]` R028 |
| Test: context_version invalidation triggers on role/module/flag changes | `apps/ai_action_platform/tests/test_invalidation.py` | 1 hr | `[ ]` R027 |
| Test: action registry filtering — viewer sees only READ, system_admin sees all | `apps/ai_action_platform/tests/test_registry.py` | 45 min | `[ ]` R027 |

### R027 — Registry + Audit Foundation + READ Tier

| Task | File/Location | Effort | Status |
|------|--------------|--------|--------|
| Create `apps/ai_action_platform/` module + INDEX.md | `apps/ai_action_platform/` | 30 min | `[ ]` R027 |
| `AIActionInvocation` + `AIActionConfirmationToken` + `AIActionApprovalRequest` models + migration | `apps/ai_action_platform/models.py` | 1 hr | `[ ]` R027 |
| `AIActionDescriptor` dataclass with all 25 fields (§35) | `apps/ai_action_platform/registry.py` | 1 hr | `[ ]` R027 |
| `AIActionRegistry` — loads static platform actions + org DB rows | `apps/ai_action_platform/registry.py` | 1 hr | `[ ]` R027 |
| `platform_actions.py` — 10 example descriptors from §35 (users, orgs, roles, modules, audit, helpdesk, ai.approval) | `apps/ai_action_platform/platform_actions.py` | 2 hr | `[ ]` R027 |
| `check_execution_viability()` — all 22 checks from §37; fails closed | `apps/ai_action_platform/executor.py` | 2 hr | `[ ]` R027 |
| `check_delegated_permission()` — role rank + capability_level matrix (§34) | `apps/ai_action_platform/permission_check.py` | 1 hr | `[ ]` R027 |
| Idempotency key: Redis SETNX, 60s TTL for all write/delete | `apps/ai_action_platform/executor.py` | 30 min | `[ ]` R027 |
| Hard delete gate: `hard_delete_allowed` check; `DELETE_HARD` blocked by default | `apps/ai_action_platform/executor.py` | 30 min | `[ ]` R027 |
| `ActionExecutor` — `internal_function` handler only + audit write mandatory | `apps/ai_action_platform/executor.py` | 1 hr | `[ ]` R027 |
| `POST /api/ai-actions/invoke` (READ tier only) + audit write | `apps/ai_action_platform/routes.py` | 1 hr | `[ ]` R027 |
| `GET /api/ai-actions/registry` — role-filtered action list (capability_level × role) | `apps/ai_action_platform/routes.py` | 30 min | `[ ]` R027 |
| `GET /api/ai-actions/history` — invocation history (org-scoped) | `apps/ai_action_platform/routes.py` | 30 min | `[ ]` R027 |
| JSON Schema files for all 10 platform actions in `platform_actions.py` | `apps/ai_action_platform/schemas/` | 1 hr | `[ ]` R027 |
| §38 readiness checklist: verify all infra items before R027 ships | `apps/ai_action_platform/tests/` | 30 min | `[ ]` R027 |
| **§38 Positive path tests** | | | |
| Test: READ action — list users → success + audit row | `tests/test_read_action.py` | 30 min | `[ ]` R027 |
| Test: CREATE action — create user → success + audit + idempotency enforced | `tests/test_create_action.py` | 45 min | `[ ]` R027 |
| Test: UPDATE action — update user field → success + audit | `tests/test_update_action.py` | 30 min | `[ ]` R027 |
| Test: DELETE_SOFT — deactivate user → success + audit + reversal action present | `tests/test_delete_soft.py` | 30 min | `[ ]` R027 |
| Test: APPROVE action — approve pending invocation → session resumes | `tests/test_approve.py` | 30 min | `[ ]` R027 |
| Test: BULK action — bulk update ≤ max_batch_size → per-item audit rows | `tests/test_bulk.py` | 45 min | `[ ]` R027 |
| **§38 Negative / security tests** | | | |
| Test: viewer tries DELETE_SOFT → `capability_level_denied` | `tests/test_security.py` | 30 min | `[ ]` R027 |
| Test: wrong org target → `target_scope_violation` | `tests/test_security.py` | 30 min | `[ ]` R027 |
| Test: permission revoked mid-session → re-check blocks (context does not) | `tests/test_stale_context.py` | 30 min | `[ ]` R027 |
| Test: expired confirmation token → `confirmation_invalid` | `tests/test_confirmation.py` | 20 min | `[ ]` R027 |
| Test: duplicate idempotency key within 60s → `idempotency_duplicate` | `tests/test_idempotency.py` | 20 min | `[ ]` R027 |
| Test: BULK > max_batch_size → `bulk_size_exceeded` | `tests/test_bulk.py` | 20 min | `[ ]` R027 |
| Test: admin tries DELETE_HARD → `hard_delete_blocked` | `tests/test_delete_policy.py` | 20 min | `[ ]` R027 |
| Test: service account alone tries CREATE → `permission_denied` | `tests/test_service_account.py` | 30 min | `[ ]` R027 |
| Test: voice session requests DELETE_SOFT → `voice_ineligible` | `tests/test_voice_constraints.py` | 20 min | `[ ]` R027 |
| Test: voice session requests SYSTEM action → `voice_ineligible` | `tests/test_voice_constraints.py` | 20 min | `[ ]` R027 |
| Test: audit write fails → action execution rolled back | `tests/test_audit.py` | 30 min | `[ ]` R027 |
| Test: cross-tenant action (non-system-admin) → `org_scope_mismatch` | `tests/test_security.py` | 30 min | `[ ]` R027 |
| Test: prompt injection — LLM output attempts registry modification → rejected | `tests/test_prompt_injection.py` | 30 min | `[ ]` R028 |
| Test: voice high-risk (danger_level=high) denial → `voice_ineligible` | `tests/test_voice_constraints.py` | 20 min | `[ ]` R027 |

### R028 — Confirmation Flow + WRITE Tier

| Task | File/Location | Effort | Status |
|------|--------------|--------|--------|
| `POST /api/ai-actions/request-confirmation` — creates token | `apps/ai_action_platform/routes.py` | 45 min | `[ ]` R028 |
| `POST /api/ai-actions/confirm` — verifies token, executes, audits | `apps/ai_action_platform/routes.py` | 1 hr | `[ ]` R028 |
| Confirmation token TTL + single-use enforcement | `apps/ai_action_platform/models.py` | 30 min | `[ ]` R028 |
| `AIActionDescriptor` JSON Schema validation on parameters | `apps/ai_action_platform/executor.py` | 45 min | `[ ]` R028 |
| `lib/platform/ai-actions/types.ts` — `AIActionRequest`, `AIActionResult`, `ConfirmationToken` | `lib/platform/ai-actions/types.ts` | 30 min | `[ ]` R028 |
| `useAIAction()` hook — request→confirm state machine | `lib/platform/ai-actions/hooks/use-ai-action.ts` | 2 hr | `[ ]` R028 |
| `AIActionPreviewCard` component — inline confirm card | `components/shared/ai-action-preview-card.tsx` | 1 hr | `[ ]` R028 |
| `AIActionHistory` table component — session action log | `components/shared/ai-action-history.tsx` | 1 hr | `[ ]` R028 |
| Rate limiting: Redis sliding window per org/action | `apps/ai_action_platform/routes.py` | 1 hr | `[ ]` R028 |
| Bulk action constraint: >5 DESTRUCTIVE resources/60s block | `apps/ai_action_platform/executor.py` | 30 min | `[ ]` R028 |

### R029 — Voice Confirmation + ALA Integration

| Task | File/Location | Effort | Status |
|------|--------------|--------|--------|
| `voiceInvocable` flag in `AIActionDescriptor` + registry filter | `apps/ai_action_platform/registry.py` | 30 min | `[ ]` R029 |
| Voice confirmation: 60s TTL + `confirmed_via: "voice"` | `apps/ai_action_platform/routes.py` | 45 min | `[ ]` R029 |
| ALA scenario aiActions section declaration | `apps/ala/scenarios/` | 1 hr | `[ ]` R029 |
| ALA handler: Gemini tool call → request-confirmation → confirm | `apps/ala/` | 2 hr | `[ ]` R029 |
| PII redaction pipeline for voice transcripts | `apps/ai_action_platform/pii_redactor.py` | 1 hr | `[ ]` R029 |
| Safe result summarization with `summary_template` | `apps/ai_action_platform/executor.py` | 45 min | `[ ]` R029 |

### R030 — Approval Queue + DESTRUCTIVE Tier

| Task | File/Location | Effort | Status |
|------|--------------|--------|--------|
| `AIActionApprovalRequest` — extends `ApprovalService` for AI actions | `apps/ai_action_platform/models.py` | 1 hr | `[ ]` R030 |
| `execute_approved_ai_action` Celery task | `apps/ai_action_platform/tasks.py` | 1 hr | `[ ]` R030 |
| SSE notification back to session on approval | `apps/ai_action_platform/routes.py` | 1 hr | `[ ]` R030 |
| DESTRUCTIVE tier: `ai_actions.destructive` permission check | `apps/ai_action_platform/permission_check.py` | 30 min | `[ ]` R030 |
| `http_api` handler in ActionExecutor (SSRF allowlist enforced) | `apps/ai_action_platform/executor.py` | 2 hr | `[ ]` R030 |
| Helpdesk approval queue UI: surface AI action approvals | `components/shared/approval/` | 1 hr | `[ ]` R030 |

### R031 — Module Manifests + Org Config UI

| Task | File/Location | Effort | Status |
|------|--------------|--------|--------|
| `ModuleAIAction` type extension in `lib/platform/modules/manifest.ts` | `lib/platform/modules/manifest.ts` | 30 min | `[ ]` R031 |
| `aiActions[]` section in Users + Orgs module manifests | `lib/modules/users/manifest.ts`, `lib/modules/organizations/manifest.ts` | 1 hr | `[ ]` R031 |
| JSON Schema files: `users.deactivate.v1.json`, `users.lookup.v1.json` | `apps/ai_action_platform/schemas/` | 45 min | `[ ]` R031 |
| Settings UI: org-level action enable/disable | `app/(dashboard)/settings/ai-actions/page.tsx` | 2 hr | `[ ]` R031 |
| Admin UI: `AIActionHistory` table in per-session detail view | `app/(dashboard)/helpdesk/sessions/[id]/page.tsx` | 1 hr | `[ ]` R031 |
| Command palette integration: AI action proposals searchable | `components/shell/command-palette.tsx` | 1 hr | `[ ]` R031 |
| AI action test harness: ALA text-chat scenario for `users.lookup` | `apps/ai_action_platform/tests/` | 1 hr | `[ ]` R031 |

---

---

## AI Provider Gateway — Phase 1 (pre-R027, BLOCKER)

_Must complete before any module ships LLM-calling features. Spec: `docs/system-upgrade/40-ai-provider-gateway-billing.md`_

| Task | File/Location | Effort | Status |
|------|--------------|--------|--------|
| `GatewayRequest` + `GatewayResponse` + `GatewayError` dataclasses | `apps/ai_providers/schemas.py` (new) | 1 hr | `[x]` R031 |
| `AIProviderGateway.call()` + `call_stream()` — wraps registry + adapters + cost_tracker | `apps/ai_providers/gateway.py` (new) | 3 hr | `[x]` R031 |
| `AIProviderPolicy.check()` — quota pre-check (Redis-first, DB-fallback) | `apps/ai_providers/policy.py` (new) | 2 hr | `[x]` R031 (Phase 1 only; Redis quota deferred Phase 2) |
| `AIProviderBillingAdapter.emit()` — bridges to `emit_billing_event()` | `apps/ai_providers/billing_adapter.py` (new) | 1 hr | `[x]` R031 |
| `AIUsageLog` migration: 14 new fields | `scripts/migrations/versions/20260424_extend_ai_usage_log.py` | 1 hr | `[x]` R031 |
| `chat_stream_with_usage()` method on `AIProviderAdapter` base | `apps/ai_providers/adapters/base.py` | 1 hr | `[ ]` Phase 2 |
| Streaming finalization: `gateway.finalize_stream(usage_log_id, is_partial)` | `apps/ai_providers/gateway.py` | 1 hr | `[ ]` Phase 2 |
| Quota Redis keys + TTL (monthly_tokens, daily_calls, voice_minutes, concurrent_streams) | `apps/ai_providers/policy.py` | 1 hr | `[ ]` Phase 2 |
| Non-billable mode gate: `non_billable=True` only allowed in test env | `apps/ai_providers/gateway.py` | 30 min | `[ ]` Phase 2 |
| CI lint rule: direct LLM provider imports blocked outside `apps/ai_providers/` | `scripts/check_no_direct_llm_imports.py` | 30 min | `[x]` R031 |
| Gateway unit tests: §16 core 8 tests | `apps/ai_providers/tests/test_gateway.py` | 2 hr | `[x]` R031 |
| Billing tests: §16 billing 5 tests | `apps/ai_providers/tests/test_gateway_billing.py` | 1 hr | `[ ]` Phase 2 |

## AI Provider Gateway — Phase 2 (P1 module migration, pre-production)

| Task | File(s) to migrate | Effort | Status |
|------|-------------------|--------|--------|
| Migrate `apps/helpdesk/services/incident_memory_service.py` | Direct openai/anthropic → gateway | 1 hr | `[ ]` R027 |
| Migrate `apps/helpdesk/services/screen_analyzer.py` | Direct openai → gateway | 1 hr | `[ ]` R027 |
| Migrate `apps/helpdesk/services/vision_service.py` | Direct anthropic → gateway | 1 hr | `[ ]` R027 |
| Migrate `apps/mobile_voice/conversation_engine.py` | Direct gemini → gateway | 2 hr | `[ ]` R027 |
| Migrate `apps/mobile_voice/title_generator.py` | Direct openai → gateway | 30 min | `[ ]` R027 |
| Migrate `apps/ai_agents/engine/agent_runner.py` | Direct openai → gateway | 2 hr | `[ ]` R027 |
| Migrate `apps/ala/tasks/commitment_task.py` | Direct openai → gateway | 1 hr | `[ ]` R027 |
| Test: P1 migrated modules — usage log created, billing emitted | `apps/ai_providers/tests/test_p1_migration.py` | 2 hr | `[ ]` R027 |

## AI Provider Gateway — Phase 2 — P0 Migrations (pre-production, URGENT)

_Audit source: `docs/system-upgrade/41-direct-llm-call-audit-and-migration.md §13`_
_These files have no key_resolver and no billing — highest risk._

| Task | File | Effort | Status |
|------|------|--------|--------|
| Migrate `apps/voice_support/call_manager.py` | module-level genai import — fails at load if key missing | 1 hr | `[ ]` R031 |
| Migrate `apps/fitness_nutrition/ai_service.py` | module-level genai import | 30 min | `[x]` R031 |
| Migrate `apps/fitness_nutrition/ai_coach.py` | module-level genai import | 30 min | `[ ]` R031 |
| Migrate `apps/jira_integration/ai_service.py` | no key_resolver, no billing, multi-provider | 2 hr | `[ ]` R031 |
| Migrate `apps/jira_integration/troubleshooting_service.py` | direct openai_client, no billing | 1 hr | `[ ]` R031 |
| Migrate `apps/jira_integration/routes.py` + `devops_ai_service.py` | inline openai imports | 1 hr | `[ ]` R031 |
| Migrate `apps/ala/tasks/commitment_task.py` | Celery task, voice adjacent, no billing | 1 hr | `[ ]` R031 |
| Delete `apps/personal_info/ai_chat/providers/openai_provider.py` | bypass wrapper, Critical PII | 15 min | `[ ]` R031 |
| Delete `apps/personal_info/ai_chat/providers/gemini_provider.py` | bypass wrapper, Critical PII | 15 min | `[ ]` R031 |

## AI Provider Gateway — Phase 3 (P2/P3 migration, production cleanup)

| Task | Modules | Effort | Status |
|------|---------|--------|--------|
| Migrate `apps/ops_intelligence/` (5 files) | ops_query_service, rag_indexer, summarizer, trend_analyzer, bootstrap_catalog | 4 hr | `[ ]` R032 |
| Migrate `apps/personal_info/` (8 files) | secretary_service, rag_answer_service, memory_indexing, transcription, routes, etc. | 5 hr | `[ ]` R032 |
| Migrate `apps/life_assistant/` (3 files) | gemini_client (delete), openai_fallback (delete), recording_transcriber | 2 hr | `[ ]` R032 |
| Migrate remaining 15+ files | see doc 41 §15 P2 list | 6 hr | `[ ]` R032 |
| Delete `apps/life_assistant/services/gemini_client.py` | after migration verified | 15 min | `[ ]` R031 |
| Delete `apps/life_assistant/services/openai_fallback.py` | after migration verified | 15 min | `[ ]` R031 |
| Delete `apps/personal_info/ai_chat/providers/` wrapper layer | after migration verified | 30 min | `[ ]` R031 |
| Quota tests: monthly limit blocks, resets on new month | `apps/ai_providers/tests/test_quota.py` | 1 hr | `[ ]` R031 |
| Voice usage tests: session linkage, quota_bucket | `apps/ai_providers/tests/test_voice_usage.py` | 1 hr | `[ ]` R030 |
| Floating assistant billing tests: §16 floating 4 tests | `apps/ai_providers/tests/test_floating_billing.py` | 1 hr | `[ ]` R033 |
| AI action billing linkage tests: §16 AI action 2 tests | `apps/ai_providers/tests/test_action_billing.py` | 1 hr | `[ ]` R028 |

---

## Shared Services Enforcement — P0 Tasks (R032–R033, ADR-028)

_Spec: `docs/system-upgrade/43-shared-services-enforcement.md`_

| Task | File/Location | Effort | Status |
|------|--------------|--------|--------|
| Wire `check_no_direct_llm_imports.py` to CI (warn-only) | `.github/workflows/lint.yml` | 30 min | `[ ]` R034 |
| Add AI-agent guardrail checklist (§12) to `CLAUDE.md` (platformengineer) | `CLAUDE.md` | 30 min | `[x] R032` |
| Add AI-agent guardrail checklist (§12) to `CLAUDE.md` (platform-ui) | `CLAUDE.md` | 30 min | `[x] R032` |
| Write `scripts/check_no_org_id_from_body.py` + baseline scan | `scripts/check_no_org_id_from_body.py` | 1 hr | `[ ]` R034 |
| Write `scripts/check_json_api_auth.py` + baseline scan | `scripts/check_json_api_auth.py` | 1 hr | `[ ]` R034 |
| Migrate remaining P0 LLM files: ai_coach, voice_support, personal_info/ai_chat/providers/, jira_integration | `apps/*/` | 3 hr | `[ ]` R034 |
| Add allowlist entries for known violations in `check_no_direct_llm_imports.py` with R0NN targets | `scripts/check_no_direct_llm_imports.py` | 30 min | `[ ]` R034 |
| Create `ActionButton` component (loading spinner + disabled state during mutation) | `components/shared/action-button.tsx` | 1 hr | `[ ]` R033 |
| Create module IMPLEMENTATION.md template from doc 43 §10 checklist | `docs/templates/IMPLEMENTATION_TEMPLATE.md` | 30 min | `[ ]` R033 |

## Shared Services Enforcement — P1 Tasks (R034–R035)

| Task | File/Location | Effort | Status |
|------|--------------|--------|--------|
| Add `window.confirm()` grep check to platform-ui CI | `.github/workflows/lint.yml` | 15 min | `[ ]` R034 |
| Add direct `fetch()` check to platform-ui CI | `scripts/check_no_direct_fetch_in_components.py` | 1 hr | `[ ]` R034 |
| Add inline query key check to platform-ui CI | `scripts/check_no_inline_query_keys.ts` | 1 hr | `[ ]` R034 |
| Move `check_no_direct_llm_imports.py` from warn → hard-fail (after allowlist stable) | `.github/workflows/lint.yml` | 15 min | `[ ]` R035 |
| Move `check_json_api_auth.py` from warn → hard-fail | `.github/workflows/lint.yml` | 15 min | `[ ]` R035 |

---

## Consistency-Pass Blockers (B1–B10, pre-R027)

_Must complete before any write-tier AI action implementation. Spec: `docs/system-upgrade/39-ai-architecture-consistency-pass.md §12`_

| Task | File/Location | Effort | Status |
|------|--------------|--------|--------|
| **B1** — Decide delegation token algorithm (HS256 vs RS256) + signing key location | ADR + `scripts/secrets/ssm-secrets.sh push` | 2 hr (design) | `[ ]` pre-R027 |
| **B2** — `AIActionDescriptor v1` Python dataclass — canonical field names from doc 39 §05 | `apps/ai_action_platform/registry.py` | 1 hr | `[ ]` pre-R027 |
| **B3** — Add `voice_confirmation_ttl_seconds` to `AIActionConfirmationToken` model | `apps/ai_action_platform/models.py` | 30 min | `[ ]` pre-R027 |
| **B4** — `check_execution_viability()` replaces `risk_tier` checks with `capability_level` | `apps/ai_action_platform/executor.py` | 1 hr | `[ ]` pre-R027 |
| **B5** — `ModuleAIAction` TypeScript: `voiceEligible`, `capabilityLevel`, `rollbackSupported`, `outputSchemaId` | `lib/platform/modules/manifest.ts` | 30 min | `[ ]` pre-R027 |
| **B6** — `AIActionSummary`: `voice_eligible`, `capability_level` field updates | `apps/ai_action_platform/context.py` | 30 min | `[ ]` pre-R027 |
| **B7** — Update all 10 `platform_actions.py` examples to use v1 field names | `apps/ai_action_platform/platform_actions.py` | 1 hr | `[ ]` pre-R027 |
| **B8** — Prompt injection test: structured output parsing verified | `apps/ai_action_platform/tests/test_injection.py` | 1 hr | `[ ]` pre-R027 |
| **B9** — `rollback_supported` declared for all EXECUTE + http_api actions | `apps/ai_action_platform/platform_actions.py` | 30 min | `[ ]` pre-R027 |
| **B10** — Partial failure format in `execute_bulk_action()` returns `{total, succeeded, failed, failed_items}` | `apps/ai_action_platform/executor.py` | 1 hr | `[ ]` pre-R027 |
| Delegation token nonce storage: Redis key `delegated_token_nonce:{nonce}` TTL = token TTL | `apps/ai_action_platform/token_service.py` | 1 hr | `[ ]` B1 unblocked |
| Delegation token replay protection test (8 tests from doc 39 §08) | `apps/ai_action_platform/tests/test_delegation_token.py` | 2 hr | `[ ]` B1 unblocked |

---

## R032 — Floating AI Assistant: Shell Infra + Context Registry

| Task | File/Location | Effort | Status |
|------|--------------|--------|--------|
| `AIAssistantSessionState` Zustand store | `lib/stores/ai-assistant-session.ts` | 1 hr | `[ ]` R032 |
| `FloatingAIButton` component (idle state only, no LLM) | `components/shell/floating-ai-assistant/FloatingAIButton.tsx` | 30 min | `[ ]` R032 |
| `useRegisterPageContext()` hook | `lib/hooks/use-register-page-context.ts` | 30 min | `[ ]` R032 |
| `PageAIContext` TypeScript interface + validation | `lib/types/ai-assistant.ts` | 30 min | `[ ]` R032 |
| Mount `FloatingAIButton` in shell layout | `app/(dashboard)/layout.tsx` | 15 min | `[ ]` R032 |
| Wire `useRegisterPageContext()` in helpdesk session detail page | `app/(dashboard)/helpdesk/sessions/[id]/page.tsx` | 30 min | `[ ]` R032 |
| Wire `useRegisterPageContext()` in ticket list page | `app/(dashboard)/helpdesk/tickets/page.tsx` | 15 min | `[ ]` R032 |
| Route-change handler: update `currentPageId` + `lastPageContextHash` (no LLM call) | `components/shell/floating-ai-assistant/useRouteContextSync.ts` | 45 min | `[ ]` R032 |
| `PageContextDiff` computation utility | `lib/utils/ai-context-diff.ts` | 45 min | `[ ]` R032 |
| Unit test: route change updates state, does NOT trigger LLM | `lib/stores/ai-assistant-session.test.ts` | 30 min | `[ ]` R032 |
| Unit test: `useRegisterPageContext()` stores context, no API call | `lib/hooks/use-register-page-context.test.ts` | 30 min | `[ ]` R032 |

## R033 — Floating AI Assistant: Drawer + Chat + LLM Wiring

| Task | File/Location | Effort | Status |
|------|--------------|--------|--------|
| `AIAssistantDrawer` (shadcn Sheet) | `components/shell/floating-ai-assistant/AIAssistantDrawer.tsx` | 1 hr | `[ ]` R033 |
| `AIAssistantChat` message list + input | `components/shell/floating-ai-assistant/AIAssistantChat.tsx` | 1.5 hr | `[ ]` R033 |
| `GET /api/ai/context` integration (capability context load on first open) | `lib/api/ai-context.ts` | 45 min | `[ ]` R033 |
| First LLM message send — attach capability context + current `PageAIContext` | `lib/stores/ai-assistant-session.ts` | 1 hr | `[ ]` R033 |
| `lastLLMContextHash` check — skip context re-send if unchanged | `lib/stores/ai-assistant-session.ts` | 30 min | `[ ]` R033 |
| `PageContextDiff` send policy — attach diff on next user message if `relevantToObjective: true` | `lib/stores/ai-assistant-session.ts` | 30 min | `[ ]` R033 |
| `context_version` stale detection — HTTP 409 → re-fetch context | `lib/api/ai-context.ts` | 30 min | `[ ]` R033 |
| Wire `useRegisterPageContext()` in user management + org settings pages | `app/(dashboard)/users/`, `app/(dashboard)/settings/` | 45 min | `[ ]` R033 |
| E2E test: open assistant → LLM called once; navigate → no LLM call; send message → LLM called with diff | `e2e/floating-ai-assistant.spec.ts` | 1 hr | `[ ]` R033 |
| Security test: `PageAIContext.availableActionIds` filtered to user's permissions before LLM send | `lib/stores/ai-assistant-session.test.ts` | 30 min | `[ ]` R033 |

## R034 — Floating AI Assistant: Action Proposals + Confirmation Flow

| Task | File/Location | Effort | Status |
|------|--------------|--------|--------|
| `AIActionPreviewCard` component (action name, description, params, danger badge) | `components/shell/floating-ai-assistant/AIActionPreviewCard.tsx` | 1 hr | `[ ]` R034 |
| Confirmation flow: `pendingConfirmationTokenId` tracked in session state | `lib/stores/ai-assistant-session.ts` | 30 min | `[ ]` R034 |
| `POST /api/ai/action/confirm` integration + token expiry handling | `lib/api/ai-actions.ts` | 45 min | `[ ]` R034 |
| Result display: success / failure / denied feedback in chat | `components/shell/floating-ai-assistant/AIAssistantChat.tsx` | 30 min | `[ ]` R034 |
| Action proposal rendering in chat message list | `components/shell/floating-ai-assistant/AIAssistantChat.tsx` | 30 min | `[ ]` R034 |
| Test: token expires during confirmation → user sees expiry message, not error | `e2e/floating-ai-assistant.spec.ts` | 30 min | `[ ]` R034 |
| Test: navigate away mid-confirmation → `pendingActionId` survives → returned-to page resumes | `e2e/floating-ai-assistant.spec.ts` | 30 min | `[ ]` R034 |

## R035 — Floating AI Assistant: Voice Mode + Objective Persistence

| Task | File/Location | Effort | Status |
|------|--------------|--------|--------|
| Voice mode UI toggle in drawer | `components/shell/floating-ai-assistant/AIAssistantDrawer.tsx` | 30 min | `[ ]` R035 |
| Voice-eligible action filtering in assistant (use `voice_eligible` from capability context) | `lib/stores/ai-assistant-session.ts` | 30 min | `[ ]` R035 |
| Voice action read-back before confirm (display + TTS) | `components/shell/floating-ai-assistant/AIAssistantChat.tsx` | 1 hr | `[ ]` R035 |
| `activeObjective` persistence: workflow resumption on re-open | `lib/stores/ai-assistant-session.ts` | 30 min | `[ ]` R035 |
| Workflow resumption prompt: navigate away mid-objective → re-open drawer → assistant resumes | `lib/stores/ai-assistant-session.ts` | 45 min | `[ ]` R035 |
| Org switch → full session reset | `lib/stores/ai-assistant-session.ts` | 15 min | `[ ]` R035 |
| Auth expiry → session clear | `lib/stores/ai-assistant-session.ts` | 15 min | `[ ]` R035 |
| Test: voice mode only shows `voice_eligible: true` actions | `lib/stores/ai-assistant-session.test.ts` | 30 min | `[ ]` R035 |
| Test: org switch resets `conversationId`, `activeObjective`, `pendingActionId` | `lib/stores/ai-assistant-session.test.ts` | 30 min | `[ ]` R035 |

---

## AI Providers Hub — R035 (Backend) + R036 (UI Core) + R037 (Advanced)

**Spec:** `docs/system-upgrade/44-ai-providers-hub.md` | **ADR:** ADR-029

### R035 — Backend JWT Routes + Service Routing Models (platformengineer)

**Spec:** `docs/system-upgrade/44-ai-providers-hub.md §16–§28` | **ADR:** ADR-030

| Task | File | Est. | Status |
|------|------|------|--------|
| Create `apps/ai_providers/api_routes.py` — all 39 endpoints with `@jwt_required + g.jwt_user` | `apps/ai_providers/api_routes.py` | 4 hr | `[ ]` R035 |
| Register `api_blueprint` in `apps/__init__.py` | `apps/__init__.py` | 15 min | `[ ]` R035 |
| Migration: add `ai_providers.*` + `ai_routes.*` permissions to DB | `scripts/migrations/versions/YYYYMMDD_add_ai_providers_permissions.py` | 30 min | `[ ]` R035 |
| Migration: `AIServiceDefinition` + `AIServiceProviderRoute` tables | `scripts/migrations/versions/YYYYMMDD_add_ai_service_definitions.py` | 1 hr | `[ ]` R035 |
| Migration: extend `AIUsageLog` with 5 routing columns | `scripts/migrations/versions/YYYYMMDD_extend_ai_usage_log_routing.py` | 30 min | `[ ]` R035 |
| Seed data: 27 service definitions in migration or seed script | `scripts/seeds/ai_service_definitions.py` | 1 hr | `[ ]` R035 |
| Update `registry.py` — `resolve_service_route()` with 9-step hierarchy | `apps/ai_providers/registry.py` | 2 hr | `[ ]` R035 |
| Remove `provider_id`/`model` from public `GatewayRequest`; add `migration_mode` flag | `apps/ai_providers/gateway.py`, `apps/ai_providers/schemas.py` | 1 hr | `[ ]` R035 |
| Add `route_debug: RouteDebugInfo` to `GatewayResponse` | `apps/ai_providers/schemas.py` | 30 min | `[ ]` R035 |
| Add `/api/proxy/ai-providers/*` to proxy route | `app/api/proxy/[...path]/route.ts` | 15 min | `[ ]` R035 |
| Integration tests for all new endpoints + routing resolution | `apps/ai_providers/tests/test_api_routes.py` | 3 hr | `[ ]` R035 |

### R036 — Hub UI Core (platform-ui)

| Task | File | Est. | Status |
|------|------|------|--------|
| `lib/api/ai-providers.ts` — typed fetch functions | `lib/api/ai-providers.ts` | 1 hr | `[ ]` R036 |
| `queryKeys.aiProviders.*` additions | `lib/api/query-keys.ts` | 30 min | `[ ]` R036 |
| TypeScript interfaces: AIProvider, AIUsageSummary, AIProviderHealth, AIOverviewStats, etc. | `lib/api/types.ts` | 30 min | `[ ]` R036 |
| Zod schemas for all forms | `lib/modules/ai-providers/schemas.ts` | 30 min | `[ ]` R036 |
| Overview page | `app/(dashboard)/ai-providers/page.tsx` | 1 hr | `[ ]` R036 |
| Providers list page | `app/(dashboard)/ai-providers/providers/page.tsx` | 1.5 hr | `[ ]` R036 |
| Provider detail page | `app/(dashboard)/ai-providers/providers/[id]/page.tsx` | 1.5 hr | `[ ]` R036 |
| Defaults page | `app/(dashboard)/ai-providers/defaults/page.tsx` | 1 hr | `[ ]` R036 |
| Module overrides page | `app/(dashboard)/ai-providers/overrides/page.tsx` | 1 hr | `[ ]` R036 |
| Usage & billing page | `app/(dashboard)/ai-providers/usage/page.tsx` | 1.5 hr | `[ ]` R036 |
| Sidebar nav + command palette + `g`+`i` shortcut | `components/shell/app-sidebar.tsx`, `components/shell/command-palette.tsx` | 30 min | `[ ]` R036 |

### R037 — Hub UI Advanced + Service Routing Matrix (platform-ui)

| Task | File | Est. | Status |
|------|------|------|--------|
| Fallback chains editor | `app/(dashboard)/ai-providers/fallback/page.tsx` | 2 hr | `[ ]` R037 |
| Quotas page | `app/(dashboard)/ai-providers/quotas/page.tsx` | 1 hr | `[ ]` R037 |
| Health monitor + circuit breaker reset | `app/(dashboard)/ai-providers/health/page.tsx` | 1.5 hr | `[ ]` R037 |
| Migration status (system-admin only) | `app/(dashboard)/ai-providers/migration/page.tsx` | 1 hr | `[ ]` R037 |
| TypeScript: AIServiceDefinition, AIServiceProviderRoute, RouteDebugInfo | `lib/api/types.ts` | 30 min | `[ ]` R037 |
| Zod: `serviceRouteFormSchema` | `lib/modules/ai-providers/schemas.ts` | 15 min | `[ ]` R037 |
| Query keys: `queryKeys.aiRoutes.*` | `lib/api/query-keys.ts` | 15 min | `[ ]` R037 |
| Service Routing Matrix list page | `app/(dashboard)/ai-providers/services/page.tsx` | 2 hr | `[ ]` R037 |
| Service route detail page | `app/(dashboard)/ai-providers/services/[serviceId]/page.tsx` | 2 hr | `[ ]` R037 |
| Edit service route page | `app/(dashboard)/ai-providers/services/[serviceId]/edit/page.tsx` | 1.5 hr | `[ ]` R037 |

---

## Module Manager Redesign — R038A–R038I

**Spec:** `docs/system-upgrade/45-module-manager-redesign.md` | **ADR:** ADR-031, ADR-032

> Gate: All open questions in doc 45 §18 answered ✅ — see `docs/system-upgrade/46-module-manager-implementation-inventory.md`

### R038A — Module Manager Contract & Migration Plan ✅

Documentation only — complete. See `docs/system-upgrade/45-module-manager-redesign.md` §01–§21.

### R038B0 — Open Questions & Implementation Inventory ✅

Documentation only — complete. See `docs/system-upgrade/46-module-manager-implementation-inventory.md`.

**Key findings from R038B0:**
- FK targets confirmed: `organizations.id`, `users.id`
- Manifest filename corrected: `manifest.v2.json` (not `module.manifest.json`)
- `module_key` = `Module.name` (no new column needed)
- `ModuleVersion` must be in R038B scope (not R038H) to avoid breaking FK migration
- Navigation Source of Truth added to doc 45 §33
- Planned nav API: `GET /api/org/modules/navigation`
- `/api/modules/enabled-menu` has no auth — security gap to fix in R038D
- `apps/__init__.py:193` already has partial org filtering via `OrgFeatureFlag` (migration hook)

### R038B — Additive Schema Foundation (platformengineer) ✅ COMPLETE (R040, commit abdf3bc3)

Backend only. No UI. All additive — no destructive changes.

> **Storage constraint (ADR-036, 2026-04-25):** `platform_managed_shared_db` only.
> No BYODB, no TenantDataStore, no TenantDataRouter. All tables org_id-scoped.

| Task | File | Status |
|------|------|--------|
| Migration: `org_modules` table (OrgModule) | `migrations/versions/20260425_add_org_modules.py` | `[x]` |
| Migration: `module_versions` table (ModuleVersion) | `migrations/versions/20260425_add_module_versions.py` | `[x]` |
| Migration: `module_licenses` table (scaffold) | `migrations/versions/20260425_add_module_licenses.py` | `[x]` |
| Migration: `module_dependencies` table | `migrations/versions/20260425_add_module_dependencies.py` | `[x]` |
| Migration: `org_module_settings` table | `migrations/versions/20260425_add_org_module_settings.py` | `[x]` |
| Migration: `module_logs` — add nullable `org_id`, `user_id`, `module_key` | `migrations/versions/20260425_extend_module_logs.py` | `[x]` |
| Migration: `modules.system_status` column | `migrations/versions/20260425_add_module_system_status.py` | `[x]` |
| Models: ModuleVersion, OrgModule, OrgModuleSettings, ModuleDependency, ModuleLicense | `apps/module_manager/models.py` | `[x]` |
| Seed helpers: seed_module_versions(), seed_core_org_modules() | `apps/module_manager/seeds.py` | `[x]` |
| Tests: 43 structural tests (all pass) | `apps/module_manager/tests/test_r040_schema.py` | `[x]` |
| ModuleDependency seed from JSON blob | deferred → R038C (format unverified) | `[~]` |
| ModulePurchase → ModuleLicense backfill | deferred → R038I (org string ambiguous) | `[~]` |
| module_permissions seed | deferred → R038C | `[~]` |
| module_purchases extend (org_id FK) | deferred → R038I | `[~]` |

### R038C — Read Model + Availability Helper (platformengineer)

Backend only. No UI.

| Task | File | Est. | Status |
|------|------|------|--------|
| `ModuleRegistry.sync_from_manifests()` — manifest → DB catalog sync | `apps/module_manager/registry.py` | 1 hr | `[ ]` R038C |
| `is_module_available(org_id, module_key)` — authoritative check | `apps/module_manager/services.py` | 30 min | `[ ]` R038C |
| `get_enabled_modules_for_org(org_id)` | `apps/module_manager/services.py` | 20 min | `[ ]` R038C |
| `ModuleEnforcementService.check_enable_preconditions()` — 8-step fail-closed | `apps/module_manager/services.py` | 1 hr | `[ ]` R038C |
| `ModuleCompatLayer.get_enabled_modules()` — read-through (old + new) | `apps/module_manager/services.py` | 30 min | `[ ]` R038C |
| Write tests from §14 (read-only scenarios: 8 tests) | `apps/module_manager/tests/test_availability.py` | 1 hr | `[ ]` R038C |

### R038D — JWT Read APIs (platformengineer)

Backend only. No UI.

| Task | File | Est. | Status |
|------|------|------|--------|
| `GET /api/org/modules` — list enabled modules for calling org | `apps/module_manager/api_routes.py` | 30 min | `[ ]` R038D |
| `GET /api/org/modules/<key>` — module detail + settings | `apps/module_manager/api_routes.py` | 30 min | `[ ]` R038D |
| `GET /api/org/modules/<key>/settings` — org module settings | `apps/module_manager/api_routes.py` | 30 min | `[ ]` R038D |
| `GET /api/modules/catalog` — system catalog (system_admin) | `apps/module_manager/api_routes.py` | 30 min | `[ ]` R038D |
| `GET /api/modules/catalog/<key>` — catalog detail + dependency graph | `apps/module_manager/api_routes.py` | 30 min | `[ ]` R038D |
| `GET /api/modules/licenses` — license list (system_admin) | `apps/module_manager/api_routes.py` | 20 min | `[ ]` R038D |
| **`GET /api/org/modules/navigation`** — nav items for current user/org (JWT, org-scoped, 60s TTL) | `apps/module_manager/api_routes.py` | 45 min | `[ ]` R038D |
| Fix `/api/modules/enabled-menu` — add `@login_required` (security gap, no auth currently) | `apps/module_manager/routes.py:2027` | 10 min | `[ ]` R038D |
| Register `module_manager_api_bp` in `apps/__init__.py` | `apps/__init__.py` | 15 min | `[ ]` R038D |
| Integration tests: read API auth + org scoping (4 tests) | `apps/module_manager/tests/test_api_routes.py` | 45 min | `[ ]` R038D |

### R038E — platform-ui Read-Only Module Hub (platform-ui, after R038D deployed)

| Task | File | Est. | Status |
|------|------|------|--------|
| TypeScript types: `OrgModule`, `Module`, `ModuleLicense`, `ModuleLog` | `lib/api/types.ts` | 30 min | `[ ]` R038E |
| Zod schemas: module forms | `lib/modules/modules/schemas.ts` | 30 min | `[ ]` R038E |
| Query keys: `queryKeys.modules.*` | `lib/api/query-keys.ts` | 15 min | `[ ]` R038E |
| `lib/api/modules.ts` — typed fetch functions | `lib/api/modules.ts` | 30 min | `[ ]` R038E |
| `/modules` list page — org view | `app/(dashboard)/modules/page.tsx` | 1.5 hr | `[ ]` R038E |
| `/modules/[key]` detail page + settings (read-only) | `app/(dashboard)/modules/[key]/page.tsx` | 1.5 hr | `[ ]` R038E |
| `/modules/catalog` — system catalog (system_admin only) | `app/(dashboard)/modules/catalog/page.tsx` | 1.5 hr | `[ ]` R038E |

### R038F — Write APIs + Enable/Disable Flow (platformengineer + platform-ui)

| Task | File | Est. | Status |
|------|------|------|--------|
| `POST /api/org/modules/<key>/enable` — full precondition checks | `apps/module_manager/api_routes.py` | 1 hr | `[ ]` R038F |
| `POST /api/org/modules/<key>/disable` — dependent module warning | `apps/module_manager/api_routes.py` | 45 min | `[ ]` R038F |
| `PUT /api/org/modules/<key>/settings` — settings update | `apps/module_manager/api_routes.py` | 30 min | `[ ]` R038F |
| `POST /api/modules/catalog/sync` — manifest sync trigger | `apps/module_manager/api_routes.py` | 30 min | `[ ]` R038F |
| License CRUD endpoints | `apps/module_manager/api_routes.py` | 45 min | `[ ]` R038F |
| Enable/disable flow in platform-ui with `ConfirmActionDialog` | `app/(dashboard)/modules/[key]/page.tsx` | 1 hr | `[ ]` R038F |
| Dependent module warning dialog | `components/modules/modules/dependent-warning-dialog.tsx` | 45 min | `[ ]` R038F |
| Write tests from §14 (write scenarios: 7 tests) | `apps/module_manager/tests/test_api_routes.py` | 1 hr | `[ ]` R038F |

### R038G — Cleanup / Deprecation (after 30-day production burn-in)

| Task | File | Est. | Status |
|------|------|------|--------|
| Remove `modules.is_installed`, `is_enabled`, `dependencies`, `config_data`, `installed_version` | migration | 45 min | `[ ]` R038G |
| Remove `module_logs.user` (string) | migration | 15 min | `[ ]` R038G |
| Remove `script_executions.executed_by` (string) | migration | 15 min | `[ ]` R038G |
| Drop `module_settings` table | migration | 15 min | `[ ]` R038G |
| Drop `module_purchases` table | migration | 15 min | `[ ]` R038G |
| Remove `ModuleCompatLayer` read-through helper | `apps/module_manager/services.py` | 30 min | `[ ]` R038G |
| Update module docs: INDEX.md, IMPLEMENTATION.md | `apps/module_manager/` | 30 min | `[ ]` R038G |

### R038H — Versioning + Upgrade Workflow (after R038F stable ≥2 weeks)

**Spec:** `docs/system-upgrade/45-module-manager-redesign.md §22–§25` | **ADR:** ADR-032

#### R038H-A — Schema (platformengineer)

| Task | File | Est. | Status |
|------|------|------|--------|
| Migration: `module_versions` table (ModuleVersion) | `scripts/migrations/versions/...add_module_version.py` | 1 hr | `[ ]` R038H |
| Migration: `module_upgrade_jobs` table (ModuleUpgradeJob) | `scripts/migrations/versions/...add_module_upgrade_job.py` | 1 hr | `[ ]` R038H |
| Migration: `module_packages` table (ModulePackage) | `scripts/migrations/versions/...add_module_package.py` | 45 min | `[ ]` R038H |
| Migration: `org_modules` — add `installed_version_id`, `target_version_id`, `rollback_version_id`, `last_upgrade_job_id`, `auto_update_policy`, `release_channel_allowed` | `scripts/migrations/versions/...extend_org_module_versioning.py` | 45 min | `[ ]` R038H |
| Data seed: `ModuleVersion` rows from existing `Module.version` values | `scripts/seeds/module_versions.py` | 30 min | `[ ]` R038H |
| Data seed: backfill `OrgModule.installed_version_id` | `scripts/seeds/org_module_versions.py` | 30 min | `[ ]` R038H |
| Add versioning + upgrade permissions to DB | `scripts/migrations/versions/...add_upgrade_permissions.py` | 15 min | `[ ]` R038H |

#### R038H-B — Upgrade Service (platformengineer)

| Task | File | Est. | Status |
|------|------|------|--------|
| `ModuleVersionService.publish_version()` | `apps/module_manager/version_service.py` | 1 hr | `[ ]` R038H |
| `ModuleUpgradeService.initiate_upgrade()` — 9-step workflow | `apps/module_manager/upgrade_service.py` | 2 hr | `[ ]` R038H |
| `ModuleUpgradeService.run_dry_run()` — validation step | `apps/module_manager/upgrade_service.py` | 1 hr | `[ ]` R038H |
| `ModuleUpgradeService.execute_upgrade()` — migration + rollback | `apps/module_manager/upgrade_service.py` | 2 hr | `[ ]` R038H |
| `ModuleUpgradeService.rollback()` — with irreversibility check | `apps/module_manager/upgrade_service.py` | 1 hr | `[ ]` R038H |
| Package checksum verifier | `apps/module_manager/package_service.py` | 30 min | `[ ]` R038H |
| Celery task: `run_module_upgrade_job` | `apps/module_manager/tasks.py` | 1 hr | `[ ]` R038H |

#### R038H-C — APIs + UI (platformengineer + platform-ui)

| Task | File | Est. | Status |
|------|------|------|--------|
| `GET /api/org/modules/<key>/versions` | `apps/module_manager/api_routes.py` | 30 min | `[ ]` R038H |
| `POST /api/org/modules/<key>/upgrade` | `apps/module_manager/api_routes.py` | 45 min | `[ ]` R038H |
| `POST /api/org/modules/<key>/rollback` | `apps/module_manager/api_routes.py` | 30 min | `[ ]` R038H |
| `GET /api/modules/upgrade-jobs` | `apps/module_manager/api_routes.py` | 20 min | `[ ]` R038H |
| `GET /api/modules/versions/<module_key>` (system catalog, all versions) | `apps/module_manager/api_routes.py` | 20 min | `[ ]` R038H |
| `POST /api/modules/versions` (publish, system-admin) | `apps/module_manager/api_routes.py` | 30 min | `[ ]` R038H |
| `POST /api/modules/packages` (upload metadata, system-admin) | `apps/module_manager/api_routes.py` | 30 min | `[ ]` R038H |
| `/modules/installed/[key]/versions` page | `app/(dashboard)/modules/[key]/versions/page.tsx` | 1.5 hr | `[ ]` R038H |
| `/modules/installed/[key]/upgrade` page + `ConfirmActionDialog` | `app/(dashboard)/modules/[key]/upgrade/page.tsx` | 2 hr | `[ ]` R038H |
| `/modules/upgrade-jobs` page (job history + status) | `app/(dashboard)/modules/upgrade-jobs/page.tsx` | 1.5 hr | `[ ]` R038H |

### R038I — Marketplace + Store (after billing integration decision, gate: OQ-03)

**Spec:** `docs/system-upgrade/45-module-manager-redesign.md §26–§28` | **ADR:** ADR-032

#### R038I-A — Schema (platformengineer)

| Task | File | Est. | Status |
|------|------|------|--------|
| Migration: `module_store_listings` table (ModuleStoreListing) | `scripts/migrations/versions/...add_module_store_listing.py` | 45 min | `[ ]` R038I |
| Migration: extend `module_licenses` with `license_type`, `seats_limit`, `billing_subscription_id`, `purchased_by`, `approved_by` | `scripts/migrations/versions/...extend_module_license_v2.py` | 30 min | `[ ]` R038I |
| Data seed: `ModuleStoreListing` rows from existing `Module` records | `scripts/seeds/module_store_listings.py` | 45 min | `[ ]` R038I |

#### R038I-B — APIs (platformengineer)

| Task | File | Est. | Status |
|------|------|------|--------|
| `GET /api/modules/store` — browse marketplace (filtered by org plan) | `apps/module_manager/api_routes.py` | 30 min | `[ ]` R038I |
| `GET /api/modules/store/<key>` — store detail | `apps/module_manager/api_routes.py` | 20 min | `[ ]` R038I |
| `POST /api/org/modules/<key>/trial` — start trial | `apps/module_manager/api_routes.py` | 30 min | `[ ]` R038I |
| `POST /api/org/modules/<key>/purchase` — purchase / license request | `apps/module_manager/api_routes.py` | 45 min | `[ ]` R038I |
| `GET /api/org/modules/licenses` — org license list | `apps/module_manager/api_routes.py` | 20 min | `[ ]` R038I |

#### R038I-C — platform-ui

| Task | File | Est. | Status |
|------|------|------|--------|
| TypeScript types: `ModuleVersion`, `ModuleUpgradeJob`, `ModulePackage`, `ModuleStoreListing`, `ModuleLicense` v2 | `lib/api/types.ts` | 30 min | `[ ]` R038I |
| Zod schemas: upgrade + store forms | `lib/modules/modules/schemas.ts` | 30 min | `[ ]` R038I |
| Query keys: `queryKeys.moduleVersions.*`, `queryKeys.moduleStore.*` | `lib/api/query-keys.ts` | 15 min | `[ ]` R038I |
| `/modules/store` browse page | `app/(dashboard)/modules/store/page.tsx` | 2 hr | `[ ]` R038I |
| `/modules/store/[key]` detail page + pricing | `app/(dashboard)/modules/store/[key]/page.tsx` | 2 hr | `[ ]` R038I |
| `/modules/licenses` page | `app/(dashboard)/modules/licenses/page.tsx` | 1.5 hr | `[ ]` R038I |

---

## R039 — Generic Platform Foundation Roadmap (COMPLETE)

- [x] Create `../03-roadmap/master-roadmap.md` — 700+ line master platform roadmap
- [x] Define 10 platform pillars with status and key capabilities
- [x] Map 11 capability domains (all capabilities inventoried with status, priority, round)
- [x] Define Data Sources & Knowledge Connections Platform (new domain — ADR-035)
- [x] Add ADR-033, ADR-034, ADR-035
- [x] Identify 12 P0 foundation gates blocking broad module development
- [x] Recommend next 10 rounds (R040–R049) with dependency ordering
- [x] Update ARCHITECTURE.md §24 (AI-Native Generic Platform pillars)
- [x] Update 97-source-of-truth.md (4 new registry rows, ADR highest updated to ADR-035)
- [x] Update ../03-roadmap/master-roadmap.md (R039 gate row + next rounds)
- [x] Update ../09-history/change-log.md, ../09-history/rounds-index.md

## R039 addendum — Data Ownership & Storage Strategy (COMPLETE)
- [x] Existing DB-First principle documented (ADR-036)
- [x] Platform Data & Artifact Registry spec added to doc 47 §21.2
- [x] manifest.v2.json `dataContract` extension spec added to doc 47 §21.3
- [x] Tenant storage modes defined (doc 47 §21.4)
- [x] TenantDataStore concept model defined (doc 47 §21.5)
- [x] TenantDataRouter abstraction defined (doc 47 §21.6)
- [x] S3 / ObjectStorage strategy defined (doc 47 §21.7)
- [x] Export/import/install/upgrade integration defined (doc 47 §21.8)
- [x] BYODB safety rules defined (doc 47 §21.9)
- [x] Relationship to Data Sources Hub clarified (doc 47 §21.10)
- [x] ADR-036 added
- [x] Updated: docs 12, 24, 45, 35, 96, 98, ARCHITECTURE.md

## Deferred to R038C
- [ ] Extend `apps/module_manager/manifest_schema.py` with `DataContract` Pydantic model
- [ ] `ModuleRegistry.sync_from_manifests()` reads and stores `dataContract` data

## Deferred to R049 (Data Sources Hub)
- [ ] DataConnection + DataSource models
- [ ] SourceAccessPolicy enforcement
- [ ] Connector secrets (SSM-backed)
- [ ] AI retrieval policy

## Deferred to R060+ (TenantDataStore)
- [ ] TenantDataStore model and migration
- [ ] TenantDataRouter implementation
- [ ] BYODB connection flow
- [ ] platform_managed_dedicated_db provisioning

## Phase R040–R049 — Next 10 Rounds (from R039 roadmap)

_Reference: `docs/system-upgrade/47-generic-platform-foundation-roadmap.md §16`_
_Governance: `docs/system-upgrade/00-implementation-control-center.md` | Issue drafts: `issues/R040-R049-issue-drafts.md`_

| Task | Round | Gate/Blocked By | Status |
|------|-------|----------------|--------|
| R038B — Module Manager additive schema migrations (OrgModule, ModuleVersion, ModuleLicense, ModuleDependency) | R040 | UNBLOCKED (OQ-01–OQ-07 answered) | `[x] 2026-04-25 (commit abdf3bc3)` |
| Implementation Governance Setup (Control Center, Risk Register, Issue Template, PR Template, Review Checklist, CLAUDE.md) | R040-Control | R040 complete | `[x] 2026-04-25` |
| **PENDING ACTION: Apply R040 migrations to EKS DB** (7 files in migrations/versions/20260425_*) | Pre-R042 | port-forward to localhost:5444 | `[ ] REQUIRED before R042/R043/R045` |
| CI enforcement gate (LLM import check + ADR-028 check in PR CI) | R041 | Independent of R040 | `[ ]` |
| ActionButton extraction + DetailView full extraction | R041 | Independent | `[ ]` |
| R038C — ModuleRegistry.sync_from_manifests() + ModuleCompatLayer | R042 | R040 (OrgModule must exist) | `[ ]` |
| AI Service Routing Matrix backend (AIServiceDefinition + AIServiceProviderRoute + 9-step resolver) | R043 | R040 (org_id scoping) | `[ ]` |
| R038D — Navigation API (GET /api/org/modules/navigation + sidebar wiring + auth fix) | R044 | R042 (CompatLayer must exist) | `[ ]` |
| Feature Flags Engine (generic OrgFeatureFlag + useFeatureFlag hook) | R045 | R040 (OrgModule for scoping) | `[ ]` |
| Settings Engine (generic org/user settings registry + useSettings hook) | R045 | R040 | `[ ]` |
| AuditLog Platform Service (standardize record_activity() into structured service) | R046 | R045 (Settings Engine for notification prefs) | `[ ]` |
| Notification Platform Service (generic, backed by platform_outbox) | R046 | R045 | `[ ]` |
| API Keys backend (model, rotation, audit) | R047 | R040, R046 (audit required on key ops) | `[ ]` |
| Secrets Manager backend (SSM-backed connector secrets interface) | R047 | R040, R046 | `[ ]` |
| P0 LLM direct import cleanup (all 55+ files → AIProviderGateway) | R048 | R043 (routing matrix available for targets) | `[ ]` |
| Data Sources Hub backend foundation (DataConnection, DataSource, SourceAccessPolicy, AI retrieval policy) | R049 | R047 (Secrets Manager), R046 (audit), R040 | `[ ]` |

---

## Blocked

| Task | Why Blocked | Unblocked By |
|------|-------------|--------------|
| Auth bridge implementation | Need to confirm Flask auth response contract (Q1) | Read `apps/authentication/api_auth.py` + test |
| SSE notifications for approvals | Need to understand current notification mechanism (Q11) | Investigate current technician approval flow |
| Role-based nav filtering | Need complete role list (Q8) | Read `rbac.py` fully |
| iOS build pipeline | Apple Developer account required | Business decision + account purchase |
| SAML enterprise SSO | xmlsec compilation issue unresolved | Docker build environment fix |

---

---

## AI Assistant Runtime Implementation (R041-AI — contract complete, implementation pending)

_Reference: `docs/system-upgrade/54-ai-assistant-runtime.md`_
_Phases track: R032–R035 for shell/LLM, R027–R030 for actions_

### Phase A — Page Context Registry + Chat Shell (R032)

| Task | File(s) | Priority | Status |
|------|---------|----------|--------|
| **`useRegisterPageContext()` hook** | `lib/hooks/use-register-page-context.ts` | P1 | `[ ]` R032 |
| **`AIPageContextRegistry` Zustand store** | `lib/stores/ai-page-context-registry.ts` | P1 | `[ ]` R032 |
| **`FloatingAIButton` component** | `components/shell/floating-ai-assistant/FloatingAIButton.tsx` | P1 | `[ ]` R032 |
| **`AIAssistantDrawer` (no LLM yet)** | `components/shell/floating-ai-assistant/AIAssistantDrawer.tsx` | P1 | `[ ]` R032 |
| **Test: no LLM call on page load** | `lib/stores/ai-assistant-session.test.ts` | P1 | `[ ]` R032 |

### Phase B — Capability Context + Read-Only Assistant (R033)

| Task | File(s) | Priority | Status |
|------|---------|----------|--------|
| **`GET /api/ai/context` endpoint** | `apps/ai_providers/internal_routes.py` or new module | P1 | `[ ]` R033 |
| **`UserCapabilityContext` model + generation** | `apps/ai_providers/capability_context.py` | P1 | `[ ]` R033 |
| **Context staleness: `context_version` increment events** | `apps/authentication/`, `apps/module_manager/` | P1 | `[ ]` R033 |
| **First LLM message send with capability context** | `lib/stores/ai-assistant-session.ts` | P1 | `[ ]` R033 |
| **Page explanation test** | `apps/ai_providers/tests/test_capability_context.py` | P1 | `[ ]` R033 |
| **Stale context 409 test** | `apps/ai_providers/tests/test_capability_context.py` | P1 | `[ ]` R033 |

### Phase C — Action Proposal UI + Low-Risk Actions (R027/R028)

| Task | File(s) | Priority | Status |
|------|---------|----------|--------|
| **`AIActionRegistry` backend** | `apps/ai_action_platform/registry.py` | P1 | `[ ]` R027 |
| **`AIActionProposal` + `ConfirmationToken` models** | `apps/ai_action_platform/models.py` | P1 | `[ ]` R027 |
| **`POST /api/ai-actions/propose`** | `apps/ai_action_platform/routes.py` | P1 | `[ ]` R027 |
| **`POST /api/ai-actions/confirm`** | `apps/ai_action_platform/routes.py` | P1 | `[ ]` R028 |
| **`AIActionPreviewCard` component** | `components/shared/ai-action-preview-card.tsx` | P1 | `[ ]` R028 |
| **Test: authorized user executes, AIActionInvocation row asserted** | `apps/ai_action_platform/tests/` | P1 | `[ ]` R027 |
| **Test: unauthorized user gets 403, no execution** | `apps/ai_action_platform/tests/` | P1 | `[ ]` R027 |
| **Test: unregistered action returns 400** | `apps/ai_action_platform/tests/` | P1 | `[ ]` R027 |
| **Test: cross-tenant target returns 403** | `apps/ai_action_platform/tests/` | P1 | `[ ]` R027 |

### Phase D — Dangerous Confirmations + Audit (R028/R030)

| Task | File(s) | Priority | Status |
|------|---------|----------|--------|
| **Full confirmation flow (medium/high/critical)** | `apps/ai_action_platform/routes.py` | P1 | `[ ]` R028 |
| **`AIActionInvocation` audit model** | `apps/ai_action_platform/models.py` | P1 | `[ ]` R028 |
| **Audit write failure → action rollback** | `apps/ai_action_platform/executor.py` | P1 | `[ ]` R028 |
| **AIUsageLog assertion in all action tests** | `apps/ai_action_platform/tests/` | P1 | `[ ]` R028 |

### Phase E — Voice Agent (R029)

| Task | File(s) | Priority | Status |
|------|---------|----------|--------|
| **Voice eligibility filter in action registry** | `apps/ai_action_platform/registry.py` | P1 | `[ ]` R029 |
| **Voice confirmation: 60s TTL, `confirmed_via: "voice"`** | `apps/ai_action_platform/routes.py` | P1 | `[ ]` R029 |
| **Escalation for high/critical: pending_ui_confirmation token** | `apps/ai_action_platform/routes.py` | P1 | `[ ]` R029 |
| **Voice billing: AIUsageLog for STT + TTS + LLM** | `apps/ai_providers/gateway.py` | P1 | `[ ]` R029 |
| **Test: voice refuses `voice_ineligible` action** | `apps/ai_action_platform/tests/` | P1 | `[ ]` R029 |
| **Test: voice escalates high-risk, no execution** | `apps/ai_action_platform/tests/` | P1 | `[ ]` R029 |
| **Test: voice billing recorded** | `apps/ai_action_platform/tests/` | P1 | `[ ]` R029 |

### Phase F — Module Page Context Declarations

| Task | File(s) | Priority | Status |
|------|---------|----------|--------|
| **Declare `aiPageContexts` for users module** | `lib/modules/users/ai-page-contexts.ts` | P2 | `[ ]` |
| **Declare `aiPageContexts` for organizations module** | `lib/modules/organizations/ai-page-contexts.ts` | P2 | `[ ]` |
| **Declare `aiPageContexts` for helpdesk module** | `lib/modules/helpdesk/ai-page-contexts.ts` | P2 | `[ ]` |
| **Update `AI_READINESS.md` for each module when page contexts declared** | `docs/modules/<key>/AI_READINESS.md` | P2 | `[ ]` |

---

## Runtime Deployment Architecture (R041-Infra — doc complete, implementation tasks pending)

_Reference: `docs/system-upgrade/53-runtime-deployment-architecture.md`_

### Phase 1 — Required before P2 module work

| Task | File(s) | Priority | Status |
|------|---------|----------|--------|
| **Remove `db.create_all()` from production startup** | `apps/__init__.py:1487` — move to dev-only guard or remove entirely | P1 (before P2) | `[ ]` |
| **Create `platform-ui` Dockerfile** | `platform-ui/Dockerfile` — Next.js production build, minimal image | P1 | `[ ]` |
| **Harden `/api/health` endpoint** | Return 200 with `{"status": "ok"}` on liveness, `{"status": "ok", "db": true, "redis": true}` on readiness | P1 | `[ ]` |
| **Add `/api/ready` readiness endpoint** | `apps/authentication/` or `apps/__init__.py` — checks DB + Redis + migration head | P1 | `[ ]` |
| **Add Kubernetes readiness probe** | `deployment/kubernetes/base/platform/` — point to `/api/ready`, 503 until DB ready | P2 | `[ ]` |

### Phase 2 — Controlled migration pipeline

| Task | File(s) | Priority | Status |
|------|---------|----------|--------|
| **Create Kubernetes migration Job manifest** | `deployment/kubernetes/base/platform/migration-job.yaml` — runs `alembic upgrade head`, exits 0 on success | P2 | `[ ]` |
| **Wire migration Job into CI/CD pipeline** | `.github/workflows/cd-deploy-dual.yml` — run Job before Deployment rollout | P2 | `[ ]` |
| **Document migration failure recovery procedure** | `deployment/CLAUDE.md` — what to do if migration Job fails mid-deploy | P2 | `[ ]` |
| **Add PodDisruptionBudget for web-api** | `deployment/kubernetes/base/platform/pdb-web-api.yaml` — minAvailable: 1 | P2 | `[ ]` |

### Phase 2 — Observability

| Task | File(s) | Priority | Status |
|------|---------|----------|--------|
| **Add `app_info` metric with version + commit SHA** | `apps/observability/metrics.py` — gauge with version labels | P2 | `[ ]` |
| **Add queue depth metric for Celery queues** | `apps/observability/metrics.py` — `celery_queue_length{queue}` | P2 | `[ ]` |
| **Verify correlation ID flows from UI → API → workers** | `apps/middleware/trace_id.py` — confirm `X-Request-Id` propagated in task metadata | P2 | `[ ]` |

---

---

## AI/Voice Readiness — Per-Module Work (R041-AI-Assist Governance)

> Every module must have `AI_READINESS.md` created when its implementation round starts.
> Create the file with at minimum a `current_level` declaration (Level 0 + exception = valid).

### Per-module AI_READINESS.md creation (when each module round starts)

| Task | Module | Priority | Status |
|------|--------|----------|--------|
| Create `docs/modules/helpdesk/AI_READINESS.md` | helpdesk | P1 | `[ ]` |
| Create `docs/modules/users/AI_READINESS.md` | users | P1 | `[ ]` |
| Create `docs/modules/admin/AI_READINESS.md` | admin | P1 | `[ ]` |
| Create `docs/modules/authentication/AI_READINESS.md` | authentication | P1 | `[ ]` |
| Create `docs/modules/ai_providers/AI_READINESS.md` | ai_providers | P2 | `[ ]` |
| Create `docs/modules/ala/AI_READINESS.md` | ala | P2 | `[ ]` |
| Create `docs/modules/floating_assistant/AI_READINESS.md` | floating_assistant | P1 | `[ ]` |

### AI assistant implementation readiness tasks

| Task | File(s) | Priority | Status |
|------|---------|----------|--------|
| **Create `apps/tests/ai_readiness/` test harness skeleton** | `run_harness.py`, validators skeleton | P2 — after Phase D | `[ ]` |
| **Create E2E scaffold for Chat AI flows** | `tests/e2e/ai/assistant-page-context.spec.ts` etc. | P2 — after Phase A | `[ ]` |
| **Create E2E scaffold for Voice Agent flows** | `tests/e2e/ai/voice-agent-safety.spec.ts` | P2 — after Phase E | `[ ]` |
| **Wire AI_READINESS.md creation into module round template** | `.github/ISSUE_TEMPLATE/platform-round.yml` | P2 | `[ ]` |

---

## AI Assistant Test Harness

> Tracks implementation of the automated test harness for verifying AI/voice readiness across all modules.
> Full spec: `../05-ai/assistant-runtime.md §15`.
> Build trigger: after Phase D (dangerous action confirmations + audit) AND at least 3 modules with AI_READINESS.md.

| Task | File(s) | Priority | Status |
|------|---------|----------|--------|
| **`run_harness.py`** — discover + validate all module AI declarations | `apps/tests/ai_readiness/run_harness.py` | P2 | `[ ]` |
| **`validators/page_context.py`** — validate AIPageContext completeness | `apps/tests/ai_readiness/validators/` | P2 | `[ ]` |
| **`validators/action_descriptor.py`** — validate AIActionDescriptor schema | `apps/tests/ai_readiness/validators/` | P2 | `[ ]` |
| **`validators/permission_cross_check.py`** — verify permissions in RBAC | `apps/tests/ai_readiness/validators/` | P2 | `[ ]` |
| **`validators/voice_policy.py`** — validate voice eligibility rules | `apps/tests/ai_readiness/validators/` | P2 | `[ ]` |
| **`validators/coverage_check.py`** — verify E2E coverage for claimed level | `apps/tests/ai_readiness/validators/` | P2 | `[ ]` |
| **Wire harness into CI gate** | `.github/workflows/ci.yml` — fail PR if module claims level without evidence | P2 | `[ ]` |

---

---

## AI Knowledge Base — Per-Module Capability Metadata

| Task | Priority | Depends On |
|------|----------|------------|
| Create `CAPABILITY_METADATA.md` for helpdesk module | High | R041-AI-Knowledge complete |
| Create `CAPABILITY_METADATA.md` for users module | High | R041-AI-Knowledge complete |
| Create `CAPABILITY_METADATA.md` for admin module | High | R041-AI-Knowledge complete |
| Create `CAPABILITY_METADATA.md` for ala module | High | R041-AI-Knowledge complete |
| Create `CAPABILITY_METADATA.md` for floating_assistant module | High | R041-AI-Knowledge complete |
| Create `CAPABILITY_METADATA.md` for ai_providers module | Medium | R041-AI-Knowledge complete |
| Create `CAPABILITY_METADATA.md` for authentication module | Medium | R041-AI-Knowledge complete |
| Implement SystemCapability registry (`apps/ai_assistant/capability_registry.py`) | Medium | R042+ |
| Implement SolutionTemplate registry (`apps/ai_assistant/solution_templates.py`) | Medium | R042+ |
| Build advisory query handler (`POST /api/ai/advisory`) | Low | SystemCapability registry |
| Wire KB-01–KB-15 E2E tests for first 3 modules | Low | Capability metadata complete |

---

## Backlog Conventions

- **Now**: Will be worked on this week or is actively blocking other work
- **Next**: Planned for the next 2-8 weeks, sequenced by dependency
- **Later**: Important but not immediate; will be scheduled into phases
- **Blocked**: Cannot start without the listed unblocking action

Mark tasks complete by changing `[ ]` to `[x]` and adding date: `[x] 2026-04-25`
