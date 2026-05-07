/**
 * AccentPicker — applies CSS variables on accent change.
 * Note: Radix Popover content is portal-rendered; in happy-dom we test the
 * trigger render contract + the side-effect of useEffect on mount.
 */
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { AccentPicker } from "./accent-picker";
import { useThemeStore, ACCENT_COLORS } from "@/lib/theme-store";

beforeEach(() => {
  useThemeStore.setState({ accent: "indigo" });
  document.documentElement.style.removeProperty("--primary");
});
afterEach(cleanup);

describe("AccentPicker", () => {
  it("renders the palette trigger button", () => {
    const { container } = render(<AccentPicker />);
    expect(container.querySelector("button")).toBeTruthy();
  });

  it("applies current accent CSS variables on mount", () => {
    render(<AccentPicker />);
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe(
      ACCENT_COLORS.indigo.oklch,
    );
    expect(document.documentElement.style.getPropertyValue("--ring")).toBe(
      ACCENT_COLORS.indigo.oklch,
    );
  });

  it("re-applies CSS variables when accent changes in store", () => {
    const { rerender } = render(<AccentPicker />);
    useThemeStore.setState({ accent: "rose" });
    rerender(<AccentPicker />);
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe(
      ACCENT_COLORS.rose.oklch,
    );
  });
});
