/**
 * @module components/shared/page-shell/types
 * Shared types for the PageShell component.
 */

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export interface PageShellProps {
  /** Lucide icon for the module icon chip in the header. */
  icon: LucideIcon;
  /** Page title rendered as h1. */
  title: string;
  /** Subtitle / description below the title. */
  subtitle?: string;
  /**
   * Stats chips rendered in the header row alongside the title.
   * Pass <StatsGrid> children here.
   */
  stats?: ReactNode;
  /**
   * Action buttons rendered in the header row (create, export, etc.).
   * Wrap with PermissionGate when actions are role-restricted.
   */
  actions?: ReactNode;
  /** Page content rendered below the header. */
  children: ReactNode;
}
