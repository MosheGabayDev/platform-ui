"use client";
/**
 * @module app/(dashboard)/roles/[id]/page
 * Role detail page — shows full permission list + edit capability for system_admin.
 *
 * Auth: protected by middleware.ts.
 * Read: any admin.
 * Write: system_admin only.
 * Data: GET /api/proxy/roles/<id> → Flask /api/roles/<id>.
 */

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { motion, LazyMotion, domAnimation } from "framer-motion";
import { ShieldCheck, Users, Lock, Calendar, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RolePermissionBadge } from "@/components/modules/roles/role-permission-badge";
import { RoleEditSheet } from "@/components/modules/roles/role-form";
import {
  InfoRow,
  DetailSection,
  DetailHeaderCard,
  DetailBackButton,
  DetailLoadingSkeleton,
} from "@/components/shared/detail-view";
import { ErrorState } from "@/components/shared/error-state";
import { fetchRole } from "@/lib/api/roles";
import { groupPermissions, type RolePermission } from "@/lib/modules/roles/types";
import { queryKeys } from "@/lib/api/query-keys";
import { hasRole } from "@/lib/auth/rbac";
import { PAGE_EASE } from "@/lib/ui/motion";

export default function RoleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const roleId = parseInt(id, 10);
  const { data: session } = useSession();
  const isSystemAdmin = hasRole(session, "system_admin");
  const [editOpen, setEditOpen] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.roles.detail(roleId),
    queryFn: () => fetchRole(roleId),
    enabled: !isNaN(roleId),
    staleTime: 60_000,
  });

  const role = data?.data?.role;
  const grouped = role ? groupPermissions(role.permissions) : new Map();

  if (isNaN(roleId)) return <ErrorState error={new Error("404")} messages={{ 404: "מזהה תפקיד לא חוקי" }} />;

  return (
    <LazyMotion features={domAnimation}>
      <div className="space-y-6 pb-20 md:pb-0 max-w-2xl">

        <div className="flex items-center justify-between gap-3">
          <DetailBackButton href="/roles" />
          {isSystemAdmin && role && (
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="size-3.5 me-1.5" />
              ערוך תפקיד
            </Button>
          )}
        </div>

        {isLoading && <DetailLoadingSkeleton />}

        {error && !isLoading && (
          <ErrorState
            error={error}
            onRetry={refetch}
            messages={{
              403: "אין הרשאה לצפות בתפקיד זה",
              404: "תפקיד לא נמצא",
              default: "שגיאה בטעינת פרטי התפקיד",
            }}
          />
        )}

        {role && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: PAGE_EASE }}
            className="space-y-4"
          >
            <DetailHeaderCard
              title={role.name}
              subtitle={role.description ?? undefined}
              badges={
                <>
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-violet-500/15 text-violet-600 border border-violet-500/30">
                    {role.permission_count} הרשאות
                  </span>
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-500/15 text-blue-600 border border-blue-500/30">
                    {role.user_count} משתמשים
                  </span>
                </>
              }
              avatar={
                <div className="size-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <ShieldCheck className="size-6 text-violet-600" />
                </div>
              }
            />

            <DetailSection title="פרטי תפקיד">
              <InfoRow icon={Lock} label="הרשאות" value={String(role.permission_count)} />
              <InfoRow icon={Users} label="משתמשים" value={String(role.user_count)} />
              <InfoRow
                icon={Calendar}
                label="נוצר"
                value={
                  role.created_at
                    ? new Date(role.created_at).toLocaleDateString("he-IL")
                    : "—"
                }
              />
              {role.updated_at && (
                <InfoRow
                  icon={Calendar}
                  label="עודכן"
                  value={new Date(role.updated_at).toLocaleDateString("he-IL")}
                />
              )}
            </DetailSection>

            {role.permissions.length > 0 && (
              <DetailSection title="הרשאות מוקצות">
                <Separator className="mb-3" />
                <div className="space-y-4">
                  {Array.from(grouped.entries()).map(([ns, perms]) => (
                    <div key={ns}>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        {ns}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {(perms as RolePermission[]).map((p) => (
                          <RolePermissionBadge key={p.id} name={p.name} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </DetailSection>
            )}

            {role.permissions.length === 0 && (
              <DetailSection title="הרשאות מוקצות">
                <p className="text-sm text-muted-foreground py-2">לא הוקצו הרשאות לתפקיד זה</p>
              </DetailSection>
            )}
          </motion.div>
        )}

        {role && (
          <RoleEditSheet
            role={role}
            open={editOpen}
            onOpenChange={setEditOpen}
            onSuccess={() => { setEditOpen(false); refetch(); }}
          />
        )}
      </div>
    </LazyMotion>
  );
}
