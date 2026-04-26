"use client";
/**
 * @module app/(dashboard)/organizations/[id]/page
 * Organization detail page — displays org profile with edit, deactivate, and reactivate actions.
 *
 * Auth: protected by middleware.ts.
 * Tenant: system admin sees any org; non-admin only own org (enforced by Flask).
 * Data: via useQuery → fetchOrg(id) → /api/proxy/organizations/<id> → Flask.
 * Write: edit form (OrgEditSheet) + danger actions for activate/deactivate.
 */

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { motion, LazyMotion, domAnimation } from "framer-motion";
import { Building2, Hash, FileText, Users, Clock, CheckCircle, Pencil, PowerOff, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/shared/action-button";
import { OrgStatusBadge } from "@/components/modules/organizations/org-status-badge";
import { OrgEditSheet } from "@/components/modules/organizations/organization-form";
import {
  InfoRow, BoolBadge, DetailSection, DetailHeaderCard,
  DetailBackButton, DetailLoadingSkeleton,
} from "@/components/shared/detail-view";
import { ErrorState } from "@/components/shared/error-state";
import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
import { fetchOrg, setOrgActive } from "@/lib/api/organizations";
import { queryKeys } from "@/lib/api/query-keys";
import { hasRole } from "@/lib/auth/rbac";
import { useDangerousAction } from "@/lib/hooks/use-dangerous-action";
import { ORG_ACTIONS } from "@/lib/platform/actions";
import { formatDate } from "@/lib/utils/format";
import { PAGE_EASE } from "@/lib/ui/motion";

export default function OrgDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const orgId = parseInt(id, 10);
  const { data: session } = useSession();
  const isSystemAdmin = hasRole(session, "system_admin");
  const [editOpen, setEditOpen] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.orgs.detail(orgId),
    queryFn: () => fetchOrg(orgId),
    enabled: !isNaN(orgId),
    staleTime: 60_000,
  });

  const org = data?.data?.org;

  const deactivate = useDangerousAction({
    action: ORG_ACTIONS.deactivate,
    mutationFn: (payload) => setOrgActive(orgId, false, payload.reason),
    invalidateKeys: [queryKeys.orgs.detail(orgId), queryKeys.orgs.all()],
    onSuccess: () => { toast.success("הארגון הושבת בהצלחה"); refetch(); },
  });

  const reactivate = useDangerousAction({
    action: ORG_ACTIONS.reactivate,
    mutationFn: (payload) => setOrgActive(orgId, true, payload.reason),
    invalidateKeys: [queryKeys.orgs.detail(orgId), queryKeys.orgs.all()],
    onSuccess: () => { toast.success("הארגון הופעל מחדש"); refetch(); },
  });

  if (isNaN(orgId)) return <ErrorState error={new Error("404")} messages={{ 404: "מזהה ארגון לא חוקי" }} />;

  return (
    <LazyMotion features={domAnimation}>
      <div className="space-y-6 pb-20 md:pb-0 max-w-2xl">

        <div className="flex items-center justify-between gap-3">
          <DetailBackButton href="/organizations" />
          <div className="flex items-center gap-2">
            {isSystemAdmin && org && (
              org.is_active ? (
                <ActionButton
                  variant="outline"
                  size="sm"
                  onClick={deactivate.trigger}
                  isLoading={deactivate.isPending}
                  className="text-orange-600 border-orange-300 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-700 dark:hover:bg-orange-950"
                >
                  <PowerOff className="size-3.5 me-1.5" />
                  השבת ארגון
                </ActionButton>
              ) : (
                <ActionButton
                  variant="outline"
                  size="sm"
                  onClick={reactivate.trigger}
                  isLoading={reactivate.isPending}
                  className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-950"
                >
                  <Power className="size-3.5 me-1.5" />
                  הפעל ארגון
                </ActionButton>
              )
            )}
            {isSystemAdmin && org && (
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="size-3.5 me-1.5" />
                ערוך ארגון
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
              403: "אין הרשאה לצפות בארגון זה",
              404: "ארגון לא נמצא",
              default: "שגיאה בטעינת פרטי הארגון",
            }}
          />
        )}

        {org && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: PAGE_EASE }}
            className="space-y-4"
          >
            <DetailHeaderCard
              title={org.name}
              subtitle={org.slug}
              subtitleMono
              badges={<OrgStatusBadge isActive={org.is_active} />}
              avatar={
                <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Building2 className="size-5 text-primary" />
                </div>
              }
            />

            <DetailSection title="פרטי ארגון">
              <InfoRow icon={Hash} label="מזהה" value={org.id} />
              <InfoRow icon={Building2} label="שם" value={org.name} />
              <InfoRow
                icon={FileText}
                label="Slug"
                value={<span className="font-mono text-xs">{org.slug}</span>}
              />
              {org.description && (
                <InfoRow icon={FileText} label="תיאור" value={org.description} />
              )}
              <InfoRow icon={Users} label="משתמשים" value={org.user_count} />
              <InfoRow icon={CheckCircle} label="פעיל" value={<BoolBadge value={org.is_active} />} />
              <InfoRow icon={Clock} label="נוצר" value={formatDate(org.created_at)} />
            </DetailSection>
          </motion.div>
        )}

        {org && (
          <OrgEditSheet
            org={org}
            open={editOpen}
            onOpenChange={setEditOpen}
            onSuccess={() => { setEditOpen(false); refetch(); }}
          />
        )}

        <ConfirmActionDialog {...deactivate.dialogProps} />
        <ConfirmActionDialog {...reactivate.dialogProps} />
      </div>
    </LazyMotion>
  );
}
