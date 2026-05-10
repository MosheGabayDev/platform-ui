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

  it("rule #10 — no LLM provider SDK imports anywhere in the frontend", () => {
    // All LLM calls go through the backend AIProviderGateway. Frontend
    // composes prompts + previews but never holds API keys or talks to
    // a provider directly. If we ever need a streaming token surface
    // here, it goes through `/api/proxy/ai-providers/...`, never the
    // vendor SDK.
    const BANNED_PACKAGES = [
      "openai",
      "@anthropic-ai/sdk",
      "@aws-sdk/client-bedrock-runtime",
      "@aws-sdk/client-bedrock",
      "@google/generative-ai",
      "ollama",
      "cohere-ai",
      "groq-sdk",
      "@mistralai/mistralai",
      "replicate",
    ];
    const broken: string[] = [];
    for (const file of SOURCES) {
      const src = fs.readFileSync(file, "utf8");
      for (const pkg of BANNED_PACKAGES) {
        // Match `from "<pkg>"`, `from "<pkg>/..."`, and dynamic
        // `import("<pkg>")`. Quote variants ' " ` covered.
        const re = new RegExp(
          String.raw`(?:from|import)\s*\(?\s*["'\`]${pkg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:/[^"'\`]*)?["'\`]`,
        );
        if (re.test(src)) {
          broken.push(`${file}: ${pkg}`);
          break;
        }
      }
    }
    expect(broken).toEqual([]);

    // Belt + suspenders: package.json must not list any of these as
    // a dependency or devDependency either. Catches the moment they
    // get added before any import lands.
    const pkgJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
    const allDeps = {
      ...(pkgJson.dependencies ?? {}),
      ...(pkgJson.devDependencies ?? {}),
    };
    const presentBanned = BANNED_PACKAGES.filter((p) => p in allDeps);
    expect(presentBanned).toEqual([]);
  });

  it("rule #5 — every dashboard page uses PageShell or DetailHeaderCard", () => {
    // ADR-028 #5: layout chrome belongs in shared primitives. Pages
    // own content + data; the title/back-button/glass-card frame is
    // delegated. Detail pages use DetailHeaderCard via the
    // DetailView primitive set; list / hub pages use PageShell.
    function walk(dir: string, out: string[] = []): string[] {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, out);
        else if (e.name === "page.tsx") out.push(p);
      }
      return out;
    }
    const pages = walk("app/(dashboard)");
    // Allowlist:
    //   - catch-all [...slug] is the not-found stub.
    //   - dashboard root (app/(dashboard)/page.tsx) is a custom hero
    //     layout (KpiCards + service-health rail + activity feed) that
    //     by design doesn't use the title-frame primitive.
    const ALLOW_BARE = (file: string) => {
      const norm = file.replace(/\\/g, "/");
      return (
        norm.includes("[...") ||
        norm.endsWith("app/(dashboard)/page.tsx")
      );
    };

    const broken: string[] = [];
    for (const file of pages) {
      if (ALLOW_BARE(file)) continue;
      const src = fs.readFileSync(file, "utf8");
      const usesShell = /\bPageShell\b/.test(src);
      const usesDetail = /\bDetailHeaderCard\b/.test(src);
      if (!usesShell && !usesDetail) broken.push(file);
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
