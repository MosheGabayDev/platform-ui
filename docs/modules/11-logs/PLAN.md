# Module 11 — Logs

**Priority:** 🟡 Medium | **Est:** 1 day | **Depends on:** nothing

## Flask Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/api/ops/permissions/scope` | Permission scope logs |
| GET | `/admin/api/mobile-voice/pipeline-logs` | Voice pipeline logs |
| GET | `/admin/api/monitoring/logs` | System log stream |

> Verify additional log endpoints: `grep -n "logs\|log_entries" apps/admin/routes.py apps/logging_system/routes.py apps/logging_management/routes.py`

## Proxy Mapping

Uses existing `"admin": "/admin/api"` prefix.

## TypeScript Types (`lib/api/types.ts`)

```ts
export interface LogEntry {
  id: string;
  level: "debug" | "info" | "warning" | "error" | "critical";
  message: string;
  module: string;
  timestamp: string;
  trace_id?: string;
  extra?: Record<string, unknown>;
}
```

## Query Keys (`lib/api/query-keys.ts`)

```ts
logs: {
  list: (filters?: object) => ["logs", "list", filters] as const,
}
```

## Pages / Routes

| File | Route | Description |
|------|-------|-------------|
| `app/(dashboard)/logs/page.tsx` | `/logs` | Live log stream viewer |

## Components

- `LogViewer` — virtualized list (react-virtual or similar), color-coded by level
- `LogLevelBadge` — colored badge: debug/info/warn/error/critical
- `LogFilterBar` — module picker, level filter, time range, search
- `TraceIdLink` — clickable trace ID to copy

## Definition of Done

- [ ] Log stream with level filter
- [ ] Module filter
- [ ] Search/keyword filter
- [ ] Auto-scroll + pause on hover
- [ ] Skeleton loading state
