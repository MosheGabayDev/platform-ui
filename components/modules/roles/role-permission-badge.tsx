/**
 * @module components/modules/roles/role-permission-badge
 * Badge for a single permission codename. Color-coded by dot-notation namespace.
 * Pure presentational — no data fetching.
 */

import { cn } from "@/lib/utils";

interface RolePermissionBadgeProps {
  name: string;
  className?: string;
}

const NAMESPACE_STYLES: Record<string, string> = {
  ops:           "bg-blue-500/15 text-blue-600 border-blue-500/30",
  ai_providers:  "bg-violet-500/15 text-violet-600 border-violet-500/30",
  billing:       "bg-amber-500/15 text-amber-600 border-amber-500/30",
  helpdesk:      "bg-sky-500/15 text-sky-600 border-sky-500/30",
  users:         "bg-green-500/15 text-green-600 border-green-500/30",
  roles:         "bg-purple-500/15 text-purple-600 border-purple-500/30",
  orgs:          "bg-teal-500/15 text-teal-600 border-teal-500/30",
  general:       "bg-muted text-muted-foreground border-border",
};

function getNamespace(codename: string): string {
  return codename.includes(".") ? codename.split(".")[0] : "general";
}

export function RolePermissionBadge({ name, className }: RolePermissionBadgeProps) {
  const ns = getNamespace(name);
  const style = NAMESPACE_STYLES[ns] ?? NAMESPACE_STYLES.general;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-mono border",
        style,
        className,
      )}
    >
      {name}
    </span>
  );
}
