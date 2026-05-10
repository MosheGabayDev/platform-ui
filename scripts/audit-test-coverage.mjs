#!/usr/bin/env node
/**
 * Audit: every dashboard page should have either a vitest page-level
 * test (sibling page.test.tsx) OR an E2E spec that calls
 * `page.goto("<route>")`. Caught batch 42's missing coverage on
 * /users, /roles, /organizations, /data-sources.
 *
 * Usage:
 *   `node scripts/audit-test-coverage.mjs`         — informational
 *   `node scripts/audit-test-coverage.mjs --gate`  — exit 1 if a NEW
 *      page is missing tests (allowlist below freezes the known set
 *      from batch 55; shrink the allowlist as those are covered).
 *
 * Batch 55 wired the `--gate` form into preflight + CI to prevent
 * regressions while leaving the existing 8-page debt as a known
 * backlog item.
 */
import fs from "node:fs";
import path from "node:path";

// Known-uncovered pages frozen at batch 55 (2026-05-10). Each row is
// a route returned by this audit. To shrink: add a unit page.test.tsx
// or an E2E spec that goto's the route, then drop the entry from this
// list. Adding new pages here without justification fails the spirit
// of the gate — prefer adding the test.
const ALLOWLIST = new Set([
  "/helpdesk/tickets/*",
  "/organizations/*",
  "/roles/*",
  "/users/*",
  "/whatsapp",
  "/whatsapp/chats/*",
  "/whatsapp/search",
  "/*", // catch-all [...slug] page — by design has no fixed route to E2E against
]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name).split(path.sep).join("/");
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name === "page.tsx") out.push(p);
  }
  return out;
}

const pages = walk("app/(dashboard)");

function readSpecs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".spec.ts"))
    .map((f) => fs.readFileSync(path.join(dir, f), "utf8"));
}

const e2eContents = [
  ...readSpecs("tests/e2e/smoke"),
  ...readSpecs("tests/e2e/helpdesk"),
  ...readSpecs("tests/e2e/security"),
  ...readSpecs("tests/e2e/ai-shell"),
].join("\n");

const without = [];
for (const page of pages) {
  const testPath = page.replace(/page\.tsx$/, "page.test.tsx");
  const hasUnit = fs.existsSync(testPath);
  const route = page
    .replace("app/(dashboard)", "")
    .replace(/\/page\.tsx$/, "")
    .replace(/\/\[\.\.\.[^\]]+\]/g, "/*")
    .replace(/\/\[[^\]]+\]/g, "/*");
  const routeForE2e = route === "" ? "/" : route;
  const hasE2e =
    e2eContents.includes(`page.goto("${routeForE2e}")`) ||
    e2eContents.includes(`page.goto('${routeForE2e}')`) ||
    e2eContents.includes(`page.goto(\`${routeForE2e}`);
  if (!hasUnit && !hasE2e) without.push({ route: routeForE2e, page });
}

console.log(`Total dashboard pages: ${pages.length}`);
console.log(`Pages WITHOUT either unit OR E2E test: ${without.length}`);
for (const w of without) {
  const known = ALLOWLIST.has(w.route) ? " (allowlisted)" : " ← NEW";
  console.log(`  ${w.route}${known}  (${w.page})`);
}

if (process.argv.includes("--gate")) {
  const newDrift = without.filter((w) => !ALLOWLIST.has(w.route));
  // Surface stale allowlist entries — pages that have since been covered
  // or removed. Keep the list honest.
  const currentRoutes = new Set(without.map((w) => w.route));
  const stale = [...ALLOWLIST].filter((r) => !currentRoutes.has(r));

  if (newDrift.length > 0) {
    console.error(
      `\n✗ test coverage gate: ${newDrift.length} new page(s) missing both unit and E2E coverage.`,
    );
    console.error(
      "  Add a sibling page.test.tsx OR an E2E spec that goto's the route.",
    );
    process.exit(1);
  }
  if (stale.length > 0) {
    console.error(
      `\n✗ test coverage gate: allowlist has ${stale.length} stale entr(ies):`,
    );
    for (const r of stale) console.error(`    ${r}`);
    console.error(
      "  Remove them from ALLOWLIST in scripts/audit-test-coverage.mjs.",
    );
    process.exit(1);
  }
  console.log("\n✓ test coverage gate clean (allowlist matches current state).");
}
