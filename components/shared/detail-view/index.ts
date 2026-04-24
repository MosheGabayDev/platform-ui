/**
 * @module components/shared/detail-view
 * Shared building blocks for module detail pages.
 *
 * Security note: these are purely presentational. Backend enforces tenant isolation.
 * PermissionGate must be used by callers for privileged content — not enforced here.
 *
 * Usage:
 *   import { InfoRow, BoolBadge, DetailSection, DetailHeaderCard,
 *            DetailBackButton, DetailLoadingSkeleton } from "@/components/shared/detail-view";
 */

export { InfoRow } from "./info-row";
export { BoolBadge } from "./bool-badge";
export { DetailSection } from "./detail-section";
export { DetailHeaderCard } from "./detail-header-card";
export { DetailBackButton } from "./detail-back-button";
export { DetailLoadingSkeleton } from "./detail-loading-skeleton";
export type {
  InfoRowProps,
  DetailSectionProps,
  DetailHeaderCardProps,
} from "./types";
