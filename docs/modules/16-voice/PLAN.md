# Module 16 — Voice Calls

**Priority:** 🟢 Low | **Est:** 2 days | **Depends on:** ALA (06), Users (01)

## Flask Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/api/mobile-voice/pipeline-logs` | Voice pipeline logs |
| GET | `/api/billing/call/<session_id>` | Per-call cost detail |
| GET | `/api/ala/v1/calls` | ALA call history |
| GET | `/api/ala/v1/calls/<id>` | Call transcript |

> Voice sessions come from `realtime_calls` table.
> Additional endpoints: `grep -rn "@.*route.*voice\|@.*route.*call" apps/admin/routes.py apps/ala/routes.py`

## Proxy Mapping

Uses existing proxy prefixes.

## TypeScript Types (`lib/api/types.ts`)

```ts
export interface VoiceCall {
  id: string;
  session_id: string;
  caller: string;
  status: "active" | "completed" | "failed";
  duration_seconds: number;
  started_at: string;
  ended_at?: string;
  cost_cents?: number;
  transcript_available: boolean;
}
```

## Query Keys (`lib/api/query-keys.ts`)

```ts
voice: {
  calls: (filters?: object) => ["voice", "calls", filters] as const,
  call: (id: string) => ["voice", "call", id] as const,
}
```

## Pages / Routes

| File | Route | Description |
|------|-------|-------------|
| `app/(dashboard)/voice/page.tsx` | `/voice` | Call history + live calls |
| `app/(dashboard)/voice/[id]/page.tsx` | `/voice/:id` | Call detail + transcript |

## Components

- `CallHistoryTable` — DataTable with duration, cost, status badge
- `ActiveCallIndicator` — pulsing badge showing live call count
- `CallTranscript` — bubble-style transcript viewer (reuse from ALA)
- `CallCostBreakdown` — token/audio cost breakdown

## Definition of Done

- [ ] Call history table with filter
- [ ] Active call count indicator
- [ ] Call detail with transcript
- [ ] Cost breakdown per call
- [ ] Skeleton + EmptyState
