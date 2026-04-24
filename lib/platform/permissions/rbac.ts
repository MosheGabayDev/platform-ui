/**
 * @module lib/platform/permissions/rbac
 * Pure RBAC utility functions for role and permission checks.
 *
 * @platform cross — no React, no Next.js, no DOM, no next-auth
 *
 * Mirrors Flask rbac.py: admins bypass all role and permission checks.
 * Safe for use in web client components, React Native, Electron, Node.js tests.
 * Does NOT import from next-auth — accepts a generic SessionLike to remain testable.
 */

import type { NormalizedAuthUser } from "@/lib/platform/auth/types";

/** Minimal session shape accepted by all RBAC helpers. */
export interface SessionLike {
  user?: NormalizedAuthUser | null;
}

/**
 * Returns true if session.user has one of the given roles.
 * Admins (is_admin=true) always return true, matching Flask @role_required behavior.
 */
export function hasRole(
  session: SessionLike | null | undefined,
  ...roles: string[]
): boolean {
  if (!session?.user) return false;
  if (session.user.is_admin) return true;
  return roles.includes(session.user.role);
}

/** Alias for hasRole with array argument instead of variadic. */
export function hasAnyRole(
  session: SessionLike | null | undefined,
  roles: string[]
): boolean {
  return hasRole(session, ...roles);
}

/**
 * Returns true if session.user has the given permission codename.
 * Admins always return true, matching Flask @permission_required behavior.
 */
export function hasPermission(
  session: SessionLike | null | undefined,
  permission: string
): boolean {
  if (!session?.user) return false;
  if (session.user.is_admin) return true;
  return session.user.permissions.includes(permission);
}

/**
 * Returns true if the user is a platform-wide system admin.
 * Distinct from is_admin (org admin) — is_system_admin is the global super-admin.
 */
export function isSystemAdmin(
  session: SessionLike | null | undefined
): boolean {
  return session?.user?.is_system_admin ?? false;
}

/**
 * Returns org_id from session, or null if no session.
 * Use this everywhere org_id is needed — never read from request body (CLAUDE.md rule).
 */
export function getOrgId(session: SessionLike | null | undefined): number | null {
  return session?.user?.org_id ?? null;
}
