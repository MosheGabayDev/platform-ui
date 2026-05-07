/**
 * NotificationDrawer — popover body. Tests states: loading / error / empty /
 * list, mark-all-read button, click-to-route on row.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

const pushMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

import { NotificationDrawer } from "./notification-drawer";
import type { Notification } from "@/lib/modules/notifications/types";

afterEach(() => {
  cleanup();
  pushMock.mockReset();
});

const baseProps = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isError: false,
  onMarkRead: vi.fn(),
  onMarkAllRead: vi.fn(),
  isMarkingAllRead: false,
};

const mkNote = (over: Partial<Notification> = {}): Notification => ({
  id: "n1",
  type: "info",
  title: "title",
  description: "desc",
  is_read: false,
  created_at: new Date().toISOString(),
  ...over,
} as Notification);

describe("NotificationDrawer", () => {
  it("renders loading skeletons when isLoading", () => {
    const { container } = render(<NotificationDrawer {...baseProps} isLoading />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders error message when isError", () => {
    render(<NotificationDrawer {...baseProps} isError />);
    expect(screen.getByText("לא ניתן לטעון התראות")).toBeTruthy();
  });

  it("renders empty state when notifications empty", () => {
    render(<NotificationDrawer {...baseProps} />);
    expect(screen.getByText("אין התראות חדשות")).toBeTruthy();
  });

  it("renders notification rows with title + description", () => {
    render(
      <NotificationDrawer
        {...baseProps}
        notifications={[mkNote({ title: "T1", description: "D1" })]}
        unreadCount={1}
      />,
    );
    expect(screen.getByText("T1")).toBeTruthy();
    expect(screen.getByText("D1")).toBeTruthy();
  });

  it("shows 'mark all read' button only when unreadCount > 0", () => {
    const { rerender } = render(<NotificationDrawer {...baseProps} unreadCount={0} />);
    expect(screen.queryByText("סמן הכל כנקרא")).toBeNull();
    rerender(<NotificationDrawer {...baseProps} unreadCount={3} />);
    expect(screen.getByText("סמן הכל כנקרא")).toBeTruthy();
  });

  it("clicking 'mark all read' invokes onMarkAllRead", () => {
    const fn = vi.fn();
    render(<NotificationDrawer {...baseProps} unreadCount={1} onMarkAllRead={fn} />);
    fireEvent.click(screen.getByText("סמן הכל כנקרא"));
    expect(fn).toHaveBeenCalled();
  });

  it("clicking unread row calls onMarkRead and routes when action_url present", () => {
    const onMarkRead = vi.fn();
    render(
      <NotificationDrawer
        {...baseProps}
        notifications={[mkNote({ id: "n1", action_url: "/users/7", is_read: false })]}
        unreadCount={1}
        onMarkRead={onMarkRead}
      />,
    );
    fireEvent.click(screen.getByText("title"));
    expect(onMarkRead).toHaveBeenCalledWith("n1");
    expect(pushMock).toHaveBeenCalledWith("/users/7");
  });

  it("clicking already-read row does NOT call onMarkRead", () => {
    const onMarkRead = vi.fn();
    render(
      <NotificationDrawer
        {...baseProps}
        notifications={[mkNote({ is_read: true })]}
        onMarkRead={onMarkRead}
      />,
    );
    fireEvent.click(screen.getByText("title"));
    expect(onMarkRead).not.toHaveBeenCalled();
  });

  it("renders billing_alert variant icon (destructive color)", () => {
    const { container } = render(
      <NotificationDrawer
        {...baseProps}
        notifications={[mkNote({ type: "billing_alert" as never })]}
      />,
    );
    expect(container.querySelector(".text-destructive")).toBeTruthy();
  });

  it("renders relative time 'עכשיו' for fresh notification", () => {
    render(
      <NotificationDrawer
        {...baseProps}
        notifications={[mkNote({ created_at: new Date().toISOString() })]}
      />,
    );
    expect(screen.getByText("עכשיו")).toBeTruthy();
  });
});
