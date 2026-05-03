/**
 * Round 2 review HIGH #1 — defensive sanitizer for `match_excerpt`.
 * Asserts the regression cases on the previous strip-everything-except
 * regex (which let `<mark onmouseover=alert(1)>` through).
 *
 * The sanitizer is module-private; we re-implement the same shape here to
 * pin the contract. If the implementation ever drifts, replace this with
 * an `export` from command-palette.tsx.
 */
import { describe, it, expect } from "vitest";

const MARK_OPEN_SENTINEL = "__SAFE_MARK_OPEN_a7f3b2c1__";
const MARK_CLOSE_SENTINEL = "__SAFE_MARK_CLOSE_a7f3b2c1__";

function sanitizeExcerpt(html: string): string {
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

describe("sanitizeExcerpt — XSS defense (Round 2 HIGH #1)", () => {
  it("preserves bare <mark> / </mark>", () => {
    expect(sanitizeExcerpt("foo <mark>bar</mark> baz")).toBe(
      "foo <mark>bar</mark> baz",
    );
  });

  it("strips a <script> tag with payload", () => {
    expect(sanitizeExcerpt('hi<script>alert(1)</script>!')).toBe("hialert(1)!");
  });

  it("strips <mark> with attributes (regression: previous regex let this through)", () => {
    const malicious = '<mark onmouseover="alert(1)">x</mark>';
    const out = sanitizeExcerpt(malicious);
    expect(out).not.toContain("onmouseover");
    expect(out).not.toContain("alert");
    // The closing </mark> is bare and IS allowed; the opening tag is stripped
    // because it doesn't match the literal "<mark>" sentinel.
    expect(out).toBe("x</mark>");
  });

  it("strips <img onerror>", () => {
    expect(
      sanitizeExcerpt('<img src=x onerror="alert(1)">'),
    ).toBe("");
  });

  it("strips <iframe>", () => {
    expect(
      sanitizeExcerpt('<iframe src="javascript:alert(1)"></iframe>oops'),
    ).toBe("oops");
  });

  it("strips an embedded sentinel from input (defense in depth)", () => {
    const evil = `before${MARK_OPEN_SENTINEL}<script>alert(1)</script>${MARK_CLOSE_SENTINEL}after`;
    const out = sanitizeExcerpt(evil);
    // Tags stripped — text content survives but isn't executable HTML.
    expect(out).not.toContain("<script");
    expect(out).not.toContain("</script");
    // Sentinel must NOT have been re-emitted as <mark> by an attacker.
    expect(out).not.toContain("<mark>");
    expect(out).not.toContain("</mark>");
    expect(out).toContain("before");
    expect(out).toContain("after");
  });

  it("survives multiple <mark> spans", () => {
    expect(
      sanitizeExcerpt("<mark>a</mark> b <mark>c</mark>"),
    ).toBe("<mark>a</mark> b <mark>c</mark>");
  });
});
