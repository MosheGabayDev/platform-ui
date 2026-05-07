/**
 * Docs landing page — public scaffold. Tests the 5-section grid + the
 * coming-soon banner + i18n resolution.
 */
import { describe, it, expect, afterEach } from "vitest";
import { screen, cleanup } from "@testing-library/react";
import { renderWithIntl } from "@/lib/test-utils/intl";
import DocsLandingPage from "./page";

afterEach(cleanup);

describe("DocsLandingPage", () => {
  it("renders the docs title", () => {
    renderWithIntl(<DocsLandingPage />);
    expect(screen.getByText(/מרכז תיעוד|Documentation/)).toBeTruthy();
  });

  it("renders all 5 section cards with proper hrefs", () => {
    const { container } = renderWithIntl(<DocsLandingPage />);
    const expected = [
      ["gettingStarted", "/docs/getting-started"],
      ["adminGuide", "/docs/admin"],
      ["aiGuide", "/docs/ai"],
      ["apiReference", "/docs/api"],
      ["releaseNotes", "/docs/releases"],
    ];
    for (const [key, href] of expected) {
      const card = container.querySelector(`[data-testid='docs-section-${key}']`);
      expect(card).toBeTruthy();
      expect((card as HTMLAnchorElement).getAttribute("href")).toBe(href);
    }
  });

  it("shows the coming-soon banner", () => {
    renderWithIntl(<DocsLandingPage />);
    expect(screen.getByText(/pilot|תוכנית.*pilot|תוכן מלא/)).toBeTruthy();
  });

  it("includes a back link to root", () => {
    renderWithIntl(<DocsLandingPage />);
    const link = screen.getByRole("link", { name: /Platform Engineer/ });
    expect(link.getAttribute("href")).toBe("/");
  });

  it("renders 5 section h2 headings", () => {
    renderWithIntl(<DocsLandingPage />);
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(5);
  });
});
