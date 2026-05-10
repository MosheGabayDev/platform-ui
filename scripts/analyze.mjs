#!/usr/bin/env node
/**
 * Run the bundle analyzer.
 *
 * Next 16 ships with Turbopack as the default build engine. The
 * `@next/bundle-analyzer` plugin is webpack-only and emits:
 *
 *   "The Next Bundle Analyzer is not compatible with Turbopack builds"
 *
 * The native replacement is `next experimental-analyze`, which uses
 * Turbopack's own profiler. We invoke that instead. The legacy webpack
 * plugin remains wired in `next.config.ts` for the `--webpack` escape
 * hatch (run `next build --webpack` if you need the old report shape).
 *
 * Usage: `npm run analyze`
 *
 * Output: see stdout — Turbopack writes a profile that you open in the
 * Chrome DevTools tracing viewer (chrome://tracing).
 */
import { spawnSync } from "node:child_process";

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["next", "experimental-analyze"],
  {
    stdio: "inherit",
    env: { ...process.env, ANALYZE: "true" },
  },
);

process.exit(result.status ?? 1);
