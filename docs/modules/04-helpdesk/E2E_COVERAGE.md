# Helpdesk — E2E Coverage Plan

**Module:** 04-helpdesk
**Standard:** `docs/system-upgrade/02-rules/e2e-coverage.md`
**Last updated:** 2026-05-01

> Mandatory before any Helpdesk module phase ships per `02-rules/development-rules.md`.

## Coverage matrix

| ID | Flow | Phase | Spec file | Risk | Status |
|---|---|---|---|---|---|
| HD-01 | Helpdesk dashboard renders KPI cards with real data | A | `tests/e2e/helpdesk/dashboard.spec.ts` | High (entry point) | ⬜ pending |
| HD-02 | Ticket list paginates + filters by status | A | `tests/e2e/helpdesk/tickets-list.spec.ts` | High | ⬜ pending |
| HD-03 | Ticket list filters by priority | A | `tests/e2e/helpdesk/tickets-list.spec.ts` | Medium | ⬜ pending |
| HD-04 | nuqs URL state survives back/forward | A | `tests/e2e/helpdesk/tickets-list.spec.ts` | Medium | ⬜ pending |
| HD-05 | FeatureGate blocks /helpdesk when flag disabled | A | `tests/e2e/helpdesk/feature-flag.spec.ts` | High (security) | ⬜ pending |
| HD-06 | Cross-tenant: org A user cannot see org B tickets | A | `tests/e2e/helpdesk/cross-tenant.spec.ts` | CRITICAL | ⬜ pending |
| HD-07 | Ticket detail renders all fields | B | `tests/e2e/helpdesk/ticket-detail.spec.ts` | High | ⬜ pending |
| HD-08 | Take ticket (self-assign) action | B | `tests/e2e/helpdesk/ticket-actions.spec.ts` | High | ⬜ pending |
| HD-09 | Resolve ticket action with confirmation | B | `tests/e2e/helpdesk/ticket-actions.spec.ts` | High | ⬜ pending |
| HD-10 | Reassign ticket | B | `tests/e2e/helpdesk/ticket-actions.spec.ts` | High | ⬜ pending |
| HD-11 | Add ticket comment | B | `tests/e2e/helpdesk/ticket-comments.spec.ts` | Medium | ⬜ pending |
| HD-12 | Ticket timeline renders chronologically | B | `tests/e2e/helpdesk/ticket-detail.spec.ts` | Medium | ⬜ pending |
| HD-13 | Technicians list + utilization | B | `tests/e2e/helpdesk/technicians.spec.ts` | Medium | ⬜ pending |
| HD-14 | CSV export downloads | B | `tests/e2e/helpdesk/export.spec.ts` | Low | ⬜ pending |
| HD-15 | SLA policy CRUD | C | `tests/e2e/helpdesk/sla.spec.ts` | Medium | ⬜ pending |
| HD-16 | SLA compliance report | C | `tests/e2e/helpdesk/sla.spec.ts` | Medium | ⬜ pending |
| HD-17 | Approval queue list | C | `tests/e2e/helpdesk/approvals.spec.ts` | High (RBAC) | ⬜ pending |
| HD-18 | Approve / reject with reason | C | `tests/e2e/helpdesk/approvals.spec.ts` | High | ⬜ pending |
| HD-19 | Bulk reassign | C | `tests/e2e/helpdesk/bulk.spec.ts` | Medium | ⬜ pending |
| HD-20 | Audit log export | C | `tests/e2e/helpdesk/audit-export.spec.ts` | High (compliance) | ⬜ pending |
| HD-21 | Live status SSE updates within 2s | D | `tests/e2e/helpdesk/realtime.spec.ts` | Medium | ⬜ pending |

## Security/multi-tenant must-haves (Phase A blocking)

Per `02-rules/testing-standard.md`:

- ✅ **Cross-tenant isolation** (HD-06): MUST pass before Phase A merges. Test with two seeded orgs.
- ✅ **RBAC negative**: viewer/technician without `helpdesk.view_all` MUST NOT see all-org tickets.
- ✅ **Auth required**: unauthenticated request → 401, not 200 with empty data.
- ✅ **Audit trail**: every Phase B mutation creates an AuditLog row with org_id + actor_id (per ADR-041 P1 Exit Gate item #5).
- ✅ **No PII leakage in error responses**: 404 / 410 / 403 responses must NOT include other-org user emails or ticket titles.

## Mock vs live testing

- **Phase A pre-merge**: tests run against MSW (mock service worker) intercepting `/api/proxy/helpdesk/*`. Validates UI logic.
- **Phase A post-merge**: same tests run against live Flask in TEST environment via daily-smoke cron.
- **Phase A P1-Exit gate** (per ADR-041): cross-tenant isolation test (HD-06) MUST pass against PROD environment with two real seeded orgs.

## Non-functional coverage

| Area | Test |
|---|---|
| Performance | List endpoint response time p95 < 500ms with 1000 tickets seeded |
| Accessibility | axe-core scan of dashboard + ticket list (zero violations) |
| RTL | Manual smoke in Hebrew + Arabic (sidebar + table flip correctly) |
| Mobile | Lighthouse mobile score ≥ 80 on dashboard |
| Bundle | Helpdesk routes add ≤ 20KB gzip to first-load JS |

## Sign-off

- [ ] Coverage plan reviewed by Helpdesk implementer (TBD)
- [ ] HD-06 (cross-tenant) test green before Phase A PR merge
- [ ] HD-05 (feature flag) test green before Phase A PR merge
- [ ] All Phase A tests green before P1-Exit gate
