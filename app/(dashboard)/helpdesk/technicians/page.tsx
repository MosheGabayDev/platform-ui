"use client";
/**
 * @module app/(dashboard)/helpdesk/technicians/page
 * Technicians page (Phase B) — list of helpdesk technicians with availability +
 * utilization summary. MOCK MODE returns 3 fixture technicians.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { motion, LazyMotion, domAnimation } from "framer-motion";
import { Users as UsersIcon, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { FeatureGate } from "@/components/shared/feature-gate";
import { PageShell } from "@/components/shared/page-shell";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { fetchTechnicians, fetchTechnicianUtilization } from "@/lib/api/helpdesk";
import { queryKeys } from "@/lib/api/query-keys";
import { useRegisterPageContext } from "@/lib/hooks/use-register-page-context";
import { PAGE_EASE } from "@/lib/ui/motion";
import type { TechnicianProfile } from "@/lib/modules/helpdesk/types";

function utilizationTone(pct: number): string {
  if (pct >= 90) return "text-rose-600 dark:text-rose-400";
  if (pct >= 70) return "text-amber-600 dark:text-amber-400";
  return "text-emerald-600 dark:text-emerald-400";
}

function TechniciansInner() {
  const tt = useTranslations("helpdesk.technicians");
  const { data: list, isLoading: listLoading, error: listError } = useQuery({
    queryKey: queryKeys.helpdesk.technicians(),
    queryFn: () => fetchTechnicians(false),
  });

  const { data: util } = useQuery({
    queryKey: queryKeys.helpdesk.technicianUtilization(),
    queryFn: fetchTechnicianUtilization,
  });

  const technicians = list?.data?.technicians ?? [];

  useRegisterPageContext({
    pageKey: "helpdesk.technicians",
    route: "/helpdesk/technicians",
    entityType: "technician",
    summary: `Helpdesk technicians: ${technicians.length} total, ${technicians.filter((t) => t.is_available).length} available. Avg utilization: ${util?.data?.avg_utilization_pct ?? 0}%.`,
    availableActions: [],
  });

  const columns = useMemo<ColumnDef<TechnicianProfile>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.name}</div>
            <div className="text-xs text-muted-foreground">{row.original.email}</div>
          </div>
        ),
      },
      {
        accessorKey: "is_available",
        header: "Status",
        cell: ({ row }) =>
          row.original.is_available ? (
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
              <CheckCircle className="h-3 w-3 me-1" aria-hidden="true" />
              Available
            </Badge>
          ) : (
            <Badge variant="outline" className="border-muted text-muted-foreground">
              <XCircle className="h-3 w-3 me-1" aria-hidden="true" />
              Off-shift
            </Badge>
          ),
      },
      {
        accessorKey: "active_tickets",
        header: "Load",
        cell: ({ row }) => {
          const t = row.original;
          const pct = t.max_concurrent > 0 ? Math.round((t.active_tickets / t.max_concurrent) * 100) : 0;
          return (
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono">
                {t.active_tickets}/{t.max_concurrent}
              </span>
              <span className={`text-xs ${utilizationTone(pct)}`}>({pct}%)</span>
            </div>
          );
        },
      },
      {
        accessorKey: "skills",
        header: "Skills",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.skills.slice(0, 3).map((skill) => (
              <Badge key={skill} variant="outline" className="text-xs">
                {skill}
              </Badge>
            ))}
            {row.original.skills.length > 3 && (
              <span className="text-xs text-muted-foreground">+{row.original.skills.length - 3}</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "shift_start",
        header: "Shift",
        cell: ({ row }) =>
          row.original.shift_start && row.original.shift_end
            ? `${row.original.shift_start.slice(0, 5)}–${row.original.shift_end.slice(0, 5)}`
            : "—",
      },
    ],
    [],
  );

  return (
    <LazyMotion features={domAnimation}>
      <PageShell icon={UsersIcon} title={tt("title")} subtitle={tt("subtitle")}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: PAGE_EASE } }}
          className="space-y-4 pb-20 md:pb-0"
        >
          {util?.data && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass border-border/50 rounded-xl p-4">
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="text-2xl font-semibold">{util.data.technicians.length}</div>
              </div>
              <div className="glass border-border/50 rounded-xl p-4">
                <div className="text-xs text-muted-foreground">Available now</div>
                <div className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                  {util.data.technicians.filter((t) => t.is_available).length}
                </div>
              </div>
              <div className="glass border-border/50 rounded-xl p-4">
                <div className="text-xs text-muted-foreground">Avg utilization</div>
                <div className={`text-2xl font-semibold ${utilizationTone(util.data.avg_utilization_pct)}`}>
                  {util.data.avg_utilization_pct.toFixed(1)}%
                </div>
              </div>
            </div>
          )}

          <DataTable
            columns={columns}
            data={technicians}
            isLoading={listLoading}
            error={listError as Error | null}
            emptyMessage="No technicians configured for this org"
          />
        </motion.div>
      </PageShell>
    </LazyMotion>
  );
}

function TechniciansDisabledFallback() {
  const tt = useTranslations("helpdesk.technicians");
  const tHd = useTranslations("helpdesk.tickets");
  return (
    <PageShell icon={UsersIcon} title={tt("title")} subtitle={tHd("comingSoon")}>
      <EmptyState
        icon={AlertCircle}
        title={tt("notEnabled")}
        description="The Helpdesk module is not enabled for your organization."
      />
    </PageShell>
  );
}

export default function HelpdeskTechniciansPage() {
  return (
    <FeatureGate flag="helpdesk.enabled" fallback={<TechniciansDisabledFallback />}>
      <TechniciansInner />
    </FeatureGate>
  );
}
