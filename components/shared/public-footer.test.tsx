/**
 * PublicFooter — anonymous surface footer.
 */
import { describe, it, expect, afterEach } from "vitest";
import { screen, cleanup } from "@testing-library/react";
import { renderWithIntl } from "@/lib/test-utils/intl";
import { PublicFooter } from "./public-footer";

afterEach(cleanup);

describe("PublicFooter", () => {
  it("renders the copyright line", () => {
    renderWithIntl(<PublicFooter />);
    expect(screen.getByText(/2026 Platform Engineer/)).toBeTruthy();
  });

  it("links to all 5 public surfaces with correct hrefs", () => {
    const { container } = renderWithIntl(<PublicFooter />);
    const expected = [
      ["legal", "/legal"],
      ["privacy", "/legal/privacy"],
      ["terms", "/legal/terms"],
      ["security", "/legal/security"],
      ["docs", "/docs"],
    ];
    for (const [key, href] of expected) {
      const link = container.querySelector(`[data-testid='footer-link-${key}']`);
      expect(link, `${key} link missing`).toBeTruthy();
      expect((link as HTMLAnchorElement).getAttribute("href")).toBe(href);
    }
  });
});
