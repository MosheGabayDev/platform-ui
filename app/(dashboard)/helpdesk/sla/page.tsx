"use client";
/**
 * @module app/(dashboard)/helpdesk/sla/page
 * SLA page (Phase C) — policies + compliance breakdown by priority.
 * MOCK MODE returns 4 fixture policies + computed compliance from MOCK_TICKETS state.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, LazyMotion, domAnimation } from "framer-motion";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Clock,
  CheckCircle,
  Shield,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { FeatureGate } from "@/components/shared/feature-gate";
import { PageShell } from "@/components/shared/page-shell";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { TicketPriorityBadge } from "@/components/modules/helpdesk/ticket-priority-badge";
import { fetchSLAPolicies, fetchSLACompliance } from "@/lib/api/helpdesk";
import { queryKeys } from "@/lib/api/query-keys";
import { useRegisterPageContext } from "@/lib/hooks/use-register-page-context";
import { PAGE_EASE } from "@/lib/ui/motion";
import type { SLAPolicy } from "@/lib/modules/helpdesk/types";

function complianceTone(pct: number): string {
  if (pct >= 95) return "text-emerald-600 dark:text-emerald-400";
  if (pct >= 85) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.round(mins / 60)}h`;
  return `${Math.round(mins / 1440)}d`;
}

// ISO weekday: 1=Monday … 7=Sunday (matches Flask `shift_days` / `business_days` defaults).
const DAY_LABELS_ISO: Record<number, string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
};

function SLAInner() {
  const { data: policies, isLoading: policiesLoading, error: policiesError } = useQuery({
    queryKey: queryKeys.helpdesk.slaPolicies(),
    queryFn: fetchSLAPolicies,
  });

  const { data: compliance } = useQuery({
    queryKey: queryKeys.helpdesk.slaCompliance(),
    queryFn: fetchSLACompliance,
  });

  const c = compliance?.data;

  useRegisterPageContext({
    pageKey: "helpdesk.sla",
    route: "/helpdesk/sla",
    summary: c
      ? `Helpdesk SLA: ${c.overall_compliance_pct}% overall compliance, ${c.active_breaches} active breaches across ${policies?.data?.total ?? 0} policies.`
      : "Helpdesk SLA configuration page",
    availableActions: [],
  });

  const columns = useMemo<ColumnDef<SLAPolicy>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Policy",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.original.name}</span>
            {row.original.is_default && (
              <Badge variant="outline" className="text-xs">
                Default
              </Badge>
            )}
          </div>
        ),
      },
      {
        accessorKey: "priority_label",
        header: "Priority",
        cell: ({ row }) => (
          <TicketPriorityBadge priority={row.original.priority_label} />
        ),
      },
      {
        accessorKey: "response_minutes",
        header: "Response",
        cell: ({ row }) => (
          <span className="text-sm font-mono">{formatMinutes(row.original.response_minutes)}</span>
        ),
      },
      {
        accessorKey: "resolution_minutes",
        header: "Resolution",
        cell: ({ row }) => (
          <span className="text-sm font-mono">{formatMinutes(row.original.resolution_minutes)}</span>
        ),
      },
      {
        accessorKey: "business_hours_only",
        header: "Window",
        cell: ({ row }) => {
          const p = row.original;
          if (!p.business_hours_only) {
            return <span className="text-xs text-muted-foreground">24/7</span>;
          }
          const days = p.business_days
            .slice(0, 5)
            .map((d) => DAY_LABELS_ISO[d] ?? String(d))
            .join(", ");
          return (
            <span className="text-xs text-muted-foreground">
              {p.business_start?.slice(0, 5)}–{p.business_end?.slice(0, 5)} · {days}
            </span>
          );
        },
      },
      {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) =>
          row.original.is_active ? (
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
              Active
            </Badge>
          ) : (
            <Badge variant="outline" className="border-muted text-muted-foreground">
              Inactive
            </Badge>
          ),
      },
    ],
    [],
  );

  return (
    <LazyMotion features={domAnimation}>
      <PageShell
        icon={Activity}
        title="SLA"
        subtitle="Policies and compliance by priority"
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: PAGE_EASE } }}
          className="space-y-6 pb-20 md:pb-0"
        >
          {/* KPI tiles */}
          {c && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass border-border/50 rounded-xl p-4 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Overall</span>
                  <Shield className={`h-4 w-4 ${complianceTone(c.overall_compliance_pct)}`} aria-hidden="true" />
                </div>
                <span className={`text-2xl font-semibold ${complianceTone(c.overall_compliance_pct)}`}>
                  {c.overall_compliance_pct.toFixed(1)}%
                </span>
              </div>
              <div className="glass border-border/50 rounded-xl p-4 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Response SLA</span>
                  <Clock className={`h-4 w-4 ${complianceTone(c.response_compliance_pct)}`} aria-hidden="true" />
                </div>
                <span className={`text-2xl font-semibold ${complianceTone(c.response_compliance_pct)}`}>
                  {c.response_compliance_pct.toFixed(1)}%
                </span>
              </div>
              <div className="glass border-border/50 rounded-xl p-4 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Resolution SLA</span>
                  <CheckCircle className={`h-4 w-4 ${complianceTone(c.resolution_compliance_pct)}`} aria-hidden="true" />
                </div>
                <span className={`text-2xl font-semibold ${complianceTone(c.resolution_compliance_pct)}`}>
                  {c.resolution_compliance_pct.toFixed(1)}%
                </span>
              </div>
              <div className="glass border-border/50 rounded-xl p-4 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Active breaches</span>
                  <AlertTriangle
                    className={`h-4 w-4 ${
                      c.active_breaches > 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"
                    }`}
                    aria-hidden="true"
                  />
                </div>
                <span
                  className={`text-2xl font-semibold ${
                    c.active_breaches > 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground"
                  }`}
                >
                  {c.active_breaches}
                </span>
              </div>
            </div>
          )}

          {/* Compliance by priority */}
          {c && (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Compliance by priority
              </h2>
              <div className="glass border-border/50 rounded-xl p-4 space-y-2">
                {c.by_priority.map((row) => (
                  <div key={row.priority} className="flex items-center gap-3">
                    <div className="w-20 shrink-0">
                      <TicketPriorityBadge priority={row.priority} />
                    </div>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full ${
                          row.compliance_pct >= 95
                            ? "bg-emerald-500"
                            : row.compliance_pct >= 85
                              ? "bg-amber-500"
                              : "bg-rose-500"
                        }`}
                        style={{ width: `${row.compliance_pct}%` }}
                        role="progressbar"
                        aria-valuenow={row.compliance_pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      />
                    </div>
                    <div className="w-32 text-right">
                      <span className={`text-sm font-mono ${complianceTone(row.compliance_pct)}`}>
                        {row.compliance_pct.toFixed(1)}%
                      </span>
                      <span className="text-xs text-muted-foreground ms-2">
                        ({row.on_track}/{row.total})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Policies table */}
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Policies
            </h2>
            <DataTable
              columns={columns}
              data={policies?.data?.policies ?? []}
              isLoading={policiesLoading}
              error={policiesError as Error | null}
              emptyMessage="No SLA policies configured"
            />
          </section>
        </motion.div>
      </PageShell>
    </LazyMotion>
  );
}

export default function HelpdeskSLAPage() {
  return (
    <FeatureGate
      flag="helpdesk.enabled"
      fallback={
        <PageShell icon={Activity} title="SLA" subtitle="Coming soon">
          <EmptyState
            icon={AlertCircle}
            title="Helpdesk not enabled"
            description="The Helpdesk module is not enabled for your organization."
          />
        </PageShell>
      }
    >
      <SLAInner />
    </FeatureGate>
  );
}
