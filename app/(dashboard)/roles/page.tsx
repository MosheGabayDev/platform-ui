"use client";
/**
 * @module app/(dashboard)/roles/page
 * Roles & Permissions list page.
 *
 * Auth: protected by middleware.ts.
 * Read: any admin (is_admin or is_system_admin).
 * Write: system_admin only — create/edit buttons gated by PermissionGate.
 * Data: GET /api/proxy/roles → Flask /api/roles.
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { ShieldCheck, Plus, Users, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { PageShell } from "@/components/shared/page-shell";
import { StatCard } from "@/components/shared/stats";
import { ErrorState } from "@/components/shared/error-state";
import { RolesTable } from "@/components/modules/roles/roles-table";
import { RoleCreateSheet } from "@/components/modules/roles/role-form";
import { fetchRoles } from "@/lib/api/roles";
import { queryKeys } from "@/lib/api/query-keys";
import { hasRole } from "@/lib/auth/rbac";
import { PAGE_EASE } from "@/lib/ui/motion";
import type { RoleSummary } from "@/lib/modules/roles/types";
import { useRegisterPageContext } from "@/lib/hooks/use-register-page-context";

export default function RolesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isSystemAdmin = hasRole(session, "system_admin");

  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  useRegisterPageContext({
    pageKey: "roles.list",
    route: "/roles",
    entityType: "role",
    summary: `Roles & permissions list${search ? ` filtered by "${search}"` : ""}.`,
    availableActions: isSystemAdmin ? ["roles.create"] : [],
  });

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.roles.list({ search: search || undefined }),
    queryFn: () => fetchRoles({ search: search || undefined }),
    staleTime: 30_000,
  });

  const roles = data?.data?.roles ?? [];
  const total = data?.data?.total ?? 0;

  const totalPermissions = roles.reduce((sum, r) => sum + r.permission_count, 0);
  const totalUsers = roles.reduce((sum, r) => sum + r.user_count, 0);

  const handleRowClick = useCallback(
    (role: RoleSummary) => router.push(`/roles/${role.id}`),
    [router],
  );

  return (
    <PageShell
      icon={ShieldCheck}
      title="תפקידים והרשאות"
      subtitle="תפקידים גלובליים המשותפים לכל הארגונים"
      actions={
        isSystemAdmin ? (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4 me-1.5" />
            תפקיד חדש
          </Button>
        ) : undefined
      }
      stats={
        <>
          <StatCard icon={ShieldCheck} value={total} label='סה"כ תפקידים' />
          <StatCard
            icon={Lock}
            value={totalPermissions}
            label="הרשאות פעילות"
            color="border-violet-500/30 text-violet-600 dark:text-violet-400"
          />
          <StatCard
            icon={Users}
            value={totalUsers}
            label="משתמשים משויכים"
            color="border-blue-500/30 text-blue-600 dark:text-blue-400"
          />
        </>
      }
    >
      {error && !isLoading && (
        <ErrorState
          error={error}
          onRetry={refetch}
          messages={{ default: "שגיאה בטעינת התפקידים" }}
        />
      )}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4, ease: PAGE_EASE }}
        className="glass border-border/50 rounded-xl p-4"
      >
        {!isLoading && !error && total === 0 && !search ? (
          <EmptyState
            icon={ShieldCheck}
            title="אין תפקידים עדיין"
            description="צור תפקיד ראשון כדי להתחיל לנהל הרשאות"
          />
        ) : (
          <RolesTable
            roles={roles}
            total={total}
            isLoading={isLoading}
            search={search}
            onSearchChange={handleSearchChange}
            onRowClick={handleRowClick}
            canEdit={isSystemAdmin}
          />
        )}
      </motion.div>

      {isSystemAdmin && (
        <RoleCreateSheet
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSuccess={() => setCreateOpen(false)}
        />
      )}
    </PageShell>
  );
}
