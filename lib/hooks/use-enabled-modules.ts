"use client";
/**
 * @module lib/hooks/use-enabled-modules
 * Hook over PlatformModuleRegistry (cap 18). Returns the list of modules
 * the current session has access to, with enablement + status resolved.
 *
 * Consumers:
 *   - sidebar nav (filters static groups by module key)
 *   - dashboard tile renderer
 *   - command palette navigation suggestions (cap 11)
 *   - executor registry (action scoping)
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchModules } from "@/lib/api/module-registry";
import { queryKeys } from "@/lib/api/query-keys";
import type { ModuleEntry } from "@/lib/modules/module-registry/types";

export function useEnabledModules() {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.moduleRegistry.modules(),
    queryFn: fetchModules,
    staleTime: 10 * 60_000,
    retry: false,
  });
  const all: ModuleEntry[] = data?.data?.modules ?? [];
  const enabled = useMemo(
    () => all.filter((m) => m.enablement.enabled && m.status === "healthy"),
    [all],
  );
  const enabledKeys = useMemo(() => new Set(enabled.map((m) => m.key)), [enabled]);

  return {
    /** Every known module with manifest + status (admin UI uses this). */
    all,
    /** Modules the user can actually use right now. */
    enabled,
    /** Quick lookup: is module key currently usable? */
    isEnabled: (key: string) => enabledKeys.has(key),
    isLoading,
    isError,
  };
}

export function useModuleStatus(key: string) {
  const { all, isLoading } = useEnabledModules();
  const entry = all.find((m) => m.key === key);
  return { entry, isLoading };
}

export const _moduleRegistryQueryKey = queryKeys.moduleRegistry.modules();
