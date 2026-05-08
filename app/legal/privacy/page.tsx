"use client";
/**
 * @module app/legal/privacy/page
 * Privacy Policy. Spec: PRODUCT_LAUNCH_PLAN.md §4 task 7.02.
 *
 * Refactored 2026-05-08 to use the shared <LegalPage> scaffold.
 */

import { ShieldCheck } from "lucide-react";
import { LegalPage } from "@/components/shared/legal-page";

const SECTIONS = [
  "whatWeCollect",
  "whyWeCollect",
  "sharing",
  "yourRights",
  "retention",
  "dataLocation",
  "cookies",
] as const;

export default function PrivacyPage() {
  return (
    <LegalPage
      namespace="legal.privacy"
      icon={ShieldCheck}
      sectionKeys={SECTIONS}
      draft
    />
  );
}
