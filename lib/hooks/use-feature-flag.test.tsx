/**
 * use-feature-flag tests — fail-closed gating behavior.
 *
 * Critical surface: every FeatureGate uses this. Behavior on error MUST
 * be enabled=false (fail-closed) per spec §17.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const fetchMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/feature-flags", () => ({
  fetchFeatureFlag: fetchMock,
  STATIC_FLAG_DEFAULTS: {
    "data_sources.enabled": false,
    "ai_agents.enabled": false,
    "global_assistant.enabled": false,
    "voice_agent.enabled": false,
    "integrations.enabled": false,
    "settings.capabilities.enabled": false,
    "helpdesk.enabled": false,
  },
}));

import { useFeatureFlag } from "./use-feature-flag";

function withQueryClient(node: ReactNode): ReactNode {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{node}</QueryClientProvider>;
}

beforeEach(() => fetchMock.mockReset());
afterEach(() => vi.restoreAllMocks());

describe("useFeatureFlag", () => {
  it("returns enabled=false while loading (initial render before fetch resolves)", async () => {
    // Resolve after a microtask gap so the hook's initial render snapshot
    // captures the loading state before useQuery transitions to settled.
    fetchMock.mockImplementation(
      () =>
        new Promise((r) =>
          setTimeout(
            () => r({ key: "helpdesk.enabled", enabled: true, source: "org" }),
            50,
          ),
        ),
    );
    const { result } = renderHook(() => useFeatureFlag("helpdesk.enabled"), {
      wrapper: ({ children }) => withQueryClient(children) as never,
    });
    // Initial synchronous render is fail-closed
    expect(result.current.enabled).toBe(false);
    expect(result.current.source).toBe("default");
    // Wait so the dangling promise is allowed to settle before teardown.
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("returns enabled=true when backend says so (source=api)", async () => {
    fetchMock.mockResolvedValueOnce({
      key: "helpdesk.enabled",
      enabled: true,
      source: "org",
    });
    const { result } = renderHook(() => useFeatureFlag("helpdesk.enabled"), {
      wrapper: ({ children }) => withQueryClient(children) as never,
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.enabled).toBe(true);
    expect(result.current.source).toBe("api");
    expect(result.current.isError).toBe(false);
  });

  it("falls back to STATIC_FLAG_DEFAULTS on backend error (fail-closed)", async () => {
    fetchMock.mockRejectedValueOnce(new Error("backend down"));
    const { result } = renderHook(() => useFeatureFlag("helpdesk.enabled"), {
      wrapper: ({ children }) => withQueryClient(children) as never,
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.enabled).toBe(false);
    expect(result.current.isError).toBe(true);
    expect(result.current.source).toBe("default");
  });

  it("coerces non-boolean truthy values to false (contract drift guard)", async () => {
    fetchMock.mockResolvedValueOnce({
      key: "helpdesk.enabled",
      // drift simulation — backend ships wrong type
      enabled:"true",
      source: "org",
    });
    const { result } = renderHook(() => useFeatureFlag("helpdesk.enabled"), {
      wrapper: ({ children }) => withQueryClient(children) as never,
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.enabled).toBe(false);
  });

  it("treats `enabled: 1` as disabled (strict === true comparison)", async () => {
    fetchMock.mockResolvedValueOnce({
      key: "helpdesk.enabled",
      // drift simulation — backend ships wrong type
      enabled:1,
      source: "org",
    });
    const { result } = renderHook(() => useFeatureFlag("helpdesk.enabled"), {
      wrapper: ({ children }) => withQueryClient(children) as never,
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.enabled).toBe(false);
  });
});
