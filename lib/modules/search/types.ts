/**
 * @module lib/modules/search/types
 * Types for the cross-module PlatformSearch capability (cap 11).
 *
 * Canonical contract: `docs/system-upgrade/04-capabilities/platform-search-spec.md`
 * Backend port pending — frontend MOCK_MODE in `lib/api/search.ts`.
 */

/**
 * Open enum: backend MAY add new types as more modules onboard. Frontend MUST
 * tolerate unknown values (default icon + module label).
 */
export type SearchResultType =
  | "ticket"
  | "user"
  | "kb"
  | "org"
  | (string & {});

export interface SearchResult {
  type: SearchResultType;
  /** number for DB rows, string for KB slugs and similar. */
  id: number | string;
  title: string;
  subtitle: string | null;
  href: string;
  /** 0..1 relevance score; results are pre-sorted desc by this. */
  score: number;
  match_field: string;
  /** HTML snippet — backend ESCAPES user content; only `<mark>` is allowed. */
  match_excerpt: string;
}

export interface SearchParams {
  q: string;
  /** Restrict to specific result types; defaults to all. */
  types?: SearchResultType[];
  /** Per-type cap; backend default 8, max 25. */
  limit?: number;
}

export interface SearchResponse {
  success: boolean;
  data: {
    query: string;
    took_ms: number;
    results: SearchResult[];
    /** Per-type counts so the UI can show "12 tickets, 3 users" affordances. */
    totals_by_type: Record<string, number>;
  };
}
