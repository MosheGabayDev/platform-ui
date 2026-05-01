# T06 — Wire sync into Flask startup (idempotent)

**Estimate:** 30 min
**Status:** ⬜ todo
**Depends on:** T01, T02
**Touches:** `apps/__init__.py` (boot path), `scripts/manage.py` (CLI command)

## Goal
Run `ModuleRegistry.sync_from_manifests()` automatically on app startup, and expose a manual CLI for ops.

## Acceptance Criteria
- [ ] On Flask app create, `sync_from_manifests()` runs once (after DB ready, before first request)
- [ ] Sync runs ONLY if `MODULE_SYNC_ON_BOOT=true` env var (default true; ops can disable in emergency)
- [ ] Sync errors logged but DO NOT crash app boot — app starts in degraded mode with metrics counter incremented
- [ ] CLI: `flask modules sync` runs sync explicitly + prints summary table
- [ ] CLI: `flask modules sync --dry-run` validates manifests + reports diff without writing
- [ ] Sync metric exported: `module_sync_last_run_unixtime` (Prometheus gauge)
- [ ] Sync metric: `module_sync_errors_total` (counter)

## Implementation Notes
- Hook point: `app.before_first_request` is deprecated in newer Flask; use a one-shot guard via `app.config['_MODULE_SYNC_RAN']`
- Background: in multi-worker setups (gunicorn), sync runs once per worker. Acceptable because operations are idempotent. Document this.
- Dry-run output: tabulate with `inserted/updated/retired/errors` counts per module
- Log boot summary: `INFO module_sync: 37 active, 2 retired, 0 errors in 0.42s`

## Test
- Integration: `test_module_sync_boot.py`
  - `test_sync_runs_on_first_app_create`
  - `test_sync_does_not_crash_on_malformed_manifest` — boot succeeds despite bad manifest
  - `test_module_sync_disabled_via_env`
  - `test_cli_sync_command` — invoke via Flask CLI test client
  - `test_cli_dry_run_writes_nothing`

## Definition of Done
- [ ] All AC checked + tests pass
- [ ] Boot logs show sync summary line
- [ ] Committed + pushed
- [ ] `epic.md` Tasks: `[x] T06`
