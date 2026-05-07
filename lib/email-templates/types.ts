/**
 * @module lib/email-templates/types
 * Shared types for the lifecycle email catalog.
 *
 * @platform cross — pure data, no React.
 *
 * Spec: docs/system-upgrade/PRODUCT_LAUNCH_PLAN.md §3 task 6.09.
 *
 * Frontend owns the catalog (text + structure) so Marketing edits go
 * through PRs. Backend renders the templates with the user's locale +
 * variables and queues delivery via the configured ESP (Postmark / SES).
 *
 * Variables follow Postmark/SES Liquid syntax: `{{user_first_name}}`.
 * Backend MUST resolve all variables before sending; missing variables
 * are a hard error (don't ship `Hello {{name}},` to a real customer).
 */

/** Lifecycle phase the email belongs to. */
export type EmailPhase =
  | "signup"          // immediate — email-verify, welcome, first-AI nudge
  | "trial"           // D1, D7, D14 nudges during trial
  | "conversion"      // D14 trial-end + dunning
  | "retention"       // monthly digest, churn-risk
  | "transactional";  // password reset, MFA setup, RTBF receipt

export interface EmailTemplate {
  /** Stable id; used by backend to look up the template. */
  id: string;
  phase: EmailPhase;
  /** Day offset from the trigger event (signup / trial start / etc.).
   *  -1 = immediate. */
  trigger_day_offset: number;
  /** i18n key for the rendered subject line (e.g. "emails.welcome.subject"). */
  subject_key: string;
  /** i18n key for the rendered body. Body uses Liquid variables. */
  body_key: string;
  /** Variables this template references. Backend asserts all are resolved. */
  variables: readonly string[];
  /** When false, the template is owned by Sales/CS and sent manually. */
  automated: boolean;
}
