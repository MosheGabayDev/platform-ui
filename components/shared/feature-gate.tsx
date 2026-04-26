"use client";
/**
 * @module components/shared/feature-gate
 * Conditionally renders children based on a feature flag.
 *
 * Fail-closed: renders `fallback` (default null) when:
 *   - flag is loading
 *   - flag is disabled
 *   - flag key is unknown or backend unavailable
 *
 * Mirrors the shape of PermissionGate for consistency:
 *   <FeatureGate flag="data_sources.enabled" fallback={<ComingSoon />}>
 *     <DataSourcesModule />
 *   </FeatureGate>
 *
 * IMPORTANT: visibility only — NOT a security boundary.
 * Backend must independently enforce capability access.
 * Never use this as the sole protection for sensitive data or API routes.
 */

import type { ReactNode } from "react";
import { useFeatureFlag } from "@/lib/hooks/use-feature-flag";
import type { FlagKey } from "@/lib/api/feature-flags";

interface FeatureGateProps {
  /** Capability flag key to evaluate. */
  flag: FlagKey;
  /** Rendered when flag is enabled and not loading. */
  children: ReactNode;
  /** Rendered when flag is disabled, loading, or errored. Default: null. */
  fallback?: ReactNode;
}

export function FeatureGate({ flag, children, fallback = null }: FeatureGateProps) {
  const { enabled, isLoading } = useFeatureFlag(flag);

  if (isLoading || !enabled) return <>{fallback}</>;

  return <>{children}</>;
}
