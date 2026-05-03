"use client";
/**
 * AuditCategoryBadge — colored chip for audit event category.
 */
import { Badge } from "@/components/ui/badge";
import type { AuditCategory } from "@/lib/modules/audit/types";

const TONE: Record<AuditCategory, string> = {
  login: "border-cyan-500/30 bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  create: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  update: "border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-400",
  delete: "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-400",
  admin: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400",
  ai: "border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-400",
  security: "border-red-500/40 bg-red-500/15 text-red-700 dark:text-red-400",
};

const LABEL: Record<AuditCategory, string> = {
  login: "Login",
  create: "Create",
  update: "Update",
  delete: "Delete",
  admin: "Admin",
  ai: "AI",
  security: "Security",
};

export function AuditCategoryBadge({ category }: { category: AuditCategory }) {
  return (
    <Badge variant="outline" className={TONE[category]}>
      {LABEL[category]}
    </Badge>
  );
}
