"use client";
/**
 * @module app/(dashboard)/helpdesk/page
 * Helpdesk module dashboard — KPI cards (Phase A).
 *
 * Auth: protected by middleware.ts.
 * Feature flag: gated by `helpdesk.enabled` (FeatureGate fail-closed).
 * Data: via useQuery → fetchHelpdeskStats() → /api/proxy/helpdesk/dashboard/stats.
 *       MOCK MODE until R042-BE-min through R046-min land per ADR-040.
 *
 * Spec: docs/modules/04-helpdesk/PLAN.md
 *       docs/system-upgrade/10-tasks/helpdesk-phase-a/epic.md
 */
import { useQuery } from "@tanstack/react-query";
import { motion, LazyMotion, domAnimation } from "framer-motion";
import { HeadphonesIcon, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { FeatureGate } from "@/components/shared/feature-gate";
import { PageShell } from "@/components/shared/page-shell";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCardSkeleton } from "@/components/shared/skeleton-card";
import { fetchHelpdeskStats } from "@/lib/api/helpdesk";
import { queryKeys } from "@/lib/api/query-keys";
import { useRegisterPageContext } from "@/lib/hooks/use-register-page-context";
import { PAGE_EASE } from "@/lib/ui/motion";

const KPI_FRAMES = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: PAGE_EASE } },
};

function HelpdeskPageInner() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.helpdesk.stats(),
    queryFn: fetchHelpdeskStats,
    refetchInterval: 60_000,
  });

  const stats = data?.data;

  useRegisterPageContext({
    pageKey: "helpdesk.dashboard",
    route: "/helpdesk",
    summary: stats
      ? `Helpdesk dashboard. Open: ${stats.open_tickets}, resolved today: ${stats.resolved_today}, SLA: ${stats.sla_compliance_pct}%.`
      : "Helpdesk dashboard (loading).",
    availableActions: [],
  });

  return (
    <LazyMotion features={domAnimation}>
      <PageShell
        icon={HeadphonesIcon}
        title="Helpdesk"
        subtitle="Ticket queue + service-level KPIs"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-20 md:pb-0">
          {isLoading && (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          )}
          {error && !isLoading && (
            <div className="col-span-full">
              <ErrorState error={error} onRetry={() => refetch()} />
            </div>
          )}
          {stats && !isLoading && (
            <>
              <motion.div variants={KPI_FRAMES} initial="initial" animate="animate">
                <KpiTile
                  icon={AlertTriangle}
                  label="Open tickets"
                  value={stats.open_tickets}
                  tone="warning"
                />
              </motion.div>
              <motion.div variants={KPI_FRAMES} initial="initial" animate="animate">
                <KpiTile
                  icon={CheckCircle}
                  label="Resolved today"
                  value={stats.resolved_today}
                  tone="success"
                />
              </motion.div>
              <motion.div variants={KPI_FRAMES} initial="initial" animate="animate">
                <KpiTile
                  icon={Clock}
                  label="Avg resolution"
                  value={`${stats.avg_resolution_hours.toFixed(1)}h`}
                  tone="default"
                />
              </motion.div>
              <motion.div variants={KPI_FRAMES} initial="initial" animate="animate">
                <KpiTile
                  icon={CheckCircle}
                  label="SLA compliance"
                  value={`${stats.sla_compliance_pct.toFixed(1)}%`}
                  tone={stats.sla_compliance_pct >= 95 ? "success" : "warning"}
                />
              </motion.div>
            </>
          )}
        </div>
      </PageShell>
    </LazyMotion>
  );
}

interface KpiTileProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  tone: "default" | "warning" | "success";
}

function KpiTile({ icon: Icon, label, value, tone }: KpiTileProps) {
  const toneClasses = {
    default: "text-foreground",
    warning: "text-amber-600 dark:text-amber-400",
    success: "text-emerald-600 dark:text-emerald-400",
  };
  return (
    <div className="glass border-border/50 rounded-xl p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${toneClasses[tone]}`} aria-hidden="true" />
      </div>
      <span className={`text-2xl font-semibold ${toneClasses[tone]}`}>{value}</span>
    </div>
  );
}

export default function HelpdeskPage() {
  return (
    <FeatureGate
      flag="helpdesk.enabled"
      fallback={
        <PageShell icon={HeadphonesIcon} title="Helpdesk" subtitle="Coming soon">
          <EmptyState
            icon={HeadphonesIcon}
            title="Helpdesk not enabled"
            description="The Helpdesk module is not enabled for your organization. Contact your admin to enable it."
          />
        </PageShell>
      }
    >
      <HelpdeskPageInner />
    </FeatureGate>
  );
}
