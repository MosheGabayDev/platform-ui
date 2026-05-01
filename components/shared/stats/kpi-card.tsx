"use client";
/**
 * @module components/shared/stats/kpi-card
 *
 * Rich KPI card used in dashboards and module home pages. Pairs a numeric
 * value with optional trend delta and a sparkline, all wrapped with the
 * platform's TiltCard + CursorGlow chrome and a Framer Motion entrance.
 *
 * For simple inline chips (value + label + icon), use `StatCard` from this
 * same barrel — different visual weight, different consumer.
 *
 * Pattern history: extracted from app/(dashboard)/page.tsx in R041G to make
 * the same card available to every module dashboard (Helpdesk, AI Agents,
 * Module Manager, etc.) without duplicating count-up / sparkline code.
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TiltCard } from "@/components/shared/tilt-card";
import { CursorGlow } from "@/components/shared/cursor-glow";
import { useCountUp } from "@/lib/hooks/use-count-up";

export interface KpiSparkPoint {
  v: number;
  i: number;
}

export interface KpiCardProps {
  /** Card heading shown above the value. */
  title: string;
  /** Primary numeric value — animated with count-up. */
  numericValue: number;
  /** Optional suffix shown after the value (e.g. "%"). */
  suffix?: string;
  /** Optional trend delta label (e.g. "+12%"). When omitted no trend row. */
  change?: string;
  /** Whether trend is up (green) or down (red). Required when `change` set. */
  up?: boolean;
  /** Icon shown in the top-end corner badge. */
  icon: LucideIcon;
  /** Tailwind gradient classes for card + icon-badge background. */
  color: string;
  /** Tailwind text color used for the value and icon. */
  accent: string;
  /** Tailwind border color. */
  border: string;
  /** 7-point sparkline series. Omit to hide the sparkline strip. */
  spark?: KpiSparkPoint[];
  /** CSS color for the sparkline gradient (e.g. "#34d399"). */
  sparkColor?: string;
  /**
   * Stagger index for the entrance animation. Pass the position of the
   * card within its grid. Defaults to 0 (no stagger).
   */
  index?: number;
  /** Override the default sub-label "משבוע שעבר". */
  changeSuffixLabel?: string;
}

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  show: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: i * 0.06, duration: 0.4, ease },
  }),
};

export function KpiCard({
  title,
  numericValue,
  suffix = "",
  change,
  up,
  icon: Icon,
  color,
  accent,
  border,
  spark,
  sparkColor,
  index = 0,
  changeSuffixLabel = "משבוע שעבר",
}: KpiCardProps) {
  const count = useCountUp(numericValue, 1400, index * 120);
  const display = numericValue > 100 ? count.toLocaleString("he") : count;
  const sparkId = `kpi-spark-${index}`;
  // Defer sparkline render until after first paint so ResponsiveContainer
  // measures a non-zero parent width (Recharts emits width(-1)/height(-1)
  // warnings during the initial 0×0 layout window — see Q30 in
  // docs/system-upgrade/08-decisions/open-questions.md).
  const [sparkReady, setSparkReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setSparkReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <motion.div custom={index} variants={scaleIn} initial="hidden" animate="show">
      <TiltCard>
        <CursorGlow>
          <Card
            className={`relative overflow-hidden border ${border} bg-gradient-to-br ${color} cursor-default`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {title}
              </CardTitle>
              <div
                className={`size-7 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center border ${border}`}
              >
                <Icon className={`size-3.5 ${accent}`} />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-0">
              <div
                className={`text-3xl font-bold tracking-tight tabular-nums ${accent}`}
              >
                {display}
                {suffix}
              </div>
              {change && (
                <div className="flex items-center gap-1 mt-1">
                  {up ? (
                    <TrendingUp className="size-3 text-emerald-400" />
                  ) : (
                    <TrendingDown className="size-3 text-red-400" />
                  )}
                  <span
                    className={`text-xs font-medium ${
                      up ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {change}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {changeSuffixLabel}
                  </span>
                </div>
              )}
            </CardContent>
            {spark && sparkColor && (
              <div className="h-12 mt-1 min-w-[40px]">
                {sparkReady && (
                  <ResponsiveContainer width="100%" height="100%" minWidth={40}>
                    <AreaChart data={spark} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id={sparkId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={sparkColor} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={sparkColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke={sparkColor}
                      strokeWidth={1.5}
                      fill={`url(#${sparkId})`}
                      dot={false}
                      isAnimationActive
                      animationDuration={1200}
                      animationEasing="ease-out"
                    />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}
          </Card>
        </CursorGlow>
      </TiltCard>
    </motion.div>
  );
}
