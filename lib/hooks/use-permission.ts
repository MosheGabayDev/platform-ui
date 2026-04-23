"use client";
/**
 * @module lib/hooks/use-permission
 * React hook that wraps RBAC utilities with the current session.
 *
 * Owns: session-aware permission checks for Client Components.
 * Does NOT own: RBAC logic (that lives in lib/auth/rbac.ts), security enforcement.
 * Used by: PermissionGate, any Client Component that needs role/permission checks.
 *
 * Security note: this is UX-only. Backend must enforce authorization independently.
 * Do not treat hidden UI elements as a security boundary.
 */

import { useSession } from "next-auth/react";
import { hasRole, hasPermission, isSystemAdmin } from "@/lib/auth/rbac";

export interface PermissionHelpers {
  /** True if user has any of the given roles (admins always pass). */
  isRole: (...roles: string[]) => boolean;
  /** True if user has the given permission codename (admins always pass). */
  can: (permission: string) => boolean;
  /** True if user has is_admin=true. */
  isAdmin: boolean;
  /** True if user has is_system_admin=true (same as isAdmin in current schema). */
  isSystemAdmin: boolean;
  /** True if session is loading (data not yet available). */
  isLoading: boolean;
}

export function usePermission(): PermissionHelpers {
  const { data: session, status } = useSession();

  return {
    isRole: (...roles: string[]) => hasRole(session, ...roles),
    can: (permission: string) => hasPermission(session, permission),
    isAdmin: session?.user?.is_admin ?? false,
    isSystemAdmin: isSystemAdmin(session),
    isLoading: status === "loading",
  };
}
