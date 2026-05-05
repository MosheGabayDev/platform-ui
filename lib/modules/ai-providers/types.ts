/**
 * @module lib/modules/ai-providers/types
 * Types for PlatformAIProviderGateway (cap, Phase 2.1).
 *
 * Spec: docs/system-upgrade/04-capabilities/platform-ai-provider-gateway-spec.md
 */

export type ProviderCategory = "cloud" | "local" | "hosted" | "openai_compatible";
export type ProviderStatus = "stable" | "beta" | "experimental" | "deprecated";
export type AuthType = "api_key" | "iam" | "oauth" | "none";

export type ModelCapability =
  | "chat"
  | "tools"
  | "vision"
  | "thinking"
  | "embeddings";

export interface ProviderModel {
  id: string;
  display_name: string;
  context_window: number;
  cost_per_million_input_tokens: number;
  cost_per_million_output_tokens: number;
  capabilities: ModelCapability[];
  introduced_in: string;
  deprecated: boolean;
}

export interface AuthField {
  key: string;
  label: string;
  label_he?: string;
  type: "text" | "password" | "select";
  sensitive: boolean;
  required: boolean;
  placeholder?: string;
  /** For type=select. */
  options?: string[];
}

export interface AIProvider {
  id: string;
  name: string;
  description: string;
  category: ProviderCategory;
  models: ProviderModel[];
  auth: { type: AuthType; fields: AuthField[] };
  endpoint_default: string | null;
  endpoint_overridable: boolean;
  enabled_globally: boolean;
  introduced_in_version: string;
  status: ProviderStatus;
}

export type RoutingPurpose =
  | "chat"
  | "summarize"
  | "embedding"
  | "tool_call"
  | "*";

export interface RoutingMatch {
  purpose?: RoutingPurpose;
  action_id_pattern?: string;
  max_estimated_cost_usd?: number;
  min_context_tokens?: number;
}

export interface RoutingTarget {
  provider_id: string;
  model: string;
}

export interface RoutingRule {
  id: string;
  description: string;
  match: RoutingMatch;
  target: RoutingTarget;
  enabled: boolean;
  priority: number;
}

/** A credential value as returned to the client. Plaintext NEVER returned. */
export type CredentialValue = string | { has_value: true; masked: string };

export interface ProviderConfig {
  org_id: number;
  provider_id: string;
  enabled: boolean;
  credentials: Record<string, CredentialValue>;
  endpoint: string | null;
  default_model: string;
  routing_rules: RoutingRule[];
  monthly_budget_usd: number | null;
  last_test_at: string | null;
  last_test_ok: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProviderCatalogResponse {
  success: boolean;
  data: { providers: AIProvider[]; total: number };
}

export interface ProviderConfigsResponse {
  success: boolean;
  data: { configs: ProviderConfig[] };
}

export interface ProviderConfigResponse {
  success: boolean;
  data: { config: ProviderConfig };
}

export interface UpdateProviderConfigInput {
  provider_id: string;
  enabled?: boolean;
  /** New plaintext for sensitive fields; null clears. */
  credentials?: Record<string, string | null>;
  endpoint?: string | null;
  default_model?: string;
  routing_rules?: RoutingRule[];
  monthly_budget_usd?: number | null;
}

export interface TestConnectionResponse {
  success: boolean;
  data: {
    ok: boolean;
    latency_ms: number | null;
    tested_model: string | null;
    tested_at: string;
    error: string | null;
  };
}

export interface ResolveRoutingInput {
  purpose: RoutingPurpose;
  action_id?: string;
  estimated_input_tokens?: number;
  estimated_output_tokens?: number;
}

export interface ResolveRoutingResponse {
  success: boolean;
  data: {
    provider_id: string;
    model: string;
    estimated_cost_usd: number;
    matched_rule_id: string | null;
  };
}
