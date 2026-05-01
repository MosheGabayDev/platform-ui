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

## Sign-off

- [ ] Inventory verified against actual platformengineer code (TBD)
- [ ] RBAC matrix verified (TBD)
- [ ] DB table list verified (TBD)
- [ ] Sign-off: <user/reviewer name + date>
