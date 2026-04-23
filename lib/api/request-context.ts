/**
 * @module lib/api/request-context
 * Standard audit/correlation headers attached to every proxied API request.
 *
 * Owns: header names, header value builders, correlation ID generation.
 * Does NOT own: authentication (proxy route owns), secrets, org_id enforcement.
 * Used by: app/api/proxy/[...path]/route.ts
 *
 * Security note: these headers are audit hints for server-side logging.
 * They are NOT trusted authorization. Backend must never use X-Client-* for access control.
 * Correlation ID is client-generated — not cryptographically verified.
 */

/** Generates a lightweight correlation ID (not crypto-secure — audit use only). */
export function generateRequestId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `pui-${ts}-${rand}`;
}

/** Build standard audit headers to attach to every proxied request. */
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
    // Only include safe, non-sensitive route info
    headers["X-Client-Route"] = context.route.slice(0, 100);
  }
  if (context.action) {
    headers["X-Client-Action"] = context.action.slice(0, 50);
  }

  return headers;
}
