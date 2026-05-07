"use client";
/**
 * @module components/shared/upgrade-cta
 * In-product upgrade nudge — banner that appears when the org is near
 * or over a usage limit (tokens / api_calls / seats).
 *
 * Spec: docs/system-upgrade/PRODUCT_LAUNCH_PLAN.md §3 task 6.13.
 *
 * Design rules:
 * - Shows only the *highest* utilization metric to avoid banner spam.
 * - Two severity levels: warning (≥80%) and over-limit (≥100%).
 * - Dismissed state persists per-metric in localStorage so a hidden
 *   banner doesn't reappear on every page nav, but resets to visible
 *   when a NEW metric crosses the threshold.
 * - Returns null when query loading / errored / under threshold —
 *   never blocks page render.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { TrendingUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchBillingOverview } from "@/lib/api/billing";
import { queryKeys } from "@/lib/api/query-keys";
import { cn } from "@/lib/utils";

export const UPGRADE_WARN_THRESHOLD = 80;
/**
 * localStorage key holding a JSON map of `{ [metric]: lastDismissedBucket }`,
 * where bucket is the metric's utilization rounded down to 5pp. Storing
 * a map (not a single scalar) means dismissing one metric does not erase
 * the dismissal of another — surfaced as a HIGH-confidence finding in the
 * post-batch code review on 2026-05-08.
 */
export const UPGRADE_DISMISS_KEY = "upgrade-cta:dismissed-v2";

type MetricKey = "tokens" | "api_calls" | "seats";

type DismissedMap = Partial<Record<MetricKey, number>>;

function readDismissed(): DismissedMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(UPGRADE_DISMISS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as DismissedMap) : {};
  } catch {
    return {};
  }
}

interface MetricStat {
  key: MetricKey;
  used: number;
  limit: number;
  pct: number;
}

/** Returns the metric closest to (or over) its limit, if any are ≥ threshold. */
export function pickMostUtilized(stats: MetricStat[]): MetricStat | null {
  const sorted = [...stats].sort((a, b) => b.pct - a.pct);
  const top = sorted[0];
  if (!top) return null;
  return top.pct >= UPGRADE_WARN_THRESHOLD ? top : null;
}

interface UpgradeCtaProps {
  /** Override the warning threshold (defaults to 80%). */
  threshold?: number;
  className?: string;
}

export function UpgradeCta({ threshold = UPGRADE_WARN_THRESHOLD, className }: UpgradeCtaProps) {
  const t = useTranslations("upgradeCta");
  const tMetrics = useTranslations("upgradeCta.metrics");
  const [dismissed, setDismissed] = useState<DismissedMap>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDismissed(readDismissed());
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.billing.overview(),
    queryFn: fetchBillingOverview,
    staleTime: 60_000,
  });

  if (!mounted || isLoading || isError) return null;

  const usage = data?.data?.usage;
  if (!usage) return null;

  const stats: MetricStat[] = (["tokens", "api_calls", "seats"] as MetricKey[]).map((key) => {
    const u = usage[key];
    return { key, used: u.used, limit: u.limit, pct: Math.round((u.used / u.limit) * 100) };
  });

  const sorted = [...stats].sort((a, b) => b.pct - a.pct);
  const top = sorted[0];
  if (!top || top.pct < threshold) return null;

  // Per-metric dismissal: only re-show this metric's banner when its
  // bucket (5pp granularity) is *higher* than the last dismissed bucket.
  // Storing a map (not a single scalar) means dismissing tokens at 80
  // does not erase a prior dismissal of seats at 95.
  const currentBucket = Math.floor(top.pct / 5) * 5;
  const lastDismissed = dismissed[top.key];
  if (lastDismissed !== undefined && lastDismissed >= currentBucket) return null;

  const isOver = top.pct >= 100;
  const message = isOver
    ? t("overLimit", { metric: tMetrics(top.key) })
    : t("nearLimit", { pct: top.pct, metric: tMetrics(top.key) });

  const handleDismiss = () => {
    const next: DismissedMap = { ...dismissed, [top.key]: currentBucket };
    try {
      localStorage.setItem(UPGRADE_DISMISS_KEY, JSON.stringify(next));
    } catch {
      // localStorage may be disabled — banner just disappears for this session.
    }
    setDismissed(next);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3",
        isOver
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400",
        className,
      )}
    >
      <TrendingUp className="size-4 shrink-0 mt-0.5" aria-hidden />
      <p className="text-sm flex-1 leading-relaxed">{message}</p>
      <div className="flex items-center gap-2 shrink-0">
        <Button asChild size="sm" variant={isOver ? "destructive" : "default"} className="h-7 text-xs">
          <Link href="/billing">{t("cta")}</Link>
        </Button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t("dismiss")}
          className="opacity-50 hover:opacity-100 transition-opacity"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
