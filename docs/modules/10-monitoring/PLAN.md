# Module 10 — System Health

**Priority:** 🟡 Medium | **Est:** 1 day | **Depends on:** nothing

## Flask Endpoints

Blueprint prefix: `/admin/api/monitoring` (already proxied)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/api/monitoring/health` | Service health status |
| GET | `/admin/api/monitoring/services` | All service statuses |
| GET | `/admin/api/monitoring/metrics` | Current system metrics |

> These endpoints are already used by the dashboard (`fetchServiceHealth`).

## Proxy Mapping

Already mapped: `"monitoring": "/admin/api/monitoring"`

## TypeScript Types — already in `lib/api/types.ts`

```ts
// ServiceStatus, HealthData already defined
```

## Query Keys — already in `lib/api/query-keys.ts`

```ts
serviceHealth: ["dashboard", "health"] as const
```

## Pages / Routes

| File | Route | Description |
|------|-------|-------------|
| `app/(dashboard)/monitoring/page.tsx` | `/monitoring` | Full health dashboard |

## Components

- `ServiceStatusGrid` — grid of service cards with status dot + latency
- `HealthTimeline` — recent events / incidents feed
- `UptimeChart` — 24h uptime sparklines per service

## Definition of Done

- [ ] Full service health grid (expand beyond dashboard widget)
- [ ] Latency per service
- [ ] Recent incidents feed
- [ ] Auto-refresh every 30s
- [ ] Skeleton + EmptyState
