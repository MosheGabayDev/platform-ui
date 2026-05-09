/**
 * @module lib/modules/notes/types
 * Generic notes module — validates the platform's "any-vertical"
 * claim by adding a second module that is fully decoupled from
 * Helpdesk.
 *
 * Spec: docs/system-upgrade/PRODUCT_LAUNCH_PLAN.md §1 task 5B.15.
 *
 * A Note is a small, free-form text entity owned by a user inside an
 * org. Tags are unstructured strings. No status workflow — keep the
 * surface area minimal so this exercises the generic platform plumbing
 * (auth + module-registry + DataTable + PlatformForm) rather than
 * domain logic.
 */

export interface Note {
  id: string;
  /** ISO timestamp when first created. */
  created_at: string;
  /** ISO timestamp of last edit; equals `created_at` when never edited. */
  updated_at: string;
  /** One-line title — required. */
  title: string;
  /** Free-form markdown body. */
  body: string;
  /** Unstructured string tags (e.g. ["meeting", "Q3"]). */
  tags: string[];
  /** ID of the org-member who owns the note. */
  author_id: number;
  /** Display name of the author at the time of write — denormalised. */
  author_name: string;
}
