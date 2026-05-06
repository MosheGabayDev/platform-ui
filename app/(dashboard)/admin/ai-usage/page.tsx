"use client";
/**
 * @module app/(dashboard)/admin/ai-usage/page
 *
 * AIUsage dashboard (Phase 2.3).
 *
 * Spec: docs/system-upgrade/04-capabilities/platform-ai-usage-spec.md
 *
 * Dashboard surfaces:
 *   - KPI tiles (events, cost, tokens, errors %)
 *   - Budget banner (warning ≥80%, exceeded ≥100%)
 *   - Daily series area chart
 *   - By-provider + by-model breakdown
 *   - Top users
 *   - Recent events table (last 25)
 *
 * Range selector: 24h / 7d / mtd / 30d. Polls every 60s.
 *
 * RBAC: org_admin or system_admin (sensitive cost data).
 */
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { motion, LazyMotion, domAnimation } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  DollarSign,
  Zap,
  Activity,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Settings,
  TrendingUp,
  Users as UsersIcon,
  Cpu,
  Save,
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
import { useUsageStats, useUsageEvents, _aiUsageQueryPrefix } from "@/lib/hooks/use-ai-usage";
import { setUsageBudget } from "@/lib/api/ai-usage";
import { usePlatformMutation } from "@/lib/hooks/use-platform-mutation";
import { useRegisterPageContext } from "@/lib/hooks/use-register-page-context";
import { PAGE_EASE } from "@/lib/ui/motion";
import type {
  UsageRange,
  BudgetStatus,
} from "@/lib/modules/ai-usage/types";

const RANGE_OPTIONS: Array<{ value: UsageRange; label: string }> = [
  { value: "24h", label: "Last 24h" },
  { value: "7d", label: "Last 7 days" },
  { value: "mtd", label: "Month-to-date" },
  { value: "30d", label: "Last 30 days" },
];

function formatUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}
function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function BudgetBanner({
  status,
  pct,
  spent,
  budget,
}: {
  status: BudgetStatus;
  pct: number;
  spent: number;
  budget: number | null;
}) {
  if (status === "ok") return null;

  const meta: Record<
    Exclude<BudgetStatus, "ok">,
    { tone: string; icon: LucideIcon; label: string }
  > = {
    warning: {
      tone: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
      icon: AlertTriangle,
      label: "Budget warning",
    },
    exceeded: {
      tone: "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-400",
      icon: AlertCircle,
      label: "Budget exceeded",
    },
    unset: {
      tone: "border-border/60 bg-muted/40 text-muted-foreground",
      icon: Settings,
      label: "No budget set",
    },
  };
  const m = meta[status];
  const Icon = m.icon;
  return (
    <div className={`rounded-lg border p-3 flex items-center gap-3 ${m.tone}`}>
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="flex-1 min-w-0 text-sm">
        <strong>{m.label}.</strong>{" "}
        {status === "unset" ? (
          <span>Set a monthly budget to receive alerts.</span>
        ) : (
          <span>
            ${spent.toFixed(2)} / ${budget?.toFixed(2)} ({pct}% of monthly budget consumed)
          </span>
        )}
      </div>
    </div>
  );
}

function BudgetEditor({
  current,
  onSaved,
}: {
  current: number | null;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(current === null ? "" : String(current));
  const mutation = usePlatformMutation({
    mutationFn: setUsageBudget,
    onSuccess: (d) => {
      toast.success(d.message);
      setEditing(false);
      onSaved();
    },
  });

  if (!editing) {
    return (
      <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
        <Settings className="h-3.5 w-3.5 me-1" aria-hidden="true" />
        Budget: {current === null ? "unset" : formatUsd(current) + "/mo"}
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        min={0}
        step={1}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="USD/month, blank = unset"
        className="h-8 w-44 text-sm"
        aria-label="Monthly AI budget in USD"
      />
      <Button
        size="sm"
        variant="default"
        disabled={mutation.isPending}
        onClick={() =>
          mutation.mutate({
            monthly_budget_usd: draft.trim() === "" ? null : Number(draft),
          })
        }
      >
        <Save className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          setEditing(false);
          setDraft(current === null ? "" : String(current));
        }}
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>
    </div>
  );
}

function AIUsageInner() {
  const t = useTranslations("admin.aiUsage");
  const queryClient = useQueryClient();
  const [range, setRange] = useState<UsageRange>("mtd");
  const { stats, isLoading, isError } = useUsageStats(range);
  const events = useUsageEvents({ page: 1, per_page: 25, range });

  const chartData = useMemo(
    () =>
      (stats?.daily_series ?? []).map((p) => ({
        date: p.date.slice(5), // MM-DD for compact x-axis
        cost: p.cost_usd,
        events: p.events,
        errors: p.errors,
      })),
    [stats?.daily_series],
  );

  useRegisterPageContext({
    pageKey: "admin.ai-usage",
    route: "/admin/ai-usage",
    summary: stats
      ? `AI usage (${range}): ${stats.totals.events} events, ${formatUsd(stats.totals.cost_usd)}, ${stats.totals.errors_pct}% errors. Budget: ${stats.budget.status}.`
      : "AI usage dashboard (loading)",
    availableActions: ["admin.ai_usage.budget.set"],
  });

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: _aiUsageQueryPrefix });
  }

  return (
    <LazyMotion features={domAnimation}>
      <PageShell icon={TrendingUp} title={t("title")} subtitle={t("subtitle")}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: PAGE_EASE } }}
          className="space-y-4 pb-20 md:pb-0"
        >
          {/* Range selector + budget editor */}
          <div className="flex flex-wrap items-center gap-2">
            {RANGE_OPTIONS.map((r) => (
              <Button
                key={r.value}
                size="sm"
                variant={range === r.value ? "default" : "outline"}
                onClick={() => setRange(r.value)}
              >
                {r.label}
              </Button>
            ))}
            <div className="ms-auto">
              {stats && (
                <BudgetEditor
                  current={stats.budget.monthly_budget_usd}
                  onSaved={invalidate}
                />
              )}
            </div>
          </div>

          {/* Budget banner */}
          {stats && (
            <BudgetBanner
              status={stats.budget.status}
              pct={stats.budget.pct_consumed}
              spent={stats.budget.spent_mtd_usd}
              budget={stats.budget.monthly_budget_usd}
            />
          )}

          {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {isError && (
            <EmptyState
              icon={AlertCircle}
              title="Could not load usage"
              description="The usage service is unreachable. Try again in a moment."
            />
          )}

          {stats && (
            <>
              {/* KPI tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <KpiTile
                  icon={DollarSign}
                  label="Cost"
                  value={formatUsd(stats.totals.cost_usd)}
                  tone="success"
                />
                <KpiTile
                  icon={Zap}
                  label="Events"
                  value={String(stats.totals.events)}
                  tone="default"
                />
                <KpiTile
                  icon={Cpu}
                  label="Tokens"
                  value={formatTokens(stats.totals.input_tokens + stats.totals.output_tokens)}
                  tone="default"
                />
                <KpiTile
                  icon={AlertTriangle}
                  label="Errors"
                  value={`${stats.totals.errors} (${stats.totals.errors_pct}%)`}
                  tone={stats.totals.errors_pct > 1 ? "warning" : "default"}
                />
              </div>

              {/* Daily series chart */}
              <div className="glass border-border/50 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Daily cost</span>
                  <span className="text-xs text-muted-foreground">
                    {chartData.length} days · USD
                  </span>
                </div>
                <div className="h-48 w-full" data-testid="ai-usage-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="costFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="date" fontSize={10} tick={{ fill: "currentColor" }} />
                      <YAxis fontSize={10} tick={{ fill: "currentColor" }} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={(v) => formatUsd(Number(v ?? 0))}
                      />
                      <Area
                        type="monotone"
                        dataKey="cost"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fill="url(#costFill)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* By-provider + Top users */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Section title="By provider" rows={stats.by_provider} valueKey="cost_usd" />
                <TopUsersSection rows={stats.top_users} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Section title="By model" rows={stats.by_model} valueKey="cost_usd" />
                <Section title="By purpose" rows={stats.by_purpose} valueKey="cost_usd" />
              </div>

              {/* Recent events table */}
              <div className="glass border-border/50 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Recent events</span>
                  <span className="text-xs text-muted-foreground">
                    Showing {events.events.length} of {events.total}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-start text-muted-foreground border-b border-border/50">
                        <th className="text-start py-1 pe-2">When</th>
                        <th className="text-start py-1 pe-2">User</th>
                        <th className="text-start py-1 pe-2">Provider · model</th>
                        <th className="text-start py-1 pe-2">Purpose</th>
                        <th className="text-end py-1 pe-2">Tokens</th>
                        <th className="text-end py-1 pe-2">Cost</th>
                        <th className="text-start py-1 pe-2">Outcome</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.events.map((e) => (
                        <tr key={e.id} className="border-b border-border/30">
                          <td className="py-1 pe-2 font-mono text-[10px]">
                            {new Date(e.timestamp).toLocaleString()}
                          </td>
                          <td className="py-1 pe-2">{e.user_name ?? "—"}</td>
                          <td className="py-1 pe-2 font-mono text-[10px]">
                            {e.provider_id} · {e.model}
                          </td>
                          <td className="py-1 pe-2">{e.purpose}</td>
                          <td className="py-1 pe-2 text-end font-mono">
                            {e.input_tokens + e.output_tokens}
                          </td>
                          <td className="py-1 pe-2 text-end font-mono">
                            ${e.cost_usd.toFixed(4)}
                          </td>
                          <td className="py-1 pe-2">
                            <OutcomeBadge outcome={e.outcome} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </PageShell>
    </LazyMotion>
  );
}

function KpiTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: "default" | "success" | "warning";
}) {
  const tones = {
    default: "text-foreground",
    success: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
  };
  return (
    <div className="glass border-border/50 rounded-xl p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${tones[tone]}`} aria-hidden="true" />
      </div>
      <span className={`text-2xl font-semibold ${tones[tone]}`}>{value}</span>
    </div>
  );
}

interface SectionRow {
  key: string;
  events: number;
  cost_usd: number;
}

function Section({
  title,
  rows,
}: {
  title: string;
  rows: SectionRow[];
  valueKey: "cost_usd";
}) {
  const max = rows.reduce((m, r) => Math.max(m, r.cost_usd), 0);
  return (
    <div className="glass border-border/50 rounded-xl p-4">
      <div className="font-medium text-sm mb-2">{title}</div>
      <div className="space-y-1.5">
        {rows.map((row) => {
          const pct = max === 0 ? 0 : (row.cost_usd / max) * 100;
          return (
            <div key={row.key} className="text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono">{row.key}</span>
                <span className="font-mono text-muted-foreground">
                  {formatUsd(row.cost_usd)} · {row.events}
                </span>
              </div>
              <div className="h-1.5 mt-0.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
        {rows.length === 0 && (
          <div className="text-xs text-muted-foreground">No data in this range.</div>
        )}
      </div>
    </div>
  );
}

function TopUsersSection({
  rows,
}: {
  rows: { user_id: number; user_name: string; events: number; cost_usd: number }[];
}) {
  return (
    <div className="glass border-border/50 rounded-xl p-4">
      <div className="font-medium text-sm mb-2 flex items-center gap-2">
        <UsersIcon className="h-3.5 w-3.5" aria-hidden="true" />
        Top users
      </div>
      <ul className="space-y-1.5 text-xs">
        {rows.map((u) => (
          <li key={u.user_id} className="flex items-center justify-between">
            <span>{u.user_name}</span>
            <span className="font-mono text-muted-foreground">
              {formatUsd(u.cost_usd)} · {u.events}
            </span>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="text-muted-foreground">No users in this range.</li>
        )}
      </ul>
    </div>
  );
}

function OutcomeBadge({ outcome }: { outcome: string }) {
  const meta: Record<string, { tone: string; icon: LucideIcon; label: string }> = {
    success: {
      tone:
        "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
      icon: CheckCircle2,
      label: "OK",
    },
    error: {
      tone: "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-400",
      icon: AlertCircle,
      label: "Error",
    },
    cached: {
      tone: "border-cyan-500/30 bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
      icon: Activity,
      label: "Cached",
    },
    cancelled: {
      tone: "border-muted text-muted-foreground",
      icon: Activity,
      label: "Cancelled",
    },
  };
  const m = meta[outcome] ?? {
    tone: "border-muted text-muted-foreground",
    icon: Activity,
    label: outcome,
  };
  const Icon = m.icon;
  return (
    <Badge variant="outline" className={`text-[10px] ${m.tone}`}>
      <Icon className="h-3 w-3 me-1" aria-hidden="true" />
      {m.label}
    </Badge>
  );
}

export default function AIUsageAdminPage() {
  return (
    <PermissionGate
      role={["org_admin", "system_admin"]}
      fallback={<AIUsageRestrictedFallback />}
    >
      <AIUsageInner />
    </PermissionGate>
  );
}

function AIUsageRestrictedFallback() {
  const t = useTranslations("admin.aiUsage");
  const tCommon = useTranslations("admin.common");
  return (
    <PageShell icon={TrendingUp} title={t("title")} subtitle={tCommon("restricted")}>
      <EmptyState
        icon={AlertCircle}
        title={tCommon("permissionRequired")}
        description={t("permissionDescription")}
      />
    </PageShell>
  );
}
