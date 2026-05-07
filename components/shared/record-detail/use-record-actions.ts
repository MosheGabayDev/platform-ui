"use client";
/**
 * @module components/shared/record-detail/use-record-actions
 * Hook that owns the runtime state of a row of record actions:
 * - filtering by RBAC + visibleWhen predicate
 * - pending state per action (so menu can disable in-flight invocations)
 * - destructive-confirmation dialog state
 * - error → toast bridging
 *
 * Track C of PLATFORM_HARDENING_PLAN.md.
 */
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { usePermission } from "@/lib/hooks/use-permission";
import type { RecordAction } from "./types";

interface PendingState {
  actionId: string | null;
}

interface ConfirmState<T> {
  action: RecordAction<T>;
  record: T;
}

export interface UseRecordActionsResult<T> {
  /** Actions visible to the current user against the given record. */
  visibleActions: (record: T) => RecordAction<T>[];
  /** Run an action, opening the confirm dialog when destructive. */
  invoke: (action: RecordAction<T>, record: T) => void;
  /** Currently-running action id, or null. */
  pendingActionId: string | null;
  /** Open destructive-confirm dialog state, or null. */
  confirmState: ConfirmState<T> | null;
  /** User confirmed the destructive action — proceed with onInvoke. */
  acceptConfirm: () => void;
  /** User cancelled — close the dialog. */
  cancelConfirm: () => void;
}

export function useRecordActions<T>(
  actions: RecordAction<T>[],
): UseRecordActionsResult<T> {
  const { isRole, can } = usePermission();
  const [pending, setPending] = useState<PendingState>({ actionId: null });
  const [confirm, setConfirm] = useState<ConfirmState<T> | null>(null);

  const passesGate = useCallback(
    (action: RecordAction<T>): boolean => {
      if (action.requiredRoles && action.requiredRoles.length > 0) {
        if (!isRole(...action.requiredRoles)) return false;
      }
      if (action.requiredPermission) {
        if (!can(action.requiredPermission)) return false;
      }
      return true;
    },
    [isRole, can],
  );

  const visibleActions = useCallback(
    (record: T): RecordAction<T>[] =>
      actions.filter((a) => {
        if (!passesGate(a)) return false;
        if (a.visibleWhen && !a.visibleWhen(record)) return false;
        return true;
      }),
    [actions, passesGate],
  );

  const runInvoke = useCallback(
    async (action: RecordAction<T>, record: T) => {
      setPending({ actionId: action.id });
      try {
        await action.onInvoke(record);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Action failed";
        toast.error(msg);
      } finally {
        setPending({ actionId: null });
      }
    },
    [],
  );

  const invoke = useCallback(
    (action: RecordAction<T>, record: T) => {
      if (action.destructive) {
        setConfirm({ action, record });
        return;
      }
      void runInvoke(action, record);
    },
    [runInvoke],
  );

  const acceptConfirm = useCallback(() => {
    if (!confirm) return;
    const { action, record } = confirm;
    setConfirm(null);
    void runInvoke(action, record);
  }, [confirm, runInvoke]);

  const cancelConfirm = useCallback(() => setConfirm(null), []);

  return useMemo(
    () => ({
      visibleActions,
      invoke,
      pendingActionId: pending.actionId,
      confirmState: confirm,
      acceptConfirm,
      cancelConfirm,
    }),
    [visibleActions, invoke, pending.actionId, confirm, acceptConfirm, cancelConfirm],
  );
}
