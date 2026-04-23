"use client";

import { motion, LazyMotion, domAnimation } from "framer-motion";
import {
  Users, HeadphonesIcon, Bot, Activity, TrendingUp, TrendingDown,
  AlertCircle, CheckCircle2, Zap, Shield, Database,
  Cpu, Globe, Server, Radio,
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCountUp } from "@/lib/hooks/use-count-up";
import { TiltCard } from "@/components/shared/tilt-card";
import { CursorGlow } from "@/components/shared/cursor-glow";

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

/* Sparkline data */
const sparkUsers = [820, 932, 901, 934, 1290, 1230, 1284].map((v, i) => ({ v, i }));
const sparkTickets = [65, 72, 58, 49, 61, 53, 47].map((v, i) => ({ v, i }));
const sparkAgents = [8, 9, 10, 9, 11, 10, 12].map((v, i) => ({ v, i }));
const sparkResponse = [1.8, 1.6, 1.5, 1.4, 1.3, 1.25, 1.2].map((v, i) => ({ v, i }));

const activityChart = [
  { h: "00", v: 12 }, { h: "03", v: 8 }, { h: "06", v: 25 }, { h: "09", v: 86 },
  { h: "12", v: 140 }, { h: "15", v: 120 }, { h: "18", v: 95 }, { h: "21", v: 65 }, { h: "24", v: 43 },
];

const activity = [
  { type: "success", msg: "פניית helpdesk #1847 נסגרה אוטומטית", time: "2 דק'", icon: CheckCircle2, color: "text-emerald-400" },
  { type: "warning", msg: "שימוש גבוה ב-AI tokens — Acme Corp", time: "5 דק'", icon: AlertCircle, color: "text-amber-400" },
  { type: "success", msg: "גיבוי שבועי הושלם בהצלחה (4.2 GB)", time: "12 דק'", icon: Shield, color: "text-blue-400" },
  { type: "info", msg: "משתמש חדש נרשם: ron@example.com", time: "18 דק'", icon: Users, color: "text-sky-400" },
  { type: "error", msg: "כשל בחיבור Redis — התאושש אוטומטית", time: "34 דק'", icon: AlertCircle, color: "text-red-400" },
  { type: "success", msg: "שיחת ALA #392 הסתיימה — ציון 98%", time: "41 דק'", icon: CheckCircle2, color: "text-emerald-400" },
];

const services = [
  { name: "Flask API",    status: "healthy",  icon: Globe,    latency: "12ms" },
  { name: "PostgreSQL",   status: "healthy",  icon: Database, latency: "3ms" },
  { name: "Redis",        status: "healthy",  icon: Cpu,      latency: "1ms" },
  { name: "Celery",       status: "healthy",  icon: Server,   latency: "—" },
  { name: "Voice Edge",   status: "healthy",  icon: Radio,    latency: "8ms" },
  { name: "RAG DB",       status: "degraded", icon: Database, latency: "210ms" },
  { name: "STUNner TURN", status: "healthy",  icon: Shield,   latency: "4ms" },
  { name: "Gemini API",   status: "healthy",  icon: Bot,      latency: "340ms" },
];

/* Stat card with count-up */
function StatCard({ title, rawValue, numericValue, suffix = "", change, up, icon: Icon, color, accent, border, spark, sparkColor, index }: {
  title: string; rawValue: string; numericValue: number; suffix?: string;
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
        {/* Sparkline */}
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
                fill={`url(#sg-${index})`} dot={false} isAnimationActive={true}
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

export default function DashboardPage() {
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
          <Badge variant="outline" className="gap-1.5 text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            מערכת תקינה
          </Badge>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="משתמשים פעילים" rawValue="1,284" numericValue={1284}
            change="+12%" up icon={Users}
            color="from-blue-500/20 to-blue-600/5" accent="text-blue-400" border="border-blue-500/20"
            spark={sparkUsers} sparkColor="#60a5fa" index={0} />
          <StatCard title="פניות פתוחות" rawValue="47" numericValue={47}
            change="-8%" up icon={HeadphonesIcon}
            color="from-amber-500/20 to-amber-600/5" accent="text-amber-400" border="border-amber-500/20"
            spark={sparkTickets} sparkColor="#fbbf24" index={1} />
          <StatCard title="סוכני AI פעילים" rawValue="12" numericValue={12}
            change="+3" up icon={Bot}
            color="from-purple-500/20 to-purple-600/5" accent="text-purple-400" border="border-purple-500/20"
            spark={sparkAgents} sparkColor="#c084fc" index={2} />
          <StatCard title="זמן תגובה" rawValue="1.2" numericValue={1} suffix=".2s"
            change="-0.3s" up icon={Zap}
            color="from-emerald-500/20 to-emerald-600/5" accent="text-emerald-400" border="border-emerald-500/20"
            spark={sparkResponse} sparkColor="#34d399" index={3} />
        </div>

        {/* Activity chart + feed + services */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Left: chart + feed */}
          <motion.div className="lg:col-span-3 space-y-4"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5, ease }}
          >
            {/* Activity area chart */}
            <Card className="glass border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">פעילות שיחות AI — היום</CardTitle>
                  <Badge variant="secondary" className="text-xs">בזמן אמת</Badge>
                </div>
              </CardHeader>
              <CardContent className="h-36 p-0 pb-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activityChart} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
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
              </CardContent>
            </Card>

            {/* Activity feed */}
            <Card className="glass border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">פעילות אחרונה</CardTitle>
              </CardHeader>
              <CardContent className="p-0 pb-2">
                {activity.map((item, i) => (
                  <motion.div key={i} custom={i} variants={fadeUp} initial="hidden" animate="show"
                    className="flex items-start gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors group"
                  >
                    <div className="mt-0.5 size-7 rounded-full bg-muted/50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <item.icon className={`size-3.5 ${item.color}`} />
                    </div>
                    <p className="text-sm flex-1 leading-snug">{item.msg}</p>
                    <span className="text-[11px] text-muted-foreground/60 shrink-0 whitespace-nowrap">לפני {item.time}</span>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Right: services */}
          <motion.div className="lg:col-span-2"
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35, duration: 0.5, ease }}
          >
            <Card className="glass border-border/50 h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">בריאות שירותים</CardTitle>
                  <span className="text-xs text-muted-foreground">7/8 תקינים</span>
                </div>
              </CardHeader>
              <CardContent className="p-0 pb-3">
                {services.map((svc, i) => (
                  <motion.div key={svc.name} custom={i} variants={fadeUp} initial="hidden" animate="show"
                    className="flex items-center justify-between px-4 py-2 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`size-1.5 rounded-full shrink-0 ${
                        svc.status === "healthy"
                          ? "bg-emerald-400 shadow-[0_0_6px_1px_rgba(52,211,153,0.5)]"
                          : "bg-amber-400 shadow-[0_0_6px_1px_rgba(251,191,36,0.5)] animate-pulse"
                      }`} />
                      <svc.icon className="size-3.5 text-muted-foreground/60 shrink-0" />
                      <span className="text-sm font-medium">{svc.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground/60 font-mono">{svc.latency}</span>
                      <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${
                        svc.status === "healthy"
                          ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                          : "text-amber-400 border-amber-500/30 bg-amber-500/10"
                      }`}>
                        {svc.status === "healthy" ? "תקין" : "דעוך"}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Quick stats */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.45, ease }}
        >
          <Card className="glass border-border/50 bg-gradient-to-r from-primary/5 via-transparent to-primary/5">
            <CardContent className="py-4 px-4 md:px-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {[
                  { label: "שיחות AI היום", value: 2841, icon: Bot },
                  { label: "זמן פעולה", value: 9998, suffix: "%", icon: Activity },
                  { label: "טוקנים (חודש)", value: 4, suffix: ".2M", icon: Zap },
                  { label: "ארגונים פעילים", value: 23, icon: Users },
                  { label: "אירועי אבטחה", value: 0, icon: Shield },
                ].map((item, i) => {
                  const count = useCountUp(item.value, 1600, 600 + i * 100);
                  return (
                    <div key={item.label} className="flex items-center gap-2.5">
                      <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <item.icon className="size-3.5 text-primary/70" />
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground/70 leading-none mb-1">{item.label}</p>
                        <p className="text-sm font-bold tabular-nums">
                          {item.value > 100 ? count.toLocaleString("he") : count}{item.suffix ?? ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

      </div>
    </LazyMotion>
  );
}
