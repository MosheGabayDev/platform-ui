#!/usr/bin/env node
/**
 * Audit: every dashboard page should have either a vitest page-level
 * test (sibling page.test.tsx) OR an E2E spec that calls
 * `page.goto("<route>")`. Caught batch 42's missing coverage on
 * /users, /roles, /organizations, /data-sources.
 *
 * Usage: `node scripts/audit-test-coverage.mjs`
 *
 * Exits 0 always — informational. Wire into CI as a soft gate when
 * appetite exists.
 */
import fs from "node:fs";
import path from "node:path";

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
for (const w of without) console.log(`  ${w.route}  (${w.page})`);
