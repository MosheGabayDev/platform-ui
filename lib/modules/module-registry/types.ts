/**
 * @module lib/modules/module-registry/types
 * Types for PlatformModuleRegistry (cap 18).
 *
 * Spec: docs/system-upgrade/04-capabilities/platform-module-registry-spec.md
 */

export type ModuleCategory =
  | "core"
  | "ai"
  | "operations"
  | "growth"
  | "experimental";

export type ModuleLifecycle = "stable" | "beta" | "experimental" | "deprecated";

export type ModuleStatus =
  | "healthy"
  | "degraded"
  | "disabled_by_flag"
  | "unavailable";

export type EnablementSource =
  | "org_override"
  | "plan_default"
  | "system_default";

export interface NavEntry {
  label: string;
  label_he: string;
  href: string;
  icon: string;
  order: number;
  badge_query?: { module: string; metric: string };
}

export interface ModuleManifest {
  key: string;
  label: string;
  label_he: string;
  description: string;
  category: ModuleCategory;
  icon: string;

  base_route: string;
  nav_entries: NavEntry[];

  ai_actions: string[];
  permissions: string[];
  search_types: string[];

  introduced_in_version: string;
  status: ModuleLifecycle;

  required_flags: string[];
  required_plans: string[];
  conflicts_with: string[];

  dashboard_tile: { enabled: boolean; size: "sm" | "md" | "lg" } | null;
  default_landing: string;

  /** Whether org_admin can toggle, or only system_admin. */
  org_admin_can_toggle: boolean;
}

export interface ModuleEnablement {
  enabled: boolean;
  enabled_at: string | null;
  enabled_by_user_id: number | null;
  source: EnablementSource;
}

export interface ModuleEntry {
  key: string;
  manifest: ModuleManifest;
  enablement: ModuleEnablement;
  status: ModuleStatus;
  blocked_reason: string | null;
}

export interface ModuleListResponse {
  success: boolean;
  data: { modules: ModuleEntry[]; total: number };
}

export interface SetEnablementInput {
  key: string;
  enabled: boolean;
  reason?: string;
}

export interface SetEnablementResponse {
  success: boolean;
  message: string;
  data: { module: ModuleEntry };
}
