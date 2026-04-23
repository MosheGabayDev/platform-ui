"use client";
/**
 * @module components/shared/permission-gate
 * Conditionally renders children based on the current user's role or permission.
 *
 * Owns: role/permission-based render gating with fallback support.
 * Does NOT own: security enforcement (backend responsibility), session management.
 * Used by: any module component with admin-only or role-restricted UI actions.
 *
 * IMPORTANT: This component controls visibility only — it is NOT a security boundary.
 * Backend endpoints must independently enforce authorization.
 * Never rely on this component to protect sensitive data.
 *
 * Render modes:
 * - "hide" (default): children not rendered at all when unauthorized
 * - "disable": children rendered but wrapped with pointer-events-none + opacity
 * - "readonly": caller controls readonly behavior via fallback prop
 */

import type { ReactNode } from "react";
import { usePermission } from "@/lib/hooks/use-permission";

type GateMode = "hide" | "disable";

interface PermissionGateProps {
  /** Require one of these roles. Admins always pass. */
  role?: string | string[];
  /** Require this permission codename. Admins always pass. */
  permission?: string;
  /** Require is_admin=true. */
  adminOnly?: boolean;
  /** Require is_system_admin=true. */
  systemAdminOnly?: boolean;
  /**
   * Render mode when unauthorized:
   * - "hide": render nothing (or fallback)
   * - "disable": render children with pointer-events disabled and reduced opacity
   * Default: "hide"
   */
  mode?: GateMode;
  /** Rendered when unauthorized and mode="hide". Default: null. */
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGate({
  role,
  permission,
  adminOnly,
  systemAdminOnly,
  mode = "hide",
  fallback = null,
  children,
}: PermissionGateProps) {
  const { isRole, can, isAdmin, isSystemAdmin: isSysAdmin, isLoading } = usePermission();

  // Don't gate while session loads — avoids flash of unauthorized UI
  if (isLoading) return null;

  const roles = role ? (Array.isArray(role) ? role : [role]) : null;

  const allowed =
    (adminOnly ? isAdmin : true) &&
    (systemAdminOnly ? isSysAdmin : true) &&
    (roles ? isRole(...roles) : true) &&
    (permission ? can(permission) : true);

  if (!allowed) {
    if (mode === "disable") {
      return (
        <span className="pointer-events-none opacity-40 select-none" aria-disabled>
          {children}
        </span>
      );
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
