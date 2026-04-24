/**
 * @module components/shared/detail-view/detail-header-card
 * Top-of-page identity card: title, optional subtitle, badge slot, avatar slot.
 * Used as the first card in any detail page.
 */

import { cn } from "@/lib/utils";
import type { DetailHeaderCardProps } from "./types";

export function DetailHeaderCard({
  title,
  subtitle,
  subtitleMono = false,
  badges,
  avatar,
}: DetailHeaderCardProps) {
  return (
    <div className="glass border-border/50 rounded-xl px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">{title}</h1>
          {subtitle && (
            <p className={cn("text-sm text-muted-foreground", subtitleMono && "font-mono")}>
              {subtitle}
            </p>
          )}
          {badges && (
            <div className="flex flex-wrap gap-2 pt-1">{badges}</div>
          )}
        </div>
        <div className="shrink-0">{avatar}</div>
      </div>
    </div>
  );
}
