"use client";

import { useQuery } from "@tanstack/react-query";
import { motion, LazyMotion, domAnimation } from "framer-motion";
import {
  Users, HeadphonesIcon, Bot, Activity, TrendingUp, TrendingDown,
  AlertCircle, CheckCircle2, Zap, Shield, Database,
  Cpu, Globe, Server, Radio, RefreshCw,
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCountUp } from "@/lib/hooks/use-count-up";
import { TiltCard } from "@/components/shared/tilt-card";
import { CursorGlow } from "@/components/shared/cursor-glow";
import { StatCardSkeleton, FeedItemSkeleton, ServiceRowSkeleton } from "@/components/shared/skeleton-card";
import { fetchDashboardStats, fetchTimeSeries, fetchServiceHealth } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { DashboardStats, HealthData, TimeSeriesData, ServiceStatus } from "@/lib/api/types";

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.45, ease },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  show: (i: number) => ({
    opacity: 1, scale: 1,
    transition: { delay: i * 0.06, duration: 0.4, ease },
  }),
};

/* ─── Animated Stat Item ────────────────────────────────────── */
function AnimatedStatItem({ label, value, suffix, icon: Icon, delay }: {
  label: string; value: number; suffix?: string; icon: React.ElementType; delay: number;
}) {
  const count = useCountUp(value, 1600, delay);
  return (
    <div className="flex items-center gap-2.5">
      <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="size-3.5 text-primary/70" />
      </div>
      <div>
        <p className="text-[11px] text-muted-foreground/70 leading-none mb-1">{label}</p>
        <p className="text-sm font-bold tabular-nums">
          {value > 100 ? count.toLocaleString("he") : count}{suffix ?? ""}
        </p>
      </div>
    </div>
  );
}

/* ─── Stat Card ──────────────────────────────────────────────── */
function StatCard({ title, numericValue, suffix = "", change, up, icon: Icon, color, accent, border, spark, sparkColor, index }: {
  title: string; numericValue: number; suffix?: string;
  change: string; up: boolean; icon: React.ElementType;
  color: string; accent: string; border: string;
  spark: { v: number; i: number }[]; sparkColor: string; index: number;
}) {
  const count = useCountUp(numericValue, 1400, index * 120);
  return (
    <motion.div custom={index} variants={scaleIn} initial="hidden" animate="show">
      <TiltCard>
        <CursorGlow>
          <Card className={`relative overflow-hidden border ${border} bg-gradient-to-br ${color} cursor-default`}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
              <div className={`size-7 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center border ${border}`}>
                <Icon className={`size-3.5 ${accent}`} />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-0">
              <div className={`text-3xl font-bold tracking-tight tabular-nums ${accent}`}>
                {numericValue > 100 ? count.toLocaleString("he") : count}{suffix}
              </div>
              <div className="flex items-center gap-1 mt-1">
                {up ? <TrendingUp className="size-3 text-emerald-400" /> : <TrendingDown className="size-3 text-red-400" />}
                <span className={`text-xs font-medium ${up ? "text-emerald-400" : "text-red-400"}`}>{change}</span>
                <span className="text-xs text-muted-foreground">משבוע שעבר</span>
              </div>
            </CardContent>
            <div className="h-12 mt-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={spark} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`sg-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={sparkColor} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={sparkColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke={sparkColor} strokeWidth={1.5}
                    fill={`url(#sg-${index})`} dot={false} isAnimationActive
                    animationDuration={1200} animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </CursorGlow>
      </TiltCard>
    </motion.div>
  );
}

/* ─── Service status helpers ─────────────────────────────────── */
const STATUS_COLOR: Record<ServiceStatus, string> = {
  ok:       "bg-emerald-400 shadow-[0_0_6px_1px_rgba(52,211,153,0.5)]",
  degraded: "bg-amber-400 shadow-[0_0_6px_1px_rgba(251,191,36,0.5)] animate-pulse",
  error:    "bg-red-400 shadow-[0_0_6px_1px_rgba(248,113,113,0.5)] animate-pulse",
};
const STATUS_BADGE: Record<ServiceStatus, string> = {
  ok:       "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  degraded: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  error:    "text-red-400 border-red-500/30 bg-red-500/10",
};
const STATUS_LABEL: Record<ServiceStatus, string> = { ok: "תקין", degraded: "דעוך", error: "שגיאה" };

const SERVICE_ICONS: Record<string, React.ElementType> = {
  database:      Database,
  redis:         Cpu,
  voice_gateway: Radio,
  platform_api:  Globe,
};

/* ─── Build sparkline from timeseries ───────────────────────── */
function buildSpark(series: TimeSeriesData | undefined, key: "sessions" | "actions") {
  if (!series) return [10, 10, 10, 10, 10, 10, 10].map((v, i) => ({ v, i }));
  return series[key].slice(-7).map((v, i) => ({ v, i }));
}

/* ─── Main Dashboard ─────────────────────────────────────────── */
export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } =
    useQuery({ queryKey: queryKeys.dashboardStats, queryFn: fetchDashboardStats, refetchInterval: 60_000 });

  const { data: series, isLoading: seriesLoading } =
    useQuery({ queryKey: queryKeys.timeSeries(30), queryFn: () => fetchTimeSeries(30), refetchInterval: 120_000 });

  const { data: health, isLoading: healthLoading } =
    useQuery({ queryKey: queryKeys.serviceHealth, queryFn: fetchServiceHealth, refetchInterval: 30_000 });

  const sessionsTotal  = stats?.sessions.total ?? 0;
  const sessions24h    = stats?.sessions.last_24h ?? 0;
  const actionsTotal   = stats?.actions.total ?? 0;
  const errorRate      = stats?.actions.error_rate_pct ?? 0;
  const profilesActive = stats?.profiles.active ?? 0;

  /* Build chart data from timeseries */
  const chartData = series?.series.slice(-9).map(p => ({
    h: p.date.slice(5),
    v: p.sessions,
  })) ?? [];

  /* Sparklines */
  const sparkSessions = buildSpark(series, "sessions");
  const sparkActions  = buildSpark(series, "actions");

  /* Healthy service count */
  const serviceEntries = Object.entries(health?.services ?? {});
  const healthyCount   = serviceEntries.filter(([, s]) => s.status === "ok").length;
  const totalServices  = serviceEntries.length;

  return (
    <LazyMotion features={domAnimation}>
      <div className="space-y-6 pb-20 md:pb-0">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="flex flex-wrap items-start sm:items-end justify-between gap-3"
        >
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-1">סקירה כללית</p>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-l from-foreground to-foreground/60 bg-clip-text text-transparent">
              לוח הבקרה
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {statsError && (
              <Badge variant="outline" className="text-amber-400 border-amber-500/30 bg-amber-500/10 gap-1.5">
                <AlertCircle className="size-3" /> לא מחובר ל-API
              </Badge>
            )}
            {!statsError && !statsLoading && (
              <Badge variant="outline" className="gap-1.5 text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                מערכת תקינה
              </Badge>
            )}
            <Button variant="ghost" size="icon" className="size-8" onClick={() => refetchStats()} title="רענן">
              <RefreshCw className={`size-3.5 ${statsLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statsLoading || seriesLoading ? (
            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} index={i} />)
          ) : (
            <>
              <StatCard title="שיחות AI — סה״כ" numericValue={sessionsTotal}
                change={`+${sessions24h} היום`} up icon={Bot}
                color="from-blue-500/20 to-blue-600/5" accent="text-blue-400" border="border-blue-500/20"
                spark={sparkSessions} sparkColor="#60a5fa" index={0} />
              <StatCard title="פעולות AI" numericValue={actionsTotal}
                change={`${errorRate}% שגיאות`} up={errorRate < 5} icon={HeadphonesIcon}
                color="from-amber-500/20 to-amber-600/5" accent="text-amber-400" border="border-amber-500/20"
                spark={sparkActions} sparkColor="#fbbf24" index={1} />
              <StatCard title="פרופילים פעילים" numericValue={profilesActive}
                change="+1 השבוע" up icon={Users}
                color="from-purple-500/20 to-purple-600/5" accent="text-purple-400" border="border-purple-500/20"
                spark={sparkSessions.map(s => ({ ...s, v: Math.max(1, s.v % 15) }))} sparkColor="#c084fc" index={2} />
              <StatCard title="שיחות 7 ימים" numericValue={stats?.sessions.last_7d ?? 0}
                change={`${stats?.knowledge.ready ?? 0} מקורות RAG`} up icon={Zap}
                color="from-emerald-500/20 to-emerald-600/5" accent="text-emerald-400" border="border-emerald-500/20"
                spark={sparkActions.map(s => ({ ...s, v: Math.max(1, s.v % 20) }))} sparkColor="#34d399" index={3} />
            </>
          )}
        </div>

        {/* Activity chart + services */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Left: chart */}
          <motion.div className="lg:col-span-3 space-y-4"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5, ease }}
          >
            <Card className="glass border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">שיחות AI — 30 יום אחרונים</CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {seriesLoading ? "טוען..." : "בזמן אמת"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="h-36 p-0 pb-2">
                {seriesLoading ? (
                  <div className="h-full bg-muted/20 animate-pulse rounded" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-primary, #6366f1)" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="var(--color-primary, #6366f1)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="h" tick={{ fontSize: 10, fill: "oklch(0.7 0 0)" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: "oklch(0.2 0 0)", border: "1px solid oklch(1 0 0 / 10%)", borderRadius: 8, fontSize: 12 }}
                        labelStyle={{ color: "oklch(0.7 0 0)" }}
                        itemStyle={{ color: "oklch(0.85 0 0)" }}
                        formatter={(v) => [`${v} שיחות`, ""]}
                      />
                      <Area type="monotone" dataKey="v" stroke="var(--color-primary, #6366f1)"
                        strokeWidth={2} fill="url(#chartGrad)" dot={false}
                        isAnimationActive animationDuration={1400} animationEasing="ease-out"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Actions breakdown */}
            <Card className="glass border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">סטטוס פעולות AI</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                {statsLoading ? (
                  Array.from({ length: 3 }).map((_, i) => <FeedItemSkeleton key={i} />)
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "הצלחות", value: stats?.actions.success ?? 0, color: "text-emerald-400", icon: CheckCircle2 },
                      { label: "שגיאות", value: stats?.actions.error ?? 0, color: "text-red-400", icon: AlertCircle },
                      { label: "פעולות כתיבה", value: stats?.actions.write_actions ?? 0, color: "text-amber-400", icon: Activity },
                      { label: "מקורות RAG", value: stats?.knowledge.total ?? 0, color: "text-sky-400", icon: Database },
                    ].map((item, i) => (
                      <motion.div key={item.label} custom={i} variants={fadeUp} initial="hidden" animate="show"
                        className="flex items-center gap-2.5 p-3 rounded-lg bg-muted/20 border border-border/30"
                      >
                        <div className="size-7 rounded-lg bg-muted/50 flex items-center justify-center">
                          <item.icon className={`size-3.5 ${item.color}`} />
                        </div>
                        <div>
                          <p className="text-[11px] text-muted-foreground/70">{item.label}</p>
                          <p className={`text-sm font-bold tabular-nums ${item.color}`}>
                            {item.value.toLocaleString("he")}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Right: services health */}
          <motion.div className="lg:col-span-2"
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35, duration: 0.5, ease }}
          >
            <Card className="glass border-border/50 h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">בריאות שירותים</CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {healthLoading ? "בודק..." : `${healthyCount}/${totalServices} תקינים`}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-0 pb-3">
                {healthLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <ServiceRowSkeleton key={i} />)
                ) : (
                  serviceEntries.map(([name, svc], i) => {
                    const Icon = SERVICE_ICONS[name] ?? Server;
                    const status = svc.status as ServiceStatus;
                    return (
                      <motion.div key={name} custom={i} variants={fadeUp} initial="hidden" animate="show"
                        className="flex items-center justify-between px-4 py-2 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`size-1.5 rounded-full shrink-0 ${STATUS_COLOR[status] ?? STATUS_COLOR.error}`} />
                          <Icon className="size-3.5 text-muted-foreground/60 shrink-0" />
                          <span className="text-sm font-medium capitalize">{name.replace(/_/g, " ")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {svc.latency_ms !== undefined && (
                            <span className="text-xs text-muted-foreground/60 font-mono">{svc.latency_ms}ms</span>
                          )}
                          <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${STATUS_BADGE[status] ?? STATUS_BADGE.error}`}>
                            {STATUS_LABEL[status] ?? "לא ידוע"}
                          </Badge>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Quick stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.45, ease }}
        >
          <Card className="glass border-border/50 bg-gradient-to-r from-primary/5 via-transparent to-primary/5">
            <CardContent className="py-4 px-4 md:px-6">
              {statsLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="size-8 rounded-lg bg-muted/30 animate-pulse" />
                      <div className="space-y-1.5">
                        <div className="h-2.5 w-16 bg-muted/30 rounded animate-pulse" />
                        <div className="h-4 w-10 bg-muted/30 rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {[
                    { label: "שיחות AI סה״כ",      value: actionsTotal,                           icon: Bot },
                    { label: "אחוז הצלחה",          value: stats?.actions.success ?? 0,            suffix: "%", icon: Activity },
                    { label: "מקורות RAG",           value: stats?.knowledge.total_chunks ?? 0,    icon: Zap },
                    { label: "פרופילים פעילים",      value: profilesActive,                         icon: Users },
                    { label: "שגיאות 7 ימים",       value: stats?.actions.error ?? 0,              icon: Shield },
                  ].map((item, i) => (
                    <AnimatedStatItem key={item.label} {...item} delay={600 + i * 100} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

      </div>
    </LazyMotion>
  );
}
