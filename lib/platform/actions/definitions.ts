/**
 * @platform cross
 * @module lib/platform/actions/definitions
 * Well-known PlatformAction instances for core modules.
 *
 * Import specific action objects instead of constructing ad-hoc config inline.
 * Adding a new action here documents it at the platform level.
 */

import type { PlatformAction } from "./types";

// ─── Users ───────────────────────────────────────────────────────────────────

export const USER_ACTIONS = {
  deactivate: {
    id: "users.deactivate",
    label: "השבת משתמש",
    description: "המשתמש לא יוכל להתחבר למערכת עד לשחזור הגישה על ידי אדמין.",
    requiredRoles: ["admin", "system_admin"],
    dangerLevel: "medium",
    requiresConfirmation: true,
    requiresReason: false,
    auditEvent: "users.deactivate",
    resourceType: "user",
  },
  reactivate: {
    id: "users.reactivate",
    label: "הפעל מחדש",
    description: "המשתמש יוכל להתחבר שוב למערכת.",
    requiredRoles: ["admin", "system_admin"],
    dangerLevel: "low",
    requiresConfirmation: true,
    requiresReason: false,
    auditEvent: "users.reactivate",
    resourceType: "user",
  },
} as const satisfies Record<string, PlatformAction>;

// ─── Organizations ────────────────────────────────────────────────────────────

export const ORG_ACTIONS = {
  deactivate: {
    id: "orgs.deactivate",
    label: "השבת ארגון",
    description: "כל משתמשי הארגון לא יוכלו להתחבר למערכת עד לשחזור הארגון. פעולה זו ניתנת לביטול.",
    requiredRoles: ["system_admin"],
    dangerLevel: "high",
    requiresConfirmation: true,
    requiresReason: false,
    auditEvent: "orgs.deactivate",
    resourceType: "organization",
  },
  reactivate: {
    id: "orgs.reactivate",
    label: "הפעל ארגון",
    description: "משתמשי הארגון יוכלו להתחבר שוב למערכת.",
    requiredRoles: ["system_admin"],
    dangerLevel: "low",
    requiresConfirmation: true,
    requiresReason: false,
    auditEvent: "orgs.reactivate",
    resourceType: "organization",
  },
} as const satisfies Record<string, PlatformAction>;
