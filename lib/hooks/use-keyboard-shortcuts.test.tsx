/**
 * Keyboard shortcuts: g+<key> nav and ? for help.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";

const pushMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

import { useKeyboardShortcuts } from "./use-keyboard-shortcuts";

function fireKey(key: string, target?: HTMLElement) {
  const ev = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  if (target) {
    Object.defineProperty(ev, "target", { value: target });
    target.dispatchEvent(ev);
  } else {
    document.dispatchEvent(ev);
  }
  return ev;
}

beforeEach(() => {
  pushMock.mockReset();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useKeyboardShortcuts", () => {
  it("g + d navigates to dashboard", () => {
    renderHook(() => useKeyboardShortcuts());
    fireKey("g");
    fireKey("d");
    expect(pushMock).toHaveBeenCalledWith("/");
  });

  it("g + u navigates to users", () => {
    renderHook(() => useKeyboardShortcuts());
    fireKey("g");
    fireKey("u");
    expect(pushMock).toHaveBeenCalledWith("/users");
  });

  it("ignores keys when target is INPUT", () => {
    renderHook(() => useKeyboardShortcuts());
    const input = document.createElement("input");
    document.body.appendChild(input);
    fireKey("g", input);
    fireKey("u", input);
    expect(pushMock).not.toHaveBeenCalled();
    input.remove();
  });

  it("g window expires after 800ms", () => {
    renderHook(() => useKeyboardShortcuts());
    fireKey("g");
    vi.advanceTimersByTime(900);
    fireKey("u");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("ignores g+key when meta or ctrl is pressed", () => {
    renderHook(() => useKeyboardShortcuts());
    const ev = new KeyboardEvent("keydown", { key: "g", ctrlKey: true });
    document.dispatchEvent(ev);
    fireKey("u");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("? dispatches show-shortcuts custom event", () => {
    renderHook(() => useKeyboardShortcuts());
    const listener = vi.fn();
    document.addEventListener("show-shortcuts", listener);
    fireKey("?");
    expect(listener).toHaveBeenCalled();
    document.removeEventListener("show-shortcuts", listener);
  });

  it("removes listener on unmount", () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts());
    unmount();
    fireKey("g");
    fireKey("u");
    expect(pushMock).not.toHaveBeenCalled();
  });
});
