/**
 * @module components/shared/stats/stats-grid
 * Flex wrapper for a row of StatCard components.
 */

import { cn } from "@/lib/utils";
import type { StatsGridProps } from "./types";

export function StatsGrid({ children, className }: StatsGridProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {children}
    </div>
  );
}
