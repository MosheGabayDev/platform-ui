/**
 * @module components/shared/detail-view/types
 * Shared types for detail view components.
 */

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export interface InfoRowProps {
  /** Lucide icon displayed at the start of the row. */
  icon: LucideIcon;
  /** Label text shown in muted color. */
  label: string;
  /** Value — any React node. Falls back to "—" when null/undefined. */
  value: ReactNode;
}

export interface DetailSectionProps {
  /** Section heading shown above the separator. */
  title: string;
  children: ReactNode;
  className?: string;
}

export interface DetailHeaderCardProps {
  /** Primary title (name, email, etc.). */
  title: string;
  /** Secondary line below title (email, slug, etc.). */
  subtitle?: string;
  /** Monospace subtitle styling (e.g. slug, username). */
  subtitleMono?: boolean;
  /** Badge elements rendered below subtitle. */
  badges?: ReactNode;
  /** Avatar / icon element on the right side. */
  avatar: ReactNode;
}
