/**
 * @module lib/modules/feedback/types
 * Customer-feedback aggregator types.
 *
 * Spec: docs/system-upgrade/PRODUCT_LAUNCH_PLAN.md §7 task 10.05.
 */

export type FeedbackType = "bug" | "feature" | "insight";
export type FeedbackStatus =
  | "new"
  | "triaged"
  | "converted"
  | "duplicate"
  | "wontFix";

export interface FeedbackItem {
  id: string;
  /** ISO timestamp when first received. */
  received_at: string;
  /** Free-form source: "email", "pilot-call", "in-app", etc. */
  source: string;
  type: FeedbackType;
  status: FeedbackStatus;
  /** Free-form body — full quote when possible. */
  content: string;
  /** Optional reporter name/email when known. */
  reporter: string | null;
  /** Linear / GitHub issue URL once converted. */
  backlog_link: string | null;
}
