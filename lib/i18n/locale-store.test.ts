/**
 * Tests for the locale store + IntlProvider integration (Track E).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useLocaleStore } from "@/lib/i18n/locale-store";
import { DEFAULT_LOCALE, isLocale, isRtl, LOCALES } from "@/i18n/config";

beforeEach(() => {
  window.localStorage.clear();
  useLocaleStore.setState({ locale: DEFAULT_LOCALE });
});

describe("locale config", () => {
  it("default locale is one of the registered locales", () => {
    expect(LOCALES).toContain(DEFAULT_LOCALE);
  });

  it("isRtl is true for he, false for en", () => {
    expect(isRtl("he")).toBe(true);
    expect(isRtl("en")).toBe(false);
  });

  it("isLocale rejects unknown values", () => {
    expect(isLocale("he")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale("")).toBe(false);
    expect(isLocale(null)).toBe(false);
    expect(isLocale(123)).toBe(false);
  });
});

describe("useLocaleStore", () => {
  it("initial state is the default locale", () => {
    expect(useLocaleStore.getState().locale).toBe(DEFAULT_LOCALE);
  });

  it("setLocale updates the active locale", () => {
    useLocaleStore.getState().setLocale("en");
    expect(useLocaleStore.getState().locale).toBe("en");
    useLocaleStore.getState().setLocale("he");
    expect(useLocaleStore.getState().locale).toBe("he");
  });

  it("setLocale rejects unknown values silently (no state change)", () => {
    const before = useLocaleStore.getState().locale;
    // @ts-expect-error — testing the runtime guard
    useLocaleStore.getState().setLocale("xx");
    expect(useLocaleStore.getState().locale).toBe(before);
  });
});
