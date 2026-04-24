/**
 * @module lib/platform/request/context
 * Standard audit/correlation headers for API requests.
 *
 * @platform cross — no React, no Next.js, no DOM, no browser APIs
 *
 * Provides header names and value builders for server-side audit logging.
 * These headers are audit hints only — NOT trusted authorization.
 * Backend must never use X-Client-* headers for access control.
 * Correlation ID is client-generated — not cryptographically verified.
 */

/** Generates a lightweight correlation ID (not crypto-secure — audit use only). */
export function generateRequestId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `pui-${ts}-${rand}`;
}

/** Build standard audit headers to attach to every proxied API request. */
export function buildAuditHeaders(context: {
  userId?: number | null;
  orgId?: number | null;
  route?: string | null;
  action?: string | null;
}): Record<string, string> {
  const headers: Record<string, string> = {
    "X-Request-ID": generateRequestId(),
    "X-Client-Source": "platform-ui",
  };

  if (context.userId != null) {
    headers["X-User-Id"] = String(context.userId);
  }
  if (context.orgId != null) {
    headers["X-Org-Id"] = String(context.orgId);
  }
  if (context.route) {
    headers["X-Client-Route"] = context.route.slice(0, 100);
  }
  if (context.action) {
    headers["X-Client-Action"] = context.action.slice(0, 50);
  }

  return headers;
}
