/**
 * ADR-028 enforcement invariants.
 *
 * Spec: docs/system-upgrade/43-shared-services-enforcement.md
 *
 * Each `it` here corresponds to one of the 10 hard rules in
 * CLAUDE.md §"Shared Capabilities Enforcement". Goal: catch the
 * regression at unit-test time rather than during code review.
 *
 * Batch 63 — opened with rule #6 (no window.confirm/alert/prompt).
 * Add new rules here as gates land.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

function walkSources(root: string): string[] {
  const out: string[] = [];
  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".next") continue;
        walk(p);
      } else if (
        /\.(tsx?|jsx?)$/.test(entry.name) &&
        !/\.test\.(tsx?|jsx?)$/.test(entry.name)
      ) {
        out.push(p);
      }
    }
  }
  walk(root);
  return out;
}

const SOURCES = [
  ...walkSources("app"),
  ...walkSources("components"),
  ...walkSources("lib"),
];

describe("ADR-028 enforcement invariants", () => {
  it("rule #6 — no window.confirm / window.alert / window.prompt", () => {
    // Browser-modal callouts block the event loop, can't be styled, can't
    // be translated, and bypass our shadcn Dialog accessibility wiring.
    // ConfirmActionDialog + ConfirmDialog cover both destructive and
    // soft-confirm flows.
    const re = /\bwindow\.(confirm|alert|prompt)\s*\(/;
    const broken: string[] = [];
    for (const file of SOURCES) {
      let src = fs.readFileSync(file, "utf8");
      // Strip block + line comments to avoid hits on ADR-028 reference docs.
      src = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      if (re.test(src)) broken.push(file);
    }
    expect(broken).toEqual([]);
  });

  it("rule #7 — no raw fetch() in components/ or in app/(...) page/component code", () => {
    // All API calls must go through lib/api/<module>.ts. Allowed
    // locations:
    //   - lib/api/**            (the clients themselves)
    //   - lib/auth/options.ts   (NextAuth server callbacks → Flask auth)
    //   - app/api/**            (route handlers + proxy)
    // Anywhere else means a UI file is reaching for the network directly,
    // bypassing the typed clients + queryKeys + cache invariants.
    const ALLOW_PATH_RE = [
      /(?:^|\/)lib\/api\//,
      /(?:^|\/)lib\/auth\/options\.ts$/,
      /(?:^|\/)app\/api\//,
    ];
    const broken: string[] = [];
    for (const file of SOURCES) {
      const norm = file.replace(/\\/g, "/");
      if (ALLOW_PATH_RE.some((re) => re.test(norm))) continue;
      let src = fs.readFileSync(file, "utf8");
      src = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      src = src
        .replace(/"(?:[^"\\]|\\.)*"/g, '""')
        .replace(/'(?:[^'\\]|\\.)*'/g, "''")
        .replace(/`(?:[^`\\]|\\.)*`/g, "``");
      // Match `fetch(` at word boundary, not preceded by `.` (e.g. queryClient.fetch)
      // or by other identifier chars (e.g. prefetch, refetch).
      const re = /(?<![.\w])fetch\s*\(/;
      if (re.test(src)) broken.push(file);
    }
    expect(broken).toEqual([]);
  });

  it("rule #6 — no bare confirm() / alert() / prompt() calls either", () => {
    // The bare globals (without `window.`) are equally banned. Match
    // requires word-boundary + open paren; skip lines where the word
    // is preceded by `.` (method call) or `_` (identifier), and skip
    // string literals via the same comment-strip approach.
    const re = /(?<![.\w])(confirm|alert|prompt)\s*\(/;
    const broken: string[] = [];
    for (const file of SOURCES) {
      let src = fs.readFileSync(file, "utf8");
      // Strip block comments and line comments.
      src = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      // Strip string literals (single, double, backtick) so identifiers
      // inside strings don't match.
      src = src
        .replace(/"(?:[^"\\]|\\.)*"/g, '""')
        .replace(/'(?:[^'\\]|\\.)*'/g, "''")
        .replace(/`(?:[^`\\]|\\.)*`/g, "``");
      if (re.test(src)) broken.push(file);
    }
    expect(broken).toEqual([]);
  });
});
