"use client";
/**
 * @module app/(dashboard)/admin/settings/page
 *
 * PlatformSettings Engine admin surface (cap 16, Phase 1.2).
 *
 * Spec: docs/system-upgrade/04-capabilities/platform-settings-engine-spec.md
 *
 * Categorized settings tree. Per-row editor renders a type-aware control:
 *   string  → text input or textarea (>=200 chars def)
 *   int     → number input
 *   bool    → toggle button
 *   enum    → select
 *   secret  → masked display + Replace flow (clears field, accepts plaintext)
 *   json    → textarea with JSON.parse on save
 *
 * RBAC: PermissionGate role=org_admin or system_admin. Backend MUST re-check.
 * Sensitive settings are gated additionally by definition.write_roles.
 */
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { motion, LazyMotion, domAnimation } from "framer-motion";
import {
  Cog,
  Bot,
  Palette,
  Bell,
  Gauge,
  AlertCircle,
  Save,
  RotateCcw,
  KeyRound,
  Pencil,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { PermissionGate } from "@/components/shared/permission-gate";
import { PageShell } from "@/components/shared/page-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchSettingDefinitions,
  fetchSettingsByCategory,
  setSetting,
} from "@/lib/api/settings";
import { usePlatformMutation } from "@/lib/hooks/use-platform-mutation";
import { useRegisterPageContext } from "@/lib/hooks/use-register-page-context";
import { PAGE_EASE } from "@/lib/ui/motion";
import type {
  SettingDefinition,
  SettingValue,
  SettingCategory,
} from "@/lib/modules/settings/types";

const CATEGORY_META: Record<
  SettingCategory,
  { icon: LucideIcon; label: string; tone: string }
> = {
  ai: {
    icon: Bot,
    label: "AI",
    tone: "border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-400",
  },
  branding: {
    icon: Palette,
    label: "Branding",
    tone: "border-cyan-500/30 bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  },
  notifications: {
    icon: Bell,
    label: "Notifications",
    tone: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  rate_limits: {
    icon: Gauge,
    label: "Rate limits",
    tone: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
  integrations: {
    icon: Cog,
    label: "Integrations",
    tone: "border-slate-500/30 bg-slate-500/15 text-slate-700 dark:text-slate-400",
  },
  experimental: {
    icon: Cog,
    label: "Experimental",
    tone: "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-400",
  },
};

const CATEGORY_FILTERS: Array<{ value: SettingCategory | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "ai", label: "AI" },
  { value: "branding", label: "Branding" },
  { value: "notifications", label: "Notifications" },
  { value: "rate_limits", label: "Rate limits" },
];

function SettingRow({
  def,
  setting,
  orgId,
  userId,
  onSaved,
}: {
  def: SettingDefinition;
  setting: SettingValue | undefined;
  orgId: number;
  userId: number;
  onSaved: () => void;
}) {
  const writeScope = def.allowed_scopes.includes("org") ? "org" : def.allowed_scopes[0];
  const writeScopeId = writeScope === "org" ? orgId : writeScope === "user" ? userId : null;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<unknown>(undefined);

  const mutation = usePlatformMutation({
    mutationFn: setSetting,
    onSuccess: (d) => {
      toast.success(d.message);
      setEditing(false);
      setDraft(undefined);
      onSaved();
    },
  });

  const initialValue: unknown = setting
    ? setting.type === "secret"
      ? ""
      : (setting as { value: unknown }).value
    : def.default_value;

  function startEdit() {
    setDraft(initialValue);
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(undefined);
    setEditing(false);
  }

  function save() {
    let outValue: unknown = draft;
    if (def.type === "int") {
      const n = Number(draft);
      if (!Number.isFinite(n)) {
        toast.error("ערך חייב להיות מספר");
        return;
      }
      outValue = Math.trunc(n);
    }
    if (def.type === "json") {
      try {
        outValue = typeof draft === "string" ? JSON.parse(draft) : draft;
      } catch {
        toast.error("JSON לא תקין");
        return;
      }
    }
    mutation.mutate({
      key: def.key,
      scope: writeScope,
      scope_id: writeScopeId,
      value: outValue,
    });
  }

  function clear() {
    mutation.mutate({
      key: def.key,
      scope: writeScope,
      scope_id: writeScopeId,
      value: null,
    });
  }

  const sourceLabel = setting?.source ?? "default";

  return (
    <div className="glass border-border/50 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{def.label}</span>
            <code className="text-[10px] text-muted-foreground font-mono">
              {def.key}
            </code>
            <Badge
              variant="outline"
              className="text-[10px] border-muted text-muted-foreground"
            >
              {def.type}
            </Badge>
            {def.is_sensitive && (
              <Badge
                variant="outline"
                className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-400"
              >
                <KeyRound className="h-2.5 w-2.5 me-1" aria-hidden="true" />
                Sensitive
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{def.description}</p>
          <div className="text-[11px] text-muted-foreground mt-1">
            <span>Source: <strong>{sourceLabel}</strong></span>
            <span className="mx-2">·</span>
            <span>Scopes: {def.allowed_scopes.join(", ")}</span>
          </div>
        </div>
        {!editing && (
          <div className="flex gap-1 shrink-0">
            <Button size="sm" variant="outline" onClick={startEdit}>
              <Pencil className="h-3.5 w-3.5 me-1" aria-hidden="true" />
              {def.is_sensitive && setting && setting.type === "secret" && setting.has_value
                ? "Replace"
                : "Edit"}
            </Button>
            {sourceLabel === writeScope && (
              <Button
                size="sm"
                variant="outline"
                disabled={mutation.isPending}
                onClick={clear}
                aria-label={`Clear ${writeScope}-scope override for ${def.label}`}
                title="Clear override at this scope"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Current value display */}
      {!editing && setting && (
        <div className="mt-3 p-2 rounded-md bg-muted/40 text-xs font-mono break-all">
          {setting.type === "secret" ? (
            setting.has_value ? (
              <span className="text-muted-foreground">{setting.masked ?? "(set)"}</span>
            ) : (
              <span className="text-muted-foreground italic">(not set)</span>
            )
          ) : setting.type === "bool" ? (
            String(setting.value)
          ) : setting.type === "json" ? (
            JSON.stringify(setting.value)
          ) : (
            String(setting.value)
          )}
        </div>
      )}

      {/* Editor */}
      {editing && (
        <div className="mt-3 space-y-2">
          <SettingEditor def={def} value={draft} onChange={setDraft} />
          <div className="flex gap-1 justify-end">
            <Button size="sm" variant="outline" onClick={cancelEdit}>
              <X className="h-3.5 w-3.5 me-1" aria-hidden="true" />
              Cancel
            </Button>
            <Button
              size="sm"
              variant="default"
              disabled={mutation.isPending}
              onClick={save}
            >
              <Save className="h-3.5 w-3.5 me-1" aria-hidden="true" />
              Save
            </Button>
          </div>
          {mutation.serverError && (
            <p className="text-xs text-rose-600 dark:text-rose-400">
              {mutation.serverError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function SettingEditor({
  def,
  value,
  onChange,
}: {
  def: SettingDefinition;
  value: unknown;
  onChange: (next: unknown) => void;
}) {
  switch (def.type) {
    case "string":
      if ((def.schema?.maxLength ?? 0) >= 200) {
        return (
          <Textarea
            rows={4}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            maxLength={def.schema?.maxLength}
            aria-label={def.label}
          />
        );
      }
      return (
        <Input
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          maxLength={def.schema?.maxLength}
          aria-label={def.label}
        />
      );
    case "int":
      return (
        <Input
          type="number"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          min={def.schema?.min}
          max={def.schema?.max}
          aria-label={def.label}
        />
      );
    case "bool":
      return (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={value === true ? "default" : "outline"}
            onClick={() => onChange(true)}
          >
            On
          </Button>
          <Button
            size="sm"
            variant={value === false ? "default" : "outline"}
            onClick={() => onChange(false)}
          >
            Off
          </Button>
        </div>
      );
    case "enum":
      return (
        <select
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm w-full"
          aria-label={def.label}
        >
          {(def.schema?.allowed_values ?? []).map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      );
    case "secret":
      return (
        <Input
          type="password"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder="paste new secret value"
          aria-label={`${def.label} (sensitive)`}
        />
      );
    case "json":
      return (
        <Textarea
          rows={6}
          className="font-mono text-xs"
          value={
            typeof value === "string"
              ? value
              : JSON.stringify(value ?? def.default_value, null, 2)
          }
          onChange={(e) => onChange(e.target.value)}
          aria-label={def.label}
        />
      );
  }
}

function SettingsInner() {
  const t = useTranslations("admin.settings");
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const orgId = session?.user?.org_id ?? 1;
  const userId = (session?.user?.id as number | undefined) ?? 1;
  const [activeCategory, setActiveCategory] = useState<SettingCategory | "all">("all");

  const { data: defsData, isLoading: defsLoading } = useQuery({
    queryKey: ["settings", "definitions"],
    queryFn: fetchSettingDefinitions,
    staleTime: 10 * 60_000,
  });
  const definitions = defsData?.data?.definitions ?? [];

  // Fetch all categories at once so the page is one big tree.
  const categoryQueries = useQuery({
    queryKey: ["settings", "all-categories"],
    queryFn: async () => {
      const cats: SettingCategory[] = ["ai", "branding", "notifications", "rate_limits"];
      const results = await Promise.all(
        cats.map((c) => fetchSettingsByCategory(c).then((r) => [c, r.data.settings] as const)),
      );
      return Object.fromEntries(results) as Record<SettingCategory, SettingValue[]>;
    },
    staleTime: 5 * 60_000,
  });
  const settingsByCategory = categoryQueries.data ?? {};

  function findSetting(key: string): SettingValue | undefined {
    for (const list of Object.values(settingsByCategory) as SettingValue[][]) {
      const s = list.find((x) => x.key === key);
      if (s) return s;
    }
    return undefined;
  }

  const filtered = useMemo(
    () =>
      activeCategory === "all"
        ? definitions
        : definitions.filter((d) => d.category === activeCategory),
    [definitions, activeCategory],
  );

  const grouped = useMemo(() => {
    const map = new Map<SettingCategory, SettingDefinition[]>();
    for (const d of filtered) {
      const arr = map.get(d.category) ?? [];
      arr.push(d);
      map.set(d.category, arr);
    }
    return map;
  }, [filtered]);

  useRegisterPageContext({
    pageKey: "admin.settings",
    route: "/admin/settings",
    summary: `Settings admin: ${definitions.length} settings across ${grouped.size} categories. Org #${orgId}.`,
    availableActions: ["admin.setting.set"],
  });

  function invalidateAll() {
    void queryClient.invalidateQueries({ queryKey: ["settings"] });
  }

  return (
    <LazyMotion features={domAnimation}>
      <PageShell icon={Cog} title={t("title")} subtitle={t("subtitle")}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: PAGE_EASE } }}
          className="space-y-4 pb-20 md:pb-0"
        >
          <div className="glass border-border/50 rounded-xl p-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{t("resolutionOrder")} </span>
            {t("resolutionDescription")}
          </div>

          <div className="flex flex-wrap gap-2">
            {CATEGORY_FILTERS.map((f) => (
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

          {defsLoading && (
            <div className="text-sm text-muted-foreground">{t("loading")}</div>
          )}

          {Array.from(grouped.entries()).map(([category, defs]) => {
            const meta = CATEGORY_META[category];
            const Icon = meta.icon;
            return (
              <div key={category} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={meta.tone}>
                    <Icon className="h-3 w-3 me-1" aria-hidden="true" />
                    {t(`categories.${category}`)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {t("stats.settingCount", { count: defs.length })}
                  </span>
                </div>
                <div className="space-y-2">
                  {defs.map((def) => (
                    <SettingRow
                      key={def.key}
                      def={def}
                      setting={findSetting(def.key)}
                      orgId={orgId}
                      userId={userId}
                      onSaved={invalidateAll}
                    />
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

function SettingsRestrictedFallback() {
  const t = useTranslations("admin.settings");
  const tCommon = useTranslations("admin.common");
  return (
    <PageShell icon={Cog} title={t("title")} subtitle={tCommon("restricted")}>
      <EmptyState
        icon={AlertCircle}
        title={tCommon("permissionRequired")}
        description={t("permissionDescription")}
      />
    </PageShell>
  );
}

export default function SettingsAdminPage() {
  return (
    <PermissionGate role={["org_admin", "system_admin"]} fallback={<SettingsRestrictedFallback />}>
      <SettingsInner />
    </PermissionGate>
  );
}
