/**
 * @module lib/api/whatsapp
 * API client for the user-owned WhatsApp archive module.
 *
 * All calls go through the Next.js proxy so the browser never receives the
 * Flask JWT directly. Backend enforces org/user ownership.
 */

const BASE = "/api/proxy/whatsapp";

export type WhatsAppSessionState =
  | "needs_qr"
  | "connecting"
  | "ready"
  | "disconnected"
  | "failed"
  | "unlinked";

export interface WhatsAppSession {
  id: number;
  session_state: WhatsAppSessionState;
  session_state_updated_at: string | null;
  last_qr_generated_at: string | null;
  connected_phone: string | null;
  last_heartbeat_at: string | null;
  assigned_replica: string | null;
  lease_expires_at: string | null;
  relink_requested_at: string | null;
  meta: Record<string, unknown>;
  created_at: string | null;
}

export interface WhatsAppSessionsResponse {
  status: "ok";
  data: WhatsAppSession[];
}

export interface WhatsAppSessionMutationResponse {
  status: "ok";
  session_id: number;
  session_state: WhatsAppSessionState;
}

export interface WhatsAppQrResponse extends WhatsAppSessionMutationResponse {
  connected_phone: string | null;
  last_qr_generated_at: string | null;
  qr?: string;
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

/** Fetch the current user's personal WhatsApp session rows. */
export function fetchWhatsappSessions(): Promise<WhatsAppSessionsResponse> {
  return apiFetch<WhatsAppSessionsResponse>("/api/my/sessions");
}

/** Start the user's personal WhatsApp QR linking flow. */
export function linkWhatsappSession(): Promise<WhatsAppSessionMutationResponse> {
  return apiFetch<WhatsAppSessionMutationResponse>("/api/my/sessions", {
    method: "POST",
    body: "{}",
  });
}

/** Poll QR/lifecycle state for one owned WhatsApp session. */
export function fetchWhatsappSessionQr(sessionId: number): Promise<WhatsAppQrResponse> {
  return apiFetch<WhatsAppQrResponse>(`/api/my/sessions/${sessionId}/qr`);
}

/** Request a fresh QR for one owned WhatsApp session. */
export function relinkWhatsappSession(sessionId: number): Promise<WhatsAppSessionMutationResponse> {
  return apiFetch<WhatsAppSessionMutationResponse>(`/api/my/sessions/${sessionId}/relink`, {
    method: "POST",
    body: "{}",
  });
}

/** Unlink one owned WhatsApp session while retaining archived data. */
export function unlinkWhatsappSession(sessionId: number): Promise<WhatsAppSessionMutationResponse> {
  return apiFetch<WhatsAppSessionMutationResponse>(`/api/my/sessions/${sessionId}`, {
    method: "DELETE",
  });
}

