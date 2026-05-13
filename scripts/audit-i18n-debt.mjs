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
 * Usage:
 *   `node scripts/audit-i18n-debt.mjs`         — informational
 *   `node scripts/audit-i18n-debt.mjs --gate`  — exit 1 if any drift found
 *
 * Batch 53 wired the `--gate` form into preflight to lock in the
 * 0/0 state achieved in batch 52.
 */
import fs from "node:fs";
import path from "node:path";

function walkPages(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name).split(path.sep).join("/");
    if (entry.isDirectory()) walkPages(p, out);
    else if (entry.name === "page.tsx") out.push(p);
  }
  return out;
}

// Module-level components (consumer surfaces, not shadcn primitives or
// shell chrome). Batch 92 added this dimension after AuditCategoryBadge
// shipped with inlined English labels that the page-only walker missed.
function walkComponents(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name).split(path.sep).join("/");
    if (entry.isDirectory()) walkComponents(p, out);
    else if (
      entry.name.endsWith(".tsx") &&
      !entry.name.endsWith(".test.tsx")
    ) {
      out.push(p);
    }
  }
  return out;
}

const pages = [
  ...walkPages("app/(dashboard)"),
  ...walkComponents("components/modules"),
  // Batch 124: components/shell/ swept clean in batches 118-120 (sidebar
  // brand, ai-assistant chrome). Lock that in so future inline strings
  // in shell chrome (topbar, drawer, command palette, etc.) fail the gate.
  ...walkComponents("components/shell"),
];
const results = [];
// Batch 107: even a single inline `label: "X"` in a discriminated-union
// meta record is the canonical drift pattern this arc has been chasing.
// Surface those as separate "meta-record" hits at a lower threshold (1).
const metaHits = [];

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

  // Meta-record single-word labels: matches inside a `Record<...>` block
  // typed at the top of a file. Even one is a problem — examples that
  // slipped past the 2+ words heuristic: "Low"/"High"/"OK"/"Cached" etc.
  const metaBlockRe = /Record<[A-Za-z][\w.]*,[\s\S]*?>\s*=\s*\{([\s\S]*?)^\};?/gm;
  for (const block of src.matchAll(metaBlockRe)) {
    const body = block[1] ?? "";
    const labels = [...body.matchAll(/\blabel:\s*"([A-Z][a-zA-Z][^"]*)"/g)].map(
      (m) => m[1],
    );
    if (labels.length > 0) metaHits.push({ file, labels });
  }
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

if (metaHits.length > 0) {
  console.log();
  console.log("Record<...> blocks with inline `label: \"X\"` fields:");
  for (const h of metaHits)
    console.log(`  ${h.file} → ${h.labels.join(", ")}`);
}

if (
  process.argv.includes("--gate") &&
  (results.length > 0 || metaHits.length > 0)
) {
  console.error(
    "\n✗ i18n debt gate: hardcoded English strings detected on the surfaces above.",
  );
  console.error(
    "  Move them to i18n/messages/{he,en}.json and use useTranslations().",
  );
  process.exit(1);
}
