/**
 * @module lib/api/module-registry
 * PlatformModuleRegistry client (cap 18, Phase 1.3).
 *
 * Spec: docs/system-upgrade/04-capabilities/platform-module-registry-spec.md
 *
 * MOCK MODE until backend lands. Resolves status by combining manifests
 * (code-level) with mock per-org enablement state and required-flag
 * evaluation.
 */
import { getAllManifests, getManifest } from "@/lib/platform/module-registry/manifests";
import { fetchFeatureFlag, type FlagKey } from "@/lib/api/feature-flags";
import type {
  ModuleEntry,
  ModuleListResponse,
  ModuleStatus,
  SetEnablementInput,
  SetEnablementResponse,
} from "@/lib/modules/module-registry/types";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/proxy";
export const MOCK_MODE = true;

// Track A: localStorage-backed persistence for mock state.
import {
  loadMockState,
  saveMockState,
  clearMockState,
} from "@/lib/api/_mock-storage";
const STORAGE_KEY = "mock:module-registry:enablement";
const STORAGE_VERSION = 1;

const FIXTURE_ENABLEMENT: Array<[string, boolean]> = [
  ["helpdesk", true],
  ["audit-log", true],
  ["users", true],
  ["ai-agents", false],
  ["ai-providers", false],
  ["knowledge", false],
  ["voice", false],
  ["automation", false],
  ["integrations", true],
  ["monitoring", true],
  ["billing", true],
  ["data-sources", false],
];

// Mock per-org enablement. Defaults below match a "Pro" tenant.
const MOCK_ENABLEMENT = new Map<string, boolean>(
  loadMockState<Array<[string, boolean]>>(STORAGE_KEY, STORAGE_VERSION, FIXTURE_ENABLEMENT),
);

function persistEnablement(): void {
  saveMockState(STORAGE_KEY, STORAGE_VERSION, Array.from(MOCK_ENABLEMENT.entries()));
}

/** Test helper — restores fixtures + clears localStorage. */
export function _resetModuleRegistryMockState(): void {
  MOCK_ENABLEMENT.clear();
  for (const [k, v] of FIXTURE_ENABLEMENT) MOCK_ENABLEMENT.set(k, v);
  clearMockState("mock:module-registry:");
}

const MOCK_PLAN = "pro" as const;
const PLAN_GRANTS: Record<string, string[]> = {
  free: [],
  pro: ["pro"],
  enterprise: ["pro", "enterprise"],
};

async function evaluateRequiredFlags(flags: string[]): Promise<{
  ok: boolean;
  failed: string[];
}> {
  if (flags.length === 0) return { ok: true, failed: [] };
  const results = await Promise.all(
    flags.map((f) =>
      fetchFeatureFlag(f as FlagKey).then(
        (r) => ({ key: f, enabled: r.enabled }),
        () => ({ key: f, enabled: false }),
      ),
    ),
  );
  const failed = results.filter((r) => !r.enabled).map((r) => r.key);
  return { ok: failed.length === 0, failed };
}

function planSatisfied(requiredPlans: string[]): boolean {
  if (requiredPlans.length === 0) return true;
  const grants = PLAN_GRANTS[MOCK_PLAN] ?? [];
  return requiredPlans.some((p) => grants.includes(p));
}

async function resolveEntry(key: string): Promise<ModuleEntry> {
  const manifest = getManifest(key);
  if (!manifest) {
    throw new Error(`404: module '${key}' not in registry`);
  }
  const enabled = MOCK_ENABLEMENT.get(key) ?? false;
  const flagEval = await evaluateRequiredFlags(manifest.required_flags);
  const planOk = planSatisfied(manifest.required_plans);

  let status: ModuleStatus = "healthy";
  let blockedReason: string | null = null;

  if (!planOk) {
    status = "unavailable";
    blockedReason = `Plan does not include required tier (${manifest.required_plans.join(" or ")}). Current plan: ${MOCK_PLAN}.`;
  } else if (!flagEval.ok) {
    status = "disabled_by_flag";
    blockedReason = `Required feature flag(s) disabled: ${flagEval.failed.join(", ")}.`;
  }

  return {
    key,
    manifest,
    enablement: {
      enabled,
      enabled_at: enabled ? new Date(2026, 3, 1).toISOString() : null,
      enabled_by_user_id: enabled ? 1 : null,
      source: "org_override",
    },
    status,
    blocked_reason: blockedReason,
  };
}

export async function fetchModules(): Promise<ModuleListResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 100));
    const entries = await Promise.all(
      getAllManifests().map((m) => resolveEntry(m.key)),
    );
    return { success: true, data: { modules: entries, total: entries.length } };
  }
  const res = await fetch(`${BASE}/modules`, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function setModuleEnablement(
  input: SetEnablementInput,
): Promise<SetEnablementResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 150));
    const manifest = getManifest(input.key);
    if (!manifest) throw new Error(`404: module '${input.key}' not in registry`);

    // Q-MR-4: enforce conflicts on enable.
    if (input.enabled) {
      for (const conflictKey of manifest.conflicts_with) {
        if (MOCK_ENABLEMENT.get(conflictKey)) {
          throw new Error(
            `409: Cannot enable '${input.key}' while '${conflictKey}' is enabled (conflict).`,
          );
        }
      }
    }

    MOCK_ENABLEMENT.set(input.key, input.enabled);
    persistEnablement();
    const entry = await resolveEntry(input.key);
    return {
      success: true,
      message: `(mock) ${input.enabled ? "Enabled" : "Disabled"} module '${input.key}'.`,
      data: { module: entry },
    };
  }
  const res = await fetch(
    `${BASE}/modules/${encodeURIComponent(input.key)}/enablement`,
    {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: input.enabled, reason: input.reason }),
    },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
