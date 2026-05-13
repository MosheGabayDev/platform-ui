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
  CalendarClock,
  CircleDot,
  Lock,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { JobStatus } from "@/lib/modules/job-runner/types";

interface StatusMeta {
  icon: LucideIcon;
  tone: string;
  /** i18n leaf under `jobStatus.<status>`. */
  labelKey: string;
}

const STATUS_META: Record<string, StatusMeta> = {
  pending: {
    icon: Clock,
    tone: "border-cyan-500/30 bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
    labelKey: "pending",
  },
  queued: {
    icon: Clock,
    tone: "border-cyan-500/30 bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
    labelKey: "queued",
  },
  running: {
    icon: Loader2,
    tone: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400",
    labelKey: "running",
  },
  success: {
    icon: CheckCircle2,
    tone: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    labelKey: "success",
  },
  succeeded: {
    icon: CheckCircle2,
    tone: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    labelKey: "succeeded",
  },
  partial: {
    icon: AlertTriangle,
    tone: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400",
    labelKey: "partial",
  },
  failed: {
    icon: XCircle,
    tone: "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-400",
    labelKey: "failed",
  },
  cancelled: {
    icon: CircleSlash2,
    tone: "border-muted text-muted-foreground",
    labelKey: "cancelled",
  },
  // Long-running lifecycle statuses (e.g. maintenance windows)
  scheduled: {
    icon: CalendarClock,
    tone: "border-cyan-500/30 bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
    labelKey: "scheduled",
  },
  in_progress: {
    icon: CircleDot,
    tone: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400",
    labelKey: "in_progress",
  },
  completed: {
    icon: CheckCircle2,
    tone: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    labelKey: "completed",
  },
  // Approval-flow statuses (cap 13)
  pending_approval: {
    icon: Clock,
    tone: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400",
    labelKey: "pending_approval",
  },
  approved: {
    icon: ShieldCheck,
    tone: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    labelKey: "approved",
  },
  rejected: {
    icon: XCircle,
    tone: "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-400",
    labelKey: "rejected",
  },
  // Module-registry statuses (cap 18)
  healthy: {
    icon: CheckCircle2,
    tone: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    labelKey: "healthy",
  },
  disabled_by_flag: {
    icon: AlertTriangle,
    tone: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400",
    labelKey: "disabled_by_flag",
  },
  unavailable: {
    icon: Lock,
    tone: "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-400",
    labelKey: "unavailable",
  },
};

const FALLBACK: StatusMeta = {
  icon: Clock,
  tone: "border-muted text-muted-foreground",
  labelKey: "unknown",
};

interface JobStatusBadgeProps {
  status: JobStatus;
  /** Override the displayed label (e.g. translation, module-specific naming). */
  label?: string;
  className?: string;
}

export function JobStatusBadge({ status, label, className }: JobStatusBadgeProps) {
  const t = useTranslations("jobStatus");
  const meta = STATUS_META[String(status)] ?? FALLBACK;
  const Icon = meta.icon;
  const isRunning = status === "running";
  // Unknown status: surface the raw string rather than the i18n "unknown"
  // fallback so admins can see what came in.
  const translated =
    meta === FALLBACK && String(status) ? String(status) : t(meta.labelKey);
  return (
    <Badge variant="outline" className={`${meta.tone} ${className ?? ""}`.trim()}>
      <Icon
        className={`h-3 w-3 me-1 ${isRunning ? "animate-spin" : ""}`}
        aria-hidden="true"
      />
      {label ?? translated}
    </Badge>
  );
}
