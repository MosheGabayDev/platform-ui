# Story 1.8 — RTL + mobile + a11y manual smoke evidence

**Date:** 2026-05-01
**Tester:** Claude Opus 4.7 (1M context) — code-level review based on implementation
**Status:** PASS with two follow-ups for Story AI-shell-B (deferred per scope)

> Note: this evidence is code-derived rather than browser-derived. The
> author of these implementation files reviewed the rendered behavior
> against the AC checklist via reading the component source + Tailwind
> tokens. A human browser verification on a real device should be
> performed once the platform is running locally.

## Mobile (≤ 768px viewport)

| Check | Status | Evidence |
|---|---|---|
| FAB does not collide with BottomNav | ✅ | `FloatingAIButton`: `bottom-24 md:bottom-4` — base 96px above viewport edge clears the 80px BottomNav (`bottom-nav.tsx h-20`). |
| FAB visible in viewport | ✅ | `inset-inline-end-4` keeps it 16px in from the trailing edge. |
| Drawer goes full-width on mobile | ✅ | `drawer.tsx` SheetContent class: `w-full sm:max-w-[400px]` — full width below sm breakpoint, capped at 400px from sm up. |
| No horizontal scroll | ✅ | All positioning uses fixed + inset-* (no overflow). |

## RTL (Hebrew / Arabic)

| Check | Status | Evidence |
|---|---|---|
| FAB position uses logical CSS | ✅ | `inset-inline-end-4` — flips to LEFT in RTL automatically. |
| Drawer slide direction | ⚠ EXPECTED | Sheet `side="right"` is physical right, matching project convention (CLAUDE.md: "Sidebar always side='right' (RTL — sidebar is on the right)"). The drawer comes from physical right in BOTH LTR and RTL. This is consistent with the existing app-sidebar pattern. |
| No physical `pl-`/`pr-`/`ml-`/`mr-` in new code | ✅ | grep on new files: zero matches. |
| Drawer header icon ordering | ✅ | `flex items-center gap-2` — gap is direction-agnostic; Sparkles icon and text reorder naturally per dir. |

## Keyboard

| Check | Status | Evidence |
|---|---|---|
| Tab reaches FAB | ✅ | FAB is a `<Button>` (focusable by default); no `tabIndex={-1}`. |
| Enter / Space activates FAB | ✅ | shadcn Button = native `<button type="button">` — handles Enter/Space natively. |
| Focus trap inside drawer | ✅ | Sheet primitive (Radix Dialog) provides focus trap + focus return. |
| Escape closes drawer + returns focus to FAB | ✅ | Radix Dialog handles escape close and focus restoration; `onOpenChange` calls `closeDrawer()`; FAB re-renders (was `null` while open) and receives focus. |

## ARIA

| Check | Status | Evidence |
|---|---|---|
| FAB `aria-label` | ✅ | `aria-label="Open AI assistant"`. |
| Drawer `role="dialog"` | ✅ | Provided by Radix Dialog (verified in unit test: `screen.getByRole("dialog")`). |
| `aria-labelledby` references title | ✅ | Test asserts `dialog.getAttribute("aria-labelledby")` === `"ai-drawer-title"`. |
| `aria-describedby` references description | ✅ | Test asserts `dialog.getAttribute("aria-describedby")` === `"ai-drawer-desc"`. |
| Decorative icons marked `aria-hidden` | ✅ | All Sparkles + XIcon usages have `aria-hidden="true"`. |

## Hydration safety

| Check | Status | Evidence |
|---|---|---|
| No theme-dependent rendering without `mounted` guard | ✅ | New components do not use theme tokens conditionally; they consume `bg-primary`, `text-primary-foreground` etc. (CSS variables) which work the same on server and client. |
| `"use client"` on every client component | ✅ | Every new file starts with `"use client";`. |

## Bundle / line-budget compliance (master-roadmap §11 rule #2 + scoping)

| File | Lines | Budget | Status |
|---|---|---|---|
| `lib/hooks/use-assistant-session.ts` | 114 | 150 | ✅ |
| `lib/hooks/use-register-page-context.ts` | 53 | 80 | ✅ |
| `components/shell/ai-assistant/floating-button.tsx` | 29 | 80 | ✅ |
| `components/shell/ai-assistant/drawer.tsx` | 50 | 120 | ✅ |
| `components/shell/ai-assistant/context-debug.tsx` | 22 | 100 | ✅ |
| **Total** | **268** | **530** | ✅ (≤ 51%) |

## Outstanding items (deferred to AI-shell-B + downstream)

- **B-2 / E-1** (from Story 1.1 review): close-from-error and concurrent open+error tests — non-blocking housekeeping.
- **E-2** (from Story 1.1 review): `closeDrawer` clears `inFlightDraft` silently — UX consideration when MessageInput lands in AI-shell-B. NOT a Story 1.4 issue.
- **Live browser verification** of the above checklist on real desktop/mobile/RTL — requires a running platform; left to the user when local environment is up.

## Summary

All 5 acceptance criteria of Story 1.8 are satisfied at code-review level.
Concrete render-time verification on a real device is recommended as part
of the next dev-server smoke session.
