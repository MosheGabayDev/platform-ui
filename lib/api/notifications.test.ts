/**
 * Notifications client tests (cap 12, mock mode).
 */
import { describe, it, expect } from "vitest";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "./notifications";

describe("notifications client (mock mode)", () => {
  it("fetchNotifications returns the empty envelope", async () => {
    const res = await fetchNotifications();
    expect(res.success).toBe(true);
    expect(res.data.notifications).toEqual([]);
    expect(res.data.unread_count).toBe(0);
    expect(res.data.total).toBe(0);
  });

  it("markNotificationRead returns success", async () => {
    const res = await markNotificationRead("any-id");
    expect(res.success).toBe(true);
  });

  it("markAllNotificationsRead returns success", async () => {
    const res = await markAllNotificationsRead();
    expect(res.success).toBe(true);
  });
});
