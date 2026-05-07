"use client";
/**
 * @module app/(dashboard)/users/page
 * Users module list page — authenticated, org-scoped, paginated.
 *
 * Auth: protected by middleware.ts (redirect to /login if unauthenticated).
 * Permission: any authenticated user sees the list; admin actions are conditionally shown.
 * Data: via useQuery → fetchUsers() → /api/proxy/users → Flask /api/users.
 *
 * Do NOT put business logic here. Do NOT fetch directly with fetch().
 */

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Users, UserPlus, Clock, ShieldCheck, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { PageShell } from "@/components/shared/page-shell";
import { StatCard } from "@/components/shared/stats";
import { ErrorState } from "@/components/shared/error-state";
import type { RecordAction } from "@/components/shared/record-detail";
import { UsersTable } from "@/components/modules/users/users-table";
import { UserCreateSheet } from "@/components/modules/users/user-form";
import { fetchUsers, fetchUserStats, setUserActive } from "@/lib/api/users";
import { queryKeys } from "@/lib/api/query-keys";
import { hasRole } from "@/lib/auth/rbac";
import { PAGE_EASE } from "@/lib/ui/motion";
import type { UserSummary, UsersListParams } from "@/lib/modules/users/types";
import { useRegisterPageContext } from "@/lib/hooks/use-register-page-context";

export default function UsersPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = hasRole(session, "admin", "system_admin");
  const queryClient = useQueryClient();

  const [params, setParams] = useState<UsersListParams>({ page: 1, per_page: 25 });
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  useRegisterPageContext({
    pageKey: "users.list",
    route: "/users",
    entityType: "user",
    summary: `Users list${search ? ` filtered by "${search}"` : ""}, page ${params.page}.`,
    availableActions: isAdmin ? ["users.create", "users.export"] : [],
  });

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setParams((p) => ({ ...p, page: 1, search: value || undefined }));
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setParams((p) => ({ ...p, page }));
  }, []);

  const { data: listData, isLoading: listLoading, error: listError, refetch } = useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => fetchUsers(params),
    staleTime: 30_000,
  });

  const { data: statsData } = useQuery({
    queryKey: queryKeys.users.stats(),
    queryFn: fetchUserStats,
    staleTime: 60_000,
  });

  const stats = statsData?.data;
  const list = listData?.data;

  // C6 — RecordActions for /users. View is open to anyone with list access;
  // edit/deactivate require admin (re-checked by the backend). Deactivate
  // is destructive with a typed-name confirm — prevents fat-finger
  // mistakes on production user accounts.
  const userActions = useMemo<RecordAction<UserSummary>[]>(
    () => [
      {
        id: "view",
        kind: "view",
        label: "צפייה בפרטים",
        onInvoke: (u) => router.push(`/users/${u.id}`),
      },
      {
        id: "edit",
        kind: "edit",
        label: "עריכה",
        requiredRoles: ["admin", "system_admin"],
        onInvoke: (u) => router.push(`/users/${u.id}?edit=1`),
      },
      {
        id: "deactivate",
        kind: "delete",
        label: "השבת חשבון",
        icon: UserMinus,
        requiredRoles: ["admin", "system_admin"],
        visibleWhen: (u) => u.is_active,
        destructive: true,
        confirmTitle: "השבתת משתמש",
        confirmDescription:
          "המשתמש לא יוכל יותר להתחבר עד שהחשבון יופעל מחדש.",
        confirmTypedName: (u) => u.email,
        onInvoke: async (u) => {
          await setUserActive(u.id, false);
          toast.success(`המשתמש ${u.name} הושבת.`);
          await queryClient.invalidateQueries({ queryKey: queryKeys.users.all() });
        },
      },
    ],
    [router, queryClient],
  );

  return (
    <PageShell
      icon={Users}
      title="ניהול משתמשים"
      subtitle="משתמשי הארגון, תפקידים וסטטוס אישור"
      actions={
        isAdmin ? (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <UserPlus className="size-4 me-1.5" />
            הוסף משתמש
          </Button>
        ) : undefined
      }
      stats={
        <>
          <StatCard icon={Users} value={stats?.total} label='סה"כ' />
          <StatCard
            icon={ShieldCheck}
            value={stats?.active}
            label="פעילים"
            color="border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
          />
          {(stats?.pending ?? 0) > 0 && (
            <StatCard
              icon={Clock}
              value={stats?.pending}
              label="ממתינים"
              color="border-amber-500/30 text-amber-600 dark:text-amber-400"
            />
          )}
        </>
      }
    >
      {isAdmin && (stats?.pending ?? 0) > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35, ease: PAGE_EASE }}
        >
          <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <Clock className="size-4 text-amber-500 shrink-0" />
            <span className="text-sm text-amber-700 dark:text-amber-400">
              {stats?.pending} משתמשים ממתינים לאישור
            </span>
            <Button
              variant="outline"
              size="sm"
              className="me-auto h-7 text-xs border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
              onClick={() => router.push("/users/pending")}
            >
              צפייה בתור
            </Button>
          </div>
        </motion.div>
      )}

      {listError && !listLoading && (
        <ErrorState
          error={listError}
          onRetry={refetch}
          messages={{ default: "שגיאה בטעינת המשתמשים" }}
        />
      )}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4, ease: PAGE_EASE }}
        className="glass border-border/50 rounded-xl p-4"
      >
        {!listLoading && !listError && list?.total === 0 && !search ? (
          <EmptyState
            icon={UserPlus}
            title="אין משתמשים עדיין"
            description="משתמשים שנרשמים יופיעו כאן"
          />
        ) : (
          <UsersTable
            users={list?.users ?? []}
            total={list?.total ?? 0}
            page={list?.page ?? 1}
            perPage={list?.per_page ?? 25}
            totalPages={list?.total_pages ?? 1}
            isLoading={listLoading}
            search={search}
            onSearchChange={handleSearchChange}
            onPageChange={handlePageChange}
            onRowClick={(user) => router.push(`/users/${user.id}`)}
            actions={userActions}
          />
        )}
      </motion.div>
      {isAdmin && (
        <UserCreateSheet
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSuccess={() => setCreateOpen(false)}
        />
      )}
    </PageShell>
  );
}
