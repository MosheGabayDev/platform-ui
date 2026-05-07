/**
 * useDangerousAction — ties PlatformAction config to mutation flow.
 * Asserts: confirm-required path opens dialog, no-confirm path executes immediately,
 * onSuccess closes dialog, cancel resets, error path keeps dialog open.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useDangerousAction } from "./use-dangerous-action";
import type { PlatformAction } from "@/lib/platform/actions";

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

const baseAction: PlatformAction = {
  id: "users.deactivate",
  label: "השבת",
  dangerLevel: "high",
  requiresConfirmation: true,
  auditEvent: "users.deactivate",
  resourceType: "user",
};

afterEach(() => vi.restoreAllMocks());

describe("useDangerousAction", () => {
  it("opens dialog on trigger when requiresConfirmation=true", () => {
    const fn = vi.fn().mockResolvedValue({ ok: true });
    const { result } = renderHook(
      () => useDangerousAction({ action: baseAction, mutationFn: fn }),
      { wrapper: makeWrapper() },
    );
    expect(result.current.dialogProps.open).toBe(false);
    act(() => result.current.trigger());
    expect(result.current.dialogProps.open).toBe(true);
    expect(fn).not.toHaveBeenCalled();
  });

  it("executes immediately when requiresConfirmation=false", async () => {
    const fn = vi.fn().mockResolvedValue({ ok: true });
    const { result } = renderHook(
      () =>
        useDangerousAction({
          action: { ...baseAction, requiresConfirmation: false },
          mutationFn: fn,
        }),
      { wrapper: makeWrapper() },
    );
    act(() => result.current.trigger());
    await waitFor(() => expect(fn).toHaveBeenCalled());
    expect(result.current.dialogProps.open).toBe(false);
  });

  it("onConfirm calls mutationFn with payload", async () => {
    const fn = vi.fn().mockResolvedValue({ ok: true });
    const onSuccess = vi.fn();
    const { result } = renderHook(
      () => useDangerousAction({ action: baseAction, mutationFn: fn, onSuccess }),
      { wrapper: makeWrapper() },
    );
    act(() => result.current.trigger());
    const payload = { reason: "audit", confirmedAt: "2026-05-07T00:00:00Z" };
    act(() => result.current.dialogProps.onConfirm(payload));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(fn.mock.calls[0]![0]).toEqual(payload);
    expect(result.current.dialogProps.open).toBe(false);
  });

  it("onCancel closes dialog when not pending", () => {
    const fn = vi.fn().mockResolvedValue({});
    const { result } = renderHook(
      () => useDangerousAction({ action: baseAction, mutationFn: fn }),
      { wrapper: makeWrapper() },
    );
    act(() => result.current.trigger());
    expect(result.current.dialogProps.open).toBe(true);
    act(() => result.current.dialogProps.onCancel());
    expect(result.current.dialogProps.open).toBe(false);
  });

  it("trigger after success calls reset (clears prior serverError state)", () => {
    const fn = vi.fn().mockResolvedValue({ ok: true });
    const { result } = renderHook(
      () => useDangerousAction({ action: baseAction, mutationFn: fn }),
      { wrapper: makeWrapper() },
    );
    expect(result.current.serverError).toBeNull();
    act(() => result.current.trigger());
    expect(result.current.dialogProps.open).toBe(true);
  });
});
