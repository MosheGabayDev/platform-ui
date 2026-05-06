/**
 * Tests for the IntlProvider — verifies locale switching at runtime.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { useTranslations } from "next-intl";
import { IntlProvider } from "./intl-provider";
import { useLocaleStore } from "@/lib/i18n/locale-store";

function HelpTitle() {
  const t = useTranslations("help");
  return <span data-testid="help-title">{t("title")}</span>;
}

function MissingKey() {
  const t = useTranslations("nonexistent");
  return <span data-testid="missing">{t("alsoMissing")}</span>;
}

beforeEach(() => {
  // Reset to Hebrew default before each run.
  useLocaleStore.setState({ locale: "he" });
});

afterEach(cleanup);

describe("IntlProvider", () => {
  it("renders Hebrew title at default locale", () => {
    render(
      <IntlProvider>
        <HelpTitle />
      </IntlProvider>,
    );
    expect(screen.getByTestId("help-title").textContent).toContain("עזרה");
  });

  it("re-renders with English copy when the locale store flips", async () => {
    render(
      <IntlProvider>
        <HelpTitle />
      </IntlProvider>,
    );
    act(() => {
      useLocaleStore.setState({ locale: "en" });
    });
    expect(screen.getByTestId("help-title").textContent).toContain("Help");
  });

  it("falls back to the namespaced key when the catalog is missing the entry", () => {
    render(
      <IntlProvider>
        <MissingKey />
      </IntlProvider>,
    );
    expect(screen.getByTestId("missing").textContent).toBe("nonexistent.alsoMissing");
  });

  it("updates <html lang> + <html dir> on locale change", () => {
    render(
      <IntlProvider>
        <HelpTitle />
      </IntlProvider>,
    );
    expect(document.documentElement.lang).toBe("he");
    expect(document.documentElement.dir).toBe("rtl");
    act(() => {
      useLocaleStore.setState({ locale: "en" });
    });
    expect(document.documentElement.lang).toBe("en");
    expect(document.documentElement.dir).toBe("ltr");
  });
});
