# Module 12 — Metrics

**Priority:** 🟡 Medium | **Est:** 2 days | **Depends on:** Monitoring (10)

## Flask Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/api/monitoring/metrics` | Current system metrics |
| GET | `/api/ai-settings/stats/timeseries` | AI usage timeseries (already proxied) |
| GET | `/helpdesk/api/sla/compliance` | Helpdesk SLA metrics |
| GET | `/ai-agents/api/stats` | Agent execution metrics |

## Proxy Mapping

Uses existing proxy prefixes.

## TypeScript Types (`lib/api/types.ts`)

```ts
export interface SystemMetrics {
  cpu_pct: number;
  mem_pct: number;
  db_connections: number;
  redis_ops_sec: number;
  req_per_min: number;
  error_rate_pct: number;
}
```

## Query Keys (`lib/api/query-keys.ts`)

```ts
metrics: {
  system: ["metrics", "system"] as const,
  timeseries: (days: number) => ["metrics", "timeseries", days] as const,
}
```

## Pages / Routes

| File | Route | Description |
|------|-------|-------------|
| `app/(dashboard)/metrics/page.tsx` | `/metrics` | Metrics dashboard |

## Components

- `MetricGauge` — circular gauge for CPU/memory
- `TimeseriesChart` — multi-line Recharts area chart
- `MetricStatRow` — labeled value + trend indicator

## Definition of Done

- [ ] System metrics gauges (CPU, mem, DB)
- [ ] AI usage timeseries chart (reuse existing query)
- [ ] Helpdesk metrics section
- [ ] Auto-refresh every 60s
- [ ] Skeleton + EmptyState
