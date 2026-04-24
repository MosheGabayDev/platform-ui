"use client";
/**
 * @module components/shared/page-shell/page-shell
 * Standard page layout for module list pages.
 * Provides: LazyMotion context, animated header (icon + title + subtitle + stats/actions), content area.
 *
 * Does NOT include PermissionGate — callers wrap PageShell with PermissionGate when needed.
 * Does NOT include the sticky header / breadcrumb — those are Phase B.
 */

import { motion, LazyMotion, domAnimation } from "framer-motion";
import { cn } from "@/lib/utils";
import { PAGE_EASE } from "@/lib/ui/motion";
import type { PageShellProps } from "./types";

export function PageShell({
  icon: Icon,
  title,
  subtitle,
  stats,
  actions,
  children,
}: PageShellProps) {
  return (
    <LazyMotion features={domAnimation}>
      <div className="space-y-6 pb-20 md:pb-0">

        {/* Header: icon + title + subtitle (left) | stats + actions (right) */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: PAGE_EASE }}
          className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="size-4 text-primary" />
              </div>
              <h1 className="text-xl font-semibold">{title}</h1>
            </div>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>

          {(stats || actions) && (
            <div className={cn("flex flex-wrap gap-2", actions && stats && "items-start")}>
              {stats}
              {actions}
            </div>
          )}
        </motion.div>

        {children}
      </div>
    </LazyMotion>
  );
}
