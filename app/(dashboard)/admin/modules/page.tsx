"use client";
/**
 * @module app/(dashboard)/admin/modules/page
 *
 * PlatformModuleRegistry admin (cap 18, Phase 1.3).
 *
 * Spec: docs/system-upgrade/04-capabilities/platform-module-registry-spec.md
 *
 * Lists every module with its manifest summary, current enablement, and
 * computed status. system_admin can toggle any module; org_admin can
 * toggle modules whose manifest declares org_admin_can_toggle=true.
 * Modules in non-healthy status (disabled_by_flag, unavailable) cannot
 * be toggled — the blocked_reason is shown instead.
 */
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { motion, LazyMotion, domAnimation } from "framer-motion";
import {
  Boxes,
  Bot,
  Layers,
  Cog,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Lock,
  AlertTriangle,
  Power,
  PowerOff,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { PermissionGate } from "@/components/shared/permission-gate";
import { PageShell } from "@/components/shared/page-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchModules, setModuleEnablement } from "@/lib/api/module-registry";
import { _moduleRegistryQueryKey } from "@/lib/hooks/use-enabled-modules";
import { usePlatformMutation } from "@/lib/hooks/use-platform-mutation";
import { useRegisterPageContext } from "@/lib/hooks/use-register-page-context";
import { PAGE_EASE } from "@/lib/ui/motion";
import type {
  ModuleCategory,
  ModuleEntry,
  ModuleStatus,
} from "@/lib/modules/module-registry/types";

const CATEGORY_META: Record<
  ModuleCategory,
  { icon: LucideIcon; label: string; tone: string }
> = {
  core: {
    icon: Boxes,
    label: "Core",
    tone: "border-slate-500/30 bg-slate-500/15 text-slate-700 dark:text-slate-400",
  },
  ai: {
    icon: Bot,
    label: "AI",
    tone: "border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-400",
  },
  operations: {
    icon: Layers,
    label: "Operations",
    tone: "border-cyan-500/30 bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  },
  growth: {
    icon: Sparkles,
    label: "Growth",
    tone: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
  experimental: {
    icon: Cog,
    label: "Experimental",
    tone: "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-400",
  },
};

function StatusBadge({ status }: { status: ModuleStatus }) {
  if (status === "healthy") {
    return (
      <Badge
        variant="outline"
        className="border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
      >
        <CheckCircle2 className="h-3 w-3 me-1" aria-hidden="true" />
        Healthy
      </Badge>
    );
  }
  if (status === "disabled_by_flag") {
    return (
      <Badge
        variant="outline"
        className="border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400"
      >
        <AlertTriangle className="h-3 w-3 me-1" aria-hidden="true" />
        Flag-disabled
      </Badge>
    );
  }
  if (status === "unavailable") {
    return (
      <Badge
        variant="outline"
        className="border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-400"
      >
        <Lock className="h-3 w-3 me-1" aria-hidden="true" />
        Plan-locked
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400"
    >
      <AlertTriangle className="h-3 w-3 me-1" aria-hidden="true" />
      {status}
    </Badge>
  );
}

function ModuleCard({ entry }: { entry: ModuleEntry }) {
  const queryClient = useQueryClient();
  const m = entry.manifest;
  const togglable = entry.status === "healthy" || entry.enablement.enabled;
  const mutation = usePlatformMutation({
    mutationFn: setModuleEnablement,
    onSuccess: (d) => {
      toast.success(d.message);
      void queryClient.invalidateQueries({ queryKey: _moduleRegistryQueryKey });
    },
  });

  return (
    <div className="glass border-border/50 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{m.label}</span>
            <span className="text-xs text-muted-foreground">{m.label_he}</span>
            <code className="text-[10px] text-muted-foreground font-mono">{m.key}</code>
            <Badge
              variant="outline"
              className="text-[10px] border-muted text-muted-foreground"
            >
              {m.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{m.description}</p>

          <div className="flex items-center gap-2 mt-2">
            <StatusBadge status={entry.status} />
            {entry.enablement.enabled ? (
              <Badge
                variant="outline"
                className="border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
              >
                <Power className="h-3 w-3 me-1" aria-hidden="true" />
                Enabled
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-muted text-muted-foreground"
              >
                <PowerOff className="h-3 w-3 me-1" aria-hidden="true" />
                Disabled
              </Badge>
            )}
          </div>

          {entry.blocked_reason && (
            <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-2">
              {entry.blocked_reason}
            </p>
          )}

          <div className="text-[10px] text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {m.required_flags.length > 0 && (
              <span>flags: {m.required_flags.join(", ")}</span>
            )}
            {m.required_plans.length > 0 && (
              <span>plans: {m.required_plans.join(" / ")}</span>
            )}
            {m.ai_actions.length > 0 && (
              <span>AI actions: {m.ai_actions.length}</span>
            )}
            {m.nav_entries.length > 0 && (
              <span>nav entries: {m.nav_entries.length}</span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1 shrink-0">
          {entry.enablement.enabled ? (
            <Button
              size="sm"
              variant="outline"
              disabled={mutation.isPending}
              onClick={() =>
                mutation.mutate({
                  key: m.key,
                  enabled: false,
                  reason: "Disabled via admin UI",
                })
              }
              aria-label={`Disable module ${m.label}`}
            >
              <PowerOff className="h-3.5 w-3.5 me-1" aria-hidden="true" />
              Disable
            </Button>
          ) : (
            <Button
              size="sm"
              variant="default"
              disabled={mutation.isPending || !togglable}
              onClick={() =>
                mutation.mutate({
                  key: m.key,
                  enabled: true,
                  reason: "Enabled via admin UI",
                })
              }
              aria-label={`Enable module ${m.label}`}
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

function ModulesInner() {
  const t = useTranslations("admin.modules");
  const [activeCategory, setActiveCategory] = useState<ModuleCategory | "all">("all");
  const { data, isLoading, error } = useQuery({
    queryKey: _moduleRegistryQueryKey,
    queryFn: fetchModules,
    staleTime: 5 * 60_000,
  });
  const modules = data?.data?.modules ?? [];

  const filtered = useMemo(
    () =>
      activeCategory === "all"
        ? modules
        : modules.filter((m) => m.manifest.category === activeCategory),
    [modules, activeCategory],
  );

  const enabledCount = modules.filter((m) => m.enablement.enabled).length;
  const blockedCount = modules.filter((m) => m.status !== "healthy").length;

  useRegisterPageContext({
    pageKey: "admin.modules",
    route: "/admin/modules",
    summary: `Modules admin: ${modules.length} registered, ${enabledCount} enabled, ${blockedCount} blocked.`,
    availableActions: ["admin.module.enable", "admin.module.disable"],
  });

  const filters: Array<{ value: ModuleCategory | "all" }> = [
    { value: "all" }, { value: "core" }, { value: "ai" },
    { value: "operations" }, { value: "growth" }, { value: "experimental" },
  ];

  return (
    <LazyMotion features={domAnimation}>
      <PageShell icon={Boxes} title={t("title")} subtitle={t("subtitle")}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: PAGE_EASE } }}
          className="space-y-4 pb-20 md:pb-0"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass border-border/50 rounded-xl p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t("kpi.registered")}</span>
                <Boxes className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
              <span className="text-2xl font-semibold">{modules.length}</span>
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
                <span className="text-xs text-muted-foreground">{t("kpi.blocked")}</span>
                <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              </div>
              <span className="text-2xl font-semibold text-amber-600 dark:text-amber-400">
                {blockedCount}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <Button
                key={f.value}
                size="sm"
                variant={activeCategory === f.value ? "default" : "outline"}
                onClick={() => setActiveCategory(f.value)}
              >
                {t(`categories.${f.value}`)}
              </Button>
            ))}
          </div>

          {isLoading && (
            <div className="text-sm text-muted-foreground">{t("loading")}</div>
          )}
          {error && (
            <EmptyState
              icon={AlertCircle}
              title={t("loading")}
              description={(error as Error).message}
            />
          )}

          <div className="space-y-2">
            {filtered.map((entry) => {
              const meta = CATEGORY_META[entry.manifest.category];
              const Icon = meta.icon;
              return (
                <div key={entry.key} className="space-y-1">
                  <div className="flex items-center gap-2 px-1">
                    <Badge variant="outline" className={meta.tone}>
                      <Icon className="h-3 w-3 me-1" aria-hidden="true" />
                      {t(`categories.${entry.manifest.category}`)}
                    </Badge>
                  </div>
                  <ModuleCard entry={entry} />
                </div>
              );
            })}
          </div>
        </motion.div>
      </PageShell>
    </LazyMotion>
  );
}

function ModulesRestrictedFallback() {
  const t = useTranslations("admin.modules");
  const tCommon = useTranslations("admin.common");
  return (
    <PageShell icon={Boxes} title={t("title")} subtitle={tCommon("restricted")}>
      <EmptyState
        icon={AlertCircle}
        title={tCommon("permissionRequired")}
        description={t("permissionDescription")}
      />
    </PageShell>
  );
}

export default function ModulesAdminPage() {
  return (
    <PermissionGate role={["org_admin", "system_admin"]} fallback={<ModulesRestrictedFallback />}>
      <ModulesInner />
    </PermissionGate>
  );
}

