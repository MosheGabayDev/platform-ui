# Atomic Tasks

> Every active round gets broken into atomic ≤2h units here. Each unit is one focused commit.

## Why

Rounds in the master roadmap (`../03-roadmap/master-roadmap.md`) are scoped to whole capabilities — too large to commit in one go. To stay shippable on a single-trunk workflow (CLAUDE.md §Workflow Rules), every round is decomposed into tasks that:

- Take ≤2 hours of focused work
- Build green and pass tests independently
- Leave the system in a coherent state
- Get one commit + one push to `origin/master`

---

## Folder structure

```
10-tasks/
├── README.md                 ← this file
├── _template/                ← copy this when starting a new round
│   ├── epic.md
│   └── tasks/
│       └── T01-…example.md
├── R{NNN}{-suffix}-<slug>/   ← one folder per round
│   ├── epic.md               ← scope, AC, DoD, decomposition rationale
│   └── tasks/
│       ├── T01-<short-name>.md
│       ├── T02-…
│       └── T0N-…
```

---

## Round folder naming

`R{NNN}{-suffix}-<slug>` where:

- `R{NNN}` — three-digit round number (R042, R043, …)
- `-suffix` — optional (e.g. `-BE` for backend-only sub-track, `-UI` for UI-only, letter for parallel sub-rounds)
- `<slug>` — kebab-case capability/feature name

Examples: `R042-BE-module-registry/`, `R043-ai-service-routing/`, `R051-helpdesk-phase-a/`.

---

## When to create vs split

- **Create the round folder** when the round has a defined scope and is the next 1–2 to start. Don't pre-create epics for rounds that are months out — they'll go stale.
- **Split into tasks (T01, T02, …)** when the round is **next-up** (imminent start). Earlier than that, just keep `epic.md` as a stub.
- **Mark tasks done** in `epic.md`'s "Tasks" section as you go (`[ ]` → `[x]`). Each completed task = one git commit.

---

## Task file format

Every `T{NN}-<name>.md` file follows this structure:

```markdown
# T{NN} — <short title>

**Estimate:** <minutes>
**Status:** ⬜ todo / 🔵 in-progress / ✅ done
**Depends on:** T0X | none
**Touches:** <comma-sep file paths>

## Goal
One sentence: what this task achieves.

## Acceptance Criteria
- [ ] criterion 1 (testable)
- [ ] criterion 2
- …

## Implementation Notes
- API contract / type signature / migration name / etc.
- Edge cases to handle
- Anything non-obvious

## Test
- Unit: …
- Integration: …
- Manual: …
- Evidence: paste counts on completion (X passed / Y total)

## Definition of Done
- [ ] All AC checked
- [ ] Tests pass
- [ ] Build green (`npm run build` if frontend; `pytest` if backend)
- [ ] Committed to master + pushed
- [ ] `epic.md` Tasks section marked `[x]`
```

---

## Epic file format

```markdown
# R{NNN} — <round title>

**Phase:** P{0–5}
**Track:** platform-ui | platformengineer
**Status:** ⬜ ready / 🔵 in-progress / ✅ done / 🔴 blocked
**Depends on:** <prior rounds>
**Estimate:** <total hours>

## Scope
What's IN scope for this round.

## Out of scope
What is explicitly NOT in scope (defer to which future round).

## Why now
What unblocks once this is done.

## Decomposition rationale
Brief: why these tasks, why this order.

## Tasks
- [ ] T01 — <title> (~Xm)
- [ ] T02 — …
- …

## Acceptance Criteria (round-level)
- [ ] All tasks done
- [ ] <round-level test/check 1>
- [ ] <round-level test/check 2>

## Definition of Done
- [ ] AC met
- [ ] `09-history/rounds-index.md` updated
- [ ] `09-history/change-log.md` updated
- [ ] `03-roadmap/action-backlog.md` updated
- [ ] `06-governance/module-migration-progress.md` updated (if module touched)
- [ ] Epic file moved to ✅ done
- [ ] Final commit SHA recorded below

## Final commit
SHA: `<filled on close>`
Date: `<YYYY-MM-DD>`
```

---

## Task sizing guide

| Task type | Typical size |
|---|---|
| Add a typed API client function + query key | 15–30 min |
| New shared component (≤200 lines) | 60–120 min |
| Migration: add a column with default | 30–45 min |
| Migration: new table + FK + indexes | 60–90 min |
| New page wired to existing API | 60–90 min |
| New endpoint with RBAC + tests | 60–120 min |
| Refactor: extract helper into shared lib | 30–60 min |

If a task is estimated > 120 min, split it.

---

## Order of tasks within a round

1. **Types and contracts first.** TypeScript types, Pydantic schemas, query keys.
2. **API/data layer next.** Client functions, hooks, backend routes.
3. **UI/integration last.** Components consume contracts already in place.
4. **Tests as you go.** Don't batch tests at the end.
5. **Docs at close.** Update governance/history docs in a final task.

---

## Active rounds

See `../03-roadmap/master-roadmap.md §5` for the current round list and their status.
The folder for the most-imminent round should always have at least an `epic.md`.
