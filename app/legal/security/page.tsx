"use client";
/**
 * @module app/legal/security/page
 * Vulnerability disclosure policy. Spec: PRODUCT_LAUNCH_PLAN.md §4 task 7.10.
 *
 * Refactored 2026-05-08 to use the shared <LegalPage> scaffold.
 * Adds a PGP-key + security@ mailto block via `extraAfterSections`.
 */

import { Shield, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { LegalPage } from "@/components/shared/legal-page";

const SECTIONS = ["report", "scope", "outOfScope", "safeHarbor"] as const;

function PgpBlock() {
  const t = useTranslations("legal.security");
  return (
    <div className="rounded-lg border border-border/40 bg-muted/30 px-4 py-3 space-y-1.5">
      <p className="text-xs font-mono">{t("pgp")}</p>
      <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
        <Mail className="size-3.5" aria-hidden />
        <a href="mailto:security@platform.local" className="text-primary hover:underline">
          security@platform.local
        </a>
      </p>
    </div>
  );
}

export default function SecurityPage() {
  return (
    <LegalPage
      namespace="legal.security"
      icon={Shield}
      sectionKeys={SECTIONS}
      extraAfterSections={<PgpBlock />}
    />
  );
}
