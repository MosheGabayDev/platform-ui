"use client";
/**
 * @module lib/hooks/use-policy-decision
 * Hook over PlatformPolicy Engine (cap 27).
 *
 * Used by ConfirmActionDialog and ActionPreviewCard to gate AI-proposed
 * actions through the policy engine before execution. Returns the
 * decision + a stable loading flag.
 *
 * Spec: docs/system-upgrade/04-capabilities/platform-policy-engine-spec.md
 */
import { useQuery } from "@tanstack/react-query";
import { evaluatePolicy } from "@/lib/api/policies";
import type { EvaluateInput, PolicyDecision } from "@/lib/modules/policies/types";

export interface UsePolicyDecisionResult {
  decision: PolicyDecision | undefined;
  /** True while the engine is evaluating; consumers should treat as loading. */
  isLoading: boolean;
  /** Backend evaluation failure — fail-closed: treat as denied. */
  isError: boolean;
}

const SHORT_STALE_MS = 30_000;

/**
 * Evaluate a single (action_id, params, resource) tuple against the policy
 * engine. Re-evaluates whenever any input changes.
 *
 * Pass `enabled: false` to skip evaluation entirely (e.g. while the user
 * is still composing the action params).
 */
export function usePolicyDecision(
  input: EvaluateInput | null,
  options: { enabled?: boolean } = {},
): UsePolicyDecisionResult {
  const enabled = (options.enabled ?? true) && input !== null;
  const { data, isLoading, isError } = useQuery({
    queryKey: ["policies", "evaluate", input?.action_id, input?.params, input?.resource],
    queryFn: () => evaluatePolicy(input as EvaluateInput),
    enabled,
    staleTime: SHORT_STALE_MS,
    retry: false,
  });
  return {
    decision: data?.data?.decision,
    isLoading,
    isError,
  };
}
