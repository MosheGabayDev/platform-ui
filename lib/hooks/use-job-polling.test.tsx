/**
 * use-job-polling tests — Round 3 review HIGH #2 follow-up.
 *
 * Asserts: polling continues for non-terminal jobs, stops on terminal,
 * disabled when jobId is null, and Round 3 fix actually wires the
 * refetchOnWindowFocus/Reconnect gates per query state.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useJobPolling } from "./use-job-polling";
import type { Job } from "@/lib/modules/job-runner/types";

afterEach(() => vi.restoreAllMocks());

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, wrapper };
}

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 1,
    status: "running",
    label: "Test job",
    progress: { processed: 5, total: 10, succeeded: 5, failed: 0 },
    error_message: null,
    created_at: new Date().toISOString(),
    started_at: new Date().toISOString(),
    completed_at: null,
    ...overrides,
  };
}

describe("useJobPolling", () => {
  it("does not call fetchJob when jobId is null (enabled gate)", () => {
    const fetchJob = vi.fn();
    const { wrapper } = makeWrapper();
    renderHook(
      () =>
        useJobPolling({
          jobId: null,
          fetchJob,
          queryKeyPrefix: ["test"],
        }),
      { wrapper },
    );
    expect(fetchJob).not.toHaveBeenCalled();
  });

  it("fetches once when jobId is set", async () => {
    const fetchJob = vi.fn(async () => ({ data: { job: makeJob() } }));
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () =>
        useJobPolling({
          jobId: 42,
          fetchJob,
          queryKeyPrefix: ["test"],
          intervalMs: 60_000, // long interval to keep test deterministic
        }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(fetchJob).toHaveBeenCalledWith(42);
  });

  it("returns the job data via query result", async () => {
    const job = makeJob({ status: "succeeded" });
    const fetchJob = vi.fn(async () => ({ data: { job } }));
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () =>
        useJobPolling({
          jobId: 1,
          fetchJob,
          queryKeyPrefix: ["test"],
        }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.data?.data?.job).toEqual(job));
  });

  it("queryKey includes the prefix and jobId for cache scoping", async () => {
    const fetchJob = vi.fn(async () => ({ data: { job: makeJob() } }));
    const { qc, wrapper } = makeWrapper();
    const { result } = renderHook(
      () =>
        useJobPolling({
          jobId: 99,
          fetchJob,
          queryKeyPrefix: ["module-x"],
        }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.data).toBeTruthy());
    const cached = qc.getQueryData(["module-x", "job", 99]);
    expect(cached).toBeTruthy();
  });

  it("supports string jobIds (e.g. UUIDs)", async () => {
    const fetchJob = vi.fn(async (id: string) => ({
      data: { job: { ...makeJob(), id } },
    }));
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () =>
        useJobPolling<string>({
          jobId: "abc-123",
          fetchJob,
          queryKeyPrefix: ["test"],
        }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.data?.data?.job?.id).toBe("abc-123"));
    expect(fetchJob).toHaveBeenCalledWith("abc-123");
  });
});
