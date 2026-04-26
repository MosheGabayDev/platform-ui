"use client";
/**
 * @module lib/hooks/use-notifications
 * Polling-based notification fetch + mark-read mutations for PlatformNotifications (cap 12).
 *
 * Phase 1: 30-second polling interval.
 * Phase 2: Replace with SSE when PlatformRealtime (cap 23) is built.
 *
 * Security: org-scoped + user-scoped on the backend. This hook renders only what it receives.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/api/notifications";

/** 30-second polling interval (ms). Replace with SSE in cap 23 upgrade. */
const POLL_INTERVAL_MS = 30_000;

export function useNotifications() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: fetchNotifications,
    refetchInterval: POLL_INTERVAL_MS,
    // Stale immediately so background refetch always runs on focus
    staleTime: 0,
  });

  const notifications = data?.data.notifications ?? [];
  const unreadCount   = data?.data.unread_count   ?? 0;

  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    },
  });

  const markAllRead = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    isError,
    markRead:    (id: string) => markRead.mutate(id),
    markAllRead: () => markAllRead.mutate(),
    isMarkingRead:    markRead.isPending,
    isMarkingAllRead: markAllRead.isPending,
  };
}
