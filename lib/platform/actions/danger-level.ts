/**
 * @platform cross
 * @module lib/platform/actions/danger-level
 * Pure helpers for the DangerLevel scale.
 * No React, no DOM, no i18n library — plain objects and functions only.
 */

import type { DangerLevel } from "./types";

/** Static config per danger level for UI rendering. */
export interface DangerLevelConfig {
  /** Tailwind color class for level badge/icon tinting. */
  colorClass: string;
  /** Hebrew label for the level badge. Empty for "none". */
  label: string;
  /** Whether the confirm button should use destructive (red) styling. */
  destructive: boolean;
  /**
   * Whether the actor must type a confirmation string before confirming.
   * True only for "critical".
   */
  requiresTypedConfirmation: boolean;
}

export const DANGER_LEVEL_CONFIG: Record<DangerLevel, DangerLevelConfig> = {
  none: {
    colorClass: "",
    label: "",
    destructive: false,
    requiresTypedConfirmation: false,
  },
  low: {
    colorClass: "text-blue-600 dark:text-blue-400",
    label: "פעולה",
    destructive: false,
    requiresTypedConfirmation: false,
  },
  medium: {
    colorClass: "text-amber-600 dark:text-amber-400",
    label: "זהירות",
    destructive: false,
    requiresTypedConfirmation: false,
  },
  high: {
    colorClass: "text-orange-600 dark:text-orange-400",
    label: "פעולה רגישה",
    destructive: true,
    requiresTypedConfirmation: false,
  },
  critical: {
    colorClass: "text-destructive",
    label: "פעולה קריטית",
    destructive: true,
    requiresTypedConfirmation: true,
  },
};

/** Returns true when this danger level uses destructive (red) button styling. */
export function isDestructiveLevel(level: DangerLevel): boolean {
  return DANGER_LEVEL_CONFIG[level].destructive;
}

/** Returns true when the actor must type a confirmation string. */
export function requiresTypedConfirmation(level: DangerLevel): boolean {
  return DANGER_LEVEL_CONFIG[level].requiresTypedConfirmation;
}

/** Returns true when a reason/comment should be collected for this level. */
export function requiresReason(level: DangerLevel): boolean {
  return level === "high" || level === "critical";
}

/**
 * Normalizes the legacy ConfirmDangerLevel strings to DangerLevel.
 * "destructive" → "high", "default" → "none".
 */
export function normalizeDangerLevel(
  level: DangerLevel | "default" | "destructive" | undefined
): DangerLevel {
  if (!level || level === "default") return "none";
  if (level === "destructive") return "high";
  return level;
}
