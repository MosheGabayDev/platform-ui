"use client";
/**
 * @module app/(dashboard)/billing/page
 * Billing page — current plan, usage gauges, invoices.
 *
 * Mock-mode shell ready to wire to Stripe per PRODUCT_LAUNCH_PLAN.md §3
 * task 6.05. When 6.03/6.04 land, plan.portal_url + invoices[].pdf_url
 * become real Stripe redirects; everything else stays unchanged.
 *
 * Auth: protected by middleware.ts. Read: any authenticated user.
 * Write (manage payment): redirects to Stripe-hosted portal — no
 * sensitive data ever transits this app.
 */

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, TrendingUp, ExternalLink, Download } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/shared/page-shell";
import { DataTable } from "@/components/shared/data-table";
import { StatCard, StatsGrid } from "@/components/shared/stats";
import { ErrorState } from "@/components/shared/error-state";
import { fetchBillingOverview, MOCK_MODE } from "@/lib/api/billing";
import { queryKeys } from "@/lib/api/query-keys";
import { formatDate } from "@/lib/utils/format";
import { UsageChart } from "@/components/modules/billing/usage-chart";
import type { Invoice, PlanTier, InvoiceStatus } from "@/lib/modules/billing/types";

const PLAN_TIER_BADGE: Record<PlanTier, string> = {
  free: "bg-muted text-muted-foreground border-border",
  pro: "bg-primary/10 text-primary border-primary/30",
  enterprise: "bg-violet-500/15 text-violet-600 border-violet-500/30",
};

const STATUS_BADGE: Record<InvoiceStatus, string> = {
  paid: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  pending: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
};

function UsageGauge({ label, used, limit, of }: { label: string; used: number; limit: number; of: string }) {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const barColor = pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-amber-500" : "bg-primary";
  return (
    <div className="rounded-lg border border-border/50 px-4 py-3 space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs tabular-nums">
          <span className="font-semibold text-foreground">{used.toLocaleString()}</span>
          <span className="text-muted-foreground"> {of} {limit.toLocaleString()}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        />
      </div>
    </div>
  );
}

function useInvoiceColumns(): ColumnDef<Invoice>[] {
  const t = useTranslations("billing.invoices");
  const tCols = useTranslations("billing.invoices.columns");
  const tStatus = useTranslations("billing.invoices.status");
  return useMemo<ColumnDef<Invoice>[]>(
    () => [
      {
        accessorKey: "date",
        header: tCols("date"),
        cell: ({ row }) => (
          <span className="text-sm">{formatDate(row.original.date)}</span>
        ),
      },
      {
        accessorKey: "amount_cents",
        header: tCols("amount"),
        cell: ({ row }) => {
          const inv = row.original;
          const amount = (inv.amount_cents / 100).toLocaleString(undefined, {
            style: "currency",
            currency: inv.currency,
          });
          return <span className="text-sm font-medium tabular-nums">{amount}</span>;
        },
      },
      {
        accessorKey: "status",
        header: tCols("status"),
        cell: ({ row }) => (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${STATUS_BADGE[row.original.status]}`}
          >
            {tStatus(row.original.status)}
          </span>
        ),
      },
      {
        id: "download",
        header: () => <span className="block text-end">{tCols("download")}</span>,
        cell: ({ row }) =>
          row.original.pdf_url ? (
            <div className="text-end">
              <a
                href={row.original.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Download className="size-3.5" />
                {t("columns.download")}
              </a>
            </div>
          ) : (
            <span className="block text-end text-xs text-muted-foreground/60">—</span>
          ),
      },
    ],
    [t, tCols, tStatus],
  );
}

export default function BillingPage() {
  const t = useTranslations("billing");
  const tPlans = useTranslations("billing.plans");
  const tUsage = useTranslations("billing.usage");
  const invoiceColumns = useInvoiceColumns();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.billing.overview(),
    queryFn: fetchBillingOverview,
    staleTime: 60_000,
  });

  const overview = data?.data;

  return (
    <PageShell
      icon={CreditCard}
      title={t("title")}
      subtitle={t("subtitle")}
      actions={
        overview?.plan ? (
          <Button
            size="sm"
            disabled={!overview.plan.portal_url}
            onClick={() => {
              if (overview.plan.portal_url) window.location.assign(overview.plan.portal_url);
            }}
          >
            <ExternalLink className="size-3.5 me-1.5" />
            {t("managePayment")}
          </Button>
        ) : undefined
      }
    >
      {error && <ErrorState error={error} onRetry={refetch} />}

      {MOCK_MODE && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          {t("backendNotice")}
        </div>
      )}

      {/* Plan + KPI tiles */}
      {!isLoading && overview && (
        <>
          <div className="glass border-border/50 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("currentPlan")}</p>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold border ${PLAN_TIER_BADGE[overview.plan.tier]}`}>
                    {tPlans(overview.plan.tier)}
                  </span>
                  <span className="text-2xl font-bold tabular-nums">
                    ${overview.plan.monthly_price}
                    <span className="text-xs font-normal text-muted-foreground"> / mo</span>
                  </span>
                </div>
              </div>
              {overview.plan.next_billing_at && (
                <div className="text-end space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("nextInvoiceDate")}</p>
                  <p className="text-sm font-medium">{formatDate(overview.plan.next_billing_at)}</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">{tUsage("title")}</h2>
            </div>
            <StatsGrid>
              <StatCard icon={TrendingUp} value={overview.usage.tokens.used.toLocaleString()} label={tUsage("tokens")} />
              <StatCard icon={TrendingUp} value={overview.usage.api_calls.used.toLocaleString()} label={tUsage("apiCalls")} />
              <StatCard icon={TrendingUp} value={overview.usage.seats.used} label={tUsage("seats")} />
            </StatsGrid>
            <div className="grid gap-2 md:grid-cols-3">
              <UsageGauge label={tUsage("tokens")} used={overview.usage.tokens.used} limit={overview.usage.tokens.limit} of={tUsage("of")} />
              <UsageGauge label={tUsage("apiCalls")} used={overview.usage.api_calls.used} limit={overview.usage.api_calls.limit} of={tUsage("of")} />
              <UsageGauge label={tUsage("seats")} used={overview.usage.seats.used} limit={overview.usage.seats.limit} of={tUsage("of")} />
            </div>
          </div>

          <UsageChart />

          <div className="space-y-2">
            <h2 className="text-sm font-semibold">{t("invoices.title")}</h2>
            <DataTable
              columns={invoiceColumns}
              data={overview.invoices}
              emptyMessage={t("invoices.empty")}
            />
          </div>
        </>
      )}
    </PageShell>
  );
}
