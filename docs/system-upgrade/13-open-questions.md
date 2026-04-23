# 13 — Open Questions

_Last updated: 2026-04-23_

---

These questions cannot be reliably answered from the codebase alone. Each needs validation through conversation, testing, or deeper investigation.

---

## Authentication

| # | Question | Why It Matters | How to Answer |
|---|----------|---------------|---------------|
| Q1 | Does Flask's `POST /api/auth/login` return a JWT or a session cookie? Which is the intended contract for platform-ui? | Determines next-auth credentials provider implementation | Read `apps/authentication/api_auth.py` + test with curl |
| Q2 | Is there a `POST /api/auth/refresh` token refresh endpoint? | Without it, 15-min JWTs require re-login every session | Code search + test |
| Q3 | Which OAuth providers are configured and tested in production? (Flask-Dance used) | Determines what social login options are available to wire in next-auth | Check `.env.sample` + Flask-Dance config |

---

## API Shape

| # | Question | Why It Matters | How to Answer |
|---|----------|---------------|---------------|
| Q4 | What endpoints does the dashboard stats page actually call? Are `/api/ai-settings/stats` and `/admin/api/monitoring/health` the canonical paths? | `lib/api/client.ts` uses these — wrong path = silent 404 | Test in browser against TEST environment |
| Q5 | What is the intended auth for `/admin/api/*` routes — session cookie or `X-API-Key`? | Admin routes need different auth in platform-ui proxy | Read `apps/*/routes.py` for admin blueprints |
| Q6 | Are there any endpoints that return paginated responses? What is the pagination envelope shape? | TanStack Table needs consistent pagination contract | Code search + test |

---

## Multi-Tenancy / Roles

| # | Question | Why It Matters | How to Answer |
|---|----------|---------------|---------------|
| Q7 | Can a technician belong to multiple orgs? | Affects how org-switching UI should work | Read `users` model + membership tables |
| Q8 | What is the full role hierarchy? (system_admin, admin, manager, technician, end_user — are there more?) | nav-items.ts role guards need exact role names | Read `rbac.py` + `users` model |
| Q9 | Is the `interface_mode` (end_user vs technician) a session-level setting or a user-level attribute? | Determines whether users need role-switching UI | Read `HelpdeskSession.interface_mode` + session creation flow |

---

## Real-Time

| # | Question | Why It Matters | How to Answer |
|---|----------|---------------|---------------|
| Q10 | Are there any existing SSE or WebSocket endpoints on the Flask side? | Avoids duplicating work if already built | Code search for `stream`, `EventSource`, `websocket` |
| Q11 | How does the technician UI currently get notified of pending approvals? Polling? Email? Push? | Critical for migrating the approval flow to platform-ui | Test current Jinja2 UI + read approval notification code |

---

## Voice

| # | Question | Why It Matters | How to Answer |
|---|----------|---------------|---------------|
| Q12 | Does platform-ui need a voice call interface at all, or is that exclusively the mobile app's domain? | Determines whether to build WebRTC components in Next.js | Product decision |
| Q13 | Are voice sessions visible to technicians in the web UI (monitoring), or only to the mobile user? | Scopes the voice module in platform-ui | Product decision |

---

## Product / Business

| # | Question | Why It Matters | How to Answer |
|---|----------|---------------|---------------|
| Q14 | What is the intended onboarding flow for a new MSP customer? Self-service or sales-assisted? | Determines how much to invest in the setup wizard UX | Business decision |
| Q15 | Is ALA (Life Assistant) a separate product or a feature of the helpdesk platform? | Determines navigation hierarchy and billing model | Product decision |
| Q16 | Are there any live production customers on the system today? | Determines how carefully migrations must be backward-compatible | Business context |
| Q17 | What is the current pricing model — per-endpoint, per-seat, or usage-based? | Affects billing UI design and AI cost tracking display | `project_resolveai_launch.md` + business decision |

---

## Infrastructure

| # | Question | Why It Matters | How to Answer |
|---|----------|---------------|---------------|
| Q18 | Is there any load balancer or autoscaling for the web-api pods? Or truly single-pod? | Determines real production reliability | `kubectl get hpa -n platform` |
| Q19 | How is the RAG DB populated today? Manual? Automated pipeline? | Determines if a KB ingestion UI is needed in platform-ui | Read `apps/knowledge_ingestion/` |
| Q20 | Is Redis in a persistent mode or ephemeral? If Redis restarts, what happens to in-flight Celery tasks? | Determines reliability of async task pipeline | K8s config + Redis config |
