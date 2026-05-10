"use client";
/**
 * @module app/(dashboard)/onboarding/page
 *
 * First consumer of PlatformWizard (cap 15). Smoke-tests the full
 * Phase 1 stack: writes settings (cap 16), reads + toggles modules
 * (cap 18), uses feature flags + audit log indirectly.
 *
 * Spec: docs/system-upgrade/04-capabilities/platform-wizard-spec.md §8
 */
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { motion, LazyMotion, domAnimation } from "framer-motion";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/shared/page-shell";
import { Wizard } from "@/components/shared/wizard/wizard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { setSetting } from "@/lib/api/settings";
import {
  fetchModules,
  setModuleEnablement,
} from "@/lib/api/module-registry";
import { seedSampleData } from "@/lib/api/sample-data";
import { queryKeys } from "@/lib/api/query-keys";
import { PAGE_EASE } from "@/lib/ui/motion";
import type { WizardConfig } from "@/lib/modules/wizard/types";

const ACCENT_OPTIONS = ["cyan", "violet", "emerald", "amber", "rose", "slate"] as const;
type AccentColor = (typeof ACCENT_OPTIONS)[number];

const MODEL_OPTIONS = [
  "claude-opus-4-7",
  "claude-sonnet-4-6",
  "claude-haiku-4-5",
  "gpt-5",
  "gpt-5-mini",
] as const;

interface OnboardingState {
  org_name: string;
  accent: AccentColor;
  default_model: string;
  persona_name: string;
  modules_to_enable: Record<string, boolean>;
  seed_sample_data: boolean;
}

const INITIAL_STATE: OnboardingState = {
  org_name: "",
  accent: "cyan",
  default_model: "claude-sonnet-4-6",
  persona_name: "Platform Assistant",
  modules_to_enable: {
    helpdesk: true,
    "audit-log": true,
    monitoring: true,
  },
  seed_sample_data: true,
};

function OrgStep({
  state,
  update,
}: {
  state: OnboardingState;
  update: (patch: Partial<OnboardingState>) => void;
}) {
  const t = useTranslations("onboarding.fields");
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-muted-foreground" htmlFor="org-name">
          {t("orgName")}
        </label>
        <Input
          id="org-name"
          value={state.org_name}
          onChange={(e) => update({ org_name: e.target.value })}
          placeholder={t("orgNamePlaceholder")}
          maxLength={100}
        />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">{t("accent")}</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {ACCENT_OPTIONS.map((c) => (
            <Button
              key={c}
              size="sm"
              variant={state.accent === c ? "default" : "outline"}
              onClick={() => update({ accent: c })}
            >
              {c}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AIStep({
  state,
  update,
}: {
  state: OnboardingState;
  update: (patch: Partial<OnboardingState>) => void;
}) {
  const t = useTranslations("onboarding.fields");
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-muted-foreground" htmlFor="persona-name">
          {t("persona")}
        </label>
        <Input
          id="persona-name"
          value={state.persona_name}
          onChange={(e) => update({ persona_name: e.target.value })}
          placeholder={t("personaPlaceholder")}
          maxLength={60}
        />
      </div>
      <div>
        <label className="text-xs text-muted-foreground" htmlFor="default-model">
          {t("defaultModel")}
        </label>
        <select
          id="default-model"
          value={state.default_model}
          onChange={(e) => update({ default_model: e.target.value })}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm w-full mt-1"
        >
          {MODEL_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function ModulesStep({
  state,
  update,
}: {
  state: OnboardingState;
  update: (patch: Partial<OnboardingState>) => void;
}) {
  const t = useTranslations("onboarding.modules");
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.moduleRegistry.modules(),
    queryFn: fetchModules,
    staleTime: 5 * 60_000,
  });
  const modules = data?.data?.modules ?? [];
  const togglable = modules.filter(
    (m) => m.manifest.org_admin_can_toggle && m.status !== "unavailable",
  );

  function toggle(key: string) {
    const current = state.modules_to_enable[key] ?? false;
    update({
      modules_to_enable: { ...state.modules_to_enable, [key]: !current },
    });
  }

  return (
    <div className="space-y-2">
      {isLoading && <div className="text-sm text-muted-foreground">{t("loading")}</div>}
      {togglable.map((m) => {
        const checked = state.modules_to_enable[m.key] ?? false;
        return (
          <div
            key={m.key}
            className="flex items-start justify-between gap-2 p-2 rounded-md border border-border/50"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{m.manifest.label_he || m.manifest.label}</span>
                <Badge variant="outline" className="text-[10px] border-muted text-muted-foreground">
                  {m.manifest.category}
                </Badge>
                {m.status === "disabled_by_flag" && (
                  <Badge variant="outline" className="text-[10px] border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400">
                    {t("flagDisabled")}
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {m.manifest.description}
              </p>
            </div>
            <Button
              size="sm"
              variant={checked ? "default" : "outline"}
              onClick={() => toggle(m.key)}
            >
              {checked ? t("on") : t("off")}
            </Button>
          </div>
        );
      })}
    </div>
  );
}

function SampleDataStep({
  state,
  update,
}: {
  state: OnboardingState;
  update: (patch: Partial<OnboardingState>) => void;
}) {
  const t = useTranslations("onboarding.sample");
  const tModules = useTranslations("onboarding.modules");
  const enabled = Object.entries(state.modules_to_enable)
    .filter(([, v]) => v)
    .map(([k]) => k);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("intro")}</p>
      <div className="flex items-center justify-between gap-2 p-3 rounded-md border border-border/50">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{t("label")}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {enabled.length > 0
              ? t("willSeed", { modules: enabled.join(", ") })
              : t("none")}
          </div>
        </div>
        <Button
          size="sm"
          variant={state.seed_sample_data ? "default" : "outline"}
          onClick={() => update({ seed_sample_data: !state.seed_sample_data })}
          disabled={enabled.length === 0}
          aria-pressed={state.seed_sample_data}
          data-testid="seed-sample-data-toggle"
        >
          {state.seed_sample_data ? tModules("on") : tModules("off")}
        </Button>
      </div>
    </div>
  );
}

function SummaryStep({ state }: { state: OnboardingState }) {
  const t = useTranslations("onboarding.summary");
  const enabledModules = Object.entries(state.modules_to_enable)
    .filter(([, v]) => v)
    .map(([k]) => k);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" aria-hidden="true" />
        <span>{t("intro")}</span>
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-muted-foreground">{t("organization")}</dt>
          <dd className="font-mono">{state.org_name || t("unnamed")}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("accent")}</dt>
          <dd className="font-mono">{state.accent}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("persona")}</dt>
          <dd className="font-mono">{state.persona_name}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("defaultModel")}</dt>
          <dd className="font-mono">{state.default_model}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground">{t("modules")}</dt>
          <dd className="font-mono">
            {enabledModules.length > 0 ? enabledModules.join(", ") : t("none")}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground">{t("sampleData")}</dt>
          <dd className="font-mono">{state.seed_sample_data ? t("seedYes") : t("seedNo")}</dd>
        </div>
      </dl>
      <p className="text-xs text-muted-foreground">
        {t.rich("finishHint", { b: (chunks) => <strong>{chunks}</strong> })}
      </p>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const t = useTranslations("onboarding");

  const config: WizardConfig<OnboardingState> = {
    storageKey: "wizard:onboarding:v1",
    title: t("title"),
    title_he: t("title"),
    initialState: INITIAL_STATE,
    steps: [
      {
        id: "org",
        label: t("steps.org.label"),
        label_he: t("steps.org.label"),
        description: t("steps.org.description"),
        render: (props) => <OrgStep {...props} />,
        validate: (s) =>
          s.org_name.trim().length < 2 ? t("validation.orgNameTooShort") : null,
      },
      {
        id: "ai",
        label: t("steps.ai.label"),
        label_he: t("steps.ai.label"),
        description: t("steps.ai.description"),
        render: (props) => <AIStep {...props} />,
        validate: (s) =>
          s.persona_name.trim().length < 2 ? t("validation.personaNameTooShort") : null,
      },
      {
        id: "modules",
        label: t("steps.modules.label"),
        label_he: t("steps.modules.label"),
        description: t("steps.modules.description"),
        render: (props) => <ModulesStep {...props} />,
        optional: true,
      },
      {
        id: "sample-data",
        label: t("steps.sampleData.label"),
        label_he: t("steps.sampleData.label"),
        description: t("steps.sampleData.description"),
        render: (props) => <SampleDataStep {...props} />,
        optional: true,
      },
      {
        id: "summary",
        label: t("steps.summary.label"),
        label_he: t("steps.summary.label"),
        description: t("steps.summary.description"),
        render: (props) => <SummaryStep state={props.state} />,
      },
    ],
    onComplete: async (state) => {
      // 1. Settings writes (cap 16)
      const settingsCalls: Promise<unknown>[] = [
        setSetting({ key: "branding.org_name", scope: "org", scope_id: 1, value: state.org_name }),
        setSetting({ key: "branding.accent_color", scope: "org", scope_id: 1, value: state.accent }),
        setSetting({ key: "ai.default_model", scope: "org", scope_id: 1, value: state.default_model }),
        setSetting({ key: "ai.persona_name", scope: "org", scope_id: 1, value: state.persona_name }),
      ];
      await Promise.all(settingsCalls);

      // 2. Module enablement writes (cap 18)
      const moduleCalls = Object.entries(state.modules_to_enable).map(
        ([key, enabled]) =>
          setModuleEnablement({ key, enabled, reason: "Onboarding wizard" }),
      );
      await Promise.all(moduleCalls);

      // 3. Sample data seeding (Phase 3.1) — only the modules the user enabled.
      if (state.seed_sample_data) {
        const enabledKeys = Object.entries(state.modules_to_enable)
          .filter(([, v]) => v)
          .map(([k]) => k);
        if (enabledKeys.length > 0) {
          const seedRes = await seedSampleData({ modules: enabledKeys });
          toast.success(
            t("completion.seeded", {
              count: seedRes.data.total_resources,
              modules: seedRes.data.seeded.filter((s) => !s.not_seedable).length,
            }),
          );
        }
      }

      toast.success(t("completion.setupComplete"));
      router.push("/?tour=first-ai");
    },
    onCancel: () => {
      router.push("/");
    },
  };

  return (
    <LazyMotion features={domAnimation}>
      <PageShell icon={CheckCircle2} title={t("header")} subtitle={t("headerSubtitle")}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: PAGE_EASE } }}
        >
          <Wizard config={config} />
        </motion.div>
      </PageShell>
    </LazyMotion>
  );
}
