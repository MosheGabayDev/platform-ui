# Helpdesk — Legacy Functionality Inventory

**Module:** 04-helpdesk
**Source:** `platformengineer/apps/helpdesk/` (Flask + Jinja2)
**Last updated:** 2026-05-01
**Standard:** `docs/system-upgrade/02-rules/legacy-inventory.md`

> Mandatory before any rewrite per `02-rules/development-rules.md §No Feature Loss During Rewrite`.

## Existing capability matrix

| # | Capability | Legacy path | Endpoint | Status in legacy | Rewrite scope |
|---|---|---|---|---|---|
| 1 | Ticket list (filter by status/priority/assignee) | `apps/helpdesk/routes.py` | `GET /helpdesk/tickets` | live | Phase A |
| 2 | Ticket detail | `apps/helpdesk/routes.py` | `GET /helpdesk/tickets/<id>` | live | Phase B |
| 3 | Ticket timeline (events, comments, status changes) | `apps/helpdesk/timeline.py` | `GET /helpdesk/tickets/<id>/timeline` | live | Phase B |
| 4 | Take ticket (self-assign) | `apps/helpdesk/actions.py` | `POST /helpdesk/tickets/<id>/take` | live | Phase B |
| 5 | Resolve ticket | `apps/helpdesk/actions.py` | `POST /helpdesk/tickets/<id>/resolve` | live | Phase B |
| 6 | Reassign ticket | `apps/helpdesk/actions.py` | `POST /helpdesk/tickets/<id>/reassign` | live | Phase B |
| 7 | Add comment to ticket | `apps/helpdesk/comments.py` | `POST /helpdesk/tickets/<id>/comments` | live | Phase B |
| 8 | KPI dashboard (open / resolved today / avg resolution / SLA %) | `apps/helpdesk/dashboard.py` | `GET /helpdesk/api/dashboard/stats` | live | Phase A |
| 9 | Activity timeseries | `apps/helpdesk/dashboard.py` | `GET /helpdesk/api/dashboard/timeseries` | live | Phase A |
| 10 | Technician list | `apps/helpdesk/technicians.py` | `GET /helpdesk/api/technicians` | live | Phase B |
| 11 | Technician utilization stats | `apps/helpdesk/technicians.py` | `GET /helpdesk/api/technicians/utilization` | live | Phase B |
| 12 | SLA policy CRUD | `apps/helpdesk/sla.py` | `/helpdesk/api/sla/policies` | live | Phase C |
| 13 | SLA compliance report | `apps/helpdesk/sla.py` | `GET /helpdesk/api/sla/compliance` | live | Phase C |
| 14 | Knowledge base articles | `apps/helpdesk/kb.py` | `/helpdesk/api/kb/articles` | live | Phase D (deferred to Knowledge module) |
| 15 | Approval queue (tool invocations) | `apps/helpdesk/approvals.py` | `GET /helpdesk/api/approvals` | live | Phase C (depends on PlatformApprovalFlow) |
| 16 | Approval action (approve/reject) | `apps/helpdesk/approvals.py` | `POST /helpdesk/api/approvals/<id>/{approve,reject}` | live | Phase C |
| 17 | Audit log export (CSV) | `apps/helpdesk/audit.py` | `GET /helpdesk/api/audit/export` | live | Phase C (depends on PlatformAuditLog full) |
| 18 | Live status SSE (active sessions / agent state) | `apps/helpdesk/stream.py` | `GET /helpdesk/api/stream` | live | Phase D (depends on PlatformRealtime) |
| 19 | Email-to-ticket ingest | `apps/helpdesk/email_ingest.py` | external | live | Phase D (no UI changes) |
| 20 | Ticket templates | `apps/helpdesk/templates.py` | `/helpdesk/api/templates` | partial | Phase B |
| 21 | Bulk reassign | `apps/helpdesk/bulk.py` | `POST /helpdesk/api/tickets/bulk/reassign` | live | Phase C |
| 22 | Ticket search (full-text) | `apps/helpdesk/search.py` | `GET /helpdesk/api/search` | live | Phase C (depends on PlatformSearch) |
| 23 | CSV export of tickets | `apps/helpdesk/export.py` | `GET /helpdesk/api/tickets/export` | live | Phase B (uses lib/utils/csv.ts) |

## Database tables (do not drop in Phase A — additive migrations only)

- `helpdesk_tickets` — main ticket table; org_id FK present
- `helpdesk_ticket_events` — timeline events
- `helpdesk_ticket_comments`
- `helpdesk_sla_policies`
- `helpdesk_kb_articles` (will move to Knowledge module long-term)
- `helpdesk_approval_queue` (deprecated — `tool_invocations` replaces in Phase C)
- `helpdesk_email_ingest_log`

## RBAC matrix (legacy — verify still accurate during rewrite)

| Permission | Granted to | Notes |
|---|---|---|
| `helpdesk.view` | technician, manager, admin | View ticket list + own assigned |
| `helpdesk.view_all` | manager, admin | View all org tickets |
| `helpdesk.assign` | manager, admin | Reassign tickets |
| `helpdesk.resolve` | technician (own), manager, admin | Close own ticket; manager closes any |
| `helpdesk.delete` | admin, system_admin | Soft delete ticket |
| `helpdesk.kb.author` | manager, admin | Create/edit KB articles |
| `helpdesk.sla.manage` | admin | SLA policy CRUD |
| `helpdesk.audit.export` | admin, system_admin | CSV audit export |
| `helpdesk.approve` | manager, admin | Approval queue actions |

## Phase mapping (per master-roadmap §5)

- **Phase A** (Helpdesk Phase A round): caps 1, 8, 9 — list + KPI dashboard + timeseries
- **Phase B**: caps 2-7, 10-11, 20, 23 — detail, actions, technicians, templates, export
- **Phase C**: caps 12-13, 15-17, 21-22 — SLA, approvals, audit, bulk, search
- **Phase D**: caps 14, 18, 19 — KB (Knowledge module), SSE, email ingest

## Verification before rewrite starts

- [ ] All 23 capabilities reviewed against actual code (this inventory is best-effort from spec; verify with `grep` in platformengineer)
- [ ] No undocumented endpoints in `apps/helpdesk/` (run `grep -rn '@app.route\|@helpdesk_bp.route' apps/helpdesk/`)
- [ ] No undocumented DB tables (compare `models.py` to this list)
- [ ] No silent capability removal during rewrite (each merge of a new Phase reviews this list against what's been delivered)

## Known legacy debt to NOT carry forward

- ⚠ Direct LLM imports in `apps/helpdesk/ai_assist.py` — must migrate to `AIProviderGateway` per R048 before Phase B ships AI-assisted ticket triage.
- ⚠ Hardcoded org_id in `apps/helpdesk/dashboard.py:fetch_stats()` — fix to use JWT org_id during Phase A rewrite.
- ⚠ `helpdesk_approval_queue` table — deprecated; new code uses `tool_invocations`.

## Extended capability inventory (2026-05-01 — review-driven expansion)

> The 23-capability table above is the **migration phase plan**. The legacy
> Flask app holds **257 routes** across 3 blueprint files and **43 SQLAlchemy
> models**. Below is the **complete surface** with explicit scope decisions,
> so the No-Feature-Loss gate has a full checklist (per `02-rules/legacy-inventory.md`).
>
> Source counts (verified via grep on platformengineer/apps/helpdesk/):
>   - `routes.py`: 175 route decorators
>   - `internal_routes.py`: 73 route decorators
>   - `chat_routes.py`: 9 route decorators
>   - `models.py`: 43 model classes

### Capability-area scope decisions

| Area | Routes (~) | Models | Scope decision | Rationale |
|---|---|---|---|---|
| **Tickets** (CRUD, list, take, resolve, reassign, comment, timeline) | 18 | `Ticket`, `TicketEvent`, `TicketComment` | Phase A + B | Already in 23-cap inventory rows 1-7, 23 |
| **Dashboard / KPIs** | 4 | — | Phase A | Inventory row 8-9 |
| **Technicians** (list, add, availability, utilization) | 6 | `Technician` | Phase B | Inventory row 10-11 |
| **SLA** (policies, compliance) | 4 | `SLAPolicy` | Phase C | Inventory row 12-13 |
| **KB / Knowledge base** (articles CRUD, publish, archive) | 6 | `KBArticle` | **Defer to Knowledge module (07)** | Per master-roadmap; row 14 |
| **Approvals** (queue, approve, reject) | 3 | `ApprovalQueue` | Phase C (depends on PlatformApprovalFlow) | Inventory row 15-16 |
| **Audit export** (CSV) | 1 | — | Phase C | Inventory row 17 |
| **Live status SSE** | 1 | — | Phase D (PlatformRealtime dependency) | Inventory row 18 |
| **Email-to-ticket ingest** | external worker | `EmailIngestLog` | Phase D (no UI changes) | Inventory row 19 |
| **Ticket templates** | 4 | `TicketTemplate` | Phase B | Inventory row 20 |
| **Bulk operations** (reassign, status change, tag) | 5 | — | Phase C | Inventory row 21 |
| **Search** (full-text) | 2 | depends on PlatformSearch | Phase C | Inventory row 22 |
| — | — | — | — | — |
| **Investigation sessions** (HelpdeskSession, InvestigationDecision, SessionGoal, ExecutionGraph, InvestigationStrategy) | 12 | 8 models | **Defer — large surface** | AI-investigation core; tracked separately as `helpdesk-investigations` capability under R051 (AI Action Platform). Add as a follow-on round to master-roadmap. |
| **Workflow engine** (WorkflowDefinition, WorkflowExecution, WorkflowStep) | 14 | 5 models | **Defer to Workflow & Automation pillar** (Pillar 7) | Master-roadmap §2 Pillar 7 owns this; not Helpdesk-specific. Cross-cutting concern. |
| **Connectors** (OrgConnector, SSH credentials, connection testing) | 11 | `OrgConnector`, `ConnectorCredential` | **Defer — depends on R049 Data Sources Hub + R047 Secrets** | Master-roadmap §4 P0 gates 10+12. |
| **Self-healing patterns** (AutonomousActionLog, HealingPattern) | 8 | 3 models | **Defer to AI/Automation Phase 3 (R057)** | Per master-roadmap §3 P3; Helpdesk consumes the platform service when ready. |
| **Topology graph** (OrgTopologyNode, OrgTopologyEdge) | 6 | 2 models | **Defer — feature-flagged, post-Helpdesk** | Plan-tier gated; post-MVP. |
| **Plans / autonomy / billing** (OrgPlan, OrgAutonomy) | 9 | 2 models | **Move to org/billing module** | Belongs in `apps/admin` or future Billing module — NOT Helpdesk. Flag as misplaced legacy. |
| **Remote-assist** (`/api/remote-assist/*`) | 7 | `RemoteSession`, `RemoteCommand` | **Out of scope** for Helpdesk; defer to dedicated Remote Assist module (16) | Already in master-roadmap as separate module. |
| **Departments / Employees CRUD** | 8 | `Department`, `Employee` | **Move to Users module (01)** or new `apps/admin/departments` | Misplaced legacy — these aren't helpdesk-specific. |
| **Phone / endpoint mappings** | 3 | `EndpointMapping` | **Defer to Voice module (16)** | Voice routing — separate concern. |
| **Maintenance windows** | 4 | `MaintenanceWindow` | **Phase C** (extend inventory) | Operational scheduling — useful in Helpdesk view. |
| **Circuit breakers / degraded mode** | 2 (middleware) | `CircuitBreakerState` | **Cross-cutting platform concern** | Lift to platform infra (Pillar 10 Operations). |
| **Batch tasks** (long-running ticket operations) | 6 | `BatchTask` | **Phase C** (extend inventory) | Bulk operations enabler. |
| **Targets** (monitoring targets per ticket) | 7 | `Target` | **Defer — overlaps with monitoring module** | Coordinate with Monitoring module rewrite. |
| **Settings / role prompts** | 4 | — | **Move to Settings Engine (R045)** | Not Helpdesk-specific config. |
| **Device enrollment** (auth/device/enroll, validate, revoke) | 3 | `EnrolledDevice` | **Move to Auth module** | Authentication concern, not Helpdesk. |
| **AI chat / agent integration** (chat_routes.py) | 9 | — | **Defer — flows through AI shell (AI-shell-A/B/C)** | Helpdesk-specific AI surfaces register actions per `AI_READINESS.md`. |
| **Onboarding wizard** (onboarding_routes.py) | 12 | `OnboardingProgress` | **Move to dedicated Onboarding module** | Cross-cutting, not Helpdesk. |
| **Internal admin routes** (internal_routes.py) | 73 | mixed | **Audit needed** — likely admin/system_admin operations | Flag for `apps/admin/` review; many overlap with admin module. |
| **Notifications (helpdesk-specific)** | submodule | — | **Replace with platform Notification Service (R046)** | Per ADR-040 R046-min. |
| **Observability (helpdesk-specific metrics)** | submodule | — | **Lift to Pillar 10 Operations** | Cross-cutting. |
| **Tasks (Celery jobs)** | submodule | — | **Migrate alongside owning capability** | Each kept with its capability migration. |
| **Templates (Jinja2)** | submodule | — | **Delete on Phase A merge per migration principle #1** | "Never dual-maintain" — once Next.js page lands, Jinja deletes. |

### Total capability accounting

| Status | Count | Notes |
|---|---|---|
| Phase A in scope | 3 capabilities | KPI dashboard + ticket list (DONE in mock) |
| Phase B in scope | 9 capabilities | Detail, actions, technicians, templates, export, maintenance, batch |
| Phase C in scope | 7 capabilities | SLA, approvals, audit export, bulk, search |
| Phase D in scope | 3 capabilities | KB (→ Knowledge module), SSE, email ingest |
| Out of scope (move to other modules) | 6 areas | Onboarding, Departments, Plans, Remote-assist, Phone mappings, Settings, Device enrollment |
| Defer to platform pillars | 6 areas | Workflow, Self-healing, Topology, Connectors, Circuit breakers, Notifications |
| Defer to other modules | 4 areas | KB→Knowledge, Targets→Monitoring, Notifications→Platform, AI chat→AI shell |
| Defer to follow-on rounds | 2 areas | Investigation sessions (R051), Internal routes audit |

**No capability is silently dropped.** Each row above has a documented scope decision.

### Schema mapping reference (post-review)

The frontend type system uses **semantic names**; the Flask backend uses different conventions. The mapping SSOT lives in `lib/api/helpdesk.ts transformFlaskTicket()`:

| Frontend | Flask | Notes |
|---|---|---|
| `id` | `id` | unchanged |
| `ticket_number` | `ticket_number` | e.g. "TKT-2026-00042" — primary user-facing ID |
| `title` | `subject` | renamed |
| `priority: low/medium/high/critical` | `priority: P4/P3/P2/P1` | semantic ↔ code mapping |
| `assignee_id` | `assigned_to` | renamed |
| `requester_id` | `requester_user_id` | renamed |
| `requester_email` | `requester_email` | PII — masked in mock; mask in UI unless permitted |
| `response_due_at` | `response_due_at` | unchanged |
| `resolution_due_at` | `resolution_due_at` | unchanged |
| `sla_response_breached` | `sla_response_breached` | unchanged |
| `sla_resolution_breached` | `sla_resolution_breached` | unchanged |
| `sla_breached` | computed | OR of the two breach flags — frontend convenience |
| `category`, `subcategory`, `tags` | `category`, `subcategory`, `tags` | unchanged |

Open architectural decisions tracked in `docs/system-upgrade/08-decisions/open-questions.md` Q-HD-1 through Q-HD-3.

## Sign-off

- [x] Extended inventory verified against actual platformengineer code (2026-05-01 — 257 routes, 43 models confirmed via grep)
- [ ] RBAC matrix verified (pending Phase B prep)
- [ ] DB table list verified (43 models — Phase A scope only needs `helpdesk_tickets`, `helpdesk_ticket_events`, `helpdesk_ticket_comments`)
- [ ] Sign-off: <user/reviewer name + date>
