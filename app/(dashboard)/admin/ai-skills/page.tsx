"use client";
/**
 * @module app/(dashboard)/admin/ai-skills/page
 *
 * AISkillRegistry admin (Phase 2.2).
 *
 * Spec: docs/system-upgrade/04-capabilities/platform-ai-skill-registry-spec.md
 *
 * Lists every skill in the registry grouped by module + category, shows
 * risk level, parameter schema, current per-org enablement, and surfaces
 * `available_to_ai` (computed from module enablement + skill enablement +
 * ai_callable). Admin can flip per-skill enablement.
 */
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, LazyMotion, domAnimation } from "framer-motion";
import {
  Sparkles,
  Eye,
  Pencil,
  Trash2,
  Plug,
  Cpu,
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
  Skull,
  Power,
  PowerOff,
  CircleHelp,
  CheckCircle2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { PermissionGate } from "@/components/shared/permission-gate";
import { PageShell } from "@/components/shared/page-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchAISkills, setSkillEnablement } from "@/lib/api/ai-skills";
import { _aiSkillsQueryPrefix } from "@/lib/hooks/use-ai-skills";
import { usePlatformMutation } from "@/lib/hooks/use-platform-mutation";
import { useRegisterPageContext } from "@/lib/hooks/use-register-page-context";
import { PAGE_EASE } from "@/lib/ui/motion";
import type {
  SkillCategory,
  SkillRiskLevel,
  SkillEntry,
} from "@/lib/modules/ai-skills/types";

const CATEGORY_META: Record<SkillCategory, { icon: LucideIcon; label: string; tone: string }> = {
  read: {
    icon: Eye,
    label: "Read",
    tone: "border-cyan-500/30 bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  },
  mutate: {
    icon: Pencil,
    label: "Mutate",
    tone: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  destroy: {
    icon: Trash2,
    label: "Destroy",
    tone: "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-400",
  },
  external: {
    icon: Plug,
    label: "External",
    tone: "border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-400",
  },
  compute: {
    icon: Cpu,
    label: "Compute",
    tone: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
};

const RISK_META: Record<SkillRiskLevel, { icon: LucideIcon; tone: string }> = {
  low: {
    icon: ShieldCheck,
    tone: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
  medium: {
    icon: ShieldCheck,
    tone: "border-cyan-500/30 bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  },
  high: {
    icon: ShieldAlert,
    tone: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  critical: {
    icon: Skull,
    tone: "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-400",
  },
};

function SkillCard({ entry }: { entry: SkillEntry }) {
  const queryClient = useQueryClient();
  const mutation = usePlatformMutation({
    mutationFn: setSkillEnablement,
    onSuccess: (d) => {
      toast.success(d.message);
      void queryClient.invalidateQueries({ queryKey: _aiSkillsQueryPrefix });
    },
  });

  const { skill, enablement, available_to_ai } = entry;
  const cat = CATEGORY_META[skill.category];
  const risk = RISK_META[skill.risk_level];
  const CatIcon = cat.icon;
  const RiskIcon = risk.icon;

  return (
    <div className="glass border-border/50 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">
              {skill.label_he ?? skill.label}
            </span>
            <code className="text-[10px] text-muted-foreground font-mono">{skill.id}</code>
            <Badge variant="outline" className={cat.tone}>
              <CatIcon className="h-3 w-3 me-1" aria-hidden="true" />
              {cat.label}
            </Badge>
            <Badge variant="outline" className={risk.tone}>
              <RiskIcon className="h-3 w-3 me-1" aria-hidden="true" />
              {skill.risk_level}
            </Badge>
            {!skill.ai_callable && (
              <Badge
                variant="outline"
                className="text-[10px] border-muted text-muted-foreground"
              >
                <CircleHelp className="h-3 w-3 me-1" aria-hidden="true" />
                Human-only
              </Badge>
            )}
            {available_to_ai ? (
              <Badge
                variant="outline"
                className="text-[10px] border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
              >
                <CheckCircle2 className="h-3 w-3 me-1" aria-hidden="true" />
                Available to AI
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] border-muted text-muted-foreground">
                <PowerOff className="h-3 w-3 me-1" aria-hidden="true" />
                Not available
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{skill.description}</p>
          <div className="text-[11px] text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-1">
            <span>cost: <strong>{skill.estimated_cost_class}</strong></span>
            <span>policy: <code>{skill.policy_action_id}</code></span>
            {skill.required_permissions.length > 0 && (
              <span>permissions: {skill.required_permissions.join(", ")}</span>
            )}
            <span>source: {enablement.source}</span>
          </div>

          {/* Parameter schema preview */}
          <details className="mt-2 text-[11px]">
            <summary className="cursor-pointer text-muted-foreground">
              Parameters ({Object.keys(skill.parameter_schema.properties).length})
            </summary>
            <div className="mt-1 space-y-1 ms-2">
              {Object.entries(skill.parameter_schema.properties).map(([key, def]) => (
                <div key={key} className="font-mono">
                  <strong>{key}</strong>: {def.type}
                  {skill.parameter_schema.required.includes(key) && (
                    <span className="text-rose-600 dark:text-rose-400"> *required</span>
                  )}
                  {def.description && (
                    <span className="text-muted-foreground"> — {def.description}</span>
                  )}
                </div>
              ))}
            </div>
          </details>
        </div>

        <div className="flex gap-1 shrink-0">
          {enablement.enabled ? (
            <Button
              size="sm"
              variant="outline"
              disabled={mutation.isPending}
              onClick={() =>
                mutation.mutate({
                  skill_id: skill.id,
                  enabled: false,
                  reason: "Disabled via admin UI",
                })
              }
              aria-label={`Disable skill ${skill.id}`}
            >
              <PowerOff className="h-3.5 w-3.5 me-1" aria-hidden="true" />
              Disable
            </Button>
          ) : (
            <Button
              size="sm"
              variant="default"
              disabled={mutation.isPending}
              onClick={() =>
                mutation.mutate({
                  skill_id: skill.id,
                  enabled: true,
                  reason: "Enabled via admin UI",
                })
              }
              aria-label={`Enable skill ${skill.id}`}
            >
              <Power className="h-3.5 w-3.5 me-1" aria-hidden="true" />
              Enable
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function AISkillsInner() {
  const t = useTranslations("admin.aiSkills");
  const [activeModule, setActiveModule] = useState<string | "all">("all");
  const [aiCallableOnly, setAiCallableOnly] = useState(false);

  const filter = useMemo(
    () => ({
      module: activeModule === "all" ? undefined : activeModule,
      ai_callable: aiCallableOnly ? true : undefined,
    }),
    [activeModule, aiCallableOnly],
  );

  const { data, isLoading, error } = useQuery({
    queryKey: [..._aiSkillsQueryPrefix, "list", filter],
    queryFn: () => fetchAISkills(filter),
    staleTime: 5 * 60_000,
  });

  const entries = data?.data?.skills ?? [];
  const moduleCounts = data?.data?.module_counts ?? {};
  const moduleKeys = useMemo(
    () => Array.from(new Set(entries.map((e) => e.skill.module_key))).sort(),
    [entries],
  );

  const enabledCount = entries.filter((e) => e.enablement.enabled).length;
  const availableToAi = entries.filter((e) => e.available_to_ai).length;

  useRegisterPageContext({
    pageKey: "admin.ai-skills",
    route: "/admin/ai-skills",
    summary: `AI skills: ${entries.length} registered, ${enabledCount} enabled, ${availableToAi} available to AI.`,
    availableActions: ["admin.ai_skill.enablement.set"],
  });

  return (
    <LazyMotion features={domAnimation}>
      <PageShell icon={Sparkles} title={t("title")} subtitle={t("subtitle")}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: PAGE_EASE } }}
          className="space-y-4 pb-20 md:pb-0"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass border-border/50 rounded-xl p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t("kpi.registered")}</span>
                <Sparkles className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
              <span className="text-2xl font-semibold">{entries.length}</span>
            </div>
            <div className="glass border-border/50 rounded-xl p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t("kpi.enabled")}</span>
                <Power className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              </div>
              <span className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                {enabledCount}
              </span>
            </div>
            <div className="glass border-border/50 rounded-xl p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t("kpi.availableToAi")}</span>
                <CheckCircle2 className="h-4 w-4 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
              </div>
              <span className="text-2xl font-semibold text-cyan-600 dark:text-cyan-400">
                {availableToAi}
              </span>
            </div>
          </div>

          <div className="glass border-border/50 rounded-xl p-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Available to AI</span> = module enabled
            (cap 18) AND skill enabled here AND skill is `ai_callable`. Disabling a skill here
            removes it from the AI shell's `availableActions` for this org.
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={activeModule === "all" ? "default" : "outline"}
              onClick={() => setActiveModule("all")}
            >
              All ({Object.values(moduleCounts).reduce((a, b) => a + b, 0)})
            </Button>
            {moduleKeys.map((m) => (
              <Button
                key={m}
                size="sm"
                variant={activeModule === m ? "default" : "outline"}
                onClick={() => setActiveModule(m)}
              >
                {m} ({moduleCounts[m] ?? 0})
              </Button>
            ))}
            <div className="ms-auto flex items-center gap-2">
              <Button
                size="sm"
                variant={aiCallableOnly ? "default" : "outline"}
                onClick={() => setAiCallableOnly((v) => !v)}
                aria-pressed={aiCallableOnly}
              >
                AI-callable only
              </Button>
            </div>
          </div>

          {isLoading && (
            <div className="text-sm text-muted-foreground">Loading registry…</div>
          )}
          {error && (
            <EmptyState
              icon={AlertCircle}
              title="Could not load AI skills"
              description={(error as Error).message}
            />
          )}

          <div className="space-y-2">
            {entries.map((entry) => (
              <SkillCard key={entry.skill.id} entry={entry} />
            ))}
          </div>
        </motion.div>
      </PageShell>
    </LazyMotion>
  );
}

function AISkillsRestrictedFallback() {
  const t = useTranslations("admin.aiSkills");
  const tCommon = useTranslations("admin.common");
  return (
    <PageShell icon={Sparkles} title={t("title")} subtitle={tCommon("restricted")}>
      <EmptyState
        icon={AlertCircle}
        title={tCommon("permissionRequired")}
        description={t("permissionDescription")}
      />
    </PageShell>
  );
}

export default function AISkillsAdminPage() {
  return (
    <PermissionGate
      role={["org_admin", "system_admin"]}
      fallback={<AISkillsRestrictedFallback />}
    >
      <AISkillsInner />
    </PermissionGate>
  );
}
