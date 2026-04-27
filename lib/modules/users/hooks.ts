/**
 * @module lib/modules/users/hooks
 * React Query hooks for the Users module.
 */

import { useQuery } from "@tanstack/react-query";
import { fetchUserActivity } from "@/lib/api/users";
import { queryKeys } from "@/lib/api/query-keys";
import type { ActivityTypeFilter } from "./types";

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
    queryKey: queryKeys.users.activity(userId ?? -1, { limit, offset, type }),
    queryFn: () => fetchUserActivity(userId!, { limit, offset, type }),
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
