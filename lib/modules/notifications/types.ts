/**
 * @module lib/modules/notifications/types
 * TypeScript types for the PlatformNotifications capability (cap 12).
 *
 * Notifications are org-scoped AND user-scoped.
 * The API enforces tenant + user isolation — the frontend renders only what it receives.
 *
 * Do NOT add UI state here. Do NOT import React or component libraries here.
 */

// ---------------------------------------------------------------------------
// Notification type discriminator
// ---------------------------------------------------------------------------

/**
 * Discriminated type field — drives icon/colour selection in the component.
 * New types must be added here and handled in NotificationDrawer via the
 * NOTIFICATION_META map (no conditional rendering in JSX).
 */
export type NotificationType =
  | "approval_request"    // Helpdesk (04) — tool invocation awaiting approval
  | "investigation_done"  // AI Agents (05) — async investigation completed
  | "billing_alert"       // Billing (08) — quota threshold crossed
  | "service_down"        // System Health (10) — monitored service unreachable
  | "info";               // Generic informational notification

// ---------------------------------------------------------------------------
// Core notification record
// ---------------------------------------------------------------------------

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description?: string;
  /** ISO-8601 timestamp */
  created_at: string;
  is_read: boolean;
  /** Optional deep-link path within the app (e.g. "/helpdesk/sessions/42") */
  action_url?: string;
}

// ---------------------------------------------------------------------------
// API response envelopes
// ---------------------------------------------------------------------------

export interface NotificationsListResponse {
  success: boolean;
  data: {
    notifications: Notification[];
    unread_count: number;
    total: number;
  };
}

export interface MarkReadResponse {
  success: boolean;
  message: string;
}
