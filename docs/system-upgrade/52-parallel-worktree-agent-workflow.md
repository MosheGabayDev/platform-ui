# 52 — Parallel Worktree Agent Workflow

> Official workflow for running multiple AI agents in parallel using Git worktrees.
> _Last updated: 2026-04-26 (R041-WT follow-up — shared docs reconciliation rule added)_
>
> **Read after:** `CLAUDE.md` → `00-implementation-control-center.md` → `51-agent-handoff-protocol.md` → **this file**

---

## 1. Purpose

Git worktrees are the **approved mechanism** for running multiple agents in parallel on this platform.

Without worktrees, parallel agents:
- Modify the same files and create merge conflicts
- Overwrite each other's in-progress work
- Lose context when branches diverge
- Create messy commits mixing unrelated changes

With worktrees, each agent gets a **fully isolated working directory** from the same repo. Multiple worktrees can be open simultaneously, each on their own branch, without interfering.

**One worktree = one agent = one round/issue = one PR.**

---

## 2. Directory Convention

All worktrees live under:

```
C:\Users\moshe\OneDrive\Documents\Projects\worktrees\
```

Naming pattern: `<repo-short-name>-<round-id>-<brief-description>`

```
worktrees\
  platform-ui-r041b-actionbutton
  platform-ui-r041-test-evidence
  platform-ui-r043-ai-routing-ui
  platformengineer-r041a-ci
  platformengineer-r040-fix-schema
  platformengineer-r043-ai-routing
  platformengineer-r042-module-registry
```

**Rules:**
- Short name only — no spaces, no special chars except `-`
- Round ID always included — never generic names like `feature` or `fix`
- Prefix with repo name — multiple repos can have parallel worktrees
- Max one active worktree per round

---

## 3. Branch Naming Convention

```
feat/<round-id>-<brief-description>
fix/<round-id>-<brief-description>
docs/<round-id>-<brief-description>
```

**Examples:**

| Type | Branch |
|------|--------|
| Feature round | `feat/r041b-actionbutton` |
| CI enforcement | `feat/r041a-ci-enforcement` |
| Schema fix | `fix/r040-schema-drift` |
| Governance docs | `docs/r041-governance-legacy-inventory` |
| AI routing | `feat/r043-ai-service-routing` |
| Module registry | `feat/r042-module-registry` |

**Rules:**
- Branch name **must include the round ID**
- One branch per issue/round — never share a branch between agents
- **Never work directly on `main` or `master`**
- Never reuse a branch name from a previous round
- Branch deleted only after PR merged or explicitly abandoned

---

## 4. Worktree Creation Commands

### platform-ui (branch base: `master`)

```bash
cd "C:\Users\moshe\OneDrive\Documents\Projects\platform-ui"
git pull
git worktree add "..\worktrees\platform-ui-r041b-actionbutton" -b feat/r041b-actionbutton master
```

### platformengineer (branch base: `main`)

```bash
cd "C:\Users\moshe\OneDrive\Documents\Projects\platformengineer"
git pull
git worktree add "..\worktrees\platformengineer-r041a-ci" -b feat/r041a-ci-enforcement main
```

### Verify after creation

```bash
# Confirm branch
cd "..\worktrees\<worktree-name>"
git branch --show-current     # should print your branch name

# Confirm clean state
git status                    # should show "nothing to commit"

# Confirm base
git log --oneline -3          # should match latest main/master
```

**Before handing to an agent:**
1. `git status` — must be clean
2. `git branch --show-current` — must be the correct feature branch
3. `git log --oneline -5` — must be based on current main/master

---

## 5. Agent Assignment Contract

Every agent prompt for a worktree-based task **must include** the following fields. Copy and fill in the template:

```
AGENT ASSIGNMENT CONTRACT — R0XX

Repo:           <platform-ui | platformengineer>
Worktree path:  C:\Users\moshe\OneDrive\Documents\Projects\worktrees\<name>
Branch:         <feat|fix|docs>/<round-id>-<description>
Round/Issue:    R0XX — <title>

Scope (IN):
  - <specific file or module 1>
  - <specific file or module 2>

Out of scope (DO NOT TOUCH):
  - main/master branch
  - <module or file that other agent owns>
  - <shared governance file — see §7 lock list>

Allowed files/directories:
  - <list>

Forbidden files/directories:
  - CLAUDE.md
  - docs/system-upgrade/00-implementation-control-center.md
  - docs/system-upgrade/15-action-backlog.md
  - docs/system-upgrade/35-platform-capabilities-build-order.md
  - docs/system-upgrade/96-rounds-index.md
  - docs/system-upgrade/97-source-of-truth.md
  - docs/system-upgrade/98-change-log.md
  - docs/system-upgrade/99-risk-register.md
  - docs/system-upgrade/03-module-migration-progress.md
  - (see full lock list in §7)

Central docs this agent IS allowed to update (list explicitly, or write "none — post-merge reconciliation"):
  - <file> — reason
  NOTE: Each listed file must NOT be in any other active agent's allowed list.

Tests required:
  - <test files to write or update>
  - Regression gate must pass: bash scripts/test_steps/00_regression.sh

Docs to update:
  - <list of docs this agent must update>
  - Do NOT update shared docs unless listed here

Final response format:
  1. Commit SHA
  2. Tests: X passed / Y total
  3. Files changed (list)
  4. Handoff summary (see 51-agent-handoff-protocol.md §Handoff Summary Template)
  5. Risks/follow-ups

---
You are assigned to R0XX only.
Worktree: <path>
Branch: <branch>
Do not work outside this worktree.
Do not modify files outside the allowed scope.
Do not start other rounds.
Do not touch main/master.
Return commit SHA, tests, risks, and handoff notes.
```

---

## 6. Parallel Safety Rules

### General

- **No two agents may edit the same code module at the same time.** Check `03-module-migration-progress.md` for `api_in_progress` before starting.
- **No two agents may edit the same migration chain.** Migration files have `down_revision` dependencies — concurrent edits create broken chains.
- **Shared governance docs are updated after merge, not during parallel work.** See §6.1 below.
- Shared docs updates may be batched and applied by a coordinator after all parallel PRs are merged.

### 6.1 Shared Docs Reconciliation Rule

> **This rule governs all central summary/source-of-truth docs.**

The following files are **shared coordination docs**. Two agents must never update the same file simultaneously:

| File | Update timing |
|------|--------------|
| `CLAUDE.md` | After all related PRs merged |
| `docs/system-upgrade/00-implementation-control-center.md` | After all related PRs merged |
| `docs/system-upgrade/15-action-backlog.md` | After all related PRs merged |
| `docs/system-upgrade/35-platform-capabilities-build-order.md` | After all related PRs merged |
| `docs/system-upgrade/96-rounds-index.md` | After all related PRs merged |
| `docs/system-upgrade/97-source-of-truth.md` | After all related PRs merged |
| `docs/system-upgrade/98-change-log.md` | After all related PRs merged |
| `docs/system-upgrade/99-risk-register.md` | After all related PRs merged |

**Rules:**

1. Each agent updates **module-local docs only** during their round:
   - `docs/modules/<module_key>/LEGACY_INVENTORY.md`
   - `docs/modules/<module_key>/E2E_COVERAGE.md`
   - `docs/modules/<module_key>/TESTING.md`
   - `apps/<module>/INDEX.md`
   - Round-specific new files

2. **Shared central docs** are updated by one of two methods:
   - **Option A — Docs coordinator agent:** a dedicated agent round (no code changes) runs after all parallel PRs are merged and updates all central docs in one commit.
   - **Option B — Final reconciliation in the last PR:** the last parallel PR to merge includes central docs updates as a separate commit at the end.

3. If a round **must** update a central doc during its own PR (e.g. it introduces a new risk that blocks other rounds), that file must be **explicitly listed in the agent assignment contract** (§5), and no other in-progress round may edit the same file.

4. **PRs touching central docs must include this note in the PR body:**
   > "This PR modifies a shared coordination doc (`<filename>`). Reviewer: check for merge conflicts with any other open PRs."

5. When in doubt: defer the central doc update to a post-merge reconciliation pass. It is always safe to update central docs later.

### Schema-specific

- Rounds touching DB schema must **not run in parallel** with rounds writing data into the same tables.
- Two migration files must not fork from the same `down_revision` simultaneously (creates parallel Alembic heads — not inherently wrong but must be deliberate, see CLAUDE.md §Alembic note).

### Auth/RBAC-specific

- Rounds modifying `apps/authentication/rbac.py` or `middleware.ts` must **not run in parallel** with rounds that consume those decorators, unless the consumer branch explicitly bases off the auth branch.

### AI Gateway-specific

- Rounds modifying `apps/ai_providers/gateway.py` or `apps/ai_providers/models.py` must coordinate with any round doing LLM migration (R048 phases).

---

## 7. Central File Lock List

These files require **explicit coordination** before any agent edits them. If a round needs to edit one of these files, it must declare it in the issue/round contract, and no other round in progress may edit the same file simultaneously.

### Both repos

| File | Why locked |
|------|-----------|
| `CLAUDE.md` | Agent contract — changes affect all agents |
| `docs/system-upgrade/00-implementation-control-center.md` | Active round + blockers — coordinate only |
| `docs/system-upgrade/01-round-review-checklist.md` | Reviewer gate — policy doc |
| `docs/system-upgrade/02-development-rules.md` | Non-negotiable rules — policy doc |
| `docs/system-upgrade/03-module-migration-progress.md` | Shared state tracker — update after merge |
| `docs/system-upgrade/15-action-backlog.md` | Cross-cutting tasks — coordinate |
| `docs/system-upgrade/35-platform-capabilities-build-order.md` | Build order — policy doc |
| `docs/system-upgrade/47-generic-platform-foundation-roadmap.md` | Master roadmap — policy doc |
| `docs/system-upgrade/96-rounds-index.md` | Append-only history — update after merge |
| `docs/system-upgrade/97-source-of-truth.md` | Registry — update after merge |
| `docs/system-upgrade/98-change-log.md` | Prepend-only log — update after merge |
| `docs/system-upgrade/99-risk-register.md` | Risk log — coordinate |

### platformengineer-specific

| File | Why locked |
|------|-----------|
| `apps/__init__.py` | App factory — affects all modules |
| `apps/authentication/rbac.py` | Auth decorators — consumed everywhere |
| `apps/authentication/jwt_routes.py` | JWT auth routes |
| `apps/ai_providers/gateway.py` | AI gateway — central LLM path |
| `apps/ai_providers/models.py` | AIUsageLog — billing critical |
| `apps/module_manager/models.py` | OrgModule/ModuleRegistry — central registry |
| Migration files (`scripts/migrations/versions/`) | Alembic chain — one author at a time |

### platform-ui-specific

| File | Why locked |
|------|-----------|
| `middleware.ts` | Auth + route protection |
| `app/api/proxy/[...path]/route.ts` | Proxy — consumed everywhere |
| `lib/auth/options.ts` | Auth config |
| `lib/auth/types.ts` | Auth types — consumed everywhere |
| `lib/api/client.ts` | API client — consumed everywhere |
| `lib/api/query-keys.ts` | Query key registry — consumed everywhere |
| `components/ui/*` | shadcn/ui primitives — read-only |

---

## 8. Safe and Unsafe Parallel Tracks

### Safe to run in parallel

These rounds are independent — different files, different concerns:

| Track A | Track B | Safe? | Notes |
|---------|---------|-------|-------|
| R041A CI Enforcement (platformengineer) | R041B ActionButton (platform-ui) | ✅ | Different repos, different files |
| R041A CI Enforcement (platformengineer) | R041-Gov docs (platform-ui) | ✅ | No shared code files |
| R041B ActionButton (platform-ui) | R041-Gov docs (platform-ui) | ✅ if | Must not both edit `CLAUDE.md` simultaneously |
| R042 ModuleRegistry (platformengineer) | R041B ActionButton (platform-ui) | ✅ | Different repos |
| R043 AI Routing (platformengineer) | R041B ActionButton (platform-ui) | ✅ | After R040-Fix merged |
| R045 Feature Flags (platformengineer) | R046 AuditLog (platformengineer) | ✅ if | Must not both touch same `apps/__init__.py` sections |

### Unsafe — do not run in parallel

| Combination | Reason |
|-------------|--------|
| R040-Fix (schema drift) + R042 ModuleRegistry | R042 reads tables R040-Fix may alter |
| R042 ModuleRegistry + R044 Navigation API | R044 depends on R042 output; branch R044 from R042 completion |
| R043 AI Routing + R048 full P0 LLM cleanup | Both touch `apps/ai_providers/gateway.py` — coordinate |
| Any two rounds with migrations touching same tables | Alembic chain conflict |
| Any two rounds modifying `apps/authentication/rbac.py` | Merge conflict on auth contract |
| R045 Feature Flags + R047 API Keys | Both extend settings/secrets tables |
| R046 AuditLog + R047 API Keys | Both depend on R045 tables being stable |

---

## 9. PR Workflow

Every worktree branch must end in a PR. **Agents do not merge directly to main/master.**

### PR checklist

Every PR body must include:

```markdown
## Round

R0XX — <title>
Issue: #<issue number>

## Scope completed

- [x] <acceptance criterion 1>
- [x] <acceptance criterion 2>

## Out of scope (untouched)

- <item> — confirmed not touched

## Tests

| Suite | Passed | Total | Command |
|-------|--------|-------|---------|
| <module> | N | N | `pytest apps/<module>/tests/ -v` |
| Regression | N | N | `bash scripts/test_steps/00_regression.sh` |

## Evidence

- Screenshot / report: <link or inline>
- Security: 401/403 tests: <pass/NA>
- Tenant isolation: <pass/NA>

## Migration safety (if applicable)

- [ ] Additive only — no drop/rename
- [ ] server_defaults on non-nullable columns
- [ ] FK ondelete rules documented

## Risks / follow-ups

- <item> — tracked in `99-risk-register.md §RXX`

## Handoff notes

<See 51-agent-handoff-protocol.md §Handoff Summary Template>
```

---

## 10. Merge Order and Dependency Handling

### Independent PRs

Independent PRs (no shared files, no schema dependencies) can merge in any order after CI passes and review is done.

After merging an independent PR: no special action required for other in-progress worktrees unless they share a locked file.

### Dependent PRs

If PR B depends on PR A:
1. PR A merges first.
2. PR B's worktree rebases or merges latest main/master: `git merge origin/main` (or `master`).
3. PR B resolves any conflicts.
4. PR B then opens for review.

### Conflict in locked/shared files

If two PRs touch the same locked file and conflict:
1. Pause both PRs.
2. Decide canonical version (usually the more recent governance decision).
3. One author updates their branch manually.
4. Document the resolution in the relevant round's `96-rounds-index.md` entry.
5. **Never silently discard one side of a conflict.**

### After merging any PR that changes shared services

`apps/authentication/rbac.py`, `apps/ai_providers/gateway.py`, `middleware.ts` — broadcast to all open worktrees:
- Other worktrees should `git merge origin/main` (or `master`) before continuing.
- CI will catch breakage if they don't.

---

## 11. Worktree Cleanup

### List active worktrees

```bash
cd "C:\Users\moshe\OneDrive\Documents\Projects\platform-ui"
git worktree list

cd "C:\Users\moshe\OneDrive\Documents\Projects\platformengineer"
git worktree list
```

### Remove a worktree (after PR merged or abandoned)

```bash
# 1. Confirm no uncommitted work
cd "C:\Users\moshe\OneDrive\Documents\Projects\worktrees\<name>"
git status        # must show "nothing to commit, working tree clean"

# 2. Remove worktree
cd "C:\Users\moshe\OneDrive\Documents\Projects\platform-ui"   # or platformengineer
git worktree remove "..\worktrees\<name>"

# 3. Delete the branch (after PR merged)
git branch -d feat/<round-id>-<description>

# 4. Prune stale worktree metadata
git worktree prune
```

### Emergency cleanup (worktree locked or corrupted)

```bash
# Force remove (use only if worktree directory no longer exists)
git worktree remove --force "..\worktrees\<name>"
git worktree prune
```

**Rules:**
- Never delete a worktree with uncommitted work — commit or stash first
- Never `git worktree remove` while the worktree is open in another terminal/session
- After cleanup, run `git worktree list` to confirm it's gone
- Use `/cleanup` Claude Code slash command to audit orphaned worktrees

---

## 12. Agent Handoff Integration

This doc works in concert with `51-agent-handoff-protocol.md`.

Every completed round in a worktree must include:

| Handoff field | Where it appears |
|--------------|----------------|
| Branch | Handoff summary + PR description |
| Worktree path | Handoff summary |
| Commit SHA | Handoff summary + PR description |
| Files changed | Handoff summary |
| Tests run + counts | Handoff summary + PR description |
| Evidence links | PR description |
| Known blockers | `99-risk-register.md` + handoff summary |
| Next recommended actions | Handoff summary + `96-rounds-index.md` |
| Worktree cleanup status | Handoff summary (pending merge / cleaned) |

**Template addition for worktree-based rounds** (append to handoff summary from `51-agent-handoff-protocol.md §Handoff Summary Template`):

```markdown
### Worktree Info

**Worktree path:** C:\Users\moshe\OneDrive\Documents\Projects\worktrees\<name>
**Branch:** <branch-name>
**Worktree status:** active (PR open) | merged (cleanup pending) | cleaned
**PR:** #<number> or "not yet opened"
```

---

## 13. Quick Reference Card

```
CREATE:
  cd <repo>
  git pull
  git worktree add ..\worktrees\<repo-shortname>-<round>-<desc> -b <branch> <main|master>

VERIFY:
  cd ..\worktrees\<name>
  git branch --show-current   ← must match branch
  git status                  ← must be clean

AFTER MERGING PR:
  cd <repo>
  git worktree remove ..\worktrees\<name>
  git branch -d <branch>
  git worktree prune

AUDIT ALL WORKTREES:
  git worktree list
```
