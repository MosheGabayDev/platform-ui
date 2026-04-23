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
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, LazyMotion, domAnimation } from "framer-motion";
import {
  ArrowRight, User, Mail, Building2, Shield, Clock,
  CheckCircle, XCircle, AlertCircle, Key,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { UserStatusBadge } from "@/components/modules/users/user-status-badge";
import { UserRoleBadge } from "@/components/modules/users/user-role-badge";
import { fetchUser } from "@/lib/api/users";
import { queryKeys } from "@/lib/api/query-keys";

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

function InfoRow({ icon: Icon, label, value }: {
  icon: typeof User;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon className="size-4 text-muted-foreground shrink-0 mt-0.5" />
      <span className="text-sm text-muted-foreground min-w-[100px] shrink-0">{label}</span>
      <span className="text-sm font-medium">{value ?? "—"}</span>
    </div>
  );
}

function BoolBadge({ value }: { value: boolean }) {
  return value
    ? <span className="inline-flex items-center gap-1 text-emerald-500 text-xs"><CheckCircle className="size-3" />כן</span>
    : <span className="inline-flex items-center gap-1 text-muted-foreground text-xs"><XCircle className="size-3" />לא</span>;
}

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const userId = parseInt(id, 10);
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.users.detail(userId),
    queryFn: () => fetchUser(userId),
    enabled: !isNaN(userId),
    staleTime: 60_000,
  });

  const user = data?.data?.user;

  return (
    <LazyMotion features={domAnimation}>
      <div className="space-y-6 pb-20 md:pb-0 max-w-2xl">

        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 -ms-2 h-8 text-muted-foreground hover:text-foreground"
          onClick={() => router.push("/users")}
        >
          <ArrowRight className="size-3.5" />
          חזרה לרשימה
        </Button>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-3 animate-pulse">
            <div className="h-8 w-48 rounded bg-muted" />
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="h-40 rounded-xl bg-muted" />
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-4 flex items-center gap-3"
          >
            <AlertCircle className="size-4 text-destructive shrink-0" />
            <span className="text-sm text-destructive">
              {error instanceof Error
                ? error.message.includes("403")
                  ? "אין הרשאה לצפות בפרטי משתמש זה"
                  : error.message.includes("404")
                  ? "משתמש לא נמצא"
                  : error.message
                : "שגיאה בטעינת פרטי המשתמש"}
            </span>
          </motion.div>
        )}

        {/* User profile */}
        {user && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease }}
            className="space-y-4"
          >
            {/* Header card */}
            <div className="glass border-border/50 rounded-xl px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h1 className="text-lg font-semibold">{user.name}</h1>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <UserRoleBadge
                      role={user.role}
                      isAdmin={user.is_admin}
                      isSystemAdmin={user.is_system_admin}
                    />
                    <UserStatusBadge
                      isActive={user.is_active}
                      isApproved={user.is_approved}
                    />
                  </div>
                </div>
                {/* Avatar placeholder */}
                <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-lg font-bold text-primary">
                    {(user.name?.[0] ?? user.email?.[0] ?? "?").toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Details card */}
            <div className="glass border-border/50 rounded-xl px-5 py-3">
              <h2 className="text-sm font-medium mb-1 text-muted-foreground">פרטי חשבון</h2>
              <Separator className="mb-2" />

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
            </div>

            {/* Security card */}
            <div className="glass border-border/50 rounded-xl px-5 py-3">
              <h2 className="text-sm font-medium mb-1 text-muted-foreground">אבטחה והגדרות</h2>
              <Separator className="mb-2" />

              <InfoRow icon={CheckCircle} label="אימייל אומת" value={<BoolBadge value={user.email_confirmed} />} />
              <InfoRow icon={Shield} label="MFA" value={<BoolBadge value={user.mfa_enabled} />} />
              <InfoRow icon={Shield} label="אדמין" value={<BoolBadge value={user.is_admin} />} />
              <InfoRow icon={Shield} label="מנהל" value={<BoolBadge value={user.is_manager} />} />
            </div>

            {/* Permissions card */}
            {user.permissions.length > 0 && (
              <div className="glass border-border/50 rounded-xl px-5 py-3">
                <h2 className="text-sm font-medium mb-1 text-muted-foreground">הרשאות</h2>
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
              </div>
            )}
          </motion.div>
        )}
      </div>
    </LazyMotion>
  );
}
