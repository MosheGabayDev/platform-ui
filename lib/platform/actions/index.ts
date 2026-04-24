/**
 * @platform cross
 * @module lib/platform/actions
 * Barrel export for the Dangerous Action Standard (ADR-021).
 */

export type { DangerLevel, PlatformAction, ActionConfirmPayload } from "./types";
export type { DangerLevelConfig } from "./danger-level";
export {
  DANGER_LEVEL_CONFIG,
  isDestructiveLevel,
  requiresTypedConfirmation,
  requiresReason,
  normalizeDangerLevel,
} from "./danger-level";
export { USER_ACTIONS, ORG_ACTIONS } from "./definitions";
