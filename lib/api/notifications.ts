/**
 * @module lib/api/notifications
 * API client functions for the PlatformNotifications capability (cap 12).
 * All calls go through the Next.js proxy (/api/proxy/notifications/*).
 *
 * Do NOT call Flask directly. Do NOT put UI logic here.
 * Do NOT use these functions directly in components — wrap with useQuery / useMutation.
 *
 * Security: notifications are org-scoped + user-scoped on the backend.
 * The frontend renders only what it receives — no client-side filtering.
 */
import type { NotificationsListResponse, MarkReadResponse } from "@/lib/modules/notifications/types";

const BASE = "/api/proxy/notifications";

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
export function fetchNotifications(): Promise<NotificationsListResponse> {
  return apiFetch<NotificationsListResponse>("");
}

/** Mark a single notification as read. */
export function markNotificationRead(id: string): Promise<MarkReadResponse> {
  return apiFetch<MarkReadResponse>(`/${id}/read`, { method: "PATCH" });
}

/** Mark all notifications as read for the current user. */
export function markAllNotificationsRead(): Promise<MarkReadResponse> {
  return apiFetch<MarkReadResponse>("/read-all", { method: "PATCH" });
}
