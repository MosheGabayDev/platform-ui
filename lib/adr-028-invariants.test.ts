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

  it("rule #1 — no raw <table> JSX outside DataTable / shadcn primitives", () => {
    // ADR-028 #1: list + columns + rows = DataTable<T>. Hand-rolled
    // <table> shells skip the bulk-select / sort / pagination / a11y
    // wiring DataTable provides. Static legal-page content tables and
    // the shadcn primitive itself are exempt.
    const ALLOW_PATH_RE = [
      /(?:^|\/)components\/ui\/table\.tsx$/,
      /(?:^|\/)components\/shared\/data-table\//,
      /(?:^|\/)app\/legal\//,
    ];
    // Known-debt list-style consumers that still hand-roll <table>.
    // Migration tracked separately; allowlist surfaces the debt and
    // prevents new instances from sneaking in. Stale-detection branch
    // below keeps the list honest.
    // Batch 68 migrated ip-allowlist; batch 69 migrated billing.
    // List is now empty — every list-row UI uses DataTable<T>.
    const ALLOW_DEBT = new Set<string>([]);

    const broken: string[] = [];
    const seen = new Set<string>();
    for (const file of SOURCES) {
      const norm = file.replace(/\\/g, "/");
      if (ALLOW_PATH_RE.some((re) => re.test(norm))) continue;
      let src = fs.readFileSync(file, "utf8");
      src = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      // Match `<table` (JSX open tag), not <Table> (the shadcn primitive,
      // capital T).
      if (/<table\b/.test(src)) {
        seen.add(norm);
        if (!ALLOW_DEBT.has(norm)) broken.push(norm);
      }
    }
    expect(broken).toEqual([]);
    // Stale-detection: if a debt entry no longer hand-rolls <table>
    // (good — got migrated, or file deleted), shrink the allowlist.
    const stale = [...ALLOW_DEBT].filter((p) => !seen.has(p));
    expect(stale).toEqual([]);
  });

  it("rule #3 — no raw useMutation outside the usePlatformMutation wrapper", () => {
    // ADR-028 #3: every mutation goes through usePlatformMutation so
    // we get consistent error normalization (`serverError`), cache
    // invalidation (`invalidateKeys`), and pending/reset semantics.
    // Raw `useMutation(...)` skips that contract — error toasts diverge,
    // invalidation gets forgotten, etc.
    const ALLOW_PATH_RE = [
      /(?:^|\/)lib\/hooks\/use-platform-mutation\.ts$/,
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
      // Match `useMutation(` at word boundary, not preceded by `.` or
      // any identifier char (skips `usePlatformMutation`).
      const re = /(?<![.\w])useMutation\s*\(/;
      if (re.test(src)) broken.push(norm);
    }
    expect(broken).toEqual([]);
  });

  it("rule #4 — no inline session-role string equality (use hasRole / PermissionGate)", () => {
    // ADR-028 #4: RBAC checks go through `hasRole(session, ...)`,
    // `<PermissionGate>`, or `usePermission()`. Inline string equality
    // like `session?.user?.role === "system_admin"` (a) misses the
    // role-priority hierarchy our helpers encode and (b) drifts when
    // a new role is added — ten files quietly miss the new role.
    //
    // Forbidden patterns:
    //   session.user.role === "..."
    //   session?.user?.role === "..."
    //   session?.user.role === "..."
    // The `message.role === "user"` chat case (assistant messages) and
    // the `u.role === "manager"` mock-fixture transforms are not
    // session-scoped, so this regex doesn't touch them.
    // Match any `<expr>.user?.role === "..."` — covers session.user.role,
    // session?.user?.role, data?.user?.role, etc. The chat case
    // `message.role` and mock case `u.role` lack the `.user.` segment
    // so they don't match.
    const re = /\.user\??\.role\s*===\s*["']/;
    const broken: string[] = [];
    for (const file of SOURCES) {
      let src = fs.readFileSync(file, "utf8");
      src = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      if (re.test(src)) broken.push(file.replace(/\\/g, "/"));
    }
    expect(broken).toEqual([]);
  });

  it("rule #9 — no org_id in form schemas (lib/modules/*/schemas.ts)", () => {
    // ADR-028 #9: org_id is a server-side concern. The backend resolves
    // it from the JWT/session — never from a form field or request body.
    // Forms that include an org_id field create a privilege-escalation
    // path where a malicious client claims a different org's id.
    //
    // Schemas under lib/modules/<m>/schemas.ts are the write contracts
    // (CreateXxxInput, EditXxxInput, signup payload, etc.). They must
    // not declare an `org_id` field of any kind.
    const schemaFiles = SOURCES.filter((f) =>
      /(?:^|\/)lib\/modules\/[^/]+\/schemas\.ts$/.test(
        f.replace(/\\/g, "/"),
      ),
    );
    expect(schemaFiles.length).toBeGreaterThan(0);
    const broken: string[] = [];
    for (const file of schemaFiles) {
      let src = fs.readFileSync(file, "utf8");
      src = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      // Match `org_id` as a property name (key followed by `:`) — skips
      // string-literal references in comments / docs.
      if (/\borg_id\s*:/.test(src)) broken.push(file.replace(/\\/g, "/"));
    }
    expect(broken).toEqual([]);
  });

  it("rule #9 — no org_id in mutation request bodies (lib/api/*.ts)", () => {
    // Same rule, write-side companion. Mutation clients in lib/api/*.ts
    // build request bodies via `JSON.stringify({ ... })`. The body must
    // not include an `org_id` key — backend resolves it from session.
    //
    // We accept `org_id` references in mock fixtures (read-side display)
    // because those simulate what the backend WOULD return. The rule
    // targets write-payload object literals.
    const apiFiles = SOURCES.filter((f) =>
      /(?:^|\/)lib\/api\/[^/]+\.ts$/.test(f.replace(/\\/g, "/")),
    );
    const broken: string[] = [];
    for (const file of apiFiles) {
      let src = fs.readFileSync(file, "utf8");
      src = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      // Match `body: JSON.stringify({ ... org_id ... })` — capture the
      // stringify arg up to the first matching `})` and check for org_id.
      const re = /body\s*:\s*JSON\.stringify\(([\s\S]*?)\)/g;
      for (const m of src.matchAll(re)) {
        if (/\borg_id\b/.test(m[1] ?? "")) {
          broken.push(file.replace(/\\/g, "/"));
          break;
        }
      }
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
