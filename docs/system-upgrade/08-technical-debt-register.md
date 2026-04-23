# 08 — Technical Debt Register

_Last updated: 2026-04-24_

---

| Priority | Issue | Impact | Evidence | Recommended Direction |
|----------|-------|--------|----------|----------------------|
| **P0** | Auth bridge missing in platform-ui | Blocks all real usage of platform-ui | `app/(auth)/login/page.tsx` — stub submit | Implement next-auth credentials provider → Flask login API |
| **P0** | No API contract (OpenAPI) for most endpoints | Frontend drifts from backend silently; blocks codegen | Only `apps/ala/openapi.yaml` exists | Add FastAPI-style response models or `flask-smorest` to generate OpenAPI; run codegen to `platform-ui/lib/api/` |
| **P1** | SAML/SSO disabled | Cannot serve enterprise customers | `requirements.txt` — commented out | Fix Docker build dependency; use pre-built xmlsec wheel |
| **P1** | 4 separate embedded Vite apps | 4× maintenance cost for shared components | `ai-agents-ui/`, `ala-ui/`, `ops-ui/`, `dyn-dt-ui/` | Migrate all to platform-ui; remove Vite apps one-by-one after parity |
| **P1** | No real-time updates in platform-ui | Investigation status requires full page refresh | No SSE/WebSocket in `apps/` or `platform-ui` | Add SSE endpoint in Flask; `useEventSource` hook in platform-ui |
| **P1** | `run.py` is 15KB god file | Merge conflicts; cognitive overhead for every new module | `run.py` — all blueprint registrations | Refactor to auto-discovery or sub-registrar pattern |
| **P2** | No module boundary enforcement | Cross-module coupling grows unchecked | 81 modules, no import firewall | Add `import-linter` or `pylint` module boundary rules to CI |
| **P2** | Synchronous SQLAlchemy in Flask | Limits concurrent request throughput | All `services/*.py` use sync `db.session` | Evaluate FastAPI + async SQLAlchemy for new API surface; don't rewrite existing |
| **P2** | No Pydantic validation on Flask endpoints | Input validation inconsistent; manual WTForms for JSON | WTForms used for forms; JSON bodies not validated uniformly | Add `pydantic` models to new Flask routes; existing routes incrementally |
| **P2** | platform-ui has zero tests | Any change can silently break UI | `platform-ui` — no test files found | Add Playwright e2e for critical flows; Vitest unit tests for lib/ |
| **P2** | Role-based page guards missing in platform-ui | Users see pages they can't access; confusing 403 errors | `nav-items.ts` shows all items regardless of role | Implement Next.js middleware with role-based route protection |
| **P3** | 39 Alembic parallel heads | Onboarding confusion; rollback complexity | `migrations/` directory | Document clearly; consider single-head consolidation in a future maintenance sprint |
| **P3** | No centralized structured logging | Incidents hard to debug without log aggregation | No Loki/CloudWatch/ELK configured | Add log forwarding to CloudWatch or Loki; structured JSON logs |
| **P3** | `scripts/` directory has 100+ files with no index | Finding the right script is archaeology | `scripts/` listing | Add `scripts/README.md` with categories; enforce naming convention |
| **P3** | Inconsistent error handling across modules | Frontend sees unpredictable error shapes | No shared `ApiResponse` class | Define and enforce a standard error envelope for all API responses |
| **P3** | No dependency injection in services | Hard to unit test without full Flask context | All services use direct `db.session` | Introduce constructor injection pattern for new services |
| **P4** | Mobile app Android-only | No iOS coverage | `mobile-app-rn-v2/` — Android only | Enable EAS Build for iOS; requires Apple Developer account |
| **P4** | No Grafana/observability dashboard | Metrics exist but not visualized | Prometheus metrics exposed; no dashboard configured | Add Grafana via Helm or managed Grafana |
| **P4** | Print/logging mix in older code | Structured log pipeline depends on consistent format | Grep for `print(` in `apps/` | Replace `print()` with `logger.{level}()` |
| **P4** | Dead code: `api_auth_OLD_BACKUP.py` | Confusion about which auth file is canonical | `apps/authentication/api_auth_OLD_BACKUP.py` | Delete confirmed dead files; enforce no `_OLD_BACKUP` naming |
| **P2** | No `INDEX.md` in most `apps/<module>/` directories | AI agents and new developers cannot navigate modules without reading all files | Only top-level DOCS/INDEX.md exists; per-module index absent | Create INDEX.md per module (template: `DOCS/templates/INDEX_TEMPLATE.md`); see `23-ai-maintainability-and-code-cleanup.md §6` |
| **P2** | Missing file headers in `apps/` and `platform-ui/` | AI agents cannot determine file purpose or auth requirement from the first line | Most files have no module-level docstring | Add standard file headers to every new/modified file; backfill as modules are visited |
| **P3** | 4 embedded Vite apps with duplicate components | Shared components duplicated across 4 codebases; 4× maintenance cost for type definitions | `ai-agents-ui/`, `ala-ui/`, `ops-ui/`, `dyn-dt-ui/` each have their own React components | Migrate to platform-ui in Phase 3 order; delete each Vite app after parity confirmed |
| **P3** | Jinja2 templates co-exist with platform-ui pages for same features | AI agents generate changes in wrong layer (Jinja2 vs Next.js); dual-maintenance risk | `templates/` directory still active while platform-ui is being built | Retire per-module per migration phase; hard-delete (not archive) after parity — see `23-ai-maintainability-and-code-cleanup.md §10` |
