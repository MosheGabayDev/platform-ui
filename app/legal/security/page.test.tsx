/**
 * Security disclosure page — public legal content. Renders all 4
 * policy sections + the security mailbox.
 */
import { describe, it, expect, afterEach } from "vitest";
import { screen, cleanup } from "@testing-library/react";
import { renderWithIntl } from "@/lib/test-utils/intl";
import SecurityPage from "./page";

afterEach(cleanup);

describe("SecurityPage", () => {
  it("renders the policy title", () => {
    renderWithIntl(<SecurityPage />);
    expect(screen.getByText(/חשיפת פגיעויות/)).toBeTruthy();
  });

  it("renders all 4 policy sections", () => {
    renderWithIntl(<SecurityPage />);
    // section keys: report, scope, outOfScope, safeHarbor — each renders an h2
    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings.length).toBe(4);
  });

  it("links to security@platform.local with a mailto", () => {
    renderWithIntl(<SecurityPage />);
    const link = screen.getByRole("link", { name: /security@platform\.local/ });
    expect(link.getAttribute("href")).toBe("mailto:security@platform.local");
  });

  it("includes a back link to root", () => {
    renderWithIntl(<SecurityPage />);
    const link = screen.getByRole("link", { name: /Platform Engineer/ });
    expect(link.getAttribute("href")).toBe("/");
  });
});
