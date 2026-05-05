# PlatformAIUsage — Backend Contract Spec

> **Status:** spec drafted 2026-05-06 (Phase 2.3 of GENERIC_AI_PLATFORM_PROGRESS).
> Backend MUST adopt this contract verbatim before MOCK flip.
>
> **Why this matters:** without per-org cost visibility, "generic AI for businesses" has no answer to "how much will this cost me this month?". The usage dashboard turns the AIProviderGateway's invocation log into actionable spend signals — KPI tiles, time series, top consumers, budget alerts.

---

## 1. Concept

A **UsageEvent** is one row written every time the AIProviderGateway makes an LLM call. Each row records:
- Who (org, user, optionally session/ticket)
- What (action_id, skill_id, purpose)
- Where it ran (provider, model)
- Cost (input/output tokens, USD)
- When (timestamp)
- Outcome (success / error / cached / cancelled)

The dashboard derives KPIs and time-series from aggregations:
- **Cost MTD** — sum of cost_usd this month
- **Tokens 24h / 7d / MTD** — input + output
- **Top consumers** — top users by cost
- **By provider / model** — pie charts
- **Time series** — daily totals over the last 30 days
- **Budget signals** — % of `monthly_budget_usd` consumed (warning ≥80%, blocked ≥100%)

---

## 2. UsageEvent shape

```ts
interface UsageEvent {
  id: string;                           // uuid
  org_id: number;
  user_id: number | null;               // null for system jobs
  user_name: string | null;             // joined for display
  action_id: string | null;             // matches AISkill.id when triggered by AI
  skill_id: string | null;
  ticket_id: number | null;
  session_id: number | null;
  provider_id: string;                  // matches AIProvider.id
  model: string;
  purpose: "chat" | "summarize" | "embedding" | "tool_call" | (string & {});
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  latency_ms: number | null;
  outcome: "success" | "error" | "cached" | "cancelled";
  error_code: string | null;
  timestamp: string;                    // ISO
}
```

---

## 3. Endpoints

### 3.1 — Aggregate stats for the dashboard

```
GET /api/proxy/ai-usage/stats?range=24h|7d|mtd|30d
```

Returns:
```jsonc
{
  "success": true,
  "data": {
    "range": "mtd",
    "started_at": "2026-05-01T00:00:00Z",
    "ended_at": "2026-05-06T15:00:00Z",
    "totals": {
      "events": 1247,
      "input_tokens": 5_400_000,
      "output_tokens": 1_800_000,
      "cost_usd": 42.18,
      "errors": 12,
      "errors_pct": 0.96
    },
    "budget": {
      "monthly_budget_usd": 100,
      "spent_mtd_usd": 42.18,
      "pct_consumed": 42,
      "status": "ok"      // "ok" | "warning" (≥80) | "exceeded" (≥100)
    },
    "by_provider": [
      { "provider_id": "anthropic", "events": 920, "cost_usd": 32.5 },
      ...
    ],
    "by_model": [...],
    "by_purpose": [...],
    "top_users": [
      { "user_id": 7, "user_name": "Tech Tim", "events": 312, "cost_usd": 14.2 },
      ...
    ],
    "daily_series": [
      { "date": "2026-05-01", "events": 80, "cost_usd": 3.2, "errors": 0 },
      ...
    ]
  }
}
```

### 3.2 — Recent events (paginated)

```
GET /api/proxy/ai-usage/events?page=1&per_page=50&user_id=7&provider=anthropic&outcome=error
```

Returns paginated `UsageEvent[]` for the events table tab.

### 3.3 — Set monthly budget (admin)

```
PUT /api/proxy/ai-usage/budget
```

Body: `{ monthly_budget_usd: number | null }`. Audit emission per cap 10. Settings Engine (cap 16) `rate_limits.ai_messages_per_day` is independent — that's a hard cap; this is a spend cap.

---

## 4. Multi-tenant safety

- All reads scoped to `session.org_id` server-side.
- `top_users` shows users from the caller's org only.
- Budget writes restricted to `org_admin` / `system_admin`.

---

## 5. Performance budget

- `GET /stats` p95 ≤ 200ms (aggregates pre-computed in a materialized view that refreshes every 5 min).
- `GET /events` p95 ≤ 100ms with index on `(org_id, timestamp DESC)`.
- Dashboard polls stats every 60s; events table is on-demand.

---

## 6. Schema (Postgres)

```sql
CREATE TABLE ai_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id BIGINT NOT NULL,
  user_id BIGINT,
  action_id VARCHAR(120),
  skill_id VARCHAR(120),
  ticket_id BIGINT,
  session_id BIGINT,
  provider_id VARCHAR(40) NOT NULL,
  model VARCHAR(80) NOT NULL,
  purpose VARCHAR(40) NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cost_usd NUMERIC(10, 6) NOT NULL,
  latency_ms INTEGER,
  outcome VARCHAR(20) NOT NULL,
  error_code VARCHAR(40),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_usage_org_time ON ai_usage_events (org_id, timestamp DESC);
CREATE INDEX idx_ai_usage_user_time ON ai_usage_events (org_id, user_id, timestamp DESC);

-- Materialized view for the stats endpoint
CREATE MATERIALIZED VIEW ai_usage_daily AS
SELECT
  org_id,
  date_trunc('day', timestamp)::date AS day,
  count(*) AS events,
  sum(input_tokens) AS input_tokens,
  sum(output_tokens) AS output_tokens,
  sum(cost_usd) AS cost_usd,
  sum(case when outcome = 'error' then 1 else 0 end) AS errors
FROM ai_usage_events
GROUP BY org_id, day;

CREATE UNIQUE INDEX idx_ai_usage_daily_org_day ON ai_usage_daily (org_id, day);
```

---

## 7. MOCK_MODE flip checklist

- [ ] Migrations applied (table + materialized view + indexes)
- [ ] Refresh job for materialized view (every 5 min)
- [ ] Insert path: AIProviderGateway writes one row per `call()`
- [ ] Aggregate endpoint registered with the response shape above
- [ ] Cross-tenant test: org A cannot read org B events
- [ ] Frontend: flip `MOCK_MODE = false` in `lib/api/ai-usage.ts`

---

## 8. Open questions (Q-AIU-*)

- **Q-AIU-1** — Long-term retention (events older than 90 days)? Recommendation: roll up to a `ai_usage_monthly` table after 90 days, drop raw rows. Defer until storage matters.
- **Q-AIU-2** — Per-skill cost dashboards? Recommendation: skill_id is already on every event. The admin UI can filter by skill_id when needed; dedicated per-skill view is a follow-up.
- **Q-AIU-3** — Real-time alerts vs polled budget status? Recommendation: polled for v1 (60s dashboard refetch). SSE upgrade with cap 23 once it ships.
- **Q-AIU-4** — Privacy: should event details (action_id, ticket_id) be shown to non-admin users? Recommendation: NO — `top_users` and aggregate counts only; events table is org_admin / system_admin. Settings cap 16 already enforces RBAC.

---

## 9. Frontend wiring (this commit)

- `lib/modules/ai-usage/types.ts` — types.
- `lib/api/ai-usage.ts` — mock client. Generates ~30 days of synthetic events
  (consistent with the AIProvider catalog from cap 2.1 and skills from 2.2).
- `lib/hooks/use-ai-usage.ts` — useUsageStats(range), useUsageEvents(filter).
- `app/(dashboard)/admin/ai-usage/page.tsx` — KPI tiles, daily time-series, by-provider table, top-users table, recent-events table, budget banner.
- Tests + E2E.
