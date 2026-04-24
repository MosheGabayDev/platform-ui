"use client";
/**
 * @module lib/hooks/use-dangerous-action
 * Ties a PlatformAction to a mutation — manages dialog open/close state,
 * reason capture, and delegates execution to usePlatformMutation.
 *
 * Usage:
 *   const { trigger, dialogProps } = useDangerousAction({
 *     action: USER_ACTIONS.deactivate,
 *     mutationFn: () => setUserActive(userId, false),
 *     invalidateKeys: [queryKeys.users.detail(userId)],
 *     onSuccess: () => toast.success("המשתמש הושבת"),
 *   });
 *
 *   <Button onClick={trigger}>השבת</Button>
 *   <ConfirmActionDialog {...dialogProps} />
 */

import { useState, useCallback } from "react";
import type { PlatformAction, ActionConfirmPayload } from "@/lib/platform/actions";
import { usePlatformMutation, type UsePlatformMutationOptions } from "./use-platform-mutation";
import type { QueryKey } from "@tanstack/react-query";

export interface UseDangerousActionOptions<TData> {
  action: PlatformAction;
  mutationFn: (payload: ActionConfirmPayload) => Promise<TData>;
  invalidateKeys?: QueryKey[];
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
}

export interface DangerousActionDialogProps {
  open: boolean;
  action: PlatformAction;
  isPending: boolean;
  serverError: string | null;
  onConfirm: (payload: ActionConfirmPayload) => void;
  onCancel: () => void;
}

export interface UseDangerousActionResult<TData> {
  /** Call to open the confirmation dialog (or execute directly if !requiresConfirmation). */
  trigger: () => void;
  /** Spread onto <ConfirmActionDialog> */
  dialogProps: DangerousActionDialogProps;
  isPending: boolean;
  serverError: string | null;
}

export function useDangerousAction<TData>({
  action,
  mutationFn,
  invalidateKeys,
  onSuccess,
  onError,
}: UseDangerousActionOptions<TData>): UseDangerousActionResult<TData> {
  const [open, setOpen] = useState(false);

  const { mutateAsync, isPending, serverError, reset } = usePlatformMutation<TData, ActionConfirmPayload>({
    mutationFn,
    invalidateKeys,
    onSuccess: (data) => {
      setOpen(false);
      onSuccess?.(data);
    },
    onError,
  });

  const trigger = useCallback(() => {
    reset();
    if (action.requiresConfirmation) {
      setOpen(true);
    } else {
      mutateAsync({ reason: null, confirmedAt: new Date().toISOString() });
    }
  }, [action.requiresConfirmation, mutateAsync, reset]);

  const handleConfirm = useCallback(
    (payload: ActionConfirmPayload) => {
      mutateAsync(payload);
    },
    [mutateAsync],
  );

  const handleCancel = useCallback(() => {
    if (!isPending) {
      setOpen(false);
      reset();
    }
  }, [isPending, reset]);

  return {
    trigger,
    dialogProps: {
      open,
      action,
      isPending,
      serverError,
      onConfirm: handleConfirm,
      onCancel: handleCancel,
    },
    isPending,
    serverError,
  };
}
