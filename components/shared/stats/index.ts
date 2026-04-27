/**
 * @module components/shared/stats
 * KPI stat cards for list page headers and dashboard widgets.
 *
 * Two flavors:
 *   - StatCard — compact chip (value + label + icon) for list page headers.
 *   - KpiCard  — rich dashboard card with count-up + trend + sparkline.
 *
 * Usage:
 *   import { StatCard, KpiCard, StatsGrid } from "@/components/shared/stats";
 */

export { StatCard } from "./stat-card";
export { KpiCard } from "./kpi-card";
export { StatsGrid } from "./stats-grid";
export type { StatCardProps, StatsGridProps } from "./types";
export type { KpiCardProps, KpiSparkPoint } from "./kpi-card";
