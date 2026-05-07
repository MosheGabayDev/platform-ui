/**
 * BottomNav — mobile-only fixed bar with active-route indicator.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { screen, cleanup } from "@testing-library/react";
import { renderWithIntl as render } from "@/lib/test-utils/intl";

const pathnameMock = vi.hoisted(() => vi.fn(() => "/"));
vi.mock("next/navigation", () => ({
  usePathname: pathnameMock,
}));

import { BottomNav } from "./bottom-nav";

afterEach(() => {
  cleanup();
  pathnameMock.mockReset();
  pathnameMock.mockReturnValue("/");
});

describe("BottomNav", () => {
  it("renders 5 mobile nav links", () => {
    render(<BottomNav />);
    expect(screen.getAllByRole("link").length).toBe(5);
  });

  it("renders Hebrew labels", () => {
    render(<BottomNav />);
    expect(screen.getByText("דשבורד")).toBeTruthy();
    expect(screen.getByText("הלפדסק")).toBeTruthy();
    expect(screen.getByText("סוכנים")).toBeTruthy();
    expect(screen.getByText("ניטור")).toBeTruthy();
    expect(screen.getByText("הגדרות")).toBeTruthy();
  });

  it("md:hidden + fixed at bottom (CLAUDE.md mobile rules)", () => {
    const { container } = render(<BottomNav />);
    const nav = container.querySelector("nav")!;
    expect(nav.classList.contains("md:hidden")).toBe(true);
    expect(nav.classList.contains("fixed")).toBe(true);
    expect(nav.classList.contains("bottom-0")).toBe(true);
  });

  it("highlights active route exact match", () => {
    pathnameMock.mockReturnValue("/helpdesk");
    render(<BottomNav />);
    const helpdeskLink = screen.getByText("הלפדסק").closest("a")!;
    expect(helpdeskLink.className).toContain("text-primary");
  });

  it("highlights nested active route via prefix", () => {
    pathnameMock.mockReturnValue("/helpdesk/tickets");
    render(<BottomNav />);
    const helpdeskLink = screen.getByText("הלפדסק").closest("a")!;
    expect(helpdeskLink.className).toContain("text-primary");
  });

  it("does not highlight when path differs", () => {
    pathnameMock.mockReturnValue("/users");
    render(<BottomNav />);
    const helpdeskLink = screen.getByText("הלפדסק").closest("a")!;
    expect(helpdeskLink.className).toContain("text-muted-foreground");
  });
});
