"use client";
/**
 * @module components/modules/users/user-status-badge
 * Displays user active/inactive/pending status as a colored badge.
 * Pure presentational — no data fetching, no side effects.
 */

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface UserStatusBadgeProps {
  isActive: boolean;
  isApproved: boolean;
  className?: string;
}

export function UserStatusBadge({ isActive, isApproved, className }: UserStatusBadgeProps) {
  const t = useTranslations("statusBadge.user");
  if (!isApproved) {
    return (
      <span className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        "bg-amber-500/15 text-amber-500 border border-amber-500/30",
        className
      )}>
        {t("pending")}
      </span>
    );
  }

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
