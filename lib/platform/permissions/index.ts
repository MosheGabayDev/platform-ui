/**
 * @module lib/platform/permissions
 * Cross-platform RBAC utilities.
 * @platform cross
 */
export type { SessionLike } from "./rbac";
export {
  hasRole,
  hasAnyRole,
  hasPermission,
  isSystemAdmin,
  getOrgId,
} from "./rbac";
