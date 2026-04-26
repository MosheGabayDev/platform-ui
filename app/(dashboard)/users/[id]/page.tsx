"use client";
/**
 * @module app/(dashboard)/users/[id]/page
 * User detail page — displays full user profile with edit, deactivate, and reactivate actions.
 *
 * Auth: protected by middleware.ts.
 * Data: via useQuery → fetchUser(id) → /api/proxy/users/<id> → Flask /api/users/<id>.
 * Mutations: PATCH /api/users/<id> via UserEditSheet, PATCH /api/users/<id>/active via danger actions.
 */

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { motion, LazyMotion, domAnimation } from "framer-motion";
import { User, Mail, Building2, Shield, Clock, CheckCircle, Key, Pencil, UserX, UserCheck, LogIn, UserCog, Lock, ShieldCheck, Tag, Bot, Globe, MapPin, FileText } from "lucide-react";
import { PlatformTimeline } from "@/components/shared/timeline";
import type { TimelineEvent } from "@/components/shared/timeline";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/shared/action-button";
import { UserStatusBadge } from "@/components/modules/users/user-status-badge";
import { UserRoleBadge } from "@/components/modules/users/user-role-badge";
import { UserEditSheet } from "@/components/modules/users/user-form";
import {
  InfoRow, BoolBadge, DetailSection, DetailHeaderCard,
  DetailBackButton, DetailLoadingSkeleton,
} from "@/components/shared/detail-view";
import { ErrorState } from "@/components/shared/error-state";
import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
import { fetchUser, setUserActive } from "@/lib/api/users";
import { queryKeys } from "@/lib/api/query-keys";
import { hasRole } from "@/lib/auth/rbac";
import { useDangerousAction } from "@/lib/hooks/use-dangerous-action";
import { USER_ACTIONS } from "@/lib/platform/actions";
import { PAGE_EASE } from "@/lib/ui/motion";

function buildMockTimeline(user: { name: string; created_at?: string; last_login?: string }): TimelineEvent[] {
  const base = user.created_at ? new Date(user.created_at) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return [
    {
      id: "ev-1",
      type: "login",
      timestamp: user.last_login ?? new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      actor: user.name,
      description: "התחבר למערכת",
      icon: LogIn,
    },
    {
      id: "ev-2",
      type: "profile_update",
      timestamp: new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      actor: "מנהל מערכת",
      description: "פרופיל המשתמש עודכן",
      detail: "שם, כתובת דוא\"ל ותפקיד עודכנו על ידי מנהל",
      icon: UserCog,
    },
    {
      id: "ev-3",
      type: "mfa_enabled",
      timestamp: new Date(base.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      actor: user.name,
      description: "אימות דו-שלבי הופעל",
      icon: ShieldCheck,
    },
    {
      id: "ev-4",
      type: "password_reset",
      timestamp: new Date(base.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      actor: user.name,
      description: "סיסמה אופסה",
      detail: "בקשת איפוס סיסמה נשלחה ואומתה בהצלחה",
      icon: Lock,
    },
    {
      id: "ev-5",
      type: "created",
      timestamp: base.toISOString(),
      actor: "מנהל מערכת",
      description: "חשבון נוצר",
      icon: User,
    },
  ];
}

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const userId = parseInt(id, 10);
  const { data: session } = useSession();
  const isAdmin = hasRole(session, "admin", "system_admin");
  const [editOpen, setEditOpen] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.users.detail(userId),
    queryFn: () => fetchUser(userId),
    enabled: !isNaN(userId),
    staleTime: 60_000,
  });

  const user = data?.data?.user;
  const isSelf = session?.user?.id === user?.id;
  const canEdit = isAdmin || isSelf;

  const deactivate = useDangerousAction({
    action: USER_ACTIONS.deactivate,
    mutationFn: (payload) => setUserActive(userId, false, payload.reason),
    invalidateKeys: [queryKeys.users.detail(userId), queryKeys.users.all()],
    onSuccess: () => { toast.success("המשתמש הושבת בהצלחה"); refetch(); },
  });

  const reactivate = useDangerousAction({
    action: USER_ACTIONS.reactivate,
    mutationFn: (payload) => setUserActive(userId, true, payload.reason),
    invalidateKeys: [queryKeys.users.detail(userId), queryKeys.users.all()],
    onSuccess: () => { toast.success("המשתמש הופעל מחדש"); refetch(); },
  });

  if (isNaN(userId)) return <ErrorState error={new Error("404")} messages={{ 404: "מזהה משתמש לא חוקי" }} />;

  return (
    <LazyMotion features={domAnimation}>
      <div className="space-y-6 pb-20 md:pb-0 max-w-2xl">

        <div className="flex items-center justify-between gap-3">
          <DetailBackButton href="/users" />
          <div className="flex items-center gap-2">
            {isAdmin && user && (
              user.is_active ? (
                <ActionButton
                  variant="outline"
                  size="sm"
                  onClick={deactivate.trigger}
                  isLoading={deactivate.isPending}
                  className="text-amber-600 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-950"
                >
                  <UserX className="size-3.5 me-1.5" />
                  השבת
                </ActionButton>
              ) : (
                <ActionButton
                  variant="outline"
                  size="sm"
                  onClick={reactivate.trigger}
                  isLoading={reactivate.isPending}
                  className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-950"
                >
                  <UserCheck className="size-3.5 me-1.5" />
                  הפעל מחדש
                </ActionButton>
              )
            )}
            {canEdit && user && (
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="size-3.5 me-1.5" />
                ערוך
              </Button>
            )}
          </div>
        </div>

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
              {(user.first_name || user.last_name) && (
                <InfoRow icon={User} label="שם פרטי" value={[user.first_name, user.last_name].filter(Boolean).join(" ")} />
              )}
              <InfoRow icon={User} label="שם משתמש" value={user.username} />
              <InfoRow icon={Mail} label="אימייל" value={user.email} />
              <InfoRow icon={Building2} label="ארגון" value={`#${user.org_id}`} />
              {user.role && <InfoRow icon={Tag} label="תפקיד" value={user.role} />}
              {user.bio && <InfoRow icon={FileText} label="ביוגרפיה" value={user.bio} />}
              {user.preferred_language && <InfoRow icon={Globe} label="שפה מועדפת" value={user.preferred_language} />}
              {user.timezone && <InfoRow icon={MapPin} label="אזור זמן" value={user.timezone} />}
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
              <InfoRow icon={Shield} label="מנהל מערכת" value={<BoolBadge value={user.is_system_admin} />} />
              <InfoRow icon={Bot} label="סוכן AI" value={<BoolBadge value={user.is_ai_agent} />} />
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

            <DetailSection title="היסטוריית פעילות">
              <div className="pt-2">
                <PlatformTimeline events={buildMockTimeline(user)} />
              </div>
            </DetailSection>
          </motion.div>
        )}

        {user && (
          <UserEditSheet
            user={user}
            open={editOpen}
            onOpenChange={setEditOpen}
            isAdmin={isAdmin}
            isSelf={isSelf}
            onSuccess={() => { setEditOpen(false); refetch(); }}
          />
        )}

        <ConfirmActionDialog {...deactivate.dialogProps} />
        <ConfirmActionDialog {...reactivate.dialogProps} />
      </div>
    </LazyMotion>
  );
}
