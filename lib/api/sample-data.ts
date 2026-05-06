/**
 * @module lib/api/sample-data
 * Sample-data seeding client (Phase 3.1).
 *
 * Spec: docs/system-upgrade/04-capabilities/platform-onboarding-finish-spec.md
 *
 * MOCK MODE persists per-module seed timestamps as a JSON map under the
 * `onboarding.sample_data` setting (cap 16). Each seed call also writes
 * one `category=admin` audit entry per module (cap 10).
 */
import type {
  SeedSampleDataInput,
  SeedSampleDataResponse,
  SampleDataStatusResponse,
  SeededModule,
} from "@/lib/modules/onboarding/types";
import { fetchSetting, setSetting } from "@/lib/api/settings";
import { recordAuditEntry } from "@/lib/api/audit";

export const MOCK_MODE = true;

const COUNTS: Record<string, number> = {
  helpdesk: 15, // 8 tickets + 3 technicians + 4 KB articles
  users: 7,
  "audit-log": 17,
  monitoring: 4,
  knowledge: 6,
};

function isSeedable(moduleKey: string): boolean {
  return moduleKey in COUNTS;
}

async function readMarkers(): Promise<Record<string, string>> {
  try {
    const res = await fetchSetting("onboarding.sample_data");
    if (res.data.type === "json" && res.data.value && typeof res.data.value === "object") {
      // Clone so subsequent mutations don't leak into the settings store cache.
      return { ...(res.data.value as Record<string, string>) };
    }
  } catch {
    // Setting not yet set — empty markers.
  }
  return {};
}

async function writeMarkers(markers: Record<string, string>): Promise<void> {
  await setSetting({
    key: "onboarding.sample_data",
    scope: "org",
    scope_id: 1,
    value: markers,
  });
}

export async function seedSampleData(
  input: SeedSampleDataInput,
): Promise<SeedSampleDataResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 80));
    const now = new Date().toISOString();
    const markers = await readMarkers();
    const seeded: SeededModule[] = [];
    let total = 0;
    let dirty = false;

    for (const moduleKey of input.modules) {
      if (!isSeedable(moduleKey)) {
        seeded.push({ module_key: moduleKey, count: 0, not_seedable: true });
        continue;
      }
      const count = COUNTS[moduleKey];
      seeded.push({ module_key: moduleKey, count });
      total += count;
      markers[moduleKey] = now;
      dirty = true;
      // Audit per module
      void recordAuditEntry({
        action: "onboarding.sample_data.seed",
        category: "admin",
        resource_type: "module",
        resource_id: moduleKey,
        metadata: { count, kind: "sample_data_seed" },
      });
    }

    // Round-2 H2: only persist when at least one seedable module was
    // processed. Without `dirty`, a previously-seeded org would re-write
    // identical markers on every "all unknown modules" call.
    if (dirty) {
      await writeMarkers(markers);
    }

    return { success: true, data: { seeded, total_resources: total } };
  }

  const res = await fetch("/api/proxy/onboarding/sample-data", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Sample-data seed failed: ${res.status}`);
  return (await res.json()) as SeedSampleDataResponse;
}

export async function getSampleDataStatus(): Promise<SampleDataStatusResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 30));
    const markers = await readMarkers();
    const statuses = Object.keys(COUNTS).map((module_key) => ({
      module_key,
      seeded_at: markers[module_key] ?? null,
    }));
    return { success: true, data: { statuses } };
  }
  const res = await fetch("/api/proxy/onboarding/sample-data/status", {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Sample-data status failed: ${res.status}`);
  return (await res.json()) as SampleDataStatusResponse;
}
