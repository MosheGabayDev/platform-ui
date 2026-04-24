"use client";
/**
 * @module app/(dashboard)/users/[id]/page
 * User detail page — displays full user profile.
 * Non-admins can only view their own profile (enforced by Flask and by this page).
 *
 * Auth: protected by middleware.ts.
 * Data: via useQuery → fetchUser(id) → /api/proxy/users/<id> → Flask /api/users/<id>.
 *
 * No edit form here — that is a separate Phase B task (see PLAN.md).
 * Do NOT add mutation logic here without first verifying backend endpoint exists.
 */

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, LazyMotion, domAnimation } from "framer-motion";
import { User, Mail, Building2, Shield, Clock, CheckCircle, Key } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { UserStatusBadge } from "@/components/modules/users/user-status-badge";
import { UserRoleBadge } from "@/components/modules/users/user-role-badge";
import {
  InfoRow, BoolBadge, DetailSection, DetailHeaderCard,
  DetailBackButton, DetailLoadingSkeleton,
} from "@/components/shared/detail-view";
import { ErrorState } from "@/components/shared/error-state";
import { fetchUser } from "@/lib/api/users";
import { queryKeys } from "@/lib/api/query-keys";
import { PAGE_EASE } from "@/lib/ui/motion";

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const userId = parseInt(id, 10);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.users.detail(userId),
    queryFn: () => fetchUser(userId),
    enabled: !isNaN(userId),
    staleTime: 60_000,
  });

  const user = data?.data?.user;

  return (
    <LazyMotion features={domAnimation}>
      <div className="space-y-6 pb-20 md:pb-0 max-w-2xl">

        <DetailBackButton href="/users" />

        {isLoading && <DetailLoadingSkeleton />}

        {error && !isLoading && (
          <ErrorState
            error={error}
            onRetry={refetch}
            messages={{
              403: "אין הרשאה לצפות בפרטי משתמש זה",
              404: "משתמש לא נמצא",
              default: "שגיאה בטעינת פרטי המשתמש",
            }}
          />
        )}

        {user && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: PAGE_EASE }}
            className="space-y-4"
          >
            <DetailHeaderCard
              title={user.name}
              subtitle={user.email}
              badges={
                <>
                  <UserRoleBadge
                    role={user.role}
                    isAdmin={user.is_admin}
                    isSystemAdmin={user.is_system_admin}
                  />
                  <UserStatusBadge isActive={user.is_active} isApproved={user.is_approved} />
                </>
              }
              avatar={
                <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">
                    {(user.name?.[0] ?? user.email?.[0] ?? "?").toUpperCase()}
                  </span>
                </div>
              }
            />

            <DetailSection title="פרטי חשבון">
              <InfoRow icon={User} label="שם משתמש" value={user.username} />
              <InfoRow icon={Mail} label="אימייל" value={user.email} />
              <InfoRow icon={Building2} label="ארגון" value={`#${user.org_id}`} />
              <InfoRow
                icon={Clock}
                label="כניסה אחרונה"
                value={user.last_login ? new Date(user.last_login).toLocaleString("he-IL") : "מעולם לא"}
              />
              <InfoRow
                icon={Clock}
                label="נוצר"
                value={user.created_at ? new Date(user.created_at).toLocaleDateString("he-IL") : "—"}
              />
            </DetailSection>

            <DetailSection title="אבטחה והגדרות">
              <InfoRow icon={CheckCircle} label="אימייל אומת" value={<BoolBadge value={user.email_confirmed} />} />
              <InfoRow icon={Shield} label="MFA" value={<BoolBadge value={user.mfa_enabled} />} />
              <InfoRow icon={Shield} label="אדמין" value={<BoolBadge value={user.is_admin} />} />
              <InfoRow icon={Shield} label="מנהל" value={<BoolBadge value={user.is_manager} />} />
            </DetailSection>

            {user.permissions.length > 0 && (
              <DetailSection title="הרשאות">
                <Separator className="mb-2" />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {user.permissions.map((perm) => (
                    <span
                      key={perm}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs bg-muted border border-border/50 text-muted-foreground"
                    >
                      <Key className="size-3" />
                      {perm}
                    </span>
                  ))}
                </div>
              </DetailSection>
            )}
          </motion.div>
        )}
      </div>
    </LazyMotion>
  );
}
