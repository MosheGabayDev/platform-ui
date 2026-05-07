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
export const UPGRADE_DISMISS_KEY = "upgrade-cta:dismissed-v1";

type MetricKey = "tokens" | "api_calls" | "seats";

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
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDismissedKey(localStorage.getItem(UPGRADE_DISMISS_KEY));
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

  // Per-metric dismissal — if the user dismissed a 75% banner for tokens,
  // they should still see one when seats hit 95%.
  const currentKey = `${top.key}:${Math.floor(top.pct / 5) * 5}`;
  if (dismissedKey === currentKey) return null;

  const isOver = top.pct >= 100;
  const message = isOver
    ? t("overLimit", { metric: tMetrics(top.key) })
    : t("nearLimit", { pct: top.pct, metric: tMetrics(top.key) });

  const handleDismiss = () => {
    try {
      localStorage.setItem(UPGRADE_DISMISS_KEY, currentKey);
    } catch {
      // localStorage may be disabled — banner just disappears for this session.
    }
    setDismissedKey(currentKey);
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
