/**
 * Subprocessors page — static legal content. Renders all provider rows
 * and the contact email.
 */
import { describe, it, expect, afterEach } from "vitest";
import { screen, cleanup } from "@testing-library/react";
import { renderWithIntl } from "@/lib/test-utils/intl";
import SubprocessorsPage from "./page";

afterEach(cleanup);

describe("SubprocessorsPage", () => {
  it("renders the title and subtitle from i18n", () => {
    renderWithIntl(<SubprocessorsPage />);
    expect(screen.getByText(/ספקי משנה/)).toBeTruthy();
  });

  it("renders all 6 known providers", () => {
    renderWithIntl(<SubprocessorsPage />);
    for (const name of ["OpenAI", "Anthropic", "Amazon Web Services", "Stripe", "Sentry", "Postmark"]) {
      expect(screen.getByText(name)).toBeTruthy();
    }
  });

  it("renders the privacy contact email", () => {
    renderWithIntl(<SubprocessorsPage />);
    expect(screen.getByText(/privacy@platform\.local/)).toBeTruthy();
  });

  it("includes a back link to root", () => {
    renderWithIntl(<SubprocessorsPage />);
    const link = screen.getByRole("link", { name: /Platform Engineer/ });
    expect(link.getAttribute("href")).toBe("/");
  });
});
