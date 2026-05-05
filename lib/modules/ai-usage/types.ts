/**
 * @module lib/modules/ai-usage/types
 * Types for PlatformAIUsage (Phase 2.3).
 *
 * Spec: docs/system-upgrade/04-capabilities/platform-ai-usage-spec.md
 */

export type UsagePurpose = "chat" | "summarize" | "embedding" | "tool_call" | (string & {});
export type UsageOutcome = "success" | "error" | "cached" | "cancelled";
export type UsageRange = "24h" | "7d" | "mtd" | "30d";
export type BudgetStatus = "ok" | "warning" | "exceeded" | "unset";

export interface UsageEvent {
  id: string;
  org_id: number;
  user_id: number | null;
  user_name: string | null;
  action_id: string | null;
  skill_id: string | null;
  ticket_id: number | null;
  session_id: number | null;
  provider_id: string;
  model: string;
  purpose: UsagePurpose;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  latency_ms: number | null;
  outcome: UsageOutcome;
  error_code: string | null;
  timestamp: string;
}

export interface UsageBucket<TKey extends string = string> {
  key: TKey;
  events: number;
  cost_usd: number;
  input_tokens?: number;
  output_tokens?: number;
}

export interface UsageTopUser {
  user_id: number;
  user_name: string;
  events: number;
  cost_usd: number;
}

export interface DailySeriesPoint {
  date: string; // YYYY-MM-DD
  events: number;
  cost_usd: number;
  errors: number;
}

export interface UsageBudget {
  monthly_budget_usd: number | null;
  spent_mtd_usd: number;
  pct_consumed: number;
  status: BudgetStatus;
}

export interface UsageStats {
  range: UsageRange;
  started_at: string;
  ended_at: string;
  totals: {
    events: number;
    input_tokens: number;
    output_tokens: number;
    cost_usd: number;
    errors: number;
    errors_pct: number;
  };
  budget: UsageBudget;
  by_provider: UsageBucket[];
  by_model: UsageBucket[];
  by_purpose: UsageBucket[];
  top_users: UsageTopUser[];
  daily_series: DailySeriesPoint[];
}

export interface UsageStatsResponse {
  success: boolean;
  data: UsageStats;
}

export interface UsageEventsParams {
  page: number;
  per_page: number;
  user_id?: number;
  provider?: string;
  outcome?: UsageOutcome;
  range?: UsageRange;
}

export interface UsageEventsResponse {
  success: boolean;
  data: {
    events: UsageEvent[];
    total: number;
    page: number;
    per_page: number;
  };
}

export interface SetBudgetInput {
  monthly_budget_usd: number | null;
}

export interface SetBudgetResponse {
  success: boolean;
  message: string;
  data: { budget: UsageBudget };
}
