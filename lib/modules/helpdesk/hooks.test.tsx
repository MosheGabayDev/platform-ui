/**
 * Helpdesk mutation hooks — wrap usePlatformMutation with right invalidation
 * keys and toast on success.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const takeMock = vi.hoisted(() => vi.fn());
const resolveMock = vi.hoisted(() => vi.fn());
const reassignMock = vi.hoisted(() => vi.fn());
const commentMock = vi.hoisted(() => vi.fn());
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("@/lib/api/helpdesk", () => ({
  takeTicket: takeMock,
  resolveTicket: resolveMock,
  reassignTicket: reassignMock,
  commentOnTicket: commentMock,
}));
vi.mock("sonner", () => ({ toast: toastMock }));

import {
  useTakeTicket,
  useResolveTicket,
  useReassignTicket,
  useCommentOnTicket,
} from "./hooks";

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    qc,
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    ),
  };
}

beforeEach(() => {
  takeMock.mockReset();
  resolveMock.mockReset();
  reassignMock.mockReset();
  commentMock.mockReset();
  toastMock.success.mockReset();
});
afterEach(() => vi.restoreAllMocks());

describe("useTakeTicket", () => {
  it("invokes takeTicket and shows success toast", async () => {
    takeMock.mockResolvedValue({ message: "נלקח" });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useTakeTicket(7), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ ticket_id: 7 } as never);
    });
    expect(takeMock).toHaveBeenCalled();
    expect(toastMock.success).toHaveBeenCalledWith("נלקח");
  });

  it("invalidates helpdesk caches on success", async () => {
    takeMock.mockResolvedValue({ message: "ok" });
    const { qc, wrapper } = makeWrapper();
    const spy = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useTakeTicket(7), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ ticket_id: 7 } as never);
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());
    // 3 invalidations: all, stats, ticket(7)
    expect(spy.mock.calls.length).toBe(3);
  });
});

describe("useResolveTicket", () => {
  it("invokes resolveTicket and toasts message", async () => {
    resolveMock.mockResolvedValue({ message: "נפתר" });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useResolveTicket(7), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ ticket_id: 7 } as never);
    });
    expect(resolveMock).toHaveBeenCalled();
    expect(toastMock.success).toHaveBeenCalledWith("נפתר");
  });
});

describe("useReassignTicket", () => {
  it("invokes reassignTicket", async () => {
    reassignMock.mockResolvedValue({ message: "הועבר" });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useReassignTicket(7), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ ticket_id: 7, technician_id: 3 } as never);
    });
    expect(reassignMock).toHaveBeenCalled();
    expect(toastMock.success).toHaveBeenCalledWith("הועבר");
  });
});

describe("useCommentOnTicket", () => {
  it("invokes commentOnTicket", async () => {
    commentMock.mockResolvedValue({ message: "הערה נוספה" });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useCommentOnTicket(7), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ ticket_id: 7, comment: "x" } as never);
    });
    expect(commentMock).toHaveBeenCalled();
    expect(toastMock.success).toHaveBeenCalledWith("הערה נוספה");
  });
});
