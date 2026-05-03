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
  | (string & {});

/** A status is terminal when polling should stop. */
export const TERMINAL_STATUSES = new Set<string>([
  "success",
  "succeeded",
  "partial",
  "failed",
  "cancelled",
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
