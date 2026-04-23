/**
 * @module components/modules/users/user-role-badge
 * Displays user role as a colored badge.
 * Maps known Flask role names to colors. Falls back to muted for unknown roles.
 * Pure presentational — no data fetching, no side effects.
 */

import { cn } from "@/lib/utils";

interface UserRoleBadgeProps {
  role: string | null;
  isAdmin?: boolean;
  isSystemAdmin?: boolean;
  className?: string;
}

const ROLE_STYLES: Record<string, string> = {
  admin: "bg-red-500/15 text-red-500 border-red-500/30",
  system_admin: "bg-purple-500/15 text-purple-500 border-purple-500/30",
  manager: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  technician: "bg-sky-500/15 text-sky-500 border-sky-500/30",
  user: "bg-muted text-muted-foreground border-border",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "אדמין",
  system_admin: "אדמין מערכת",
  manager: "מנהל",
  technician: "טכנאי",
  user: "משתמש",
};

export function UserRoleBadge({ role, isAdmin, isSystemAdmin, className }: UserRoleBadgeProps) {
  const effectiveRole = isSystemAdmin ? "system_admin" : (isAdmin ? "admin" : role ?? "user");
  const style = ROLE_STYLES[effectiveRole] ?? ROLE_STYLES.user;
  const label = ROLE_LABELS[effectiveRole] ?? effectiveRole;

  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border",
      style,
      className
    )}>
      {label}
    </span>
  );
}
