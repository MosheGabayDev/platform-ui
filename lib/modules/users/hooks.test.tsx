/**
 * useUserActivity — query gated by valid userId; reads activity timeline.
 * Tests mock the API layer (lib/api/users.fetchUserActivity) so we assert
 * the hook contract independent of MOCK_MODE / network.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const fetchActivityMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/users", () => ({
  fetchUserActivity: fetchActivityMock,
}));

import { useUserActivity } from "./hooks";

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

beforeEach(() => fetchActivityMock.mockReset());
afterEach(() => vi.restoreAllMocks());

describe("useUserActivity", () => {
  it("disabled when userId is null", () => {
    renderHook(() => useUserActivity(null), { wrapper: makeWrapper() });
    expect(fetchActivityMock).not.toHaveBeenCalled();
  });

  it("disabled when userId is undefined", () => {
    renderHook(() => useUserActivity(undefined), { wrapper: makeWrapper() });
    expect(fetchActivityMock).not.toHaveBeenCalled();
  });

  it("disabled when userId is NaN", () => {
    renderHook(() => useUserActivity(NaN), { wrapper: makeWrapper() });
    expect(fetchActivityMock).not.toHaveBeenCalled();
  });

  it("fetches activity with default limit/offset and exposes events + total", async () => {
    fetchActivityMock.mockResolvedValue({
      success: true,
      data: { events: [{ id: "e1" }], total: 1 },
    });
    const { result } = renderHook(() => useUserActivity(7), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.events).toEqual([{ id: "e1" }]);
    expect(result.current.total).toBe(1);
    expect(fetchActivityMock).toHaveBeenCalledWith(7, { limit: 20, offset: 0, type: undefined });
  });

  it("forwards type filter to the API client", async () => {
    fetchActivityMock.mockResolvedValue({ data: { events: [], total: 0 } });
    renderHook(() => useUserActivity(1, { type: "login" }), { wrapper: makeWrapper() });
    await waitFor(() => expect(fetchActivityMock).toHaveBeenCalled());
    expect(fetchActivityMock.mock.calls[0]![1]!.type).toBe("login");
  });

  it("forwards custom limit + offset", async () => {
    fetchActivityMock.mockResolvedValue({ data: { events: [], total: 0 } });
    renderHook(() => useUserActivity(1, { limit: 5, offset: 10 }), { wrapper: makeWrapper() });
    await waitFor(() => expect(fetchActivityMock).toHaveBeenCalled());
    expect(fetchActivityMock.mock.calls[0]![1]).toEqual({ limit: 5, offset: 10, type: undefined });
  });

  // Error-path coverage lives in lib/api/real-fetch.test.ts (apiFetch
  // throws on non-OK status). The hook itself is a pass-through to useQuery,
  // whose error-handling semantics are exercised by use-platform-mutation
  // tests; re-asserting them here would duplicate without coverage value.

  it("defaults events/total when data missing", async () => {
    fetchActivityMock.mockResolvedValue({ data: undefined });
    const { result } = renderHook(() => useUserActivity(1), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.events).toEqual([]);
    expect(result.current.total).toBe(0);
  });
});
