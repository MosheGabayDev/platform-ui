# Helpdesk Phase A — Ticket List + KPI Dashboard (platform-ui)

**Phase:** P2 — Core Platform Hubs (first specialized module consumer)
**Track:** platform-ui
**Status:** 🔴 blocked on R042-BE (CompatLayer) + R044 (Navigation API)
**Depends on:** R042-BE, R044, all P0 foundation gates green
**Estimate:** ~5 hours

## Scope
First Helpdesk surface in platform-ui. Consumes shared foundation capabilities to validate they're production-ready.

- `app/(dashboard)/helpdesk/page.tsx` — KPI stat dashboard via `KpiCard` (✅ R041G)
- `app/(dashboard)/helpdesk/tickets/page.tsx` — ticket list via `DataTable<Ticket>`
- `lib/modules/helpdesk/types.ts` + `lib/api/helpdesk.ts` + query keys
- `TicketStatusBadge`, `TicketPriorityBadge` components
- Backend: verify `/helpdesk/api/tickets` + `/helpdesk/api/dashboard/stats` endpoints
- `FeatureGate flag="helpdesk.enabled"` (✅ R041D-UI) gates the route

## Out of scope
- Ticket detail page (Phase B)
- Approvals (Phase C)
- Live status SSE (Phase D)

## Why blocked
- Without R042-BE CompatLayer, OrgModule.helpdesk lookup is unreliable
- Without R044 Navigation API, helpdesk nav item is hardcoded — feature flag has no teeth at nav level

## Tasks
- [ ] T01 — Types: `Ticket`, `TicketStatus`, `TicketPriority`, list response shape — `lib/modules/helpdesk/types.ts`
- [ ] T02 — Zod schemas + API client: `fetchTickets`, `fetchHelpdeskStats` — `lib/api/helpdesk.ts`
- [ ] T03 — Query keys: `queryKeys.helpdesk.tickets(filters)`, `queryKeys.helpdesk.stats`
- [ ] T04 — `TicketStatusBadge` + `TicketPriorityBadge` components (variant per state, colors from tokens)
- [ ] T05 — `/helpdesk/page.tsx` — 4 KpiCards (open/resolved/breached-SLA/avg-resolution) + activity chart placeholder
- [ ] T06 — `/helpdesk/tickets/page.tsx` — DataTable + status/priority filters + nuqs URL state
- [ ] T07 — Wrap routes in `FeatureGate flag="helpdesk.enabled"` + `PermissionGate`
- [ ] T08 — E2E test: helpdesk routes render with mocked Flask responses
- [ ] T09 — Module docs: `docs/modules/04-helpdesk/{LEGACY_INVENTORY,E2E_COVERAGE,AI_READINESS,I18N_READINESS}.md`

## Acceptance Criteria
- [ ] `/helpdesk` loads with 4 KPI cards from real Flask data
- [ ] `/helpdesk/tickets` shows paginated list with working status/priority filters
- [ ] Disabled feature flag hides the route + nav item
- [ ] No new shared components — everything reuses existing capabilities
- [ ] Module docs exist (LEGACY_INVENTORY, E2E_COVERAGE, AI_READINESS) per `02-rules/`
- [ ] All tests pass + `npm run build` green

## Final commit
SHA: `<filled on close>`
Date: `<YYYY-MM-DD>`
