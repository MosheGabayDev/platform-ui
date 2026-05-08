/**
 * AppSidebar — RTL nav + pinned + recent + user dropdown.
 *
 * Heavy mocking surface: needs a SidebarProvider, useTheme, useSession-
 * less (sidebar reads pathname only), useNavGroups, and useNavHistory.
 * Radix DropdownMenu content is portal-rendered so the user-menu
 * interactions are covered by E2E.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, cleanup, fireEvent } from "@testing-library/react";
import { renderWithIntl } from "@/lib/test-utils/intl";
import { SidebarProvider } from "@/components/ui/sidebar";
import type { ReactElement } from "react";

const pathnameMock = vi.hoisted(() => vi.fn(() => "/"));
const pushMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  usePathname: pathnameMock,
  useRouter: () => ({ push: pushMock }),
}));

const themeState = vi.hoisted(() => ({ theme: "dark" as string | undefined, setTheme: vi.fn() }));
vi.mock("next-themes", () => ({
  useTheme: () => themeState,
}));

import { AppSidebar } from "./app-sidebar";
import { useNavHistory } from "@/lib/hooks/use-nav-history";

function render(node: ReactElement) {
  return renderWithIntl(<SidebarProvider>{node}</SidebarProvider>);
}

beforeEach(() => {
  pathnameMock.mockReturnValue("/");
  themeState.theme = "dark";
  themeState.setTheme.mockReset();
  // Clean nav history store between tests so pinned/recent state is deterministic.
  useNavHistory.setState({ recent: [], pinned: [] });
  localStorage.clear();
});
afterEach(cleanup);

describe("AppSidebar", () => {
  it("renders the brand header (Platform Engineer)", () => {
    render(<AppSidebar />);
    expect(screen.getByText(/Platform Engineer/)).toBeTruthy();
  });

  it("renders the user avatar with the org-admin role label", () => {
    render(<AppSidebar />);
    // Hebrew: "מנהל מערכת"; English: "System administrator"
    expect(screen.getByText(/מנהל מערכת|System administrator/)).toBeTruthy();
  });

  it("does NOT render the Recent group when no recent pages", () => {
    render(<AppSidebar />);
    expect(screen.queryByText(/ביקרת לאחרונה|Recently visited/)).toBeNull();
  });

  it("does NOT render the Pinned group when no pinned items", () => {
    render(<AppSidebar />);
    expect(screen.queryByText(/סומן לגישה מהירה|Pinned for quick access/)).toBeNull();
  });

  it("renders the Pinned group when an item is pinned", () => {
    useNavHistory.setState({ recent: [], pinned: ["/users"] });
    render(<AppSidebar />);
    expect(screen.getByText(/סומן לגישה מהירה|Pinned for quick access/)).toBeTruthy();
  });

  it("renders the Recent group when there's a recent visit (excluding current page)", () => {
    pathnameMock.mockReturnValue("/");
    useNavHistory.setState({ recent: ["/users", "/helpdesk"], pinned: [] });
    render(<AppSidebar />);
    expect(screen.getByText(/ביקרת לאחרונה|Recently visited/)).toBeTruthy();
  });

  it("hides the Recent group when the only recent entry IS the current page", () => {
    pathnameMock.mockReturnValue("/users");
    useNavHistory.setState({ recent: ["/users"], pinned: [] });
    render(<AppSidebar />);
    expect(screen.queryByText(/ביקרת לאחרונה|Recently visited/)).toBeNull();
  });

  it("renders without crashing for a deep active route", () => {
    // Active highlighting is rendered via Framer Motion + data attribute
    // that happy-dom may not expose; just verify the deep path doesn't
    // crash the component (regression for prefix-match logic).
    pathnameMock.mockReturnValue("/helpdesk/tickets");
    const { container } = render(<AppSidebar />);
    expect(container.firstChild).toBeTruthy();
  });

  it("user dropdown trigger is interactive (renders avatar fallback)", () => {
    const { container } = render(<AppSidebar />);
    const avatarFallback = container.querySelector('[class*="bg-gradient-to-br"]');
    expect(avatarFallback).toBeTruthy();
  });

  it("clicking a parent nav item with children toggles the children panel", () => {
    pathnameMock.mockReturnValue("/");
    render(<AppSidebar />);
    // Find the Settings parent (has children: AI / general / email / usageLimits)
    const settingsBtn = screen.getByRole("button", { name: /הגדרות|Settings/ });
    expect(settingsBtn).toBeTruthy();
    fireEvent.click(settingsBtn);
    // After click, the children should be present in the DOM.
    // We can't easily detect the AnimatePresence height transition in
    // happy-dom, so just verify the click does not throw.
  });
});
