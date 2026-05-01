# R041D — Secrets Gate Baseline Cleanup / Allowlist Policy

> **Issue draft** — created 2026-04-26 as part of R040-Fix post-apply reconciliation.
> Risk register entry: R27 in `docs/system-upgrade/99-risk-register.md`
> Repo: `platformengineer`

---

## Title

R041D — Secrets Gate Baseline Cleanup / Allowlist Policy

---

## Goal

Restore trust in the D-005 Secrets Gate by making it green on `platformengineer/main`
(or clearly reduced to a documented, justified allowlist) so that future PRs fail only
on new genuine secret violations — not on pre-existing baseline noise.

**Current state:** D-005 is red on main due to pre-existing hardcoded test secrets,
Redis default passwords, and similar non-production values in unrelated files.
These failures were accepted as a temporary exception for PR #7 (R040-Fix) only,
documented via PR comment and logged as risk R27.

**Problem:** A CI gate that always fails is no gate. Developers will ignore it or
bypass it, and a real new secret could ship undetected.

---

## Scope (IN)

- Run D-005 scanner against `platformengineer/main` — capture full output
- Classify every finding into one of:
  - `real_secret` — actual credential / key / token that should not be in tracked code
  - `test_fixture_value` — value used only in tests, not a real credential
  - `safe_local_default` — Redis/DB default password, acceptable for local dev only
  - `legacy_dead_code` — in a file that is no longer executed or imported
  - `false_positive` — pattern matches but is not a secret (e.g. placeholder, example)
- Remediate all `real_secret` findings:
  - Remove from tracked files
  - Rotate if there is any possibility of exposure
  - Replace with `os.environ.get(...)` or SSM reference
- Replace `test_fixture_value` items with `os.environ.get()` or pytest fixtures where practical
- Document every allowlist entry with:
  - File path and line
  - Classification
  - Justification
  - Owner
  - Reviewer
- Update scanner policy / config (`.gitleaks.toml`, `detect-secrets` baseline, or equivalent)
  to anchor the allowlist
- Verify D-005 green on `platformengineer/main` — or clearly reduced to documented allowlist
- Ensure future PRs fail only on new findings (not pre-existing baseline)
- Move R27 from `🔴 Active` to `🟢 MITIGATED` or `RESOLVED` in `../09-history/risk-register.md`
  when acceptance criteria pass

---

## Out of Scope

- Feature work of any kind
- Broad security refactors beyond D-005 findings
- R042 ModuleRegistry sync or data ingestion
- AI gateway migration (R048)
- UI redesign
- Auth/RBAC changes
- Adding SSM secrets for production use (separate task in auth hardening)
- Any security cleanup not directly identified by the D-005 scanner output

---

## Dependencies

- R040-Fix merged to main ✅ (complete — SHA `cc6c9001c90bc3317a17e1603762564ab23747c7`)
- Access to `platformengineer/main` branch
- D-005 scanner tooling available in CI or locally (`detect-secrets`, `.gitleaks.toml`, or `bandit`)

---

## Acceptance Criteria

1. D-005 scanner exits with 0 violations (clean) OR has a documented, reviewed allowlist
   covering every remaining finding with classification + justification
2. No `real_secret` findings remain in any tracked file in `platformengineer/`
3. No production credentials (API keys, DB passwords, OAuth secrets) appear in any tracked file
4. All allowlist entries have: file path, classification, justification, owner, reviewer
5. Allowlist policy is documented (what is allowed and why; who approves additions)
6. Test fixtures still run after any changes to test credential handling
7. CI evidence attached: D-005 output before + after
8. `../09-history/risk-register.md §R27` updated from `🔴 Active` to `🟢 MITIGATED/RESOLVED`
9. No new secrets introduced during cleanup
10. PR description explicitly states: before/after finding counts; classification breakdown

---

## Tests

| Test | Type | Pass Criteria |
|------|------|--------------|
| D-005 scanner exit code | CI gate | 0 violations OR all violations in documented allowlist |
| Allowlist completeness check | Manual review | Every finding classified; no unclassified entries |
| Test suite still passes | Regression | `test_r040_fix.py` 33/33, `test_r040_schema.py` 43/43 — no regressions |
| No new `real_secret` introduced | Diff review | `git diff main...HEAD` shows no new credentials |
| Fixture tests still run | Integration | Any affected test modules pass with env-injected credentials |

---

## Evidence Required

- [ ] D-005 scanner output before cleanup (baseline)
- [ ] D-005 scanner output after cleanup (target)
- [ ] Classification table (every finding classified)
- [ ] Allowlist policy document (if any entries remain)
- [ ] Commit SHA of remediation PR
- [ ] Test results after changes

Evidence location: `platformengineer/evidence/r041d/`

---

## Rollback / No-Op Strategy

This round is non-destructive:

- No DB schema changes
- No API contract changes
- No runtime behavior changes
- Secret removal is always safe (the values should not be there)
- Test fixture changes only affect test runs — verify before merging

If a test fixture change breaks a test, revert the fixture change and document it as
an allowlist entry instead.

---

## Security Checklist

- [ ] No new secrets added during cleanup
- [ ] Rotated any `real_secret` values that may have been exposed
- [ ] No production credentials remain in any tracked file
- [ ] PR reviewed by at least one team member before merge
- [ ] Allowlist entries reviewed — no blanket wildcard patterns that would hide real secrets

---

## Shared Services Checklist

- [ ] No new modules, APIs, or components added (out of scope)
- [ ] No LLM calls, gateway changes, or UI changes

---

## Recommended Execution Order After This Round

1. R041A — CI Enforcement (LLM import gate in GitHub Actions)
2. R041B — ActionButton shared component (can run in parallel with R041A)
3. R042 — ModuleRegistry sync + CompatLayer
4. R043 — AI Service Routing Matrix backend
5. R044 — Navigation API + JWT audit fix
6. R045 — Feature Flags + Settings Engine

---

## Follow-ups / Related

- `../09-history/risk-register.md §R27` — close when AC pass
- `../00-control-center.md §G-SecretScan` — update gate to ✅ when clean
- R041A CI enforcement: confirm D-005 gate is reliable before enforcing hard-fail mode
