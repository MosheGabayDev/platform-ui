# Helpdesk — AI Readiness

**Module:** 04-helpdesk
**Standard:** `docs/system-upgrade/02-rules/development-rules.md §6 AI Readiness`
**Last updated:** 2026-05-01

> Mandatory before any module is marked Done per development rules.

## Page-AI context (per `useRegisterPageContext()` from AI-shell-A)

| Route | pageKey | entityType | entityId | summary template | availableActions |
|---|---|---|---|---|---|
| `/helpdesk` | `helpdesk.dashboard` | — | — | "Helpdesk dashboard. Open: {n}, resolved today: {m}, SLA: {p}%" | `[helpdesk.tickets.list]` (admin only — not action, just nav) |
| `/helpdesk/tickets` | `helpdesk.tickets.list` | `ticket` | — | "Helpdesk tickets list, {n} tickets, filtered by status={status}." | `[helpdesk.ticket.create]` if user has helpdesk.create |
| `/helpdesk/tickets/<id>` | `helpdesk.ticket.detail` | `ticket` | `{id}` | "Ticket #{id}: {title}. Status: {status}. Priority: {priority}." | `[helpdesk.ticket.take, helpdesk.ticket.resolve, helpdesk.ticket.reassign, helpdesk.ticket.comment]` (filtered by RBAC) |
| `/helpdesk/approvals` | `helpdesk.approvals.queue` | `approval` | — | "{n} pending approvals." | `[helpdesk.approval.approve, helpdesk.approval.reject]` if `helpdesk.approve` permission |
| `/helpdesk/sla` | `helpdesk.sla.policies` | — | — | "SLA policies, {n} active." | `[helpdesk.sla.create]` if admin |

## AI Actions registered (per `05-ai/action-platform.md`)

| Action ID | Capability level | Voice eligible | Confirmation required | Module owner |
|---|---|---|---|---|
| `helpdesk.ticket.create` | WRITE_LOW | yes | no | helpdesk |
| `helpdesk.ticket.take` | WRITE_LOW | yes | no (idempotent self-assign) | helpdesk |
| `helpdesk.ticket.resolve` | WRITE_HIGH | no | yes (token TTL 30s) | helpdesk |
| `helpdesk.ticket.reassign` | WRITE_HIGH | no | yes | helpdesk |
| `helpdesk.ticket.comment` | WRITE_LOW | yes | no | helpdesk |
| `helpdesk.ticket.delete` | DESTRUCTIVE | no | yes + approval queue | helpdesk |
| `helpdesk.approval.approve` | WRITE_HIGH | no | yes | helpdesk |
| `helpdesk.approval.reject` | WRITE_HIGH | no | yes (with reason) | helpdesk |
| `helpdesk.sla.policy.update` | WRITE_HIGH | no | yes | helpdesk |
| `helpdesk.sla.policy.delete` | DESTRUCTIVE | no | yes + approval | helpdesk |
| `helpdesk.bulk.reassign` | WRITE_HIGH | no | yes (count > 1) | helpdesk |
| `helpdesk.export.csv` | READ | yes | no | helpdesk |
| `helpdesk.kb.search` | READ | yes | no | helpdesk (until KB module owns) |

## Voice safety rules

Per `02-rules/development-rules.md §AI Readiness`:

- ✅ Voice can READ ticket data (search, summarize, list).
- ✅ Voice can take/comment on tickets (WRITE_LOW with no confirmation).
- ❌ Voice CANNOT resolve / reassign / delete (WRITE_HIGH+ requires button confirmation).
- ❌ Voice CANNOT bulk-anything (always requires explicit click).
- ❌ Voice CANNOT touch SLA policies or approvals.
- All voice invocations logged to AuditLog with `voice=true` flag.

## AI refuse list

Things the assistant MUST decline even if asked nicely:

1. Reveal cross-org ticket data (helpdesk Module checks `org_id` on every read).
2. Bypass approval queue for DESTRUCTIVE actions.
3. Generate content for the requester field (anti-impersonation).
4. Send notifications to other users without explicit confirmation.
5. Export audit log without `helpdesk.audit.export` permission.

## Manifest (`module.manifest.json` declarations)

```json
{
  "key": "helpdesk",
  "ai": {
    "actions": "see AI_READINESS.md table above",
    "page_contexts": "see AI_READINESS.md table above",
    "voice_eligible_actions": [
      "helpdesk.ticket.create",
      "helpdesk.ticket.take",
      "helpdesk.ticket.comment",
      "helpdesk.export.csv",
      "helpdesk.kb.search"
    ],
    "data_classification": {
      "ticket.title": "internal",
      "ticket.description": "internal",
      "ticket.requester_email": "pii",
      "ticket.attachments": "confidential"
    },
    "ai_data_access_policy": {
      "summarize_allowed": true,
      "row_limit_per_query": 50,
      "pii_redact_in_responses": true
    }
  }
}
```

## Phase mapping

- **Phase A** (Helpdesk Phase A round): only `helpdesk.dashboard` and `helpdesk.tickets.list` page contexts wired. No AI actions yet (read-only routes).
- **Phase B**: action declarations land for ticket lifecycle (create/take/resolve/reassign/comment/delete).
- **Phase C**: approval + SLA + bulk + audit actions.
- **Phase D**: KB actions (or move to Knowledge module).

## Sign-off

- [ ] All Phase A page contexts implemented in pages
- [ ] AI refuse list reviewed against assistant prompt
- [ ] Voice safety rules verified against capability_level matrix
- [ ] data_classification accurate (verified against legacy DB schema)
