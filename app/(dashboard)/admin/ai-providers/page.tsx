"use client";
/**
 * @module app/(dashboard)/admin/ai-providers/page
 *
 * AIProviderGateway admin (Phase 2.1).
 *
 * Spec: docs/system-upgrade/04-capabilities/platform-ai-provider-gateway-spec.md
 *
 * Lists every provider in the catalog with its current per-org config.
 * Per-row editor: auth fields (type-aware: password / text / select),
 * default-model dropdown, endpoint override (when allowed), enable toggle,
 * Test Connection button. Sensitive values are masked on read; entering a
 * new value replaces the stored one.
 *
 * RBAC: org_admin or system_admin.
 */
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, LazyMotion, domAnimation } from "framer-motion";
import {
  Bot,
  Cpu,
  Cloud,
  Server,
  Pencil,
  X,
  Save,
  Power,
  PowerOff,
  PlugZap,
  CheckCircle2,
  XCircle,
  AlertCircle,
  KeyRound,
  Plug,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { PermissionGate } from "@/components/shared/permission-gate";
import { PageShell } from "@/components/shared/page-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchProviderCatalog,
  fetchProviderConfigs,
  updateProviderConfig,
  testProviderConnection,
} from "@/lib/api/ai-providers";
import { _aiProvidersQueryPrefix } from "@/lib/hooks/use-ai-provider-configs";
import { usePlatformMutation } from "@/lib/hooks/use-platform-mutation";
import { useRegisterPageContext } from "@/lib/hooks/use-register-page-context";
import { PAGE_EASE } from "@/lib/ui/motion";
import type {
  AIProvider,
  ProviderCategory,
  ProviderConfig,
} from "@/lib/modules/ai-providers/types";

const CATEGORY_META: Record<
  ProviderCategory,
  { icon: LucideIcon; label: string; tone: string }
> = {
  cloud: {
    icon: Cloud,
    label: "Cloud",
    tone: "border-cyan-500/30 bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  },
  hosted: {
    icon: Server,
    label: "Hosted",
    tone: "border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-400",
  },
  local: {
    icon: Cpu,
    label: "Local",
    tone: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
  openai_compatible: {
    icon: Plug,
    label: "OpenAI-compatible",
    tone: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
};

function ProviderCard({
  provider,
  config,
  onSaved,
}: {
  provider: AIProvider;
  config: ProviderConfig;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  // Draft state for non-sensitive + plaintext for sensitive (only used while editing).
  const [draft, setDraft] = useState<{
    enabled: boolean;
    default_model: string;
    endpoint: string | null;
    credentials: Record<string, string>;
  }>({
    enabled: config.enabled,
    default_model: config.default_model,
    endpoint: config.endpoint,
    credentials: {},
  });

  const update = usePlatformMutation({
    mutationFn: updateProviderConfig,
    onSuccess: () => {
      toast.success("Saved.");
      setEditing(false);
      setDraft((d) => ({ ...d, credentials: {} }));
      onSaved();
    },
  });

  const test = usePlatformMutation({
    mutationFn: () => testProviderConnection(provider.id),
    onSuccess: (res) => {
      if (res.data.ok) {
        toast.success(`Connected — ${res.data.tested_model} (${res.data.latency_ms}ms)`);
      } else {
        toast.error(`Connection failed: ${res.data.error ?? "unknown"}`);
      }
      onSaved();
    },
  });

  function startEdit() {
    setDraft({
      enabled: config.enabled,
      default_model: config.default_model,
      endpoint: config.endpoint,
      credentials: {},
    });
    setEditing(true);
  }

  function save() {
    update.mutate({
      provider_id: provider.id,
      enabled: draft.enabled,
      default_model: draft.default_model,
      endpoint: draft.endpoint,
      credentials: Object.keys(draft.credentials).length > 0 ? draft.credentials : undefined,
    });
  }

  const meta = CATEGORY_META[provider.category];
  const CatIcon = meta.icon;
  const lastTestLabel = config.last_test_at
    ? new Date(config.last_test_at).toLocaleString()
    : "never";

  return (
    <div className="glass border-border/50 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{provider.name}</span>
            <Badge variant="outline" className={meta.tone}>
              <CatIcon className="h-3 w-3 me-1" aria-hidden="true" />
              {meta.label}
            </Badge>
            <Badge variant="outline" className="text-[10px] border-muted text-muted-foreground">
              {provider.status}
            </Badge>
            {config.enabled ? (
              <Badge
                variant="outline"
                className="text-[10px] border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
              >
                <Power className="h-3 w-3 me-1" aria-hidden="true" />
                Enabled
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] border-muted text-muted-foreground">
                <PowerOff className="h-3 w-3 me-1" aria-hidden="true" />
                Disabled
              </Badge>
            )}
            {config.last_test_at && (
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  config.last_test_ok
                    ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                    : "border-rose-500/30 text-rose-700 dark:text-rose-400"
                }`}
              >
                {config.last_test_ok ? (
                  <CheckCircle2 className="h-3 w-3 me-1" aria-hidden="true" />
                ) : (
                  <XCircle className="h-3 w-3 me-1" aria-hidden="true" />
                )}
                tested {lastTestLabel}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{provider.description}</p>
          <div className="text-[11px] text-muted-foreground mt-1">
            <span>Default model: <strong>{config.default_model}</strong></span>
            <span className="mx-2">·</span>
            <span>{provider.models.length} models available</span>
          </div>
        </div>

        {!editing && (
          <div className="flex gap-1 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => test.mutate(undefined as never)}
              disabled={test.isPending}
              aria-label={`Test connection to ${provider.name}`}
            >
              <PlugZap className="h-3.5 w-3.5 me-1" aria-hidden="true" />
              Test
            </Button>
            <Button size="sm" variant="outline" onClick={startEdit}>
              <Pencil className="h-3.5 w-3.5 me-1" aria-hidden="true" />
              Configure
            </Button>
          </div>
        )}
      </div>

      {/* Current credentials (read-only display) */}
      {!editing && Object.keys(config.credentials).length > 0 && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {Object.entries(config.credentials).map(([key, value]) => (
            <div key={key} className="p-2 rounded-md bg-muted/40 font-mono">
              <span className="text-muted-foreground">{key}:</span>{" "}
              {typeof value === "string" ? (
                value
              ) : (
                <span>
                  <KeyRound className="inline h-3 w-3 me-1 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  {value.masked}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Editor */}
      {editing && (
        <div className="mt-3 space-y-3 border-t border-border/50 pt-3">
          {/* Enable toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Enabled</span>
            <Button
              size="sm"
              variant={draft.enabled ? "default" : "outline"}
              onClick={() => setDraft((d) => ({ ...d, enabled: true }))}
            >
              On
            </Button>
            <Button
              size="sm"
              variant={!draft.enabled ? "default" : "outline"}
              onClick={() => setDraft((d) => ({ ...d, enabled: false }))}
            >
              Off
            </Button>
          </div>

          {/* Default model */}
          <div>
            <label
              className="text-xs text-muted-foreground"
              htmlFor={`${provider.id}-default-model`}
            >
              Default model
            </label>
            <select
              id={`${provider.id}-default-model`}
              value={draft.default_model}
              onChange={(e) => setDraft((d) => ({ ...d, default_model: e.target.value }))}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm w-full mt-1"
            >
              {provider.models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name} (${m.cost_per_million_input_tokens}/M in / ${m.cost_per_million_output_tokens}/M out)
                </option>
              ))}
            </select>
          </div>

          {/* Endpoint override */}
          {provider.endpoint_overridable && (
            <div>
              <label
                className="text-xs text-muted-foreground"
                htmlFor={`${provider.id}-endpoint`}
              >
                Endpoint
              </label>
              <Input
                id={`${provider.id}-endpoint`}
                value={draft.endpoint ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, endpoint: e.target.value || null }))
                }
                placeholder={provider.endpoint_default ?? "https://..."}
              />
            </div>
          )}

          {/* Auth fields */}
          {provider.auth.fields.map((field) => (
            <div key={field.key}>
              <label
                className="text-xs text-muted-foreground"
                htmlFor={`${provider.id}-${field.key}`}
              >
                {field.label_he ?? field.label}
                {field.sensitive && (
                  <Badge
                    variant="outline"
                    className="text-[9px] ms-2 border-amber-500/40 text-amber-700 dark:text-amber-400"
                  >
                    sensitive
                  </Badge>
                )}
              </label>
              <Input
                id={`${provider.id}-${field.key}`}
                type={field.type === "password" ? "password" : "text"}
                value={draft.credentials[field.key] ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    credentials: { ...d.credentials, [field.key]: e.target.value },
                  }))
                }
                placeholder={
                  field.sensitive && config.credentials[field.key]
                    ? "(leave blank to keep existing value)"
                    : field.placeholder
                }
              />
            </div>
          ))}

          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
              <X className="h-3.5 w-3.5 me-1" aria-hidden="true" />
              Cancel
            </Button>
            <Button size="sm" variant="default" disabled={update.isPending} onClick={save}>
              <Save className="h-3.5 w-3.5 me-1" aria-hidden="true" />
              Save
            </Button>
          </div>
          {update.serverError && (
            <p className="text-xs text-rose-600 dark:text-rose-400">{update.serverError}</p>
          )}
        </div>
      )}
    </div>
  );
}

function AIProvidersInner() {
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<ProviderCategory | "all">("all");

  const catalog = useQuery({
    queryKey: [..._aiProvidersQueryPrefix, "catalog"],
    queryFn: fetchProviderCatalog,
    staleTime: 60 * 60_000,
  });
  const configs = useQuery({
    queryKey: [..._aiProvidersQueryPrefix, "configs"],
    queryFn: fetchProviderConfigs,
    staleTime: 5 * 60_000,
  });

  const providers = catalog.data?.data?.providers ?? [];
  const cfgList = configs.data?.data?.configs ?? [];

  const filtered = useMemo(
    () =>
      activeCategory === "all"
        ? providers
        : providers.filter((p) => p.category === activeCategory),
    [providers, activeCategory],
  );

  function findConfig(providerId: string): ProviderConfig | undefined {
    return cfgList.find((c) => c.provider_id === providerId);
  }

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: _aiProvidersQueryPrefix });
  }

  const enabledCount = cfgList.filter((c) => c.enabled).length;
  const testedOk = cfgList.filter((c) => c.last_test_ok).length;

  useRegisterPageContext({
    pageKey: "admin.ai-providers",
    route: "/admin/ai-providers",
    summary: `AI providers admin: ${providers.length} in catalog, ${enabledCount} enabled, ${testedOk} verified.`,
    availableActions: ["admin.ai_provider.update", "admin.ai_provider.test"],
  });

  const filters: Array<{ value: ProviderCategory | "all"; label: string }> = [
    { value: "all", label: "All" },
    { value: "cloud", label: "Cloud" },
    { value: "hosted", label: "Hosted" },
    { value: "local", label: "Local" },
  ];

  return (
    <LazyMotion features={domAnimation}>
      <PageShell
        icon={Bot}
        title="AI providers"
        subtitle="LLM providers, API keys, default models, routing"
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: PAGE_EASE } }}
          className="space-y-4 pb-20 md:pb-0"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass border-border/50 rounded-xl p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">In catalog</span>
                <Bot className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
              <span className="text-2xl font-semibold">{providers.length}</span>
            </div>
            <div className="glass border-border/50 rounded-xl p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Enabled</span>
                <Power className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              </div>
              <span className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                {enabledCount}
              </span>
            </div>
            <div className="glass border-border/50 rounded-xl p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Verified</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              </div>
              <span className="text-2xl font-semibold">{testedOk}</span>
            </div>
          </div>

          <div className="glass border-border/50 rounded-xl p-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Sensitive credentials:</span>{" "}
            stored encrypted at rest. Reads return masked values; entering a new value replaces the stored one. Plaintext is never logged or returned to the client.
          </div>

          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
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

          {(catalog.isLoading || configs.isLoading) && (
            <div className="text-sm text-muted-foreground">Loading…</div>
          )}
          {(catalog.error || configs.error) && (
            <EmptyState
              icon={AlertCircle}
              title="Could not load AI provider catalog"
              description={(catalog.error ?? configs.error)?.message ?? ""}
            />
          )}

          <div className="space-y-2">
            {filtered.map((provider) => {
              const cfg = findConfig(provider.id);
              if (!cfg) return null;
              return (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  config={cfg}
                  onSaved={invalidate}
                />
              );
            })}
          </div>
        </motion.div>
      </PageShell>
    </LazyMotion>
  );
}

export default function AIProvidersAdminPage() {
  return (
    <PermissionGate
      role={["org_admin", "system_admin"]}
      fallback={
        <PageShell icon={Bot} title="AI providers" subtitle="Restricted">
          <EmptyState
            icon={AlertCircle}
            title="Permission required"
            description="You need org_admin or system_admin role to manage AI providers."
          />
        </PageShell>
      }
    >
      <AIProvidersInner />
    </PermissionGate>
  );
}
