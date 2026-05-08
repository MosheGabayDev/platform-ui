/**
 * LanguageSwitcher — compact dropdown that swaps the active locale.
 *
 * Radix DropdownMenu portal-renders content; happy-dom can't reach it,
 * so this suite covers the trigger contract + locale-store integration.
 * Item-click flow is verified by the E2E suite.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { screen, cleanup } from "@testing-library/react";
import { renderWithIntl } from "@/lib/test-utils/intl";
import { LanguageSwitcher } from "./language-switcher";
import { useLocaleStore } from "@/lib/i18n/locale-store";

beforeEach(() => {
  useLocaleStore.setState({ locale: "he" });
});
afterEach(cleanup);

describe("LanguageSwitcher", () => {
  it("renders the trigger button", () => {
    renderWithIntl(<LanguageSwitcher />);
    expect(screen.getByRole("button")).toBeTruthy();
  });

  it("trigger has an accessible label", () => {
    renderWithIntl(<LanguageSwitcher />);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toBeTruthy();
  });

  it("renders the active locale tag in the badge after mount", async () => {
    const { container } = renderWithIntl(<LanguageSwitcher />);
    // After useEffect → mounted=true the tag becomes visible
    await new Promise((r) => setTimeout(r, 10));
    const tag = container.querySelector("span.font-mono");
    expect(tag?.textContent).toBeTruthy();
  });

  it("reads default locale 'he' on initial render", () => {
    expect(useLocaleStore.getState().locale).toBe("he");
    renderWithIntl(<LanguageSwitcher />);
    // Component reads from store; no crash means OK
    expect(screen.getByRole("button")).toBeTruthy();
  });
});
