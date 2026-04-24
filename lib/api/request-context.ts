/**
 * @module lib/api/request-context
 * Web-facing request context re-export.
 *
 * @platform web — compatibility shim; pure logic lives in lib/platform/request/context.ts
 *
 * All functions are re-exported unchanged from the cross-platform implementation.
 * Existing imports from "@/lib/api/request-context" continue to work without change.
 *
 * Used by: app/api/proxy/[...path]/route.ts
 */
export { generateRequestId, buildAuditHeaders } from "@/lib/platform/request/context";
