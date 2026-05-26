/**
 * @module lib/modules/billing-automation/types
 * Types for the Meteorit billing-automation module.
 * Mirrors the Flask `apps/billing_automation` API contracts.
 */

export type DashboardStats = {
  invoices: number;
  invoices_with_lines: number;
  customers: number;
  unique_skus: number;
  tariff_entries: number;
  total_ils: number;
  avg_per_customer_ils: number;
  total_line_items: number;
};

export type CustomerSummary = {
  number: string;
  name: string;
  sku_count: number;
  total_ils: number;
  invoice_count: number;
};

export type Tariff = {
  customer_number: string;
  customer_name: string;
  sku: string;
  currency: string;
  unit_price_currency?: "ILS" | "USD";
  unit_price: number;
  last_quantity: number;
  last_invoice: string;
  last_date: string;
  discount_pct: number;
};

export type InvoiceLine = {
  sku: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  currency: string;
  unit_price_currency?: "ILS" | "USD";
  discount_pct: number;
};

export type Invoice = {
  invoice_id: string;
  date: string;
  customer_number: string;
  customer_name_raw: string;
  lines: InvoiceLine[];
};

export type CustomerDetail = {
  customer: CustomerSummary;
  tariffs: Tariff[];
  invoices: Invoice[];
};

export type SkuStat = {
  sku: string;
  currency: string;
  customers: number;
  min: number;
  max: number;
  avg: number;
};

export type SkuMappingTier = {
  bracket: string | null;
  min: number | null;
  max: number | null;
  priority_sku: string | null;
};

export type SkuMappingItem = {
  sku_name: string;
  brackets: number;
  has_priority: boolean;
  is_tiered: boolean;
  tiers: SkuMappingTier[];
};

export type SkuMappingResp = {
  stats: {
    total_skus: number;
    with_priority_code: number;
    without_priority_code: number;
    tiered_skus: number;
    coverage_pct: number;
  };
  items: SkuMappingItem[];
};

export type SampleInvoiceLine = {
  sku: string;
  quantity: number;
  priority_sku: string | null;
};

export type SampleInvoice = {
  customer_number: string;
  customer_name: string;
  date: string;
  source_file: string;
  lines: SampleInvoiceLine[];
};
