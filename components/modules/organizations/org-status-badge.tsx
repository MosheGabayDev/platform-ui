"use client";
/**
 * @module components/modules/organizations/org-status-badge
 * Displays organization active/inactive status as a colored badge.
 * Pure presentational — no data fetching, no side effects.
 */

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface OrgStatusBadgeProps {
  isActive: boolean;
  className?: string;
}

export function OrgStatusBadge({ isActive, className }: OrgStatusBadgeProps) {
  const t = useTranslations("statusBadge.org");
  if (!isActive) {
    return (
      <span className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        "bg-muted text-muted-foreground border border-border",
        className
      )}>
        {t("inactive")}
      </span>
    );
  }

  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
      "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30",
      className
    )}>
      {t("active")}
    </span>
  );
}
