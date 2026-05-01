# 13 — Open Questions

_Last updated: 2026-04-24_

---

These questions cannot be reliably answered from the codebase alone. Each needs validation through conversation, testing, or deeper investigation.

---

## Authentication

| # | Question | Why It Matters | How to Answer |
|---|----------|---------------|---------------|
| Q1 | ~~Does Flask's `POST /api/auth/login` return a JWT or a session cookie?~~ | — | **[RESOLVED 2026-04-24]** `POST /api/auth/login` returns JWT + refresh token. `POST /login` (HTML route) also accepts JSON and returns session cookie. Platform-ui will use the JWT endpoint. See `../04-capabilities/auth-bridge.md`. |
| Q2 | ~~Is there a `POST /api/auth/refresh` token refresh endpoint?~~ | — | **[RESOLVED 2026-04-24]** Yes — `POST /api/auth/refresh` exists in `jwt_routes.py`. Accepts `{refresh_token}`, returns new JWT + refresh (rotation). |
| Q3 | Which OAuth providers are configured and tested in production? | Determines social login options for next-auth | `.env` check required — GitHub + Google clients configured in Flask-Dance; production status unknown |
| Q13 | Does Flask `POST /login` MFA flow return JSON or redirect to `/two-factor-login` when `is_json=True`? | If redirect, next-auth `authorize` callback must handle MFA separately | Test with curl: `POST /login` with `Content-Type: application/json` for an MFA-enabled user |
| Q14 | ~~What exact fields does `POST /api/auth/login` return in `user` object? Are `permissions[]` included or only `roles[]`?~~ | — | **[RESOLVED 2026-04-24 Round 009]** `serialize_auth_user()` now returns: `{id, email, org_id, name, roles[], permissions[], is_admin, is_system_admin, is_manager, is_ai_agent}`. `is_admin` is a real boolean from DB. `permissions[]` contains role permission names. Remove the `normalizeFlaskUser()` role-name workaround in `lib/auth/options.ts` — `is_admin` is now direct. See `apps/authentication/jwt_routes.py:serialize_auth_user()`. |
| Q15 | Is `SESSION_COOKIE_SECURE` set in EKS production Flask deployment? | Security risk if False on HTTPS | Check K8s ConfigMap / SSM for `SESSION_COOKIE_SECURE` |

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

## Module Data Export/Import

| # | Question | Why It Matters | How to Answer |
|---|----------|---------------|---------------|
| Q21 | Which modules have tables with more than 100k rows per tenant in production? | Streaming JSONL writer is required above this threshold; in-memory export fails | `SELECT relname, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC` |
| Q22 | Are there any blob/file attachments owned by helpdesk or knowledge modules (not just S3 keys)? | Determines whether `files/` directory in export package is needed for Phase 1 or can defer | Audit `helpdesk_sessions`, `knowledge_articles`, `tool_invocations` for file column types |
| Q23 | Is there a Celery task queue separation for long-running jobs vs short tasks? | Export of large tables must not block the main task queue | Check `apps/__init__.py` Celery queue config |
| Q24 | What is the current S3 bucket setup for file storage? Who owns the IAM policy? | Signed download URLs require S3 access; encryption at rest requires KMS key ARN | Check SSM Parameter Store for `STORAGE_BUCKET` + IAM role attached to web-api pod |
| Q25 | Are there any existing module manifest files in `platformengineer`? | Determines if we're extending existing structure or creating from scratch | `find apps/ -name "manifest.json" -o -name "module.json"` |

---

## Infrastructure

| # | Question | Why It Matters | How to Answer |
|---|----------|---------------|---------------|
| Q18 | Is there any load balancer or autoscaling for the web-api pods? Or truly single-pod? | Determines real production reliability | `kubectl get hpa -n platform` |
| Q19 | How is the RAG DB populated today? Manual? Automated pipeline? | Determines if a KB ingestion UI is needed in platform-ui | Read `apps/knowledge_ingestion/` |
| Q20 | Is Redis in a persistent mode or ephemeral? If Redis restarts, what happens to in-flight Celery tasks? | Determines reliability of async task pipeline | K8s config + Redis config |

---

## Frontend — browser-side defects from E2E smoke run 2026-05-01

Source: `planning-artifacts/reviews/2026-05-01-e2e-error-report.md`

| # | Question | Why It Matters | How to Answer |
|---|----------|---------------|---------------|
| Q29 | `CommandDialog` in `components/ui/command.tsx` places `<DialogHeader>` as a sibling of `<DialogContent>` instead of inside it. Radix complains `DialogContent requires a DialogTitle`, and a `Cannot read properties of undefined (reading 'subscribe')` page-error fires in cmdk on Ctrl+K. CLAUDE.md forbids modifying `components/ui/`. Pick: (a) carve exception for primitive bugs, (b) ship corrected `CommandDialogV2` wrapper, or (c) re-init shadcn at newer version. | Page-errors crash error tracking and pollute Sentry. A11y warning blocks future a11y baseline. | Decide policy; pick a/b/c. |
| Q30 | Recharts emits `width(-1) and height(-1) of chart should be greater than 0` × 10 — sparkline container measures 0×0 before parent layout settles. Add `minWidth/minHeight`, wrap in `ResponsiveContainer` with explicit aspect, or guard render until layout? | Charts may flash blank on first paint, regress dashboard UX. | Reproduce, find offending sparkline, set explicit dimensions. |
| Q31 | Mock NextAuth bypasses Flask login but pages still call `/api/proxy/notifications`, `/api/proxy/monitoring/health`, `/api/proxy/ai-settings/*`, `/api/proxy/users`, `/api/proxy/organizations`, `/api/proxy/roles`. Backend-down these all return 401/404 and dominate the e2e error report. Pick: (a) MSW-mock in base fixture, (b) explicit MOCK_MODE flag per client (like helpdesk/ai), or (c) accept noise. | Without a pattern the report drowns in expected backend-down noise; real bugs get buried. | Decide; if (b), apply to notifications/monitoring/ai-settings/users/orgs/roles clients. |

---

## Helpdesk schema + RBAC (added 2026-05-01 — review-driven)

Source: `planning-artifacts/reviews/2026-05-01-comprehensive-code-review.md` §4.1, §6, §4.4

| # | Question | Why It Matters | How to Answer |
|---|----------|---------------|---------------|
| Q-HD-1 | **Priority enum: where does P1-P4 ↔ low/medium/high/critical mapping live?** Frontend currently maps in `lib/api/helpdesk.ts transformFlaskTicket()`. Is this temporary or canonical? | Two mappings (frontend + backend) is fragile. Whoever writes the next consumer (e.g. AI agent reading priority) needs to know the canonical enum. | Decide: (a) keep dual mapping, frontend-side as canonical UI display; (b) migrate Flask serializer to emit semantic + accept either on write; (c) frontend adopts P1-P4 internally. **Recommendation: (a)** — semantic on the wire when JSON-serializing for platform-ui, P1-P4 stays in DB. |
| Q-HD-2 | **SLA tracking: confirm UI shows both response + resolution tracks.** Frontend types now expose `sla_response_breached`, `sla_resolution_breached`, plus computed `sla_breached`. Tickets list shows the computed flag; detail page shows both. | Two SLA tracks are real product state in legacy. Collapsing them in UI was the original drift bug. | Confirm: detail view shows both (current state ✅), list collapses to OR-combined for at-a-glance (current state ✅). Document the rule. |
| Q-HD-3 | **`availableActions` RBAC validation flow.** Page-context declares actions branched by client-side `isAdmin`. Backend MUST re-check on invocation. Should `availableActions` itself be authoritative? | Affects whether `availableActions` is a security signal or just UX hint. If LLM reads denied actions, it could propose them. | Decide: (a) UX hint only, backend re-checks (current model); (b) authoritative client-side filter, AND backend re-checks (defense in depth). **Recommendation: (b)**. Capture as gate item before AI-shell-C live mode. |
| Q-HD-4 | **`/api/ai/chat` request/response contract on Flask side.** Frontend sends `{message, context, contextVersion}`, expects `{text, contextVersion, actionProposal}`. Flask doesn't have this endpoint yet. | When R048 partial cleanup adds the endpoint, it MUST match frontend. Otherwise MOCK_MODE flip breaks. | Capture in `docs/system-upgrade/05-ai/provider-gateway.md` as the chat-surface contract. Reference Pydantic model when defined. |
| Q-HD-5 | **`ticket_number` uniqueness scope: global or per-org?** Mock fixture uses `TKT-2026-01001`. Flask — is this org-prefixed or globally sequential? | If org A and org B both have `TKT-2026-01001`, displaying ticket_number alone is ambiguous in admin views. | Read `platformengineer/apps/helpdesk/models.py` Ticket model + the sequence/trigger that mints `ticket_number`. |
| Q-HD-6 | **PII handling for `requester_email`.** Frontend type has it as `string \| null`; mock stores `null` to avoid fake-PII. Real Flask returns the email. Where is masking enforced? | Tickets list could leak email to non-admin viewers. AI assistant `dataSamples` could include it accidentally. | Decide: (a) Flask serializer redacts unless caller has `helpdesk.view_pii`; (b) frontend redacts unconditionally for non-admins; (c) both. **Recommendation: (a)+(b)** defense in depth. |
