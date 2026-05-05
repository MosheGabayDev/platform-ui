/**
 * @module lib/api/ai-usage
 * PlatformAIUsage client (Phase 2.3).
 *
 * Spec: docs/system-upgrade/04-capabilities/platform-ai-usage-spec.md
 *
 * Mock generates ~30 days of synthetic UsageEvents. The dataset is
 * deterministic (seeded by event index) so tests can assert exact totals
 * across runs. Aggregation is done in-memory; backend pre-computes via
 * materialized view.
 */
import type {
  UsageEvent,
  UsageEventsParams,
  UsageEventsResponse,
  UsageStats,
  UsageStatsResponse,
  UsageRange,
  UsageOutcome,
  UsageBucket,
  UsageTopUser,
  DailySeriesPoint,
  SetBudgetInput,
  SetBudgetResponse,
  UsageBudget,
  BudgetStatus,
} from "@/lib/modules/ai-usage/types";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/proxy";
export const MOCK_MODE = true;

// ---------------------------------------------------------------------------
// Synthetic event generation
// ---------------------------------------------------------------------------

const PROVIDERS = ["anthropic", "openai", "bedrock", "azure_openai", "ollama"] as const;
const MODEL_BY_PROVIDER: Record<(typeof PROVIDERS)[number], string[]> = {
  anthropic: ["claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5"],
  openai: ["gpt-5", "gpt-5-mini", "text-embedding-3-large"],
  bedrock: ["anthropic.claude-sonnet-4-6-bedrock", "meta.llama-3-70b"],
  azure_openai: ["gpt-5-azure", "gpt-4o-azure"],
  ollama: ["llama-3-8b", "mistral-7b"],
};
// Per-million-token pricing (USD). Mirrors lib/api/ai-providers.ts catalog.
const PRICING: Record<string, { in: number; out: number }> = {
  "claude-opus-4-7": { in: 15, out: 75 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-haiku-4-5": { in: 0.8, out: 4 },
  "gpt-5": { in: 5, out: 20 },
  "gpt-5-mini": { in: 0.5, out: 2 },
  "text-embedding-3-large": { in: 0.13, out: 0 },
  "anthropic.claude-sonnet-4-6-bedrock": { in: 3, out: 15 },
  "meta.llama-3-70b": { in: 1, out: 1 },
  "gpt-5-azure": { in: 5, out: 20 },
  "gpt-4o-azure": { in: 2.5, out: 10 },
  "llama-3-8b": { in: 0, out: 0 },
  "mistral-7b": { in: 0, out: 0 },
};

const PURPOSES = ["chat", "summarize", "tool_call", "embedding"] as const;
const USERS = [
  { id: 7, name: "Tech Tim" },
  { id: 9, name: "OnCall Olivia" },
  { id: 11, name: "Help Hilda" },
  { id: 14, name: "AI Agent" },
  { id: 1, name: "System Admin" },
];

// Deterministic PRNG (mulberry32) — seeded so the dataset is stable.
function mulberry32(seed: number) {
  let t = seed;
  return () => {
    t |= 0;
    t = (t + 0x6d2b79f5) | 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const RAND = mulberry32(20260506);

function pickFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(RAND() * arr.length)]!;
}

function generateEvents(): UsageEvent[] {
  const events: UsageEvent[] = [];
  const now = Date.now();
  // 30 days × ~50 events/day = ~1500 events
  for (let dayBack = 30; dayBack >= 0; dayBack -= 1) {
    const eventsThisDay = 30 + Math.floor(RAND() * 40);
    for (let i = 0; i < eventsThisDay; i += 1) {
      const provider = pickFrom(PROVIDERS);
      const model = pickFrom(MODEL_BY_PROVIDER[provider]);
      const purpose = pickFrom(PURPOSES);
      const inT = 200 + Math.floor(RAND() * 5000);
      const outT = purpose === "embedding" ? 0 : 50 + Math.floor(RAND() * 800);
      const pr = PRICING[model] ?? { in: 0, out: 0 };
      const cost = (inT * pr.in) / 1_000_000 + (outT * pr.out) / 1_000_000;
      const outcome: UsageOutcome =
        RAND() < 0.97 ? "success" : RAND() < 0.7 ? "error" : "cached";
      const user = pickFrom(USERS);
      const ts = new Date(
        now - dayBack * 24 * 60 * 60_000 - Math.floor(RAND() * 24 * 60 * 60_000),
      ).toISOString();
      events.push({
        id: `evt-${dayBack}-${i}`,
        org_id: 1,
        user_id: user.id,
        user_name: user.name,
        action_id: purpose === "tool_call" ? pickFrom(["helpdesk.ticket.take", "helpdesk.ticket.resolve", "users.search"]) : null,
        skill_id: purpose === "tool_call" ? pickFrom(["helpdesk.ticket.take", "helpdesk.ticket.resolve", "users.search"]) : null,
        ticket_id: purpose === "tool_call" ? 1000 + Math.floor(RAND() * 10) : null,
        session_id: 8000 + Math.floor(RAND() * 100),
        provider_id: provider,
        model,
        purpose,
        input_tokens: inT,
        output_tokens: outT,
        cost_usd: Math.round(cost * 1_000_000) / 1_000_000,
        latency_ms: 100 + Math.floor(RAND() * 1500),
        outcome,
        error_code: outcome === "error" ? pickFrom(["rate_limit", "context_length", "auth"]) : null,
        timestamp: ts,
      });
    }
  }
  // Sort newest-first.
  events.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  return events;
}

const ALL_EVENTS = generateEvents();

let MOCK_BUDGET_USD: number | null = 100;

// ---------------------------------------------------------------------------
// Aggregation helpers
// ---------------------------------------------------------------------------

function rangeWindow(range: UsageRange): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date(end);
  if (range === "24h") start.setTime(end.getTime() - 24 * 60 * 60_000);
  else if (range === "7d") start.setTime(end.getTime() - 7 * 24 * 60 * 60_000);
  else if (range === "30d") start.setTime(end.getTime() - 30 * 24 * 60 * 60_000);
  else if (range === "mtd") {
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
  }
  return { start, end };
}

function bucketBy<TKey extends string>(
  events: UsageEvent[],
  keyFn: (e: UsageEvent) => TKey,
): UsageBucket<TKey>[] {
  const map = new Map<TKey, UsageBucket<TKey>>();
  for (const e of events) {
    const key = keyFn(e);
    const bucket = map.get(key) ?? {
      key,
      events: 0,
      cost_usd: 0,
      input_tokens: 0,
      output_tokens: 0,
    };
    bucket.events += 1;
    bucket.cost_usd += e.cost_usd;
    bucket.input_tokens = (bucket.input_tokens ?? 0) + e.input_tokens;
    bucket.output_tokens = (bucket.output_tokens ?? 0) + e.output_tokens;
    map.set(key, bucket);
  }
  return [...map.values()].sort((a, b) => b.cost_usd - a.cost_usd);
}

function topUsers(events: UsageEvent[]): UsageTopUser[] {
  const map = new Map<number, UsageTopUser>();
  for (const e of events) {
    if (e.user_id === null) continue;
    const u = map.get(e.user_id) ?? {
      user_id: e.user_id,
      user_name: e.user_name ?? `user-${e.user_id}`,
      events: 0,
      cost_usd: 0,
    };
    u.events += 1;
    u.cost_usd += e.cost_usd;
    map.set(e.user_id, u);
  }
  return [...map.values()]
    .sort((a, b) => b.cost_usd - a.cost_usd)
    .slice(0, 5);
}

function dailySeries(events: UsageEvent[], days: number): DailySeriesPoint[] {
  const buckets = new Map<string, DailySeriesPoint>();
  // Pre-fill empty days so the chart has continuous X-axis.
  const today = new Date();
  for (let d = days - 1; d >= 0; d -= 1) {
    const dt = new Date(today);
    dt.setUTCDate(dt.getUTCDate() - d);
    const key = dt.toISOString().slice(0, 10);
    buckets.set(key, { date: key, events: 0, cost_usd: 0, errors: 0 });
  }
  for (const e of events) {
    const day = e.timestamp.slice(0, 10);
    const b = buckets.get(day);
    if (!b) continue;
    b.events += 1;
    b.cost_usd += e.cost_usd;
    if (e.outcome === "error") b.errors += 1;
  }
  return [...buckets.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}

function classifyBudget(monthly: number | null, mtdSpend: number): UsageBudget {
  if (monthly === null) {
    return {
      monthly_budget_usd: null,
      spent_mtd_usd: round2(mtdSpend),
      pct_consumed: 0,
      status: "unset",
    };
  }
  const pct = monthly === 0 ? 100 : (mtdSpend / monthly) * 100;
  let status: BudgetStatus = "ok";
  if (pct >= 100) status = "exceeded";
  else if (pct >= 80) status = "warning";
  return {
    monthly_budget_usd: monthly,
    spent_mtd_usd: round2(mtdSpend),
    pct_consumed: Math.round(pct),
    status,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function fetchUsageStats(
  range: UsageRange = "mtd",
): Promise<UsageStatsResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 80));
    const { start, end } = rangeWindow(range);
    const inRange = ALL_EVENTS.filter((e) => {
      const ts = new Date(e.timestamp);
      return ts >= start && ts <= end;
    });

    const totals = inRange.reduce(
      (acc, e) => {
        acc.events += 1;
        acc.input_tokens += e.input_tokens;
        acc.output_tokens += e.output_tokens;
        acc.cost_usd += e.cost_usd;
        if (e.outcome === "error") acc.errors += 1;
        return acc;
      },
      { events: 0, input_tokens: 0, output_tokens: 0, cost_usd: 0, errors: 0 },
    );
    const errors_pct = totals.events === 0 ? 0 : (totals.errors / totals.events) * 100;

    // MTD spend always uses the calendar-month start regardless of `range`.
    const mtdStart = new Date();
    mtdStart.setUTCDate(1);
    mtdStart.setUTCHours(0, 0, 0, 0);
    const mtdSpend = ALL_EVENTS.filter((e) => new Date(e.timestamp) >= mtdStart).reduce(
      (sum, e) => sum + e.cost_usd,
      0,
    );

    const days = range === "24h" ? 1 : range === "7d" ? 7 : 30;

    return {
      success: true,
      data: {
        range,
        started_at: start.toISOString(),
        ended_at: end.toISOString(),
        totals: {
          ...totals,
          cost_usd: round2(totals.cost_usd),
          errors_pct: Math.round(errors_pct * 10) / 10,
        },
        budget: classifyBudget(MOCK_BUDGET_USD, mtdSpend),
        by_provider: bucketBy(inRange, (e) => e.provider_id).slice(0, 10),
        by_model: bucketBy(inRange, (e) => e.model).slice(0, 10),
        by_purpose: bucketBy(inRange, (e) => e.purpose).slice(0, 10),
        top_users: topUsers(inRange),
        daily_series: dailySeries(inRange, days),
      } as UsageStats,
    };
  }
  const res = await fetch(`${BASE}/ai-usage/stats?range=${range}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchUsageEvents(
  params: UsageEventsParams,
): Promise<UsageEventsResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 80));
    let filtered = ALL_EVENTS;
    if (params.user_id !== undefined)
      filtered = filtered.filter((e) => e.user_id === params.user_id);
    if (params.provider) filtered = filtered.filter((e) => e.provider_id === params.provider);
    if (params.outcome) filtered = filtered.filter((e) => e.outcome === params.outcome);
    if (params.range) {
      const { start, end } = rangeWindow(params.range);
      filtered = filtered.filter((e) => {
        const ts = new Date(e.timestamp);
        return ts >= start && ts <= end;
      });
    }
    const startIdx = (params.page - 1) * params.per_page;
    return {
      success: true,
      data: {
        events: filtered.slice(startIdx, startIdx + params.per_page),
        total: filtered.length,
        page: params.page,
        per_page: params.per_page,
      },
    };
  }
  const qs = new URLSearchParams();
  qs.set("page", String(params.page));
  qs.set("per_page", String(params.per_page));
  if (params.user_id !== undefined) qs.set("user_id", String(params.user_id));
  if (params.provider) qs.set("provider", params.provider);
  if (params.outcome) qs.set("outcome", params.outcome);
  if (params.range) qs.set("range", params.range);
  const res = await fetch(`${BASE}/ai-usage/events?${qs.toString()}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function setUsageBudget(
  input: SetBudgetInput,
): Promise<SetBudgetResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 80));
    if (input.monthly_budget_usd !== null && input.monthly_budget_usd < 0) {
      throw new Error("400: budget must be ≥ 0 or null");
    }
    MOCK_BUDGET_USD = input.monthly_budget_usd;
    const mtdStart = new Date();
    mtdStart.setUTCDate(1);
    mtdStart.setUTCHours(0, 0, 0, 0);
    const mtdSpend = ALL_EVENTS.filter((e) => new Date(e.timestamp) >= mtdStart).reduce(
      (sum, e) => sum + e.cost_usd,
      0,
    );
    return {
      success: true,
      message:
        input.monthly_budget_usd === null
          ? "(mock) Budget cleared."
          : `(mock) Budget set to $${input.monthly_budget_usd.toFixed(2)}/mo.`,
      data: { budget: classifyBudget(MOCK_BUDGET_USD, mtdSpend) },
    };
  }
  const res = await fetch(`${BASE}/ai-usage/budget`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Test/imperative reset for vitest. */
export function _resetMockBudget(value: number | null = 100): void {
  MOCK_BUDGET_USD = value;
}
