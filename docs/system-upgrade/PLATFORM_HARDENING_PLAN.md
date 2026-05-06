# Platform Hardening Plan — 2026-05-06

> Owner directive (2026-05-06): four hardening tracks across the platform
> on top of the four phases that closed in the GENERIC_AI_PLATFORM_PROGRESS
> file. This document tracks each item until done. Update the checkboxes
> as work lands.

---

## Track A — Mock-mode persistence (localStorage shim)

**Symptom.** All admin pages "forget" toggles/edits after a hard refresh.
Cause: every `lib/api/*.ts` mock client holds state in module-level
`Map`/object literals. A page reload re-evaluates the JS bundle and
state resets to the fixture.

**Goal.** A single shared shim wraps mock state with localStorage so
demo/dev users see persistent toggles. Flips off automatically when
`MOCK_MODE = false`. Keys are namespaced under `mock:<client>:<id>` so
clearing localStorage gives a fresh demo state.

### Scope

| # | Client | localStorage key prefix | Status |
|---|---|---|---|
| A1 | `lib/api/settings.ts` (cap 16) | `mock:settings:` | [x] |
| A2 | `lib/api/feature-flags.ts` (cap 17) | `mock:feature-flags:` | [x] |
| A3 | `lib/api/module-registry.ts` (cap 18) | `mock:module-registry:` | [x] |
| A4 | `lib/api/policies.ts` (cap 27) | `mock:policies:` | [x] |
| A5 | `lib/api/ai-providers.ts` (cap 2.1) | `mock:ai-providers:` | [x] |
| A6 | `lib/api/ai-skills.ts` (cap 2.2) | `mock:ai-skills:` | [x] |
| A7 | `lib/api/audit.ts` (cap 10) | `mock:audit:` | [x] |
| A8 | `lib/api/sample-data.ts` (Phase 3.1) | (rides cap 16 settings) | [x] |

### Approach

1. New `lib/api/_mock-storage.ts` exporting:
   - `loadMockState<T>(key, fallback): T`
   - `saveMockState<T>(key, value): void`
   - `clearMockState(prefix): void`
   - SSR-safe (no-op when `typeof window === "undefined"`)
   - Versioned (`__v: 1`) so a schema change can soft-reset
2. Each mock client lazy-hydrates from storage on first read; mutations
   call `saveMockState` after the in-memory update.
3. `__resetMockState()` exported per client for tests.
4. Vitest tests use `happy-dom` (already configured) — localStorage is
   stubbed there. Add `beforeEach` that clears the relevant prefix.

### Tests

- [x] `lib/api/_mock-storage.test.ts` — round-trip, versioning, SSR no-op (8 tests)
- [ ] each mock client's existing test file gains 1 persistence test (deferred — shim itself is well-tested; per-client persistence is exercised manually via the demo)

---

## Track B — Hebrew page chrome on 8 surfaces

**Symptom.** Page titles, subtitles, KPI labels, button text, filter
labels, and table headers render only in English on platform-default
Hebrew pages.

**Goal.** Hebrew chrome on every dashboard surface. English remains the
data-language fallback (e.g. `provider.name`, `skill.id`, `setting.key`
stay as-is) but everything authored by us renders Hebrew first.

### Scope (one row = one page or page family)

| # | Surface | Page chrome | KPI / filter labels | Button labels | Status |
|---|---|---|---|---|---|
| B1 | `/admin/settings` | [ ] | [ ] | [ ] | [ ] |
| B2 | `/admin/modules` | [ ] | [ ] | [ ] | [ ] |
| B3 | `/admin/policies` (incl. tester) | [ ] | [ ] | [ ] | [ ] |
| B4 | `/admin/ai-providers` (incl. Configure dialog) | [ ] | [ ] | [ ] | [ ] |
| B5 | `/admin/ai-skills` | [ ] | [ ] | [ ] | [ ] |
| B6 | `/admin/ai-usage` | [ ] | [ ] | [ ] | [ ] |
| B7 | `/admin/feature-flags` | [ ] | [ ] | [ ] | [ ] |
| B8 | `/audit-log` | [ ] | [ ] | [ ] | [ ] |
| B9 | `/helpdesk` (root + tickets/technicians/sla/maintenance/batch/approvals/kb) | [ ] | [ ] | [ ] | [ ] |

### Approach

For each page:
1. Header `title` / `subtitle` → Hebrew
2. KPI tile labels → Hebrew
3. Filter dropdown labels + option labels → Hebrew (preserve raw enum
   values inside the value attribute)
4. DataTable column headers → Hebrew
5. Action button labels (Save / Cancel / Configure / Test connection /
   Enable / Disable / Approve / Reject) → Hebrew
6. Empty-state and error copy → Hebrew

Strings that are **identifiers** stay in English (action_id, skill_id,
setting key, provider id, etc.) so search and audit log entries remain
machine-stable.

---

## Track C — Shared RecordDetail primitive (view / edit / delete / duplicate)

**Symptom.** Today the platform has many list pages but no consistent
detail-pane experience. Every record kind needs its own "view details /
edit / delete / duplicate" affordance, and they're scattered or absent.

**Goal.** One shared primitive that any module drops into a row's
`actions` cell or a slide-over pane. RBAC-gated per action.

### Sub-tasks

| # | Item | Status |
|---|---|---|
| C1 | `components/shared/record-detail/types.ts` — `RecordAction<T>`, `RecordDetailConfig<T>` | [ ] |
| C2 | `components/shared/record-detail/record-detail-pane.tsx` — slide-over with sections + footer actions | [ ] |
| C3 | `components/shared/record-detail/record-actions-menu.tsx` — DropdownMenu for table rows | [ ] |
| C4 | `components/shared/record-detail/use-record-actions.ts` — hook wiring confirm + mutation + toast | [ ] |
| C5 | RBAC: each action gates on `usePermission(action.requiredPermission)` | [ ] |
| C6 | Adoption: `/users` (view + edit + deactivate + duplicate as new-user template) | [ ] |
| C7 | Adoption: `/helpdesk/tickets` (view + edit + delete (admin) + duplicate) | [ ] |
| C8 | Adoption: `/admin/policies` (view + edit + duplicate; delete only system_admin) | [ ] |
| C9 | Adoption: `/admin/ai-skills` (view; edit/delete are out of scope for now) | [ ] |
| C10 | Tests: 1 component test + 1 RBAC integration test per action kind | [ ] |

### Action semantics

| Action | When to show | Default RBAC | Confirm? |
|---|---|---|---|
| View details | always | any read role | no |
| Edit | record is editable + user has write | `org_admin` or per-resource | no |
| Duplicate | record schema can be templated | same as Edit | no |
| Delete | record is soft-deletable | `system_admin` for platform records, `org_admin` for org records | yes (typed-name) |

---

## Track D — Shared-services usage audit

**Goal.** Verify CLAUDE.md's "shared capabilities checklist" is actually
respected across every page. Anywhere it's not, fix or document an
exception per ADR-028.

### Audit checklist (one row = one rule)

| # | Rule | Audit method | Status |
|---|---|---|---|
| D1 | Tables: every page uses `DataTable<T>` (no hand-rolled `<table>`) | grep for `<table` outside `components/ui` | [ ] |
| D2 | Forms: every form uses `PlatformForm` + `usePlatformMutation` | grep for `useState.*loading` adjacent to `try/catch` + toast | [ ] |
| D3 | Mutations: no inline `useState(loading)+catch+toast` patterns | grep for the anti-pattern | [ ] |
| D4 | Permissions: no inline `session.user.role ===` checks | grep for `session.user.role ===` | [ ] |
| D5 | Layout: every page uses `PageShell` | grep for module pages without PageShell import | [ ] |
| D6 | Confirms: no `window.confirm` / `alert` | grep | [ ] |
| D7 | API calls: no raw `fetch` in components | grep for `fetch(` outside `lib/api/` | [ ] |
| D8 | Query keys: no inline string-array keys | grep for `queryKey: [` literal arrays | [ ] |
| D9 | org_id: never in form state for auth | grep for `org_id` in form schemas | [ ] |
| D10 | LLM: no provider SDK in frontend | grep for `OpenAI`/`Anthropic` SDK imports | [ ] |
| D11 | Status badges: every status badge uses `JobStatusBadge` | grep for local `StatusBadge` components | [ ] |

For each violation found: file path, line, fix or exception. Write
findings to `docs/system-upgrade/06-governance/shared-services-audit.md`
and fix in priority order.

---

## Execution order

1. **Track A** first — visible win, mostly mechanical, unblocks demo UX
2. **Track B** next per page — independent, can be batched 2-3 pages per commit
3. **Track C** in parallel with B — design first, then adoption
4. **Track D** as a final sweep — produces a clean baseline

Each commit message MUST cite which checklist rows it closes.
