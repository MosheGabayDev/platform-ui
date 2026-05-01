# R-OPS-01 — Compensating Controls + Coverage Gate

**Phase:** P1 (precursor — must complete before any -min round)
**Track:** both (platform-ui + platformengineer infra)
**Status:** ⬜ ready
**Depends on:** R041F ✅ (Playwright foundation)
**Estimate:** ~3 hours
**ADR refs:** ADR-037 (compensating controls), ADR-042 (coverage gate)

## Scope
Stand up the safety nets that ADR-037 and ADR-042 require BEFORE the high-risk P1 backend rounds touch auth, billing, multi-tenant code, or migrations.

- **High-risk file allowlist** — pre-commit hook + CI check that detects commits touching `apps/authentication/`, `apps/ai_providers/`, `lib/auth/`, files in `02-rules/shared-services.md` blacklist, OR any DB migration. Such commits MUST include `commits/<sha>-checklist.md`.
- **Pre-commit hook** runs `npm run typecheck` + `npm run lint` + smoke E2E subset. Opt-out via `--no-verify` (emergency only).
- **Daily smoke check** — GitHub Actions schedule (cron) runs full E2E against TEST environment every morning.
- **Vitest unit test setup** + `c8` coverage tooling.
- **Coverage baseline file** at `tests/.coverage-baseline.json` checked in.
- **CI coverage gate** that fails if any layer drops >1pp below baseline.
- **Per-task DoD update** — `_template/tasks/T01-example.md` Evidence section: replace "paste counts" with "Tests-CI: <github-actions-run-url>".

## Out of scope
- Quarterly rollback drill (procedure doc only — actual drill happens within 30 days separately).
- Post-mortem template (created when first revert happens — YAGNI).
- Backend `pytest --cov` setup (already exists per ADR-042 §Tooling — verify only).

## Why now
ADR-037 + ADR-042 are accepted but unenforced. Until enforcement is live, every commit to high-risk files is a single-trunk solo write with zero compensating control. P1 backend work cannot safely begin without these in place.

## Decomposition rationale
Tooling-first (Vitest + coverage), then policy enforcement (pre-commit + CI gates), then automation (daily smoke). Each task independent.

## Tasks
- [ ] T01 — Install Vitest + c8 + write smoke unit test for `lib/utils.ts cn()`
- [ ] T02 — Generate initial coverage baseline + check `tests/.coverage-baseline.json` into repo
- [ ] T03 — GitHub Actions: add `coverage-gate` job to existing CI (fail if layer drops >1pp)
- [ ] T04 — Pre-commit hook (Husky or simple `.git/hooks/pre-commit`) — typecheck + lint + smoke E2E
- [ ] T05 — High-risk allowlist detector script: `scripts/check-high-risk-commit.sh` + CI step
- [ ] T06 — Daily smoke GitHub Actions cron workflow (`.github/workflows/daily-smoke.yml`)
- [ ] T07 — Update `10-tasks/_template/tasks/T01-example.md` Evidence section per ADR-042
- [ ] T08 — Update `master-roadmap §10` DoD wording to reference Tests-CI URL

## Acceptance Criteria
- [ ] `npm run test` runs Vitest, exits 0
- [ ] `tests/.coverage-baseline.json` checked in with current per-layer numbers
- [ ] CI pipeline includes `coverage-gate` step that visibly passes/fails
- [ ] Pre-commit hook actually triggers on `git commit` and blocks on failure
- [ ] High-risk commit without checklist → CI fails with clear message
- [ ] Daily smoke cron runs and reports to a designated channel (or email)
- [ ] Template + roadmap DoD updated

## Definition of Done
- [ ] AC met
- [ ] One demo high-risk commit (e.g. touching `lib/auth/options.ts` with a no-op comment + checklist) shows the system working end-to-end
- [ ] `09-history/rounds-index.md` + `change-log.md` updated
- [ ] G-CompensatingControls + G-CoverageGate added to `00-control-center §Foundation Gates`

## Final commit
SHA: `<filled on close>`
Date: `<YYYY-MM-DD>`
