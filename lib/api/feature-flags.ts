/**
 * @module lib/api/feature-flags
 * Typed API contract for the Feature Flags endpoint.
 *
 * Backend: R045 FeatureFlagService (not yet implemented).
 * Endpoint: GET /api/proxy/feature-flags/<key>
 *
 * MOCK MODE is currently true — returns flag values from MOCK_OVERRIDES
 * below (everything false except `helpdesk.enabled` which is true so the
 * Helpdesk pages render in mock-mode demos). Flips to false once R045-min
 * Feature Flag Service backend lands.
 *
 * Even in non-mock mode, `useFeatureFlag` catches errors and returns
 * fail-closed defaults — so an unreachable backend never opens a flag.
 *
 * Allowed flag keys match the platform capability roadmap.
 * All unknown keys default to disabled (fail-closed) in the hook.
 */

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/proxy";

/** All known capability flag keys. Extend here as capabilities are added. */
export type FlagKey =
  | "data_sources.enabled"
  | "ai_agents.enabled"
  | "global_assistant.enabled"
  | "voice_agent.enabled"
  | "integrations.enabled"
  | "settings.capabilities.enabled"
  | "helpdesk.enabled";

/** Shape of the response from GET /api/proxy/feature-flags/<key>. */
export interface FlagResponse {
  key: string;
  enabled: boolean;
  /** How the value was resolved on the backend. */
  source: "org" | "plan" | "system";
}

/**
 * Static defaults used when the backend is unavailable.
 * All false — fail-closed. These are not overrideable at call sites;
 * they exist only so the hook returns a typed default instead of undefined.
 */
export const STATIC_FLAG_DEFAULTS: Record<FlagKey, false> = {
  "data_sources.enabled": false,
  "ai_agents.enabled": false,
  "global_assistant.enabled": false,
  "voice_agent.enabled": false,
  "integrations.enabled": false,
  "settings.capabilities.enabled": false,
  "helpdesk.enabled": false,
};

export const MOCK_MODE = true;

/**
 * Mock flag values used when MOCK_MODE is true.
 * Helpdesk is on so the Phase A scaffold pages render with their KPI tiles.
 * All other capabilities default off — they have no UI yet.
 */
const MOCK_OVERRIDES: Record<FlagKey, boolean> = {
  "data_sources.enabled": false,
  "ai_agents.enabled": false,
  "global_assistant.enabled": false,
  "voice_agent.enabled": false,
  "integrations.enabled": false,
  "settings.capabilities.enabled": false,
  "helpdesk.enabled": true,
};

export async function fetchFeatureFlag(key: FlagKey): Promise<FlagResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 50));
    return { key, enabled: MOCK_OVERRIDES[key] ?? false, source: "system" };
  }

  const res = await fetch(`${BASE}/feature-flags/${encodeURIComponent(key)}`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.json() as Promise<FlagResponse>;
}
