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

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { motion, LazyMotion, domAnimation } from "framer-motion";
import { Users, UserPlus, Clock, ShieldCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { UsersTable } from "@/components/modules/users/users-table";
import { fetchUsers, fetchUserStats } from "@/lib/api/users";
import { queryKeys } from "@/lib/api/query-keys";
import { hasRole } from "@/lib/auth/rbac";
import type { UsersListParams } from "@/lib/modules/users/types";

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

function StatChip({ icon: Icon, value, label, color }: {
  icon: typeof Users;
  value: number | undefined;
  label: string;
  color: string;
}) {
  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 border text-sm ${color}`}>
      <Icon className="size-4 shrink-0" />
      <span className="font-semibold">{value ?? "—"}</span>
      <span className="text-xs opacity-70">{label}</span>
    </div>
  );
}

export default function UsersPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = hasRole(session, "admin", "system_admin");

  const [params, setParams] = useState<UsersListParams>({ page: 1, per_page: 25 });
  const [search, setSearch] = useState("");

  // Debounced search — update params after typing stops
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

  return (
    <LazyMotion features={domAnimation}>
      <div className="space-y-6 pb-20 md:pb-0">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease }}
          className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="size-4 text-primary" />
              </div>
              <h1 className="text-xl font-semibold">ניהול משתמשים</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              משתמשי הארגון, תפקידים וסטטוס אישור
            </p>
          </div>

          {/* Quick stats chips */}
          <div className="flex flex-wrap gap-2">
            <StatChip
              icon={Users}
              value={stats?.total}
              label="סה״כ"
              color="border-border/50 text-foreground/80"
            />
            <StatChip
              icon={ShieldCheck}
              value={stats?.active}
              label="פעילים"
              color="border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
            />
            {(stats?.pending ?? 0) > 0 && (
              <StatChip
                icon={Clock}
                value={stats?.pending}
                label="ממתינים"
                color="border-amber-500/30 text-amber-600 dark:text-amber-400"
              />
            )}
          </div>
        </motion.div>

        {/* Pending approval banner */}
        {isAdmin && (stats?.pending ?? 0) > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.35, ease }}
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

        {/* Error state */}
        {listError && !listLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-4 flex items-center gap-3"
          >
            <AlertCircle className="size-4 text-destructive shrink-0" />
            <span className="text-sm text-destructive">
              שגיאה בטעינת המשתמשים:{" "}
              {listError instanceof Error ? listError.message : "שגיאה לא ידועה"}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="me-auto h-7 text-xs"
              onClick={() => refetch()}
            >
              נסה שוב
            </Button>
          </motion.div>
        )}

        {/* Users table / empty state */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4, ease }}
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
            />
          )}
        </motion.div>
      </div>
    </LazyMotion>
  );
}
