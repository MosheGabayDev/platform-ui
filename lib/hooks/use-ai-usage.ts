"use client";
/**
 * @module lib/hooks/use-ai-usage
 * Hooks over PlatformAIUsage (Phase 2.3).
 */
import { useQuery } from "@tanstack/react-query";
import { fetchUsageStats, fetchUsageEvents } from "@/lib/api/ai-usage";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  UsageEventsParams,
  UsageRange,
} from "@/lib/modules/ai-usage/types";

export function useUsageStats(range: UsageRange = "mtd") {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.aiUsage.stats(range),
    queryFn: () => fetchUsageStats(range),
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: false,
  });
  return { stats: data?.data, isLoading, isError };
}

export function useUsageEvents(params: UsageEventsParams) {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.aiUsage.events(params),
    queryFn: () => fetchUsageEvents(params),
    staleTime: 30_000,
    retry: false,
  });
  return {
    events: data?.data?.events ?? [],
    total: data?.data?.total ?? 0,
    isLoading,
    isError,
  };
}

/**
 * @deprecated Use `queryKeys.aiUsage.all()` directly.
 */
export const _aiUsageQueryPrefix = queryKeys.aiUsage.all();
