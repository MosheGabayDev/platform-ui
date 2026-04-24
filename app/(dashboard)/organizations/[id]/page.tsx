"use client";
/**
 * @module app/(dashboard)/organizations/[id]/page
 * Organization detail page.
 *
 * Auth: protected by middleware.ts.
 * Tenant: system admin sees any org; non-admin only own org (enforced by Flask).
 * Data: via useQuery → fetchOrg(id) → /api/proxy/organizations/<id> → Flask.
 *
 * No edit form here — PATCH support is Phase B.
 */

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, LazyMotion, domAnimation } from "framer-motion";
import { Building2, Hash, FileText, Users, Clock, CheckCircle } from "lucide-react";
import { OrgStatusBadge } from "@/components/modules/organizations/org-status-badge";
import {
  InfoRow, BoolBadge, DetailSection, DetailHeaderCard,
  DetailBackButton, DetailLoadingSkeleton,
} from "@/components/shared/detail-view";
import { ErrorState } from "@/components/shared/error-state";
import { fetchOrg } from "@/lib/api/organizations";
import { queryKeys } from "@/lib/api/query-keys";
import { formatDate } from "@/lib/utils/format";
import { PAGE_EASE } from "@/lib/ui/motion";

export default function OrgDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const orgId = parseInt(id, 10);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.orgs.detail(orgId),
    queryFn: () => fetchOrg(orgId),
    enabled: !isNaN(orgId),
    staleTime: 60_000,
  });

  const org = data?.data?.org;

  return (
    <LazyMotion features={domAnimation}>
      <div className="space-y-6 pb-20 md:pb-0 max-w-2xl">

        <DetailBackButton href="/organizations" />

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
      </div>
    </LazyMotion>
  );
}
