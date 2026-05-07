/**
 * Terms of Service page — public legal content. Renders DRAFT banner +
 * 7 policy sections + back link + contact email.
 */
import { describe, it, expect, afterEach } from "vitest";
import { screen, cleanup } from "@testing-library/react";
import { renderWithIntl } from "@/lib/test-utils/intl";
import TermsPage from "./page";

afterEach(cleanup);

describe("TermsPage", () => {
  it("renders the title", () => {
    renderWithIntl(<TermsPage />);
    expect(screen.getByText(/תנאי שימוש|Terms of Service/)).toBeTruthy();
  });

  it("shows the DRAFT banner so unreviewed copy isn't shipped as final", () => {
    renderWithIntl(<TermsPage />);
    expect(screen.getByText(/טיוטה|DRAFT/)).toBeTruthy();
  });

  it("renders all 7 policy sections", () => {
    renderWithIntl(<TermsPage />);
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(7);
  });

  it("includes the legal contact email", () => {
    renderWithIntl(<TermsPage />);
    expect(screen.getByText(/legal@platform\.local/)).toBeTruthy();
  });

  it("back link points to root", () => {
    renderWithIntl(<TermsPage />);
    const link = screen.getByRole("link", { name: /Platform Engineer/ });
    expect(link.getAttribute("href")).toBe("/");
  });
});
