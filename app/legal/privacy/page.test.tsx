/**
 * Privacy Policy page — public legal content. 7 GDPR-aligned sections.
 */
import { describe, it, expect, afterEach } from "vitest";
import { screen, cleanup } from "@testing-library/react";
import { renderWithIntl } from "@/lib/test-utils/intl";
import PrivacyPage from "./page";

afterEach(cleanup);

describe("PrivacyPage", () => {
  it("renders the title", () => {
    renderWithIntl(<PrivacyPage />);
    expect(screen.getByText(/מדיניות פרטיות|Privacy Policy/)).toBeTruthy();
  });

  it("shows the DRAFT banner", () => {
    renderWithIntl(<PrivacyPage />);
    expect(screen.getByText(/טיוטה|DRAFT/)).toBeTruthy();
  });

  it("renders all 7 GDPR sections", () => {
    renderWithIntl(<PrivacyPage />);
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(7);
  });

  it("includes the privacy contact email", () => {
    renderWithIntl(<PrivacyPage />);
    expect(screen.getByText(/privacy@platform\.local/)).toBeTruthy();
  });
});
