/**
 * @module lib/platform/billing/tier-flags
 * Maps a plan tier to the set of feature flags it auto-enables.
 *
 * @platform cross — pure data + helpers, no React.
 *
 * Frontend can compute a tenant's effective flag set without an extra
 * round trip when only the tier is known. Backend mirrors this mapping
 * at flag-resolution time (cap 17 §Resolution chain).
 *
 * Spec: docs/system-upgrade/04-capabilities/pricing-tiers-spec.md
 *       §Feature-flag mapping.
 *
 * Contract: each higher tier is a strict superset of every lower tier —
 * `flagsForTier()` returns Pro flags ∪ Free flags for Pro, etc. Tested
 * in tier-flags.test.ts.
 */

import type { PlanTier } from "@/lib/modules/billing/types";

const FREE_FLAGS = ["helpdesk.enabled"] as const;

const PRO_ONLY_FLAGS = [
  "audit_log.export",
  "ai_agents.enabled",
  "automation.enabled",
  "priority_support.enabled",
] as const;

const ENTERPRISE_ONLY_FLAGS = [
  "sso.enabled",
  "scim.enabled",
  "custom_domain.enabled",
  "byok.enabled",
  "ip_allowlist.enabled",
  "audit_log.long_retention",
] as const;

/**
 * Returns the full set of feature-flag keys auto-enabled at the given
 * tier. Higher tiers strictly include lower tiers.
 */
export function flagsForTier(tier: PlanTier): string[] {
  const free = [...FREE_FLAGS];
  if (tier === "free") return free;
  const pro = [...free, ...PRO_ONLY_FLAGS];
  if (tier === "pro") return pro;
  return [...pro, ...ENTERPRISE_ONLY_FLAGS];
}

/**
 * True if the given flag is auto-enabled by virtue of the plan tier
 * alone (i.e. not gated behind an additional org/user override).
 */
export function isFlagAutoEnabledForTier(flag: string, tier: PlanTier): boolean {
  return flagsForTier(tier).includes(flag);
}

/**
 * Returns the minimum tier required to auto-enable the flag, or null
 * when the flag is not in any tier's auto-enable set (i.e. it's
 * environment- or org-controlled).
 */
export function minTierForFlag(flag: string): PlanTier | null {
  if ((FREE_FLAGS as readonly string[]).includes(flag)) return "free";
  if ((PRO_ONLY_FLAGS as readonly string[]).includes(flag)) return "pro";
  if ((ENTERPRISE_ONLY_FLAGS as readonly string[]).includes(flag)) return "enterprise";
  return null;
}
