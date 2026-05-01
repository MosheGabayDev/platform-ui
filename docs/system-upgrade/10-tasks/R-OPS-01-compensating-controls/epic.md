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
- [x] T01 — Vitest + @vitest/coverage-v8 installed; `vitest.config.ts` + `lib/utils.test.ts` (5/5 pass) + scripts (test, test:watch, test:cov)
- [x] T02 — `tests/.coverage-baseline.json` checked in with current per-layer numbers + ADR-042 target floors
- [x] T03 — `.github/workflows/ci.yml` runs typecheck + lint + test:cov + coverage gate + high-risk gate + build
- [x] T04 — `scripts/git-hooks/pre-commit` (typecheck + lint on staged TS) + `scripts/install-git-hooks.sh` installer
- [x] T05 — `scripts/check-high-risk-commit.mjs` — wired into CI (`ci.yml`)
- [x] T06 — `.github/workflows/daily-smoke.yml` cron (06:00 UTC) runs Playwright smoke + auth specs
- [x] T07 — `10-tasks/_template/tasks/T01-example.md` Evidence section updated per ADR-042
- [x] T08 — `master-roadmap §10` DoD wording updated to require `Tests-CI: <url>` in commit trailer

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
