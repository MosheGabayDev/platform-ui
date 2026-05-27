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
  last_login_at: string | null;
  locked_until: string | null;
  password_changed_at: string | null;
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

export const createAdminUser = (vars: { email: string; full_name?: string; password: string; role: string }) =>
  apiFetch<AdminUser>("/admin/users", { method: "POST", body: JSON.stringify(vars) });

export const updateAdminUser = (id: number, vars: Partial<{ is_active: boolean; role: string; full_name: string; password: string }>) =>
  apiFetch<AdminUser>(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(vars) });

export const deleteAdminUser = (id: number) =>
  apiFetch<{ ok: boolean }>(`/admin/users/${id}`, { method: "DELETE" });

export const fetchPasswordPolicy = () => apiFetch<PasswordPolicy>("/admin/password-policy");

export const updatePasswordPolicy = (vars: Partial<PasswordPolicy>) =>
  apiFetch<PasswordPolicy>("/admin/password-policy", { method: "PUT", body: JSON.stringify(vars) });
