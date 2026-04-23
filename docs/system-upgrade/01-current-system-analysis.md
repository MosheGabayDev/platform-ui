# 01 — Current System Analysis

_Last updated: 2026-04-23 | Evidence from: platformengineer codebase_

---

## Repository Root Structure

```
platformengineer/
├── apps/                          # 81 modules — Flask app packages
│   ├── __init__.py                # App factory
│   ├── authentication/            # Login, RBAC, SAML, session
│   ├── helpdesk/                  # Core helpdesk domain (37+ tables)
│   ├── ai_agents/                 # Claude/AI investigation engine
│   ├── ai_providers/              # Provider abstraction (OpenAI/Gemini/Anthropic/Ollama)
│   ├── ala/                       # AI Life Assistant ("Secretary Engine")
│   ├── billing/                   # Billing, Stripe, AI usage tracking
│   ├── outbox/                    # Transactional outbox for async events
│   ├── mobile_voice/              # Mobile voice API (ICE config, WebRTC signaling)
│   ├── observability/             # Prometheus metrics
│   ├── api_v1/                    # Versioned REST API (partial)
│   └── [60+ more modules]
├── templates/                     # Jinja2 templates (20+ subdirs)
├── static/                        # CSS/JS/images (Flask-served)
├── realtime-voice-go/             # Go microservice — Gemini Live voice gateway
├── mobile-app-rn-v2/              # React Native mobile app
├── voice-edge/                    # WebRTC voice edge service
├── ai-agents-ui/                  # Vite+React mini-UI for agent dashboard
├── ala-ui/                        # Vite+React mini-UI for ALA interface
├── ops-ui/                        # Vite+React mini-UI for ops view
├── dyn-dt-ui/                     # Vite+React mini-UI for dynamic datatables
├── deployment/kubernetes/         # K8s base, overlays (EKS), policies
├── .github/workflows/             # 25+ CI/CD workflow files
├── scripts/                       # 100+ operational scripts
├── DR/                            # Disaster recovery scripts
├── DOCS/                          # Architecture docs, decisions log
└── migrations/                    # Alembic migration files (39 parallel heads)
```

---

## Backend Architecture

### Entry Points

- `run.py` (15KB) — Flask app initialization, blueprint registration, all 81 module registrations
- `wsgi.py` — waitress/gunicorn WSGI adapter
- `celery_worker.py` — Celery entry point for async task workers

### App Factory (`apps/__init__.py`)

Standard Flask application factory pattern. Registers all blueprints on `create_app()`. SQLAlchemy + Flask-Migrate for ORM. Redis for caching and Celery broker.

### Module Count

81 modules under `apps/`. This is not bloat — each module is a genuine bounded concern, but they are not bounded *contexts* in the DDD sense. Cross-module imports are common and unregulated.

### Key Domain Modules

| Module | Tables | Purpose |
|--------|--------|---------|
| `helpdesk` | 37+ | Core IT helpdesk: sessions, tickets, tool calls, SLA, workflows |
| `ai_agents` | 10 | Claude-based investigation engine |
| `ai_providers` | ~8 | Multi-provider AI abstraction (OpenAI, Anthropic, Gemini, Ollama) |
| `ala` | 15+ | AI Life Assistant / Secretary Engine |
| `billing` | ~6 | Stripe, AI usage cost tracking, feature gating |
| `outbox` | 2 | Transactional outbox for reliable async events |
| `authentication` | ~5 | Flask-Login, RBAC, SAML (disabled), OAuth |
| `mobile_voice` | ~3 | WebRTC ICE config, voice session management |
| `observability` | 2 | Prometheus metrics exposition |

### The ALA Module (`apps/ala/`)

The most architecturally sophisticated module. Contains:
- `SecretaryEngine` — multi-step AI orchestration with trust, policy, intent parsing
- Multi-provider model routing (`model_router.py`)
- Consent, licensing, trust verification systems
- Voice inbound/outbound pipelines
- Browser automation integration
- Full OpenAPI spec (`openapi.yaml`)
- Idempotency, decision trace, memory facade

This module is effectively a product within a product — a personal AI assistant that executes multi-step life admin tasks (calendar, email, reminders) with explicit consent and trust management.

### Database Design

- PostgreSQL exclusively (MySQL removed)
- 39 Alembic migration roots (parallel heads by design — each module owns migrations)
- JSONB used extensively for flexible payloads (tool snapshots, config, recommendations)
- All tables enforce `org_id` for multi-tenant row isolation
- Partitioned tables: `AIUsageLog` (monthly), `ToolInvocation` (monthly)
- Foreign keys defined but cascade behavior varies

### Task Queue

- Celery with Redis broker
- Multiple worker pools: `celery-worker`, `celery-beat`, `celery-worker-{life,ops,agents}`
- All workers share the same Docker image as web-api
- Tasks defined per-module (`tasks.py` files)

### AI Provider Layer (`apps/ai_providers/`)

A genuine provider abstraction with:
- 4-level resolution hierarchy: user override → module override → system default → error
- Circuit breaker per-provider (Redis-backed: CLOSED/OPEN/HALF_OPEN)
- Redis resolution cache (60s TTL)
- Adapters: `AnthropicAdapter`, `GeminiAdapter`, `OpenAIAdapter`, `OllamaAdapter`, `OpenAICompatibleAdapter`
- Encrypted API keys in SSM, resolved via `key_resolver.get_api_key(org_id, capability)`

### Real-Time Voice Pipeline

```
Mobile → WebRTC → STUNner (K8s TURN) → voice-edge (WebRTC SFU)
       → Go realtime-voice-go → Gemini Live API (models/gemini-2.5-flash-native-audio-latest)
```

Go service (`realtime-voice-go/`) handles the Gemini Live audio stream. Billing and transcripts written back to PostgreSQL via the outbox.

---

## Frontend (Current)

### Jinja2 Templates (`templates/`)

- 20+ subdirectories, each corresponding to an `apps/` module
- Mix of Bootstrap-era HTML, some Tailwind, scattered jQuery
- Not a design system — no shared component library
- Server-side rendering with occasional AJAX calls
- Not RTL-consistent despite Hebrew-primary user base

### Embedded React Mini-Apps

| Directory | Framework | Purpose |
|-----------|-----------|---------|
| `ai-agents-ui/` | Vite + React + Tailwind | Agent investigation dashboard |
| `ala-ui/` | Vite + React + Tailwind | ALA interface |
| `ops-ui/` | Vite + React + Tailwind | Ops automation view |
| `dyn-dt-ui/` | Vite + React + Tailwind | Dynamic datatable component |

Each is a standalone Vite build embedded into a Jinja2 template via `<script>` tags. No shared state, no shared component library, no design system across them.

---

## Mobile App (`mobile-app-rn-v2/`)

- React Native 0.83 + Expo SDK 55
- Tamagui 2.0 for UI
- Zustand for state
- Expo Router for navigation
- Android APK distribution (no App Store)
- Communicates with Flask backend for ICE config, then directly with EKS voice stack

---

## Infrastructure Summary

- **EKS**: `platform-test` cluster, eu-west-1, 1× t3a.xlarge Spot node
- **Images**: ECR, built by GitHub Actions
- **Secrets**: AWS SSM Parameter Store → K8s Secrets → Pod env vars
- **Ingress**: Cloudflare Tunnel → Nginx Ingress → Flask (no NLB for HTTPS)
- **DNS**: Cloudflare only, no Route53
- **Observability**: Prometheus metrics via `apps/observability/metrics.py`, no centralized logging stack identified
- **CI/CD**: 25+ GitHub Actions workflows — build, deploy (EKS + local), SAST, secret scanning, IaC

---

## Key Patterns Observed

### Good Patterns

1. **Outbox pattern** (`apps/outbox/`) — events written to DB before async processing; prevents event loss on crash
2. **Provider abstraction** (`apps/ai_providers/`) — circuit breaker + cache + adapter pattern; clean
3. **RBAC decorators** (`apps/authentication/rbac.py`) — consistent `@role_required`, `@permission_required`
4. **INDEX.md per module** — navigation convention maintained
5. **SSM-first secrets** — never hardcoded; always via SSM → K8s Secret → env var

### Problematic Patterns

1. **81 modules with unregulated cross-imports** — no enforced module boundary
2. **Scattered Vite mini-apps** — 4 separate React builds with no shared package
3. **39 Alembic parallel heads** — works but archaeologically complex
4. **Templates directory mismatch** — `templates/` and `apps/*/templates/` both exist
5. **run.py (15KB)** — monolithic entrypoint with all blueprint registrations; becomes maintenance burden
6. **No OpenAPI spec for most endpoints** — ALA has `openapi.yaml`, everything else is undocumented
