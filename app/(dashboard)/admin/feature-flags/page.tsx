"use client";
/**
 * @module app/(dashboard)/admin/feature-flags/page
 *
 * PlatformFeatureFlags admin surface (cap 17, Phase 1.1).
 *
 * Spec: docs/system-upgrade/04-capabilities/platform-feature-flags-spec.md
 *
 * Lists all known flags grouped by category, shows the effective value +
 * resolution source per flag, and lets system_admin set/clear an org-scope
 * override. User-scope overrides are out-of-scope for the initial UI
 * (Q-FF-2 — only system_admin debug use case, defer until needed).
 *
 * RBAC: gated by PermissionGate role=system_admin. Backend MUST re-check.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { motion, LazyMotion, domAnimation } from "framer-motion";
import {
  Flag,
  Bot,
  Layers,
  Plug,
  Cog,
  FlaskConical,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RotateCcw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { PermissionGate } from "@/components/shared/permission-gate";
import { PageShell } from "@/components/shared/page-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  fetchFeatureFlagDefinitions,
  fetchFeatureFlag,
  setFeatureFlagOverride,
  type FlagDefinition,
  type FlagSource,
  type FlagKey,
} from "@/lib/api/feature-flags";
import { usePlatformMutation } from "@/lib/hooks/use-platform-mutation";
import { useRegisterPageContext } from "@/lib/hooks/use-register-page-context";
import { PAGE_EASE } from "@/lib/ui/motion";
import { useQueryClient } from "@tanstack/react-query";

const CATEGORY_META: Record<
  FlagDefinition["category"],
  { icon: LucideIcon; label: string; tone: string }
> = {
  ai: {
    icon: Bot,
    label: "AI",
    tone: "border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-400",
  },
  modules: {
    icon: Layers,
    label: "Modules",
    tone: "border-cyan-500/30 bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  },
  integrations: {
    icon: Plug,
    label: "Integrations",
    tone: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  platform: {
    icon: Cog,
    label: "Platform",
    tone: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
  experimental: {
    icon: FlaskConical,
    label: "Experimental",
    tone: "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-400",
  },
};

const SOURCE_LABEL: Record<FlagSource, string> = {
  user: "User override",
  org: "Org override",
  plan: "Plan default",
  system: "System default",
  default: "Static fallback",
};

function FlagRow({ def, orgId }: { def: FlagDefinition; orgId: number }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["feature-flags", "flag", def.key, "with-chain"],
    queryFn: () => fetchFeatureFlag(def.key, { includeChain: true }),
    staleTime: 5 * 60_000,
  });

  const setOverride = usePlatformMutation({
    mutationFn: setFeatureFlagOverride,
    onSuccess: (d) => {
      toast.success(d.message);
      void queryClient.invalidateQueries({
        queryKey: ["feature-flags", "flag", def.key, "with-chain"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["feature-flags", "flag", def.key],
      });
    },
  });

  const enabled = data?.enabled ?? false;
  const source = data?.source ?? "default";
  const orgChainEntry = data?.resolution_chain?.find((c) => c.source === "org");
  const hasOrgOverride = orgChainEntry?.value !== null;

  return (
    <div className="glass border-border/50 rounded-xl p-4 flex flex-col sm:flex-row gap-3 sm:items-start">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{def.label}</span>
          <code className="text-[10px] text-muted-foreground font-mono">
            {def.key}
          </code>
          {def.deprecated && (
            <Badge variant="outline" className="text-[10px] border-rose-500/40 text-rose-600 dark:text-rose-400">
              Deprecated
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{def.description}</p>
        <div className="flex items-center gap-2 mt-2 text-xs">
          {isLoading ? (
            <span className="text-muted-foreground">resolving...</span>
          ) : (
            <>
              {enabled ? (
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                >
                  <CheckCircle2 className="h-3 w-3 me-1" aria-hidden="true" />
                  Enabled
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-muted text-muted-foreground"
                >
                  <XCircle className="h-3 w-3 me-1" aria-hidden="true" />
                  Disabled
                </Badge>
              )}
              <span className="text-muted-foreground">
                via <strong>{SOURCE_LABEL[source]}</strong>
              </span>
              <span className="text-[10px] text-muted-foreground">
                · default {def.system_default ? "on" : "off"}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-1 flex-shrink-0">
        <Button
          size="sm"
          variant={enabled && source === "org" ? "default" : "outline"}
          disabled={setOverride.isPending}
          onClick={() =>
            setOverride.mutate({
              key: def.key as FlagKey,
              scope: "org",
              scope_id: orgId,
              value: true,
              reason: `Enabled via admin UI`,
            })
          }
          aria-label={`Enable ${def.label} for this org`}
        >
          On
        </Button>
        <Button
          size="sm"
          variant={!enabled && source === "org" ? "default" : "outline"}
          disabled={setOverride.isPending}
          onClick={() =>
            setOverride.mutate({
              key: def.key as FlagKey,
              scope: "org",
              scope_id: orgId,
              value: false,
              reason: `Disabled via admin UI`,
            })
          }
          aria-label={`Disable ${def.label} for this org`}
        >
          Off
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={setOverride.isPending || !hasOrgOverride}
          onClick={() =>
            setOverride.mutate({
              key: def.key as FlagKey,
              scope: "org",
              scope_id: orgId,
              value: null,
              reason: `Cleared via admin UI`,
            })
          }
          aria-label={`Clear org override for ${def.label} — fall back to plan/system`}
          title="Clear override (fall back to plan/system default)"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

function FeatureFlagsInner() {
  const { data: session } = useSession();
  const orgId = session?.user?.org_id ?? 1;
  const [activeCategory, setActiveCategory] = useState<
    FlagDefinition["category"] | "all"
  >("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["feature-flags", "definitions"],
    queryFn: fetchFeatureFlagDefinitions,
    staleTime: 10 * 60_000,
  });

  const definitions = data?.data?.definitions ?? [];
  const filtered = useMemo(
    () =>
      activeCategory === "all"
        ? definitions
        : definitions.filter((d) => d.category === activeCategory),
    [definitions, activeCategory],
  );

  const byCategory = useMemo(() => {
    const map = new Map<FlagDefinition["category"], FlagDefinition[]>();
    for (const d of filtered) {
      const arr = map.get(d.category) ?? [];
      arr.push(d);
      map.set(d.category, arr);
    }
    return map;
  }, [filtered]);

  useRegisterPageContext({
    pageKey: "admin.feature-flags",
    route: "/admin/feature-flags",
    summary: `Feature flags admin: ${definitions.length} flags across ${byCategory.size} categories. Org #${orgId}.`,
    availableActions: ["admin.feature_flag.override.set"],
  });

  const categoryFilters: Array<{
    value: FlagDefinition["category"] | "all";
    label: string;
  }> = [
    { value: "all", label: "All" },
    { value: "ai", label: "AI" },
    { value: "modules", label: "Modules" },
    { value: "integrations", label: "Integrations" },
    { value: "platform", label: "Platform" },
    { value: "experimental", label: "Experimental" },
  ];

  return (
    <LazyMotion features={domAnimation}>
      <PageShell
        icon={Flag}
        title="Feature flags"
        subtitle="Per-org capability rollout"
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: PAGE_EASE } }}
          className="space-y-4 pb-20 md:pb-0"
        >
          {/* Resolution hierarchy reminder */}
          <div className="glass border-border/50 rounded-xl p-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Resolution order: </span>
            user override → org override → plan default → system default → static fallback (off).
            Setting an org override here affects ALL users in this organization.
          </div>

          {/* Category filter */}
          <div className="flex flex-wrap gap-2">
            {categoryFilters.map((f) => (
              <Button
                key={f.value}
                size="sm"
                variant={activeCategory === f.value ? "default" : "outline"}
                onClick={() => setActiveCategory(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>

          {isLoading && (
            <div className="text-sm text-muted-foreground">Loading flag definitions…</div>
          )}
          {error && (
            <EmptyState
              icon={AlertCircle}
              title="Could not load flag definitions"
              description={(error as Error).message}
            />
          )}

          {Array.from(byCategory.entries()).map(([category, defs]) => {
            const meta = CATEGORY_META[category];
            const Icon = meta.icon;
            return (
              <div key={category} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={meta.tone}>
                    <Icon className="h-3 w-3 me-1" aria-hidden="true" />
                    {meta.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {defs.length} flag{defs.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="space-y-2">
                  {defs.map((def) => (
                    <FlagRow key={def.key} def={def} orgId={orgId} />
                  ))}
                </div>
              </div>
            );
          })}
        </motion.div>
      </PageShell>
    </LazyMotion>
  );
}

export default function FeatureFlagsAdminPage() {
  return (
    <PermissionGate
      role={["system_admin"]}
      fallback={
        <PageShell icon={Flag} title="Feature flags" subtitle="Restricted">
          <EmptyState
            icon={AlertCircle}
            title="Permission required"
            description="You need system_admin role to manage feature flags."
          />
        </PageShell>
      }
    >
      <FeatureFlagsInner />
    </PermissionGate>
  );
}
