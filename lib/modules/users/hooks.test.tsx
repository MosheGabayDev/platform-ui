/**
 * useUserActivity — query gated by valid userId; reads activity timeline.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const fetchMock = vi.hoisted(() => vi.fn());
vi.stubGlobal("fetch", fetchMock);

import { useUserActivity } from "./hooks";

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

beforeEach(() => fetchMock.mockReset());
afterEach(() => vi.restoreAllMocks());

describe("useUserActivity", () => {
  it("disabled when userId is null", () => {
    renderHook(() => useUserActivity(null), { wrapper: makeWrapper() });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("disabled when userId is undefined", () => {
    renderHook(() => useUserActivity(undefined), { wrapper: makeWrapper() });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("disabled when userId is NaN", () => {
    renderHook(() => useUserActivity(NaN), { wrapper: makeWrapper() });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches activity with default limit/offset and exposes events + total", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { events: [{ id: "e1" }], total: 1 } }),
    });
    const { result } = renderHook(() => useUserActivity(7), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.events).toEqual([{ id: "e1" }]);
    expect(result.current.total).toBe(1);
    expect(fetchMock.mock.calls[0]![0]).toContain("/api/proxy/users/7/activity");
    expect(fetchMock.mock.calls[0]![0]).toContain("limit=20");
  });

  it("includes type filter in query string when provided", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { events: [], total: 0 } }),
    });
    renderHook(() => useUserActivity(1, { type: "login" }), { wrapper: makeWrapper() });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0]![0]).toContain("type=login");
  });

  it("propagates network error", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    const { result } = renderHook(() => useUserActivity(1), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.error).toBeTruthy());
  });

  it("defaults events/total when data missing", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ data: undefined }) });
    const { result } = renderHook(() => useUserActivity(1), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.events).toEqual([]);
    expect(result.current.total).toBe(0);
  });
});
