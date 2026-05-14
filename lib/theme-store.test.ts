/**
 * theme-store smoke tests (batch 157).
 *
 * Coverage was 37.5% — only the initial state was exercised. The
 * `setAccent` action writes 3 CSS custom properties on
 * `document.documentElement`, and a regression there silently breaks
 * the accent-picker UX. Lock the behaviour.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useThemeStore, ACCENT_COLORS } from "./theme-store";

beforeEach(() => {
  useThemeStore.setState({ accent: "indigo" });
  document.documentElement.style.removeProperty("--primary");
  document.documentElement.style.removeProperty("--ring");
  document.documentElement.style.removeProperty("--sidebar-primary");
});

describe("useThemeStore", () => {
  it("defaults to indigo", () => {
    expect(useThemeStore.getState().accent).toBe("indigo");
  });

  it("setAccent updates store state", () => {
    useThemeStore.getState().setAccent("emerald");
    expect(useThemeStore.getState().accent).toBe("emerald");
  });

  it("setAccent writes the three CSS custom properties on documentElement", () => {
    useThemeStore.getState().setAccent("violet");
    const styles = document.documentElement.style;
    const violetOklch = ACCENT_COLORS.violet.oklch;
    expect(styles.getPropertyValue("--primary")).toBe(violetOklch);
    expect(styles.getPropertyValue("--ring")).toBe(violetOklch);
    expect(styles.getPropertyValue("--sidebar-primary")).toBe(violetOklch);
  });

  it("ACCENT_COLORS exposes 6 known accents with label/oklch/hex", () => {
    const keys = Object.keys(ACCENT_COLORS);
    expect(keys.length).toBe(6);
    for (const k of keys) {
      const c = ACCENT_COLORS[k as keyof typeof ACCENT_COLORS];
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.oklch).toMatch(/^oklch\(/);
      expect(c.hex).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
