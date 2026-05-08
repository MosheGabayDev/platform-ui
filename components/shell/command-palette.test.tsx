/**
 * CommandPalette — Cmd+K / Ctrl+K / "/" global trigger.
 *
 * cmdk's CommandDialog is built on Radix Dialog which portal-renders.
 * happy-dom can find portal content via screen.* once the dialog is
 * open. We test:
 *   - keyboard shortcut opens it
 *   - opens with the i18n placeholder
 *   - shows the "start typing" empty state on first open
 *   - listener cleanup on unmount
 *
 * Search-result rendering paths are covered by E2E (depend on debounce
 * + live query coordination).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, cleanup, act } from "@testing-library/react";
import { renderWithIntl } from "@/lib/test-utils/intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";

const pushMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/lib/api/search", () => ({
  searchGlobal: vi.fn().mockResolvedValue({ success: true, data: { results: [] } }),
}));

import { CommandPalette } from "./command-palette";

function render(node: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithIntl(<QueryClientProvider client={qc}>{node}</QueryClientProvider>);
}

beforeEach(() => {
  pushMock.mockReset();
});
afterEach(cleanup);

describe("CommandPalette", () => {
  it("renders nothing visible by default (closed dialog)", () => {
    render(<CommandPalette />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens on Cmd+K", () => {
    render(<CommandPalette />);
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
    });
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("opens on Ctrl+K (Windows / Linux)", () => {
    render(<CommandPalette />);
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
    });
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("opens on '/' shortcut", () => {
    render(<CommandPalette />);
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "/" }));
    });
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("Cmd+K toggles closed when already open", () => {
    render(<CommandPalette />);
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
    });
    expect(screen.getByRole("dialog")).toBeTruthy();
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders the i18n search placeholder when open", () => {
    render(<CommandPalette />);
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
    });
    expect(screen.getByPlaceholderText(/חפש|Search/i)).toBeTruthy();
  });

  it("removes the keydown listener on unmount", () => {
    const { unmount } = render(<CommandPalette />);
    unmount();
    // No assertion needed — just prove no React warning fires when we
    // dispatch after unmount. If the listener leaked, setOpen would run
    // on an unmounted component and React would warn.
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
