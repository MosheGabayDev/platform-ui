/**
 * @module lib/ui/motion
 * Shared motion constants for page animations.
 * RTL-safe: uses opacity + y transforms (no x translation that would flip in RTL).
 */

/** Standard page enter ease curve. */
export const PAGE_EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];
