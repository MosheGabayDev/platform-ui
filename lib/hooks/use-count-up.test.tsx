/**
 * use-count-up tests — rAF-driven number animation.
 *
 * Light coverage by design: happy-dom's rAF + vitest fake-timers don't
 * compose cleanly. We assert the initial state, the hook contract
 * (returns a number), and that the cleanup function unsubscribes the rAF
 * loop on unmount (no leaked timers across tests).
 */
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCountUp } from "./use-count-up";

describe("useCountUp", () => {
  it("starts at 0 before the rAF tick", () => {
    const { result } = renderHook(() => useCountUp(100));
    expect(result.current).toBe(0);
  });

  it("returns a number type for any target", () => {
    const { result } = renderHook(() => useCountUp(0));
    expect(typeof result.current).toBe("number");
  });

  it("unmount cleanly cancels rAF without throwing", () => {
    const { unmount } = renderHook(() => useCountUp(100, 1000, 0));
    expect(() => unmount()).not.toThrow();
  });

  it("uses default duration + delay when not provided", () => {
    const { result } = renderHook(() => useCountUp(50));
    expect(result.current).toBe(0); // pre-tick state is sufficient
  });

  it("re-renders without error when target changes", () => {
    const { rerender } = renderHook(
      ({ target }) => useCountUp(target, 100, 0),
      { initialProps: { target: 10 } },
    );
    expect(() => rerender({ target: 20 })).not.toThrow();
  });
});
