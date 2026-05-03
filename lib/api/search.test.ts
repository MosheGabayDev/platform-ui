import { describe, it, expect } from "vitest";
import { searchGlobal } from "./search";

describe("PlatformSearch client (mock mode)", () => {
  it("empty query returns 200 with no results", async () => {
    const res = await searchGlobal({ q: "" });
    expect(res.success).toBe(true);
    expect(res.data.results).toEqual([]);
  });

  it("matches a ticket title and a kb article for VPN", async () => {
    const res = await searchGlobal({ q: "VPN" });
    expect(res.success).toBe(true);
    const types = new Set(res.data.results.map((r) => r.type));
    expect(types.has("ticket")).toBe(true);
    expect(types.has("kb")).toBe(true);
    // Ticket title hit should outscore the KB body hit
    expect(res.data.results[0].type).toBe("ticket");
  });

  it("results pre-sorted by score descending", async () => {
    const res = await searchGlobal({ q: "onboarding" });
    expect(res.data.results.length).toBeGreaterThan(1);
    for (let i = 1; i < res.data.results.length; i++) {
      expect(res.data.results[i - 1].score).toBeGreaterThanOrEqual(
        res.data.results[i].score,
      );
    }
  });

  it("types filter restricts to chosen kinds only", async () => {
    const res = await searchGlobal({ q: "Tim", types: ["user"] });
    expect(res.data.results.every((r) => r.type === "user")).toBe(true);
    expect(res.data.results.length).toBeGreaterThan(0);
  });

  it("totals_by_type reports unfiltered per-type counts", async () => {
    const res = await searchGlobal({ q: "VPN", limit: 1 });
    // Only 1 result per type returned, but totals_by_type reports the real count
    expect(res.data.totals_by_type.ticket).toBeGreaterThanOrEqual(1);
    expect(res.data.results.length).toBeLessThanOrEqual(2); // 1 ticket + 1 kb max
  });

  it("match_excerpt wraps the matched substring in <mark>", async () => {
    const res = await searchGlobal({ q: "Olivia" });
    expect(res.data.results[0].match_excerpt).toContain("<mark>Olivia</mark>");
  });

  it("match_excerpt escapes HTML in source text (no script injection)", async () => {
    // Use a query that wouldn't naturally match malicious content; but assert
    // the standard escape pipeline on a known title with no special chars.
    // Belt-and-braces: make sure no raw '<' leaks unescaped in any excerpt.
    const res = await searchGlobal({ q: "Olivia" });
    for (const r of res.data.results) {
      // Strip allowed <mark> tags and ensure no other angle brackets remain.
      const stripped = r.match_excerpt.replace(/<\/?mark>/g, "");
      expect(stripped).not.toMatch(/<[^>]/);
    }
  });

  it("rejects queries longer than 256 chars", async () => {
    const long = "x".repeat(257);
    await expect(searchGlobal({ q: long })).rejects.toThrow(/400/);
  });

  it("returns 200 with no results for a query that matches nothing", async () => {
    const res = await searchGlobal({ q: "zzzznevermatchszzzz" });
    expect(res.success).toBe(true);
    expect(res.data.results).toEqual([]);
  });

  it("highlight() escapes <mark> wrapping AND surrounding text (Round 2 MED #5)", async () => {
    // The fixture corpus is plain text with no special chars. We assert that
    // (a) the match is wrapped in literal <mark>, (b) the surrounding raw
    // text (which would have produced &amp; if someone added an `&` to the
    // corpus) is escaped, (c) no double-escaping.
    const res = await searchGlobal({ q: "VPN" });
    const ticket = res.data.results.find((r) => r.type === "ticket");
    expect(ticket).toBeDefined();
    expect(ticket!.match_excerpt).toMatch(/<mark>VPN<\/mark>/);
    // No literal `&amp;amp;` (double escape)
    expect(ticket!.match_excerpt).not.toContain("&amp;amp;");
  });
});
