"use client";
/**
 * @module components/modules/billing/usage-chart-recharts
 * Recharts inner of UsageChart, split out so the parent can lazy-load
 * Recharts (~200KB) via next/dynamic. Initial bundle for /billing
 * drops by the size of recharts + d3 leaves.
 *
 * This file is the dynamic-import target — DO NOT use it directly.
 * Consume through `<UsageChart />` in `usage-chart.tsx`.
 */

import {
  AreaChart,
  Area,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { UsagePoint } from "@/lib/modules/billing/types";

interface UsageChartRechartsProps {
  series: UsagePoint[];
  tokensLabel: string;
  apiCallsLabel: string;
}

export default function UsageChartRecharts({
  series,
  tokensLabel,
  apiCallsLabel,
}: UsageChartRechartsProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={series}>
        <defs>
          <linearGradient id="usage-tokens" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="usage-calls" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickFormatter={(s: string) => s.slice(5)}
        />
        <YAxis
          yAxisId="tokens"
          orientation="left"
          tick={{ fontSize: 11 }}
          tickFormatter={(n: number) => `${(n / 1000).toFixed(0)}k`}
        />
        <YAxis yAxisId="calls" orientation="right" tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Area
          yAxisId="tokens"
          type="monotone"
          dataKey="tokens"
          name={tokensLabel}
          stroke="#6366f1"
          strokeWidth={1.5}
          fill="url(#usage-tokens)"
        />
        <Area
          yAxisId="calls"
          type="monotone"
          dataKey="api_calls"
          name={apiCallsLabel}
          stroke="#10b981"
          strokeWidth={1.5}
          fill="url(#usage-calls)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
