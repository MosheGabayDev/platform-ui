# Platform UI — Module Roadmap

> Status: 2026-04-23 | Foundation shell complete. Modules pending.

## Progress Overview

| # | Module | Priority | Status | Est. Days |
|---|---|---|---|---|
| 0 | Dashboard + Shell | — | ✅ Complete | — |
| 1 | [Users](./01-users/PLAN.md) | 🔴 Critical | 🔵 Partial | 2 |
| 2 | [Organizations](./02-organizations/PLAN.md) | 🔴 Critical | ⬜ Pending | 2 |
| 3 | [Roles & Permissions](./03-roles-permissions/PLAN.md) | 🔴 Critical | ⬜ Pending | 2 |
| 4 | [Helpdesk](./04-helpdesk/PLAN.md) | 🔴 Critical | ⬜ Pending | 4 |
| 5 | [AI Agents](./05-ai-agents/PLAN.md) | 🟠 High | ⬜ Pending | 3 |
| 6 | [ALA — Voice AI](./06-ala/PLAN.md) | 🟠 High | ⬜ Pending | 3 |
| 7 | [Knowledge & RAG](./07-knowledge-rag/PLAN.md) | 🟠 High | ⬜ Pending | 2 |
| 8 | [Billing](./08-billing/PLAN.md) | 🟠 High | ⬜ Pending | 2 |
| 9 | [Settings](./09-settings/PLAN.md) | 🟠 High | ⬜ Pending | 2 |
| 10 | [System Health](./10-monitoring/PLAN.md) | 🟡 Medium | ⬜ Pending | 1 |
| 11 | [Logs](./11-logs/PLAN.md) | 🟡 Medium | ⬜ Pending | 1 |
| 12 | [Metrics](./12-metrics/PLAN.md) | 🟡 Medium | ⬜ Pending | 2 |
| 13 | [Audit Log](./13-audit-log/PLAN.md) | 🟡 Medium | ⬜ Pending | 1 |
| 14 | [API Keys](./14-api-keys/PLAN.md) | 🟡 Medium | ⬜ Pending | 1 |
| 15 | [Departments](./15-departments/PLAN.md) | 🟢 Low | ⬜ Pending | 1 |
| 16 | [Voice Calls](./16-voice/PLAN.md) | 🟢 Low | ⬜ Pending | 2 |
| 17 | [Automation](./17-automation/PLAN.md) | 🟢 Low | ⬜ Pending | 3 |
| 18 | [Integrations](./18-integrations/PLAN.md) | 🟢 Low | ⬜ Pending | 2 |
| 19 | [Backups](./19-backups/PLAN.md) | 🟢 Low | ⬜ Pending | 1 |

**Total estimated:** ~37 development days

---

## Dependency Graph

```
Users ──────┐
            ├──→ Roles & Permissions ──→ all modules (RBAC gates)
Organizations ──┘
                    ↓
            Helpdesk ──→ Departments ──→ Audit Log
            AI Agents ──→ ALA ──→ Voice Calls
            Knowledge/RAG ──→ AI Agents
            Billing ──→ Settings
            Monitoring ──→ Logs ──→ Metrics
```

## Module Status Legend

| Icon | Meaning |
|---|---|
| ⬜ Pending | Not started |
| 🔵 In Progress | Currently being built |
| ✅ Complete | Built, tested, connected to real API |
| ⚠️ Blocked | Waiting on dependency |

---

## How to Start a Module

1. Read `docs/modules/<N>-<name>/PLAN.md`
2. Read `CLAUDE.md` for coding rules
3. Create `app/(dashboard)/<route>/page.tsx`
4. Add proxy routes to `lib/api/client.ts` + `lib/api/types.ts` + `lib/api/query-keys.ts`
5. Mark status as 🔵 in this file
6. When done: mark ✅ and update `components/shell/nav-items.ts` badge counts
