/**
 * @module lib/utils/sanitize-excerpt
 * Defensive sanitizer for `match_excerpt` strings emitted by PlatformSearch
 * (cap 11). The contract (spec §1) says backend escapes user content and
 * emits ONLY bare `<mark>` / `</mark>` tags (no attributes). We re-verify
 * before injecting via `dangerouslySetInnerHTML`.
 *
 * Why the sentinel approach: a "strip everything except <mark>" regex is
 * easy to bypass with attribute injection (`<mark onmouseover=alert(1)>`
 * matches `mark\b` and survives a naive negative-lookahead). Instead, we
 * preserve only the literal byte sequences `<mark>` and `</mark>`, then
 * strip ALL remaining tags. (Round 2 review HIGH #1 — 2026-05-03.)
 *
 * Extracted from `components/shell/command-palette.tsx` to a shared module
 * so the sanitizer test imports the live function instead of a copy
 * (Round 3 review HIGH #1 — 2026-05-03).
 */

// Unguessable sentinels — backend escapes user content so collision is
// astronomically unlikely. Defense-in-depth: strip pre-existing sentinels
// from input first so a worst-case collision degrades to a missing
// highlight, never to script execution.
export const MARK_OPEN_SENTINEL = "__SAFE_MARK_OPEN_a7f3b2c1__";
export const MARK_CLOSE_SENTINEL = "__SAFE_MARK_CLOSE_a7f3b2c1__";

export function sanitizeExcerpt(html: string): string {
  const cleaned = html
    .split(MARK_OPEN_SENTINEL)
    .join("")
    .split(MARK_CLOSE_SENTINEL)
    .join("");
  return cleaned
    .split("<mark>")
    .join(MARK_OPEN_SENTINEL)
    .split("</mark>")
    .join(MARK_CLOSE_SENTINEL)
    .replace(/<[^>]*>/g, "")
    .split(MARK_OPEN_SENTINEL)
    .join("<mark>")
    .split(MARK_CLOSE_SENTINEL)
    .join("</mark>");
}
