"use client";
/**
 * @module components/modules/billing/usage-chart
 * Per-day usage area-chart for the billing page.
 *
 * Spec: docs/system-upgrade/PRODUCT_LAUNCH_PLAN.md §3 task 6.11.
 *
 * Recharts (~200KB + d3 leaves) lazy-loaded via next/dynamic to keep
 * /billing initial JS lean. SSR off — chart needs window for measure.
 */

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { fetchUsageSeries } from "@/lib/api/billing";
import { queryKeys } from "@/lib/api/query-keys";
import { Skeleton } from "@/components/ui/skeleton";

const UsageChartRecharts = dynamic(() => import("./usage-chart-recharts"), {
  ssr: false,
  loading: () => <Skeleton className="h-40 w-full" />,
});

interface UsageChartProps {
  /** Number of past days to chart. Default: 30. */
  days?: number;
  className?: string;
}

export function UsageChart({ days = 30, className }: UsageChartProps) {
  const t = useTranslations("billing.chart");
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
          <UsageChartRecharts
            series={data?.data?.series ?? []}
            tokensLabel={t("tokens")}
            apiCallsLabel={t("apiCalls")}
          />
        </div>
      )}
    </div>
  );
}
