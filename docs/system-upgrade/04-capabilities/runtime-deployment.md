# 53 — Runtime Deployment Architecture

> Source of truth for pod/service separation, Kubernetes runtime topology, and deployment boundaries.
> _Created: 2026-04-26 (R041-Infra Addendum)_
> _Last updated: 2026-04-26_

---

## ADR — Runtime Pod Separation and Failure Isolation

**Context:** The platform must be production-grade. A single monolithic pod mixing UI, API, and workers creates correlated failure zones: a UI crash kills API capacity; an AI workload spike degrades user-facing requests; a migration bug can prevent app startup.

**Decision:** The platform runtime is split into independently deployable services with explicit dependency rules. UI, API, workers, scheduler, AI gateway, voice, webhooks, and data-sync are separate logical services that may be separated into dedicated pods/deployments. The UI must never be required for backend/API/worker operation. Migrations must run as controlled jobs, not through app startup.

**Alternatives considered:** Monorepo single-container (rejected — correlated failures, no independent scaling), microservices from day 1 (rejected — premature until service contracts stabilize).

**Consequences:** Phase 1 requires at minimum 3 separate deployments (UI + API + Worker). Services can be collocated initially if resource constraints require, but code boundaries must be respected so they can be separated later without refactoring.

**Affected modules:** All deployment, CI/CD, and runtime operations.

---

## 1. Logical Services

### 1.1 platform-ui-web

**Purpose:** Next.js frontend web app — serves browser UI, handles SSR/SSG, calls backend through server-side proxy.

**Boundary rules:**
- Must not run backend business logic
- Must not run background jobs
- Must not store secrets except frontend-safe env vars (`NEXT_PUBLIC_*`, `NEXTAUTH_URL`, `FLASK_API_URL` server-side only)
- All API calls go through `/api/proxy/[...path]` — never direct Flask calls from browser
- If this pod is down: API, workers, and mobile clients must continue unaffected

**Phase 1 status:** Required separate deployment.

---

### 1.2 platform-api

**Purpose:** Flask JSON API — authentication, RBAC, tenant-scoped module APIs, admin APIs, AI action execution endpoints, module manager APIs.

**Boundary rules:**
- Must not depend on `platform-ui-web` pod
- Must be independently scalable
- Must expose `/api/health` and `/api/ready` endpoints
- Must enforce auth/RBAC/tenant isolation on every request
- All mobile/cross-platform clients can use this API without UI dependency
- No heavy synchronous work in request lifecycle — queue it

**Phase 1 status:** Required separate deployment.

---

### 1.3 platform-worker

**Purpose:** Celery background jobs — import/export, module upgrades, backups, media processing, notifications, async audit processing.

**Boundary rules:**
- Separate pod/deployment from API
- Scaled independently via queue depth
- Consumes Redis queues only — no direct HTTP user traffic
- Must not require `platform-ui-web` pod
- Shares Docker image with `platform-api` (different entrypoint: `celery worker`)

**Phase 1 status:** Required separate deployment.

---

### 1.4 platform-scheduler

**Purpose:** Celery Beat — periodic tasks, scheduled sync, cleanup jobs, license expiry checks, retry jobs.

**Boundary rules:**
- One active scheduler instance (or leader election if horizontally scaled)
- Separate from worker if needed for resource isolation
- Must not run inside UI pod
- Shares Docker image with `platform-api` (different entrypoint: `celery beat`)

**Phase 1 status:** May share pod with `platform-worker` initially if resource budget is tight, but must be a separate process.

---

### 1.5 platform-ai-gateway

**Purpose:** AIProviderGateway — provider routing, usage metering, billing events, policy checks, circuit breaker.

**Phase boundary:**

| Phase | Deployment |
|-------|-----------|
| **Phase 1 (initial)** | Runs inside `platform-api` codebase (`apps/ai_providers/gateway.py`) — no separate pod |
| **Phase 2 (when needed)** | Separate deployment if AI load, security isolation, or independent scaling requires it |

**Boundary rules:**
- All LLM calls go through gateway (never direct provider SDK)
- Must be independently observable (metrics, circuit breaker state, cost per org)
- Must not depend on `platform-ui-web` pod
- Must support rate limits and circuit breakers
- Must write `AIUsageLog` row for every call

---

### 1.6 platform-voice

**Purpose:** Realtime voice — STT/TTS, call manager, voice session handling, voice usage metering.

**Boundary rules:**
- Separated from normal API due to realtime/long-lived WebSocket connections and resource profile
- Must use `AIProviderGateway` for all provider calls and billing
- Must not depend on `platform-ui-web` pod
- Voice write actions must obey AI Action Platform rules (danger level, voice eligibility)
- Uses STUNner (K8s-native TURN) for WebRTC relay

**Phase 1 status:** Already deployed as separate EKS workloads (`voice-edge`, `mobile-voice-gateway`).

---

### 1.7 platform-webhooks

**Purpose:** Receive external webhooks — Google/Microsoft/Jira/GitHub/Slack integrations, signed webhook validation, async dispatch.

**Boundary rules:**
- Can start inside `platform-api`, but target is separate deployment if volume or security requires
- Must validate signatures before processing
- Should enqueue work to Redis queue instead of doing heavy processing inline
- Must not depend on `platform-ui-web` pod

**Phase 1 status:** Runs inside `platform-api` at initial launch. Extractable to own deployment in Phase 2.

---

### 1.8 platform-data-sync / platform-connectors

**Purpose:** Data Sources Hub sync, MCP discovery, database source sync, document indexing, vector indexing, file ingestion.

**Boundary rules:**
- Separated from UI and API
- Uses workers/queues for async ingestion
- Tenant-scoped — all sync operations must carry `org_id`
- Secrets access via secret manager only
- AI retrieval policies enforced per `DataSourceAccessPolicy`

**Phase 1 status:** Deferred to P3 Data Sources Hub (R049+). Code boundaries must be respected now.

---

### 1.9 observability / logging

**Purpose:** Metrics, logs, traces, health dashboards, alerts.

**Boundary rules:**
- Every service must expose Prometheus metrics and health endpoint
- Correlation IDs must flow across UI → API → workers → AI gateway
- Logs must not expose secrets or PII
- Separate namespace (`monitoring`) from application pods

**Phase 1 status:** Prometheus + Grafana already deployed in `monitoring` namespace.

---

## 2. Phase 1 — Minimum Production Split

This is the minimum supported split for early production/staging. UI and API must not be the same pod.

```
platform-ui-web             ← Next.js app (Deployment)
platform-api                ← Flask API (Deployment, ≥1 replica)
platform-worker             ← Celery worker (Deployment)
platform-scheduler          ← Celery beat (Deployment, 1 replica)
postgres / managed DB       ← EKS StatefulSet or RDS
redis                       ← EKS StatefulSet or ElastiCache
```

**AI gateway** runs inside `platform-api` in Phase 1.
**Webhooks** run inside `platform-api` in Phase 1.

---

## 3. Phase 2/3 — Target Split

Future split when individual services need independent scaling, tighter security isolation, or dedicated resource profiles:

```
platform-ai-gateway         ← AIProviderGateway service (if AI volume warrants isolation)
platform-voice              ← Already separate (voice-edge + mobile-voice-gateway)
platform-webhooks           ← Webhook receiver (if event volume warrants isolation)
platform-data-sync          ← Data connector sync (R049+)
platform-media-worker       ← Media processing worker
platform-search-indexer     ← Vector/text indexing worker
platform-billing-worker     ← Billing event processing
platform-notifications-worker ← Notification dispatch worker
```

**Not all are required immediately.** Code boundaries must be respected so any service can be extracted without refactoring. The criterion for extraction: independent scaling need, security isolation need, or resource profile incompatibility with co-located service.

---

## 4. Service Dependency Rules

```
platform-ui-web
  may depend on:  platform-api (via /api/proxy/)
  must not depend on: DB directly, Redis directly, workers, scheduler, AI gateway internals

platform-api
  may depend on:  DB, Redis, SSM secrets
  must not depend on: platform-ui-web

platform-worker
  may depend on:  DB, Redis, SSM secrets, platform-api internal services
  must not depend on: platform-ui-web

platform-scheduler
  may depend on:  DB, Redis
  must not depend on: platform-ui-web

platform-ai-gateway (Phase 1: inside platform-api)
  may depend on:  provider configs, billing service, AIUsageLog (DB), Redis (circuit breaker/cache)
  must not depend on: platform-ui-web

platform-voice
  may depend on:  platform-ai-gateway, billing, Redis queue, DB
  must not depend on: platform-ui-web

platform-webhooks
  may depend on:  Redis queue, DB (signature keys), org secrets
  must not depend on: platform-ui-web

platform-data-sync
  may depend on:  secrets manager, data source connections, queues, vector index, DB
  must not depend on: platform-ui-web
```

**Golden rule:** API must not require background workers to respond to read-only requests. Heavy jobs must be queued, not done inline.

---

## 5. Health / Readiness Checks

### platform-ui-web

| Endpoint | Type | Check |
|----------|------|-------|
| `/healthz` | Health | App is serving HTTP — no DB required |

### platform-api

| Endpoint | Type | Check |
|----------|------|-------|
| `/api/health` | Liveness | Process alive, returns `{"status": "ok"}` |
| `/api/ready` | Readiness | DB reachable, Redis reachable, migrations current |

`/api/ready` must return `503` until DB connection succeeds and required migration heads are applied. Kubernetes readiness gate must use this endpoint — no traffic until ready.

### platform-worker

| Check | Type | Method |
|-------|------|--------|
| Worker heartbeat | Celery built-in | `celery inspect ping` |
| Queue connectivity | Redis connection | Healthcheck in worker init |
| Last successful job | Prometheus metric | `celery_tasks_succeeded_total` |

### platform-ai-gateway (Phase 1: inside platform-api)

| Check | Type | Notes |
|-------|------|-------|
| Provider registry health | Internal | No actual paid LLM call for health check |
| Circuit breaker state | Prometheus | `ai_gateway_circuit_open{provider}` |
| Usage log write latency | Prometheus | `ai_usage_log_write_seconds` |

### platform-voice

| Check | Type | Notes |
|-------|------|-------|
| WebSocket readiness | TCP check | Port 8765 or WebSocket handshake |
| Provider route availability | Internal | No real paid call for health check |
| TURN connectivity | STUNner check | NLB UDP 3478 |

---

## 6. Failure Isolation Scenarios

### Scenario 1 — UI pod down

| Service | Expected behavior |
|---------|------------------|
| `platform-api` | Continues serving all `/api/*` endpoints — mobile/CLI clients unaffected |
| `platform-worker` | Continues all background jobs unaffected |
| Webhooks | Continue receiving if routing directly to `platform-api` |
| Mobile app | Continues working — connects directly to API |
| Admin alert | Health check on UI pod triggers alert |

### Scenario 2 — API pod down

| Service | Expected behavior |
|---------|------------------|
| `platform-ui-web` | Shows "API unavailable" state — no crash |
| `platform-worker` | Continues queued work where possible (no new API-triggered jobs) |
| `platform-scheduler` | Continues scheduled jobs |
| Admin alert | Readiness probe failure → Kubernetes restarts pod; alert fires |

### Scenario 3 — Worker pod down

| Service | Expected behavior |
|---------|------------------|
| `platform-ui-web` | Continues serving UI |
| `platform-api` | Continues serving all sync requests |
| Async jobs | Queued in Redis — processed on worker recovery |
| Admin view | Job backlog visible; degraded-state banner optional |

### Scenario 4 — AI gateway down (Phase 2+: separate pod)

| Service | Expected behavior |
|---------|------------------|
| Non-AI features | Continue fully unaffected |
| AI features | Degrade gracefully — "AI unavailable" state, no raw provider error exposed |
| Provider fallback | Must not bypass gateway — circuit breaker returns controlled degradation |

### Scenario 5 — Voice pod down

| Service | Expected behavior |
|---------|------------------|
| Web UI/API | Continue fully — no dependency on voice |
| Voice features | Unavailable — "voice service unavailable" shown in UI |
| Billing/transcripts | Queued or deferred — not lost |

### Scenario 6 — Redis / queue down

| Service | Expected behavior |
|---------|------------------|
| API read paths | Continue if DB available |
| API write paths requiring async side effects | Fail safely or queue-later per policy — must not silently succeed without side effect |
| Workers/scheduler | Degrade — no queue polling |
| Sessions/cache | Degrade — must fall back to DB session if configured |

### Scenario 7 — DB down

| Service | Expected behavior |
|---------|------------------|
| `platform-api` | Returns `503` from `/api/ready` — Kubernetes stops routing traffic |
| `platform-ui-web` | Shows maintenance/API error state |
| Workers | Pause/fail safely — no data corruption |
| Scheduler | Pauses |
| Admin alert | Fires immediately |

---

## 7. Kubernetes / Docker Requirements

### Dockerfiles

| Image | Dockerfile / build target | Used by |
|-------|--------------------------|---------|
| `platform-api` | `Dockerfile` (existing) | web-api pod, celery-worker pods, celery-beat pod |
| `platform-ui-web` | `platform-ui/Dockerfile` (to be created) | ui pod |
| `platform-voice-edge` | `voice-edge/Dockerfile` | voice-edge pod |
| `platform-voice-gateway` | `mobile-voice-gateway/Dockerfile` | mobile-voice-gateway pod |

Note: `platform-api`, `platform-worker`, and `platform-scheduler` share one Docker image — differentiated by entrypoint command.

### Kubernetes Deployments (Phase 1 minimum)

| Deployment | Namespace | Replicas | Notes |
|-----------|-----------|----------|-------|
| `web-api` | `platform` | ≥1 | Flask API, health + readiness probes required |
| `celery-worker` | `platform` | ≥1 | Different entrypoint from web-api |
| `celery-beat` | `platform` | 1 (exactly) | Leader election or single replica — never 2 |
| `platform-ui` | `platform` | ≥1 | Next.js build (TBD) |
| `voice-edge` | `voice` | ≥1 | Already deployed |
| `mobile-voice-gateway` | `voice` | ≥1 | Already deployed |

### Ingress Routes

| Path | Backend | Notes |
|------|---------|-------|
| `/` → | `platform-ui-web` | SSR/static Next.js — all unmatched paths |
| `/api/*` → | `platform-api` | OR proxied by Next.js — see Note 1 |
| `/admin/api/*` → | `platform-api` | Admin API — should not be public-internet-accessible |
| `/webhooks/*` → | `platform-api` (Phase 1) / `platform-webhooks` (Phase 2) | |
| `/voice-edge/*` → | `voice-edge` | WebRTC signaling |
| `/mobile-gw/*` → | `mobile-voice-gateway` | Mobile ALA bridge |

> **Note 1:** Currently `/api/*` is proxied through Next.js `/api/proxy/[...path]` for cookie forwarding. Long term, direct `/api/*` → `platform-api` routing is possible if auth migrates to Authorization header only.

### ConfigMaps and Secrets

| Type | Usage |
|------|-------|
| `ConfigMap` | Non-secret config: `FLASK_ENV`, service URLs, feature flag overrides, model names |
| `Secret` (platform-secrets) | All credentials: DB URL, Redis URL, API keys, JWT secrets, TURN credentials |
| SSM Parameter Store | Source of truth for all secrets — synced to K8s via `ssm-secrets.sh sync-k8s` |

**Rule:** ConfigMaps must never contain credentials. Secrets must never be in ConfigMaps or env inline in manifests.

### Resource Requirements

| Service | CPU Request | CPU Limit | Memory Request | Memory Limit |
|---------|------------|-----------|---------------|-------------|
| `web-api` | 250m | 1000m | 256Mi | 1Gi |
| `celery-worker` | 250m | 1000m | 256Mi | 1Gi |
| `celery-beat` | 50m | 200m | 64Mi | 256Mi |
| `platform-ui` | 100m | 500m | 128Mi | 512Mi |
| `voice-edge` | 100m | 500m | 128Mi | 512Mi |
| `mobile-voice-gateway` | 100m | 500m | 128Mi | 512Mi |
| `stunner-dataplane` | 100m | 500m | 64Mi | 256Mi |

> Note: Spot node (`t3a.xlarge` = 4 vCPU, 16 GB) — sum of all requests must stay well under this ceiling.

### Horizontal Pod Autoscaling

| Service | HPA metric | Min | Max | Notes |
|---------|-----------|-----|-----|-------|
| `web-api` | CPU utilization | 1 | 3 | Scale on >70% CPU |
| `celery-worker` | Queue depth (KEDA or custom) | 1 | 5 | Scale on Redis queue length |
| `platform-ui` | CPU utilization | 1 | 3 | Scale on web traffic |

### Pod Disruption Budgets

| Service | Min available | Notes |
|---------|--------------|-------|
| `web-api` | 1 | Must have at least 1 ready during rolling update |
| `mobile-voice-gateway` | 1 | Active call sessions must not be disrupted |

---

## 8. Database Migration Rule

> **Migrations must run as controlled jobs, not implicitly from app startup.**

**Rules:**

1. `db.create_all()` must **not** run in production/staging on pod boot — it is banned from the production startup path. This is already violated in R040 (`apps/__init__.py:1487`) — tracked in `99-risk-register.md §R15`. Must be removed before P2.
2. Migrations must run as a **separate Job** (Kubernetes `Job` or manual step), observable, with exit code verification.
3. The app startup (`web-api` pod) must check migration state via `/api/ready` — if migrations are not current, the pod must return `503` until they are.
4. **Migration failure must not partially start a new app version.** Deployment rollout must wait for migration Job success before proceeding.
5. Rolling update strategy: run migration Job → verify success → deploy new app version → verify readiness.
6. `alembic stamp` requires prior schema equivalence verification (see `CLAUDE.md §Code-First Schema Rule`).

**Target migration pipeline:**

```
1. Build new Docker image
2. Push to ECR
3. Run Kubernetes Job: `alembic upgrade head` against live DB
4. Wait for Job completion (exit 0)
5. Deploy new Deployment image (rolling update)
6. Wait for all pods to pass /api/ready
7. Promote to PROD
```

**Current state (Phase 1):** Migrations are run manually via `python scripts/migrations/run_migration.py`. The automated migration Job does not exist yet (tracked in §R21 of risk register as future work).

---

## 9. Scaling Rules

| Service | Scales by | Scaling metric |
|---------|-----------|---------------|
| `platform-ui-web` | Web traffic | HTTP request rate, CPU |
| `platform-api` | API request load | Request rate, CPU |
| `platform-worker` | Queue length | Redis queue depth (KEDA) |
| `platform-scheduler` | N/A — single instance | — |
| `platform-ai-gateway` | AI call volume | LLM request rate (Phase 2+) |
| `platform-voice` | Concurrent sessions | Active WebSocket connections |
| `platform-data-sync` | Connector/indexing workload | Queue depth, ingestion lag |
| `platform-webhooks` | External event volume | Queue depth |

---

## 10. Security Boundaries

| Rule | Detail |
|------|--------|
| Public exposure | Only ingress routes are public — workers, scheduler, AI gateway (Phase 2), data-sync are internal only |
| `platform-ui-web` | No direct DB access, no direct provider credentials, no customer data outside what API returns |
| `platform-api` | JWT-protected for all write endpoints, service-to-service auth for internal APIs |
| Secrets | Only backend/internal pods get `platform-secrets` — UI gets only `NEXT_PUBLIC_*` and `NEXTAUTH_*` |
| Network policy | Future: restrict pod-to-pod traffic by namespace/label — only allowed routes |
| Provider credentials | Never in UI pods. Only in `platform-api` and `platform-ai-gateway` via SSM |
| Customer DB connections | Only via `platform-data-sync` / `platform-connectors` backend service — never directly from UI |
| Admin API | `/admin/api/*` must never be publicly routable without additional auth (X-API-Key or internal-only ingress rule) |

---

## 11. Observability Requirements

Every service must provide:

| Requirement | Detail |
|-------------|--------|
| Structured logs | JSON format, no raw exception strings exposed externally |
| Correlation ID | `X-Request-Id` header flows through UI → API → workers → AI gateway |
| Health endpoint | `/healthz` or `/api/health` — returns 200/503 |
| Readiness endpoint | `/api/ready` for backend — checks DB/Redis/migration state |
| Prometheus metrics | Exposed at `/metrics` (scraped by Prometheus in `monitoring` ns) |
| Error rate | `http_requests_total{status="5xx"}` — alert if >1% over 5 min |
| Latency | `http_request_duration_seconds` — p95 and p99 |
| Queue depth | `celery_queue_length{queue}` — alert if backlog grows unbounded |
| AI usage/cost | `ai_usage_tokens_total{org_id, provider, capability}` — per-org cost attribution |
| Deployment version | `app_info{version, commit_sha}` metric — always know which version is running |

---

## 12. CI/CD Pipeline Implications

Target deployment pipeline (not yet implemented — tracked in `15-action-backlog.md`):

```
1.  Build platform-ui Docker image  (if platform-ui changes)
2.  Build platform-api Docker image  (if platformengineer changes)
3.  Run backend tests (pytest)
4.  Run frontend tests (jest + playwright)
5.  Run migration dry-run (alembic check)
6.  Push images to ECR
7.  Apply Kubernetes migration Job for platform-api
8.  Wait for migration Job success (exit 0)
9.  Deploy platform-api Deployment (rolling update, wait for readiness)
10. Deploy platform-worker Deployment (rolling update)
11. Deploy platform-ui Deployment (rolling update)
12. Wait for all readiness probes
13. Run smoke tests (read-only, no side effects)
14. In PROD: manual approval gate before step 7+
```

**Current state:** CI/CD deploys platform-api + workers together (`cd-deploy-dual.yml`). platform-ui is deployed separately. Migration step is manual. Migration Job Kubernetes resource does not exist yet.

---

## 13. Current State vs Target

| Area | Current State | Target State | Round |
|------|--------------|-------------|-------|
| UI/API separation | platform-ui separate repo, separate Dockerfile (TBD) | ✅ Correct direction | R041-Infra doc |
| API pod | EKS `web-api` deployment | ✅ Separate | — |
| Worker pod | EKS `celery-worker` deployment (shares image) | ✅ Separate | — |
| Scheduler pod | EKS `celery-beat` deployment | ✅ Separate | — |
| Voice pods | EKS `voice-edge` + `mobile-voice-gateway` | ✅ Already separate | — |
| AI gateway | Inside `platform-api` codebase | Phase 2: own deployment | R043+ |
| Webhooks | Inside `platform-api` | Phase 2: own deployment | Future |
| Data-sync | Not implemented | P3 separate deployment | R049+ |
| Migration job | Manual `run_migration.py` | Kubernetes Job in pipeline | Future |
| `db.create_all()` ban | Violation in `apps/__init__.py:1487` | Must be removed | Before P2 |
| platform-ui Dockerfile | Not created | Required for UI pod | R041B+ |
| Health endpoints | `/api/health` partial | Full health + readiness | Platform-api round |

---

## 14. Enforcement Rules for Future Rounds

> Any round that adds a new service, new pod, or modifies deployment topology must:

- [ ] Add the service to this document's §1 Logical Services
- [ ] Define its health/readiness checks in §5
- [ ] Define its failure isolation behavior in §6
- [ ] Add its Kubernetes Deployment to §7
- [ ] Update scaling rules in §9
- [ ] Update security boundary rules in §10 if new network path opened
- [ ] Add observability requirements in §11

> Any round that adds a new background task or async job:

- [ ] Must run in `platform-worker` pod, not inline in `platform-api` request handler
- [ ] Must use Redis queue (not a cron inside the API process)
- [ ] Must be observable: task name + success/failure metric

> Any round that changes DB migration behavior:

- [ ] Must not use `db.create_all()` in production startup path
- [ ] Must follow the migration pipeline in §8
- [ ] Must update the migration state in §13 if current state changes
