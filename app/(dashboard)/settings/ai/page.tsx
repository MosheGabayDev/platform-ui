"use client";
/**
 * @module app/(dashboard)/settings/ai/page
 *
 * Self-service AI settings page (Phase 3.2).
 *
 * Spec: docs/system-upgrade/04-capabilities/platform-self-service-ai-settings-spec.md
 *
 * Opinionated, focused form over the four most-important AI knobs:
 * persona name, system prompt, default model, max tokens. Reads/writes
 * via cap 16 (Settings Engine) at scope=org. Sources the model list
 * from cap 2.1 (AI Provider catalog).
 *
 * RBAC: org_admin or system_admin (Settings Engine re-checks).
 */
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { motion, LazyMotion, domAnimation } from "framer-motion";
import {
  Bot,
  Sparkles,
  AlertCircle,
  Save,
  RotateCcw,
  Cpu,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { PermissionGate } from "@/components/shared/permission-gate";
import { PageShell } from "@/components/shared/page-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSetting } from "@/lib/hooks/use-setting";
import { useProviderCatalog } from "@/lib/hooks/use-ai-provider-configs";
import { setSetting } from "@/lib/api/settings";
import { usePlatformMutation } from "@/lib/hooks/use-platform-mutation";
import { useRegisterPageContext } from "@/lib/hooks/use-register-page-context";
import { PAGE_EASE } from "@/lib/ui/motion";

interface DraftState {
  persona_name: string;
  system_prompt: string;
  default_model: string;
  max_tokens_per_message: number;
}

interface ModelOption {
  id: string;
  display_name: string;
  provider_name: string;
  cost_in: number;
  cost_out: number;
}

function AISettingsInner() {
  const t = useTranslations("selfServiceAi");
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const orgId = session?.user?.org_id ?? 1;

  // Live values from Settings Engine
  const personaName = useSetting("ai.persona_name");
  const systemPrompt = useSetting("ai.system_prompt");
  const defaultModel = useSetting("ai.default_model");
  const maxTokens = useSetting("ai.max_tokens_per_message");

  // Model catalog from AI Provider Gateway
  const { providers } = useProviderCatalog();
  const modelOptions: ModelOption[] = useMemo(() => {
    return providers.flatMap((p) =>
      p.models.map((m) => ({
        id: m.id,
        display_name: m.display_name,
        provider_name: p.name,
        cost_in: m.cost_per_million_input_tokens,
        cost_out: m.cost_per_million_output_tokens,
      })),
    );
  }, [providers]);

  // Local draft seeded from settings on first load
  const [draft, setDraft] = useState<DraftState | null>(null);
  useEffect(() => {
    if (
      personaName.setting?.type === "string" &&
      systemPrompt.setting?.type === "string" &&
      defaultModel.setting?.type === "enum" &&
      maxTokens.setting?.type === "int" &&
      draft === null
    ) {
      setDraft({
        persona_name: personaName.setting.value,
        system_prompt: systemPrompt.setting.value,
        default_model: defaultModel.setting.value,
        max_tokens_per_message: maxTokens.setting.value,
      });
    }
  }, [personaName.setting, systemPrompt.setting, defaultModel.setting, maxTokens.setting, draft]);

  const save = usePlatformMutation({
    mutationFn: async (next: DraftState) => {
      await Promise.all([
        setSetting({ key: "ai.persona_name", scope: "org", scope_id: orgId, value: next.persona_name }),
        setSetting({ key: "ai.system_prompt", scope: "org", scope_id: orgId, value: next.system_prompt }),
        setSetting({ key: "ai.default_model", scope: "org", scope_id: orgId, value: next.default_model }),
        setSetting({
          key: "ai.max_tokens_per_message",
          scope: "org",
          scope_id: orgId,
          value: next.max_tokens_per_message,
        }),
      ]);
      return { success: true } as const;
    },
    onSuccess: () => {
      toast.success("AI settings saved.");
      void queryClient.invalidateQueries({ queryKey: queryKeys.settings.all() });
    },
  });

  const isLoading =
    personaName.isLoading ||
    systemPrompt.isLoading ||
    defaultModel.isLoading ||
    maxTokens.isLoading;

  useRegisterPageContext({
    pageKey: "settings.ai",
    route: "/settings/ai",
    summary: draft
      ? `Self-service AI settings: persona "${draft.persona_name}", model ${draft.default_model}, max ${draft.max_tokens_per_message} tokens.`
      : "Self-service AI settings (loading)",
    availableActions: ["settings.ai.save"],
  });

  function reset() {
    if (
      personaName.setting?.type === "string" &&
      systemPrompt.setting?.type === "string" &&
      defaultModel.setting?.type === "enum" &&
      maxTokens.setting?.type === "int"
    ) {
      setDraft({
        persona_name: personaName.setting.value,
        system_prompt: systemPrompt.setting.value,
        default_model: defaultModel.setting.value,
        max_tokens_per_message: maxTokens.setting.value,
      });
      toast.info("Reverted unsaved changes.");
    }
  }

  // ---- Validation ----
  const errors: Partial<Record<keyof DraftState, string>> = {};
  if (draft) {
    if (draft.persona_name.length < 2) errors.persona_name = "At least 2 characters required.";
    if (draft.persona_name.length > 60) errors.persona_name = "Name too long (max 60).";
    if (draft.system_prompt.length < 10)
      errors.system_prompt = "Prompt too short (at least 10 characters).";
    if (draft.system_prompt.length > 4000)
      errors.system_prompt = "Prompt too long (max 4000).";
    if (draft.max_tokens_per_message < 256)
      errors.max_tokens_per_message = "Minimum 256.";
    if (draft.max_tokens_per_message > 16000)
      errors.max_tokens_per_message = "Maximum 16000.";
  }
  const hasErrors = Object.keys(errors).length > 0;

  // ---- Preview ----
  const selectedModel = modelOptions.find((m) => m.id === draft?.default_model);
  const previewText = draft
    ? `Hi, I'm ${draft.persona_name}. I'll use ${selectedModel?.display_name ?? draft.default_model} to help with your operations questions.`
    : "";

  return (
    <LazyMotion features={domAnimation}>
      <PageShell icon={Bot} title={t("title")} subtitle={t("subtitle")}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: PAGE_EASE } }}
          className="space-y-4 pb-20 md:pb-0"
        >
          {isLoading || !draft ? (
            <div className="text-sm text-muted-foreground">{t("loading")}</div>
          ) : (
            <>
              {/* Persona card */}
              <section className="glass border-border/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" aria-hidden="true" />
                  <h2 className="font-medium text-sm">Persona</h2>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground" htmlFor="persona-name">
                    Display name
                  </label>
                  <Input
                    id="persona-name"
                    value={draft.persona_name}
                    onChange={(e) =>
                      setDraft({ ...draft, persona_name: e.target.value })
                    }
                    maxLength={60}
                    aria-invalid={Boolean(errors.persona_name)}
                    aria-describedby={errors.persona_name ? "persona-name-error" : undefined}
                  />
                  {errors.persona_name && (
                    <p
                      id="persona-name-error"
                      className="text-xs text-rose-600 dark:text-rose-400"
                    >
                      {errors.persona_name}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground" htmlFor="system-prompt">
                    System prompt
                  </label>
                  <Textarea
                    id="system-prompt"
                    value={draft.system_prompt}
                    onChange={(e) =>
                      setDraft({ ...draft, system_prompt: e.target.value })
                    }
                    rows={5}
                    maxLength={4000}
                    placeholder="You are a helpful operations assistant for {org_name}…"
                    aria-invalid={Boolean(errors.system_prompt)}
                    aria-describedby={errors.system_prompt ? "system-prompt-error" : undefined}
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>
                      Tip: use <code>{"{org_name}"}</code> as a placeholder.
                    </span>
                    <span>{draft.system_prompt.length}/4000</span>
                  </div>
                  {errors.system_prompt && (
                    <p
                      id="system-prompt-error"
                      className="text-xs text-rose-600 dark:text-rose-400"
                    >
                      {errors.system_prompt}
                    </p>
                  )}
                </div>
              </section>

              {/* Model card */}
              <section className="glass border-border/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
                  <h2 className="font-medium text-sm">Model</h2>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground" htmlFor="default-model">
                    Default model
                  </label>
                  <select
                    id="default-model"
                    value={draft.default_model}
                    onChange={(e) =>
                      setDraft({ ...draft, default_model: e.target.value })
                    }
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm w-full"
                  >
                    {modelOptions.map((m) => (
                      <option key={`${m.provider_name}::${m.id}`} value={m.id}>
                        {m.provider_name} · {m.display_name}
                        {m.cost_in > 0
                          ? ` ($${m.cost_in}/M in · $${m.cost_out}/M out)`
                          : " (free / local)"}
                      </option>
                    ))}
                  </select>
                  {selectedModel && (
                    <p className="text-[11px] text-muted-foreground">
                      Estimated cost: ${selectedModel.cost_in.toFixed(2)}/M input tokens,
                      ${selectedModel.cost_out.toFixed(2)}/M output tokens.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label
                    className="text-xs text-muted-foreground"
                    htmlFor="max-tokens"
                  >
                    Max tokens per response
                  </label>
                  <Input
                    id="max-tokens"
                    type="number"
                    min={256}
                    max={16000}
                    step={64}
                    value={draft.max_tokens_per_message}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        max_tokens_per_message:
                          Number.isFinite(Number(e.target.value))
                            ? Math.trunc(Number(e.target.value))
                            : 0,
                      })
                    }
                    aria-invalid={Boolean(errors.max_tokens_per_message)}
                  />
                  {errors.max_tokens_per_message ? (
                    <p className="text-xs text-rose-600 dark:text-rose-400">
                      {errors.max_tokens_per_message}
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      Hard cap on response length — prevents runaway costs.
                    </p>
                  )}
                </div>
              </section>

              {/* Preview card */}
              <section className="glass border-border/50 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <MessageSquare
                    className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
                    aria-hidden="true"
                  />
                  <h2 className="font-medium text-sm">Preview</h2>
                </div>
                <p className="text-sm text-muted-foreground italic" data-testid="ai-settings-preview">
                  {previewText}
                </p>
              </section>

              {/* Action buttons */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={reset}
                  disabled={save.isPending}
                >
                  <RotateCcw className="h-3.5 w-3.5 me-1" aria-hidden="true" />
                  Reset
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  disabled={save.isPending || hasErrors || !draft}
                  onClick={() => draft && save.mutate(draft)}
                >
                  <Save className="h-3.5 w-3.5 me-1" aria-hidden="true" />
                  Save changes
                </Button>
              </div>
              {save.serverError && (
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  {save.serverError}
                </p>
              )}
            </>
          )}
        </motion.div>
      </PageShell>
    </LazyMotion>
  );
}

export default function SelfServiceAISettingsPage() {
  return (
    <PermissionGate
      role={["org_admin", "system_admin"]}
      fallback={<AISettingsRestrictedFallback />}
    >
      <AISettingsInner />
    </PermissionGate>
  );
}

function AISettingsRestrictedFallback() {
  const t = useTranslations("selfServiceAi");
  const tCommon = useTranslations("admin.common");
  return (
    <PageShell icon={Bot} title={t("title")} subtitle={tCommon("restricted")}>
      <EmptyState
        icon={AlertCircle}
        title={tCommon("permissionRequired")}
        description={t("permissionDescription")}
      />
    </PageShell>
  );
}
