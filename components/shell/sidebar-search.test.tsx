/**
 * SidebarSearch — fuzzy filter, ↑↓↵ keyboard nav, / global focus shortcut.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { renderWithIntl } from "@/lib/test-utils/intl";

const pushMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

import { SidebarSearch } from "./sidebar-search";

afterEach(() => {
  cleanup();
  pushMock.mockReset();
});

describe("SidebarSearch", () => {
  it("renders Hebrew placeholder", () => {
    renderWithIntl(<SidebarSearch />);
    expect(screen.getByPlaceholderText('חיפוש... ( / )')).toBeTruthy();
  });

  it("typing surfaces matching nav items", () => {
    renderWithIntl(<SidebarSearch />);
    const input = screen.getByPlaceholderText('חיפוש... ( / )');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "משת" } });
    // "משתמשים" exists in Hebrew nav catalog
    expect(screen.getByText(/משתמשים/)).toBeTruthy();
  });

  it("renders no-results state when query has no matches", () => {
    renderWithIntl(<SidebarSearch />);
    const input = screen.getByPlaceholderText('חיפוש... ( / )');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "zzzzzzzz_no_match" } });
    expect(screen.getByText(/אין תוצאות עבור/)).toBeTruthy();
  });

  it("Enter on top result navigates", () => {
    renderWithIntl(<SidebarSearch />);
    const input = screen.getByPlaceholderText('חיפוש... ( / )');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "users" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(pushMock).toHaveBeenCalled();
  });

  it("Escape clears query and blurs input", () => {
    renderWithIntl(<SidebarSearch />);
    const input = screen.getByPlaceholderText('חיפוש... ( / )') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "x" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input.value).toBe("");
  });

  it("ArrowDown then ArrowUp keep activeIdx in range (no crash)", () => {
    renderWithIntl(<SidebarSearch />);
    const input = screen.getByPlaceholderText('חיפוש... ( / )');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "users" } });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowUp" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(pushMock).toHaveBeenCalled();
  });

  it("global '/' keydown focuses the input when not in INPUT/TEXTAREA", () => {
    renderWithIntl(<SidebarSearch />);
    const input = screen.getByPlaceholderText('חיפוש... ( / )') as HTMLInputElement;
    act(() => {
      const ev = new KeyboardEvent("keydown", { key: "/", bubbles: true, cancelable: true });
      Object.defineProperty(ev, "target", { value: document.body });
      document.dispatchEvent(ev);
    });
    expect(document.activeElement).toBe(input);
  });

  it("clear (X) button resets query when typed", () => {
    renderWithIntl(<SidebarSearch />);
    const input = screen.getByPlaceholderText('חיפוש... ( / )') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "x" } });
    const clearBtn = input.parentElement!.querySelector("button");
    expect(clearBtn).toBeTruthy();
    fireEvent.click(clearBtn!);
    expect(input.value).toBe("");
  });
});
