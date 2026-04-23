# 09 — Modernization Opportunities

_Last updated: 2026-04-23_

---

## Quick Wins (1-5 days each)

### QW-1: Wire Real Authentication in platform-ui

**What**: Implement `next-auth` credentials provider calling Flask's login endpoint. Gate dashboard routes in Next.js middleware.

**Why**: Platform-ui is useless without auth. Everything else in the UI depends on this.

**Effort**: 1-2 days

**Risk**: Low — Flask login API already exists

### QW-2: API Client Codegen Setup

**What**: Add `flask-smorest` or `apispec` to Flask; annotate 5-10 critical endpoints with schemas; run `openapi-typescript` to generate `platform-ui/lib/api/types.ts` automatically.

**Why**: Eliminates manual type maintenance; catches backend→frontend drift in CI.

**Effort**: 2-3 days

**Risk**: Low — additive only

### QW-3: Delete Dead Code

**What**: Remove `apps/authentication/api_auth_OLD_BACKUP.py`, `apps/authentication/api_auth_optimized.py` (if superseded), dead commented-out blocks in `requirements.txt`. Move old files to `.archive/`.

**Why**: Reduces confusion; new developers don't know what's canonical.

**Effort**: 0.5 days

**Risk**: Low

### QW-4: Role-Based Route Guards in platform-ui

**What**: Add Next.js middleware that checks user role from session; redirect unauthorized routes to 403 page. Conditionally render nav items.

**Why**: Currently every user sees every nav item; clicking 80% of them returns 403.

**Effort**: 1 day

**Risk**: Low

### QW-5: Playwright E2E for Critical Flows

**What**: Add 3-5 Playwright tests covering: login, dashboard load, one helpdesk flow.

**Why**: Any refactor currently has zero UI safety net.

**Effort**: 1-2 days

**Risk**: Low

### QW-6: SSE Endpoint for Investigation Status

**What**: Add `GET /api/investigations/{id}/stream` Flask SSE endpoint; add `useEventSource` hook in platform-ui.

**Why**: Users currently have no way to watch AI investigation progress without refreshing.

**Effort**: 2-3 days

**Risk**: Low-medium (SSE in Flask is straightforward)

---

## Medium Improvements (1-4 weeks each)

### M-1: OpenAPI Full Coverage + TypeScript Codegen Pipeline

**What**: Add OpenAPI annotations to all Flask endpoints; CI step generates `platform-ui/lib/api/generated/` TypeScript types automatically on every backend push.

**Why**: Eliminates the manual `types.ts`; makes frontend→backend contract first-class.

**Effort**: 2-3 weeks (annotating 81 modules' routes)

### M-2: Migrate One Full Feature Domain to platform-ui

**What**: Choose one complete feature (suggestion: Helpdesk Sessions list + detail view) and build it end-to-end in platform-ui with real data, real auth, real RBAC. Remove the Jinja2 equivalent.

**Why**: Proves the migration pattern works; creates a template for all future migrations.

**Effort**: 2-3 weeks

### M-3: Standardize Flask API Response Envelope

**What**: Create `apps/utils/response.py` — `ApiResponse(data, error, meta)` Pydantic model. Enforce in all route handlers. Update `platform-ui` client to handle the envelope.

**Why**: Frontend currently gets inconsistent shapes from different endpoints.

**Effort**: 1 week (implementation) + ongoing migration

### M-4: Pydantic on New Flask Endpoints

**What**: For every new Flask endpoint (not existing ones), require a Pydantic model for request body and response. Add `pydantic` to `requirements.txt`.

**Why**: Input validation is inconsistent; type safety at the boundary reduces bugs.

**Effort**: Ongoing practice, 3 days to establish pattern + tooling

### M-5: Structured Logging + CloudWatch Forwarding

**What**: Replace all `print()` with `structlog` or stdlib `logging` with JSON formatter. Add Fluent Bit DaemonSet to EKS to forward to CloudWatch Logs Insights.

**Why**: Currently impossible to correlate errors across services during incidents.

**Effort**: 1 week

### M-6: iOS Build Pipeline

**What**: Add EAS Build configuration for iOS. Set up GitHub Actions for iOS builds.

**Why**: Android-only mobile app limits adoption.

**Effort**: 1-2 weeks (requires Apple Developer account + certificate setup)

---

## Strategic Redesigns (1-3 months each)

### S-1: Formal Module Boundary Enforcement

**What**: Introduce `import-linter` with a dependency graph that defines which modules can import which. Enforce in CI. Gradually move toward DDD bounded contexts.

**Why**: Current 81-module system has no firewall. One change can cascade silently.

**Impact**: Enables future microservice extraction with confidence.

**Effort**: 1 month (initial setup) + ongoing

### S-2: Extract AI Provider Layer as Shared Package

**What**: Move `apps/ai_providers/` to a standalone Python package (`@platform/ai-providers`). Both `apps/` and any future microservices import from it.

**Why**: Best code in the codebase deserves first-class treatment. Reusable across future services.

**Effort**: 2-3 weeks

### S-3: FastAPI Gateway for New API Surface

**What**: Stand up a FastAPI service as the primary API for platform-ui (not replacing Flask, but handling new routes). Use async SQLAlchemy. OpenAPI auto-generated.

**Why**: Flask is synchronous; FastAPI is async, has native Pydantic, and auto-generates OpenAPI. New features should be built here.

**Migration**: Flask handles legacy + Jinja2; FastAPI handles new API surface. Cloudflare or Nginx routes by path prefix.

**Effort**: 3-4 weeks (service setup + first domain migration)

### S-4: Real-Time Infrastructure (WebSocket/SSE at Scale)

**What**: Replace polling with proper real-time: Server-Sent Events (SSE) for investigation status, Redis pub/sub as backend bus, platform-ui `useEventSource` + optimistic updates.

**Why**: AI investigations are long-running; technicians need live progress. Approval notifications must be push.

**Effort**: 3-4 weeks

### S-5: Design System Documentation

**What**: Set up Storybook in platform-ui. Document every shadcn/ui extension, custom component, and design token. Include RTL variants for every component.

**Why**: Without a living design system, each new page reinvents patterns.

**Effort**: 2-3 weeks initial; ongoing

### S-6: Observability Stack

**What**: Add Grafana + Prometheus (already have Prometheus) + Loki for logs + Tempo for traces. Single dashboard for: API latency, AI call costs, investigation success rate, voice session health.

**Why**: Currently flying blind on production behavior.

**Effort**: 2-3 weeks for initial setup
