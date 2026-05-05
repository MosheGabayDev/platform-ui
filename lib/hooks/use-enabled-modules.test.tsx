/**
 * useEnabledModules smoke tests (cap 18).
 */
import { describe, it, expect, afterEach } from "vitest";
import { renderHook, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useEnabledModules, useModuleStatus } from "./use-enabled-modules";

afterEach(cleanup);

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useEnabledModules / useModuleStatus", () => {
  it("returns enabled modules + isEnabled lookup", async () => {
    const { result } = renderHook(() => useEnabledModules(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.all.length).toBeGreaterThan(0));
    expect(result.current.enabled.length).toBeGreaterThan(0);
    // Helpdesk is enabled in the mock fixture by default
    expect(result.current.isEnabled("helpdesk")).toBe(true);
  });

  it("isEnabled is false for an unknown module", async () => {
    const { result } = renderHook(() => useEnabledModules(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.all.length).toBeGreaterThan(0));
    expect(result.current.isEnabled("nonexistent-module")).toBe(false);
  });

  it("filters enabled set by status (disabled_by_flag excluded)", async () => {
    const { result } = renderHook(() => useEnabledModules(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.all.length).toBeGreaterThan(0));
    // ai-agents requires a flag → status disabled_by_flag → not in enabled[]
    expect(result.current.enabled.find((m) => m.key === "ai-agents")).toBeUndefined();
  });

  it("useModuleStatus returns the entry by key", async () => {
    const { result } = renderHook(() => useModuleStatus("helpdesk"), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.entry).toBeTruthy());
    expect(result.current.entry!.key).toBe("helpdesk");
  });
});
