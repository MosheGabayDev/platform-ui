/**
 * Legal index — landing page that links to every legal sub-page.
 */
import { describe, it, expect, afterEach } from "vitest";
import { screen, cleanup } from "@testing-library/react";
import { renderWithIntl } from "@/lib/test-utils/intl";
import LegalIndexPage from "./page";

afterEach(cleanup);

describe("LegalIndexPage", () => {
  it("renders the index title", () => {
    renderWithIntl(<LegalIndexPage />);
    expect(screen.getByText(/מסמכים משפטיים|Legal documents/)).toBeTruthy();
  });

  it("renders all 5 legal cards with correct hrefs", () => {
    const { container } = renderWithIntl(<LegalIndexPage />);
    const expected = [
      ["terms", "/legal/terms"],
      ["privacy", "/legal/privacy"],
      ["sla", "/legal/sla"],
      ["security", "/legal/security"],
      ["subprocessors", "/legal/subprocessors"],
    ];
    for (const [key, href] of expected) {
      const card = container.querySelector(`[data-testid='legal-card-${key}']`);
      expect(card, `card ${key} missing`).toBeTruthy();
      expect((card as HTMLAnchorElement).getAttribute("href")).toBe(href);
    }
  });

  it("renders 5 section h2 headings (one per card)", () => {
    renderWithIntl(<LegalIndexPage />);
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(5);
  });

  it("includes the general contact email", () => {
    renderWithIntl(<LegalIndexPage />);
    expect(screen.getByText(/legal@platform\.local/)).toBeTruthy();
  });
});
