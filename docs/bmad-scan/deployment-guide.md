# Deployment Guide — platform-ui

**Generated:** 2026-05-01 (BMAD Deep Scan).

> Deployment is shared between platform-ui (frontend) and platformengineer (backend) repos. The CI/CD pipeline (`cd-deploy-dual.yml` in platformengineer) coordinates both. This file covers the platform-ui side; full topology in `docs/system-upgrade/04-capabilities/runtime-deployment.md`.

## Environments

| Env | URL | Tunnel | Purpose |
|---|---|---|---|
| dev (local) | `http://localhost:3000` | — | Developer machine, Flask on `:5000` |
| TEST | (Cloudflare tunnel) | yes | Pre-prod validation |
| PROD | (Cloudflare tunnel) | yes | Production traffic |

## Build pipeline

1. **Trigger:** push to `master` (single-trunk workflow).
2. **GitHub Actions** runs (workflow lives in platformengineer repo `cd-deploy-dual.yml`):
   - Checkout platform-ui + platformengineer
   - `npm ci` + `npm run build` (platform-ui)
   - `pip install -r requirements.txt` (platformengineer)
   - Run lint + typecheck + tests on both
   - Build Docker images, tag with SHA
   - Push to ECR
3. **EKS deploy:** Helm/manifests roll out new image. Liveness + readiness probes.
4. **Health verification:** `/admin/api/monitoring/health` returns `{ ok: true }` before traffic shifts.

## Container layout

| Service | Port | Notes |
|---|---|---|
| platform-ui (Next.js) | 3000 | Standalone Next.js build, runs `node server.js` |
| platformengineer (Flask) | 5000 | Gunicorn workers, behind nginx |
| Postgres | 5432 | Managed RDS in prod, container in dev |
| Redis | 6379 | ElastiCache in prod, container in dev |

## Secrets

- **Production:** AWS SSM Parameter Store → K8s External Secrets Operator → pod env vars.
- **Dev:** `.env.local` (gitignored).
- Required for platform-ui:
  - `NEXTAUTH_SECRET` (must rotate per `docs/system-upgrade/01-foundations/07-security.md`)
  - `FLASK_API_URL`
  - `NEXTAUTH_URL`

## Rollback

- **Bad deploy:** `kubectl rollout undo deployment/platform-ui` (manual). Helm chart history preserved.
- **DB migration regression:** see `docs/system-upgrade/03-roadmap/master-roadmap.md §8` Existing-DB-First Migration Principle (additive, 30-day gap before destructive).

## Monitoring + alerts

- **Prometheus** scrapes both services. Metrics under `apps/observability/metrics.py` (Flask) and Next.js `/api/metrics` (when added).
- **Grafana** dashboards: latency, error rate, AI usage cost.
- **Health checks:**
  - platform-ui: `GET /` returns 200 with HTML when up.
  - platformengineer: `GET /admin/api/monitoring/health` returns JSON status.
- Alert routing → on-call (per `docs/system-upgrade/04-capabilities/runtime-deployment.md`).

## Failure isolation rules

(Per `04-capabilities/runtime-deployment.md`)

- platform-ui crash → users see Next.js error page; backend unaffected.
- platformengineer crash → frontend shows ErrorBoundary + EmptyState; users can still navigate cached pages.
- Database unavailable → both services fail health checks; load balancer drains traffic.
- Migration job: separate Pod, never mounts production secrets in app pods.

## CI/CD enforcement gates

| Gate | Status | Enforced by |
|---|---|---|
| Type check passes | ✅ | `npm run typecheck` step in CI |
| Lint passes | ✅ | `npm run lint` step |
| E2E smoke green | 🟡 | Playwright run (R041F foundation done) |
| LLM import gate (backend) | 🟡 | `check_no_direct_llm_imports.py` ready, not yet blocking PRs (R041A) |
| Secret scan | 🟡 | D-005 baseline failures pre-existing (R041D cleanup) |
| ADR-028 shared-services check | 🔴 | Manual review only (R041A scope-extension candidate) |

## Manual smoke after deploy

1. Open `/login` — confirm logo + form render.
2. Log in with test credentials.
3. Confirm dashboard KPI cards load (4 cards with real numbers).
4. Open Users list — confirm pagination + filter work.
5. Click "Add user" — confirm sheet opens, form validates.
6. Open `/api/proxy/dashboard/stats` directly — confirm 200 + envelope shape.
