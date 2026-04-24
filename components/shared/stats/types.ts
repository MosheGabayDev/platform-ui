/**
 * @module components/shared/stats/types
 * Shared types for stat card components.
 */

import type { LucideIcon } from "lucide-react";

export interface StatCardProps {
  /** Optional icon displayed before the value. */
  icon?: LucideIcon;
  /** Numeric or string value. Shows "—" when undefined. */
  value: number | string | undefined;
  /** Short label shown after the value. */
  label: string;
  /**
   * Tailwind color classes for border + text.
   * Example: "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
   */
  color?: string;
}

export interface StatsGridProps {
  children: React.ReactNode;
  className?: string;
}
