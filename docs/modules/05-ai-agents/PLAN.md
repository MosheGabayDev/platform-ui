# Module 05 — AI Agents

**Priority:** 🟠 High | **Est:** 3 days | **Depends on:** Users (01), Roles (03)

## Flask Endpoints

Blueprint prefix: `/ai-agents`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/ai-agents/api/investigations` | List investigations |
| GET | `/ai-agents/api/stats` | Module stats (counts by status/module) |
| GET | `/ai-agents/api/investigation/<id>/detail` | Investigation detail |
| POST | `/ai-agents/api/investigate` | Create investigation |
| POST | `/ai-agents/api/investigation/<id>/execute` | Execute action |
| POST | `/ai-agents/api/investigation/<id>/cancel` | Cancel investigation |
| GET | `/ai-agents/api/endpoints` | List user endpoints |
| GET | `/ai-agents/api/agents/<module>` | List agents for module |
| POST | `/ai-agents/api/agents/<module>` | Create agent |
| PUT | `/ai-agents/api/agents/<module>/<id>` | Update agent |
| DELETE | `/ai-agents/api/agents/<module>/<id>` | Delete agent |
| POST | `/ai-agents/api/agents/<module>/<id>/clone` | Clone agent |
| POST | `/ai-agents/api/agents/<module>/reset` | Reset to defaults |
| GET | `/ai-agents/api/agents/version` | Agent version info |
| GET | `/ai-agents/api/settings/computer-use` | Computer-use settings |
| GET | `/ai-agents/api/settings/learnings` | Agent learnings log |

## Proxy Mapping (add to `app/api/proxy/[...path]/route.ts`)

```
"ai-agents": "/ai-agents"
```

## TypeScript Types (`lib/api/types.ts`)

```ts
export interface Investigation {
  id: number;
  title: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  module: string;
  created_at: string;
  result_summary?: string;
}

export interface AgentConfig {
  id: number;
  module: string;
  name: string;
  description: string;
  is_enabled: boolean;
  tool_sets: string[];
  model?: string;
}

export interface AgentStats {
  total_investigations: number;
  running: number;
  completed_today: number;
  failed_today: number;
  modules: Record<string, number>;
}
```

## Query Keys (`lib/api/query-keys.ts`)

```ts
aiAgents: {
  stats: ["ai-agents", "stats"] as const,
  investigations: (filters?: object) => ["ai-agents", "investigations", filters] as const,
  investigation: (id: number) => ["ai-agents", "investigation", id] as const,
  agents: (module: string) => ["ai-agents", "agents", module] as const,
  endpoints: ["ai-agents", "endpoints"] as const,
}
```

## Pages / Routes

| File | Route | Description |
|------|-------|-------------|
| `app/(dashboard)/ai-agents/page.tsx` | `/ai-agents` | Stats + investigation list |
| `app/(dashboard)/ai-agents/[id]/page.tsx` | `/ai-agents/:id` | Investigation detail |
| `app/(dashboard)/ai-agents/settings/page.tsx` | `/ai-agents/settings` | Agent config per module |

## Components

- `InvestigationTable` — DataTable with status badges, module filter
- `InvestigationStatusBadge` — colored + animated (running = pulse)
- `AgentConfigCard` — enable/disable toggle, edit tool sets
- `AgentStatCards` — 4 KPI cards (total, running, success rate, etc.)
- `NewInvestigationDialog` — drawer with endpoint picker + prompt input

## Definition of Done

- [ ] Investigation list with status filter
- [ ] Create investigation dialog
- [ ] Investigation detail with steps/results
- [ ] Agent config page per module
- [ ] Stats cards on main page
- [ ] Skeleton + EmptyState
