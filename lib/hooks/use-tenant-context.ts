"use client";
/**
 * @module lib/hooks/use-tenant-context
 * PlatformTenantContext — single hook that surfaces everything the UI
 * needs to know about the current tenant: identity, plan tier, and
 * resolved entitlements.
 *
 * Spec: docs/system-upgrade/PRODUCT_LAUNCH_PLAN.md §3 task 6.12.
 *
 * Combines:
 *   - identity from next-auth session (org_id, user_id, role)
 *   - plan tier from cap 16 Billing overview (Stripe-shaped envelope)
 *   - entitlements from lib/platform/billing/tiers.ts (pure data)
 *
 * Use this when a component needs to ask "what does this org get?"
 * without three separate hooks. For permission checks alone, use
 * usePermission(); for raw billing data, use useQuery(billing.overview).
 */

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { fetchBillingOverview } from "@/lib/api/billing";
import { queryKeys } from "@/lib/api/query-keys";
import {
  getTierEntitlements,
  type TierEntitlements,
} from "@/lib/platform/billing/tiers";
import type { PlanTier } from "@/lib/modules/billing/types";

export interface TenantContext {
  /** True while session OR billing query is still loading. */
  isLoading: boolean;
  /** True when the session is loaded but unauthenticated. */
  isAnonymous: boolean;
  /** Active org id; null when anonymous. */
  org_id: number | null;
  /** Active user id; null when anonymous. */
  user_id: number | null;
  /** Primary role string; null when anonymous. */
  role: string | null;
  /** Whether the user has admin bypass at the org level. */
  is_admin: boolean;
  /** Whether the user is the platform-wide system admin. */
  is_system_admin: boolean;
  /**
   * Active plan tier. Defaults to "free" before billing has loaded
   * so consumers fail closed (no premium features) instead of flashing
   * Pro UI before resolution.
   */
  tier: PlanTier;
  /** Resolved entitlements for the active tier. */
  entitlements: TierEntitlements;
}

export function useTenantContext(): TenantContext {
  const { data: session, status } = useSession();
  const sessionLoading = status === "loading";

  const { data: billing, isLoading: billingLoading } = useQuery({
    queryKey: queryKeys.billing.overview(),
    queryFn: fetchBillingOverview,
    enabled: status === "authenticated",
    staleTime: 60_000,
  });

  const isAnonymous = status === "unauthenticated";
  const tier: PlanTier = billing?.data?.plan?.tier ?? "free";

  return {
    isLoading: sessionLoading || (status === "authenticated" && billingLoading),
    isAnonymous,
    org_id: session?.user?.org_id ?? null,
    user_id: session?.user?.id ?? null,
    role: session?.user?.role ?? null,
    is_admin: session?.user?.is_admin ?? false,
    is_system_admin: session?.user?.is_system_admin ?? false,
    tier,
    entitlements: getTierEntitlements(tier),
  };
}
