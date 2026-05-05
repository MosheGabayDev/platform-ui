"use client";
/**
 * @module lib/hooks/use-ai-provider-configs
 * Hooks over PlatformAIProviderGateway (Phase 2.1).
 *
 * Spec: docs/system-upgrade/04-capabilities/platform-ai-provider-gateway-spec.md
 */
import { useQuery } from "@tanstack/react-query";
import {
  fetchProviderCatalog,
  fetchProviderConfigs,
  fetchProviderConfig,
  resolveRouting,
} from "@/lib/api/ai-providers";
import type {
  AIProvider,
  ProviderConfig,
  ResolveRoutingInput,
} from "@/lib/modules/ai-providers/types";

const QUERY_PREFIX = ["ai-providers"] as const;

export function useProviderCatalog() {
  const { data, isLoading, isError } = useQuery({
    queryKey: [...QUERY_PREFIX, "catalog"],
    queryFn: fetchProviderCatalog,
    staleTime: 60 * 60_000,
    retry: false,
  });
  const providers: AIProvider[] = data?.data?.providers ?? [];
  return { providers, isLoading, isError };
}

export function useProviderConfigs() {
  const { data, isLoading, isError } = useQuery({
    queryKey: [...QUERY_PREFIX, "configs"],
    queryFn: fetchProviderConfigs,
    staleTime: 5 * 60_000,
    retry: false,
  });
  const configs: ProviderConfig[] = data?.data?.configs ?? [];
  return { configs, isLoading, isError };
}

export function useProviderConfig(providerId: string | null) {
  const { data, isLoading, isError } = useQuery({
    queryKey: [...QUERY_PREFIX, "config", providerId],
    queryFn: () => fetchProviderConfig(providerId as string),
    enabled: providerId !== null,
    staleTime: 5 * 60_000,
    retry: false,
  });
  return { config: data?.data?.config, isLoading, isError };
}

export function useRoutingDecision(input: ResolveRoutingInput | null) {
  const { data, isLoading, isError } = useQuery({
    queryKey: [
      ...QUERY_PREFIX,
      "resolve",
      input?.purpose,
      input?.action_id,
      input?.estimated_input_tokens,
      input?.estimated_output_tokens,
    ],
    queryFn: () => resolveRouting(input as ResolveRoutingInput),
    enabled: input !== null,
    staleTime: 30_000,
    retry: false,
  });
  return { decision: data?.data, isLoading, isError };
}

export const _aiProvidersQueryPrefix = QUERY_PREFIX;
