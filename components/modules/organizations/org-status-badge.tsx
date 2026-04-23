/**
 * @module components/modules/organizations/org-status-badge
 * Displays organization active/inactive status as a colored badge.
 * Pure presentational — no data fetching, no side effects.
 */

import { cn } from "@/lib/utils";

interface OrgStatusBadgeProps {
  isActive: boolean;
  className?: string;
}

export function OrgStatusBadge({ isActive, className }: OrgStatusBadgeProps) {
  if (!isActive) {
    return (
      <span className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        "bg-muted text-muted-foreground border border-border",
        className
      )}>
        לא פעיל
      </span>
    );
  }

  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
      "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30",
      className
    )}>
      פעיל
    </span>
  );
}
