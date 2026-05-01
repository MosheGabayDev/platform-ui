# R046-min — Helpdesk Notification + Audit (single-flow slice)

**Phase:** P1 (foundation slice)
**Track:** platformengineer
**Status:** 🔴 blocked on R045-min
**Depends on:** R045-min
**Estimate:** ~2 hours
**ADR refs:** ADR-040, ADR-041 P1 Exit Gate items #4 + #5

## Scope
Minimal AuditLog + Notification service that supports ONE concrete Helpdesk event flow end-to-end. Defers the multi-module generic service to R046 (full).

- `AuditLog` model — extend existing `UserActivity` with structured fields (action category, resource type+id, IP, user-agent) OR create new `audit_log` table (decide in T01)
- `AuditLog.record(org_id, actor_id, action, resource, metadata)` API
- `Notification` model + `NotificationService.send(recipient_user_id, type, payload)` backed by `platform_outbox`
- ONE flow wired end-to-end: Helpdesk ticket creation event → AuditLog row + Notification to ticket assignee
- `GET /api/notifications` (current user, unacked) + `POST /api/notifications/<id>/ack`
- `GET /api/audit-log?org_id=...&category=...` (basic, no advanced filters)

## Out of scope (deferred to R046 full)
- Email / push delivery channels — in-app only this round
- Per-user notification preferences (R045 full owns SettingsService)
- Retention cleanup job (90-day default — defer cleanup to R046 full)
- Migrate other modules from `record_activity()` — only Helpdesk wired this round
- Notification dedupe at scale — naive 60s window dedupe only
- Audit log advanced filters (date range, actor, category combinations)

## Why now
ADR-041 P1 Exit Gate items #4 + #5 require ONE Helpdesk notification flow + ONE Helpdesk audit entry to flow through the platform service. This min slice satisfies both.

## Tasks
- [ ] T01 — Decide: extend `UserActivity` vs new `audit_log` table. Document choice with rationale. Migration. (~30 min)
- [ ] T02 — `AuditLog.record()` API + tests (cross-tenant isolation, RBAC on read) (~30 min)
- [ ] T03 — `Notification` model + migration + `NotificationService.send()` via outbox (~30 min)
- [ ] T04 — Wire Helpdesk ticket-create event → AuditLog row + Notification to assignee (~30 min)
- [ ] T05 — `GET /api/notifications` + `POST /api/notifications/<id>/ack` routes + tests (~30 min)

## Acceptance Criteria
- [ ] Creating a Helpdesk ticket writes ONE AuditLog row with org_id + actor_id + action="ticket.created" + resource={type, id}
- [ ] Same event sends ONE Notification to the assignee (visible in `NotificationDrawer`)
- [ ] Notification ack via API marks `ack_at` timestamp
- [ ] Cross-tenant: org A user cannot see org B notifications or audit entries
- [ ] All tests pass

## Definition of Done
- [ ] AC met
- [ ] Helpdesk Phase A E2E test includes "create ticket → audit row + notification" assertion
- [ ] `09-history/rounds-index.md` entry
- [ ] G-Audit + G-Notif gates flip to 🟡 partial with "single flow" note

## Final commit
SHA: `<filled on close>`
Date: `<YYYY-MM-DD>`
