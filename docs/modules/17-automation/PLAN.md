# Module 17 — Automation

**Priority:** 🟢 Low | **Est:** 3 days | **Depends on:** Users (01), Roles (03)

## Flask Endpoints

Blueprint prefix: `/automation`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/automation/api/tasks` | List automation tasks |
| POST | `/automation/api/tasks` | Create task |
| GET | `/automation/api/tasks/<id>` | Task detail |
| PUT | `/automation/api/tasks/<id>` | Update task |
| DELETE | `/automation/api/tasks/<id>` | Delete task |
| GET | `/automation/api/servers` | List servers |
| POST | `/automation/api/servers` | Register server |
| GET | `/automation/api/servers/<id>` | Server detail |
| PUT | `/automation/api/servers/<id>` | Update server |
| DELETE | `/automation/api/servers/<id>` | Remove server |
| POST | `/automation/api/servers/<id>/approve` | Approve server |
| POST | `/automation/api/servers/<id>/reject` | Reject server |
| GET | `/automation/api/commands` | Command library |
| POST | `/automation/api/commands` | Create command |
| GET | `/automation/api/executions` | Execution history |
| GET | `/automation/api/dashboard/stats` | Automation KPIs |
| GET | `/automation/api/platform-types` | Platform type options |
| GET | `/automation/api/task-statuses` | Status enum values |

## Proxy Mapping (add to `app/api/proxy/[...path]/route.ts`)

```
"automation": "/automation"
```

## TypeScript Types (`lib/api/types.ts`)

```ts
export interface AutomationTask {
  id: number;
  name: string;
  status: "pending" | "running" | "success" | "failed" | "cancelled";
  target_server_id?: number;
  schedule?: string;
  last_run_at?: string;
  next_run_at?: string;
}

export interface AutomationServer {
  id: number;
  hostname: string;
  platform_type: string;
  status: "pending" | "approved" | "rejected" | "offline";
  last_seen_at?: string;
}

export interface AutomationExecution {
  id: number;
  task_id: number;
  server_id: number;
  status: string;
  started_at: string;
  output?: string;
}

export interface AutomationStats {
  total_tasks: number;
  tasks_today: number;
  success_rate_pct: number;
  pending_servers: number;
}
```

## Query Keys (`lib/api/query-keys.ts`)

```ts
automation: {
  stats: ["automation", "stats"] as const,
  tasks: (filters?: object) => ["automation", "tasks", filters] as const,
  task: (id: number) => ["automation", "task", id] as const,
  servers: ["automation", "servers"] as const,
  executions: (taskId?: number) => ["automation", "executions", taskId] as const,
  commands: ["automation", "commands"] as const,
}
```

## Pages / Routes

| File | Route | Description |
|------|-------|-------------|
| `app/(dashboard)/automation/page.tsx` | `/automation` | Dashboard + stats |
| `app/(dashboard)/automation/tasks/page.tsx` | `/automation/tasks` | Task list |
| `app/(dashboard)/automation/tasks/[id]/page.tsx` | `/automation/tasks/:id` | Task detail |
| `app/(dashboard)/automation/tasks/new/page.tsx` | `/automation/tasks/new` | Create task |
| `app/(dashboard)/automation/servers/page.tsx` | `/automation/servers` | Server management |
| `app/(dashboard)/automation/commands/page.tsx` | `/automation/commands` | Command library |
| `app/(dashboard)/automation/executions/page.tsx` | `/automation/executions` | Execution history |

## Components

- `AutomationStatCards` — tasks today, success rate, pending servers
- `TaskTable` — DataTable with status badge, schedule, last run
- `ServerApprovalQueue` — pending servers with approve/reject actions
- `ExecutionLog` — terminal-style output viewer
- `TaskForm` — schedule picker, server target, command selection

## Definition of Done

- [ ] Stats dashboard
- [ ] Task CRUD
- [ ] Server management + approval queue
- [ ] Execution history with output viewer
- [ ] Command library
- [ ] Skeleton + EmptyState
