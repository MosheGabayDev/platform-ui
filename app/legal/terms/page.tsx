"use client";
/**
 * @module app/legal/terms/page
 * Terms of Service. Spec: PRODUCT_LAUNCH_PLAN.md §4 task 7.01.
 *
 * Refactored 2026-05-08 to use the shared <LegalPage> scaffold.
 */

import { FileText } from "lucide-react";
import { LegalPage } from "@/components/shared/legal-page";

const SECTIONS = [
  "account",
  "acceptableUse",
  "payment",
  "ip",
  "ai",
  "termination",
  "governingLaw",
] as const;

export default function TermsPage() {
  return (
    <LegalPage
      namespace="legal.terms"
      icon={FileText}
      sectionKeys={SECTIONS}
      draft
    />
  );
}
