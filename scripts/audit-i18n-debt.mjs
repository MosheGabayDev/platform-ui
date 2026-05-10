#!/usr/bin/env node
/**
 * Audit: pages with hardcoded English UI strings (i18n debt).
 *
 * Heuristic regex looks for capitalized 2+ word strings inside JSX
 * text nodes, common attribute values, and column headers — matches
 * what `useTranslations(...)` would normally feed.
 *
 * Used by batches 44+ to chip at the helpdesk + admin i18n debt
 * one page at a time. Re-run after each cleanup batch to confirm
 * the page dropped off and to surface the next biggest offender.
 *
 * Usage: `node scripts/audit-i18n-debt.mjs`
 *
 * Exits 0 — informational only.
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
const results = [];

for (const file of pages) {
  const src = fs.readFileSync(file, "utf8");
  const matches = [];
  // JSX text nodes: >Word Word<
  for (const m of src.matchAll(/>([A-Z][a-z]+(?:\s+[a-zA-Z]+){1,5})</g)) matches.push(m[1]);
  // Common string attributes on data objects / column descriptors
  for (const m of src.matchAll(
    /(?:label|title|placeholder|description):\s*"([A-Z][a-z]+(?:\s+[a-zA-Z]+){1,5})"/g,
  )) matches.push(m[1]);
  // Column headers
  for (const m of src.matchAll(/header:\s*"([A-Z][a-z]+(?:\s+[a-zA-Z]+)*)"/g))
    matches.push(m[1]);
  if (matches.length >= 5) results.push({ file, count: matches.length });
}

results.sort((a, b) => b.count - a.count);
console.log("Pages with 5+ hardcoded English strings (heuristic):");
for (const r of results) {
  console.log(`  ${String(r.count).padStart(3)} — ${r.file}`);
}
console.log();
console.log(`Total flagged pages: ${results.length}`);
console.log(
  `Total flagged strings: ${results.reduce((sum, r) => sum + r.count, 0)}`,
);
