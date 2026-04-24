"use client";
/**
 * @module lib/hooks/use-platform-mutation
 * Standard TanStack Query mutation wrapper for all platform-ui module forms.
 *
 * Responsibilities:
 *   - Normalizes backend error responses to a displayable string
 *   - Invalidates TanStack Query caches after success
 *   - Provides isPending, serverError, reset helpers
 *
 * Usage pattern (every module form follows this):
 *   const { mutateAsync, isPending, serverError, reset } = usePlatformMutation({
 *     mutationFn: createUser,
 *     invalidateKeys: [queryKeys.users.all()],
 *     onSuccess: () => toast.success("משתמש נוצר"),
 *   });
 *
 * Security note: org_id MUST be injected inside mutationFn from session/JWT,
 * never passed as a form field or prop to this hook.
 */

import { useState } from "react";
import { useMutation, useQueryClient, type MutationFunction, type QueryKey } from "@tanstack/react-query";

export interface UsePlatformMutationOptions<TData, TVariables> {
  mutationFn: MutationFunction<TData, TVariables>;
  /** Query keys to invalidate on success. Each entry is one QueryKey array. */
  invalidateKeys?: QueryKey[];
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error) => void;
}

export interface PlatformMutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => void;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  isPending: boolean;
  /** Normalized backend/network error string. Null when no error. */
  serverError: string | null;
  reset: () => void;
}

export function usePlatformMutation<TData, TVariables>({
  mutationFn,
  invalidateKeys,
  onSuccess,
  onError,
}: UsePlatformMutationOptions<TData, TVariables>): PlatformMutationResult<TData, TVariables> {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const { mutate, mutateAsync, isPending, reset: resetMutation } = useMutation({
    mutationFn,
    onSuccess: async (data, variables) => {
      setServerError(null);
      if (invalidateKeys?.length) {
        await Promise.all(
          invalidateKeys.map((key) => queryClient.invalidateQueries({ queryKey: key })),
        );
      }
      onSuccess?.(data, variables);
    },
    onError: (error: Error) => {
      setServerError(normalizeError(error));
      onError?.(error);
    },
  });

  const reset = () => {
    resetMutation();
    setServerError(null);
  };

  return { mutate, mutateAsync, isPending, serverError, reset };
}

/** Extract a display-friendly string from any thrown value. */
function normalizeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "שגיאה לא ידועה — נסה שוב";
}
