/**
 * @module lib/modules/settings/types
 * Types for the PlatformSettings Engine (cap 16).
 *
 * Spec: docs/system-upgrade/04-capabilities/platform-settings-engine-spec.md
 */

export type SettingType = "string" | "int" | "bool" | "json" | "secret" | "enum";

export type SettingScope = "user" | "org" | "plan" | "system";

export type SettingSource = SettingScope | "default";

export type SettingCategory =
  | "ai"
  | "branding"
  | "notifications"
  | "rate_limits"
  | "integrations"
  | "experimental";

/**
 * Schema constraints attached to a definition. Frontend uses these for
 * client-side validation before PUT; backend re-validates authoritatively.
 */
export interface SettingSchema {
  // string
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  // int
  min?: number;
  max?: number;
  // enum
  allowed_values?: string[];
  // json (full JSON-Schema subset, draft-07)
  json_schema?: Record<string, unknown>;
}

export interface SettingDefinition {
  key: string;
  label: string;
  description: string;
  category: SettingCategory;
  type: SettingType;
  /** Schema constraints — null when type has no extra rules. */
  schema: SettingSchema | null;
  allowed_scopes: SettingScope[];
  is_sensitive: boolean;
  /** Default rendered when no scope has a value. JSON-serializable. */
  default_value: unknown;
  /** Roles allowed to write this setting. */
  write_roles: string[];
  introduced_in_version: string;
  deprecated: boolean;
}

/**
 * Read-side value envelope. Discriminated by `type` so consumers can
 * narrow without re-checking the definition.
 */
export type SettingValue =
  | {
      key: string;
      type: "string";
      value: string;
      source: SettingSource;
      is_sensitive: false;
    }
  | {
      key: string;
      type: "int";
      value: number;
      source: SettingSource;
      is_sensitive: false;
    }
  | {
      key: string;
      type: "bool";
      value: boolean;
      source: SettingSource;
      is_sensitive: false;
    }
  | {
      key: string;
      type: "json";
      value: unknown;
      source: SettingSource;
      is_sensitive: false;
    }
  | {
      key: string;
      type: "enum";
      value: string;
      source: SettingSource;
      is_sensitive: false;
    }
  | {
      key: string;
      type: "secret";
      /** Plaintext NEVER returned. has_value tells UI whether to render "(set)". */
      has_value: boolean;
      /** Masked hint, e.g. "sk-...XYZ" — safe to render. */
      masked: string | null;
      source: SettingSource;
      is_sensitive: true;
    };

export interface SettingResponse {
  success: boolean;
  data: SettingValue;
}

export interface SettingDefinitionsResponse {
  success: boolean;
  data: { definitions: SettingDefinition[]; total: number };
}

export interface SettingsByCategoryResponse {
  success: boolean;
  data: { category: SettingCategory; settings: SettingValue[] };
}

export interface SetSettingInput {
  key: string;
  scope: SettingScope;
  scope_id: number | null;
  /** null clears the override at the given scope. For secrets: the plaintext value. */
  value: unknown;
  reason?: string;
}

export interface SetSettingResponse {
  success: boolean;
  message: string;
  data: SettingValue;
}
