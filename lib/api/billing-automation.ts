/**
 * @module lib/api/billing-automation
 * API client for the Billing Automation module (Meteorit MSP).
 *
 * Spec: Meteorit/Billing-Integration/plan/04-integration/platform-ui-integration.md.
 *
 * MOCK_MODE flip checklist:
 *   1. Set NEXT_PUBLIC_MOCK_API=false in env.
 *   2. Backend (platformengineer apps/billing_automation/) serves
 *      GET /api/billing-automation/dashboard etc.
 *   3. Proxy /api/proxy/billing-automation/* → platformengineer.
 *   4. Frontend refetches via TanStack Query.
 */
import type {
  ImportSummary, DashboardData, PendingMatch, Customer,
} from "@/lib/modules/billing-automation/types";

export const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_API !== "false";
const BASE = "/api/proxy/billing-automation";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

const MOCK_DASHBOARD: DashboardData = {
  latest_period: "2026-05-01",
  status: "approved",
  customers_billed: 142,
  anomalies_open: 7,
  totals_by_currency: { ILS: "287450.50", USD: "12400.00" },
  priority_synced_at: null,
};

const MOCK_IMPORTS: ImportSummary[] = [
  {
    id: 1, period: "2026-05-01", status: "approved",
    file_count: 13, row_count_raw: 4250, row_count_normalized: 3980,
    unmatched_customers: 12,
    total_amount_by_currency: { ILS: "287450.50", USD: "12400.00" },
    approved_at: "2026-05-15T10:00:00", priority_synced_at: null,
  },
  {
    id: 2, period: "2026-04-01", status: "sent",
    file_count: 12, row_count_raw: 4100, row_count_normalized: 3850,
    unmatched_customers: 0,
    total_amount_by_currency: { ILS: "271200.00", USD: "11800.00" },
    approved_at: "2026-04-15T09:00:00", priority_synced_at: "2026-04-15T09:30:00",
  },
];

const MOCK_PENDING: PendingMatch[] = [
  {
    id: 1, vendor_id: 1, alias_raw: "A.Y+Zemach-tech - 21577", external_id: "21577",
    suggestions: [
      { customer_id: 42, name: "a y zemach", score: 0.91 },
      { customer_id: 43, name: "a y electronica", score: 0.78 },
    ],
  },
  {
    id: 2, vendor_id: 2, alias_raw: "AdiSystem", external_id: null,
    suggestions: [
      { customer_id: 55, name: "adi systems", score: 0.94 },
      { customer_id: 56, name: "adi office", score: 0.71 },
    ],
  },
];

const MOCK_CUSTOMERS: Customer[] = [
  { id: 42, priority_customer_code: "C-001", name_canonical: "ADI Systems",
    name_hebrew: 'א.ד.י מערכות בע"מ', status: "active",
    billing_currency: "ILS", vat_rate: "17.00" },
  { id: 55, priority_customer_code: "C-002", name_canonical: "A.Y+Zemach",
    name_hebrew: null, status: "active",
    billing_currency: "ILS", vat_rate: "17.00" },
];

export async function fetchDashboard(): Promise<DashboardData> {
  if (MOCK_MODE) return MOCK_DASHBOARD;
  return apiFetch("/dashboard");
}

export async function fetchImports(): Promise<ImportSummary[]> {
  if (MOCK_MODE) return MOCK_IMPORTS;
  return apiFetch("/imports");
}

export async function createImport(period: string): Promise<{ id: number }> {
  if (MOCK_MODE) return { id: Math.floor(Math.random() * 1000) };
  return apiFetch("/imports", { method: "POST", body: JSON.stringify({ period }) });
}

export async function fetchPendingMatches(importId: number): Promise<PendingMatch[]> {
  if (MOCK_MODE) return MOCK_PENDING;
  return apiFetch(`/imports/${importId}/pending-matches`);
}

export async function resolvePendingMatch(pmId: number, customerId: number) {
  if (MOCK_MODE) return { resolved: true };
  return apiFetch(`/pending-matches/${pmId}/resolve`, {
    method: "POST", body: JSON.stringify({ customer_id: customerId }),
  });
}

export async function fetchCustomers(): Promise<Customer[]> {
  if (MOCK_MODE) return MOCK_CUSTOMERS;
  return apiFetch("/customers");
}
