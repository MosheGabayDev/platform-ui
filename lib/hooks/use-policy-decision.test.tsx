/**
 * usePolicyDecision smoke tests (cap 27).
 */
import { describe, it, expect, afterEach } from "vitest";
import { renderHook, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { usePolicyDecision } from "./use-policy-decision";

afterEach(cleanup);

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("usePolicyDecision", () => {
  it("evaluates a low-risk action and returns allowed", async () => {
    const { result } = renderHook(
      () =>
        usePolicyDecision({
          action_id: "knowledge.article.view",
          params: {},
        }),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.decision).toBeTruthy());
    expect(result.current.decision!.allowed).toBe(true);
    expect(result.current.decision!.requires_approval).toBe(false);
  });

  it("evaluates a high-blast-radius batch and flags requires_approval", async () => {
    const { result } = renderHook(
      () =>
        usePolicyDecision({
          action_id: "helpdesk.batch.bulk_status",
          params: { affected_count: 200 },
        }),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.decision).toBeTruthy());
    expect(result.current.decision!.requires_approval).toBe(true);
  });

  it("does not evaluate when input is null", () => {
    const { result } = renderHook(() => usePolicyDecision(null), {
      wrapper: makeWrapper(),
    });
    expect(result.current.decision).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it("respects enabled=false to skip evaluation", () => {
    const { result } = renderHook(
      () =>
        usePolicyDecision(
          { action_id: "anything" },
          { enabled: false },
        ),
      { wrapper: makeWrapper() },
    );
    expect(result.current.decision).toBeUndefined();
  });
});
