/**
 * @module lib/modules/onboarding/types
 * Types for PlatformOnboardingFinish (Phase 3.1).
 *
 * Spec: docs/system-upgrade/04-capabilities/platform-onboarding-finish-spec.md
 */

export interface SeededModule {
  module_key: string;
  count: number;
  not_seedable?: boolean;
}

export interface SeedSampleDataInput {
  modules: string[];
}

export interface SeedSampleDataResponse {
  success: boolean;
  data: {
    seeded: SeededModule[];
    total_resources: number;
  };
}

export interface SampleDataStatus {
  module_key: string;
  seeded_at: string | null;
}

export interface SampleDataStatusResponse {
  success: boolean;
  data: { statuses: SampleDataStatus[] };
}
