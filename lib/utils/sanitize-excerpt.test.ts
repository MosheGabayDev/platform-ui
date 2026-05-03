/**
 * sanitizeExcerpt — XSS defense for match_excerpt.
 * Originally added as part of Round 2 review HIGH #1.
 * Round 3 review HIGH #1: now imports the live function instead of a copy
 * so implementation drift cannot pass tests silently.
 * Round 3 review HIGH #3: adds <mark/> self-closing degradation case.
 */
import { describe, it, expect } from "vitest";
import {
  sanitizeExcerpt,
  MARK_OPEN_SENTINEL,
  MARK_CLOSE_SENTINEL,
} from "./sanitize-excerpt";

describe("sanitizeExcerpt — XSS defense", () => {
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
    expect(out).not.toContain("<script");
    expect(out).not.toContain("</script");
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

  it("self-closing <mark/> degrades to empty (Round 3 HIGH #3)", () => {
    // Backend contract emits BARE <mark> / </mark> only — never self-closing.
    // If a future backend regression emits <mark/>, the sanitizer must NOT
    // produce a phantom <mark> wrapper or expose a bypass; it should drop
    // the tag silently.
    expect(sanitizeExcerpt("foo<mark/>bar")).toBe("foobar");
    expect(sanitizeExcerpt("foo<mark />bar")).toBe("foobar");
  });

  it("nested <mark><script>x</script></mark> strips inner tags but keeps text", () => {
    // Pipeline: <mark> sentineled → <script> stripped → text x survives →
    // </mark> sentineled → restored. Inner script content is text, not code.
    expect(sanitizeExcerpt("<mark><script>x</script></mark>")).toBe(
      "<mark>x</mark>",
    );
  });

  it("HTML comment <!-- ... --> is treated as a tag and stripped", () => {
    // Cosmetic text corruption is acceptable; the security guarantee is
    // that nothing executable survives.
    const out = sanitizeExcerpt("<!-- <mark>hidden</mark> -->visible");
    expect(out).not.toContain("<!--");
    expect(out).toContain("visible");
  });
});
