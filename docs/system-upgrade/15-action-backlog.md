# 15 — Action Backlog

_Last updated: 2026-04-24_

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

## Open-Source Capability Layer (Phase 1 — install + shared components)

_Reference: `docs/system-upgrade/25-open-source-capability-layer.md` | ADR-016_

| Task | File(s) | Priority | Status |
|------|---------|----------|--------|
| **Install `nuqs`** | `package.json` — URL filter state for all list pages | P1 | `[ ]` |
| **Create shared `DataTable<T>` component** | `components/ui/data-table.tsx` — wraps TanStack Table with standard skeleton, empty, error states | P1 | `[ ]` |
| **Create `StatCard` + `ChartCard` wrappers** | `components/ui/stat-card.tsx`, `components/ui/chart-card.tsx` | P1 | `[ ]` |
| **Create `EmptyState` component** | `components/ui/empty-state.tsx` — standard empty/no-results/error states | P1 | `[ ]` |
| **Create `TableRowSkeleton` + `DetailSkeleton`** | `components/ui/table-row-skeleton.tsx`, `components/ui/detail-skeleton.tsx` | P1 | `[ ]` |
| **Create `usePermission()` hook** | `lib/auth/use-permission.ts` — wraps session, hasRole, hasPermission | P1 | `[ ]` |
| **Create `<PermissionGate>` component** | `components/auth/permission-gate.tsx` — permission/role/adminOnly props | P1 | `[ ]` |
| **Create date utilities** | `lib/utils/date.ts` — `formatDate()`, `formatRelative()` with he-IL locale | P1 | `[ ]` |
| **Install `papaparse`** | `package.json` + `@types/papaparse` — CSV export/import | P2 | `[ ]` |
| **Create CSV export utility** | `lib/utils/export.ts` — `exportToCsv()` with BOM for Hebrew Excel compat | P2 | `[ ]` |
| **Install `@tanstack/react-virtual`** | `package.json` — virtual scroll for tables >500 rows | P2 | `[ ]` |
| **Add shadcn Calendar + DatePicker** | `npx shadcn@latest add calendar date-picker` | P2 | `[ ]` |
| **Update proxy to attach audit headers** | `app/api/proxy/[...path]/route.ts` — add `X-User-Id`, `X-Org-Id`, `X-Action-Source: platform-ui` | P1 | `[ ]` |
| **Migrate Users list to `nuqs` filters** | `app/(dashboard)/users/page.tsx` — replace manual searchParams with `useQueryState` | P2 | `[ ]` |

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
