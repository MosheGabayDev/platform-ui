/**
 * @module lib/modules/job-runner/types
 * Types for the PlatformJobRunner capability (cap 14).
 *
 * Generic, module-agnostic shape for long-running background jobs. Each
 * consumer (batch tasks, module import/export, RAG ingestion, AI
 * investigations) MAY add module-specific fields under `metadata`, but the
 * core shape MUST stay stable so shared components keep working.
 *
 * Spec: docs/system-upgrade/04-capabilities/catalog.md §14
 */

/**
 * Open enum: backend MAY add new statuses (e.g. `paused`, `degraded`).
 * Frontend consumers MUST tolerate unknown values — `JobStatusBadge` falls
 * back to a neutral badge when status is not in the canonical set.
 *
 * `partial` is canonical (some items succeeded, some failed) — distinct
 * from `failed` which means the whole job exploded.
 *
 * **Spelling note (Round 3 review MED #4 — 2026-05-03):**
 * Both `success` and `succeeded` are accepted because consumers are split:
 * legacy Celery results emit `"success"` while the helpdesk batch tasks
 * surface emits `"succeeded"`. Use `normalizeJobStatus()` at the boundary
 * if you need a single canonical value for equality checks. Prefer
 * `isTerminalStatus()` over direct equality so consumer code is safe
 * regardless of which spelling the backend chooses.
 */
export type JobStatus =
  | "pending"
  | "queued"
  | "running"
  | "success"
  | "succeeded"
  | "partial"
  | "failed"
  | "cancelled"
  // Long-running lifecycle statuses (e.g. maintenance windows). Phase 4
  // consolidated their badge rendering into JobStatusBadge so the union
  // is now the source of truth for both job-runner and lifecycle events.
  | "scheduled"
  | "in_progress"
  | "completed"
  | (string & {});

/**
 * Normalizes a JobStatus to its canonical spelling — used at the boundary
 * before equality checks. `success` collapses to `succeeded`. Pass-through
 * for unknown statuses (open enum).
 */
export function normalizeJobStatus(status: string): string {
  return status === "success" ? "succeeded" : status;
}

/** A status is terminal when polling should stop. */
export const TERMINAL_STATUSES = new Set<string>([
  "success",
  "succeeded",
  "partial",
  "failed",
  "cancelled",
  // Lifecycle statuses (Phase 4). `completed` is terminal; `scheduled`
  // and `in_progress` are not.
  "completed",
]);

export function isTerminalStatus(status: string): boolean {
  return TERMINAL_STATUSES.has(status);
}

export interface JobProgress {
  /** Items processed so far (success + fail). */
  processed: number;
  /** Total items to process; null while planning. */
  total: number | null;
  /** Items that succeeded. */
  succeeded: number;
  /** Items that failed. */
  failed: number;
}

export interface Job {
  id: number | string;
  status: JobStatus;
  /** Human-readable label for the job. */
  label: string;
  progress: JobProgress;
  /** Why the job itself failed (NOT individual item failures). */
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  /** Module-specific extension. */
  metadata?: Record<string, unknown>;
}

export interface JobResponse {
  success: boolean;
  data: { job: Job };
}
