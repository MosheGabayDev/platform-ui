# 15 — Action Backlog

_Last updated: 2026-04-24 (R024 — AI Action Platform backlog added)_

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

## Blocked

| Task | Why Blocked | Unblocked By |
|------|-------------|--------------|
| Auth bridge implementation | Need to confirm Flask auth response contract (Q1) | Read `apps/authentication/api_auth.py` + test |
| SSE notifications for approvals | Need to understand current notification mechanism (Q11) | Investigate current technician approval flow |
| Role-based nav filtering | Need complete role list (Q8) | Read `rbac.py` fully |
| iOS build pipeline | Apple Developer account required | Business decision + account purchase |
| SAML enterprise SSO | xmlsec compilation issue unresolved | Docker build environment fix |

---

## Backlog Conventions

- **Now**: Will be worked on this week or is actively blocking other work
- **Next**: Planned for the next 2-8 weeks, sequenced by dependency
- **Later**: Important but not immediate; will be scheduled into phases
- **Blocked**: Cannot start without the listed unblocking action

Mark tasks complete by changing `[ ]` to `[x]` and adding date: `[x] 2026-04-25`
