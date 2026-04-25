# 51 — Agent Handoff Protocol

> Protocol for handing off work between AI agents and for parallel agent coordination.
> _Last updated: 2026-04-26 (R041-Gov Worktree Addendum — worktree integration added)_
>
> **Purpose:** Multiple agents may work in parallel on different modules. This protocol ensures no context is lost, no conflicts occur, and any agent can pick up where another left off.
>
> **Worktree workflow:** See `52-parallel-worktree-agent-workflow.md` for Git worktree setup, naming conventions, and parallel safety rules. Every parallel agent session should use a worktree, not the main working directory.

---

## Core Principle

> **Every agent leaves the codebase in a better or equal state than they found it.**
> Work in progress is not left uncommitted. Blockers are documented. The next agent can orient in <5 minutes.

---

## Before Starting Work

Every agent must read these docs before writing any code:

1. `CLAUDE.md` — hard rules, forbidden patterns, architecture overview
2. `docs/system-upgrade/00-implementation-control-center.md` — current active round, blockers, do-not-start list
3. `docs/system-upgrade/02-development-rules.md` — product, architecture, security, testing, UX, AI, i18n rules
4. `docs/system-upgrade/03-module-migration-progress.md` — which modules are in what state
5. The relevant round/issue contract — assigned scope, acceptance criteria, out-of-scope list
6. The relevant module's `docs/modules/<module_key>/LEGACY_INVENTORY.md` — if it exists
7. The relevant module's `docs/modules/<module_key>/E2E_COVERAGE.md` — if it exists

**If any of the above docs do not exist for the module being worked on:** create them before writing product code.

---

## During Work

### Stay within scope

- Work only within the assigned issue/round.
- If you discover something that must be done but is outside scope: document it as a follow-up issue. Do not implement it.
- If scope is unclear: add an open question to `13-open-questions.md` and stop until clarified.

### Update progress in real-time

- Use `TodoWrite` to track your steps for the current session.
- Mark tasks complete immediately — do not batch.
- If you hit a blocker: record it in the module's blocker row in `03-module-migration-progress.md` and in `99-risk-register.md` if it affects multiple rounds.

### Do not touch shared contracts without documenting impact

Shared contracts that affect all agents:
- `apps/authentication/rbac.py` — auth/RBAC decorators
- `apps/audit/` — audit functions
- `apps/__init__.py` — app factory
- `apps/ai_providers/gateway.py` — AI gateway
- Any shared TypeScript component in `components/`
- `middleware.ts` — Next.js auth middleware

If you must modify a shared contract: document the impact in the commit message and in the round entry in `96-rounds-index.md`.

### Record skipped tests immediately

Every `test.skip()` or `pytest.mark.skip()` must have:
1. A reason string (not just `"wip"`)
2. A reference to the issue or round that will unblock it
3. An entry in the module's `E2E_COVERAGE.md` or `TESTING.md` known gaps section

---

## After Work — Mandatory Updates

Before a round is closed, the agent must update:

| Doc | What to update |
|-----|---------------|
| `docs/system-upgrade/03-module-migration-progress.md` | Every column that changed for touched modules |
| `docs/system-upgrade/96-rounds-index.md` | New round entry (see template below) |
| `docs/system-upgrade/98-change-log.md` | New entry prepended |
| `docs/system-upgrade/15-action-backlog.md` | Completed tasks marked `[x]`, new follow-up tasks added |
| `docs/modules/<module_key>/TESTING.md` | Test evidence added, gaps documented |
| `docs/modules/<module_key>/LEGACY_INVENTORY.md` | Inventory updated if capabilities were added/changed |
| `docs/modules/<module_key>/E2E_COVERAGE.md` | Coverage status updated for affected flows |
| `docs/system-upgrade/99-risk-register.md` | New risks added if discovered |

---

## Handoff Summary Template

Every agent must leave a handoff summary at the end of their round. This summary goes into the `96-rounds-index.md` entry for the round and as a comment in the final commit message.

```markdown
## Handoff Summary — <round_id>

**Branch:** <branch name>
**Commit SHA:** <sha>
**Date:** <YYYY-MM-DD>
**Agent:** <agent id or name>

### Completed

- [ ] <task 1>
- [ ] <task 2>

### Not Completed

- [ ] <task> — <reason: blocked / out-of-scope / deferred>

### Tests Run

| Suite | Passed | Total | Command |
|-------|--------|-------|---------|
| <module> | <n> | <n> | `pytest apps/<module>/tests/ -v` |
| Regression | <n> | <n> | `bash scripts/test_steps/00_regression.sh` |

### Evidence Generated

| Type | Path / Link |
|------|------------|
| Pytest output | <paste or link> |
| E2E report | <path or "not run"> |

### Known Blockers

| Blocker | Affects | Resolution |
|---------|---------|-----------|
| <description> | <round or module> | <plan> |

### Warnings for Next Agent

- <Any state that is unusual, risky, or requires attention>
- <Uncommitted changes if any — explain why>
- <Module state that differs from what docs say>

### Recommended Next Action

<One paragraph describing what should happen next and why, with round reference>

### Worktree Info

**Worktree path:** C:\Users\moshe\OneDrive\Documents\Projects\worktrees\<name>
**Branch:** <branch-name>
**Worktree status:** active (PR open) | merged (cleanup pending) | cleaned
**PR:** #<number> or "not yet opened"
```

---

## Parallel Agent Coordination Rules

When multiple agents work concurrently:

### Worktree-first rule

- **Every parallel agent must work in a Git worktree**, not the main repo directory.
- Worktree setup: `52-parallel-worktree-agent-workflow.md §4`.
- **Never work directly on `main` or `master`.**
- Never start work without confirming `git branch --show-current` shows the feature branch.

### Module assignment

- Each agent is assigned **one module** (or one well-defined cross-cutting task).
- Two agents must not modify the same module simultaneously.
- `03-module-migration-progress.md` shows which modules are in-progress — check before starting.

### Shared files

- **Never edit in parallel:** `CLAUDE.md`, `00-implementation-control-center.md`, `03-module-migration-progress.md`, `96-rounds-index.md`, `98-change-log.md`
- These are updated by one agent (coordinator) after all parallel PRs are merged.
- Full lock list: `52-parallel-worktree-agent-workflow.md §7`.
- If two agents finish at the same time: coordinate via the "Update Protocol" in each doc.

### Conflict resolution

- If two agents create conflicting implementations: the one that matches the round contract wins.
- The conflicting work must be documented as a follow-up, not silently dropped.
- If uncertain: add an open question to `13-open-questions.md`.

### Context transfer

An agent picking up abandoned work must:
1. Read the handoff summary in `96-rounds-index.md` for the round.
2. Check `git log --oneline -10` on the branch.
3. Run `bash scripts/test_steps/00_regression.sh` to confirm starting state.
4. Check `03-module-migration-progress.md` for the module's current blocker status.

---

## When an Agent Cannot Complete a Round

If a round must be abandoned mid-implementation:

1. **Do not leave uncompilable code.** Either complete the change or revert it.
2. **Commit what is safe.** Partial work that doesn't break anything should be committed with a clear WIP message.
3. **Write the handoff summary** with "Not Completed" section filled in.
4. **Document blockers** in `99-risk-register.md` if they affect future rounds.
5. **Update `03-module-migration-progress.md`** to reflect the current (not intended) state.

---

## Quick Orientation Checklist for a New Agent

```
[ ] Confirm worktree setup (52-parallel-worktree-agent-workflow.md §4)
    - git branch --show-current  ← must be feature branch, NOT main/master
    - git status                 ← must be clean
[ ] Read CLAUDE.md — especially §Shared Services Enforcement and §Security Rules
[ ] Read 00-implementation-control-center.md — active round, blockers, do-not-start
[ ] Read 02-development-rules.md — product, arch, security, testing, UX rules
[ ] Check 03-module-migration-progress.md — is your module in progress? blocked?
[ ] Read the round/issue contract — scope, acceptance criteria, out-of-scope
[ ] Read the module LEGACY_INVENTORY.md — what must be preserved?
[ ] Read the module E2E_COVERAGE.md — what must be testable?
[ ] Run: bash scripts/test_steps/00_regression.sh — baseline passing
[ ] Check git log: any WIP commits from previous agent?
[ ] Check 96-rounds-index.md: any handoff summary for your round?
[ ] Check 52-parallel-worktree-agent-workflow.md §7 — am I allowed to edit the files I need?
```

If any of these steps surface a concern: add it to `13-open-questions.md` before writing code.
