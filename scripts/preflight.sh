#!/usr/bin/env bash
# Preflight: single command for the full local quality gate.
#
# Runs (in order):
#   1. typecheck (tsc --noEmit)
#   2. eslint — errors only (warnings are tolerated; see PRODUCT_LAUNCH_PLAN.md
#      batch 33 for the audit that downgraded set-state-in-effect to warn).
#      Codebase is 0-errors as of batch 33; this step prevents regression.
#   3. vitest unit + component
#   4. coverage baseline gate (ADR-042 floors)
#   5. i18n debt gate — fails if any dashboard page has 5+ hardcoded English
#      strings. Locks in the 0/0 state achieved in batch 52 (see batches 44-52).
#   6. test coverage gate — fails if a NEW page lacks both unit and E2E
#      coverage, or if the allowlist is stale (batch 55).
#   7. next build — catches latent prerender bugs (e.g. missing
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

step "1/7 typecheck"
npx tsc --noEmit || fail "typecheck failed"
ok "typecheck clean"

step "2/7 eslint (errors only)"
npx eslint . --quiet || fail "eslint reported errors"
ok "eslint clean (0 errors)"

step "3/7 vitest"
npx vitest run --reporter=dot || fail "vitest failed"
ok "vitest green"

step "4/7 coverage gate"
node scripts/check-coverage-baseline.mjs || fail "coverage gate failed"
ok "coverage gate passed"

step "5/7 i18n debt gate"
node scripts/audit-i18n-debt.mjs --gate || fail "i18n debt gate failed"
ok "i18n debt gate clean (0 flagged pages)"

step "6/7 test coverage gate"
node scripts/audit-test-coverage.mjs --gate || fail "test coverage gate failed"
ok "test coverage gate clean (no new untested pages)"

step "7/7 next build"
npx next build > /tmp/preflight-build.log 2>&1 || {
  printf "\n\033[1;31m── next build output (tail) ──\033[0m\n"
  tail -30 /tmp/preflight-build.log
  fail "next build failed (full log: /tmp/preflight-build.log)"
}
ok "next build succeeded — all pages prerender"

printf "\n\033[1;32m✓ preflight passed — safe to push\033[0m\n"
