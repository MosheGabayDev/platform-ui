/**
 * Tests for useNavGroups (Track E follow-up). Locale-aware nav.
 */
import { describe, it, expect, afterEach } from "vitest";
import { renderHook, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { Locale } from "@/i18n/config";
import heMessages from "@/i18n/messages/he.json";
import enMessages from "@/i18n/messages/en.json";
import { useNavGroups } from "./use-nav-groups";

afterEach(cleanup);

function wrapperFor(locale: Locale) {
  const messages = (locale === "en" ? enMessages : heMessages) as Record<string, unknown>;
  return ({ children }: { children: React.ReactNode }) => (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

describe("useNavGroups", () => {
  it("returns translated group labels in Hebrew (default)", () => {
    const { result } = renderHook(() => useNavGroups(), {
      wrapper: wrapperFor("he"),
    });
    const labels = result.current.map((g) => g.label);
    expect(labels).toContain("ראשי");
    expect(labels).toContain("הלפדסק");
  });

  it("returns translated group labels in English", () => {
    const { result } = renderHook(() => useNavGroups(), {
      wrapper: wrapperFor("en"),
    });
    const labels = result.current.map((g) => g.label);
    expect(labels).toContain("Main");
    expect(labels).toContain("Helpdesk");
  });

  it("translates item titles too", () => {
    const { result } = renderHook(() => useNavGroups(), {
      wrapper: wrapperFor("en"),
    });
    const allTitles = result.current.flatMap((g) => g.items.map((i) => i.title));
    expect(allTitles).toContain("Dashboard");
    expect(allTitles).toContain("Tickets");
  });

  it("preserves nested children translation", () => {
    const { result } = renderHook(() => useNavGroups(), {
      wrapper: wrapperFor("en"),
    });
    const settingsGroup = result.current.find((g) => g.label === "Settings");
    expect(settingsGroup).toBeDefined();
    const settingsItem = settingsGroup!.items.find(
      (i) => i.href === "/settings",
    );
    expect(settingsItem?.children).toBeDefined();
    const childTitles = settingsItem!.children!.map((c) => c.title);
    expect(childTitles).toContain("AI");
    expect(childTitles).toContain("General");
  });

  it("preserves href, icon, and labelKey on the resolved structure", () => {
    const { result } = renderHook(() => useNavGroups(), {
      wrapper: wrapperFor("he"),
    });
    const main = result.current.find((g) => g.labelKey === "nav.groups.main")!;
    const dash = main.items.find((i) => i.href === "/")!;
    expect(dash.titleKey).toBe("nav.items.dashboard");
    // lucide-react icons are forwardRef objects in some versions, plain
    // functions in others — accept either as long as it's defined.
    expect(dash.icon).toBeTruthy();
  });
});
