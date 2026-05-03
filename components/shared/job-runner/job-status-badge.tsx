/**
 * @module components/shared/job-runner/job-status-badge
 * Generic status badge for any long-running job (cap 14 PlatformJobRunner).
 *
 * Maps a JobStatus to an icon + tone. Unknown statuses fall back to a
 * neutral badge — open-enum tolerance.
 */
import {
  Clock,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  CircleSlash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { JobStatus } from "@/lib/modules/job-runner/types";

interface StatusMeta {
  icon: LucideIcon;
  tone: string;
  label: string;
}

const STATUS_META: Record<string, StatusMeta> = {
  pending: {
    icon: Clock,
    tone: "border-cyan-500/30 bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
    label: "Pending",
  },
  queued: {
    icon: Clock,
    tone: "border-cyan-500/30 bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
    label: "Queued",
  },
  running: {
    icon: Loader2,
    tone: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400",
    label: "Running",
  },
  success: {
    icon: CheckCircle2,
    tone: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    label: "Success",
  },
  succeeded: {
    icon: CheckCircle2,
    tone: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    label: "Succeeded",
  },
  partial: {
    icon: AlertTriangle,
    tone: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400",
    label: "Partial",
  },
  failed: {
    icon: XCircle,
    tone: "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-400",
    label: "Failed",
  },
  cancelled: {
    icon: CircleSlash2,
    tone: "border-muted text-muted-foreground",
    label: "Cancelled",
  },
};

const FALLBACK: StatusMeta = {
  icon: Clock,
  tone: "border-muted text-muted-foreground",
  label: "Unknown",
};

interface JobStatusBadgeProps {
  status: JobStatus;
  /** Override the displayed label (e.g. translation, module-specific naming). */
  label?: string;
  className?: string;
}

export function JobStatusBadge({ status, label, className }: JobStatusBadgeProps) {
  const meta = STATUS_META[String(status)] ?? { ...FALLBACK, label: String(status) || FALLBACK.label };
  const Icon = meta.icon;
  const isRunning = status === "running";
  return (
    <Badge variant="outline" className={`${meta.tone} ${className ?? ""}`.trim()}>
      <Icon
        className={`h-3 w-3 me-1 ${isRunning ? "animate-spin" : ""}`}
        aria-hidden="true"
      />
      {label ?? meta.label}
    </Badge>
  );
}
