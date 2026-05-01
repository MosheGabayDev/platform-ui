/**
 * @module lib/api/notifications
 * API client functions for the PlatformNotifications capability (cap 12).
 * All calls go through the Next.js proxy (/api/proxy/notifications/*).
 *
 * MOCK MODE is currently true: returns an empty notification list so pages
 * render without 401/404 noise from a backend-down environment. Flips to
 * false once R046-min Notification Service backend lands.
 *
 * Do NOT call Flask directly. Do NOT put UI logic here.
 * Security: notifications are org-scoped + user-scoped on the backend.
 */
import type { NotificationsListResponse, MarkReadResponse } from "@/lib/modules/notifications/types";

export const MOCK_MODE = true;

const BASE = "/api/proxy/notifications";

const EMPTY_NOTIFICATIONS: NotificationsListResponse = {
  success: true,
  data: {
    notifications: [],
    unread_count: 0,
    total: 0,
  },
};

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? body.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/** Fetch the current user's notification list (unread first, max 50). */
export async function fetchNotifications(): Promise<NotificationsListResponse> {
  if (MOCK_MODE) return EMPTY_NOTIFICATIONS;
  return apiFetch<NotificationsListResponse>("");
}

/** Mark a single notification as read. */
export async function markNotificationRead(id: string): Promise<MarkReadResponse> {
  if (MOCK_MODE) return { success: true, message: `(mock) ${id} marked read` };
  return apiFetch<MarkReadResponse>(`/${id}/read`, { method: "PATCH" });
}

/** Mark all notifications as read for the current user. */
export async function markAllNotificationsRead(): Promise<MarkReadResponse> {
  if (MOCK_MODE) return { success: true, message: "(mock) all marked read" };
  return apiFetch<MarkReadResponse>("/read-all", { method: "PATCH" });
}
