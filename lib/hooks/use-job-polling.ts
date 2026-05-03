/**
 * @module lib/hooks/use-job-polling
 * Generic polling hook for any long-running job (cap 14 PlatformJobRunner).
 *
 * Polls the provided fetcher every `intervalMs` (default 5s) until the job
 * status becomes terminal (success/succeeded/partial/failed/cancelled), then
 * stops automatically. Built on top of TanStack Query's `refetchInterval` —
 * never `setInterval`, per catalog §14 maintainability rule.
 */
import { useQuery } from "@tanstack/react-query";
import type { Job } from "@/lib/modules/job-runner/types";
import { isTerminalStatus } from "@/lib/modules/job-runner/types";

export interface UseJobPollingOptions<TJobId extends number | string> {
  jobId: TJobId | null;
  fetchJob: (id: TJobId) => Promise<{ data: { job: Job } }>;
  /** Polling interval in ms while the job is non-terminal. Default 5000. */
  intervalMs?: number;
  /** Stable query-key prefix so cache entries don't collide across modules. */
  queryKeyPrefix: readonly unknown[];
}

export function useJobPolling<TJobId extends number | string>({
  jobId,
  fetchJob,
  intervalMs = 5_000,
  queryKeyPrefix,
}: UseJobPollingOptions<TJobId>) {
  return useQuery({
    queryKey: [...queryKeyPrefix, "job", jobId],
    queryFn: () => fetchJob(jobId as TJobId),
    enabled: jobId !== null,
    // Stop polling once status is terminal. `false` from refetchInterval
    // disables further refetches; cache stays warm so UI shows final state.
    refetchInterval: (query) => {
      const job = query.state.data?.data?.job;
      if (!job) return intervalMs;
      return isTerminalStatus(String(job.status)) ? false : intervalMs;
    },
    // Round 3 review HIGH #2: also disable focus + reconnect refetches once
    // terminal. Without these, switching tabs back fires N concurrent
    // requests for already-complete jobs in a list view.
    refetchOnWindowFocus: (query) => {
      const job = query.state.data?.data?.job;
      return !job || !isTerminalStatus(String(job.status));
    },
    refetchOnReconnect: (query) => {
      const job = query.state.data?.data?.job;
      return !job || !isTerminalStatus(String(job.status));
    },
  });
}
