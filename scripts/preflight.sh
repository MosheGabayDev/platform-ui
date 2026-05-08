#!/usr/bin/env bash
# Preflight: single command for the full local quality gate.
#
# Runs (in order):
#   1. typecheck (tsc --noEmit)
#   2. vitest unit + component
#   3. coverage baseline gate (ADR-042 floors)
#
# Designed for the pre-PR / pre-push moment. Playwright E2E is run
# separately by CI — keep this fast (<2min on a warm cache).
#
# Spec: docs/system-upgrade/PRODUCT_LAUNCH_PLAN.md §preflight.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT}"

step() { printf "\n\033[1;36m▶ %s\033[0m\n" "$*"; }
ok()   { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
fail() { printf "\033[1;31m✗ %s\033[0m\n" "$*"; exit 1; }

step "1/3 typecheck"
npx tsc --noEmit || fail "typecheck failed"
ok "typecheck clean"

step "2/3 vitest"
npx vitest run --reporter=dot || fail "vitest failed"
ok "vitest green"

step "3/3 coverage gate"
node scripts/check-coverage-baseline.mjs || fail "coverage gate failed"
ok "coverage gate passed"

printf "\n\033[1;32m✓ preflight passed — safe to push\033[0m\n"
