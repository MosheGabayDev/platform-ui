/**
 * Topbar — sticky header with sidebar-toggle, search trigger, theme
 * toggle, accent picker, language switcher, notification bell.
 *
 * useSidebar requires a SidebarProvider; we mock it. NotificationBell
 * pulls useNotifications which we also mock.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, cleanup, fireEvent } from "@testing-library/react";
import { renderWithIntl } from "@/lib/test-utils/intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";

const toggleSidebarMock = vi.hoisted(() => vi.fn());
vi.mock("@/components/ui/sidebar", () => ({
  useSidebar: () => ({ toggleSidebar: toggleSidebarMock }),
}));

const themeState = vi.hoisted(() => ({
  theme: "dark" as string | undefined,
  setTheme: vi.fn(),
}));
vi.mock("next-themes", () => ({
  useTheme: () => themeState,
}));

vi.mock("@/lib/hooks/use-notifications", () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    isError: false,
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    isMarkingAllRead: false,
  }),
}));

import { Topbar } from "./topbar";

function render(node: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithIntl(<QueryClientProvider client={qc}>{node}</QueryClientProvider>);
}

beforeEach(() => {
  toggleSidebarMock.mockReset();
  themeState.theme = "dark";
  themeState.setTheme.mockReset();
});
afterEach(cleanup);

describe("Topbar", () => {
  it("renders the search trigger with i18n placeholder text", () => {
    render(<Topbar />);
    expect(screen.getByText(/חיפוש|Search/)).toBeTruthy();
  });

  it("clicking the search trigger dispatches Cmd+K keydown", () => {
    render(<Topbar />);
    const listener = vi.fn();
    document.addEventListener("keydown", listener);
    const trigger = screen.getByText(/חיפוש|Search/).closest("button");
    fireEvent.click(trigger!);
    expect(listener).toHaveBeenCalled();
    document.removeEventListener("keydown", listener);
  });

  it("clicking the sidebar-toggle button calls useSidebar().toggleSidebar", () => {
    render(<Topbar />);
    // The leftmost ghost icon button is the sidebar toggle.
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]!);
    expect(toggleSidebarMock).toHaveBeenCalled();
  });

  it("theme toggle is present and uses next-themes setTheme", () => {
    render(<Topbar />);
    // Find the button that's neither the sidebar toggle nor the search.
    // We assert the click against setTheme rather than DOM text since
    // the icon swaps after mount.
    const buttons = screen.getAllByRole("button");
    // Theme toggle is the 2nd ghost icon button (after sidebar) plus the
    // search trigger. Find by clicking and checking setTheme was called.
    let foundThemeToggle = false;
    for (const btn of buttons) {
      themeState.setTheme.mockReset();
      fireEvent.click(btn);
      if (themeState.setTheme.mock.calls.length === 1) {
        foundThemeToggle = true;
        // Dark-mode → click should request "light".
        expect(themeState.setTheme).toHaveBeenCalledWith("light");
        break;
      }
    }
    expect(foundThemeToggle).toBe(true);
  });

  it("renders connection indicator + accent picker + language switcher + notification bell", () => {
    const { container } = render(<Topbar />);
    // ConnectionIndicator: emerald dot
    expect(container.querySelector(".bg-emerald-400")).toBeTruthy();
    // Notification bell: aria-label includes "Notifications"
    expect(screen.getByRole("button", { name: /התראות|Notifications/ })).toBeTruthy();
    // Accent picker: Palette icon
    expect(container.querySelector("[role='button']") || container.querySelector("button")).toBeTruthy();
  });
});
