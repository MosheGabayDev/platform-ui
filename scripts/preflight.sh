#!/usr/bin/env bash
# Preflight: single command for the full local quality gate.
#
# Runs (in order):
#   1. typecheck (tsc --noEmit)
#   2. vitest unit + component
#   3. coverage baseline gate (ADR-042 floors)
#   4. next build — catches latent prerender bugs (e.g. missing
#      Suspense around useSearchParams) that don't surface in dev.
#      See batch 27 in PRODUCT_LAUNCH_PLAN.md for the bug class this
#      step is meant to prevent.
#
# Designed for the pre-PR / pre-push moment. Playwright E2E is run
# separately by CI — keep this fast (<3min on a warm cache).
#
# Spec: docs/system-upgrade/PRODUCT_LAUNCH_PLAN.md §preflight.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT}"

step() { printf "\n\033[1;36m▶ %s\033[0m\n" "$*"; }
ok()   { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
fail() { printf "\033[1;31m✗ %s\033[0m\n" "$*"; exit 1; }

step "1/4 typecheck"
npx tsc --noEmit || fail "typecheck failed"
ok "typecheck clean"

step "2/4 vitest"
npx vitest run --reporter=dot || fail "vitest failed"
ok "vitest green"

step "3/4 coverage gate"
node scripts/check-coverage-baseline.mjs || fail "coverage gate failed"
ok "coverage gate passed"

step "4/4 next build"
npx next build > /tmp/preflight-build.log 2>&1 || {
  printf "\n\033[1;31m── next build output (tail) ──\033[0m\n"
  tail -30 /tmp/preflight-build.log
  fail "next build failed (full log: /tmp/preflight-build.log)"
}
ok "next build succeeded — all pages prerender"

printf "\n\033[1;32m✓ preflight passed — safe to push\033[0m\n"
