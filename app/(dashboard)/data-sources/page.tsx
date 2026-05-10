"use client";
/**
 * @module app/(dashboard)/data-sources/page
 * Data Sources stub — feature-flagged off by default. Module is
 * declared in the manifest with `data_sources.enabled` as the
 * required flag; this page exists so the manifest's nav_entries href
 * resolves to a real route (closes batch 40 drift).
 *
 * Real implementation lands when a consumer asks. Until then, the
 * page renders a "coming soon" empty state — same shape as the
 * fallback for any other flag-gated module.
 */

import { useTranslations } from "next-intl";
import { HardDrive } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { FeatureGate } from "@/components/shared/feature-gate";
import { PageShell } from "@/components/shared/page-shell";

export default function DataSourcesPage() {
  const t = useTranslations("dataSources");
  return (
    <FeatureGate
      flag="data_sources.enabled"
      fallback={
        <PageShell icon={HardDrive} title={t("title")} subtitle={t("disabledSubtitle")}>
          <EmptyState
            icon={HardDrive}
            title={t("disabledTitle")}
            description={t("disabledDescription")}
          />
        </PageShell>
      }
    >
      <PageShell icon={HardDrive} title={t("title")} subtitle={t("subtitle")}>
        <EmptyState
          icon={HardDrive}
          title={t("comingSoonTitle")}
          description={t("comingSoonDescription")}
        />
      </PageShell>
    </FeatureGate>
  );
}
