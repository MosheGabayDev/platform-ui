/* ─── Dashboard KPI Stats (/api/ai-settings/stats) ─── */
export interface SessionStats {
  total: number;
  last_24h: number;
  last_7d: number;
  by_channel: Record<string, number>;
  by_status: Record<string, number>;
}

export interface ActionStats {
  total: number;
  last_24h: number;
  success: number;
  error: number;
  write_actions: number;
  by_risk_tier: Record<string, number>;
  error_rate_pct: number;
}

export interface KnowledgeStats {
  total: number;
  ready: number;
  error: number;
  total_chunks: number;
}

export interface DashboardStats {
  generated_at: string;
  sessions: SessionStats;
  actions: ActionStats;
  knowledge: KnowledgeStats;
  profiles: { active: number };
}

/* ─── Time Series (/api/ai-settings/stats/timeseries) ─── */
export interface TimeSeriesPoint {
  date: string;
  sessions: number;
  actions: number;
}

export interface TimeSeriesData {
  days: number;
  labels: string[];
  sessions: number[];
  actions: number[];
  series: TimeSeriesPoint[];
}

/* ─── Service Health (/admin/api/monitoring/health) ─── */
export type ServiceStatus = "ok" | "degraded" | "error";

export interface ServiceHealth {
  status: ServiceStatus;
  latency_ms?: number;
  detail?: string;
}

export interface HealthData {
  services: Record<string, ServiceHealth>;
}

/* ─── API Error ─── */
export interface ApiError {
  message: string;
  status: number;
}
