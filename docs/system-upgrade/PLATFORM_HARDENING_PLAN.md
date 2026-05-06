# Platform Hardening Plan — 2026-05-06

> Owner directive (2026-05-06): four hardening tracks across the platform
> on top of the four phases that closed in the GENERIC_AI_PLATFORM_PROGRESS
> file. This document tracks each item until done. Update the checkboxes
> as work lands.

---

## Track E — i18n Foundation (BLOCKING — must precede Track B)

**Symptom.** Every "translation" added so far is ad-hoc — `*_he` fields
scattered through catalogs and Hebrew strings hardcoded inside React
components. Adding a third language (Arabic, English) means hand-editing
dozens of files. There is no language switcher, no persisted preference,
no fallback chain.

**Goal.** A real i18n stack the entire platform sits on:

- `next-intl` (already in `package.json` 4.9.1, never imported)
- Flat namespaced JSON message catalogs per locale under `i18n/messages/`
- `useTranslations(namespace)` hook in every page
- Language switcher in the topbar — choice persists via cap 16 setting
  `ui.locale` (rides on Track A's localStorage shim)
- `<html lang>` + `<html dir>` updates dynamically on locale change
- Default locale: `he`. Initial locales: `he`, `en`. Future-ready for `ar`.

### Architecture

```
i18n/
  config.ts              ← locales list, default, RTL flag per locale, type-safe key map
  request.ts             ← server config for next-intl (when SSR routes need it)
  messages/
    he.json              ← Hebrew (default)
    en.json              ← English fallback
    ar.json              ← (future)

lib/
  i18n/
    locale-store.ts      ← Zustand-persisted locale + language switcher state
    use-locale.ts        ← convenience hook + html-attr side-effect

components/
  providers/
    intl-provider.tsx    ← client-side NextIntlClientProvider that picks
                           messages from the locale store + applies <html lang dir>
  shell/
    language-switcher.tsx ← topbar button (HE | EN | ...)
```

### Key conventions

- **Namespace per surface**: `common`, `nav`, `help`, `wizard`, `audit`,
  `helpdesk`, `admin.settings`, `admin.modules`, ...
- **Identifiers stay as data, not translation keys**: `setting.key`,
  `provider.id`, `skill.id`, `action_id` are still raw enum strings —
  they're stable identifiers, not user-facing copy.
- **Catalog content** (e.g. `lib/docs/content.ts` quick-starts) becomes
  pure key references; the page resolves via `t("help.modules.helpdesk.title")`.
- **Fallback chain**: requested locale → `en` (canonical) → key (debugging).

### Sub-tasks

| # | Item | Status |
|---|---|---|
| E1 | `i18n/config.ts` (locales + RTL map + type-safe key shape) | [x] |
| E2 | `i18n/messages/he.json` + `en.json` — initial keys covering existing Hebrew strings | [x] |
| E3 | `lib/i18n/locale-store.ts` (Zustand persist, default `he`) | [x] |
| E4 | `components/providers/intl-provider.tsx` (client) + wire into `app/layout.tsx` (incl. dynamic `<html lang dir>` side-effect) | [x] |
| E5 | Convert `/help` page + `lib/docs/content.ts` to use translation keys (catalog now references keys, not embedded copy) | [x] |
| E6 | Convert `components/shared/wizard/wizard.tsx` (Skip/Next/Back/Cancel/Finish/validation labels) | [x] |
| E7 | Convert `components/shell/shortcuts-dialog.tsx` | [x] |
| E8 | Convert sidebar nav (`components/shell/nav-items.ts` titles) — replace inline Hebrew titles with translation keys | [ ] |
| E9 | `components/shell/language-switcher.tsx` + topbar slot | [x] |
| E10 | Persist locale via cap 16 setting `ui.locale` (definition + sync hook) — deferred (Zustand+localStorage already persists; cap 16 sync is a server-source nice-to-have) | [ ] |
| E11 | Convert `/onboarding` wizard step labels + onboarding-tour dialog copy | [ ] |
| E12 | Convert `/admin/settings` chrome + filter labels | [ ] |
| E13 | Convert `/admin/modules` chrome | [ ] |
| E14 | Convert `/admin/policies` chrome (incl. tester) | [ ] |
| E15 | Convert `/admin/feature-flags` chrome | [ ] |
| E16 | Convert `/admin/ai-providers` chrome (incl. Configure dialog) | [ ] |
| E17 | Convert `/admin/ai-skills` chrome | [ ] |
| E18 | Convert `/admin/ai-usage` chrome (KPI tiles, range selector, budget banner) | [ ] |
| E19 | Convert `/audit-log` chrome (KPI tiles, category filter, table headers) | [ ] |
| E20 | Convert `/helpdesk/*` chrome (root + tickets/technicians/sla/maintenance/batch/approvals/kb) | [ ] |
| E21 | Convert `/settings/ai` chrome | [ ] |
| E22 | Tests: 1 test that switches locale and asserts text changes; 1 test that fallback returns the key for missing translations | [partial — `lib/test-utils/intl.tsx` helper added; locale-switch test pending] |
| E23 | Tracker: ensure no inline Hebrew/English in `/app/(dashboard)/**/*.tsx` (grep audit) | [ ] |

### Done definition

- A user toggling the language switcher sees every chrome string update
  without a refresh.
- The `<html lang>` and `<html dir>` attributes update accordingly (rtl
  for `he` and `ar`, ltr for `en`).
- A grep for hardcoded Hebrew (`/[א-ת]/`) inside `app/(dashboard)/**/*.tsx`
  and `components/**/*.tsx` returns zero hits, except for translation
  message files.
- Every existing test still passes.

### Order — Track B is folded into E

Track B (the per-page Hebrew chrome work) becomes E12-E20 of this track.
Don't execute Track B independently anymore.

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

1. **Track A** ✅ done (commit 6f6c575)
2. **Track E** — i18n foundation (BLOCKING). Track B is folded in here.
3. **Track C** — Shared RecordDetail primitive (can run after E foundation
   is in place; the primitive's strings will use `t()`)
4. **Track D** — Audit shared services usage (final sweep)

Each commit message MUST cite which checklist rows it closes.
