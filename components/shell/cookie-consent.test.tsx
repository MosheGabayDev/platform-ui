/**
 * CookieConsent — banner persists choice in localStorage; mounted-guard
 * for hydration safety; clicking accept hides the banner.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { screen, cleanup, fireEvent } from "@testing-library/react";
import { renderWithIntl as render } from "@/lib/test-utils/intl";
import { CookieConsent } from "./cookie-consent";

beforeEach(() => {
  localStorage.clear();
});
afterEach(cleanup);

describe("CookieConsent", () => {
  it("renders the banner when no prior consent", () => {
    render(<CookieConsent />);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("renders title + description from i18n", () => {
    render(<CookieConsent />);
    expect(screen.getAllByText(/עוגיות/).length).toBeGreaterThanOrEqual(2);
  });

  it("hides after click and persists 'accepted' to localStorage", () => {
    render(<CookieConsent />);
    fireEvent.click(screen.getByRole("button", { name: /הבנתי|Got it/ }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(localStorage.getItem("cookie-consent:v1")).toBe("accepted");
  });

  it("stays hidden when localStorage already has acceptance", () => {
    localStorage.setItem("cookie-consent:v1", "accepted");
    render(<CookieConsent />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("links to /legal/privacy", () => {
    render(<CookieConsent />);
    const link = screen.getByRole("link", { name: /פרטיות|privacy/i });
    expect(link.getAttribute("href")).toBe("/legal/privacy");
  });
});
