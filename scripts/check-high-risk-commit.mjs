#!/usr/bin/env node
// Detects commits that touch high-risk files (auth, AI providers, lib/auth, shared-services blacklist,
// or DB migrations) and require a corresponding `commits/<sha>-checklist.md` file in the same commit.
//
// ADR-037 — Single-Trunk Workflow on Master with Compensating Controls.
//
// Modes:
//   - In CI (env GITHUB_BASE_SHA + GITHUB_SHA set): checks the diff between those SHAs.
//   - Locally (no env): checks the most recent commit (HEAD vs HEAD~1).
//
// Exit codes:
//   0 — no high-risk files touched, OR checklist file present
//   1 — high-risk files touched but no checklist file in the commit
//   2 — invocation error
import { execSync } from "node:child_process";

const HIGH_RISK_PATTERNS = [
  // Authentication + AI billing/governance (cross-platform)
  /^apps\/authentication\//,
  /^apps\/ai_providers\//,
  /^lib\/auth\//,
  /^app\/api\/auth\//,
  // App factory + module registry (Flask-side global blast radius)
  /^apps\/__init__\.py$/,
  /^apps\/module_manager\/models\.py$/,
  // DB migrations
  /^scripts\/migrations\//,
  /^migrations\/.*\.py$/,
  /^.*alembic.*\.py$/i,
  // Next.js auth + proxy (frontend cross-cutting)
  /^middleware\.ts$/,
  /^app\/api\/proxy\/\[\.\.\.path\]\/route\.ts$/,
  // Shared services blacklist (per docs/system-upgrade/02-rules/shared-services.md)
  /^lib\/api\/(client|query-keys)\.ts$/,
  /^components\/shared\/(action-button|confirm-action-dialog|permission-gate|feature-gate)\.tsx$/,
  /^lib\/hooks\/(use-platform-mutation|use-permission|use-feature-flag|use-dangerous-action)\.ts$/,
  // Read-only shadcn primitives — modification is anti-pattern
  /^components\/ui\//,
];

function git(cmd) {
  try {
    return execSync(`git ${cmd}`, { encoding: "utf-8" }).trim();
  } catch (e) {
    console.error(`git ${cmd} failed:`, e.message);
    process.exit(2);
  }
}

function changedFiles() {
  const baseSha = process.env.GITHUB_BASE_SHA;
  const headSha = process.env.GITHUB_SHA || "HEAD";

  if (baseSha && baseSha !== "0000000000000000000000000000000000000000") {
    return git(`diff --name-only ${baseSha} ${headSha}`).split("\n").filter(Boolean);
  }
  // Local mode: check HEAD vs HEAD~1
  return git(`diff --name-only HEAD~1 HEAD`).split("\n").filter(Boolean);
}

function isHighRisk(file) {
  return HIGH_RISK_PATTERNS.some((p) => p.test(file));
}

function commitSha() {
  return process.env.GITHUB_SHA || git("rev-parse HEAD");
}

function checklistFilePresent(files, sha) {
  const expected = `commits/${sha.slice(0, 7)}-checklist.md`;
  const expectedFull = `commits/${sha}-checklist.md`;
  return files.some((f) => f === expected || f === expectedFull || f.match(/^commits\/.*-checklist\.md$/));
}

const files = changedFiles();
const highRiskHits = files.filter(isHighRisk);

if (highRiskHits.length === 0) {
  console.log("✓ No high-risk files touched.");
  process.exit(0);
}

console.log(`⚠  Commit touches ${highRiskHits.length} high-risk file(s):`);
highRiskHits.forEach((f) => console.log(`   - ${f}`));

const sha = commitSha();
if (checklistFilePresent(files, sha)) {
  console.log(`✓ Checklist file present.`);
  process.exit(0);
}

console.error(`\n✗ High-risk commit detected without a checklist file.`);
console.error(`  Required: commits/${sha.slice(0, 7)}-checklist.md`);
console.error(`  Per ADR-037, every high-risk commit MUST include a checklist confirming:`);
console.error(`    - tests run`);
console.error(`    - security review self-checklist passed`);
console.error(`    - rollback plan exists`);
process.exit(1);
