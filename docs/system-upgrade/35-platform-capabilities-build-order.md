# 35 — Platform Capabilities Build Order

_Created: 2026-04-24 | R023 | Updated R024 (AI Action Platform) | R025 (AI Capability Context) | R026 (capability levels, viability checks, delete policy)_
_Owner: platform-ui build sequencing_

---

## 1. Executive Summary

Platform has 30 named capabilities (doc 26). 8 are fully implemented, 5 are partial, 17 are pending. Before broad module development can proceed, 6 capabilities must be completed. Before Helpdesk (the most complex module), 7 capabilities are required. Before production, 4 additional capabilities are required beyond Helpdesk.

**Key insight:** The capabilities are not independent — they form a strict dependency tree. Building modules in the wrong order forces rework. This document provides the definitive dependency-aware build order.

**Anti-pattern to avoid:** Building capability skeletons "just in case." Every capability must have a confirmed first consumer before it is built. If no module needs it yet, it waits.

**Current security posture:** 9.2/10 (R022). Foundation is ready for Helpdesk development. All pre-production security blockers are resolved.

---

## 2. Implemented Capabilities (8 complete)

| # | Capability | Round | First Consumer |
|---|-----------|-------|---------------|
| 01 | PlatformDataGrid | R012 | Users list, Orgs list |
| 03 | PlatformForm | R017–019 | Users create/edit, Orgs, Roles |
| 05 | PermissionGate / Access Control UI | R012 | All modules |
| 07 | PlatformPageShell | R015 | Users page, Orgs page |
| 19 | PlatformTenantContext | R007 | All modules |
| 21 | PlatformErrorBoundary / ErrorState | R015 | Dashboard layout |
| 22 | PlatformAPI Client | R008 | All modules |
| 04 | PlatformAction (partial → see §3) | R017–020 | Users, Orgs dangerous actions |

---

## 3. Partial Capabilities (5 incomplete)

### 04 — PlatformAction

**Done:** `usePlatformMutation`, `ConfirmActionDialog` (full DangerLevel support R020), `useDangerousAction`

**Missing:** `ActionButton` component (`components/shared/action-button.tsx`) — loading spinner + disabled state during mutation. Currently pages implement inline loading state. **Needed before Helpdesk** (approve/reject actions require it).

**Effort:** ~30 min.

---

### 08 — PlatformDetailView

**Done:** Pattern used in Users `[id]/page.tsx` and Organizations `[id]/page.tsx` (inline `InfoRow`, `BoolBadge` helpers).

**Missing:** Extraction to `components/shared/detail-view/` barrel. Both pages have duplicate helper functions — not yet promoted to shared.

**Needed before:** Helpdesk ticket detail (first Helpdesk consumer). **Without extraction now, a 3rd inline copy will be created.**

**Effort:** ~45 min (extract, update callers).

---

### 02 — PlatformDashboard

**Done:** Dashboard page exists with stat chips (inline `StatCard`-like pattern).

**Missing:** Shared `StatCard`, `ChartCard` components. Currently each page implements its own stat display.

**Needed before:** Helpdesk dashboard (KPI stat cards). Not blocking Phase A (list/table). **Needed before Helpdesk Phase A dashboard stats view.**

**Effort:** ~1 hour.

---

### 06 — PlatformImportExport

**Done:** `lib/utils/csv.ts` — `exportToCsv()`, `rowsToCsv()`, `downloadCsv()` with Hebrew BOM.

**Missing:** `ExportButton` component, `ImportModal`, import validation. The missing pieces are not needed until module lists get export buttons.

**Not blocking Helpdesk.** Needed before Module 01 Phase C (users CSV export) and Phase 3.5 (Module Export/Import).

**Effort:** `ExportButton` ~45 min. Full `ImportModal` → 1 day.

---

### 18 — PlatformModuleRegistry

**Done:** `module.manifest.json` files exist per module.

**Missing:** `lib/modules/registry.ts` loader, nav-items wired to registry (currently hardcoded).

**Not blocking Helpdesk.** Needed when dynamic module licensing is required.

**Effort:** ~2 hours.

---

## 4. Pending Capabilities (17 not started)

| # | Capability | Required Before | Effort |
|---|-----------|----------------|--------|
| 09 | PlatformTimeline | Helpdesk Phase A | ~3 hours |
| 10 | PlatformAuditLog | Audit Log module (13), embeds | ~2 hours |
| 11 | PlatformSearch | Global (⌘K nav) | ~4 hours |
| 12 | PlatformNotifications | Helpdesk (approval bell) | ~3 hours |
| 13 | PlatformApprovalFlow | Helpdesk Phase B | ~4 hours |
| 14 | PlatformJobRunner | AI Agents (05), Import/Export | ~3 hours |
| 15 | PlatformWizard | Onboarding | ~4 hours |
| 16 | PlatformSettings Engine | Settings (09) | ~3 hours |
| 17 | PlatformFeatureFlags | Pre-Helpdesk | ~1 hour |
| 20 | PlatformPrivacy / PII Masking | Pre-GDPR | ~3 hours |
| 23 | PlatformRealtime (SSE) | Helpdesk Phase C, AI Agents | ~4 hours |
| 24 | PlatformFileManager | Knowledge (07) | ~4 hours |
| 25 | PlatformIntegration Framework | Integrations (18) | ~4 hours |
| 26 | PlatformBilling / Usage Meter | Billing (08) | ~2 hours |
| 27 | PlatformPolicy Engine | Helpdesk settings | ~3 hours |
| 28 | PlatformHelp / Onboarding tours | Polish | ~4 hours |
| 29 | PlatformTest Harness | ALA (06) testing | ~3 hours |
| 30 | PlatformDeveloper Docs | Phase 3+ | ~4 hours |

---

## 5. Dependency Graph

```
Foundation (already done)
├── PlatformAPI Client (22) ✅
├── PlatformTenantContext (19) ✅
├── PlatformDataGrid (01) ✅
├── PlatformForm (03) ✅
├── PermissionGate (05) ✅
├── PlatformPageShell (07) ✅
├── PlatformErrorBoundary (21) ✅
└── PlatformAction (04) 🔵 → ActionButton missing
    └── PlatformDetailView (08) 🔵 → extraction missing

Pre-Helpdesk Gate
├── PlatformFeatureFlags (17) → standalone, no deps
├── PlatformNotifications (12) → needs PlatformAPI Client (22) ✅
├── PlatformTimeline (09) → needs PlatformAPI Client (22) ✅
├── PlatformAction (04) complete → ActionButton
└── PlatformDetailView (08) complete → extraction

Helpdesk Phase A (ticket list + stats dashboard)
├── PlatformTimeline (09) ← required
├── PlatformDashboard (02) stat cards ← required
└── [all pre-Helpdesk gates]

Helpdesk Phase B (ticket detail + approvals)
├── PlatformApprovalFlow (13)
│   ├── PlatformForm (03) ✅
│   ├── PermissionGate (05) ✅
│   └── PlatformNotifications (12) ← approval bell
└── PlatformPolicy Engine (27) ← for Helpdesk settings

Helpdesk Phase C (live status)
└── PlatformRealtime (23) ← SSE hook
    └── PlatformAPI Client (22) ✅

AI Agents (05)
├── PlatformRealtime (23) ← investigation stream
└── PlatformJobRunner (14) ← investigation progress

Settings (09)
└── PlatformSettings Engine (16)
    └── PlatformForm (03) ✅

Module Import/Export (Phase 3.5)
├── PlatformJobRunner (14) ← async job progress
├── PlatformImportExport (06) full
│   └── PlatformWizard (15) ← import flow
└── PlatformAuditLog (10) ← import audit trail

Audit Log module (13)
└── PlatformAuditLog (10) ← primary component

Knowledge (07)
└── PlatformFileManager (24) ← document upload

Billing (08)
└── PlatformBilling / Usage Meter (26)
    └── PlatformDashboard (02) ✅ stat cards

Integrations (18)
└── PlatformIntegration Framework (25)
    └── PlatformForm (03) ✅

Command Palette (global shell)
└── PlatformSearch / Command Palette (11)

GDPR / Enterprise
└── PlatformPrivacy / PII Masking (20)
```

---

## 6. Required Before Helpdesk

**Must be done before starting any Helpdesk page:**

| Priority | Capability | Why Needed | Effort | Round |
|----------|-----------|-----------|--------|-------|
| P0 | Complete `ActionButton` (§04) | Approve/reject ticket actions | 30 min | R023 |
| P0 | Extract `DetailView` components (§08) | Ticket detail page re-uses pattern | 45 min | R023 |
| P0 | `PlatformFeatureFlags` (§17) | Plan-gated Helpdesk features | 1 hr | R023 |
| P1 | `PlatformTimeline` (§09) | Session/ticket activity timeline | 3 hr | R024 |
| P1 | `StatCard` / `PlatformDashboard` (§02) | Helpdesk KPI dashboard | 1 hr | R024 |
| P1 | `PlatformNotifications` (§12) polling | Approval queue badge on header | 3 hr | R024 |

**Can start Helpdesk Phase A (ticket list + route shell) after R023.**
**Cannot do ticket detail or approvals without R024 (Timeline + Notifications).**

---

## 7. Required Before AI Agents

Beyond what Helpdesk requires:

| Capability | Why Needed | Round |
|-----------|-----------|-------|
| `PlatformRealtime` (§23) | Investigation status stream | R029 |
| `PlatformJobRunner` (§14) | Investigation progress display | R030 |
| Helpdesk complete | AI Agents uses same approval flow | ~R028 |

---

## 8. Required Before Module Import/Export

| Capability | Why Needed | Round |
|-----------|-----------|-------|
| `PlatformJobRunner` (§14) | Async export/import progress | R030 |
| `PlatformImportExport` (§06) full | ImportModal + validation | R031 |
| `PlatformWizard` (§15) | Multi-step import flow | R031 |
| `PlatformAuditLog` (§10) | Per-row import audit trail | R026 |

Backend Phase 3.5 design is complete. UI work begins after R031.

---

## 9. Required Before Production

Beyond current implementation:

| Capability / Task | Why Required | Effort | Round |
|------------------|--------------|--------|-------|
| `PlatformFeatureFlags` (§17) | Plan gating, beta features | 1 hr | R023 |
| `PlatformAuditLog` (§10) | Audit module live | 2 hr | R026 |
| `PlatformNotifications` (§12) | Approval queue visibility | 3 hr | R024 |
| CSP headers enforcement | Security (31-production-security-headers.md) | 2 hr | R023 |
| `NEXTAUTH_SECRET` in SSM | Auth security | 30 min | R023 |
| Flask cookie security (`SESSION_COOKIE_SECURE`) | Auth security | 30 min | R023 |
| Role-aware nav filtering | UX + information leak | 1 hr | R023 |
| `nuqs` for URL filter state | Filter state survives navigation | 1 hr | R023 |
| Playwright smoke tests | Regression safety | 2 hr | R027 |

---

## 10. Deferred Capabilities (safe to skip for now)

These capabilities are NOT needed before Helpdesk, AI Agents, or production:

| # | Capability | Deferred Until |
|---|-----------|---------------|
| 15 | PlatformWizard | Onboarding module (Phase 3) |
| 16 | PlatformSettings Engine | Settings module (09) — can start basic Settings without it |
| 18 | PlatformModuleRegistry | Dynamic licensing (Phase 3) |
| 20 | PlatformPrivacy / PII Masking | GDPR compliance sprint |
| 24 | PlatformFileManager | Knowledge module (07) |
| 25 | PlatformIntegration Framework | Integrations module (18) |
| 26 | PlatformBilling / Usage Meter | Billing module (08) |
| 28 | PlatformHelp / Onboarding tours | Post-launch polish |
| 29 | PlatformTest Harness | ALA module (06) |
| 30 | PlatformDeveloper Docs | FastAPI gateway (Phase 3) |

---

## 11. Recommended Next 10 Capability Rounds

> Each round = a focused capability build + a first consuming module page. Never build a capability without a confirmed consumer in the same round.

---

### Round 023 — Close Partial Capabilities + Security Hygiene
_~2 hours total_

**Capabilities:**
- Complete `ActionButton` component (§04) — `components/shared/action-button.tsx`
- Extract `DetailView` shared components (§08) — `components/shared/detail-view/` (update Users + Orgs callers)
- `PlatformFeatureFlags` (§17) — `useFeatureFlag()` + `<FeatureFlag>` + `lib/api/feature-config.ts`

**Security (small but required before prod):**
- Add `NEXTAUTH_SECRET` to SSM param list in docs
- Add Flask `SESSION_COOKIE_SECURE=True` documentation
- `components/shell/app-sidebar.tsx` — role-aware nav filtering (hide admin items from non-admins)
- Add Flask `after_request` security headers (`X-Frame-Options`, `X-Content-Type-Options`) — see doc 31

**Module consumer:** No new module pages. Capabilities consumed by existing pages (Users, Orgs deactivate buttons use ActionButton). Feature flags consumed by Helpdesk in R025.

**Acceptance criteria:**
- [ ] `ActionButton` renders spinner during mutation, disabled when `isPending=true`
- [ ] `DetailView` components extracted and used in both Users and Orgs detail pages (no duplicate helpers)
- [ ] `useFeatureFlag('helpdesk.enabled')` returns correct value from API in browser
- [ ] Nav hides "Admin" items for non-admin users
- [ ] TypeScript: EXIT 0

---

### Round 024 — PlatformTimeline + PlatformNotifications + StatCard
_~7 hours total_

**Capabilities:**
- `PlatformTimeline` (§09) — `components/shared/timeline/` (Timeline, TimelineEvent, TimelineSkeleton, types)
- `PlatformNotifications` (§12) polling — `NotificationBell` + `NotificationDrawer` + `useNotifications` polling (30s)
- `StatCard` / `PlatformDashboard` (§02) — extract stat card from inline Dashboard pattern

**First consumers:**
- `NotificationBell` wired into `app/(dashboard)/layout.tsx` header
- `StatCard` used in Dashboard page (replace inline pattern)
- `PlatformTimeline` used in Users detail page (login history — preview use before Helpdesk)

**Acceptance criteria:**
- [ ] `PlatformTimeline` renders 0, 1, N events correctly with skeleton on load
- [ ] `NotificationBell` shows badge count (polling, falls back to 0 on API error)
- [ ] `NotificationDrawer` opens on click, shows "no notifications" empty state
- [ ] `StatCard` renders value + label + trend + icon
- [ ] TypeScript: EXIT 0

---

### Round 025 — Helpdesk Phase A (Route Shell + Ticket List)
_~4 hours total_

**Capability consumed:**
- All pre-Helpdesk gate capabilities (§6) must be complete
- Proxy PATH_MAP: `"helpdesk"` → `/helpdesk` (add if not already present)

**Module deliverables:**
- `app/(dashboard)/helpdesk/page.tsx` — KPI stat dashboard (StatCard grid + chart placeholders)
- `app/(dashboard)/helpdesk/tickets/page.tsx` — ticket list (`DataTable<Ticket>` + status/priority filters)
- `lib/modules/helpdesk/types.ts`, `lib/api/helpdesk.ts`, query keys
- `TicketStatusBadge`, `TicketPriorityBadge` components
- Backend: verify Flask `/helpdesk/api/tickets` + `/helpdesk/api/dashboard/stats` exist; add if not

**No timeline, no approvals yet — list view only.**

**Acceptance criteria:**
- [ ] `/helpdesk` loads with real KPI stats from Flask
- [ ] `/helpdesk/tickets` shows paginated ticket list with status filter
- [ ] `FeatureFlag flag="helpdesk.enabled"` gates the route
- [ ] TypeScript: EXIT 0

---

### Round 026 — PlatformAuditLog + Audit Log Module (13)
_~4 hours total_

**Capabilities:**
- `PlatformAuditLog` (§10) — `AuditLogTable`, `AuditActionBadge`
- `lib/api/audit.ts` — `fetchAuditLog(filters)` → `/api/proxy/users/activity` (or new dedicated endpoint)

**Module deliverables:**
- `app/(dashboard)/audit-log/page.tsx` — full audit log viewer (`AuditLogTable` + filters: date range, action, actor)
- `AuditLogTable` embedded in Users detail page (recent activity tab)
- Backend: `GET /api/users/activity` endpoint (org-scoped; system-admin sees all) if not present

**Acceptance criteria:**
- [ ] Audit log page shows real `UserActivity` records from DB
- [ ] System admin sees all-org logs; org admin sees own org only
- [ ] `AuditActionBadge` color-codes by category (login/create/update/delete/admin)
- [ ] TypeScript: EXIT 0

---

### Round 027 — Helpdesk Phase B (Ticket Detail + Timeline)
_~4 hours total_

**Capabilities consumed:**
- `PlatformTimeline` (§09) — now consumed by ticket detail
- `PlatformDetailView` (§08) — ticket detail header card

**Module deliverables:**
- `app/(dashboard)/helpdesk/tickets/[id]/page.tsx` — full ticket detail
- `TicketTimeline` — uses `PlatformTimeline` with Helpdesk event types
- `SLAIndicator` — time remaining / breached status
- Backend: `GET /helpdesk/api/tickets/<id>/timeline` endpoint

**Acceptance criteria:**
- [ ] Ticket detail shows all fields + status badges
- [ ] Timeline renders ticket events in reverse-chron order with actor names
- [ ] SLA indicator shows time remaining / "BREACHED" correctly
- [ ] TypeScript: EXIT 0

---

### Round 028 — PlatformApprovalFlow + PlatformPolicy Engine + Helpdesk Phase C
_~7 hours total_

**Capabilities:**
- `PlatformApprovalFlow` (§13) — `ApprovalQueueTable`, `ApprovalModal`, `ApprovalStatusBadge`
- `PlatformPolicy Engine` (§27) — `PolicyRuleTable`, `PolicyBadge` (BLOCK/ALLOW display)

**Module deliverables:**
- `app/(dashboard)/helpdesk/approvals/page.tsx` — approval queue (pending tool invocations)
- `ApprovalModal` — shows tool invocation snapshot + approve/reject + reason textarea
- Backend: `/helpdesk/api/approvals` endpoint (pending tool invocations by org)
- Notification badge updates on approval events (polling)

**Acceptance criteria:**
- [ ] Approvals page shows `waiting_approval` tool invocations
- [ ] Approve action calls Flask → returns updated `tool_invocations.status`
- [ ] Reject with reason works; reason stored in `UserActivity`
- [ ] PolicyBadge shows BLOCK=red / ALLOW=green / PLATFORM=gray
- [ ] TypeScript: EXIT 0

---

### Round 029 — PlatformSettings Engine + Settings Module Phase A
_~5 hours total_

**Capabilities:**
- `PlatformSettings Engine` (§16) — `SettingsLayout`, `SettingsSection`, `SettingsItem`, `useSettingsForm`

**Module deliverables:**
- `app/(dashboard)/settings/page.tsx` — settings shell (sidebar nav)
- `app/(dashboard)/settings/general/page.tsx` — org name, language, timezone
- `app/(dashboard)/settings/ai-providers/page.tsx` — AI provider config (keys, model selection)
- Backend: `GET/PATCH /api/settings/general`, `GET/PATCH /api/settings/ai-providers`

**Acceptance criteria:**
- [ ] Settings layout renders with working sidebar nav
- [ ] General settings save + show success toast
- [ ] AI provider config masked (no raw API keys shown to non-system-admin)
- [ ] TypeScript: EXIT 0

---

### Round 030 — PlatformRealtime (SSE) + Helpdesk Phase D (Live Status)
_~5 hours total_

**Capabilities:**
- `PlatformRealtime` (§23) — `useEventSource(url)` hook, SSE proxy route
- `useInvestigationStream` as second hook (consumer for AI Agents)

**Module deliverables:**
- Helpdesk session status updates live (SSE replacing polling for active sessions)
- `NotificationBell` upgrades from polling → SSE push for real-time badge count
- Backend: `GET /helpdesk/api/stream` SSE endpoint with org-scoped events

**Acceptance criteria:**
- [ ] Active session status updates in UI within 2s of Flask event
- [ ] SSE reconnects automatically after 5s disconnect
- [ ] Browser network tab shows single long-lived EventSource connection (not polling)
- [ ] TypeScript: EXIT 0

---

### Round 031 — PlatformJobRunner + AI Agents Phase A
_~5 hours total_

**Capabilities:**
- `PlatformJobRunner` (§14) — `JobProgress`, `useJobPolling`, `JobStatusBadge`

**Module deliverables:**
- `app/(dashboard)/ai-agents/page.tsx` — agent list + status
- `app/(dashboard)/ai-agents/[id]/page.tsx` — investigation detail with live progress
- `JobProgress` shows step-by-step investigation progress
- `useInvestigationStream` (from R030) wired to investigation stream
- Backend: confirm `/api/agents/<id>` + `/api/agents/<id>/stream` exist

**Acceptance criteria:**
- [ ] Investigation detail shows real-time step log via SSE
- [ ] `JobProgress` component shows % complete + current step label
- [ ] `JobStatusBadge` — pending/running/success/failed with correct colors
- [ ] TypeScript: EXIT 0

---

### Round 032 — PlatformSearch (Navigation Only) + nuqs URL State
_~3 hours total_

**Capabilities:**
- `PlatformSearch / Command Palette` (§11) Phase 1 — navigation only, no API search yet
- `nuqs` URL state for all existing list pages (Users, Orgs, Tickets)

**Deliverables:**
- `components/shell/command-palette.tsx` — ⌘K / Ctrl+K opens palette, nav shortcuts only
- `lib/hooks/use-command-palette.ts` — Zustand open/close state
- Users list page migrated to `nuqs` for `search`, `page`, `role`, `is_active` params
- Orgs list page migrated to `nuqs`
- Helpdesk tickets list migrated to `nuqs`

**Acceptance criteria:**
- [ ] ⌘K opens command palette on all dashboard pages
- [ ] Command palette navigates to `/users`, `/organizations`, `/helpdesk/tickets` etc.
- [ ] Filter state in Users list survives browser back/forward
- [ ] TypeScript: EXIT 0

---

## 12. Anti-Overengineering Rules

These rules apply to every capability round. Reviewers must reject violations.

1. **No capability without a confirmed consumer.** A capability that ships with no module using it is premature abstraction. If you cannot name the first consumer page and its file path, don't build the capability yet.

2. **Capability ≤ its specified line budget.** See doc 26 for per-component line limits. When a component exceeds the budget, split before merging — never raise the limit.

3. **No props that exist "for future use."** Components accept only props that a current consumer uses. Extra props added "just in case" are removed at code review.

4. **Polling before SSE.** Every real-time feature starts with polling. SSE is only introduced when polling causes measurable UX problems (stale data visible > 5s for user-facing state changes). Do not build SSE for features where polling is invisible.

5. **No shared state for what should be local.** Notification count lives in a React Query cache — not in Zustand global store — until two unrelated components need to share it.

6. **Module-local before promotion.** A new UI pattern stays module-local until it appears in 2 modules. Only then does it get promoted to a capability. Don't pre-promote.

7. **Capability tests = consumer tests.** Don't write unit tests for the capability component in isolation. The acceptance criteria for each round test the capability through its first consumer. If the consumer works, the capability works.

8. **No configuration over composition.** Capabilities accept content via `children` or typed props — not via `config` objects or render-prop arrays that mirror JSX in JSON form.

9. **Zero cross-capability coupling.** A capability may depend on utilities (`lib/utils/`, `lib/api/`) but never on another capability's internal components. If two capabilities need the same sub-component, extract it to `lib/utils/` or `components/shared/` as a utility, not as a cross-import.

10. **Deprecation-first refactoring.** When a capability's API needs to change, add the new interface alongside the old, migrate all consumers, then delete the old interface in a single PR. Never break existing consumers.

---

## 13. Acceptance Criteria for Each Round

Minimum gate before a capability round is marked complete:

| Check | How to Verify |
|-------|--------------|
| TypeScript clean | `node_modules/.bin/tsc --noEmit` → EXIT 0 |
| First consumer renders | Manual browser test: page loads with real data |
| Empty state handled | Test with empty API response: empty state renders, no crash |
| Error state handled | Test with 500 response: error state renders, no crash |
| Loading state handled | Slow network: skeleton/spinner visible during load |
| PermissionGate applied | Non-admin user: privileged actions hidden |
| Multi-tenant scoped | System admin: sees all orgs. Org admin: sees own org only |
| RTL layout correct | Manually toggle `dir="rtl"` on `<html>`: layout does not break |
| No console errors | Browser console: no React warnings, no unhandled promise rejections |
| Line budget respected | No new file exceeds 200 lines TS / 300 lines Python |
| Python syntax (if Flask) | `python -c "import ast; ast.parse(open(f, encoding='utf-8').read())"` |

---

## Dependency Resolution Summary

```
R023 Complete partials + FeatureFlags + security hygiene
  │
R024 Timeline + Notifications (polling) + StatCard
  │
R025 ─── Helpdesk Phase A (list + stats)
  │
R026 AuditLog capability + Audit module
  │
R027 ─── Helpdesk Phase B (ticket detail + timeline)
  │
R028 ApprovalFlow + PolicyEngine ─── Helpdesk Phase C (approvals)
  │
R029 SettingsEngine ─── Settings Phase A
  │
R030 PlatformRealtime (SSE) ─── Helpdesk Phase D (live)
  │
R031 JobRunner ─── AI Agents Phase A
  │
R032 CommandPalette (nav) + nuqs URL state
  │
R027–R031 (parallel track) ─── AI Action Platform
  R027 Registry + READ tier
  R028 Confirmation flow + WRITE tier
  R029 Voice confirmation (ALA integration)
  R030 Approval queue + DESTRUCTIVE tier
  R031 Module manifests + org config
```

---

## AI Provider Gateway Migration Track (Pre-R027, Parallel to Implementation)

Must start before any AI feature module merges to production.

| Phase | Task | Gate |
|-------|------|------|
| Phase 1 | `gateway.py` + `policy.py` + `billing_adapter.py` + `schemas.py` written | Blocks all migrations |
| Phase 1 | `AIUsageLog` 12-field extension migration (`20260424_extend_ai_usage_log`) | Blocks usage tracking |
| Phase 1 | CI lint rule: direct LLM imports blocked (warn-only until Phase 2 complete) | Blocks Phase 2 enforcement |
| **Phase 2** | **P0 migrations**: voice_support, fitness_nutrition, jira_integration, ala/commitment_task, personal_info/ai_chat/providers/ | **Before any new AI feature** |
| Phase 2 | Helpdesk, mobile_voice, ai_agents, ala migrated to gateway (P1 modules) | Before R027 ships |
| Phase 3 | ops_intelligence, personal_info (10 files), life_assistant migrated (P2) | Before R032 |
| Phase 3 | Remaining 15+ files migrated | Before Production Ready gate |
| Phase 3 | `life_assistant/services/gemini_client.py`, `openai_fallback.py`, `personal_info/ai_chat/providers/` deleted | After Phase 3 complete |

Full spec: `docs/system-upgrade/40-ai-provider-gateway-billing.md §17`
Audit inventory: `docs/system-upgrade/41-direct-llm-call-audit-and-migration.md` (R030 — 40 files classified, P0/P1/P2/P3 assigned, deletion criteria documented)

---

## AI Architecture Consistency Gate (Pre-R027)

Before any R027 implementation task starts, the following consistency-pass blockers (doc 39 §12) must be resolved:

| Blocker | Task | Gate |
|---------|------|------|
| B1 | Delegation token design: algorithm, signing key, nonce storage | Blocks write-tier |
| B2 | `AIActionDescriptor v1` Python dataclass — canonical v1 field names | Blocks all registry work |
| B3 | `AIActionConfirmationToken` add `voice_confirmation_ttl_seconds` | Blocks voice |
| B4 | `check_execution_viability()` use `capability_level` not `risk_tier` | Blocks permission check |
| B5 | `ModuleAIAction` TypeScript: `voiceEligible`, `capabilityLevel`, `rollbackSupported` | Blocks frontend |
| B6 | `AIActionSummary`: `voice_eligible`, `capability_level` | Blocks context API |
| B7 | `platform_actions.py` examples use v1 field names | Blocks registry tests |

Full spec: `docs/system-upgrade/39-ai-architecture-consistency-pass.md §12`

---

## AI Action Platform Build Track (R027–R031)

Runs in parallel with the capabilities track. Each phase depends on the corresponding round's other work being stable.

| Round | AI Action Phase | Gate |
|-------|----------------|------|
| R027 | Registry + audit foundation + READ tier | After: `AIActionInvocation` + `AIActionConfirmationToken` migrations |
| R028 | Confirmation flow + WRITE_LOW + WRITE_HIGH | After: `useAIAction` hook + `AIActionPreviewCard` |
| R029 | Voice confirmation + ALA integration | After: ALA refactor complete; requires R028 |
| R030 | Approval queue + DESTRUCTIVE tier | After: `ApprovalService` extended; SSE available (same round) |
| R031 | Module manifests + org-level action config UI | After: all tiers working; Settings module available (R029) |

Full spec: `docs/system-upgrade/36-ai-action-platform.md`

### AI Capability Context (parallel to R027)

The AI Capability Context system (§23–§32 in doc 36) builds alongside the action registry. Key additions per round:

| Round | Context deliverable |
|-------|-------------------|
| R027 | `AIUserCapabilityContext` + `build_user_capability_context()` + `GET /api/ai/context` + `context_version` invalidation |
| R027 | Action filtering: `registry.get_actions_for_user()` + unavailable category summaries |
| R027 | Role-specific prompt policies: viewer/technician/manager/admin/system_admin/ai_agent |
| R028 | Stale context detection (HTTP 409) + client re-fetch flow |
| R029 | Voice prompt constraints: 8-action cap + `VOICE_PROMPT_ADDENDUM` |
| R031 | Org discovery profile personalization + onboarding mode |

---

## Floating AI Assistant Build Track (R032–R035)

Runs in parallel with module implementation rounds. Depends on AI Action Platform R027 (registry) being stable.

| Round | Floating Assistant Phase | Gate |
|-------|--------------------------|------|
| R032 | Shell layout mount + `FloatingAIButton` idle state + `useRegisterPageContext()` hook + `AIAssistantSessionState` Zustand store | No LLM wiring — context infra only |
| R033 | Drawer + chat UI + `GET /api/ai/context` wiring + first LLM message send + `PageContextDiff` computation | After: AI Capability Context endpoint (R027) |
| R034 | Action proposals in chat + `AIActionPreviewCard` + confirmation flow + `pendingConfirmationTokenId` tracking | After: AI Action Platform WRITE tier (R028) |
| R035 | Voice mode integration + active objective persistence + workflow resumption across navigation | After: Voice confirm flow (R029) + SSE (R030) |

Full spec: `docs/system-upgrade/38-floating-ai-assistant.md`

### Page Context Registry rollout (parallel to R032+)

Each page registers `PageAIContext` via `useRegisterPageContext()`. Priority order:

| Round | Pages to wire |
|-------|--------------|
| R032 | Helpdesk session detail, ticket list |
| R033 | User management, org settings, AI agents console |
| R034 | All remaining dashboard pages |
| R035 | Settings pages, admin tools |

---

## Quick Reference: Gate Summary

| Gate | Required Capabilities | Ready After |
|------|----------------------|-------------|
| **Helpdesk Phase A** | ActionButton, DetailView, FeatureFlags, TimeLine, StatCard, Notifications | R024 |
| **Helpdesk Phase B** | + PlatformTimeline full | R025 |
| **Helpdesk Phase C** | + ApprovalFlow, PolicyEngine | R028 |
| **Helpdesk Phase D** | + PlatformRealtime | R030 |
| **AI Agents** | All Helpdesk + JobRunner | R031 |
| **AI Action Platform READ** | AIActionRegistry + InvocationAudit | R027 |
| **AI Action Platform WRITE** | + ConfirmationToken + useAIAction hook | R028 |
| **AI Action Platform Voice** | + voice confirm flow + ALA wiring | R029 |
| **AI Action Platform Full** | + ApprovalQueue + module manifests | R031 |
| **Floating AI Assistant (infra)** | `FloatingAIButton` + `AIAssistantSessionState` + `useRegisterPageContext()` | R032 |
| **Floating AI Assistant (LLM)** | Drawer + chat + AI context wiring + `PageContextDiff` | R033 |
| **Floating AI Assistant (actions)** | `AIActionPreviewCard` + confirmation flow | R034 |
| **Floating AI Assistant (voice)** | Voice mode + objective persistence + workflow resumption | R035 |
| **Module Import/Export** | JobRunner + ImportExport full + Wizard + AuditLog | R032+ |
| **Production** | FeatureFlags, AuditLog, Notifications, CSP headers, Flask cookie security | R026 |
