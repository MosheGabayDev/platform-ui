# 07 — Scalability and Maintainability Assessment

_Last updated: 2026-04-23_

---

## Scalability

### Current Deployment Constraints

- Single EKS node (`1× t3a.xlarge Spot`) — genuine single point of failure
- Spot instance: can be reclaimed at any time; DR script exists (`eks-dr-recover.sh`) but recovery is ~25 min
- Cloudflare Tunnel to single node: tunnel fails when node is replaced
- No horizontal pod autoscaling confirmed for web-api

### Backend Scalability

| Concern | Assessment |
|---------|------------|
| Database connection pool | SQLAlchemy pool; single PostgreSQL instance — bottleneck at scale |
| Redis | Single instance; no Redis cluster or Sentinel confirmed |
| Celery workers | Separate worker pools (`life`, `ops`, `agents`) — good intent; scale independently |
| AI provider calls | Circuit breaker + cache — good protection against cascading failures |
| AI usage partitioned tables | `AIUsageLog` partitioned monthly — correct; handles growth |
| Long-running AI investigations | Celery tasks; good — doesn't block web workers |
| Voice sessions | Go service + STUNner — scales better than Flask; WebRTC sessions stateful |

### Likely Bottlenecks at Scale

1. **Single PostgreSQL** — no read replicas; all reads + writes on one instance
2. **`run.py` blueprint registration** — not a runtime cost, but startup time grows with 81 modules
3. **Synchronous SQLAlchemy** — Flask + sync SQLAlchemy won't saturate a single process under I/O-heavy load; async would help
4. **Celery task latency** — if Redis broker is overloaded, task queue backs up; no queue depth monitoring observed
5. **RAG DB separate** — good isolation but adds another stateful dependency

---

## Maintainability

### Developer Onboarding Complexity

| Factor | Assessment |
|--------|------------|
| 81 modules with no dependency graph | Hard to understand where to start |
| 15KB `run.py` | Must scroll through all registrations to understand app structure |
| 4 separate Vite mini-apps | Each has its own dev server, build, dependencies |
| 25+ GitHub Actions workflows | Powerful but complex; understanding deploy flow requires multiple files |
| 39 Alembic parallel heads | Confusing but functional; document why this is intentional |
| `.env` vs `.env.local` vs `env.sample` | Three config files; new dev doesn't know which to copy |
| `scripts/` has 100+ files | No index or categories |

**Estimated onboarding time for a new senior developer**: 2-3 days to understand enough to safely make a change. High for a system of this complexity.

### Refactor Difficulty

| Area | Difficulty |
|------|-----------|
| Extracting a module to a microservice | High — cross-module imports everywhere |
| Replacing Flask with FastAPI | Medium-High — would require rewriting all routes + auth decorators |
| Adding async to database layer | High — SQLAlchemy sync → async requires model rewrites |
| Migrating Jinja2 → platform-ui | Medium — well-scoped if done feature-by-feature |
| Adding Pydantic validation | Medium — additive change, can be incremental |

### Testability

| Issue | Impact |
|-------|--------|
| Services use `db.session` directly | Unit tests require full Flask app context |
| No dependency injection framework | Mocking requires monkeypatching |
| AI provider calls not easily stubbed | Tests that call AI need special setup |
| 4 separate frontend builds | Each needs its own test setup |
| `platform-ui` has no tests yet | Zero coverage |

### Release Confidence

- CI runs `pytest` and `go build` — baseline confidence
- `scripts/test_steps/00_regression.sh` — integration regression gate
- No end-to-end browser tests covering platform-ui
- Deployment is `bash scripts/dev-deploy.sh` — manual steps for non-CI deploys
- `--workers` flag exists to sync workers to web-api image — if forgotten, worker/api image mismatch

**Biggest release risk**: forgetting to redeploy workers when tasks.py or engine code changes, causing investigations to get stuck.

---

## Operational Fragility

| Risk | Severity |
|------|----------|
| Single Spot node — instance reclaim → 25-min recovery | High |
| Port-forward for DB in TEST → dropped kills local dev | Medium |
| `dev-local-full.sh` startup ~3-4 min + known Go bridge failure | Low (expected) |
| ARI disabled (`SKIP_ARI_HANDLERS=true`) permanently | Low (known) |
| SAML disabled — enterprise auth gap | Medium |

---

## Extension Complexity (Future Features)

| Feature | Estimated Complexity |
|---------|---------------------|
| New AI provider adapter | Low — adapter pattern is clean |
| New helpdesk tool (SSH command, K8s query) | Medium — add to tool registry |
| New Celery task | Low-Medium |
| New dashboard page in platform-ui | Low (once auth wired) |
| Multi-region deployment | High — shared DB must stay single-region or be replicated |
| Stripe billing self-service portal | Medium — integration exists, need UI |
| iOS mobile app | Medium — RN/Expo supports iOS with EAS build |
| Grafana/observability dashboard | Low-Medium — metrics already exposed |
