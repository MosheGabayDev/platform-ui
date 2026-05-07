/**
 * Zustand store + tracker hook for sidebar recents/pins.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

const pathnameMock = vi.hoisted(() => vi.fn(() => "/users"));
vi.mock("next/navigation", () => ({
  usePathname: pathnameMock,
}));

import { useNavHistory, useTrackNavHistory } from "./use-nav-history";

beforeEach(() => {
  localStorage.clear();
  useNavHistory.setState({ recent: [], pinned: [] });
});
afterEach(() => vi.restoreAllMocks());

describe("useNavHistory store", () => {
  it("addRecent prepends and dedupes", () => {
    const { addRecent } = useNavHistory.getState();
    addRecent("/users");
    addRecent("/tickets");
    addRecent("/users");
    expect(useNavHistory.getState().recent).toEqual(["/users", "/tickets"]);
  });

  it("addRecent caps at 5", () => {
    const { addRecent } = useNavHistory.getState();
    for (const h of ["/a", "/b", "/c", "/d", "/e", "/f"]) addRecent(h);
    expect(useNavHistory.getState().recent.length).toBe(5);
    expect(useNavHistory.getState().recent[0]).toBe("/f");
  });

  it("togglePin adds and removes", () => {
    const { togglePin, isPinned } = useNavHistory.getState();
    togglePin("/users");
    expect(useNavHistory.getState().pinned).toContain("/users");
    expect(isPinned("/users")).toBe(true);
    togglePin("/users");
    expect(useNavHistory.getState().pinned).not.toContain("/users");
    expect(useNavHistory.getState().isPinned("/users")).toBe(false);
  });

  it("togglePin caps at 5", () => {
    const { togglePin } = useNavHistory.getState();
    for (const h of ["/a", "/b", "/c", "/d", "/e", "/f"]) togglePin(h);
    expect(useNavHistory.getState().pinned.length).toBe(5);
  });
});

describe("useTrackNavHistory", () => {
  it("adds known nav route to recent", () => {
    pathnameMock.mockReturnValue("/users");
    renderHook(() => useTrackNavHistory());
    expect(useNavHistory.getState().recent).toContain("/users");
  });

  it("does not add unknown routes", () => {
    pathnameMock.mockReturnValue("/totally-unknown-xyz");
    renderHook(() => useTrackNavHistory());
    expect(useNavHistory.getState().recent).not.toContain("/totally-unknown-xyz");
  });
});
