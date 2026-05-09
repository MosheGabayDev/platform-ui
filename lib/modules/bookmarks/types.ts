/**
 * @module lib/modules/bookmarks/types
 * Bookmarks — third vertical (lite). Spec + manifest + one mutation
 * (add). No edit, no delete in this scope — exercises the minimum
 * module-registry contract end-to-end.
 *
 * Spec: docs/system-upgrade/PRODUCT_LAUNCH_PLAN.md §1 task 5B.16.
 */

export interface Bookmark {
  id: string;
  /** ISO timestamp of creation. */
  created_at: string;
  /** Free-form title — required, displayed first. */
  title: string;
  /** URL — must be parseable by `new URL(...)`. */
  url: string;
  /** ID of the org-member who added the bookmark. */
  added_by_id: number;
  /** Display name of the adder at write time — denormalised. */
  added_by_name: string;
}
