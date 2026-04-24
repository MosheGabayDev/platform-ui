/**
 * @module lib/auth/rbac
 * Web-facing RBAC re-export.
 *
 * @platform web — compatibility shim; pure logic lives in lib/platform/permissions/rbac.ts
 *
 * All functions are re-exported unchanged from the cross-platform implementation.
 * Existing web imports from "@/lib/auth/rbac" continue to work without change.
 *
 * New code should import directly from "@/lib/platform/permissions/rbac" or
 * "@/lib/platform" to make the cross-platform dependency explicit.
 */
export type { SessionLike } from "@/lib/platform/permissions/rbac";
export {
  hasRole,
  hasAnyRole,
  hasPermission,
  isSystemAdmin,
  getOrgId,
} from "@/lib/platform/permissions/rbac";
