/**
 * useSetting smoke tests (cap 16).
 */
import { describe, it, expect, afterEach } from "vitest";
import { renderHook, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  useSetting,
  useSettingsByCategory,
  useSettingDefinitions,
} from "./use-setting";

afterEach(cleanup);

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useSetting / useSettingsByCategory / useSettingDefinitions", () => {
  it("useSetting returns a single setting envelope", async () => {
    const { result } = renderHook(() => useSetting("branding.org_name"), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.setting).toBeDefined());
    expect(result.current.setting!.key).toBe("branding.org_name");
    expect(result.current.setting!.type).toBe("string");
  });

  it("useSettingsByCategory returns the category bucket", async () => {
    const { result } = renderHook(() => useSettingsByCategory("ai"), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.settings.length).toBeGreaterThan(0));
    expect(
      result.current.settings.every((s) => s.key.startsWith("ai.")),
    ).toBe(true);
  });

  it("useSettingDefinitions returns the catalog", async () => {
    const { result } = renderHook(() => useSettingDefinitions(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() =>
      expect(result.current.definitions.length).toBeGreaterThan(0),
    );
    expect(
      result.current.definitions.find((d) => d.key === "ai.system_prompt"),
    ).toBeTruthy();
  });
});
