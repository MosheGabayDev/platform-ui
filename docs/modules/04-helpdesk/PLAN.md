# Module 04 — Helpdesk

**Priority:** 🔴 Critical | **Est:** 4 days | **Depends on:** Users (01), Roles (03)

## Flask Endpoints

Blueprint prefix: `/helpdesk`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/helpdesk/api/dashboard/stats` | KPI stats (open/resolved/avg resolution) |
| GET | `/helpdesk/api/tickets` | List tickets (filter: status, priority, assignee) |
| GET | `/helpdesk/api/tickets/<id>` | Ticket detail |
| GET | `/helpdesk/api/tickets/<id>/timeline` | Ticket activity timeline |
| POST | `/helpdesk/api/tickets/<id>/take` | Assign ticket to self |
| POST | `/helpdesk/api/tickets/<id>/resolve` | Resolve ticket |
| GET | `/helpdesk/api/technicians` | List technicians |
| GET | `/helpdesk/api/technicians/utilization` | Technician workload stats |
| GET | `/helpdesk/api/sla/policies` | SLA policies |
| GET | `/helpdesk/api/sla/compliance` | SLA compliance stats |
| GET | `/helpdesk/api/kb/articles` | Knowledge base articles |
| POST | `/helpdesk/api/kb/articles` | Create KB article |
| GET | `/helpdesk/api/audit/export` | Audit log export |

## Proxy Mapping (add to `app/api/proxy/[...path]/route.ts`)

```
"helpdesk": "/helpdesk"
```

## TypeScript Types (`lib/api/types.ts`)

```ts
export interface Ticket {
  id: number;
  title: string;
  status: "new" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "critical";
  assignee_id?: number;
  requester_id: number;
  created_at: string;
  updated_at: string;
  sla_breach_at?: string;
}

export interface HelpdeskStats {
  open_tickets: number;
  resolved_today: number;
  avg_resolution_hours: number;
  sla_compliance_pct: number;
  active_technicians: number;
}

export interface TimelineEntry {
  id: number;
  action: string;
  actor: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}
```

## Query Keys (`lib/api/query-keys.ts`)

```ts
helpdesk: {
  stats: ["helpdesk", "stats"] as const,
  tickets: (filters?: object) => ["helpdesk", "tickets", filters] as const,
  ticket: (id: number) => ["helpdesk", "ticket", id] as const,
  timeline: (id: number) => ["helpdesk", "timeline", id] as const,
  technicians: ["helpdesk", "technicians"] as const,
  slaCompliance: ["helpdesk", "sla-compliance"] as const,
}
```

## Pages / Routes

| File | Route | Description |
|------|-------|-------------|
| `app/(dashboard)/helpdesk/page.tsx` | `/helpdesk` | Dashboard + KPI stats |
| `app/(dashboard)/helpdesk/tickets/page.tsx` | `/helpdesk/tickets` | Ticket list |
| `app/(dashboard)/helpdesk/tickets/[id]/page.tsx` | `/helpdesk/tickets/:id` | Ticket detail + timeline |
| `app/(dashboard)/helpdesk/technicians/page.tsx` | `/helpdesk/technicians` | Technician workload |
| `app/(dashboard)/helpdesk/sla/page.tsx` | `/helpdesk/sla` | SLA compliance |
| `app/(dashboard)/helpdesk/kb/page.tsx` | `/helpdesk/kb` | Knowledge base |

## Components

- `HelpdeskStatCards` — 4 KPI stat cards with sparklines
- `TicketTable` — `DataTable<Ticket>` with status/priority badges + filters
- `TicketTimeline` — vertical timeline of actions
- `TicketStatusBadge` — colored badge per status
- `SLAIndicator` — time remaining / breached indicator
- `TechnicianUtilizationBar` — workload progress bar per technician

## Definition of Done

- [ ] Dashboard page with 4 KPI stats + charts
- [ ] Ticket list with status/priority filter + search
- [ ] Ticket detail page with timeline
- [ ] Technician workload view
- [ ] SLA compliance page
- [ ] Knowledge base CRUD
- [ ] Skeleton on all async states
- [ ] nav-items badge shows open ticket count
