/**
 * AI skills hooks — list filter + validation.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const listMock = vi.hoisted(() => vi.fn());
const validateMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/ai-skills", () => ({
  fetchAISkills: listMock,
  validateSkillInvocation: validateMock,
}));

import { useAISkills, useSkillValidation } from "./use-ai-skills";

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  listMock.mockReset();
  validateMock.mockReset();
});
afterEach(() => vi.restoreAllMocks());

describe("useAISkills", () => {
  it("returns skills + module counts", async () => {
    listMock.mockResolvedValue({
      data: { skills: [{ id: "x" }], module_counts: { helpdesk: 5 } },
    });
    const { result } = renderHook(() => useAISkills(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.skills).toEqual([{ id: "x" }]);
    expect(result.current.moduleCounts).toEqual({ helpdesk: 5 });
  });

  it("passes filter to api", async () => {
    listMock.mockResolvedValue({ data: { skills: [], module_counts: {} } });
    renderHook(() => useAISkills({ module: "users", ai_callable: true }), { wrapper: makeWrapper() });
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    expect(listMock.mock.calls[0]![0]).toEqual({ module: "users", ai_callable: true });
  });

  it("defaults skills/moduleCounts when missing", async () => {
    listMock.mockResolvedValue({ data: undefined });
    const { result } = renderHook(() => useAISkills(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.skills).toEqual([]);
    expect(result.current.moduleCounts).toEqual({});
  });
});

describe("useSkillValidation", () => {
  it("disabled when input is null", () => {
    renderHook(() => useSkillValidation(null), { wrapper: makeWrapper() });
    expect(validateMock).not.toHaveBeenCalled();
  });

  it("fetches when input given", async () => {
    validateMock.mockResolvedValue({ data: { valid: true } });
    const input = { skill_id: "s", params: {} } as never;
    const { result } = renderHook(() => useSkillValidation(input), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.validation).toEqual({ valid: true });
  });
});
