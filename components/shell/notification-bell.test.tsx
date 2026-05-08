/**
 * NotificationBell — header bell + popover trigger. Verifies the
 * unread-badge contract and aria-label state changes.
 *
 * Popover content is portal-rendered (Radix); covered by E2E.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, cleanup } from "@testing-library/react";
import { renderWithIntl } from "@/lib/test-utils/intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";

const notificationsState = vi.hoisted(() => ({
  notifications: [] as unknown[],
  unreadCount: 0,
  isLoading: false,
  isError: false,
  markRead: vi.fn(),
  markAllRead: vi.fn(),
  isMarkingAllRead: false,
}));

vi.mock("@/lib/hooks/use-notifications", () => ({
  useNotifications: () => notificationsState,
}));

import { NotificationBell } from "./notification-bell";

function render(node: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithIntl(<QueryClientProvider client={qc}>{node}</QueryClientProvider>);
}

beforeEach(() => {
  notificationsState.notifications = [];
  notificationsState.unreadCount = 0;
  notificationsState.markRead.mockReset();
  notificationsState.markAllRead.mockReset();
});
afterEach(cleanup);

describe("NotificationBell", () => {
  it("renders the bell trigger with default aria-label when no unread", () => {
    render(<NotificationBell />);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toMatch(/התראות|Notifications/);
    // No badge when 0 unread
    expect(btn.textContent).not.toMatch(/\d/);
  });

  it("renders the unread count badge when unreadCount > 0", () => {
    notificationsState.unreadCount = 3;
    render(<NotificationBell />);
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("aria-label includes the unread count when > 0", () => {
    notificationsState.unreadCount = 7;
    render(<NotificationBell />);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toContain("7");
  });

  it("clamps badge to '99+' when unreadCount > 99", () => {
    notificationsState.unreadCount = 142;
    render(<NotificationBell />);
    expect(screen.getByText("99+")).toBeTruthy();
  });

  it("renders 99 (not clamped) at exactly 99", () => {
    notificationsState.unreadCount = 99;
    render(<NotificationBell />);
    expect(screen.getByText("99")).toBeTruthy();
  });
});
