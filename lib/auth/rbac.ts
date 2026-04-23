/**
 * @module lib/auth/rbac
 * Pure RBAC utility functions for platform-ui.
 * Mirrors Flask rbac.py logic: admins bypass all role and permission checks.
 * Use in Server Components (getServerSession) and Client Components (useSession).
 * Does not import next-auth — accepts a generic SessionLike to remain unit-testable.
 */

import type { NormalizedAuthUser } from "./types";

/** Minimal session shape accepted by all RBAC helpers. */
interface SessionLike {
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
 * Note: permissions[] is currently empty until backend adds it to JWT (Q14).
 * Prefer role-based checks until then.
 */
export function hasPermission(
  session: SessionLike | null | undefined,
  permission: string
): boolean {
  if (!session?.user) return false;
  if (session.user.is_admin) return true;
  return session.user.permissions.includes(permission);
}

/** Returns true if the user is a system admin (is_admin flag). */
export function isSystemAdmin(
  session: SessionLike | null | undefined
): boolean {
  return session?.user?.is_admin ?? false;
}

/**
 * Returns org_id from session, or null if no session.
 * Use this everywhere org_id is needed — never read from request body (CLAUDE.md security rule).
 */
export function getOrgId(session: SessionLike | null | undefined): number | null {
  return session?.user?.org_id ?? null;
}
