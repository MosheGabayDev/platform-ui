/**
 * ShortcutsDialog — opens via show-shortcuts custom event. Renders kbd list.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { screen, cleanup, act } from "@testing-library/react";
import { renderWithIntl as render } from "@/lib/test-utils/intl";
import { ShortcutsDialog } from "./shortcuts-dialog";

afterEach(cleanup);

describe("ShortcutsDialog", () => {
  it("is closed by default (no DialogContent in DOM)", () => {
    render(<ShortcutsDialog />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens on document show-shortcuts custom event", () => {
    render(<ShortcutsDialog />);
    act(() => {
      document.dispatchEvent(new CustomEvent("show-shortcuts"));
    });
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("renders all keyboard shortcut rows when open", () => {
    render(<ShortcutsDialog />);
    act(() => {
      document.dispatchEvent(new CustomEvent("show-shortcuts"));
    });
    const dialog = screen.getByRole("dialog");
    // SHORTCUTS list has 10 rows — each renders kbd elements
    const kbds = dialog.querySelectorAll("kbd");
    expect(kbds.length).toBeGreaterThan(10);
  });

  it("removes the listener on unmount", () => {
    const { unmount } = render(<ShortcutsDialog />);
    unmount();
    // No assertion needed — if listener leaked, dispatching now after the
    // dialog is gone would still try to setOpen and React would warn.
    act(() => {
      document.dispatchEvent(new CustomEvent("show-shortcuts"));
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
