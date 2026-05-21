/**
 * @module lib/modules/billing-automation/types
 * Shared types for the Billing Automation module (Meteorit MSP).
 *
 * Backend contract: platformengineer apps/billing_automation/api/routes.py.
 * MOCK_MODE flip: see lib/api/billing-automation.ts header.
 */
export type ImportStatus =
  | "pending"
  | "parsing"
  | "review_required"
  | "approved"
  | "sent"
  | "failed";

export interface ImportSummary {
  id: number;
  period: string; // YYYY-MM-01
  status: ImportStatus | string;
  file_count: number;
  row_count_raw: number;
  row_count_normalized: number;
  unmatched_customers: number;
  total_amount_by_currency: Record<string, string>;
  approved_at: string | null;
  priority_synced_at: string | null;
}

export interface DashboardData {
  latest_period: string | null;
  status?: string;
  customers_billed?: number;
  anomalies_open?: number;
  totals_by_currency?: Record<string, string>;
  priority_synced_at?: string | null;
}

export interface PendingMatchSuggestion {
  customer_id: number;
  name: string;
  score: number;
}

export interface PendingMatch {
  id: number;
  vendor_id: number;
  alias_raw: string;
  external_id: string | null;
  suggestions: PendingMatchSuggestion[];
}

export interface Customer {
  id: number;
  priority_customer_code: string | null;
  name_canonical: string;
  name_hebrew: string | null;
  status: string;
  billing_currency: string;
  vat_rate: string;
}
