/**
 * use-platform-mutation tests — wrapper used by every module mutation.
 *
 * Asserts: success invalidation, error normalization, reset, mutateAsync
 * propagation. The hook is small but mission-critical (every mutation in
 * the app flows through it), so coverage matters.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import type { ReactNode } from "react";
import { usePlatformMutation } from "./use-platform-mutation";

afterEach(() => vi.restoreAllMocks());

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, wrapper };
}

describe("usePlatformMutation", () => {
  it("calls mutationFn and propagates the resolved value via mutateAsync", async () => {
    const fn = vi.fn(async (vars: { x: number }) => ({ doubled: vars.x * 2 }));
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => usePlatformMutation({ mutationFn: fn }),
      { wrapper },
    );
    let value: unknown;
    await act(async () => {
      value = await result.current.mutateAsync({ x: 21 });
    });
    expect(value).toEqual({ doubled: 42 });
    // tanstack-query v5 calls the mutationFn with (variables, context) — assert
    // only on the first arg.
    expect(fn).toHaveBeenCalled();
    expect(fn.mock.calls[0]![0]).toEqual({ x: 21 });
  });

  it("invalidates the provided query keys on success", async () => {
    const fn = vi.fn(async () => ({ ok: true }));
    const { qc, wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
    const keys = [["a"], ["b", { id: 1 }]] as const;
    const { result } = renderHook(
      () =>
        usePlatformMutation({
          mutationFn: fn,
          invalidateKeys: keys as never,
        }),
      { wrapper },
    );
    await act(async () => {
      await result.current.mutateAsync(undefined as never);
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["a"] });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["b", { id: 1 }],
    });
  });

  it("does not invalidate when invalidateKeys is empty/missing", async () => {
    const fn = vi.fn(async () => ({ ok: true }));
    const { qc, wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(
      () => usePlatformMutation({ mutationFn: fn }),
      { wrapper },
    );
    await act(async () => {
      await result.current.mutateAsync(undefined as never);
    });
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("calls onSuccess with (data, variables) after invalidation", async () => {
    const onSuccess = vi.fn();
    const fn = vi.fn(async (v: { id: number }) => ({ id: v.id, ok: true }));
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => usePlatformMutation({ mutationFn: fn, onSuccess }),
      { wrapper },
    );
    await act(async () => {
      await result.current.mutateAsync({ id: 5 });
    });
    expect(onSuccess).toHaveBeenCalledWith({ id: 5, ok: true }, { id: 5 });
  });

  it("normalizes Error instances to their message", async () => {
    const fn = vi.fn(async () => {
      throw new Error("boom");
    });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => usePlatformMutation({ mutationFn: fn }),
      { wrapper },
    );
    await act(async () => {
      await result.current.mutateAsync(undefined as never).catch(() => {});
    });
    await waitFor(() => expect(result.current.serverError).toBe("boom"));
  });

  it("calls onError with the thrown error", async () => {
    const onError = vi.fn();
    const err = new Error("network");
    const fn = vi.fn(async () => {
      throw err;
    });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => usePlatformMutation({ mutationFn: fn, onError }),
      { wrapper },
    );
    await act(async () => {
      await result.current.mutateAsync(undefined as never).catch(() => {});
    });
    expect(onError).toHaveBeenCalledWith(err);
  });

  it("reset clears serverError", async () => {
    const fn = vi.fn(async () => {
      throw new Error("boom");
    });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => usePlatformMutation({ mutationFn: fn }),
      { wrapper },
    );
    await act(async () => {
      await result.current.mutateAsync(undefined as never).catch(() => {});
    });
    await waitFor(() => expect(result.current.serverError).toBe("boom"));
    act(() => {
      result.current.reset();
    });
    await waitFor(() => expect(result.current.serverError).toBeNull());
  });

  it("clears serverError after a subsequent successful mutation", async () => {
    let calls = 0;
    const fn = vi.fn(async () => {
      calls += 1;
      if (calls === 1) throw new Error("first try fails");
      return { ok: true };
    });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => usePlatformMutation({ mutationFn: fn }),
      { wrapper },
    );
    await act(async () => {
      await result.current.mutateAsync(undefined as never).catch(() => {});
    });
    await waitFor(() =>
      expect(result.current.serverError).toBe("first try fails"),
    );
    await act(async () => {
      await result.current.mutateAsync(undefined as never);
    });
    await waitFor(() => expect(result.current.serverError).toBeNull());
  });
});
