"use client";
/**
 * @module lib/hooks/use-ai-skills
 * Hooks over PlatformAISkillRegistry (Phase 2.2).
 */
import { useQuery } from "@tanstack/react-query";
import { fetchAISkills, validateSkillInvocation } from "@/lib/api/ai-skills";
import type { ValidateSkillInput } from "@/lib/modules/ai-skills/types";

const QUERY_PREFIX = ["ai-skills"] as const;

interface UseAISkillsFilter {
  module?: string;
  ai_callable?: boolean;
  enabled_for_org?: boolean;
}

export function useAISkills(filter: UseAISkillsFilter = {}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: [...QUERY_PREFIX, "list", filter],
    queryFn: () => fetchAISkills(filter),
    staleTime: 5 * 60_000,
    retry: false,
  });
  return {
    skills: data?.data?.skills ?? [],
    moduleCounts: data?.data?.module_counts ?? {},
    isLoading,
    isError,
  };
}

export function useSkillValidation(input: ValidateSkillInput | null) {
  const { data, isLoading, isError } = useQuery({
    queryKey: [...QUERY_PREFIX, "validate", input?.skill_id, input?.params],
    queryFn: () => validateSkillInvocation(input as ValidateSkillInput),
    enabled: input !== null,
    staleTime: 30_000,
    retry: false,
  });
  return { validation: data?.data, isLoading, isError };
}

export const _aiSkillsQueryPrefix = QUERY_PREFIX;
