# 26 — Platform Capabilities Catalog

_Format: Reusable platform capability specifications_
_Last updated: 2026-04-24 (R025 — AI Capability Context)_
_Round: 014 (created), 023 (reviewed), 024 (AI Action Platform), 025 (AI Capability Context)_

---

## Purpose and Scope

This catalog documents every **horizontal capability** that must be built once and reused across all 19 platform modules. A capability is a building block that is domain-agnostic — it provides structure, interaction pattern, or infrastructure that any module can compose without re-implementing.

**Relationship to Doc 25 (Open-Source Capability Layer):** Doc 25 governs *library choices* (which npm package to use for tables, forms, charts). This document governs *implementation patterns* — the named, versioned, platform-owned components and hooks that wrap those libraries and enforce platform conventions.

---

## Mandatory Rule: Capability-First Design

> **Before building any new module feature, ask: does this belong in the Platform Capabilities Catalog?**
>
> If yes — build or extend the shared capability first, then use it in the module.
> If no — build it module-local with a comment explaining why it is not shared.
>
> A module-local implementation that is used in 2+ modules automatically becomes a candidate for promotion to this catalog. File a backlog item when you notice the duplication.

This rule is enforced by code review and CI. Reviewers must reject PRs that duplicate existing capabilities.

**Full enforcement plan:** `docs/system-upgrade/43-shared-services-enforcement.md` (ADR-028, R032)
**PR checklist:** `docs/system-upgrade/43-shared-services-enforcement.md §11`
**AI-agent guardrails:** `docs/system-upgrade/43-shared-services-enforcement.md §12`

---

## Capability Summary Table

| # | Capability | Priority | Status | Round | Build-Order Round |
|---|-----------|----------|--------|-------|------------------|
| 01 | [PlatformDataGrid](#01-platformdatagrid) | **now** | ✅ Implemented | 012 | — |
| 02 | [PlatformDashboard](#02-platformdashboard) | **now** | ✅ Implemented | 015 | R041G (KpiCard) |
| 03 | [PlatformForm](#03-platformform) | **now** | ✅ Implemented | 017 | — |
| 04 | [PlatformAction](#04-platformaction) | **now** | 🔵 Partial | 017 | R023 (ActionButton) |
| 05 | [PermissionGate / Access Control UI](#05-permissiongate--access-control-ui) | **now** | ✅ Implemented | 012 | — |
| 06 | [PlatformImportExport](#06-platformimportexport) | **next** | 🔵 Partial | 012 | R031 (full) |
| 07 | [PlatformPageShell](#07-platformpageshell) | **now** | ✅ Implemented | 015 | — |
| 08 | [PlatformDetailView](#08-platformdetailview) | **now** | 🔵 Partial | 015 | R023 (extract) |
| 09 | [PlatformTimeline](#09-platformtimeline) | **now** | ✅ Implemented | R041E | — |
| 10 | [PlatformAuditLog](#10-platformauditlog) | **next** | ⬜ Pending | — | R026 |
| 11 | [PlatformSearch / Command Palette](#11-platformsearch--command-palette) | **next** | 🔵 Frontend mock + spec (2026-05-03) — backend port pending | — | R032 |
| 12 | [PlatformNotifications](#12-platformnotifications) | **now** | ✅ Implemented \| R042 | — | R024 |
| 13 | [PlatformApprovalFlow](#13-platformapprovalflow) | **now** | ⬜ Pending | — | R028 |
| 14 | [PlatformJobRunner](#14-platformjobrunner) | **next** | 🔵 Frontend primitives shipped (2026-05-03) — `JobStatusBadge` + `JobProgress` + `useJobPolling`. Consumed by helpdesk batch tasks page. | — | R031 |
| 15 | [PlatformWizard](#15-platformwizard) | **later** | ⬜ Pending | — | Phase 3 |
| 16 | [PlatformSettings Engine](#16-platformsettings-engine) | **next** | ⬜ Pending | — | R029 |
| 17 | [PlatformFeatureFlags](#17-platformfeatureflags) | **now** | ⬜ Pending | — | R023 |
| 18 | [PlatformModuleRegistry](#18-platformmoduleregistry) | **later** | 🔵 Partial | 013 | Phase 3 |
| 19 | [PlatformTenantContext](#19-platformtenantcontext) | **now** | ✅ Implemented | 007 | — |
| 20 | [PlatformPrivacy / PII Masking](#20-platformprivacy--pii-masking) | **later** | ⬜ Pending | — | GDPR sprint |
| 21 | [PlatformErrorBoundary / ErrorState](#21-platformerrorboundary--errorstate) | **now** | ✅ Implemented | 015 | — |
| 22 | [PlatformAPI Client](#22-platformapi-client) | **now** | ✅ Implemented | 008 | — |
| 23 | [PlatformRealtime](#23-platformrealtime) | **next** | ⬜ Pending | — | R030 |
| 24 | [PlatformFileManager](#24-platformfilemanager) | **later** | ⬜ Pending | — | R07 Knowledge |
| 25 | [PlatformIntegration Framework](#25-platformintegration-framework) | **later** | ⬜ Pending | — | R18 Integrations |
| 26 | [PlatformBilling / Usage Meter](#26-platformbilling--usage-meter) | **next** | ⬜ Pending | — | R08 Billing |
| 27 | [PlatformPolicy Engine](#27-platformpolicy-engine) | **now** | ⬜ Pending | — | R028 |
| 28 | [PlatformHelp / Onboarding](#28-platformhelp--onboarding) | **later** | ⬜ Pending | — | Post-launch |
| 29 | [PlatformTest Harness](#29-platformtest-harness) | **later** | ⬜ Pending | — | R06 ALA |
| 30 | [AIProvidersHub](#30-aiproviders-hub) | **now** | ⬜ Pending | — | R035 (backend), R036 (UI) |
| 30 | [PlatformDeveloper Docs / Agent Docs](#30-platformdeveloper-docs--agent-docs) | **later** | ⬜ Pending | — | Phase 3 |

---

## 01 — PlatformDataGrid

**Status:** ✅ Implemented (Round 012) | **Priority:** now

**Purpose:** Server-side paginated data table used on every module list page. Wraps `@tanstack/react-table` v8 with standard skeleton, empty state, error row, RTL-aware pagination, and column sort behavior.

**Modules that use it:** Users (01), Organizations (02), Roles (03), Helpdesk (04), AI Agents (05), ALA (06), Knowledge (07), Billing (08), Audit Log (13), API Keys (14), Departments (15), Voice Calls (16), Automation (17)

**Libraries:** `@tanstack/react-table` v8, `@tanstack/react-virtual` (pending — for >500-row tables)

**Canonical implementation:**
- `components/shared/data-table/data-table.tsx` — `DataTable<T>` generic component
- `components/shared/data-table/pagination.tsx` — RTL-aware `TablePagination`
- `components/shared/data-table/table-skeleton.tsx` — `TableSkeleton`
- `components/shared/data-table/index.ts` — barrel

**First implementation scope (Round 012 — done):** Generic `DataTable<T>`, skeleton rows, empty state, error row, RTL pagination (ChevronRight = previous). Users and Organizations both use it.

**Security/multi-tenant:** None inherent — the table renders what it receives. The API layer must scope by `org_id`; this component does not. Never filter `data` here by org — that belongs in the API.

**AI-agent maintainability:** Each module defines its own `ColumnDef<T>[]` locally — the shared table only owns the shell. File size for the core table: ≤150 lines. Columns stay in the module's `*-table.tsx` file.

---

## 02 — PlatformDashboard

**Status:** 🔵 Partial | **Priority:** now

**Purpose:** Composable dashboard layout with stat card strip, chart row, and optional health widget grid. Not a fixed layout — modules compose it from primitives. A `StatCard` and `ChartCard` wrapper eliminate repeated chart boilerplate.

**Modules that use it:** Dashboard (0), Billing (08), System Health (10), Metrics (12), ALA (06)

**Libraries:** `recharts` v3 (already installed), `react-grid-layout` (deferred to Phase 3 for drag-resize dashboards)

**Canonical files (to build):**
- `components/shared/stat-card.tsx` — `StatCard` (icon, value, label, color variant, trend arrow)
- `components/shared/chart-card.tsx` — `ChartCard` (title, subtitle, children: any recharts chart)
- `components/shared/health-grid.tsx` — `HealthGrid` (service status tiles)

**First implementation scope:**
1. Extract `StatChip` pattern (used inline in Users and Organizations pages) into `StatCard` with `size="chip"` variant
2. Add `ChartCard` wrapper used in Dashboard and Billing
3. `HealthGrid` deferred until System Health module (10)

**Security/multi-tenant:** Stat values fetched from org-scoped endpoints. Never aggregate across orgs client-side.

**AI-agent maintainability:** `StatCard` ≤60 lines. `ChartCard` ≤80 lines. Dashboard composition happens at page level — never a mega-component.

---

## 03 — PlatformForm

**Status:** ✅ Implemented (Round 017–019) | **Priority:** now (validated on Users, Roles, Organizations)

**Purpose:** Standard form shell wrapping `react-hook-form` + `zod` with platform-consistent layout: label-above RTL inputs, inline field errors, disabled-during-submit state, success/error toast feedback, audit header attachment on submit.

**Modules that use it:** Users (01) create/edit, Organizations (02) create/edit, Roles (03), Helpdesk (04) ticket create, Knowledge (07) article edit, Settings (09), Onboarding (wizard), API Keys (14)

**Libraries:** `react-hook-form` v7, `zod` v4 (both already installed), `sonner` for toasts (already installed)

**Canonical files (to build):**
- `components/shared/form/platform-form.tsx` — `PlatformForm` wrapper (handles submit state, error boundary, audit headers)
- `components/shared/form/form-field.tsx` — `PlatformFormField` (label + input + error message, RTL-aligned)
- `components/shared/form/form-section.tsx` — `PlatformFormSection` (titled group of fields with separator)
- `lib/hooks/use-platform-mutation.ts` — `usePlatformMutation` wrapping TanStack `useMutation` with toast + audit header injection

**First implementation scope:**
1. `PlatformFormField` — label, input, zod-driven error message, RTL logical layout
2. `PlatformForm` — wraps RHF `<form>`, adds `aria-busy` during submit, fires toast on success/error
3. `usePlatformMutation` — wraps `useMutation`, calls `buildAuditHeaders`, fires `toast.success`/`toast.error`
4. First consumer: Users Phase B create/edit

**Security/multi-tenant:** `org_id` must NEVER appear as a form field — it must be injected from session inside the mutation function, not from form state. Enforce this by convention in `usePlatformMutation`.

**AI-agent maintainability:** Schema definitions (zod) live in `lib/modules/<module>/schemas.ts`, never inlined in page components. Form shell ≤100 lines. Field component ≤60 lines.

---

## 04 — PlatformAction

**Status:** 🔵 Partial (Round 017–018) | **Priority:** now

**Purpose:** Standard pattern for all UI-initiated write operations: button → confirm dialog (optional) → mutation → toast → cache invalidation. Eliminates the repeated pattern of `useState(loading)` + `catch(e)` + `toast.error` in every page component.

**Modules that use it:** Every module with write operations — approve/reject (Helpdesk, Users), delete (Users, Orgs, API Keys), enable/disable (Orgs, FeatureFlags), send (ALA), retry (JobRunner)

**Libraries:** `sonner` (toasts), `@radix-ui/react-alert-dialog` via shadcn (confirm dialogs)

**Canonical files (to build):**
- `lib/hooks/use-platform-mutation.ts` — shared with PlatformForm (see §03)
- `components/shared/confirm-dialog.tsx` — `ConfirmDialog` (destructive action confirmation: title, description, confirm label, variant)
- `components/shared/action-button.tsx` — `ActionButton` (button + loading spinner + disabled state during mutation)

**Implemented consumers (R017–R018):**
- `usePlatformMutation` ✅ — `lib/hooks/use-platform-mutation.ts`
- `ConfirmActionDialog` ✅ — `components/shared/confirm-action-dialog.tsx`
- Users create/edit (R017), Roles create/edit (R018)

**Still needed:**
- `ActionButton` component — loading spinner + disabled state during mutation

**Security/multi-tenant:** Confirm dialogs must show the resource name (e.g., "Delete organization Acme?") — not just a generic message — to prevent accidental cross-tenant actions in system-admin views.

**AI-agent maintainability:** `ConfirmDialog` ≤80 lines. `ActionButton` ≤40 lines. Never mix data fetching with action logic in the same component.

---

## 05 — PermissionGate / Access Control UI

**Status:** ✅ Implemented (Round 012) | **Priority:** now

**Purpose:** Declarative access control in JSX — hides or disables UI elements based on role, permission string, or admin flag. Prevents accidental rendering of privileged actions to unprivileged users.

**Modules that use it:** All 19 modules — admin actions, system-admin-only pages, destructive buttons

**Libraries:** `next-auth` (session data), internal `usePermission()` hook

**Canonical implementation:**
- `components/shared/permission-gate.tsx` — `PermissionGate` (props: `role`, `permission`, `adminOnly`, `systemAdminOnly`, `mode: "hide"|"disable"`, `fallback`)
- `lib/hooks/use-permission.ts` — `usePermission()` (returns `isRole`, `can`, `isAdmin`, `isSystemAdmin`, `isLoading`)
- `lib/auth/rbac.ts` — `hasRole()`, `hasPermission()`, `isSystemAdmin()` pure functions

**Security/multi-tenant:** `PermissionGate` is defense-in-depth only — it does NOT replace backend authorization. Every write endpoint must enforce `@jwt_required` + role check independently of what the frontend renders.

**AI-agent maintainability:** The gate is declarative; authorization logic stays in `lib/auth/rbac.ts`. Do not add org-level logic to the gate — that belongs in the route middleware.

---

## 06 — PlatformImportExport

**Status:** 🔵 Partial (CSV export util built, import not started) | **Priority:** next

**Purpose:** Governed CSV and JSONL import/export for module data. Export: button → progress → download. Import: file picker → preview → dry-run validation → confirm → progress.

**Modules that use it:** Users (01), Organizations (02), Helpdesk (04) tickets, Knowledge (07) articles, Billing (08) invoices, Audit Log (13), Automation (17) task configs

**Libraries:** `papaparse` (pending install), `xlsx` (opt-in for Excel output), browser `Blob` + `<a>` for download

**Canonical files:**
- `lib/utils/csv.ts` — `exportToCsv()`, `rowsToCsv()`, `downloadCsv()` (implemented Round 012, BOM for Hebrew Excel compat)
- `components/shared/export-button.tsx` — `ExportButton` (to build: dropdown: CSV / Excel)
- `components/shared/import-modal.tsx` — `ImportModal` (to build: file drop → parse → preview table → validate → submit)
- `lib/utils/import-validator.ts` — `validateImportRows()` (to build: zod schema-based row validation)

**First implementation scope:**
1. `ExportButton` — wraps existing `exportToCsv()`; shows spinner during large exports; dropdown CSV/Excel
2. Used first in: Users list page (Phase B) and Organizations list page

**Security/multi-tenant:** Export MUST include only rows scoped to `g.jwt_user.org_id`. Never accept `org_id` from import CSV rows — always override with the authenticated user's `org_id`. Import endpoint must be system-admin-only for cross-org data.

**AI-agent maintainability:** Import validation schema defined in module's `schemas.ts`, passed to `ImportModal` as a prop. No schema knowledge in the shared component itself.

---

## 07 — PlatformPageShell

**Status:** ✅ Implemented (Round 015) | **Priority:** now

**Purpose:** Standard page layout wrapping every `(dashboard)` module page: sticky header area (icon + title + subtitle + action buttons), breadcrumb, stat chips strip, and content area. Eliminates the repeated header+motion boilerplate currently duplicated in Users, Organizations, and Dashboard pages.

**Modules that use it:** All 19 modules

**Libraries:** `framer-motion` (already installed), `lucide-react`

**Canonical files:**
- `components/shared/page-shell/page-shell.tsx` — `PageShell` (props: `icon`, `title`, `subtitle`, `actions?: ReactNode`, `stats?: ReactNode`, `children`)
- `components/shared/page-shell/index.ts` — barrel export

**First implementation scope:**
Extracted from `users/page.tsx` and `organizations/page.tsx` in R015. Both pages use `PageShell` as consumers.

**Security/multi-tenant:** No auth logic here — purely presentational. `PermissionGate` wraps content inside the shell, not the shell itself.

**AI-agent maintainability:** `PageShell` ≤80 lines. All motion constants (`ease`, `duration`) defined in `lib/ui/motion.ts` — not inline per-page.

---

## 08 — PlatformDetailView

**Status:** 🔵 Partial (pattern used in Users and Orgs detail pages, not yet extracted) | **Priority:** now

**Purpose:** Standard detail page layout: back button, loading skeleton, error card, header card (avatar/icon + name + badges), and one or more section cards (labeled rows of `icon + label + value`). Eliminates the `InfoRow` + `BoolBadge` helpers duplicated in user and org detail pages.

**Modules that use it:** Users (01), Organizations (02), Helpdesk (04) ticket/session, AI Agents (05) investigation, Knowledge (07) article, Billing (08) invoice, API Keys (14), Voice (16)

**Libraries:** `lucide-react`, shadcn `Separator`

**Canonical files (to build):**
- `components/shared/detail-view/detail-back-button.tsx` — `DetailBackButton`
- `components/shared/detail-view/detail-header-card.tsx` — `DetailHeaderCard` (icon/avatar, name, subtitle, badges slot)
- `components/shared/detail-view/detail-section.tsx` — `DetailSection` (title + separator + children)
- `components/shared/detail-view/detail-info-row.tsx` — `DetailInfoRow` (icon + label + value)
- `components/shared/detail-view/bool-badge.tsx` — `BoolBadge` (yes/no checkmark)
- `components/shared/detail-view/index.ts` — barrel

**First implementation scope:**
Extract from `app/(dashboard)/users/[id]/page.tsx` and `app/(dashboard)/organizations/[id]/page.tsx` — both have identical `InfoRow` and `BoolBadge` helpers. Extract to shared, update both callers.

**Security/multi-tenant:** Detail pages must rely on the Flask 403 response (backend scopes by `org_id`) — not on client-side org_id checks. The component renders whatever the API returns.

**AI-agent maintainability:** `DetailInfoRow` ≤40 lines. `DetailSection` ≤30 lines. No business logic in any detail component.

---

## 09 — PlatformTimeline

**Status:** ✅ Implemented (R041E) | **Priority:** next

**Purpose:** Vertical event timeline for displaying ordered sequences of events — helpdesk session activity, ticket history, agent investigation steps, user login history, approval chain. Each event has: timestamp, icon, actor, description, optional detail expansion.

**Modules that use it:** Helpdesk (04) session timeline, AI Agents (05) step log, Audit Log (13), Voice (16) call events, Automation (17) execution history

**Libraries:** `lucide-react` (icons), `framer-motion` (item animation), `lib/utils/format.ts` (`formatRelativeTime`)

**Canonical files (to build):**
- `components/shared/timeline/timeline.tsx` — `PlatformTimeline` (props: `events: TimelineEvent[]`, `isLoading?`)
- `components/shared/timeline/timeline-event.tsx` — `TimelineEvent` (timestamp, icon, actor, description, expandable detail)
- `components/shared/timeline/timeline-skeleton.tsx` — skeleton rows
- `components/shared/timeline/types.ts`

**First implementation scope:**
Build when Helpdesk module (04) begins. Session activity timeline is the first consumer.

**Security/multi-tenant:** Events fetched from org-scoped endpoints. Never show events from other orgs. Actor names/IDs must be resolved server-side — never expose user IDs from other orgs to client.

**AI-agent maintainability:** Event type discriminator via `type` field — each event type maps to an icon and color in a config map, not a switch statement.

---

## 10 — PlatformAuditLog

**Status:** ⬜ Pending | **Priority:** next

**Purpose:** Paginated, filterable audit log viewer. Used both as a standalone module page (`/logs`) and as an embedded panel inside detail pages (e.g., "Recent activity for this ticket"). Renders the `UserActivity` table with actor, action, target, timestamp, IP, org context.

**Modules that use it:** Audit Log (13) as primary page, Users (01) detail, Helpdesk (04) session detail, AI Agents (05) action log, Settings (09)

**Libraries:** `@tanstack/react-table` v8 via `DataTable<T>`, `lib/utils/format.ts`

**Canonical files (to build):**
- `components/shared/audit-log/audit-log-table.tsx` — `AuditLogTable` (uses `DataTable<AuditEntry>`, pre-defined columns: actor, action, target, timestamp, IP)
- `components/shared/audit-log/audit-action-badge.tsx` — `AuditActionBadge` (color-coded by action category: create/update/delete/login/admin)
- `lib/modules/audit/types.ts`
- `lib/api/audit.ts`

**First implementation scope:**
Build when Audit Log module (13) is started. `AuditLogTable` is the primary deliverable.

**Security/multi-tenant:** System admins see all-org logs; non-system-admins see own-org only. The Flask endpoint enforces this — the component is org-agnostic. NEVER allow client-side org_id filtering in the audit log — that would allow an attacker to bypass the server scoping.

**AI-agent maintainability:** Columns are fixed (defined in `AuditLogTable`) — don't make them configurable via props without a strong reason.

---

## 11 — PlatformSearch / Command Palette

**Status:** ⬜ Pending | **Priority:** next

**Purpose:** Global `⌘K` / `Ctrl+K` command palette that searches across all modules: users, tickets, KB articles, orgs. Also handles navigation shortcuts and recent-page recall. Enables power-user workflows without context switching.

**Modules that use it:** Global (shell-level), Helpdesk (04), Knowledge (07), Users (01), AI Agents (05)

**Libraries:** `cmdk` (already in shadcn dependencies), `@tanstack/react-query` for debounced search queries

**Canonical files (to build):**
- `components/shell/command-palette.tsx` — `CommandPalette` (keyboard listener + `cmdk` Dialog)
- `lib/api/search.ts` — `searchGlobal(query)` → `/api/proxy/search?q=...`
- `lib/hooks/use-command-palette.ts` — Zustand store for open/close state

**First implementation scope:**
1. Navigation shortcuts only (no API search) — keyboard open, module quick-nav
2. Full search (users, tickets, KB) added when Helpdesk + Knowledge modules are built

**Security/multi-tenant:** Search API must be org-scoped on the Flask side. The command palette sends user's `org_id` from session — never from a URL param or state.

**AI-agent maintainability:** Each module registers its search result type in a central config array — not by conditionally rendering inside the palette component. Pattern: plugin architecture, not if/else chains.

---

## 12 — PlatformNotifications

**Status:** ✅ Implemented (R042) | **Priority:** now

**Purpose:** Notification bell in the app header, real-time badge count, notification drawer/popover with unread items. Notifications include: approval requests, completed AI investigations, session escalations, billing alerts.

**Modules that use it:** Helpdesk (04) approval requests, AI Agents (05) investigation complete, Billing (08) quota alerts, System Health (10) service down

**Libraries:** `sonner` (toast — already installed), `@radix-ui/react-popover` via shadcn, custom SSE hook (see PlatformRealtime §23)

**Canonical files:**
- `components/shell/notification-bell.tsx` — `NotificationBell` (header icon with badge count) ✅
- `components/shell/notification-drawer.tsx` — `NotificationDrawer` (popover with unread list) ✅
- `lib/hooks/use-notifications.ts` — 30s polling + mark-read mutations ✅
- `lib/api/notifications.ts` — `fetchNotifications()`, `markNotificationRead(id)`, `markAllNotificationsRead()` ✅
- `lib/modules/notifications/types.ts` — `Notification`, `NotificationType`, response envelopes ✅

**First implementation scope:**
1. Polling-based (30s interval) unread count badge on header bell
2. Drawer with notification list (action required / info)
3. SSE upgrade when `PlatformRealtime` (§23) is built

**Security/multi-tenant:** Notifications are org-scoped AND user-scoped. A technician only sees tickets assigned to them; system admins see all. Enforce on API; component renders only what it receives.

**AI-agent maintainability:** `NotificationBell` ≤60 lines, `NotificationDrawer` ≤120 lines. Notification types discriminated by `type` field in data — not by conditional rendering in the component.

---

## 13 — PlatformApprovalFlow

**Status:** ⬜ Pending | **Priority:** next

**Purpose:** UI for the helpdesk approval workflow: pending approval queue, approval modal with tool invocation details, approve/reject actions, post-approval status tracking. Maps to `tool_invocations` + `helpdesk_sessions.status = 'waiting_approval'` in the backend.

**Modules that use it:** Helpdesk (04) primary consumer, AI Agents (05) tool approval display

**Libraries:** shadcn `Dialog`, `react-hook-form` + `zod` (approval rejection reason), `sonner`

**Canonical files (to build):**
- `components/shared/approval/approval-queue-table.tsx` — pending approvals `DataTable`
- `components/shared/approval/approval-modal.tsx` — tool invocation detail + approve/reject form
- `components/shared/approval/approval-status-badge.tsx` — status: pending/approved/denied/failed
- `lib/modules/approvals/types.ts`
- `lib/api/approvals.ts`

**First implementation scope:**
Build as part of Helpdesk module (04). Not before.

**Security/multi-tenant:** Approval actions must enforce: only the assigned technician or system admin can approve. The backend enforces this via `initiator_user_id = session.technician_user_id`. The frontend must not show approve/reject buttons to users who cannot act — use `PermissionGate`.

**AI-agent maintainability:** `ApprovalModal` is a detail display + action form only — it does not fetch the tool invocation data itself; the parent passes it. Props-down, events-up.

---

## 14 — PlatformJobRunner

**Status:** ⬜ Pending | **Priority:** next

**Purpose:** UI for long-running background jobs: Celery task progress display, job status polling, completion/failure toasts, job history list. Used for: module import/export, AI investigation, bulk user operations, RAG ingestion.

**Modules that use it:** Module Export/Import (Phase 3.5), AI Agents (05) investigation progress, Knowledge (07) RAG ingestion, Automation (17) execution runs

**Libraries:** `@tanstack/react-query` (polling with `refetchInterval`), `sonner`, shadcn `Progress`

**Canonical files (to build):**
- `components/shared/job-runner/job-progress.tsx` — `JobProgress` (progress bar + status label + log tail)
- `components/shared/job-runner/job-history-table.tsx` — `JobHistoryTable` (past jobs with status, duration, rows affected)
- `components/shared/job-runner/job-status-badge.tsx` — `JobStatusBadge` (pending/running/success/failed/cancelled)
- `lib/hooks/use-job-polling.ts` — `useJobPolling(jobId)` — polls `/api/jobs/:id` until terminal state
- `lib/api/jobs.ts`

**First implementation scope:**
`JobProgress` + `useJobPolling` built when Module Export/Import (Phase 3.5) starts.

**Security/multi-tenant:** Job IDs must be org-scoped on the API. A user cannot poll another org's job ID. Include `org_id` scoping in the jobs endpoint.

**AI-agent maintainability:** `useJobPolling` stops polling automatically on terminal state (`success`/`failed`/`cancelled`). Never use `setInterval` — use `refetchInterval` in TanStack Query.

---

## 15 — PlatformWizard

**Status:** ⬜ Pending | **Priority:** next

**Purpose:** Multi-step wizard shell: step indicator, prev/next navigation, step validation before advance, step-specific content slot, final summary + submit. Used for org onboarding, new ticket creation flow, integration setup.

**Modules that use it:** Onboarding (new org setup), Integrations (18) connector setup, Helpdesk (04) new session, Settings (09) advanced configuration flows

**Libraries:** `react-hook-form` v7 (per-step validation), `zod` (step schemas), `framer-motion` (step transitions)

**Canonical files (to build):**
- `components/shared/wizard/platform-wizard.tsx` — `PlatformWizard` (props: `steps: WizardStep[]`, `onComplete`)
- `components/shared/wizard/wizard-step-indicator.tsx` — step progress bar with labels
- `components/shared/wizard/wizard-nav.tsx` — prev/next/submit buttons
- `lib/hooks/use-wizard.ts` — step state machine: current step, visited steps, validation state

**First implementation scope:**
Build when Onboarding module starts. First consumer: new-org setup wizard (name + billing plan + admin user + integrations).

**Security/multi-tenant:** Wizard completion POSTs to a single backend endpoint with the full wizard payload — org_id always from session, never from wizard form state.

**AI-agent maintainability:** Each wizard step is a self-contained component that receives `form: UseFormReturn` and renders its fields. Steps don't know about each other. Validation schema per step defined in `schemas.ts` not inline.

---

## 16 — PlatformSettings Engine

**Status:** ⬜ Pending | **Priority:** next

**Purpose:** Standard settings page layout: sidebar navigation (sections), content area, each section is a form card, save per-section or global save. Used by: org settings, AI provider settings, notification preferences, system admin settings.

**Modules that use it:** Settings (09) primary, AI Provider Settings (ai-settings), Helpdesk (04) escalation rules, Billing (08) plan settings

**Libraries:** `react-hook-form` + `zod`, shadcn `Switch`, `Select`, `Slider`

**Canonical files (to build):**
- `components/shared/settings/settings-layout.tsx` — `SettingsLayout` (sidebar nav + content area)
- `components/shared/settings/settings-section.tsx` — `SettingsSection` (title + description + form card)
- `components/shared/settings/settings-item.tsx` — `SettingsItem` (label + description + control: switch/select/input)
- `lib/hooks/use-settings-form.ts` — wraps `usePlatformMutation` with dirty-tracking and auto-save debounce

**First implementation scope:**
Build when Settings module (09) starts. The AI Provider Settings page is the first consumer.

**Security/multi-tenant:** Settings endpoints must be org-scoped. System settings (feature flags, global AI config) are system-admin only — enforce via `PermissionGate systemAdminOnly`.

**AI-agent maintainability:** Settings sections are independent forms — never one mega-form for an entire settings page. Each section saves independently to avoid "lost changes" UX issues.

---

## 17 — PlatformFeatureFlags

**Status:** ⬜ Pending | **Priority:** now

**Purpose:** Client-side feature flag evaluation using the platform's `feature_config` table. Provides `useFeatureFlag(flag: string)` hook and `<FeatureFlag flag="x">` JSX gate. Flags control: beta features, plan-gated functionality, org-specific overrides.

**Modules that use it:** All modules — flags gate new features before full rollout, plan-based feature visibility (Billing 08), org-specific AI capabilities

**Libraries:** Internal (no third-party library) — fetches from `/api/proxy/admin/feature-config` which reads `feature_config:{org_id}` from Redis cache

**Canonical files (to build):**
- `lib/hooks/use-feature-flag.ts` — `useFeatureFlag(flag)` returns `boolean`
- `components/shared/feature-flag.tsx` — `<FeatureFlag flag="x">` JSX wrapper
- `lib/api/feature-config.ts` — `fetchFeatureConfig()` fetches org feature flags (cached via TanStack Query)

**First implementation scope:**
1. `fetchFeatureConfig()` + TanStack Query cache (staleTime: 5min)
2. `useFeatureFlag()` hook reading from cache
3. `<FeatureFlag>` wrapper component
4. Add to `QueryClientProvider` initialization: prefetch feature flags on app load

**Security/multi-tenant:** Feature flags are org-scoped. The Flask endpoint (`feature_config:{org_id}`) must be scoped to `g.jwt_user.org_id`. Never allow client-side org_id override for flag evaluation.

**AI-agent maintainability:** Flag names are string literals — define all known flags in `lib/api/feature-config.ts` as a typed const so AI agents know what flags exist.

---

## 18 — PlatformModuleRegistry

**Status:** 🔵 Partial (`module.manifest.json` files exist per module) | **Priority:** next

**Purpose:** Runtime-accessible registry of all installed platform modules: their routes, permissions, owned tables, and feature flag requirements. Enables: dynamic nav building, module health checks, graceful degradation when a module is not licensed.

**Modules that use it:** Shell (nav), Settings (09) module management, System Health (10), Feature Flags (17)

**Libraries:** None — pure TypeScript module manifests + loader

**Canonical files (to build):**
- `lib/modules/registry.ts` — `loadModuleRegistry()` reads all `module.manifest.json` files; exports `ModuleRegistry` type
- `lib/hooks/use-module-registry.ts` — cached module registry hook
- `components/shell/nav-items.ts` — update to derive nav from registry (currently hardcoded)

**First implementation scope:**
1. `ModuleRegistry` TypeScript type matching current `module.manifest.json` schema
2. `loadModuleRegistry()` that reads all manifests at build time (server-side)
3. Wired into nav generation: nav items filtered by `registry.permissions` vs. user role

**Security/multi-tenant:** Module availability can be org-specific (license gates). The registry check should include: is this module enabled for `g.jwt_user.org_id`? If not, nav item is hidden and route returns 403.

**AI-agent maintainability:** Each module's `module.manifest.json` is the single source of truth for its metadata. Never hardcode module names or routes in platform-level code — always read from registry.

---

## 19 — PlatformTenantContext

**Status:** ✅ Implemented (Round 007) | **Priority:** now (ongoing compliance)

**Purpose:** Organization context available throughout the entire application — `org_id`, `org_name`, `plan`, and tenant-scoped feature flags. Prevents any component from hardcoding or guessing `org_id`. All API calls use session-derived `org_id`.

**Modules that use it:** All 19 modules — every API call, every permission check, every feature flag

**Libraries:** `next-auth` (session), TanStack Query (feature config cache)

**Canonical implementation:**
- `lib/auth/options.ts` — JWT carries `user.org_id` from Flask login response
- `lib/auth/rbac.ts` — `getOrgId(session)` helper
- `app/api/proxy/[...path]/route.ts` — `X-Org-Id` audit header derived from `token.user.org_id`

**Security rule (CRITICAL):** `org_id` MUST flow from JWT → next-auth session → API proxy header. It is NEVER accepted from:
- Request body (`data.org_id`)
- URL parameters (`?org_id=1`)
- React state or form fields
- localStorage or cookies other than the next-auth JWT

**AI-agent maintainability:** Any code that introduces `org_id` from a request source other than `g.jwt_user.org_id` (Flask) or `session.user.org_id` (Next.js) is a security vulnerability. AI agents must flag this in code review.

---

## 20 — PlatformPrivacy / PII Masking

**Status:** ⬜ Pending | **Priority:** later

**Purpose:** UI-level masking of PII fields (phone numbers, email addresses, ID numbers) based on the viewing user's role and org privacy settings. Also: "export with PII" requires explicit acknowledgment. Maps to the `anonymizationRules` in module data contracts.

**Modules that use it:** Users (01) phone/email in list, Helpdesk (04) requester PII, ALA (06) caller ID, Billing (08) cardholder data

**Libraries:** Internal pattern (no library needed at this stage), shadcn `Tooltip` for "click to reveal"

**Canonical files (to build):**
- `components/shared/pii-field.tsx` — `PiiField` (shows masked value by default; "click to reveal" with audit log event)
- `lib/utils/mask.ts` — `maskEmail()`, `maskPhone()`, `maskId()` pure functions
- `lib/hooks/use-pii-reveal.ts` — tracks which fields are revealed; fires audit event on reveal

**First implementation scope:**
Build when Users Phase B adds contact fields, or when Helpdesk module shows caller PII.

**Security/multi-tenant:** PII reveal must fire a `UserActivity` audit log entry. Non-admin users should not be able to reveal PII for users outside their org. Backend must not return unmasked PII to non-privileged roles.

**AI-agent maintainability:** Masking logic lives in `lib/utils/mask.ts` — tested as pure functions. `PiiField` calls the masking util; it does not re-implement masking logic.

---

## 21 — PlatformErrorBoundary / ErrorState

**Status:** ✅ Implemented (Round 015) | **Priority:** now

**Purpose:** React error boundary wrapping every dashboard route, preventing a component crash from taking down the entire app. Also: a shared `ErrorState` component for displaying API errors, loading failures, and empty-after-filter results consistently.

**Modules that use it:** All — error boundaries at layout level, error states at component level

**Libraries:** React `ErrorBoundary` class component, shadcn `Card`, `lucide-react`

**Canonical files:**
- `components/shared/error-boundary.tsx` — `PlatformErrorBoundary` class component (catches render errors; shows error card + reload button)
- `components/shared/error-state.tsx` — `ErrorState` (functional: icon + title + description + retry button; used inline in data-loading components)

**First implementation scope:**
Extracted from Users and Orgs pages in R015. `PlatformErrorBoundary` added to `(dashboard)/layout.tsx`.

**Security/multi-tenant:** Error boundaries must NEVER expose stack traces, internal IDs, or org data in the UI. Show a generic "something went wrong" message with a request ID for support reference. Log details server-side only.

**AI-agent maintainability:** `PlatformErrorBoundary` is a class component (React requirement). Keep it ≤80 lines. `ErrorState` ≤60 lines.

---

## 22 — PlatformAPI Client

**Status:** ✅ Implemented (Round 008) | **Priority:** now (ongoing compliance)

**Purpose:** Typed API client pattern via the Next.js proxy. All module API calls flow through `/api/proxy/<prefix>/...`, which attaches Bearer auth and audit headers. Modules define typed `apiFetch` wrappers in `lib/api/<module>.ts`.

**Modules that use it:** All 19 modules

**Libraries:** `fetch` (native), `next-auth/jwt` (getToken in proxy), `lib/api/request-context.ts` (audit headers)

**Canonical implementation:**
- `app/api/proxy/[...path]/route.ts` — proxy with Bearer auth + audit headers
- `lib/api/client.ts` — shared `apiFetch<T>` base (error handling, JSON parse, status check)
- `lib/api/<module>.ts` — module-specific typed wrappers (e.g., `fetchUsers`, `fetchOrgs`)
- `lib/api/query-keys.ts` — centralized TanStack Query key registry
- `lib/api/request-context.ts` — `buildAuditHeaders()`, `generateRequestId()`

**Conventions (enforced):**
- Base path: always `/api/proxy/<prefix>` — never call Flask directly from client code
- `apiFetch<T>` throws `Error` with `body.error ?? body.message ?? "HTTP ${status}"` on failure
- Response envelope: `{ success: boolean, data: T }` (ADR-007)
- `credentials: "include"` on all fetch calls (for cookie forwarding)
- Types for all responses declared in `lib/modules/<module>/types.ts` — never inlined

**Security/multi-tenant:** Proxy strips client-provided auth headers before forwarding. Only `X-Request-ID`, `X-User-Id`, `X-Org-Id` from the verified JWT are forwarded. Client cannot spoof these.

**AI-agent maintainability:** Every `lib/api/<module>.ts` follows the same structure (apiFetch wrapper, typed functions, no UI logic). An AI agent can create a new module API client by copying the Users pattern.

---

## 23 — PlatformRealtime

**Status:** ⬜ Pending | **Priority:** next

**Purpose:** Server-Sent Events (SSE) hook for live data updates: investigation status, approval notifications, session escalation, job progress. Wraps the `EventSource` API with automatic reconnect, org-scoped channel, and TanStack Query cache invalidation on events.

**Modules that use it:** Helpdesk (04) session live status, AI Agents (05) investigation stream, Notifications (12), Job Runner (14) progress, Voice (16) call status

**Libraries:** Native `EventSource`, `@tanstack/react-query` (invalidation), `zustand` (notification state)

**Canonical files (to build):**
- `lib/hooks/use-event-source.ts` — `useEventSource(url)` — manages `EventSource` lifecycle, auto-reconnect, returns latest event data
- `lib/hooks/use-investigation-stream.ts` — consumer hook for AI agent investigation SSE
- `app/api/proxy/sse/[...path]/route.ts` — SSE-specific proxy (different from JSON proxy — streams response)

**First implementation scope:**
1. `useEventSource(url)` — generic SSE hook with reconnect on disconnect
2. First consumer: AI Agents investigation status (when Module 05 starts)
3. Flask SSE endpoint: `GET /api/agents/<id>/stream` using Redis pub/sub → EventSource

**Security/multi-tenant:** SSE channels must be scoped to `org_id`. The Flask endpoint must validate JWT and filter pub/sub channel by org. A user must not subscribe to another org's event stream.

**AI-agent maintainability:** `useEventSource` is a low-level hook — module-specific hooks (e.g., `useInvestigationStream`) wrap it with typed event parsing. Never parse event JSON inside `useEventSource` itself.

---

## 24 — PlatformFileManager

**Status:** ⬜ Pending | **Priority:** later

**Purpose:** File upload, preview, and download for module-attached files: KB article attachments, helpdesk ticket files, RAG source documents, voice call recordings. Includes: drag-and-drop upload zone, progress bar, file type validation, presigned URL download.

**Modules that use it:** Knowledge (07) document upload, Helpdesk (04) ticket attachments, AI Agents (05) evidence files, Voice (16) recording download

**Libraries:** `@uppy/core` or native `<input type="file">` + `XMLHttpRequest` for progress, shadcn `Progress`

**Canonical files (to build):**
- `components/shared/file-manager/file-upload-zone.tsx` — drag-drop upload with progress
- `components/shared/file-manager/file-list.tsx` — uploaded files list with download links
- `components/shared/file-manager/file-preview.tsx` — inline preview for images/PDFs
- `lib/api/files.ts` — `uploadFile()`, `getDownloadUrl()`, `deleteFile()`

**First implementation scope:**
Build when Knowledge module (07) starts (first module with file attachments).

**Security/multi-tenant:** File uploads must include org_id from session in the multipart metadata. Download URLs must be presigned (time-limited). Never serve files at a predictable URL without auth check.

**AI-agent maintainability:** File handling is complex — keep `FileUploadZone` as a pure UI component; all API logic in `lib/api/files.ts`. Upload progress tracked via `XMLHttpRequest` `progress` event — not fetch (no progress API in fetch).

---

## 25 — PlatformIntegration Framework

**Status:** ⬜ Pending | **Priority:** later

**Purpose:** UI pattern for third-party integrations (Slack, Jira, Stripe, Alexa, email). Each integration has: a connection card (status: connected/disconnected/error), a settings form, a test-connection action, and an activity log. The framework provides the card shell and connection state machine.

**Modules that use it:** Integrations (18) primary, Settings (09) integration section, ALA (06) calendar/email connections, Helpdesk (04) Jira ticketing

**Libraries:** shadcn `Card`, `react-hook-form` + `zod` (integration config forms), `sonner`

**Canonical files (to build):**
- `components/shared/integration/integration-card.tsx` — `IntegrationCard` (logo, name, status badge, connect/disconnect button)
- `components/shared/integration/integration-config-form.tsx` — settings form shell
- `components/shared/integration/integration-test-button.tsx` — "Test connection" action
- `lib/modules/integrations/types.ts` — `IntegrationConfig`, `IntegrationStatus`

**First implementation scope:**
Build when Integrations module (18) starts.

**Security/multi-tenant:** Integration credentials (API keys, OAuth tokens) are NEVER stored in the browser. The frontend sends credentials to Flask which stores them in platform-secrets/SSM. The UI only shows a masked indicator that a credential is set.

**AI-agent maintainability:** Each integration is a plugin — one file per integration type in `lib/modules/integrations/connectors/`. The framework renders them all the same way.

---

## 26 — PlatformBilling / Usage Meter

**Status:** ⬜ Pending | **Priority:** next

**Purpose:** Billing and usage display: current plan badge, usage meter (API calls, voice minutes, storage), billing history table, plan upgrade CTA, Stripe portal link. Not the billing engine — just the UI layer over the existing Flask billing module.

**Modules that use it:** Billing (08) primary, Settings (09) billing section, Dashboard (0) usage chip

**Libraries:** `recharts` (usage trend chart), shadcn `Progress` (usage meter bar)

**Canonical files (to build):**
- `components/modules/billing/usage-meter.tsx` — `UsageMeter` (metric name + current/limit + progress bar + percentage)
- `components/modules/billing/plan-badge.tsx` — `PlanBadge` (starter/pro/enterprise color chip)
- `components/modules/billing/billing-history-table.tsx` — invoices `DataTable`
- `lib/api/billing.ts`
- `lib/modules/billing/types.ts`

**First implementation scope:**
Build when Billing module (08) starts. `UsageMeter` is the first deliverable — used in dashboard header.

**Security/multi-tenant:** Billing data is strictly org-scoped. The billing endpoint enforces org isolation. The UI must never show another org's billing data. Usage limits are read-only — users cannot modify them via the UI.

**AI-agent maintainability:** Usage meter limits come from the API (`plan.limits`) — never hardcoded in the component. The component renders whatever limit the API returns.

---

## 27 — PlatformPolicy Engine

**Status:** ⬜ Pending | **Priority:** next

**Purpose:** UI for managing org-level policy rules: helpdesk approval policies (BLOCK/ALLOW per tool), auto-approve grants, circuit breaker overrides, SLA escalation rules. Maps to the `PolicyRule` model and `FeatureGating` tables in Flask.

**Modules that use it:** Helpdesk (04) approval policies, Settings (09) org policy management, AI Agents (05) tool permission display

**Libraries:** react-hook-form + zod (policy form), `@tanstack/react-table` (policy rule list), `sonner`

**Canonical files (to build):**
- `components/modules/settings/policy-rule-table.tsx` — `PolicyRuleTable` (ALLOW/BLOCK rules per tool)
- `components/modules/settings/policy-rule-form.tsx` — add/edit policy rule
- `components/shared/policy/policy-badge.tsx` — `PolicyBadge` (BLOCK = red, ALLOW = green, PLATFORM = gray)
- `lib/modules/policies/types.ts`
- `lib/api/policies.ts`

**First implementation scope:**
Build when Helpdesk module (04) starts. Policy display is required before approval flow UI.

**Security/multi-tenant:** Policy rules are org-scoped. Org admins can set ALLOW rules within their org; only system admins can create platform-wide rules. The `BLOCK` action from org-admin is ABSOLUTE (per ADR 2026-04-12 — Helpdesk Approval Policy) — this must be enforced on the Flask side and clearly communicated in the UI.

**AI-agent maintainability:** Policy rule validation (can org-admin set this rule type?) happens server-side. The UI shows what the API allows — it does not implement authorization logic.

---

## 28 — PlatformHelp / Onboarding

**Status:** ⬜ Pending | **Priority:** later

**Purpose:** Contextual help tooltips, feature spotlights (coach marks), and first-run onboarding tours for new orgs. Helps users discover features without reading documentation. Dismissible per-user with state persisted in the user's profile.

**Modules that use it:** All modules (contextual tooltips), Dashboard (0) first-run tour, Settings (09) onboarding checklist

**Libraries:** `shepherd.js` or `driver.js` for tour, shadcn `Tooltip` for contextual help, `react-hotkeys-hook` for keyboard hints

**Canonical files (to build):**
- `components/shared/help/help-tooltip.tsx` — `HelpTooltip` (icon button + tooltip with doc link)
- `components/shared/help/feature-tour.tsx` — `FeatureTour` (step-by-step highlight tour)
- `lib/hooks/use-onboarding.ts` — tracks completed tour steps per user (persisted via API)

**First implementation scope:**
Build when Onboarding module starts. First deliverable: `HelpTooltip` for complex settings fields.

**Security/multi-tenant:** Tour completion state is per-user, not per-org. Stored in `users.ui_preferences` (JSON column). No security concerns beyond standard auth.

**AI-agent maintainability:** Tour step definitions live in `lib/onboarding/tours/<module>.ts` — not hardcoded in page components. This allows tour content to be updated without touching the page.

---

## 29 — PlatformTest Harness

**Status:** ⬜ Pending | **Priority:** later

**Purpose:** UI for running platform module tests and ALA scenario tests without full voice calls. Maps to the existing `/admin/api/internal/ala/text-chat` endpoint and the test_harness Flask blueprint. Enables non-technical users to verify AI behavior.

**Modules that use it:** ALA (06) scenario testing, AI Agents (05) tool test, Helpdesk (04) scenario replay, Settings (09) integration test

**Libraries:** `@tanstack/react-query` (test execution), `framer-motion` (result animation), `lucide-react`

**Canonical files (to build):**
- `components/modules/settings/test-harness/test-runner.tsx` — `TestRunner` (scenario picker + message input + run button)
- `components/modules/settings/test-harness/test-result.tsx` — `TestResult` (function calls + response + timing)
- `lib/api/test-harness.ts` — `runAlaTextChat()`, `runToolTest()`

**First implementation scope:**
Build when ALA module (06) starts. Replicates the `curl` command in `CLAUDE.md §Testing`.

**Security/multi-tenant:** Test harness endpoints are protected by `X-API-Key` (internal) or `@jwt_required` + system-admin check. Never expose to non-admin users. Test results may contain sensitive tool outputs — display only to system admins.

**AI-agent maintainability:** Test results are JSON from the API — rendered with a JSON viewer, not custom-formatted. Keep the component generic.

---

## 30 — PlatformDeveloper Docs / Agent Docs

**Status:** ⬜ Pending | **Priority:** later

**Purpose:** Auto-generated documentation page in the platform UI showing: API endpoint catalog (from OpenAPI spec), module manifest registry, capability catalog reference, active ADRs. Primary consumers: AI agents building new features, human developers onboarding.

**Modules that use it:** Global (developer-facing page at `/admin/developer`)

**Libraries:** `swagger-ui-react` or custom OpenAPI renderer, `marked` (Markdown rendering for ADRs)

**Canonical files (to build):**
- `app/(dashboard)/admin/developer/page.tsx` — developer portal (system admin only)
- `components/modules/developer/api-endpoint-list.tsx` — rendered OpenAPI spec
- `components/modules/developer/module-manifest-viewer.tsx` — module registry display
- `components/modules/developer/adr-list.tsx` — ADR catalog from `DECISIONS_LOG.md`

**First implementation scope:**
Build after FastAPI gateway is stood up (Phase 3) — the value of auto-generated docs requires a machine-readable OpenAPI spec first.

**Security/multi-tenant:** Developer portal is system-admin only. No multi-tenant data exposed here — it is metadata about the platform itself.

**AI-agent maintainability:** This page IS documentation FOR AI agents. It must be kept in sync with actual implementation. The module manifest viewer reads live from `lib/modules/registry.ts` — not from static content.

---

## Implementation Priority Schedule

### Now (before next module — Round 014)

1. **PlatformErrorBoundary / ErrorState** (§21) — Phase 0 backlog item; unblocking
2. **PlatformPageShell** (§07) — extract from existing Users/Orgs pages; prevents further duplication
3. **PlatformDetailView** components (§08) — extract `InfoRow`/`BoolBadge` from Users/Orgs detail pages
4. **PlatformForm** (§03) + **PlatformAction** (§04) — required for Users Phase B (create/edit)
5. **PlatformFeatureFlags** (§17) — needed before Helpdesk (plan-gated features)
6. **PlatformNotifications** polling-mode (§12) — approval queue indicator

### Next (Phase 1-2, Weeks 3-20)

7. **PlatformTimeline** (§09) — Helpdesk session activity
8. **PlatformApprovalFlow** (§13) — Helpdesk approval queue
9. **PlatformSettings Engine** (§16) — Settings module
10. **PlatformRealtime SSE** (§23) — Helpdesk live status
11. **PlatformSearch / Command Palette** (§11) — navigation shortcuts first
12. **PlatformJobRunner** (§14) — Module Export/Import
13. **PlatformWizard** (§15) — Onboarding
14. **PlatformBilling / Usage Meter** (§26) — Billing module
15. **PlatformPolicy Engine** (§27) — Helpdesk settings
16. **PlatformModuleRegistry** (§18) — dynamic nav
17. **PlatformImportExport** full (§06) — after CSV export (partial already done)
18. **PlatformAuditLog** (§10) — Audit Log module

### Later (Phase 3+)

19. **PlatformFileManager** (§24)
20. **PlatformIntegration Framework** (§25)
21. **PlatformPrivacy / PII Masking** (§20)
22. **PlatformHelp / Onboarding tours** (§28)
23. **PlatformTest Harness** (§29)
24. **PlatformDeveloper Docs** (§30)

### AI Delegated Action Platform (R027–R031 — see §36)

Cross-cutting system — not a `Platform*` UI component. Extends existing capabilities (`PlatformAction`, `ConfirmActionDialog`, `ApprovalFlow`) with AI-invocation support.

- `lib/platform/ai-actions/` (new) — `useAIAction` hook, `AIActionPreviewCard`, types
- `apps/ai_action_platform/` (new backend) — registry, executor, confirmation token, audit
- Extends module manifests with `aiActions[]` section
- Full spec: `docs/system-upgrade/36-ai-action-platform.md`
- Decision: ADR-022

**AI User Capability Context (ADR-023):**
- `GET /api/ai/context` — server-generated `AIUserCapabilityContext` per authenticated user
- `build_ai_capability_prompt()` — converts context to ≤400-token Hebrew system prompt section
- Action filtering: only role-appropriate actions in context; denied categories as safe strings
- Runtime re-check: full permission validation at execution regardless of context
- Context invalidation: `context_version` Redis counter on role/module/flag/deactivation changes
- Voice constraints: 8-action cap, PII never spoken proactively, high-danger → UI redirect
- Spec: `docs/system-upgrade/36-ai-action-platform.md §23–§32`, Decision: ADR-023

**Round 026 hardening (ADR-024):**
- AI is not read-only: full READ/CREATE/UPDATE/DELETE_SOFT/CONFIGURE/APPROVE/EXECUTE/BULK/SYSTEM surface
- 10 capability levels with role matrix, voice eligibility, rollback, audit requirements (§34)
- Complete `AIActionDescriptor` schema with 25 fields; 10 registry examples (§35)
- Delegated human vs service account: `is_ai_agent` alone = READ; writes require signed delegation (§36)
- 22-point execution viability check; fails closed (§37)
- Implementation readiness checklist: 22 infra items + 22 tests before R027 ships (§38)
- Voice write/delete constraints: DELETE_SOFT/CONFIGURE/BULK/SYSTEM never voice; read-back required (§39)
- Delete policy: hard delete disabled by default; requires system_admin + retention policy + export (§40)
- Decision: ADR-024

---

---

## Global Floating AI Assistant

**Round 027 — 2026-04-24 | ADR-025**

**Purpose:** A globally visible AI assistant icon rendered in the shell layout on every page. Opens a drawer with a persistent chat interface that can propose and execute AI actions on behalf of the authenticated user. Zero LLM calls while idle — full lazy loading.

**Modules:** Shell layout, every page (via `useRegisterPageContext()`), `apps/ai_action_platform/` (action execution backend)

**Libraries:** Zustand (session state), shadcn/ui Sheet (drawer), React (component tree) — no new dependencies

**Files:**
- `components/shell/floating-ai-assistant/` — button, drawer, chat, action card
- `lib/stores/ai-assistant-session.ts` — `AIAssistantSessionState` Zustand store
- `lib/hooks/use-register-page-context.ts` — `useRegisterPageContext()` hook
- `app/(dashboard)/layout.tsx` — mount point

**Key constraints (hard rules — must not be violated):**
- No LLM call on page load, route change, hover, or while icon is idle
- No LLM call on route change — only `currentPageId` and hashes update locally
- `conversationId`, `activeObjective`, `pendingActionId` survive route changes
- On org switch → full session reset
- `PageAIContext` permission-filtered before LLM exposure
- Never send full table data, secrets, or raw permission codenames to LLM

**Session state model:** `AIAssistantSessionState` (Zustand, in-memory only — never localStorage). Tracks: `conversationId`, `status`, `activeObjective`, `pendingActionId`, `pendingConfirmationTokenId`, `contextVersion`, `currentPageId`, `lastPageContextHash`, `lastLLMContextHash`, `drawerOpen`, `unreadCount`.

**Page context registry:** Each page calls `useRegisterPageContext(PageAIContext)` — no API call. `PageAIContext` has: `pageId`, `pageName`, `staticDescription`, `module`, `availableActionIds`, `selectedResource`. Used for "What is this page?" without LLM.

**Context diffing:** `PageContextDiff` computed on route change. Stored locally. Sent to LLM only on user's next message or active workflow continuation. Irrelevant diffs (when `relevantToObjective: false`) suppressed.

**First scope:** Shell layout `FloatingAIButton` renders with idle state, `useRegisterPageContext()` hook wired in Helpdesk session detail page. No LLM wiring in R032 — context infra only.

**Security:** Page context filtered by user's `availableActionIds`. Conversation reset on org switch. Auth expiry clears session. No PII in `staticDescription`.

**AI-maintainability:** All assistant behavior in `floating-ai-assistant/` — zero coupling to individual page components except the `useRegisterPageContext()` hook. New pages add one `useRegisterPageContext()` call; no other wiring.

**Spec:** `docs/system-upgrade/38-floating-ai-assistant.md` | **Decision:** ADR-025

---

---

## §30 — AIProviders Hub

**Purpose:** Central hub for managing AI providers, models, fallback chains, usage billing, and health monitoring. Admin-only. Exposes the full `apps/ai_providers/` backend layer as a React UI.

**Priority:** now | **Status:** ⬜ Pending (R035 backend, R036 UI)

**Modules that use it:** All modules that call `AIProviderGateway.call()` — helpdesk, ai_agents, ala, floating_assistant, knowledge, personal_info, ops_intelligence.

**Libraries:** TanStack Query, Recharts (usage charts), React Hook Form + Zod.

**Files (to build):**
- `app/(dashboard)/ai-providers/` — route tree (10 pages)
- `lib/api/ai-providers.ts` — typed fetch functions
- `lib/api/query-keys.ts` — `queryKeys.aiProviders.*` additions
- `lib/api/types.ts` — `AIProvider`, `AIUsageSummary`, `AIProviderHealth`, `AIOverviewStats`, etc.
- `lib/modules/ai-providers/schemas.ts` — Zod form schemas
- Backend: `apps/ai_providers/api_routes.py` (new JWT Blueprint at `/api/ai-providers/`)

**First scope (R036):** Overview, Providers list + detail, Defaults, Module overrides, Usage summary.

**Advanced scope (R037):** Fallback chain editor, Health monitor + circuit breaker, Quotas, Migration status.

**Security:** `api_key_ref` never exposed — `has_api_key: bool` only. All mutations audit-logged. Delete checks referential integrity (409 if provider in use). Circuit breaker reset = `ai_providers.system.manage`.

**Permissions:** `ai_providers.view` / `ai_providers.manage` / `ai_providers.rotate_key` / `ai_providers.usage.view` / `ai_providers.health.view` / `ai_providers.quota.manage` / `ai_providers.system.manage`.

**AI-maintainability:** All forms use `PlatformForm + usePlatformMutation`. All tables use `DataTable<T>`. All pages use `PageShell`. All destructive actions use `ConfirmActionDialog`. org_id from session only.

**Spec:** `docs/system-upgrade/44-ai-providers-hub.md` | **Decision:** ADR-029

---

## How to Add a New Capability

1. Add a row to the Summary Table above
2. Add a full section with all 7 fields (Purpose, Modules, Libraries, Files, First Scope, Security, AI-Maintainability)
3. Update `docs/system-upgrade/15-action-backlog.md` with the build task
4. Update `docs/system-upgrade/98-change-log.md`

## How to Promote a Module-Local Component to a Capability

1. Confirm 2+ modules use the same pattern
2. Extract to `components/shared/` following the naming convention `platform-*.tsx`
3. Update all callers
4. Add to this catalog (new row in Summary Table + full section)
5. Commit message: `refactor(shared): promote <name> to PlatformCapability`
