# Shared Services Audit — 2026-05-06

> Comprehensive audit of CLAUDE.md's "shared capabilities checklist"
> across `app/(dashboard)/**/*.tsx` and `components/**/*.tsx`. Track D
> of `PLATFORM_HARDENING_PLAN.md`.

## Methodology

Eleven anti-pattern rules from CLAUDE.md were grepped against every
TypeScript file in `app/`, `components/`, and `lib/`. Each rule has a
canonical replacement (a shared primitive or hook) that owns the
behaviour. The audit reports violations and the fix that landed.

## Result summary

| # | Rule | Violations found | Status |
|---|---|---|---|
| D1 | Tables: every list page uses `<DataTable>` (no hand-rolled `<table>`) | 1 — `/admin/ai-usage` Recent Events | **Fixed** |
| D2 | Forms: every form uses `<PlatformForm>` + `usePlatformMutation` | 0 | ✅ Clean |
| D3 | Mutations: no inline `useState(loading) + catch + toast` | 0 | ✅ Clean |
| D4 | Permissions: no inline `session.user.role === ...` | 0 | ✅ Clean |
| D5 | Layout: every dashboard page uses `<PageShell>` | 5 false-positives — see notes | ✅ Clean |
| D6 | Confirms: no `window.confirm` / `window.alert` | 0 | ✅ Clean |
| D7 | API calls: no raw `fetch(` in components | 0 | ✅ Clean |
| D8 | Query keys: no inline string-array keys | 14 across 6 files | **Fixed** |
| D9 | `org_id` is never in form state for auth | 0 (only doc-comments confirming the rule) | ✅ Clean |
| D10 | LLM SDK in frontend | 0 | ✅ Clean |
| D11 | Status badges: every page uses `<JobStatusBadge>` | 2 — `/admin/modules`, `/helpdesk/approvals` | **Fixed** |

**Result:** 17 violations across 3 rules, all fixed. 8 of the 11 rules
returned ZERO violations on first pass.

## Fixes that landed

### D1 — raw `<table>` in `/admin/ai-usage`

The Recent Events table used a hand-rolled `<table>` / `<thead>` /
`<tbody>` instead of the shared `<DataTable>` component. Replaced with
a `ColumnDef<UsageEvent>[]` definition fed into the platform's
`<DataTable>` so it gets the standard skeleton, empty state,
RTL-aware pagination, and column-sort behaviour for free.

**Files:** `app/(dashboard)/admin/ai-usage/page.tsx`

### D8 — inline query keys

14 hits across 6 files. New entries added to `lib/api/query-keys.ts`:

```ts
queryKeys.settings.{all, definitions, byCategory, allCategories, one}
queryKeys.featureFlags.{all, definitions, flag, flagWithChain}
queryKeys.policies.{all, list, detail}
queryKeys.search.global
```

Replaced sites:
- `app/(dashboard)/admin/settings/page.tsx` — 3 keys
- `app/(dashboard)/admin/policies/page.tsx` — 2 keys
- `app/(dashboard)/admin/feature-flags/page.tsx` — 4 keys
- `app/(dashboard)/settings/ai/page.tsx` — 1 key
- `components/shell/command-palette.tsx` — 1 key

The `_aiSkillsQueryPrefix` and `_aiProvidersQueryPrefix` patterns
already in `lib/hooks/use-ai-*.ts` are acceptable — they re-use a
single exported prefix constant rather than ad-hoc inline arrays.

### D11 — local `StatusBadge` copies

Two pages had their own `StatusBadge` function. Both moved into the
shared `<JobStatusBadge>` meta map (`components/shared/job-runner/`),
which now covers three status families:

1. Job-runner: `pending` / `queued` / `running` / `success` /
   `succeeded` / `partial` / `failed` / `cancelled`
2. Lifecycle (added Phase 4): `scheduled` / `in_progress` / `completed`
3. Approval flow (Track D): `pending_approval` / `approved` / `rejected`
4. Module registry (Track D): `healthy` / `disabled_by_flag` /
   `unavailable`

`JobStatus` union in `lib/modules/job-runner/types.ts` widened to
include all of the above. `JobStatusBadge` test added 6 cases for the
new status families.

**Files removed:** `StatusBadge` function in
`app/(dashboard)/admin/modules/page.tsx` and
`app/(dashboard)/helpdesk/approvals/page.tsx`. Each replaced with
`<JobStatusBadge status={...} />`.

## False-positives explained

### D5 — pages without `<PageShell>`

5 hits, all intentional:

- `app/(dashboard)/page.tsx` — root dashboard, custom KPI grid layout
  (uses `<motion.div>` directly so the page can choose its own header
  treatment).
- `app/(dashboard)/[...slug]/page.tsx` — coming-soon catch-all, has
  its own minimal layout.
- `app/(dashboard)/users/[id]/page.tsx`,
  `app/(dashboard)/organizations/[id]/page.tsx`,
  `app/(dashboard)/roles/[id]/page.tsx` — detail pages use the
  shared `<DetailHeaderCard>` / `<DetailSection>` /
  `<DetailBackButton>` primitives instead, which is the right choice
  for record details (cap 08 PlatformDetailView).

## Primitive coverage

Every primitive in the catalog is implemented and consumed somewhere:

| Cap | Primitive | File | Tests |
|---|---|---|---|
| 01 | DataGrid (DataTable) | `components/shared/data-table/` | ✅ |
| 02 | Dashboard (KPI tiles) | `components/shared/stats/kpi-card.tsx` | partial |
| 03 | PlatformForm | `components/shared/form/platform-form.tsx` | ✅ |
| 04 | PlatformAction | `components/shared/action-button.tsx` | ✅ |
| 05 | PermissionGate | `components/shared/permission-gate.tsx` | ✅ |
| 07 | PageShell | `components/shared/page-shell/` | ✅ |
| 08 | DetailView | `components/shared/detail-view/` | partial |
| 09 | Timeline | `components/shared/timeline/` | partial |
| 10 | AuditLog client | `lib/api/audit.ts` + `/audit-log` | ✅ |
| 11 | Search/CommandPalette | `components/shell/command-palette.tsx` | ✅ |
| 13 | ApprovalFlow | `/helpdesk/approvals` + cap 27 | ✅ |
| 14 | JobRunner | `components/shared/job-runner/` | ✅ |
| 15 | Wizard | `components/shared/wizard/` | ✅ |
| 16 | Settings Engine | `lib/api/settings.ts` + `/admin/settings` | ✅ |
| 17 | FeatureFlags | `lib/api/feature-flags.ts` + `/admin/feature-flags` | ✅ |
| 18 | ModuleRegistry | `lib/platform/module-registry/` + `/admin/modules` | ✅ |
| 19 | TenantContext | session-based | n/a |
| 21 | ErrorBoundary | `components/shared/error-{boundary,state}.tsx` | partial |
| 22 | API Client | `lib/api/*` + `lib/api/query-keys.ts` | ✅ |
| 27 | Policy Engine | `lib/api/policies.ts` + `/admin/policies` | ✅ |
| 28 | Help/Onboarding | `/help` + `/onboarding` + tour | ✅ |
| 30 | AIProvidersHub (cap 2.1) | `lib/api/ai-providers.ts` + `/admin/ai-providers` | ✅ |
| 2.2 | AISkillRegistry | `lib/platform/ai-skills/` + `/admin/ai-skills` | ✅ |
| 2.3 | AIUsage | `lib/api/ai-usage.ts` + `/admin/ai-usage` | ✅ |
| 2.4 | AI Audit Emitter | `lib/platform/ai-actions/audit-emitter.ts` | ✅ |
| 2.5 | AI Demo Slice | `lib/platform/ai-actions/executors.ts` | ✅ |

## Hooks enforced platform-wide

| Hook / module | Used in | Notes |
|---|---|---|
| `usePlatformMutation` | every mutation site | enforces `usePlatformMutation` over inline `useState(loading)+catch+toast`. Zero violations on grep. |
| `usePermission` | RBAC checks | replaces `session.user.role ===` checks. Zero violations on grep. |
| `queryKeys.*` | every `useQuery` | new entries added by this audit; zero inline string-array keys remain. |
| `useNavGroups` | sidebar + command palette | added Track E; centralizes the nav source of truth. |
| `ConfirmActionDialog` | every dangerous action | enforces over `window.confirm` / `alert`. Zero violations on grep. |
| `FeatureGate` | module-flag gating | every helpdesk subpage; module pages use it. |

## Tests

- vitest: 464 / 464 ✅ (+6 new JobStatusBadge cases)
- typecheck: clean ✅
- coverage gate: PASS ✅

## Open follow-ups (not audit violations, but worth tracking)

- `KpiCard` component test coverage is partial — the card is used on
  every dashboard page; should add component tests.
- `DetailView` primitives (`DetailSection`, `InfoRow`, etc) lack tests.
- `ErrorBoundary` lacks a test that asserts the fallback renders.
- `Timeline` lacks tests.

These are tracked as a future "primitive test coverage" sprint, not
shared-service violations.
