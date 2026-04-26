"use client";
/**
 * @module lib/hooks/use-feature-flag
 * Fail-closed feature flag hook.
 *
 * Returns { enabled: false } when:
 *   - flag is loading
 *   - backend returned an error (R045 not yet live)
 *   - flag key is unknown
 *   - backend is unavailable
 *
 * Falls back to STATIC_FLAG_DEFAULTS (all false) on any error.
 * Source is "api" when the backend responded successfully, "default" otherwise.
 *
 * Security note: this is UX gating only. Backend must independently enforce
 * capability access. Do not use feature flags as the sole protection for
 * sensitive data or API endpoints.
 */

import { useQuery } from "@tanstack/react-query";
import {
  fetchFeatureFlag,
  STATIC_FLAG_DEFAULTS,
  type FlagKey,
} from "@/lib/api/feature-flags";

export type FlagSource = "api" | "default";

export interface UseFlagResult {
  /** Whether the feature is enabled. Always false while loading or on error. */
  enabled: boolean;
  /** True while the flag value is being fetched. */
  isLoading: boolean;
  /** True if the backend returned an error (value fell back to static default). */
  isError: boolean;
  /** "api" when the backend responded; "default" when using static fallback. */
  source: FlagSource;
}

export function useFeatureFlag(key: FlagKey): UseFlagResult {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["feature-flags", "flag", key],
    queryFn: () => fetchFeatureFlag(key),
    retry: false,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return { enabled: false, isLoading: true, isError: false, source: "default" };
  }

  if (isError || data === undefined) {
    return {
      enabled: STATIC_FLAG_DEFAULTS[key],
      isLoading: false,
      isError: true,
      source: "default",
    };
  }

  return { enabled: data.enabled, isLoading: false, isError: false, source: "api" };
}
