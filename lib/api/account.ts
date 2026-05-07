/**
 * @module lib/api/account
 * GDPR-driven self-service account endpoints.
 *
 * Spec: docs/system-upgrade/PRODUCT_LAUNCH_PLAN.md §4 tasks 7.05 + 7.06.
 *
 * Both endpoints are async by contract — the backend kicks off the
 * job, the user gets a receipt by email when it completes. Frontend
 * never receives the actual export bytes (security: signed S3 link
 * via email avoids leaking the bundle through browser history /
 * extensions).
 *
 * MOCK_MODE flip checklist:
 *   1. Set NEXT_PUBLIC_MOCK_API=false.
 *   2. Backend serves POST /api/proxy/me/export and POST /api/proxy/me/delete
 *      with the typed-confirm body shape below.
 *   3. /me/export emits an audit entry via cap 10 + queues the job.
 *   4. /me/delete starts a 7-day grace window; cancellable via
 *      backend-only flag, not by re-calling this endpoint.
 */

export const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_API !== "false";

const BASE = "/api/proxy/me";

export interface ExportDataResponse {
  success: boolean;
  message: string;
  data: { request_id: string; estimated_email_at: string };
}

export interface DeleteAccountInput {
  /** Typed-confirm value — must match the user's current email exactly. */
  email_confirmation: string;
}

export interface DeleteAccountResponse {
  success: boolean;
  message: string;
  data: { request_id: string; effective_at: string };
}

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

/**
 * Request a GDPR-compliant data export. Async by design — the user
 * receives a signed S3 link by email when the bundle is ready.
 */
export async function requestDataExport(): Promise<ExportDataResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 300));
    return {
      success: true,
      message: "(mock) export queued",
      data: {
        request_id: `exp_${Date.now().toString(36)}`,
        estimated_email_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
      },
    };
  }
  return apiFetch<ExportDataResponse>("/export", { method: "POST" });
}

/**
 * Request permanent account deletion (Right to be Forgotten). 7-day
 * grace window; cancellable only via backend flag set by support.
 */
export async function requestAccountDelete(
  input: DeleteAccountInput,
): Promise<DeleteAccountResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 300));
    return {
      success: true,
      message: "(mock) deletion scheduled",
      data: {
        request_id: `del_${Date.now().toString(36)}`,
        effective_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      },
    };
  }
  return apiFetch<DeleteAccountResponse>("/delete", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
