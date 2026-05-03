/**
 * AI action executors — mock-mode shim until R051 backend ships.
 *
 * When the LLM proposes an action and the user confirms it, the AI shell
 * looks up the corresponding executor here and runs it. Once R051 lands,
 * confirmation will POST `/api/proxy/ai/proposals/<token>/confirm` and the
 * backend executes the action server-side; this registry becomes a
 * frontend-only convention for client-side optimistic invalidation.
 *
 * Each executor receives `(params, queryClient)` and returns a Promise that
 * resolves on success or rejects on failure. The ActionPreviewCard awaits
 * the promise and transitions the assistant state accordingly.
 *
 * Spec: docs/system-upgrade/10-tasks/AI-shell-C-actions-confirm/epic.md
 *       docs/system-upgrade/05-ai/action-platform.md
 */
import type { QueryClient } from "@tanstack/react-query";
import {
  takeTicket,
  resolveTicket,
} from "@/lib/api/helpdesk";
import { cancelMaintenanceWindow } from "@/lib/api/helpdesk.maintenance";
import { cancelBatchTask } from "@/lib/api/helpdesk.batch";
import { queryKeys } from "@/lib/api/query-keys";

export type ActionParams = Record<string, unknown>;

export type ActionExecutor = (
  params: ActionParams,
  queryClient: QueryClient,
) => Promise<{ message: string }>;

function asNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`Invalid action params: '${field}' must be a number, got ${typeof value}`);
  }
  return value;
}

function asString(value: unknown, field: string, fallback?: string): string {
  if (typeof value === "string") return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`Invalid action params: '${field}' must be a string`);
}

const EXECUTORS: Record<string, ActionExecutor> = {
  "helpdesk.ticket.take": async (params, queryClient) => {
    const ticketId = asNumber(params.ticketId, "ticketId");
    const res = await takeTicket({ ticketId });
    await queryClient.invalidateQueries({ queryKey: queryKeys.helpdesk.all() });
    await queryClient.invalidateQueries({ queryKey: queryKeys.helpdesk.ticket(ticketId) });
    return { message: res.message };
  },
  "helpdesk.ticket.resolve": async (params, queryClient) => {
    const ticketId = asNumber(params.ticketId, "ticketId");
    const resolution = asString(params.resolution, "resolution", "Resolved via AI assistant");
    const res = await resolveTicket({ ticketId, resolution });
    await queryClient.invalidateQueries({ queryKey: queryKeys.helpdesk.all() });
    await queryClient.invalidateQueries({ queryKey: queryKeys.helpdesk.ticket(ticketId) });
    return { message: res.message };
  },
  "helpdesk.maintenance.cancel": async (params, queryClient) => {
    const windowId = asNumber(params.windowId, "windowId");
    const reason = asString(params.reason, "reason", "Cancelled via AI assistant");
    const res = await cancelMaintenanceWindow({ windowId, reason });
    await queryClient.invalidateQueries({ queryKey: queryKeys.helpdesk.all() });
    return { message: res.message };
  },
  "helpdesk.batch.cancel": async (params, queryClient) => {
    const taskId = asNumber(params.taskId, "taskId");
    const reason = asString(params.reason, "reason", "Cancelled via AI assistant");
    const res = await cancelBatchTask({ taskId, reason });
    await queryClient.invalidateQueries({ queryKey: queryKeys.helpdesk.all() });
    return { message: res.message };
  },
};

export function getActionExecutor(actionId: string): ActionExecutor | null {
  return EXECUTORS[actionId] ?? null;
}

/** Test-only: list registered actions so tests can assert coverage. */
export function _registeredActions(): string[] {
  return Object.keys(EXECUTORS);
}
