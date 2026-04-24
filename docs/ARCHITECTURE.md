# Platform UI Architecture Blueprint

## 1. Purpose

This document defines the professional architectural foundation for the new **Platform UI** system.

The goal is to rebuild the user experience of the existing platform into a modern, secure, modular, scalable, and cross-platform product that is pleasant, intuitive, and efficient to use.

This blueprint is intended to guide:

- Product structure
- Frontend architecture
- Cross-platform strategy
- UI/UX standards
- Security design
- Modular boundaries
- Engineering conventions
- Migration planning

---

## 2. Vision

Platform UI should become a modern operational platform interface for platform engineering workflows.

It should provide:

- Clear and efficient workflows
- Consistent design language
- Low cognitive load
- Fast navigation and discoverability
- Enterprise-grade security controls
- Modular feature ownership
- Strong scalability across products, teams, and environments
- A reusable foundation for web, mobile, and desktop clients

---

## 3. Product Principles

### 3.1 User Experience Principles

1. **Clarity before decoration**  
   Interfaces should prioritize comprehension, hierarchy, and actionability over visual noise.

2. **Fast task completion**  
   The system should reduce friction for common platform workflows.

3. **Consistency everywhere**  
   Similar actions, layouts, forms, and feedback patterns must behave consistently.

4. **Safe by design**  
   Risky and destructive actions must be visibly guarded and auditable.

5. **Progressive complexity**  
   Basic actions should be easy, advanced actions should remain accessible without overwhelming users.

6. **Operational trust**  
   Users should always understand system state, action outcome, and permission scope.

### 3.2 Engineering Principles

1. **Type-safe by default**
2. **Contract-first API integration**
3. **Modular feature boundaries**
4. **Shared foundations, isolated domains**
5. **Security as architecture, not patchwork**
6. **Scalability through standardization**
7. **Design system before screen explosion**

---

## 4. Recommended Technology Stack

### 4.1 Primary Stack

- **TypeScript** as the primary language
- **React** for UI composition
- **Next.js** for the web application
- **Tailwind CSS** for styling
- **shadcn/ui** for accessible, composable UI primitives
- **TanStack Query** for server state management
- **Zod** for runtime validation and schema safety
- **React Hook Form** for complex forms
- **Storybook** for the design system and component documentation
- **Playwright** for end-to-end testing
- **Vitest** for unit and component testing
- **Turborepo** for monorepo orchestration

### 4.2 Cross-Platform Stack

#### Web
- Next.js

#### Mobile
- React Native with Expo

#### Desktop
- Tauri

### 4.3 Why this stack

This stack provides:

- Strong professional ecosystem maturity
- Excellent TypeScript support
- Shared knowledge and packages across platforms
- Modern UI performance
- High reusability
- Better maintainability than separate unrelated stacks
- Good security posture with lightweight desktop distribution through Tauri

---

## 5. Repository Strategy

### Recommended target state: Monorepo

Although creating a separate `platform-ui` repository is a valid first step, the recommended long-term direction is to evolve into a structured monorepo.

### Suggested structure

```text
platform-ui/
  apps/
    web/
    mobile/
    desktop/
  packages/
    ui/
    design-tokens/
    api-client/
    auth/
    types/
    utils/
    config-eslint/
    config-typescript/
  docs/
    architecture/
    ux/
    adr/
```

### Why monorepo is preferred

- Shared types across clients
- Shared design system
- Shared auth logic
- Shared validation schemas
- Shared linting and TypeScript configs
- Simpler CI/CD governance
- Better consistency across products

If backend remains in a separate repository, the frontend monorepo should still consume a **contract-first API definition**.

---

## 6. Frontend Architecture

### 6.1 Architecture style

Use a **feature-oriented modular frontend architecture**.

Avoid organizing only by technical file type. Instead, organize by domain and shared layers.

### 6.2 Suggested web structure

```text
apps/web/src/
  app/
  modules/
    dashboard/
    services/
    deployments/
    environments/
    observability/
    access/
    audit/
    settings/
  shared/
    ui/
    api/
    auth/
    hooks/
    lib/
    types/
    constants/
```

### 6.3 Layer responsibilities

#### app/
Routing, layout composition, app shell, providers, global bootstrapping

#### modules/
Feature-specific UI, logic, queries, mutations, forms, permissions

#### shared/
Reusable technical and design primitives used by multiple modules

### 6.4 Rules

- Business logic should not live inside low-level UI components
- Shared packages must remain generic
- Domain modules must not leak hidden dependencies into each other
- Permissions must be applied at route, view, and action level
- Validation must exist both at form and API boundary levels

---

## 7. Design System Strategy

### 7.1 Objective

Create a reusable design system that ensures consistency, accessibility, and maintainability.

### 7.2 Layers of the design system

1. **Design Tokens**
   - colors
   - spacing
   - border radius
   - typography
   - shadows
   - motion
   - z-index

2. **Primitives**
   - button
   - input
   - select
   - checkbox
   - modal
   - tooltip
   - badge
   - table primitives

3. **Patterns**
   - page header
   - filter bar
   - data table layout
   - detail panel
   - side navigation
   - empty state
   - confirmation dialog
   - audit timeline

4. **Templates**
   - dashboard page
   - form page
   - entity list page
   - entity details page
   - settings page

### 7.3 Accessibility requirements

- Keyboard navigability
- Proper semantic HTML roles
- Focus visibility
- Color contrast compliance
- ARIA support where required
- Screen-reader friendly feedback

### 7.4 Storybook requirement

Every reusable component and pattern should be documented in Storybook with:

- states
- variants
- accessibility notes
- usage guidelines
- do and do not examples

---

## 8. UX Structure for Platform Workflows

### 8.1 App shell

The base product shell should include:

- Left-side navigation with stable domain groups
- Top bar with search, environment context, notifications, and user menu
- Breadcrumbs for deep navigation
- Fast global search / command palette
- Theme support
- Responsive behavior

### 8.2 Recommended top-level domains

- Dashboard
- Services
- Deployments
- Environments
- Infrastructure
- Secrets
- Access Management
- Observability
- Audit Logs
- Settings

### 8.3 UX patterns

#### Lists and tables
- Saved views
- Search and filters
- Bulk actions
- Column management
- Row-level quick actions
- Clear empty and loading states

#### Forms
- Sectioned forms
- Inline validation
- Safe defaults
- Draft support where relevant
- Review before submit for risky actions

#### Destructive actions
- Confirmation flows
- Required context display
- Permission checks
- Audit logging
- Optional approvals for sensitive operations

#### Feedback
- Clear success messages
- Actionable error messages
- Retry patterns
- Long-running action progress visibility

---

## 9. State Management Strategy

### 9.1 Recommended state split

- **Server state**: TanStack Query
- **Form state**: React Hook Form
- **Local UI state**: component state or lightweight store
- **Global app state**: only where necessary

### 9.2 Recommended approach

Prefer local state and query state first.
Use a global store only for app-wide concerns such as:

- session context
- theme
- active tenant/project/environment
- command palette state
- feature flag exposure

### 9.3 Store choice

- **Zustand** for lightweight global state
- **Redux Toolkit** only if the application reaches significant cross-domain complexity

---

## 10. API and Integration Strategy

### 10.1 Contract-first integration

Frontend should not depend on undocumented backend assumptions.

Use one of the following:

- **OpenAPI-driven client generation**
- **tRPC**, if the entire stack is TypeScript and tightly coupled

### 10.2 Requirements

- Typed API client package
- Shared request/response contracts
- Centralized error normalization
- Auth-aware HTTP client
- Retry policy for safe operations
- Request cancellation where relevant

### 10.3 Validation model

- Validate form input in UI
- Validate payload shape before mutation
- Treat server validation as authoritative

---

## 11. Security Architecture

### 11.1 Security goals

The UI must support enterprise-safe operation and not merely present data.

### 11.2 Core controls

- RBAC and optionally ABAC
- Route-level permission guards
- Action-level permission guards
- Secure session management
- OIDC / SSO readiness
- Audit trail visibility
- Safe handling of secrets and tokens
- CSP and XSS hardening
- CSRF protection where relevant
- No sensitive secrets stored in the client
- Sensitive action confirmation workflows

### 11.3 Recommended auth direction

- External identity provider integration
- Token/session abstraction in shared auth package
- Session refresh strategy
- Forced logout and revocation support

### 11.4 Sensitive workflow examples

The following actions should always be considered sensitive:

- deleting environments
- rotating secrets
- changing access permissions
- promoting to production
- modifying infrastructure settings

These flows should include clear authorization, confirmation, and audit behavior.

---

## 12. Observability and Quality

### 12.1 Frontend observability

Implement:

- structured error capture
- user action telemetry
- performance metrics
- route transition monitoring
- API error categorization

### 12.2 Quality gates

Required quality standards:

- linting
- formatting
- strict TypeScript configuration
- unit tests
- integration tests where needed
- end-to-end tests for critical workflows
- accessibility checks

### 12.3 CI expectations

CI should validate:

- typecheck
- lint
- unit tests
- build
- e2e smoke tests on protected branches

---

## 13. Cross-Platform Strategy

### 13.1 Target model

The platform should support:

- Web as the primary full-featured operational client
- Mobile for focused workflows, monitoring, approvals, and alerts
- Desktop for operators needing persistent tooling and native-style distribution

### 13.2 Recommended responsibility split

#### Web
Primary administrative and operational experience

#### Mobile
Focused tasks such as:
- notifications
- approvals
- incident awareness
- limited management operations

#### Desktop
Advanced operator workflows where desktop distribution is useful

### 13.3 Shared packages across platforms

- design tokens
- types
- auth abstractions
- api client
- utility functions
- business schemas

Do not attempt to force every component to be shared identically.
Shared logic is more important than blindly shared UI.

---

## 14. Coding Standards

### 14.1 Required standards

- TypeScript strict mode
- ESLint and Prettier
- No untyped API access
- No business logic inside presentational primitives
- Prefer composition over duplication
- Clear folder ownership by domain
- Explicit naming conventions
- Consistent error handling

### 14.2 Component rules

- Presentational components should be reusable and dumb where possible
- Feature components may orchestrate domain behavior
- Hooks should encapsulate reusable logic
- API calls should not be scattered randomly throughout components

### 14.3 Styling rules

- Use design tokens
- Avoid arbitrary one-off values unless justified
- Document layout decisions
- Maintain responsive design discipline

---

## 15. Migration Strategy

### Phase 1 — Foundation

- Establish architecture decisions
- Create monorepo structure or structured frontend repo
- Implement design tokens
- Implement base app shell
- Create shared UI primitives
- Establish auth and API client foundations

### Phase 2 — Experience baseline

- Build navigation system
- Build dashboard shell
- Build common table and form patterns
- Implement theme, notifications, and command palette

### Phase 3 — Module migration

Migrate one domain at a time:

- dashboard
- services
- deployments
- environments
- access
- observability
- audit

### Phase 4 — Platform expansion

- Add mobile focused workflows
- Add desktop packaging if justified
- Add advanced analytics and observability

### Phase 5 — Hardening

- Security reviews
- Accessibility reviews
- performance optimization
- governance and developer platform maturity

---

## 16. ADRs to create next

The following Architecture Decision Records should be written next:

1. Frontend framework selection
2. Monorepo vs multi-repo decision
3. Web/mobile/desktop platform strategy
4. Auth and identity integration model
5. API contract model
6. State management model
7. Design system governance model
8. Observability stack

---

## 17. Final Recommendation

The current decision to create a new `platform-ui` repository is a good strategic starting point.

However, to ensure long-term professional quality, the UI rebuild should not be treated as a simple visual redesign. It should be treated as a **platform foundation initiative**.

The most professional direction is:

- TypeScript-first frontend platform
- React + Next.js for web
- React Native + Expo for mobile
- Tauri for desktop where needed
- Shared design system and typed contracts
- Modular architecture with strong security and UX governance

This document should serve as the baseline for all future implementation decisions.

---

## 18. RTL & Hebrew Architecture

### 18.1 RTL-First Mandate

Platform UI is built **RTL-first** — Hebrew is the default language. English is a secondary language. All layout decisions must work correctly in RTL before being considered done.

This is not an afterthought. RTL must be treated as a first-class architectural constraint from day one.

### 18.2 HTML & CSS Rules

- `<html lang="he" dir="rtl">` on every page
- Use **CSS logical properties** exclusively — never physical directional values:

| ❌ Forbidden | ✅ Required |
|---|---|
| `padding-left` / `padding-right` | `padding-inline-start` / `padding-inline-end` |
| `margin-left` / `margin-right` | `margin-inline-start` / `margin-inline-end` |
| `left: 0` / `right: 0` | `inset-inline-start: 0` / `inset-inline-end: 0` |
| `text-align: right` | `text-align: start` |

- Tailwind v4 logical aliases: `ps-*` / `pe-*` / `ms-*` / `me-*` / `start-*` / `end-*`
- shadcn/ui initialized with `--rtl` flag — Radix primitives handle RTL natively

### 18.3 Typography

| Context | Font | Subsets |
|---|---|---|
| Hebrew UI (default) | Rubik | `latin` + `hebrew` |
| Arabic UI | Cairo | `latin` + `arabic` |
| Code / monospace | System mono | — |

- Minimum readable size: `text-xs` (12px) for content, never smaller
- `font-size: 16px` minimum on inputs — prevents iOS Safari auto-zoom
- `tabular-nums` on all numeric data for visual alignment

### 18.4 Sidebar

- Sidebar renders on the **right side** (`side="right"` in shadcn SidebarProvider)
- Mobile: Sheet slides from right
- Active indicator: right-side border (logical: `border-inline-end`)

### 18.5 Icon Directionality

Chevrons, arrows, and directional icons must be mirrored in RTL:
- `ChevronLeft` visually points "forward" in RTL
- Use `rtl:rotate-180` Tailwind utility or CSS `[dir="rtl"] { transform: scaleX(-1) }` where needed
- Never hardcode direction in icon usage

### 18.6 Testing RTL

Every new component must be verified in:
- Chrome with `dir="rtl"` active
- iOS Safari (Hebrew keyboard causes font fallback edge cases)
- Both LTR and RTL simultaneously if multi-language support is planned

---

## 19. AI Dashboard Customization Stack

### 19.1 Vision

Users should be able to say:
> "הצג לי פניות שנפתחו השבוע לפי טכנאי כגרף עמודות"
> *"Show me tickets opened this week by technician as a bar chart"*

...and a real widget appears on their dashboard, positioned in a drag-and-drop grid they control.

This is not a future feature — it is a core architectural capability that must be designed in from the beginning.

### 19.2 Recommended Stack

| Layer | Technology | Role |
|---|---|---|
| **AI Interaction** | CopilotKit (`@copilotkit/react-core`) | AI that mutates dashboard state via `useCopilotAction` |
| **LLM Streaming** | Vercel AI SDK v6 (`ai`) | Tool calling, streaming, agent abstraction |
| **Chat UI** | shadcn/ui AI components + `@assistant-ui/react` | RTL-compatible chat sidebar |
| **Widget Library** | Tremor v3 (`@tremor/react`) | KPI cards, charts, tables — Tailwind-native, dark mode |
| **Charts (advanced)** | Apache ECharts (`echarts-for-react`) | Real-time time-series, heatmaps, monitoring charts |
| **Dashboard Grid** | `react-grid-layout` | Drag, resize, and persist widget layout per user |
| **NL-to-Data** | Vanna.ai (Python/Flask) | Text → SQL grounded in your schema |
| **Semantic Layer** | Cube.dev (optional, Phase 4+) | Safe multi-tenant metric definitions |

### 19.3 Architecture Pattern

```
User types natural language in AI sidebar
  ↓
Vercel AI SDK / CopilotKit processes intent
  ↓
LLM calls tool: renderWidget({ type, metric, filter, range })
  ↓
Flask backend (via Vanna or direct SQL) returns data
  ↓
useCopilotAction fires → dashboard state updated
  ↓
react-grid-layout renders Tremor chart component in empty slot
  ↓
Layout saved as JSON in PostgreSQL per user/org
```

### 19.4 Widget Config Schema

Every widget must be serializable to a JSON config stored in the database:

```typescript
interface WidgetConfig {
  id: string;
  type: "bar" | "line" | "area" | "kpi" | "donut" | "table" | "heatmap";
  title: string;
  metric: string;
  filters?: Record<string, unknown>;
  groupBy?: string;
  range?: string;
  layout: { x: number; y: number; w: number; h: number };
}
```

### 19.5 AG-UI Protocol

CopilotKit implements the **AG-UI open protocol** (adopted by Google, AWS, Microsoft, LangChain).  
This ensures the AI-to-UI communication layer is standards-based and not proprietary.  
State synchronization happens via `STATE_SNAPSHOT` and `STATE_DELTA` events.

### 19.6 Privacy & Multi-tenant Safety

- The LLM must **never** receive raw SQL or direct DB access
- All data queries go through an API layer that enforces `org_id` scoping
- Vanna/Cube must be configured per-tenant or with tenant-aware query guards
- Widget configs stored per `(user_id, org_id)` — never cross-tenant accessible

---

## 20. Real-time Data Architecture

### 20.1 Why Real-time Matters

The dashboard shows service health, AI call activity, ticket queue, and system metrics. This data changes continuously. Polling every 30 seconds creates a dashboard that feels dead. Real-time updates create a dashboard that feels alive — which is the core design principle of this system ("Alive but calm").

### 20.2 Recommended Technology

**Server-Sent Events (SSE)** over WebSockets for most use cases:

| Criterion | SSE | WebSocket |
|---|---|---|
| Direction | Server → Client only | Bidirectional |
| HTTP/2 multiplexing | ✅ Yes | ❌ No |
| Auto-reconnect | ✅ Built-in | Manual |
| Cloudflare Tunnel compatibility | ✅ Yes | ✅ Yes |
| Flask implementation | `flask-sse` / generator | `flask-socketio` |
| Complexity | Low | Medium |

**Use SSE for:** live metrics, service health updates, activity feed, alert notifications.  
**Use WebSocket for:** collaborative features, bidirectional AI chat with voice, remote assist sessions.

### 20.3 Flask SSE Implementation

```python
# apps/realtime/routes.py
from flask import Response, stream_with_context
import json, time

@bp.route("/stream/dashboard")
@login_required
def dashboard_stream():
    def generate():
        while True:
            data = get_dashboard_snapshot(org_id=current_user.org_id)
            yield f"data: {json.dumps(data)}\n\n"
            time.sleep(5)
    return Response(stream_with_context(generate()), mimetype="text/event-stream")
```

### 20.4 Next.js SSE Consumer

```typescript
// lib/hooks/use-live-dashboard.ts
import { useEffect, useState } from "react";

export function useLiveDashboard() {
  const [data, setData] = useState<DashboardSnapshot | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/stream/dashboard");
    es.onmessage = (e) => setData(JSON.parse(e.data));
    es.onerror = () => es.close();
    return () => es.close();
  }, []);

  return data;
}
```

### 20.5 TanStack Query Integration

TanStack Query manages server state with caching and background refetch.  
SSE provides the push layer for instant updates.

```
TanStack Query  → initial load + cache + background refetch (polling fallback)
SSE             → instant push for real-time events
Zustand         → local UI state (selected filters, widget visibility)
```

### 20.6 What Updates in Real-time

| Data | Update frequency | Method |
|---|---|---|
| Service health status | 10 seconds | SSE |
| Active AI call count | 5 seconds | SSE |
| Activity feed (new events) | Push on event | SSE |
| Ticket queue count | 30 seconds | TanStack Query |
| System metrics (CPU/memory) | 15 seconds | SSE |
| Notifications/alerts | Push on event | SSE |

### 20.7 Performance Considerations

- One SSE connection per authenticated user — do not create per-widget connections
- Multiplex all dashboard events through a single `/stream/dashboard` endpoint
- Apply `org_id` filter server-side — never send cross-tenant data
- Cloudflare Tunnel supports SSE (HTTP/2 streaming) — no changes needed to tunnel config
- For Celery events: publish to Redis pub/sub → Flask SSE endpoint subscribes to Redis channel

---

## 21. AI Provider Gateway

> **Mandatory rule:** All LLM / STT / TTS / embedding calls must go through `AIProviderGateway.call()`. No module may import openai, anthropic, or google.generativeai directly.

Full spec: `docs/system-upgrade/40-ai-provider-gateway-billing.md`

### 21.1 Flow

```
AI Consumer (any module)
  → AIProviderGateway.call(GatewayRequest)
  → AIProviderPolicy.check() — quota + rate limit
  → registry.resolve_provider() — 4-level hierarchy
  → adapter.chat() / embed() / transcribe()
  → calculate_cost() → log_usage() → emit_billing_event()
  → GatewayResponse
```

### 21.2 Attribution (all calls must include)

| Field | Required | Description |
|-------|----------|-------------|
| `org_id` | ✅ | Always derived from auth |
| `user_id` | ✅ | May be None for system calls |
| `module_id` | ✅ | Which module is calling |
| `feature_id` | ✅ | Which feature within the module |
| `capability` | ✅ | chat / embedding / tts / transcription |
| `session_id` | For voice | Voice session identifier |
| `conversation_id` | For chat | Floating assistant conversation |

### 21.3 Existing infrastructure (reuse, do not rebuild)

- `apps/ai_providers/registry.py` — provider resolution (4-level hierarchy)
- `apps/ai_providers/adapters/` — OpenAI, Gemini, Anthropic, Ollama adapters
- `apps/ai_providers/key_resolver.py` — `get_api_key()` (only allowed key access)
- `apps/ai_providers/cost_tracker.py` — `calculate_cost()`, `log_usage()`
- `apps/billing/service_billing.py` — `emit_billing_event()` (billing outbox)

### 21.4 New files needed

| File | Purpose |
|------|---------|
| `apps/ai_providers/gateway.py` | Unified entry point |
| `apps/ai_providers/policy.py` | Quota pre-check |
| `apps/ai_providers/billing_adapter.py` | Bridge to billing outbox |
| `apps/ai_providers/schemas.py` | GatewayRequest, GatewayResponse, GatewayError |
