# 04 — Architecture Assessment

_Last updated: 2026-04-23_

---

## Architectural Style

The backend is a **Flask monolith** with domain-oriented modules under `apps/`. It is not a microservices architecture, though some micro-services exist alongside it:

- `realtime-voice-go` — Go service for Gemini Live audio
- `voice-edge` — WebRTC SFU
- `mobile-voice-gateway` — Go voice signaling

The overall architecture is best described as **modular monolith + satellite microservices**.

---

## What Works Well

### 1. AI Provider Abstraction (`apps/ai_providers/`)

The provider layer is the strongest architectural component. It implements:
- Adapter pattern per provider (Anthropic, Gemini, OpenAI, Ollama)
- Circuit breaker with Redis state (CLOSED/OPEN/HALF_OPEN)
- 4-level resolution hierarchy with cache
- Encrypted key storage via SSM

This is genuinely well-designed. It should be preserved and possibly extracted as a shared library.

### 2. Transactional Outbox (`apps/outbox/`)

Correct implementation of the outbox pattern:
- Events written to `platform_outbox` table in same DB transaction as domain write
- Consumer reads and processes reliably
- Prevents event loss on crash

### 3. Multi-Tenancy Enforcement

`org_id` is present in every table and most service methods. The code convention is to always pass `org_id` from auth context, never from request body.

### 4. Helpdesk Domain Model

The `helpdesk/models.py` with 37+ tables is surprisingly clean for its size. The model separation between sessions, tickets, timeline, tool invocations, and graph structures is logical. The approval workflow (PolicyRule → tool_call.idempotency_key) is non-trivial and correctly implemented.

### 5. RBAC Decorators

`@role_required` and `@permission_required` are consistent, work for both API (JSON 403) and browser (redirect), and bypass correctly for admins.

---

## Where Architecture Breaks Down

### 1. No Module Boundary Enforcement

81 modules with no import firewall. Any module can import any other. In practice, cross-module coupling is widespread. Examples:
- `helpdesk` imports from `ai_providers`, `billing`, `authentication`, `outbox`, `ala`
- No enforced dependency direction

**Risk**: Changes in one module silently break others. Impossible to reason about blast radius.

### 2. run.py as God File (15KB)

`run.py` registers all 81 blueprints and wires initialization. Every new module adds to this file. It is already 15KB and growing. This file is a permanent merge conflict source and a cognitive overhead for every developer.

**Evidence**: `run.py` contains blueprint registration + all startup logic in one place.

### 3. Fragmented Frontend: 4 Embedded Vite Apps

`ai-agents-ui/`, `ala-ui/`, `ops-ui/`, `dyn-dt-ui/` are four separate React builds with:
- No shared component library
- No shared state management
- No shared design tokens
- Each built and embedded into Jinja2 separately

This means 4× the maintenance cost for common components (buttons, modals, tables).

### 4. No API Contract

Flask routes have no formal schema. The frontend must:
- Reverse-engineer endpoint shapes from Python code
- Accept breaking changes silently
- Has no generated TypeScript types

`platform-ui` already has a manually maintained `types.ts` — this will drift from the backend.

### 5. Alembic 39 Parallel Heads

Each module's migrations are independent roots. This is intentional but:
- `alembic current` output is archaeology
- Rollback is per-module, not system-wide
- New developers assume this is corruption

### 6. No Dependency Injection in Services

Flask services use class-level static methods with direct `db.session` access. This:
- Makes unit testing hard (must mock at module level)
- Couples services to Flask context
- Prevents proper async migration later

Evidence: `SessionService.create_session()` calls `db.session` directly; tests must use app context.

### 7. Configuration Spread

Config lives in:
- `.env` (local)
- `apps/config.py`
- K8s Secrets (via SSM)
- Kustomize overlays

No single source of truth for what config keys exist. `.env.sample` is the closest but manually maintained.

### 8. Observability Gaps

- `apps/observability/metrics.py` — Prometheus metrics exposed
- No distributed trace IDs flowing through the call chain (despite `trace_id.py` middleware)
- No structured log aggregation
- No alerting rules defined in code
- One-liner `otel.py` in helpdesk but no actual OpenTelemetry configured

---

## Separation of Concerns

| Concern | Current State |
|---------|--------------|
| HTTP routing | Flask blueprints — adequate |
| Business logic | In `services/` subdirs — good intent, inconsistent depth |
| Data access | SQLAlchemy in models + services — mixed |
| Background tasks | Celery tasks — adequate but not well-tested |
| External API calls | Scattered in services, no HTTP client abstraction |
| Config | Spread across multiple files |
| Auth | Flask-Login + decorators — adequate but tightly coupled |

---

## Dependency Flow (Inferred)

```
HTTP Request → Flask Blueprint → Service Layer → Models (SQLAlchemy) → PostgreSQL
                              ↓
                         Celery Task (async)
                              ↓
                    External AI Provider (via ai_providers/)
                    External Infrastructure (SSH/K8s API)
                              ↓
                         Outbox Writer → PostgreSQL outbox
                                              ↓
                                       Outbox Consumer (Celery) → Notification/Event
```

Cross-cutting: auth decorators, observability middleware, rate limiting, RBAC checks

---

## Reuse Patterns

Good reuse in:
- `get_api_key()` — always used for AI provider keys
- `@role_required`, `@permission_required` — consistent
- `write_call_ended_to_outbox()` — outbox writes centralized
- `IndexMaintenance` convention — docs

Weak reuse in:
- Error handling — each module has its own error patterns
- Response formatting — no shared `ApiResponse` wrapper
- Pagination — inconsistent across list endpoints
- Logging — mix of `print()`, `logging.info()`, `logger.debug()`
