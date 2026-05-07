/**
 * @module lib/api/signup
 * Public self-service signup endpoint client.
 *
 * Spec: docs/system-upgrade/PRODUCT_LAUNCH_PLAN.md §3 task 6.07.
 *
 * Accepts unauthenticated requests — the only client-side endpoint that
 * does (login is via next-auth). Backend MUST rate-limit by IP (§5 task
 * 8.09) and email-verify before activating the org.
 *
 * MOCK_MODE flip checklist:
 *   1. Set NEXT_PUBLIC_MOCK_API=false.
 *   2. Backend serves POST /api/proxy/signup with SignupInput body.
 *   3. Returns 201 + SignupResponse on success.
 *   4. Returns 409 if email already registered.
 *   5. Backend triggers email verification (§3 task 6.08).
 */

import type { SignupInput } from "@/lib/modules/signup/schemas";

export const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_API !== "false";

const BASE = "/api/proxy/signup";

export interface SignupResponse {
  success: boolean;
  message: string;
  data?: { org_id: number; user_id: number; email_verification_sent: boolean };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? body.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/** Submit a new self-service signup. */
export async function submitSignup(input: SignupInput): Promise<SignupResponse> {
  if (MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 400));
    return {
      success: true,
      message: "(mock) organization created — verification email queued",
      data: { org_id: 999, user_id: 999, email_verification_sent: true },
    };
  }
  return apiFetch<SignupResponse>("", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
