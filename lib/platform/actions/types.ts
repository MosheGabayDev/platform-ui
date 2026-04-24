/**
 * @platform cross
 * @module lib/platform/actions/types
 * Core type definitions for the Dangerous Action Standard (ADR-021).
 *
 * Cross-platform: no React, no Next.js, no DOM dependencies.
 * Safe for: Next.js web, React Native, Node.js tests, CLI tools.
 *
 * Security design principle:
 *   DangerLevel is metadata for UX only.
 *   Backend enforces authorization independently of frontend danger classification.
 *   auditEvent is the canonical name for the audit log entry on execution.
 */

/** Severity classification for a platform action. Controls UX confirmation requirements. */
export type DangerLevel = "none" | "low" | "medium" | "high" | "critical";

/**
 * Describes a single platform action that may require confirmation,
 * permission checks, reason collection, or audit logging.
 *
 * These are static config objects — they carry no runtime state.
 * Bind to React state via useDangerousAction().
 */
export interface PlatformAction {
  /** Stable machine identifier, unique per action. Format: "module.verb". */
  id: string;
  /** Short human-readable label for buttons and dialog titles. Hebrew/i18n ready. */
  label: string;
  /** Longer description shown in confirmation dialogs. Be specific about consequences. */
  description?: string;
  /**
   * Dot-notation permission codenames (any one of) required to execute this action.
   * Checked by PermissionGate (UX only). Backend MUST enforce independently.
   */
  requiredPermissions?: string[];
  /**
   * Role names (any one of) required to execute this action.
   * Checked by PermissionGate (UX only). Backend MUST enforce independently.
   */
  requiredRoles?: string[];
  /** Controls confirmation UX tier. Does NOT affect backend authorization. */
  dangerLevel: DangerLevel;
  /** Whether a confirmation dialog must be shown before executing. */
  requiresConfirmation: boolean;
  /**
   * Whether the actor must supply a free-text reason/comment before confirming.
   * Automatically true for dangerLevel "high" and "critical".
   * The reason is captured client-side; backend audit integration is tracked by TODO(Q14).
   */
  requiresReason?: boolean;
  /**
   * Canonical audit event name. Written to audit log on execution.
   * Format: "module.action_verb" e.g. "users.deactivate", "orgs.disable".
   * Required for dangerLevel >= "medium".
   */
  auditEvent: string;
  /** Resource type this action operates on. Used for audit context and logging. */
  resourceType: string;
  /** Optional TanStack Query mutation key for cache invalidation hints. */
  mutationKey?: string;
}

/** Payload captured by ConfirmActionDialog and forwarded to useDangerousAction. */
export interface ActionConfirmPayload {
  /** Free-text reason from the actor. Null if not required or left empty. */
  reason: string | null;
  /** ISO timestamp when the actor clicked confirm. */
  confirmedAt: string;
}
