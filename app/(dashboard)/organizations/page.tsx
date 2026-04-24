"use client";
/**
 * @module app/(dashboard)/organizations/page
 * Organizations module list page — system admin only.
 *
 * Auth: protected by middleware.ts. System admin gate enforced here + on Flask.
 * Data: via useQuery → fetchOrgs() → /api/proxy/organizations → Flask /api/organizations.
 *
 * Do NOT put business logic here. Do NOT fetch directly with fetch().
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Building2 } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PermissionGate } from "@/components/shared/permission-gate";
import { PageShell } from "@/components/shared/page-shell";
import { StatCard } from "@/components/shared/stats";
import { ErrorState } from "@/components/shared/error-state";
import { OrgsTable } from "@/components/modules/organizations/orgs-table";
import { fetchOrgs, fetchOrgStats } from "@/lib/api/organizations";
import { queryKeys } from "@/lib/api/query-keys";
import { PAGE_EASE } from "@/lib/ui/motion";
import type { OrgsListParams } from "@/lib/modules/organizations/types";

export default function OrganizationsPage() {
  const router = useRouter();

  const [params, setParams] = useState<OrgsListParams>({ page: 1, per_page: 25 });
  const [search, setSearch] = useState("");

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setParams((p) => ({ ...p, page: 1, search: value || undefined }));
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setParams((p) => ({ ...p, page }));
  }, []);

  const { data: listData, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.orgs.list(params),
    queryFn: () => fetchOrgs(params),
    staleTime: 30_000,
  });

  const { data: statsData } = useQuery({
    queryKey: queryKeys.orgs.stats(),
    queryFn: fetchOrgStats,
    staleTime: 60_000,
  });

  const stats = statsData?.data;
  const list = listData?.data;

  return (
    <PermissionGate systemAdminOnly fallback={
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        אין הרשאה לצפות בעמוד זה
      </div>
    }>
      <PageShell
        icon={Building2}
        title="ניהול ארגונים"
        subtitle="כל הארגונים בפלטפורמה — גישת מנהל מערכת בלבד"
        stats={
          <>
            <StatCard value={stats?.total} label='סה"כ' />
            <StatCard
              value={stats?.active}
              label="פעילים"
              color="border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
            />
            {(stats?.inactive ?? 0) > 0 && (
              <StatCard
                value={stats?.inactive}
                label="לא פעילים"
                color="border-muted text-muted-foreground"
              />
            )}
          </>
        }
      >
        {error && !isLoading && (
          <ErrorState
            error={error}
            onRetry={refetch}
            messages={{ default: "שגיאה בטעינת הארגונים" }}
          />
        )}

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4, ease: PAGE_EASE }}
          className="glass border-border/50 rounded-xl p-4"
        >
          {!isLoading && !error && list?.total === 0 && !search ? (
            <EmptyState
              icon={Building2}
              title="אין ארגונים עדיין"
              description="ארגונים שייווצרו יופיעו כאן"
            />
          ) : (
            <OrgsTable
              orgs={list?.orgs ?? []}
              total={list?.total ?? 0}
              page={list?.page ?? 1}
              perPage={list?.per_page ?? 25}
              totalPages={list?.total_pages ?? 1}
              isLoading={isLoading}
              search={search}
              onSearchChange={handleSearchChange}
              onPageChange={handlePageChange}
              onRowClick={(org) => router.push(`/organizations/${org.id}`)}
            />
          )}
        </motion.div>
      </PageShell>
    </PermissionGate>
  );
}
