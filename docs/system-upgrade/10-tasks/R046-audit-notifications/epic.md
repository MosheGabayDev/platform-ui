# R046 — AuditLog + Notifications Platform Service

**Phase:** P1 — Foundation Gates
**Track:** platformengineer
**Status:** 🔴 blocked on R045
**Depends on:** R045
**Estimate:** ~6 hours

## Scope
- **AuditLog service:**
  - Standardize `record_activity()` into `AuditLog.record(org_id, actor_id, action, resource, metadata)`
  - Structured fields: action category (login/create/update/delete/admin), resource type+id, IP, user-agent
  - Retention policy: 90 days default, configurable per org
  - `GET /api/audit-log` with filters (date range, actor, category)
- **Notification service:**
  - Generic `NotificationService.send(recipient, type, payload)` backed by `platform_outbox`
  - Channels: in-app (default), email, push (later)
  - Per-user preferences read from R045 SettingsService
  - `GET /api/notifications` + `POST /api/notifications/<id>/ack`

## Out of scope
- Notification UI bell/drawer (✅ R042 done in platform-ui)
- Email templating (basic plain-text only this round)
- SSE/push (deferred to PlatformRealtime round)

## Why now
`record_activity()` is sprinkled across modules with no consistent shape. Helpdesk has its own notification code. Without these as platform services, R049 Data Sources has no audit trail and no way to notify users of sync failures.

## Tasks
- [ ] T01 — `AuditLog` model + migration (extend existing UserActivity if compatible)
- [ ] T02 — `AuditLog.record()` API + retention cleanup job (Celery beat, daily)
- [ ] T03 — `Notification` model + migration (id, recipient_user_id, org_id, type, payload, status, ack_at)
- [ ] T04 — `NotificationService.send()` with outbox-pattern delivery + dedupe
- [ ] T05 — `GET /api/audit-log?from=&to=&actor=&category=` + RBAC (system_admin all-org, org_admin own-org)
- [ ] T06 — `GET /api/notifications` + `POST /api/notifications/<id>/ack` for current user
- [ ] T07 — Migrate 3 high-volume call sites from `record_activity()` to `AuditLog.record()`
- [ ] T08 — Tests: cross-tenant isolation, RBAC, retention cleanup, notification dedupe

## Acceptance Criteria
- [ ] `AuditLog.record()` writes structured row with org_id + actor_id + action + resource
- [ ] Audit query filters work; system_admin sees all-org, org_admin own-org only
- [ ] Notification dedupe prevents duplicate sends within 60s window
- [ ] Outbox delivery confirmed via integration test
- [ ] All tests pass

## Final commit
SHA: `<filled on close>`
Date: `<YYYY-MM-DD>`
