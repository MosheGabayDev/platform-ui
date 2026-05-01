/**
 * @module lib/modules/helpdesk/hooks
 * Helpdesk mutation hooks (Phase B).
 *
 * Each hook wraps `usePlatformMutation` with the right invalidation keys so
 * the ticket detail + list refetch automatically after a successful action.
 *
 * MOCK MODE state lives in `lib/api/helpdesk.ts` — these hooks are mode-agnostic.
 */
import { toast } from "sonner";
import { usePlatformMutation } from "@/lib/hooks/use-platform-mutation";
import { queryKeys } from "@/lib/api/query-keys";
import {
  takeTicket,
  resolveTicket,
  reassignTicket,
  commentOnTicket,
  type TakeTicketInput,
  type ResolveTicketInput,
  type ReassignTicketInput,
  type CommentTicketInput,
  type TicketActionResponse,
} from "@/lib/api/helpdesk";

function helpdeskInvalidations(ticketId: number) {
  return [
    queryKeys.helpdesk.all(),
    queryKeys.helpdesk.stats(),
    queryKeys.helpdesk.ticket(ticketId),
  ];
}

export function useTakeTicket(ticketId: number) {
  return usePlatformMutation<TicketActionResponse, TakeTicketInput>({
    mutationFn: takeTicket,
    invalidateKeys: helpdeskInvalidations(ticketId),
    onSuccess: (data) => toast.success(data.message),
  });
}

export function useResolveTicket(ticketId: number) {
  return usePlatformMutation<TicketActionResponse, ResolveTicketInput>({
    mutationFn: resolveTicket,
    invalidateKeys: helpdeskInvalidations(ticketId),
    onSuccess: (data) => toast.success(data.message),
  });
}

export function useReassignTicket(ticketId: number) {
  return usePlatformMutation<TicketActionResponse, ReassignTicketInput>({
    mutationFn: reassignTicket,
    invalidateKeys: helpdeskInvalidations(ticketId),
    onSuccess: (data) => toast.success(data.message),
  });
}

export function useCommentOnTicket(ticketId: number) {
  return usePlatformMutation<TicketActionResponse, CommentTicketInput>({
    mutationFn: commentOnTicket,
    invalidateKeys: helpdeskInvalidations(ticketId),
    onSuccess: (data) => toast.success(data.message),
  });
}
