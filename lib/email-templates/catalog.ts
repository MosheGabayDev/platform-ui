/**
 * @module lib/email-templates/catalog
 * The full lifecycle email catalog.
 *
 * @platform cross — pure data; no React, no fetch, no DOM.
 *
 * Spec: docs/system-upgrade/PRODUCT_LAUNCH_PLAN.md §3 task 6.09.
 *
 * Adding a new email = one entry in TEMPLATES below + matching
 * `emails.<id>.{subject,body}` keys in he/en. Backend reads this file
 * to know what to send and when; it does not infer templates by id.
 */

import type { EmailTemplate } from "./types";

const SIGNUP_FLOW: EmailTemplate[] = [
  {
    id: "verify-email",
    phase: "signup",
    trigger_day_offset: -1,
    subject_key: "emails.verifyEmail.subject",
    body_key: "emails.verifyEmail.body",
    variables: ["user_first_name", "verify_link"],
    automated: true,
  },
  {
    id: "welcome",
    phase: "signup",
    trigger_day_offset: 0,
    subject_key: "emails.welcome.subject",
    body_key: "emails.welcome.body",
    variables: ["user_first_name", "org_name", "console_link"],
    automated: true,
  },
  {
    id: "first-ai-nudge",
    phase: "signup",
    trigger_day_offset: 1,
    subject_key: "emails.firstAiNudge.subject",
    body_key: "emails.firstAiNudge.body",
    variables: ["user_first_name", "ai_link"],
    automated: true,
  },
];

const TRIAL_FLOW: EmailTemplate[] = [
  {
    id: "trial-day-7",
    phase: "trial",
    trigger_day_offset: 7,
    subject_key: "emails.trialDay7.subject",
    body_key: "emails.trialDay7.body",
    variables: ["user_first_name", "billing_link"],
    automated: true,
  },
  {
    id: "trial-day-14",
    phase: "trial",
    trigger_day_offset: 14,
    subject_key: "emails.trialDay14.subject",
    body_key: "emails.trialDay14.body",
    variables: ["user_first_name", "billing_link", "trial_end_date"],
    automated: true,
  },
];

const CONVERSION_FLOW: EmailTemplate[] = [
  {
    id: "trial-ended",
    phase: "conversion",
    trigger_day_offset: 14,
    subject_key: "emails.trialEnded.subject",
    body_key: "emails.trialEnded.body",
    variables: ["user_first_name", "billing_link"],
    automated: true,
  },
  {
    id: "payment-failed",
    phase: "conversion",
    trigger_day_offset: 0,
    subject_key: "emails.paymentFailed.subject",
    body_key: "emails.paymentFailed.body",
    variables: ["user_first_name", "billing_portal_link", "amount_due"],
    automated: true,
  },
  {
    id: "dunning-final",
    phase: "conversion",
    trigger_day_offset: 14,
    subject_key: "emails.dunningFinal.subject",
    body_key: "emails.dunningFinal.body",
    variables: ["user_first_name", "billing_portal_link", "suspension_date"],
    automated: true,
  },
];

const TRANSACTIONAL: EmailTemplate[] = [
  {
    id: "password-reset",
    phase: "transactional",
    trigger_day_offset: -1,
    subject_key: "emails.passwordReset.subject",
    body_key: "emails.passwordReset.body",
    variables: ["user_first_name", "reset_link", "expires_at"],
    automated: true,
  },
  {
    id: "rtbf-receipt",
    phase: "transactional",
    trigger_day_offset: -1,
    subject_key: "emails.rtbfReceipt.subject",
    body_key: "emails.rtbfReceipt.body",
    variables: ["user_first_name", "effective_at", "request_id"],
    automated: true,
  },
  {
    id: "data-export-ready",
    phase: "transactional",
    trigger_day_offset: -1,
    subject_key: "emails.dataExportReady.subject",
    body_key: "emails.dataExportReady.body",
    variables: ["user_first_name", "download_link", "expires_at"],
    automated: true,
  },
];

export const EMAIL_TEMPLATES: readonly EmailTemplate[] = [
  ...SIGNUP_FLOW,
  ...TRIAL_FLOW,
  ...CONVERSION_FLOW,
  ...TRANSACTIONAL,
];

/** Look up a template by id. */
export function getEmailTemplate(id: string): EmailTemplate | undefined {
  return EMAIL_TEMPLATES.find((t) => t.id === id);
}

/** All templates for a given lifecycle phase. */
export function getEmailsForPhase(phase: EmailTemplate["phase"]): EmailTemplate[] {
  return EMAIL_TEMPLATES.filter((t) => t.phase === phase);
}

/** Every variable referenced by any template, deduplicated. */
export function getAllReferencedVariables(): string[] {
  const set = new Set<string>();
  for (const t of EMAIL_TEMPLATES) for (const v of t.variables) set.add(v);
  return [...set].sort();
}
