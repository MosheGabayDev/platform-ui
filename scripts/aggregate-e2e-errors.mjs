#!/usr/bin/env node
/**
 * Aggregates per-test ErrorCapture JSON files into a single markdown report.
 *
 * Reads:  test-results/error-capture/*.json
 * Writes: planning-artifacts/reviews/<YYYY-MM-DD>-e2e-error-report.md
 *
 * Usage: node scripts/aggregate-e2e-errors.mjs
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const captureDir = join(process.cwd(), "test-results", "error-capture");
const outDir = join(process.cwd(), "planning-artifacts", "reviews");

if (!existsSync(captureDir)) {
  console.log("No error-capture/ dir — nothing to aggregate.");
  process.exit(0);
}

const files = readdirSync(captureDir).filter((f) => f.endsWith(".json"));
if (files.length === 0) {
  console.log("No capture files found.");
  process.exit(0);
}

/** @type {Map<string, {count:number; samples:any[]; tests:Set<string>}>} */
const byMessage = new Map();
const byKind = new Map();
const byRoute = new Map();
let total = 0;

for (const file of files) {
  const test = file.replace(/\.json$/, "");
  const arr = JSON.parse(readFileSync(join(captureDir, file), "utf8"));
  for (const e of arr) {
    total++;
    const key = `${e.kind}::${truncate(e.message, 200)}`;
    if (!byMessage.has(key)) {
      byMessage.set(key, { count: 0, samples: [], tests: new Set() });
    }
    const entry = byMessage.get(key);
    entry.count++;
    entry.tests.add(test);
    if (entry.samples.length < 3) entry.samples.push(e);

    byKind.set(e.kind, (byKind.get(e.kind) ?? 0) + 1);
    byRoute.set(e.route, (byRoute.get(e.route) ?? 0) + 1);
  }
}

const date = new Date().toISOString().slice(0, 10);
const lines = [];
lines.push(`# E2E Browser Error Report — ${date}`);
lines.push("");
lines.push(`Source: \`test-results/error-capture/\` (${files.length} test files)`);
lines.push(`Total errors captured: **${total}**`);
lines.push("");
lines.push("## By kind");
lines.push("");
lines.push("| Kind | Count |");
lines.push("|------|------:|");
for (const [k, v] of [...byKind.entries()].sort((a, b) => b[1] - a[1])) {
  lines.push(`| \`${k}\` | ${v} |`);
}
lines.push("");
lines.push("## By route");
lines.push("");
lines.push("| Route | Errors |");
lines.push("|-------|------:|");
for (const [r, v] of [...byRoute.entries()].sort((a, b) => b[1] - a[1])) {
  lines.push(`| ${r} | ${v} |`);
}
lines.push("");
lines.push("## Top issues (grouped by message)");
lines.push("");

const grouped = [...byMessage.entries()].sort((a, b) => b[1].count - a[1].count);
let idx = 1;
for (const [key, entry] of grouped) {
  const [kind, msg] = key.split("::");
  lines.push(`### ${idx++}. \`${kind}\` × ${entry.count}`);
  lines.push("");
  lines.push("```");
  lines.push(msg);
  lines.push("```");
  lines.push("");
  lines.push(`**Tests affected:** ${[...entry.tests].slice(0, 5).join(", ")}${entry.tests.size > 5 ? ` (+${entry.tests.size - 5} more)` : ""}`);
  lines.push("");
  if (entry.samples[0]?.url) {
    lines.push(`**URL:** \`${entry.samples[0].url}\``);
    if (entry.samples[0].status) lines.push(`**Status:** ${entry.samples[0].status}`);
    lines.push("");
  }
  if (entry.samples[0]?.stack) {
    lines.push("<details><summary>Sample stack</summary>");
    lines.push("");
    lines.push("```");
    lines.push(truncate(entry.samples[0].stack, 1500));
    lines.push("```");
    lines.push("</details>");
    lines.push("");
  }
}

mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, `${date}-e2e-error-report.md`);
writeFileSync(outFile, lines.join("\n"));
console.log(`Wrote ${outFile} (${total} errors across ${grouped.length} groups)`);

function truncate(s, n) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n) + "…" : s;
}
