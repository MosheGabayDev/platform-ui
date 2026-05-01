import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, cleanup } from "@testing-library/react";
import { useRegisterPageContext } from "./use-register-page-context";
import { useAssistantSession, type PageContext } from "./use-assistant-session";

const sampleContext: PageContext = {
  pageKey: "users.list",
  route: "/users",
  entityType: "user",
  summary: "Users list",
  availableActions: ["users.create"],
};

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

beforeEach(() => {
  resetStore();
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useRegisterPageContext (Story 1.2)", () => {
  it("registers context after 300ms debounce (AC #2, #3)", () => {
    renderHook(() => useRegisterPageContext(sampleContext));

    // Before debounce: nothing in store yet
    expect(useAssistantSession.getState().currentPageContext).toBeNull();

    vi.advanceTimersByTime(300);

    // After debounce: context registered
    expect(useAssistantSession.getState().currentPageContext).toEqual(sampleContext);
  });

  it("re-emits when context changes (AC #3)", () => {
    const { rerender } = renderHook(
      ({ ctx }: { ctx: PageContext }) => useRegisterPageContext(ctx),
      { initialProps: { ctx: sampleContext } }
    );

    vi.advanceTimersByTime(300);
    expect(useAssistantSession.getState().currentPageContext?.pageKey).toBe("users.list");

    const next: PageContext = {
      ...sampleContext,
      pageKey: "orgs.list",
      route: "/organizations",
      summary: "Orgs list",
    };
    rerender({ ctx: next });
    vi.advanceTimersByTime(300);

    expect(useAssistantSession.getState().currentPageContext?.pageKey).toBe("orgs.list");
  });

  it("debounce coalesces rapid re-renders (only last context wins)", () => {
    const { rerender } = renderHook(
      ({ ctx }: { ctx: PageContext }) => useRegisterPageContext(ctx),
      { initialProps: { ctx: sampleContext } }
    );

    // Three rapid changes within the debounce window
    rerender({ ctx: { ...sampleContext, summary: "v1" } });
    vi.advanceTimersByTime(100);
    rerender({ ctx: { ...sampleContext, summary: "v2" } });
    vi.advanceTimersByTime(100);
    rerender({ ctx: { ...sampleContext, summary: "v3" } });

    // Still nothing in store — debounce hasn't fired
    expect(useAssistantSession.getState().currentPageContext).toBeNull();

    vi.advanceTimersByTime(300);

    expect(useAssistantSession.getState().currentPageContext?.summary).toBe("v3");
  });

  it("clears context on unmount (AC #4)", () => {
    const { unmount } = renderHook(() => useRegisterPageContext(sampleContext));
    vi.advanceTimersByTime(300);
    expect(useAssistantSession.getState().currentPageContext).not.toBeNull();

    unmount();
    expect(useAssistantSession.getState().currentPageContext).toBeNull();
  });

  it("cancels pending debounced registration on unmount", () => {
    const { unmount } = renderHook(() => useRegisterPageContext(sampleContext));
    // Unmount BEFORE the debounce fires
    unmount();
    vi.advanceTimersByTime(300);
    // Context never landed in store
    expect(useAssistantSession.getState().currentPageContext).toBeNull();
  });

  it("passes dataSamples through unchanged (AC #5)", () => {
    const ctx: PageContext = {
      ...sampleContext,
      dataSamples: { firstUserId: 42, totalCount: 100 },
    };
    renderHook(() => useRegisterPageContext(ctx));
    vi.advanceTimersByTime(300);
    expect(useAssistantSession.getState().currentPageContext?.dataSamples).toEqual({
      firstUserId: 42,
      totalCount: 100,
    });
  });

  it("preserves voiceEligible flag (AC #1)", () => {
    const ctx: PageContext = { ...sampleContext, voiceEligible: true };
    renderHook(() => useRegisterPageContext(ctx));
    vi.advanceTimersByTime(300);
    expect(useAssistantSession.getState().currentPageContext?.voiceEligible).toBe(true);
  });
});
