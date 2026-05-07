/**
 * Notifications hook — list query + markRead/markAllRead mutations.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const fetchMock = vi.hoisted(() => vi.fn());
const markMock = vi.hoisted(() => vi.fn());
const markAllMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/notifications", () => ({
  fetchNotifications: fetchMock,
  markNotificationRead: markMock,
  markAllNotificationsRead: markAllMock,
}));

import { useNotifications } from "./use-notifications";

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, wrapper };
}

beforeEach(() => {
  fetchMock.mockReset();
  markMock.mockReset();
  markAllMock.mockReset();
});
afterEach(() => vi.restoreAllMocks());

describe("useNotifications", () => {
  it("returns notifications + unread count from data", async () => {
    fetchMock.mockResolvedValue({
      data: { notifications: [{ id: "1", title: "x" }], unread_count: 3 },
    });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.unreadCount).toBe(3);
  });

  it("returns empty defaults when data missing", async () => {
    fetchMock.mockResolvedValue({ data: { notifications: undefined, unread_count: undefined } });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
  });

  it("markRead invokes mutation with id", async () => {
    fetchMock.mockResolvedValue({ data: { notifications: [], unread_count: 0 } });
    markMock.mockResolvedValue(undefined);
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.markRead("note-1"));
    await waitFor(() => expect(markMock).toHaveBeenCalled());
    expect(markMock.mock.calls[0]![0]).toBe("note-1");
  });

  it("markAllRead invokes batch mutation", async () => {
    fetchMock.mockResolvedValue({ data: { notifications: [], unread_count: 0 } });
    markAllMock.mockResolvedValue(undefined);
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.markAllRead());
    await waitFor(() => expect(markAllMock).toHaveBeenCalled());
  });

  it("isError true when query rejects", async () => {
    fetchMock.mockRejectedValue(new Error("boom"));
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
