/**
 * @module lib/utils/format
 * Web-facing formatting re-export.
 *
 * @platform web — compatibility shim; pure logic lives in lib/platform/formatting/format.ts
 *
 * All functions are re-exported unchanged from the cross-platform implementation.
 * Existing web imports from "@/lib/utils/format" continue to work without change.
 *
 * New code should import directly from "@/lib/platform/formatting" or
 * "@/lib/platform" to make the cross-platform dependency explicit.
 */
export {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatNumber,
  formatCurrency,
  formatBytes,
} from "@/lib/platform/formatting/format";
