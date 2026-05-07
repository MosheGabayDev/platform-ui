/**
 * ConnectionIndicator — connected/disconnected/reconnecting state with
 * online/offline event listeners.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, act, waitFor } from "@testing-library/react";
import { renderWithIntl as render } from "@/lib/test-utils/intl";
import { ConnectionIndicator } from "./connection-indicator";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("ConnectionIndicator", () => {
  it("renders connected dot by default (emerald)", () => {
    const { container } = render(<ConnectionIndicator />);
    expect(container.querySelector(".bg-emerald-400")).toBeTruthy();
  });

  it("flips to disconnected on offline event", async () => {
    const { container } = render(<ConnectionIndicator />);
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    // AnimatePresence mode="wait" defers the new dot until exit anim ends
    await waitFor(() =>
      expect(container.querySelector(".bg-red-400")).toBeTruthy(),
    );
  });

  it("returns to connected on online event", async () => {
    const { container } = render(<ConnectionIndicator />);
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    await waitFor(() =>
      expect(container.querySelector(".bg-red-400")).toBeTruthy(),
    );
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    await waitFor(() =>
      expect(container.querySelector(".bg-emerald-400")).toBeTruthy(),
    );
  });

  it("renders Hebrew latency label suffix when connected", () => {
    const { container } = render(<ConnectionIndicator />);
    expect(container.textContent).toMatch(/ms/);
  });

  it("renders ✕ when disconnected", async () => {
    const { container } = render(<ConnectionIndicator />);
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    await waitFor(() => expect(container.textContent).toContain("✕"));
  });
});
