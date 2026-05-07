"use client";
/**
 * @module components/modules/billing/usage-chart
 * Per-day usage area-chart for the billing page.
 *
 * Spec: docs/system-upgrade/PRODUCT_LAUNCH_PLAN.md §3 task 6.11.
 *
 * Subscribes to `queryKeys.billing.usageSeries(days)`. Renders a
 * dual-series Recharts AreaChart (tokens + api_calls) using the
 * platform's existing chart primitives. Tokens render against the
 * left axis, api_calls against the right.
 */

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
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
import { fetchUsageSeries } from "@/lib/api/billing";
import { queryKeys } from "@/lib/api/query-keys";
import { Skeleton } from "@/components/ui/skeleton";

interface UsageChartProps {
  /** Number of past days to chart. Default: 30. */
  days?: number;
  className?: string;
}

export function UsageChart({ days = 30, className }: UsageChartProps) {
  const t = useTranslations("billing.chart");
  // Defer chart render until after first paint so ResponsiveContainer
  // measures a non-zero parent width (Q30 in open-questions.md).
  const [chartReady, setChartReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setChartReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.billing.usageSeries(days),
    queryFn: () => fetchUsageSeries(days),
    staleTime: 5 * 60_000,
  });

  return (
    <div className={`glass border-border/50 rounded-xl px-5 py-4 space-y-3 ${className ?? ""}`}>
      <h2 className="text-sm font-semibold">{t("title")}</h2>

      {isLoading || !chartReady ? (
        <div className="space-y-2" data-testid="usage-chart-loading">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <div className="h-48 w-full" data-testid="usage-chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.data?.series ?? []}>
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
              <YAxis
                yAxisId="calls"
                orientation="right"
                tick={{ fontSize: 11 }}
              />
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
                name={t("tokens")}
                stroke="#6366f1"
                strokeWidth={1.5}
                fill="url(#usage-tokens)"
              />
              <Area
                yAxisId="calls"
                type="monotone"
                dataKey="api_calls"
                name={t("apiCalls")}
                stroke="#10b981"
                strokeWidth={1.5}
                fill="url(#usage-calls)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
