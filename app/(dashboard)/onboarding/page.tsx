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
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-muted-foreground" htmlFor="org-name">
          Organization name
        </label>
        <Input
          id="org-name"
          value={state.org_name}
          onChange={(e) => update({ org_name: e.target.value })}
          placeholder="e.g. Acme Corporation"
          maxLength={100}
        />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Accent color</label>
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
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-muted-foreground" htmlFor="persona-name">
          AI persona name
        </label>
        <Input
          id="persona-name"
          value={state.persona_name}
          onChange={(e) => update({ persona_name: e.target.value })}
          placeholder="e.g. Acme Helper"
          maxLength={60}
        />
      </div>
      <div>
        <label className="text-xs text-muted-foreground" htmlFor="default-model">
          Default LLM model
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
      {isLoading && <div className="text-sm text-muted-foreground">Loading modules…</div>}
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
                    Flag-disabled
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
              {checked ? "On" : "Off"}
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
  const enabled = Object.entries(state.modules_to_enable)
    .filter(([, v]) => v)
    .map(([k]) => k);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Seed the modules you just enabled with realistic sample data so the dashboard
        and AI assistant have content to show on day one.
      </p>
      <div className="flex items-center justify-between gap-2 p-3 rounded-md border border-border/50">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">Seed sample data</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {enabled.length > 0
              ? `Will seed: ${enabled.join(", ")}`
              : "No modules enabled — nothing to seed."}
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
          {state.seed_sample_data ? "On" : "Off"}
        </Button>
      </div>
    </div>
  );
}

function SummaryStep({ state }: { state: OnboardingState }) {
  const enabledModules = Object.entries(state.modules_to_enable)
    .filter(([, v]) => v)
    .map(([k]) => k);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" aria-hidden="true" />
        <span>Ready to apply your configuration:</span>
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-muted-foreground">Organization</dt>
          <dd className="font-mono">{state.org_name || "(unnamed)"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Accent</dt>
          <dd className="font-mono">{state.accent}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">AI persona</dt>
          <dd className="font-mono">{state.persona_name}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Default model</dt>
          <dd className="font-mono">{state.default_model}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground">Modules to enable</dt>
          <dd className="font-mono">
            {enabledModules.length > 0 ? enabledModules.join(", ") : "(none)"}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground">Sample data</dt>
          <dd className="font-mono">{state.seed_sample_data ? "Yes (will seed)" : "No"}</dd>
        </div>
      </dl>
      <p className="text-xs text-muted-foreground">
        Click <strong>Finish</strong> to apply. You can change all of these later in
        Admin → Settings, Modules, and Feature flags.
      </p>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();

  const config: WizardConfig<OnboardingState> = {
    storageKey: "wizard:onboarding:v1",
    title: "Welcome — let's set up your platform",
    title_he: "ברוך הבא — נגדיר יחד את הפלטפורמה",
    initialState: INITIAL_STATE,
    steps: [
      {
        id: "org",
        label: "Organization",
        label_he: "ארגון",
        description: "Pick a display name and accent color for your tenant.",
        render: (props) => <OrgStep {...props} />,
        validate: (s) =>
          s.org_name.trim().length < 2
            ? "Organization name must be at least 2 characters."
            : null,
      },
      {
        id: "ai",
        label: "AI configuration",
        label_he: "תצורת AI",
        description: "Default model and persona for the AI assistant.",
        render: (props) => <AIStep {...props} />,
        validate: (s) =>
          s.persona_name.trim().length < 2
            ? "Persona name must be at least 2 characters."
            : null,
      },
      {
        id: "modules",
        label: "Modules",
        label_he: "מודולים",
        description: "Pick which modules to enable now. You can change this later.",
        render: (props) => <ModulesStep {...props} />,
        optional: true,
      },
      {
        id: "sample-data",
        label: "Sample data",
        label_he: "נתוני דוגמה",
        description: "Seed your enabled modules with realistic content.",
        render: (props) => <SampleDataStep {...props} />,
        optional: true,
      },
      {
        id: "summary",
        label: "Review",
        label_he: "סיכום",
        description: "Final check before applying.",
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
            `Seeded ${seedRes.data.total_resources} sample resources across ${seedRes.data.seeded.filter((s) => !s.not_seedable).length} modules.`,
          );
        }
      }

      toast.success("Setup complete! Welcome to your platform.");
      router.push("/?tour=first-ai");
    },
    onCancel: () => {
      router.push("/");
    },
  };

  return (
    <LazyMotion features={domAnimation}>
      <PageShell
        icon={CheckCircle2}
        title="Onboarding"
        subtitle="Configure your tenant in 4 steps"
      >
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
