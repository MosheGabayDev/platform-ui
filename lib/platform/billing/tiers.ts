/**
 * @module lib/platform/billing/tiers
 * Plan-tier entitlements — single source of truth for what each tier includes.
 *
 * @platform cross — no React, no Next.js, no DOM.
 *
 * Mirrors `docs/system-upgrade/04-capabilities/pricing-tiers-spec.md`.
 * When that spec changes, this file MUST change in lockstep + the
 * decision log entry filed.
 *
 * Used by:
 *   - lib/platform/billing/tier-flags.ts to map tier → feature flags
 *   - components/shared/upgrade-cta.tsx (indirectly via the billing API)
 *   - backend Stripe configuration (mirrored, not imported)
 */

import type { PlanTier } from "@/lib/modules/billing/types";

/** -1 means "unlimited" everywhere a numeric quota lives. */
export const UNLIMITED = -1;

export interface TierLimits {
  seats: number;
  tokens_per_month: number;
  api_calls_per_month: number;
  orgs: number;
  audit_log_retention_days: number;
}

export interface TierFeatures {
  sso_saml: boolean;
  sso_oidc: boolean;
  scim: boolean;
  custom_domain: boolean;
  byok: boolean;
  sla_uptime_99_9: boolean;
  audit_log_export: boolean;
  ip_allowlist: boolean;
  priority_support: boolean;
}

export interface TierEntitlements {
  monthly_usd: number | "custom";
  limits: TierLimits;
  features: TierFeatures;
}

const FREE: TierEntitlements = {
  monthly_usd: 0,
  limits: {
    seats: 1,
    tokens_per_month: 100_000,
    api_calls_per_month: 1_000,
    orgs: 1,
    audit_log_retention_days: 30,
  },
  features: {
    sso_saml: false,
    sso_oidc: false,
    scim: false,
    custom_domain: false,
    byok: false,
    sla_uptime_99_9: false,
    audit_log_export: false,
    ip_allowlist: false,
    priority_support: false,
  },
};

const PRO: TierEntitlements = {
  monthly_usd: 99,
  limits: {
    seats: 25,
    tokens_per_month: 5_000_000,
    api_calls_per_month: 100_000,
    orgs: 1,
    audit_log_retention_days: 90,
  },
  features: {
    sso_saml: false,
    sso_oidc: false,
    scim: false,
    custom_domain: false,
    byok: false,
    sla_uptime_99_9: false,
    audit_log_export: true,
    ip_allowlist: false,
    priority_support: true,
  },
};

const ENTERPRISE: TierEntitlements = {
  monthly_usd: "custom",
  limits: {
    seats: UNLIMITED,
    tokens_per_month: UNLIMITED,
    api_calls_per_month: UNLIMITED,
    orgs: UNLIMITED,
    audit_log_retention_days: 365,
  },
  features: {
    sso_saml: true,
    sso_oidc: true,
    scim: true,
    custom_domain: true,
    byok: true,
    sla_uptime_99_9: true,
    audit_log_export: true,
    ip_allowlist: true,
    priority_support: true,
  },
};

const TIERS: Record<PlanTier, TierEntitlements> = {
  free: FREE,
  pro: PRO,
  enterprise: ENTERPRISE,
};

/** Get the full entitlements record for a tier. */
export function getTierEntitlements(tier: PlanTier): TierEntitlements {
  return TIERS[tier];
}

/** True if a numeric quota is "unlimited" (encoded as -1). */
export function isUnlimited(value: number): boolean {
  return value === UNLIMITED;
}

/**
 * Returns true if the org's current usage is over its tier limit for
 * the given metric. Always returns false for unlimited limits.
 */
export function isOverLimit(used: number, limit: number): boolean {
  if (isUnlimited(limit)) return false;
  return used >= limit;
}

/**
 * Returns the utilization percentage (0..N) for a metric. Capped at 999
 * to avoid Infinity when limit is 0 by mistake. Unlimited returns 0.
 */
export function utilizationPct(used: number, limit: number): number {
  if (isUnlimited(limit)) return 0;
  if (limit <= 0) return 999;
  return Math.round((used / limit) * 100);
}
