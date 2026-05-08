"use client";
/**
 * @module components/shared/stats/kpi-sparkline
 * Recharts inner of KpiCard sparkline. Split out so the parent can
 * lazy-load Recharts via next/dynamic.
 *
 * Consume through `<KpiCard />` — not directly.
 */

import { AreaChart, Area, ResponsiveContainer } from "recharts";
import type { KpiSparkPoint } from "./kpi-card";

interface KpiSparklineProps {
  data: KpiSparkPoint[];
  color: string;
  gradientId: string;
}

export default function KpiSparkline({ data, color, gradientId }: KpiSparklineProps) {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={40}>
      <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${gradientId})`}
          dot={false}
          isAnimationActive
          animationDuration={1200}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
