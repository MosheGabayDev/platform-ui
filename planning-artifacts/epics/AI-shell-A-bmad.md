---
stepsCompleted: ["step-01-validate-prerequisites", "step-02-design-epics", "step-03-create-stories"]
inputDocuments:
  - docs/system-upgrade/03-roadmap/master-roadmap.md
  - docs/system-upgrade/05-ai/floating-assistant.md
  - docs/system-upgrade/10-tasks/AI-shell-scoping/scoping-output.md
  - docs/system-upgrade/10-tasks/AI-shell-A-fab-drawer/epic.md
  - docs/system-upgrade/02-rules/development-rules.md
  - docs/design/COMPONENTS.md
  - docs/design/ANIMATIONS.md
  - docs/design/MOBILE.md
---

# platform-ui — Epic Breakdown — AI-shell-A

## Overview

This document is the BMAD-format epic and story breakdown for **AI-shell-A** (Floating AI Button + Empty Drawer + Page Context Hook — no LLM).

It is the FIRST build round of the global Floating AI Assistant. Per ADR-038, this round delivers the UI shell during P1 alongside the foundation work. Zero LLM wiring; the round validates layout, animation, RTL, persistence, and the page-context contract independently of any AI call.

The native epic format lives in `docs/system-upgrade/10-tasks/AI-shell-A-fab-drawer/epic.md`. This document is the BMAD-conforming story breakdown that bridges the native epic into BMAD's `bmad-create-story` and `bmad-dev-story` workflow.

## Requirements Inventory

### Functional Requirements (FRs)

- **FR-A01** — A floating AI button MUST be visible on every authenticated page.
- **FR-A02** — Clicking the button MUST open a slide-in drawer.
- **FR-A03** — The drawer MUST close on backdrop click, escape key, or explicit close button.
- **FR-A04** — Drawer open/closed state MUST persist across page navigation within a session.
- **FR-A05** — Pages MUST be able to register their AI page context via a `useRegisterPageContext()` hook.
- **FR-A06** — The session store MUST implement the 9-state machine from `scoping-output.md`, with idle-path transitions wired (LLM-related transitions stubbed).
- **FR-A07** — In development mode, a Context Debug Panel MUST display the current page-context payload as JSON.
- **FR-A08** — Five first-wave pages (Dashboard, Users list, User detail, Orgs list, Roles list) MUST call `useRegisterPageContext()` with correct payloads.

### Non-Functional Requirements (NFRs)

- **NFR-A01** — RTL behavior: drawer slides in from the start (logical) edge in he/ar/en. (`02-rules/development-rules.md §RTL`)
- **NFR-A02** — Mobile: FAB MUST sit above `BottomNav` (z-index correct), MUST NOT collide with `pb-20 md:pb-0` content padding.
- **NFR-A03** — Hydration safety: any theme-dependent rendering uses `mounted` guard. (`CLAUDE.md §Hard Rules`)
- **NFR-A04** — Animation: drawer slide ≤ 0.5s; uses Framer Motion within `LazyMotion`; no `width`/`height` animation. (`docs/design/ANIMATIONS.md`)
- **NFR-A05** — Accessibility: focus trap inside drawer when open; escape returns focus; ARIA labels on FAB and close button.
- **NFR-A06** — Coverage gate (per ADR-042) MUST NOT regress; new code in `lib/hooks/`, `components/shell/ai-assistant/` meets the per-layer floor.
- **NFR-A07** — Build green: `npm run build` + `npm run typecheck` + `npm run lint` all EXIT 0.
- **NFR-A08** — Zero direct LLM imports introduced (this round must not call any LLM SDK).

### Additional Requirements

- **AR-A01** — All components conform to the existing design system tokens (`docs/design/TOKENS.md`).
- **AR-A02** — Shared services contract (ADR-028): no local replacements for shared capabilities. The new components are NEW (not replacements) and live under `components/shell/ai-assistant/`.
- **AR-A03** — Single-trunk workflow: each story = one commit on master, build green, pushed. No feature branches.

### UX Design Requirements

- Drawer width: 400px desktop, full-width mobile (≤ 768px).
- FAB position: `inset-inline-end-4 inset-block-end-4` desktop; on mobile, above bottom-nav (`bottom-24 md:bottom-4`).
- FAB icon: `Sparkles` from lucide-react (or equivalent — confirm with design system).
- Drawer header: project accent color background; close button on the trailing edge (RTL-aware).
- Empty state inside drawer: centered "AI assistant coming soon" with subtle iconography.

### FR Coverage Map

| FR | Story | Native Task |
|---|---|---|
| FR-A01 | 1.3 | T03+T05 |
| FR-A02 | 1.3, 1.4 | T03, T04 |
| FR-A03 | 1.4 | T04 |
| FR-A04 | 1.5 | (T04 AC) |
| FR-A05 | 1.2 | T02 |
| FR-A06 | 1.1 | T01 |
| FR-A07 | 1.6 | T07 |
| FR-A08 | 1.0 | T06 |
| NFR-A01..A08 | 1.7, 1.8 | T08, T09 |

## Epic List

- **Epic 1: AI Shell A — Floating Button + Drawer + Page Context (no LLM)**

---

## Epic 1: AI Shell A — Floating Button + Drawer + Page Context (no LLM)

**Epic Goal:** Deliver the always-visible floating AI button + drawer shell + page-context registration contract as a foundation that subsequent rounds (AI-shell-B, AI-shell-C) build LLM features on top of. Zero LLM wiring this round — validate layout, animation, RTL, persistence, accessibility independently.

**Success measure:** A user signed in to platform-ui sees a FAB on Dashboard, Users, Orgs, Roles pages; clicking opens a drawer that contains the dev-mode context panel with correct page payloads; closing returns to FAB; navigating between pages preserves drawer state. Build is green; coverage gate passes.

---

### Story 1.0: Wire the five first-wave pages with `useRegisterPageContext()`

As an **AI Product Owner**,
I want the **five first-wave pages (Dashboard, Users list, User detail, Orgs list, Roles list)** to declare their AI context,
So that **subsequent rounds (AI-shell-B, AI-shell-C) have real context to work with from day one**.

**Acceptance Criteria:**

**Given** the user navigates to `/dashboard`
**When** the page mounts
**Then** the assistant session store contains a `PageContext` with `pageKey="dashboard.home"`, `route="/"`, `entityType=null`, `summary` describing the dashboard's KPI cards, and `availableActions=[]`.

**Given** the user navigates to `/users`
**When** the page mounts
**Then** the store contains `pageKey="users.list"`, `entityType="user"`, `availableActions=["users.create", "users.export"]`.

**Given** the user navigates to `/users/<id>`
**When** the detail page mounts with a known user
**Then** the store contains `pageKey="users.detail"`, `entityType="user"`, `entityId=<id>`, `availableActions=["users.deactivate", "users.update"]`.

**Given** the user navigates to `/organizations`
**When** the page mounts
**Then** the store contains `pageKey="orgs.list"`, `entityType="organization"`, `availableActions=["orgs.create"]`.

**Given** the user navigates to `/roles`
**When** the page mounts
**Then** the store contains `pageKey="roles.list"`, `entityType="role"`, `availableActions=[]`.

**Given** the user navigates away from any of these pages
**When** the next page mounts
**Then** the previous page's context is replaced (no stacking) and the new context appears in the store.

---

### Story 1.1: Implement `useAssistantSession` Zustand store with the 9-state machine

As a **frontend developer**,
I want **a Zustand session store with the full 9-state finite machine and explicit idle-path transitions**,
So that **all assistant UI components share consistent state and future LLM/voice rounds plug in without refactor**.

**Acceptance Criteria:**

**Given** a fresh page load
**When** the store is initialized
**Then** state is `closed`, transcript is empty array, `pendingConfirmationTokenId` is null, drawer-open flag is false.

**Given** the store is in `closed` state
**When** `openDrawer()` action is dispatched
**Then** state transitions to `chatting_idle` AND drawer-open flag becomes true.

**Given** the store is in `chatting_idle`
**When** `closeDrawer()` is dispatched
**Then** state transitions to `closed` AND drawer-open flag becomes false AND in-flight message draft is cleared.

**Given** any non-error state
**When** an unhandled error is dispatched via `setError(subtype)`
**Then** state transitions to `error` with the given subtype recorded.

**Given** state is `error[*]`
**When** `dismissError()` is dispatched
**Then** state transitions to `chatting_idle`.

**Given** the user navigates between pages while the drawer is open
**When** the new page mounts
**Then** drawer-open flag remains true AND state remains in its current chat state (does not reset).

**And** unit tests cover all idle-path transitions (8 transitions minimum) and assert no transitions exist FROM idle states TO LLM-related states (those are wired in AI-shell-B).

---

### Story 1.2: Implement `useRegisterPageContext()` hook + `PageContext` type

As a **page-component author**,
I want **a single hook that takes a `PageContext` object and registers it with the assistant**,
So that **adding AI awareness to a new page is one line of code**.

**Acceptance Criteria:**

**Given** the `PageContext` TypeScript type defines `pageKey: string`, `route: string`, `entityType?: string`, `entityId?: string`, `summary: string`, `availableActions: string[]`, `dataSamples?: Record<string, unknown>`, `voiceEligible?: boolean`
**When** a page calls `useRegisterPageContext(context)`
**Then** the context is stored in the session store under the current `pageKey`.

**Given** a page registers with deps that change (e.g. filter state)
**When** the deps change
**Then** the hook re-emits the context after a 300ms debounce (verifiable via timer-mocked unit test).

**Given** a page unmounts
**When** the cleanup runs
**Then** the hook calls `clearPageContext(pageKey)`.

**Given** `dataSamples` is provided
**When** the hook stores it
**Then** the values pass through unmodified (PII redaction is the page's responsibility — documented in JSDoc on the hook).

**And** unit tests cover: register, re-emit on deps change, debounce, cleanup.
**And** TypeScript types compile without `any`.

---

### Story 1.3: Render `FloatingAIButton` on every authenticated page

As an **authenticated user**,
I want **a floating AI button visible at the bottom-end of every dashboard page**,
So that **I can summon the assistant from any context**.

**Acceptance Criteria:**

**Given** I am signed in
**When** I navigate to `/dashboard`
**Then** I see a circular FAB at the bottom-end of the viewport with a Sparkles icon and `aria-label="Open AI assistant"`.

**Given** the same condition
**When** I navigate to `/users`, `/users/<id>`, `/organizations`, `/roles`
**Then** the FAB remains visible at the same position on all of them.

**Given** I am NOT signed in
**When** I view the login page
**Then** the FAB is NOT rendered (unauthenticated routes do not include it).

**Given** I am on a mobile viewport (≤ 768px)
**When** the page renders
**Then** the FAB is positioned ABOVE the BottomNav (`bottom-24` instead of `bottom-4`).

**Given** the user clicks the FAB
**When** the click fires
**Then** the assistant store dispatches `openDrawer()`.

**And** the FAB component is ≤ 80 lines TS, lives at `components/shell/ai-assistant/floating-button.tsx`.
**And** the component uses logical CSS properties only (no `right-`, `left-`).
**And** keyboard navigation: `Tab` reaches the FAB; `Enter`/`Space` activates it.

---

### Story 1.4: Implement `AIDrawer` slide-in panel with focus management

As an **authenticated user**,
I want **a slide-in drawer that opens with the FAB click and closes via backdrop / escape / close button**,
So that **the AI workspace appears predictably and respects standard UX patterns**.

**Acceptance Criteria:**

**Given** drawer-open is false
**When** the user clicks the FAB
**Then** the drawer slides in from the start edge (logical, RTL-aware) within ≤ 0.5s.

**Given** the drawer is open
**When** the user clicks the backdrop area outside the drawer
**Then** the drawer closes AND focus returns to the FAB.

**Given** the drawer is open
**When** the user presses `Escape`
**Then** the drawer closes AND focus returns to the FAB.

**Given** the drawer is open
**When** the user clicks the explicit `×` close button in the drawer header
**Then** the drawer closes.

**Given** the drawer is open
**When** the user presses `Tab`
**Then** focus stays trapped within the drawer (last focusable → first focusable cycle).

**Given** the drawer body is empty placeholder
**When** the drawer opens for the first time
**Then** body shows centered "AI assistant coming soon" text + Sparkles icon.

**And** drawer width is 400px on desktop, full-width on mobile.
**And** drawer uses Framer Motion (within `LazyMotion`) — no `width`/`height` animations.
**And** component is ≤ 120 lines TS at `components/shell/ai-assistant/drawer.tsx`.
**And** ARIA: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` references the header.

---

### Story 1.5: Persist drawer state across navigation

As an **authenticated user**,
I want **the drawer to stay open if I navigate to another page while it's open**,
So that **a multi-page workflow is not interrupted**.

**Acceptance Criteria:**

**Given** the drawer is open on `/users`
**When** I navigate to `/organizations`
**Then** the drawer is STILL open on `/organizations` AND its current state is preserved (transcript, voice mode flag, etc.).

**Given** the drawer is closed
**When** I navigate to a different page
**Then** the drawer remains closed.

**Given** I refresh the browser (full page reload)
**When** the page reloads
**Then** the drawer state resets to closed (session-only persistence — not cross-reload).

**And** an E2E Playwright test asserts open-then-navigate behavior end-to-end.

---

### Story 1.6: Render `ContextDebugPanel` in development mode

As a **frontend developer working in dev mode**,
I want **a panel inside the drawer that shows the current `PageContext` as JSON**,
So that **I can verify pages are registering the correct payload before the LLM is wired**.

**Acceptance Criteria:**

**Given** `process.env.NODE_ENV === 'development'`
**When** the drawer is open
**Then** the drawer body shows a `<pre>` block with the JSON-stringified current page context (pretty-printed).

**Given** `process.env.NODE_ENV === 'production'`
**When** the drawer is open
**Then** the panel is NOT rendered (zero bundle weight in production).

**Given** the user navigates between pages with the drawer open
**When** the new context arrives in the store
**Then** the panel updates within 300ms (matches the debounce in Story 1.2).

**And** the component is ≤ 100 lines TS at `components/shell/ai-assistant/context-debug.tsx`.

---

### Story 1.7: Vitest + Playwright coverage for AI-shell-A

As a **QA engineer**,
I want **unit tests on the store + hook + components, and E2E tests on the FAB-drawer behavior**,
So that **regressions are caught and the coverage gate (ADR-042) does not drop**.

**Acceptance Criteria:**

**Given** Vitest is configured (R-OPS-01 prerequisite)
**When** I run `npm run test`
**Then** unit tests for `useAssistantSession`, `useRegisterPageContext`, `FloatingAIButton`, `AIDrawer`, `ContextDebugPanel` all pass.

**Given** unit tests run
**When** they cover the store
**Then** all state transitions defined in the 9-state machine for idle paths are covered (≥ 8 transitions).

**Given** Playwright is configured
**When** I run `npm run test:e2e`
**Then** new specs `tests/e2e/ai-shell/fab-visible.spec.ts`, `drawer-open-close.spec.ts`, `nav-persistence.spec.ts` all pass.

**Given** the coverage report is generated
**When** I compare layer coverage to baseline
**Then** `lib/hooks/` ≥ 80%, `components/shell/` ≥ 50% (per ADR-042 floors); no layer regresses by more than 1 percentage point.

**And** test evidence: `Tests-CI: <github-actions-run-url>` is in the closing commit's trailer.

---

### Story 1.8: RTL + mobile manual smoke + a11y check

As an **RTL Hebrew/Arabic user on mobile**,
I want **the FAB and drawer to render correctly in RTL and on small screens**,
So that **the experience is consistent across locales and viewports**.

**Acceptance Criteria:**

**Given** I view the app at 375×667 (iPhone SE) viewport
**When** the dashboard renders
**Then** the FAB sits above the BottomNav with no visual collision and no horizontal scroll appears.

**Given** my browser locale is `he`
**When** the page loads
**Then** the FAB is positioned at `inset-inline-end-4` (which renders on the LEFT in RTL) AND the drawer slides in from the LEFT (logical start).

**Given** my locale is `en`
**When** the same actions occur
**Then** FAB is on the RIGHT, drawer slides in from the RIGHT.

**Given** keyboard-only navigation
**When** I `Tab` from the page content
**Then** I reach the FAB before the BottomNav items; `Enter` opens the drawer; `Tab` cycles within it; `Escape` closes and returns focus to the FAB.

**Given** screen reader (VoiceOver / NVDA) reads the FAB
**When** the user encounters it
**Then** announcement is "Open AI assistant, button" (from `aria-label`).

**And** manual smoke checklist screenshot/video evidence is attached to the closing commit message OR linked from the round's `09-history/rounds-index.md` entry.
**And** no axe-core violations on the dashboard page when the drawer is open (run `axe-playwright` in the E2E suite if installed; otherwise document manual audit).

---

## Story dependencies (sequencing)

```
1.1 (store)  ──┐
                ├──> 1.3 (FAB) ──> 1.4 (drawer) ──> 1.5 (persistence) ──> 1.7 (tests)
1.2 (hook)   ──┘                                                          │
                       1.0 (5 pages wired) ─────────────────────────────┐ │
                       1.6 (debug panel) ───────────────────────────────┴─┴─> 1.8 (RTL/mobile/a11y)
```

Recommended order: **1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.0 → 1.6 → 1.7 → 1.8**.

Parallel opportunity: 1.3 and 1.6 are independent of each other once 1.1 is done.

## Step 4 — Final validation

- [x] Every FR has a story (FR coverage map above).
- [x] Every story has Given/When/Then ACs.
- [x] No story exceeds 2h estimated work (matches `10-tasks/README.md` task sizing guide).
- [x] Story 1.7 (tests) has its own AC for coverage gate per ADR-042.
- [x] Story 1.8 covers NFRs RTL/mobile/a11y explicitly.
- [x] Stories follow INVEST: Independent (mostly — sequencing via dependency graph), Negotiable, Valuable, Estimable, Small, Testable.
- [x] Workflow rules: every story closes with one commit on master + push.

**Ready to proceed to:** `bmad-create-story` for Story 1.1 (first in dependency order). When `bmad-create-story` runs, it will produce a detailed story spec at `implementation-artifacts/stories/AI-shell-A-1.1.md` with Dev Notes (file paths, code patterns to use, references) ready for `bmad-dev-story` to implement.
