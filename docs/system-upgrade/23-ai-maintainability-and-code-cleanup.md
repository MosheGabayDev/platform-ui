# 23 — AI-Maintainability and Code Cleanup

_Last updated: 2026-04-24_

---

## 1. Why AI-Maintainability is a First-Class Goal

AI coding assistants (Claude, Copilot, Cursor) read codebases to generate changes. Their output quality degrades sharply when:

- Files exceed ~400 lines (context window pressure)
- Dead code and live code are intermixed
- Multiple conflicting implementations exist side-by-side (`api_auth.py` vs `api_auth_OLD_BACKUP.py`)
- Module boundaries are undefined or violated
- No INDEX.md or README exists to orient the agent at the module level

Unlike a human developer who can ask a colleague, an AI agent reasons from what it can _read_. If the codebase is cluttered with dead files, bloated god-files, and undocumented implicit conventions, the agent will either hallucinate the wrong approach or generate safe-but-wrong changes.

**AI-maintainability is not a vanity concern — it directly determines how much reliable automation this project can extract from AI tools.**

---

## 2. Current Codebase Risks for AI Agents

| Risk | Evidence | Impact |
|------|----------|--------|
| Dead backup files | `api_auth_OLD_BACKUP.py`, `api_auth_optimized.py` | Agent picks wrong file as canonical |
| 4 embedded Vite apps | `ai-agents-ui/`, `ala-ui/`, `ops-ui/`, `dyn-dt-ui/` | Duplicated types, conflicting patterns, unclear ownership |
| `run.py` god-file (15KB) | All blueprint registrations in one file | Agent reads incorrect module ownership |
| No local INDEX.md in most modules | Only top-level DOCS/INDEX.md exists | Agent cannot navigate modules without full codebase read |
| Jinja2 templates alongside Next.js code | Legacy templates still active during migration | Agent generates changes in wrong layer |
| Inconsistent API response shapes | 81 modules, no shared envelope | Agent cannot infer correct client-side handling |
| Missing file headers | No canonical module/owner declaration in most files | Agent cannot determine a file's purpose from its first line |
| 39 Alembic parallel heads | Undocumented intentional design | Agent proposes merging heads, risking migration corruption |

---

## 3. Target Code Organization Principles

1. **One file, one responsibility** — each file does one thing; its name says what
2. **Entry point readable in 30 lines** — module entry points (`routes.py`, `services.py`, `index.ts`) must be scannable without scrolling
3. **Dead code has no address** — deleted is better than commented-out; archived is better than co-located
4. **Naming is documentation** — `api_auth.py` is canonical; `api_auth_OLD_BACKUP.py` does not exist
5. **Explicit module boundaries** — what a module exports is declared; what it imports is bounded
6. **INDEX.md is mandatory** — every `apps/<module>/` and `app/<route>/` has a local index

---

## 4. File Size and Module Boundary Guidelines

### Python (Flask modules)

| File type | Max recommended lines | Split strategy |
|-----------|----------------------|----------------|
| `routes.py` | 200 | Split by resource: `user_routes.py`, `org_routes.py` |
| `services.py` | 300 | Split by concern: `user_service.py`, `invitation_service.py` |
| `models.py` | 200 | One model per file in `models/` directory |
| `__init__.py` | 50 | Only imports + blueprint registration |

### TypeScript (Next.js)

| File type | Max recommended lines | Split strategy |
|-----------|----------------------|----------------|
| Page component | 150 | Extract sub-components to `components/` |
| API route handler | 80 | Extract business logic to `lib/` |
| React component | 200 | One component per file, no barrel exports in domain dirs |
| `lib/` utilities | 100 | One function family per file |

### Module boundary rules

- `apps/A/` must NOT import from `apps/B/` — use service layer or internal API
- `platform-ui/components/ui/` must NOT import from `components/domain/`
- `lib/api/` must NOT import from `app/` (no circular: route → api client → route)
- `components/domain/` may import from `components/shared/` and `components/ui/` only

---

## 5. Commenting Standards

Use comments for **why**, never **what**. The code says what; only the developer knows why.

### Required:
- Module-level docstring (Python) or JSDoc block (TypeScript): 1-2 lines, purpose + auth requirement
- Non-obvious invariants: e.g., why `org_id` must come from JWT, never from request body
- Workarounds: e.g., `# waitress doesn't support streaming — use chunked workaround`

### Forbidden:
- `# TODO: fix this` without a linked issue
- Commented-out old code — delete it; git has history
- `# This function returns X` — the function signature says that already
- Multi-paragraph docstrings that restate parameter names as prose

---

## 6. Local README/INDEX Standards

Every `apps/<module>/` directory must have an `INDEX.md` with:

```markdown
# <Module Name>

## Purpose
One sentence.

## Entry Points
| File | What it does |
|------|-------------|
| routes.py | Flask Blueprint registration, HTTP handlers |
| services.py | Business logic, DB operations |

## Key Symbols
| Symbol | File | Description |
|--------|------|-------------|
| `create_user()` | services.py:42 | Creates user, sends invite email |

## Flow
Request → routes.py → services.py → models.py → DB

## Dependencies
- `apps/authentication` (for `@role_required`)
- `apps/notifications` (for invite emails)
```

Every `app/(dashboard)/<route>/` in platform-ui must have a local `README.md`:

```markdown
# <Route Name>

## What this page does
One sentence.

## Data fetched
| Hook | Query key | Flask endpoint |
|------|-----------|----------------|

## Components
List of non-trivial components used.
```

---

## 7. Dead-Code Detection Strategy

### Python dead code

```bash
# Find files with _OLD_, _BACKUP_, _bak, _copy, _v2, _deprecated in name
find apps/ -name "*_OLD*" -o -name "*_BACKUP*" -o -name "*_bak*" | sort

# Find files never imported by anything
python -m vulture apps/ --min-confidence 80 > dead_code_report.txt

# Find commented-out function definitions
grep -rn "^#.*def " apps/
```

### TypeScript dead code

```bash
# Find unused exports
npx ts-prune --project tsconfig.json

# Find components never imported
npx knip --no-exit-code
```

### Jinja2 template dead code

```bash
# Templates still served by Flask routes
grep -rn "render_template" apps/ | grep -v "#" | sort

# Templates that exist but are never render_template'd
comm -23 <(find templates/ -name "*.html" | sort) \
         <(grep -roh "render_template(['\"].*['\"]" apps/ | grep -oh "'.*'" | tr -d "'" | sort -u)
```

---

## 8. Safe Deletion Workflow

Before deleting any file in a production codebase:

1. **Confirm it is dead**: grep for all imports, `render_template`, `url_for`, and direct references
2. **Check git blame**: who last touched it, when, and why
3. **Archive, don't delete immediately**: `git mv apps/auth/api_auth_OLD_BACKUP.py .archive/auth/`
4. **Deploy and monitor** for 1 week: no errors referencing the file
5. **Hard delete** after monitor period: remove from `.archive/` in a dedicated cleanup commit

### What can be deleted NOW (no migration needed):

| File | Reason |
|------|--------|
| `apps/authentication/api_auth_OLD_BACKUP.py` | Superseded by `api_auth.py`; never imported |
| Any `*_OLD_*` or `*_BACKUP*` file in `apps/` | Same pattern — dead by naming convention |
| Commented-out `requirements.txt` entries | Document the removal reason in a comment if historical |

### What must wait for migration:

| Asset | Wait for |
|-------|---------|
| Jinja2 templates | Corresponding platform-ui page feature-complete + deployed |
| 4 embedded Vite apps | Feature parity confirmed in platform-ui |
| Flask routes that back Jinja2 views | After Jinja2 templates removed |

---

## 9. Duplicate-Code Consolidation Strategy

### Priority list of known duplicates

| Duplicate | Canonical | Action |
|-----------|-----------|--------|
| `ala-ui/` + ALA pages in platform-ui | platform-ui | Migrate, then delete `ala-ui/` |
| `ai-agents-ui/` + agents pages in platform-ui | platform-ui | Migrate, then delete `ai-agents-ui/` |
| `ops-ui/` + ops pages in platform-ui | platform-ui | Migrate, then delete `ops-ui/` |
| `dyn-dt-ui/` + datatable in platform-ui | platform-ui | Consolidate component, delete `dyn-dt-ui/` |
| `apps/authentication/api_auth.py` vs `jwt_routes.py` | Both live (different purposes) | Document split clearly in INDEX.md |

### Consolidation rule

Never maintain two implementations of the same feature simultaneously. The moment platform-ui reaches parity with a Jinja2 or Vite-app feature, the old implementation is scheduled for deletion within the same sprint.

---

## 10. Legacy UI Cleanup Strategy

### Jinja2 retirement order (aligned with migration roadmap)

1. **User Management** templates — after Phase 2 domain 1
2. **Helpdesk** templates — after Phase 2 domain 2
3. **AI Agents** templates — after Phase 2 domain 3
4. **ALA** templates + `ala-ui/` — after Phase 3 ALA migration
5. **Remaining** (Knowledge, Billing, Settings, etc.) — after Phase 3 domain migrations
6. **Delete `templates/` directory entirely** — Phase 4 milestone

### Vite app retirement order

| App | Retire after |
|-----|-------------|
| `ai-agents-ui/` | AI Agents page live in platform-ui |
| `ala-ui/` | ALA page live in platform-ui |
| `ops-ui/` | Ops/monitoring page live in platform-ui |
| `dyn-dt-ui/` | DataTable component consolidated in platform-ui |

### Flask route retirement

When a Jinja2 template is deleted, audit the Flask route for that URL:
- If it ONLY served the template → delete the route
- If it also serves API data → keep the route, move to API blueprint
- If it backs both Jinja2 and platform-ui → keep until platform-ui path confirmed stable

---

## 11. AI-Agent-Friendly Repository Conventions

These conventions make the codebase maximally useful for AI coding assistants:

### File header convention (Python)

```python
"""
Module: apps/helpdesk/services.py
Purpose: Business logic for helpdesk session lifecycle and approval workflows.
Auth: Requires @role_required('technician') or higher.
Tenant-scoped: All queries filter by org_id.
"""
```

### File header convention (TypeScript)

```typescript
/**
 * @module components/domain/helpdesk/SessionCard
 * @description Read-only card for a helpdesk session row. Renders status badge and last action.
 * Data: uses useQuery(sessionKeys.detail(id)) — see lib/api/query-keys.ts
 */
```

### Naming conventions

| Pattern | Use |
|---------|-----|
| `*_routes.py` | Flask Blueprint HTTP handlers only |
| `*_services.py` | Business logic, no HTTP primitives |
| `*_models.py` | SQLAlchemy ORM models only |
| `use*.ts` | React hook |
| `*Store.ts` | Zustand store |
| `*Keys.ts` | TanStack Query key factories |
| `*.schema.ts` | Zod validation schemas |

### What AI agents need to work efficiently

- `INDEX.md` at module root: agent reads one file to understand the module
- `CLAUDE.md` at repo root: agent reads one file to understand constraints
- File headers with purpose + auth requirement: agent doesn't need to grep the whole module
- No dead code: agent doesn't waste context on unreachable paths
- Explicit exports: agent knows exactly what a module's public API is

---

## 12. Refactor Acceptance Criteria

A refactor (file split, rename, consolidation) is complete only when:

- [ ] All tests pass (or new tests cover the refactored code)
- [ ] No references to old file paths remain (grep confirms)
- [ ] INDEX.md updated to reflect new file structure
- [ ] CLAUDE.md §Key Files table updated if file was listed there
- [ ] Git commit message explains the WHY, not the what
- [ ] No commented-out old code left in the refactored file
- [ ] File headers updated on all touched files

---

## 13. Checklist for Every Migrated Module

When a feature domain migrates from Jinja2/Vite → platform-ui:

- [ ] Flask endpoint documented in `docs/modules/<N>-<name>/PLAN.md`
- [ ] TypeScript types generated from OpenAPI (or manually defined if not yet on codegen)
- [ ] Query keys in `lib/api/query-keys.ts`
- [ ] Module page has `README.md` explaining what it fetches and renders
- [ ] Jinja2 template deleted (not archived, deleted — it's in git history)
- [ ] Flask route serving only the template deleted
- [ ] Dead code scan run on the module's `apps/<module>/` directory
- [ ] INDEX.md created or updated in `apps/<module>/`
- [ ] E2E Playwright test covers the critical path
- [ ] Hebrew strings moved to `messages/he.json` (no hardcoded strings in components)

---

## 14. Suggested Tools for Dead-Code and Dependency Analysis

### Python

| Tool | Purpose | Install |
|------|---------|---------|
| `vulture` | Finds unused Python code (functions, classes, variables) | `pip install vulture` |
| `pylint --disable=all --enable=W0611` | Unused imports | already in Python toolchain |
| `import-linter` | Enforces module dependency direction rules | `pip install import-linter` |
| `radon` | Cyclomatic complexity, maintainability index | `pip install radon` |

### TypeScript / Next.js

| Tool | Purpose | Install |
|------|---------|---------|
| `knip` | Finds unused files, exports, and dependencies | `npm i -D knip` |
| `ts-prune` | Unused TypeScript exports | `npm i -D ts-prune` |
| `depcheck` | Unused npm dependencies | `npm i -D depcheck` |
| `eslint-plugin-unused-imports` | Auto-remove unused imports | `npm i -D eslint-plugin-unused-imports` |

### Templates / HTML

| Tool | Purpose |
|------|---------|
| Manual grep: `grep -rn "render_template\|url_for"` | Find which templates are still live |
| `git log --diff-filter=D -- templates/` | See deleted templates for context |

---

## 15. Risks of Over-Cleaning or Deleting Too Early

| Risk | Example | Mitigation |
|------|---------|------------|
| Deleting a file that backs a production route | Remove Flask route before Jinja2 template retired | Always grep + test before delete |
| Breaking a mobile app flow | Removing a Flask route the mobile app calls | Check API routes against `mobile-app-rn-v2/` before removing |
| Losing historical context | Deleting a file before understanding why it existed | Move to `.archive/` first; hard-delete after 1-week no-error period |
| Breaking Celery task signatures | Renaming a task function while workers are running | Use blue-green: deploy new name, wait for old tasks to drain, delete old name |
| Breaking SSM/K8s references | Renaming an env var | Search SSM + K8s overlays before renaming any env var |
| Alembic migration corruption | "Consolidating" the 39 parallel heads | **Do not consolidate** — the 39 heads are intentional (see `MEMORY.md`); document clearly instead |

### The "leave it alone" rule

If a file:
- Has unclear ownership
- Has no tests covering it
- Has not been touched in 6+ months
- Is not obviously dead

→ Document it in INDEX.md and leave it alone. The cost of a wrong deletion far exceeds the cost of one extra file.
