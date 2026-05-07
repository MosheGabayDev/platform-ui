/**
 * AI provider config hooks — wraps lib/api/ai-providers calls.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const catalogMock = vi.hoisted(() => vi.fn());
const configsMock = vi.hoisted(() => vi.fn());
const configMock = vi.hoisted(() => vi.fn());
const resolveMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/ai-providers", () => ({
  fetchProviderCatalog: catalogMock,
  fetchProviderConfigs: configsMock,
  fetchProviderConfig: configMock,
  resolveRouting: resolveMock,
}));

import {
  useProviderCatalog,
  useProviderConfigs,
  useProviderConfig,
  useRoutingDecision,
} from "./use-ai-provider-configs";

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { wrapper };
}

beforeEach(() => {
  catalogMock.mockReset();
  configsMock.mockReset();
  configMock.mockReset();
  resolveMock.mockReset();
});
afterEach(() => vi.restoreAllMocks());

describe("useProviderCatalog", () => {
  it("returns providers list", async () => {
    catalogMock.mockResolvedValue({ data: { providers: [{ id: "openai" }] } });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useProviderCatalog(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.providers).toEqual([{ id: "openai" }]);
  });

  it("defaults to [] when missing", async () => {
    catalogMock.mockResolvedValue({ data: undefined });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useProviderCatalog(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.providers).toEqual([]);
  });

  it("isError on rejection", async () => {
    catalogMock.mockRejectedValue(new Error("x"));
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useProviderCatalog(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useProviderConfigs", () => {
  it("returns configs list", async () => {
    configsMock.mockResolvedValue({ data: { configs: [{ id: 1 }] } });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useProviderConfigs(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.configs).toEqual([{ id: 1 }]);
  });
  it("defaults to [] when missing", async () => {
    configsMock.mockResolvedValue({ data: {} });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useProviderConfigs(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.configs).toEqual([]);
  });
});

describe("useProviderConfig", () => {
  it("disabled when providerId is null", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useProviderConfig(null), { wrapper });
    expect(result.current.config).toBeUndefined();
    expect(configMock).not.toHaveBeenCalled();
  });
  it("fetches when providerId is set", async () => {
    configMock.mockResolvedValue({ data: { config: { id: "openai" } } });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useProviderConfig("openai"), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(configMock).toHaveBeenCalledWith("openai");
    expect(result.current.config).toEqual({ id: "openai" });
  });
});

describe("useRoutingDecision", () => {
  it("disabled when input is null", () => {
    const { wrapper } = makeWrapper();
    renderHook(() => useRoutingDecision(null), { wrapper });
    expect(resolveMock).not.toHaveBeenCalled();
  });
  it("fetches with input", async () => {
    resolveMock.mockResolvedValue({ data: { provider: "openai" } });
    const { wrapper } = makeWrapper();
    const input = { purpose: "chat" } as never;
    const { result } = renderHook(() => useRoutingDecision(input), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.decision).toEqual({ provider: "openai" });
  });
});
