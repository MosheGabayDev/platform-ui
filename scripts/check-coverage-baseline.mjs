#!/usr/bin/env node
// Compares current coverage against tests/.coverage-baseline.json.
// Exits 1 if any layer drops more than `policy.regression_tolerance_pp` percentage points below baseline.
//
// Usage (after `npm run test:cov`):
//   node scripts/check-coverage-baseline.mjs
//
// Reads:
//   coverage/coverage-summary.json (produced by vitest v8 reporter)
//   tests/.coverage-baseline.json
//
// ADR-042 — Project-Wide Test Coverage Gate
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const COVERAGE_FILE = "coverage/coverage-summary.json";
const BASELINE_FILE = "tests/.coverage-baseline.json";

if (!existsSync(COVERAGE_FILE)) {
  console.error(`✗ Missing ${COVERAGE_FILE}. Run 'npm run test:cov' first.`);
  process.exit(2);
}
if (!existsSync(BASELINE_FILE)) {
  console.error(`✗ Missing ${BASELINE_FILE}.`);
  process.exit(2);
}

const summary = JSON.parse(readFileSync(COVERAGE_FILE, "utf-8"));
const baseline = JSON.parse(readFileSync(BASELINE_FILE, "utf-8"));
const tolerance = baseline.policy?.regression_tolerance_pp ?? 1;

// Aggregate current coverage per layer prefix
const layers = Object.entries(baseline.layers);
const repoRoot = resolve(".");

function fileMatchesLayer(filePath, layerPrefix) {
  // Convert absolute Windows or POSIX path to repo-relative POSIX
  const norm = filePath.replace(/\\/g, "/");
  const rel = norm.includes(repoRoot.replace(/\\/g, "/"))
    ? norm.slice(repoRoot.replace(/\\/g, "/").length + 1)
    : norm;
  // Layer key may be a directory ("lib/api/") or a single file ("lib/utils.ts")
  if (layerPrefix.endsWith("/")) {
    return rel.startsWith(layerPrefix);
  }
  return rel === layerPrefix;
}

function aggregate(filesData, layerPrefix) {
  let totalLines = 0;
  let coveredLines = 0;
  for (const [filePath, fileData] of Object.entries(filesData)) {
    if (filePath === "total") continue;
    if (!fileMatchesLayer(filePath, layerPrefix)) continue;
    totalLines += fileData.lines.total;
    coveredLines += fileData.lines.covered;
  }
  if (totalLines === 0) return null;
  return Math.round((coveredLines / totalLines) * 10000) / 100; // pct with 2 decimals
}

let failures = 0;
console.log("\nCoverage layer check (vs baseline):");
console.log("-".repeat(70));

for (const [prefix, layerBaseline] of layers) {
  const current = aggregate(summary, prefix);
  const baselinePct = layerBaseline.lines;
  if (current === null) {
    // No files match this layer — skip silently
    continue;
  }
  const drop = baselinePct - current;
  const status = drop > tolerance ? "✗ FAIL" : "✓ OK";
  if (drop > tolerance) failures++;
  console.log(
    `${status.padEnd(8)} ${prefix.padEnd(28)} current=${current.toFixed(2)}%  baseline=${baselinePct}%  drop=${drop.toFixed(2)}pp  (target=${layerBaseline.target_floor}%)`
  );
}

console.log("-".repeat(70));
if (failures > 0) {
  console.error(`\n✗ Coverage gate failed: ${failures} layer(s) regressed by more than ${tolerance}pp.`);
  console.error("To update the baseline (only when intentionally raising), edit tests/.coverage-baseline.json.");
  process.exit(1);
}
console.log(`\n✓ Coverage gate passed.`);
