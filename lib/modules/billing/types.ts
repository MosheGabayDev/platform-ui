/**
 * @module lib/modules/billing/types
 * Types for the Billing module — Stripe-shaped envelopes.
 *
 * Spec: docs/system-upgrade/PRODUCT_LAUNCH_PLAN.md §3 task 6.05.
 *
 * Backend wiring (Stripe) tracked in §3 tasks 6.03/6.04. The shapes
 * here are the contract the BE must serve once MOCK_MODE flips.
 */

export type PlanTier = "free" | "pro" | "enterprise";
export type InvoiceStatus = "paid" | "pending" | "failed";

export interface PlanSummary {
  tier: PlanTier;
  /** Display price per month in the org's billing currency. */
  monthly_price: number;
  currency: string;
  /** Stripe customer portal URL (when MOCK_MODE flips). Null in mock. */
  portal_url: string | null;
  next_billing_at: string | null;
}

export interface UsageSummary {
  tokens: { used: number; limit: number };
  api_calls: { used: number; limit: number };
  seats: { used: number; limit: number };
}

export interface Invoice {
  id: string;
  /** ISO timestamp the invoice closed. */
  date: string;
  /** Amount in cents (Stripe convention). */
  amount_cents: number;
  currency: string;
  status: InvoiceStatus;
  /** Stripe-hosted PDF URL when MOCK_MODE flips. Null in mock. */
  pdf_url: string | null;
}

export interface BillingOverviewResponse {
  success: boolean;
  data: {
    plan: PlanSummary;
    usage: UsageSummary;
    invoices: Invoice[];
  };
}
