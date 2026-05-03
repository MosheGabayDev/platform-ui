/**
 * @module components/shared/job-runner/job-progress
 * Progress bar for any long-running job (cap 14 PlatformJobRunner).
 *
 * Renders a compact bar + counts caption. Color mapping:
 *   - any failed items  → amber
 *   - status=running    → cyan
 *   - terminal success  → emerald
 *
 * When `total` is null (planning phase), shows a count-only label.
 */
import type { JobProgress as JobProgressShape, JobStatus } from "@/lib/modules/job-runner/types";

interface JobProgressProps {
  progress: JobProgressShape;
  status: JobStatus;
  /** Width hint — defaults to a sensible min. */
  className?: string;
}

export function JobProgress({ progress, status, className }: JobProgressProps) {
  const { total, processed, failed } = progress;
  if (total === null || total === 0) {
    return (
      <span className={`text-xs text-muted-foreground ${className ?? ""}`.trim()}>
        {processed > 0 ? `${processed}` : "—"}
      </span>
    );
  }
  const pct = Math.min(100, Math.round((processed / total) * 100));
  const barColor =
    failed > 0
      ? "bg-amber-500 dark:bg-amber-400"
      : status === "running"
        ? "bg-cyan-500 dark:bg-cyan-400"
        : "bg-emerald-500 dark:bg-emerald-400";
  return (
    <div className={`flex flex-col gap-1 min-w-[120px] ${className ?? ""}`.trim()}>
      <div
        className="h-1.5 rounded-full bg-muted overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full transition-[width] duration-300 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground font-mono">
        {processed}/{total}
        {failed > 0 ? ` · ${failed} failed` : ""}
      </span>
    </div>
  );
}
