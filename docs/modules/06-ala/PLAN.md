# Module 06 — ALA (Voice AI)

**Priority:** 🟠 High | **Est:** 3 days | **Depends on:** AI Agents (05), Users (01)

## Flask Endpoints

Blueprint prefix: `/api/ala/v1`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/ala/v1/health` | Health check |
| GET | `/api/ala/v1/scenarios` | List ALA scenarios |
| GET | `/api/ala/v1/scenarios/<id>` | Scenario detail |
| POST | `/api/ala/v1/scenarios` | Create scenario |
| PUT | `/api/ala/v1/scenarios/<id>` | Update scenario |
| DELETE | `/api/ala/v1/scenarios/<id>` | Delete scenario |
| GET | `/api/ala/v1/calls` | Call history |
| GET | `/api/ala/v1/calls/<id>` | Call detail + transcript |
| GET | `/api/ala/v1/stats` | ALA usage stats |
| POST | `/admin/api/internal/ala/text-chat` | Test scenario (text mode, no audio) |

> Verify exact paths: `grep -n "@ala_bp.route\|@ala_app_bp.route" apps/ala/routes.py apps/ala/admin/app_routes.py`

## Proxy Mapping (add to `app/api/proxy/[...path]/route.ts`)

```
"ala": "/api/ala/v1"
```

## TypeScript Types (`lib/api/types.ts`)

```ts
export interface ALAScenario {
  id: number;
  name: string;
  language: string;
  is_active: boolean;
  voice_id?: string;
  system_prompt: string;
  tool_sets: string[];
  created_at: string;
}

export interface ALACall {
  id: number;
  scenario_id: number;
  status: "active" | "completed" | "failed";
  duration_seconds?: number;
  started_at: string;
  transcript?: TranscriptEntry[];
}

export interface ALAStats {
  total_calls: number;
  active_now: number;
  avg_duration_seconds: number;
  scenarios_count: number;
}
```

## Query Keys (`lib/api/query-keys.ts`)

```ts
ala: {
  stats: ["ala", "stats"] as const,
  scenarios: ["ala", "scenarios"] as const,
  scenario: (id: number) => ["ala", "scenario", id] as const,
  calls: (filters?: object) => ["ala", "calls", filters] as const,
  call: (id: number) => ["ala", "call", id] as const,
}
```

## Pages / Routes

| File | Route | Description |
|------|-------|-------------|
| `app/(dashboard)/ala/page.tsx` | `/ala` | ALA overview + stats |
| `app/(dashboard)/ala/scenarios/page.tsx` | `/ala/scenarios` | Scenario list |
| `app/(dashboard)/ala/scenarios/[id]/page.tsx` | `/ala/scenarios/:id` | Scenario edit |
| `app/(dashboard)/ala/scenarios/new/page.tsx` | `/ala/scenarios/new` | Create scenario |
| `app/(dashboard)/ala/calls/page.tsx` | `/ala/calls` | Call history |
| `app/(dashboard)/ala/calls/[id]/page.tsx` | `/ala/calls/:id` | Call transcript |

## Components

- `ALAStatCards` — active calls, total calls, avg duration
- `ScenarioTable` — DataTable with language badge, active toggle
- `ScenarioForm` — system prompt editor, tool set picker, voice selector
- `CallTranscript` — alternating bubbles (user / agent) with timestamps
- `ActiveCallBadge` — pulsing indicator if calls active

## Definition of Done

- [ ] Scenario list with create/edit/delete
- [ ] Scenario form with system prompt + tool selection
- [ ] Call history with search
- [ ] Call transcript viewer
- [ ] Stats cards
- [ ] Skeleton + EmptyState
