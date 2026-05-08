#!/usr/bin/env node
/**
 * Run `next build` with bundle-analyzer enabled.
 *
 * Cross-platform replacement for `cross-env ANALYZE=true next build` —
 * keeps dev-deps lean. Output: `.next/analyze/*.html` (server + edge +
 * client bundles). Open the HTML files manually.
 *
 * Usage: `npm run analyze`
 */
import { spawnSync } from "node:child_process";

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["next", "build"],
  {
    stdio: "inherit",
    env: { ...process.env, ANALYZE: "true" },
  },
);

process.exit(result.status ?? 1);
