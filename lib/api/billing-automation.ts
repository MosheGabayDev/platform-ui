/**
 * @module lib/api/billing-automation
 * Client for the Meteorit billing-automation Flask backend.
 * Routes through /api/proxy/billing-automation/* — auth is attached server-side
 * via the bearer-token proxy at app/api/proxy/[...path]/route.ts.
 */
import type {
  DashboardStats,
  CustomerSummary,
  CustomerDetail,
  SkuStat,
  SkuMappingResp,
  SampleInvoice,
} from "@/lib/modules/billing-automation/types";

const BASE = "/api/proxy/billing-automation";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? body.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const fetchBillingDashboard = () =>
  apiFetch<DashboardStats>("/extracted/dashboard");

export const fetchBillingCustomers = () =>
  apiFetch<CustomerSummary[]>("/extracted/customers");

export const fetchBillingCustomer = (id: string) =>
  apiFetch<CustomerDetail>(`/extracted/customers/${encodeURIComponent(id)}`);

export const fetchBillingSkus = () =>
  apiFetch<SkuStat[]>("/extracted/skus");

export const fetchSkuMapping = () =>
  apiFetch<SkuMappingResp>("/extracted/sku-mapping");

export const fetchSampleInvoices = () =>
  apiFetch<SampleInvoice[]>("/extracted/sample-invoices");

export const updateSkuMapping = (vars: { sku_name: string; bracket: string | null; priority_sku: string }) =>
  apiFetch<{ ok: boolean; sku_name: string; old_value: string | null; new_value: string | null }>(
    "/extracted/sku-mapping/update",
    { method: "POST", body: JSON.stringify(vars) },
  );


// ===== Admin: users + password policy =====

export type AdminUser = {
  id: number;
  email: string;
  full_name: string | null;
  role: "user" | "admin" | "system_admin";
  is_active: boolean;
  org_id: number;
  last_login_at: string | null;
  locked_until: string | null;
  password_changed_at: string | null;
};

export type Organization = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
};

export type PasswordPolicy = {
  min_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_digit: boolean;
  require_special: boolean;
  max_age_days: number;
  max_failed_attempts: number;
  lockout_minutes: number;
};

export const fetchAdminUsers = () => apiFetch<AdminUser[]>("/admin/users");

export const createAdminUser = (vars: { email: string; full_name?: string; password: string; role: string; org_id?: number }) =>
  apiFetch<AdminUser>("/admin/users", { method: "POST", body: JSON.stringify(vars) });

export const fetchOrganizations = () => apiFetch<Organization[]>("/admin/organizations");

export const createOrganization = (vars: { name: string; slug: string; description?: string }) =>
  apiFetch<{ id: number; name: string; slug: string }>("/admin/organizations", { method: "POST", body: JSON.stringify(vars) });

export const updateAdminUser = (id: number, vars: Partial<{ is_active: boolean; role: string; full_name: string; password: string }>) =>
  apiFetch<AdminUser>(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(vars) });

export const deleteAdminUser = (id: number) =>
  apiFetch<{ ok: boolean }>(`/admin/users/${id}`, { method: "DELETE" });

export const fetchPasswordPolicy = () => apiFetch<PasswordPolicy>("/admin/password-policy");

export const updatePasswordPolicy = (vars: Partial<PasswordPolicy>) =>
  apiFetch<PasswordPolicy>("/admin/password-policy", { method: "PUT", body: JSON.stringify(vars) });


// ===== Validation report (pre-export gate) =====

export type Severity = "blocker" | "warning" | "info";

export type ValidationFinding = {
  id: number;
  category: string;
  severity: Severity;
  title: string;
  description: string;
  entity_type: "customer" | "sku" | "row" | "file";
  entity_label: string;
  suggested_action: string;
  can_approve: boolean;
  can_skip: boolean;
  can_fix: boolean;
  meta: Record<string, unknown>;
};

export type ValidationReport = {
  summary: {
    total: number;
    blocker: number;
    warning: number;
    info: number;
    export_blocked: boolean;
    by_category: Record<string, { total: number; blocker: number; warning: number; info: number }>;
  };
  categories: { key: string; label: string }[];
  findings: ValidationFinding[];
};

export const fetchValidation = () => apiFetch<ValidationReport>("/extracted/validation");
