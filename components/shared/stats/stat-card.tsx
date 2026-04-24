/**
 * @module components/shared/stats/stat-card
 * KPI chip/card used in list page headers and dashboard widgets.
 * Replaces the inline StatChip pattern from Users and Organizations pages.
 */

import { cn } from "@/lib/utils";
import type { StatCardProps } from "./types";

export function StatCard({ icon: Icon, value, label, color }: StatCardProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 border text-sm",
        color ?? "border-border/50 text-foreground/80"
      )}
    >
      {Icon && <Icon className="size-4 shrink-0" />}
      <span className="font-semibold tabular-nums">{value ?? "—"}</span>
      <span className="text-xs opacity-70">{label}</span>
    </div>
  );
}
