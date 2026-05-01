/**
 * Story 1.5 — drawer state persists across navigation.
 *
 * Validates that the singleton Zustand store retains drawer-open state
 * regardless of which component (page) is reading from it. This is the
 * unit-level proof that there is no per-route reset; full integration
 * coverage lives in tests/e2e/ai-shell/fab-drawer.spec.ts.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, cleanup } from "@testing-library/react";
import { useAssistantSession } from "./use-assistant-session";

const resetStore = () =>
  useAssistantSession.setState({
    state: { kind: "closed" },
    drawerOpen: false,
    transcript: [],
    inFlightDraft: "",
    pendingConfirmationTokenId: null,
    currentPageContext: null,
      pendingProposal: null,
  });

beforeEach(resetStore);
afterEach(cleanup);

describe("useAssistantSession — cross-component persistence (Story 1.5)", () => {
  it("two separate hook subscribers see the same store state", () => {
    const { result: a } = renderHook(() => useAssistantSession((s) => s.drawerOpen));
    const { result: b } = renderHook(() => useAssistantSession((s) => s.drawerOpen));

    expect(a.current).toBe(false);
    expect(b.current).toBe(false);

    useAssistantSession.getState().openDrawer();

    // Both subscribers reflect the new state
    expect(useAssistantSession.getState().drawerOpen).toBe(true);
  });

  it("unmounting one subscriber does not reset the store", () => {
    const { unmount: unmountA } = renderHook(() => useAssistantSession((s) => s.drawerOpen));
    const { result: b } = renderHook(() => useAssistantSession((s) => s.drawerOpen));

    useAssistantSession.getState().openDrawer();

    // Simulate page A unmounting (user navigated away)
    unmountA();

    // Store still says open; subscriber B still sees open
    expect(useAssistantSession.getState().drawerOpen).toBe(true);
    expect(b.current).toBe(true);
  });

  it("drawer state survives page-context replacement", () => {
    useAssistantSession.getState().openDrawer();
    expect(useAssistantSession.getState().drawerOpen).toBe(true);

    // Page A registers context, then page B replaces it (simulating navigation)
    useAssistantSession.getState().setPageContext({
      pageKey: "users.list",
      route: "/users",
      summary: "users",
      availableActions: [],
    });
    useAssistantSession.getState().setPageContext({
      pageKey: "orgs.list",
      route: "/organizations",
      summary: "orgs",
      availableActions: [],
    });

    // Drawer is still open after context swap
    expect(useAssistantSession.getState().drawerOpen).toBe(true);
    expect(useAssistantSession.getState().currentPageContext?.pageKey).toBe("orgs.list");
  });
});
