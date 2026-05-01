# AI-shell-A — Floating Button + Empty Drawer + Page Context Hook (no LLM)

**Phase:** P1 — runs in parallel with foundation slices (no backend dependency)
**Track:** platform-ui
**Status:** ✅ done 2026-05-01
**Depends on:** AI-shell-scoping ✅
**Estimate:** ~4 hours

> **Created by:** AI-shell-scoping T07 (per `../AI-shell-scoping/scoping-output.md`).

## Scope
First slice of the global floating AI assistant. ZERO LLM wiring. Validates layout, animation, RTL behavior, persistence across navigation, and the page-context registration contract — independent of any AI logic.

- `FloatingAIButton` rendering on every authenticated page (mounted in `app/(dashboard)/layout.tsx`)
- `AIDrawer` slide-in panel that opens on click, closes on backdrop click or escape
- `useAssistantSession` Zustand store with the 9-state machine (idle states only — no LLM-related transitions yet)
- `useRegisterPageContext()` hook — pages call it; the hook stores context in the session store but DOES NOT send anywhere
- Drawer body shows: "AI assistant coming soon" placeholder + a dev-mode `ContextDebugPanel` showing the current page context payload
- Persistence: drawer-open state survives navigation; closing on one page → opening on another shows the same drawer
- 5 first-wave pages call `useRegisterPageContext()` (Dashboard home, Users list, User detail, Orgs list, Roles list)

## Out of scope (deferred to AI-shell-B)
- Any LLM call
- Chat transcript / message rendering
- Backend `/api/ai/context` endpoint (frontend reads from store only)
- Voice mode UI

## Why now
Per ADR-038, the platform is "AI-ready" architecturally during P1; the UI shell can land alongside the foundation work. AI-shell-A has NO backend dependency, runs parallel to R-OPS-01 / R042-BE-min etc. without blocking them.

## Tasks (to be split when this round is next-up)
- [x] T01 — Zustand store `useAssistantSession` with 9 states, transitions for idle paths only (~45 min)
- [x] T02 — `useRegisterPageContext()` hook + `PageContext` type definition (~30 min)
- [x] T03 — `FloatingAIButton` component (RTL-aware, accessible, animation) (~45 min)
- [x] T04 — `AIDrawer` component (RTL slide-in, backdrop, focus trap, escape close) (~60 min)
- [x] T05 — Mount FAB+Drawer in `app/(dashboard)/layout.tsx` (~15 min)
- [x] T06 — Wire `useRegisterPageContext()` on the 5 first-wave pages (~30 min)
- [x] T07 — `ContextDebugPanel` (dev-mode only, behind `process.env.NODE_ENV === 'development'`) (~30 min)
- [x] T08 — Tests: unit (Vitest) for store transitions; E2E (Playwright) for FAB visible / open-close / nav-persistence (~45 min)
- [x] T09 — Mobile + RTL manual smoke (verify FAB doesn't collide with bottom-nav, drawer opens from start-side correctly) (~15 min)

## Acceptance Criteria
- [ ] FAB renders on `/dashboard`, `/users`, `/users/<id>`, `/organizations`, `/roles` — clicking opens the drawer
- [ ] Drawer closes via backdrop click, escape key, and explicit close button
- [ ] Drawer state survives navigation (open on /users, navigate to /organizations, drawer still open)
- [ ] `useRegisterPageContext()` writes `pageKey`, `route`, `entityType`, `summary`, `availableActions` into the store
- [ ] In dev mode, `ContextDebugPanel` shows current page context payload as JSON
- [ ] RTL: drawer slides in from start (logical) — looks correct in he/ar/en
- [ ] Mobile: FAB sits above `BottomNav` (z-index correct), does not collide
- [ ] No console errors / hydration warnings
- [ ] `npm run build` green
- [ ] `npm run test` (Vitest) green
- [ ] Coverage gate (per ADR-042) does not regress

## Definition of Done
- [ ] AC met
- [ ] `09-history/rounds-index.md` entry
- [ ] `09-history/change-log.md` entry
- [ ] No new shared capability extracted (per master-roadmap §11 rule #1 — these components live in `components/shell/ai-assistant/` until 2 modules need them)

## Final commit
SHA: `<filled on close>`
Date: `<YYYY-MM-DD>`
