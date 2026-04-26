/**
 * @module lib/modules/users/hooks
 * React Query hooks for the Users module.
 */

import { useQuery } from "@tanstack/react-query";
import type { UserActivityResponse, ActivityTypeFilter } from "./types";

async function fetchUserActivity(
  userId: number,
  limit: number,
  offset: number,
  type?: ActivityTypeFilter,
): Promise<UserActivityResponse> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (type) params.set("type", type);
  const res = await fetch(`/api/proxy/users/${userId}/activity?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Fetch activity timeline for a user.
 * GET /api/proxy/users/<userId>/activity?limit=&offset=&type=
 *
 * type: "login" | "security" | "profile" | undefined (all)
 */
export function useUserActivity(
  userId: number | null | undefined,
  opts: { limit?: number; offset?: number; type?: ActivityTypeFilter } = {},
) {
  const { limit = 20, offset = 0, type } = opts;

  const { data, isLoading, error } = useQuery({
    queryKey: ["users", "activity", userId, limit, offset, type],
    queryFn: () => fetchUserActivity(userId!, limit, offset, type),
    enabled: userId != null && !isNaN(userId),
    staleTime: 30_000,
  });

  return {
    events: data?.data?.events ?? [],
    total: data?.data?.total ?? 0,
    isLoading,
    error,
  };
}
