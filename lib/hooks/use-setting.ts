"use client";
/**
 * @module lib/hooks/use-setting
 * React hooks for the PlatformSettings Engine (cap 16).
 *
 * Pattern: every consumer reads its setting via this hook so the resolution
 * cache is shared across the app. Sensitive settings come back masked —
 * never plaintext. To write, modules use `usePlatformMutation` with
 * `setSetting` from lib/api/settings.
 *
 * Spec: docs/system-upgrade/04-capabilities/platform-settings-engine-spec.md
 */
import { useQuery } from "@tanstack/react-query";
import {
  fetchSetting,
  fetchSettingsByCategory,
  fetchSettingDefinitions,
} from "@/lib/api/settings";
import type {
  SettingValue,
  SettingCategory,
  SettingDefinition,
} from "@/lib/modules/settings/types";

const SETTINGS_QUERY_PREFIX = ["settings"] as const;

export interface UseSettingResult<T extends SettingValue = SettingValue> {
  setting: T | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function useSetting<T extends SettingValue = SettingValue>(
  key: string,
): UseSettingResult<T> {
  const { data, isLoading, isError } = useQuery({
    queryKey: [...SETTINGS_QUERY_PREFIX, "key", key],
    queryFn: () => fetchSetting(key),
    staleTime: 5 * 60_000,
    retry: false,
  });
  return {
    setting: (data?.data as T | undefined) ?? undefined,
    isLoading,
    isError,
  };
}

export function useSettingsByCategory(category: SettingCategory) {
  const { data, isLoading, isError } = useQuery({
    queryKey: [...SETTINGS_QUERY_PREFIX, "category", category],
    queryFn: () => fetchSettingsByCategory(category),
    staleTime: 5 * 60_000,
    retry: false,
  });
  return {
    settings: data?.data?.settings ?? [],
    isLoading,
    isError,
  };
}

export function useSettingDefinitions() {
  const { data, isLoading, isError } = useQuery({
    queryKey: [...SETTINGS_QUERY_PREFIX, "definitions"],
    queryFn: fetchSettingDefinitions,
    staleTime: 10 * 60_000,
    retry: false,
  });
  const definitions: SettingDefinition[] = data?.data?.definitions ?? [];
  return { definitions, isLoading, isError };
}

export const _settingsQueryPrefix = SETTINGS_QUERY_PREFIX;
