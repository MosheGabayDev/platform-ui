/**
 * @module lib/modules/audit/types
 * Types for the platform-wide AuditLog (R046 service).
 *
 * MOCK MODE shape mirrors the backend AuditLog.record() signature documented
 * in `docs/system-upgrade/10-tasks/R046-audit-notifications/epic.md`:
 *   - org_id (server-scoped, never accepted from client)
 *   - actor_id + actor_name (denormalized for display)
 *   - action (free-form module.verb identifier)
 *   - category (login | create | update | delete | admin | ai)
 *   - resource_type + resource_id
 *   - metadata (free-form JSON; PII-redacted at write time)
 *   - ip + user_agent (request fingerprint)
 *
 * Do NOT add UI state here.
 */

export type AuditCategory =
  | "login"
  | "create"
  | "update"
  | "delete"
  | "admin"
  | "ai"
  | "security";

export interface AuditLogEntry {
  id: number;
  org_id: number;
  /** Stable action identifier — module.verb. */
  action: string;
  category: AuditCategory;
  actor_id: number | null;
  actor_name: string | null;
  resource_type: string | null;
  resource_id: string | null;
  /** ISO-8601 timestamp. */
  timestamp: string;
  /** Free-form key/value pairs — should not contain raw PII. */
  metadata: Record<string, unknown>;
  ip: string | null;
  user_agent: string | null;
}

export interface AuditLogParams {
  page: number;
  per_page: number;
  category?: AuditCategory;
  actor_id?: number;
  /** Free-text search across action + resource_type. */
  search?: string;
  /** ISO-8601; inclusive lower bound. */
  from?: string;
  /** ISO-8601; inclusive upper bound. */
  to?: string;
}

export interface AuditLogResponse {
  success: boolean;
  data: {
    entries: AuditLogEntry[];
    total: number;
    page: number;
    per_page: number;
  };
}

export interface AuditLogStats {
  total_24h: number;
  total_7d: number;
  by_category_24h: Record<AuditCategory, number>;
  unique_actors_24h: number;
}

export interface AuditLogStatsResponse {
  success: boolean;
  data: AuditLogStats;
}
