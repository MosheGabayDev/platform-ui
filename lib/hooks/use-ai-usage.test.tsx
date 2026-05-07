/**
 * AI usage hooks — stats with default range + events list.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const statsMock = vi.hoisted(() => vi.fn());
const eventsMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/ai-usage", () => ({
  fetchUsageStats: statsMock,
  fetchUsageEvents: eventsMock,
}));

import { useUsageStats, useUsageEvents } from "./use-ai-usage";

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  statsMock.mockReset();
  eventsMock.mockReset();
});
afterEach(() => vi.restoreAllMocks());

describe("useUsageStats", () => {
  it("defaults range to 'mtd'", async () => {
    statsMock.mockResolvedValue({ data: { totalCost: 100 } });
    const { result } = renderHook(() => useUsageStats(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(statsMock).toHaveBeenCalledWith("mtd");
    expect(result.current.stats).toEqual({ totalCost: 100 });
  });

  it("passes custom range", async () => {
    statsMock.mockResolvedValue({ data: {} });
    renderHook(() => useUsageStats("7d"), { wrapper: makeWrapper() });
    await waitFor(() => expect(statsMock).toHaveBeenCalledWith("7d"));
  });
});

describe("useUsageEvents", () => {
  it("returns events + total", async () => {
    eventsMock.mockResolvedValue({ data: { events: [{ id: 1 }], total: 1 } });
    const { result } = renderHook(() => useUsageEvents({} as never), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.events).toEqual([{ id: 1 }]);
    expect(result.current.total).toBe(1);
  });

  it("defaults to []/0 when missing", async () => {
    eventsMock.mockResolvedValue({ data: undefined });
    const { result } = renderHook(() => useUsageEvents({} as never), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.events).toEqual([]);
    expect(result.current.total).toBe(0);
  });
});
