# whatsapp — E2E Coverage Plan

> Standard: `docs/system-upgrade/02-rules/e2e-coverage.md`
> Last updated: 2026-05-14 (batch 160)
> Status: smoke-level (1 spec); needs full surface coverage before Phase 5A.WA flip

---

## Current state

| Surface | Spec file | Coverage |
|---|---|---|
| `/whatsapp/sessions` smoke | `tests/e2e/smoke/whatsapp.spec.ts` | renders title + Link CTA + capture sidebar; QR dialog opens; unlink uses confirm dialog (no native confirm) |
| `/whatsapp` (archive list) | — | **MISSING** |
| `/whatsapp/chats/[id]` | — | **MISSING** |
| `/whatsapp/search` | — | **MISSING** |
| `/whatsapp/admin/dsr` | — | **MISSING** |
| Cross-tenant isolation | `tests/e2e/security/tenant-isolation-helpdesk.spec.ts` (helpdesk-only; needs whatsapp twin) | **MISSING** |

---

## Required specs (before Phase 5A.WA flip)

Each spec MUST:

1. Import `test`/`expect` from `tests/e2e/fixtures/base.ts`
2. Exercise the golden path
3. Exercise at least one error / empty / loading state
4. Assert no `page-error`, no unexpected `console-error`, no 5xx
5. For pages with confirm dialogs: assert dialog appears (no `window.confirm`)
6. RTL check: `dir="rtl"` present, no horizontal overflow at 320×568

### `tests/e2e/whatsapp/archive.spec.ts` — `/whatsapp`

| Test | Asserts |
|---|---|
| renders title, search input, kind filters | page heading visible, `data-testid="whatsapp-chat-search"`, 3 kind-filter buttons |
| filter "group" narrows the list | clicking `whatsapp-kind-group` reduces visible rows; private chats hidden |
| search by query narrows results | typing into search input updates DataTable; empty results show EmptyState |
| FeatureGate disables when flag off | with `whatsapp.enabled=false` in fixture, page renders disabled EmptyState |

### `tests/e2e/whatsapp/chat-detail.spec.ts` — `/whatsapp/chats/[id]`

| Test | Asserts |
|---|---|
| renders messages newest-first | first bubble = newest message |
| owner sees ShareDialog button | when `access_kind=owner` and current user has `whatsapp.share`, button visible |
| **NEW (batch 160)** non-owner without `whatsapp.share` does NOT see Share button | PermissionGate hides the trigger |
| recipient (shared-in) sees revoke-my-access banner instead of ShareDialog | `access_kind=shared` → banner with revoke button |
| invalid chat id returns ErrorState | route `/whatsapp/chats/abc` → renders `ErrorState` |
| revoked message renders placeholder | message with `revoked_at != null` shows `[revoked]` not body |

### `tests/e2e/whatsapp/search.spec.ts` — `/whatsapp/search`

| Test | Asserts |
|---|---|
| idle state when query empty | no API call; renders `idleTitle` empty state |
| query returns result list with highlight | typing "invoice" returns hit; highlight snippet contains the term |
| no results → empty state | query "zzzzzzz" returns 0 results; renders `emptyTitle` |
| result row links to chat detail | clicking a result navigates to `/whatsapp/chats/[chat_id]` |

### `tests/e2e/whatsapp/sessions.spec.ts` — `/whatsapp/sessions` (expands existing smoke)

| Test | Asserts |
|---|---|
| (existing) renders title + Link CTA + sidebar | — |
| (existing) Link click opens QR dialog | — |
| (existing) Unlink uses confirm dialog | — |
| relink button visible on active session | when session_state in {needs_qr, connecting} relink button shown |
| **NEW** self-erase requires acknowledge checkbox | submit button disabled until checked |
| **NEW (P1)** self-erase reason required | requires non-empty reason — currently optional; gap from review |
| **NEW (P1)** QR dialog has `aria-live="polite"` on state | state changes announced to screen readers |
| permission denied → empty state | user without `whatsapp.session.manage` sees EmptyState without Link CTA |

### `tests/e2e/whatsapp/dsr.spec.ts` — `/whatsapp/admin/dsr`

| Test | Asserts |
|---|---|
| restricted fallback for non-admin | user without `whatsapp.delete_by_subject` (now registered) → restricted state, no form |
| preview surfaces phone-masked + counts | submit phone → PreviewPanel renders with masked phone + metric tiles |
| delete disabled without acknowledge | reason filled + preview present but acknowledge unchecked → button disabled |
| delete disabled without preview | acknowledge + reason but no preview → button disabled (current `canDelete` check) |
| high_risk preview shows second-approval badge | preview with `requires_second_approval=true` → red badge |
| job history sidebar lists past jobs | mock fixture jobs render with state badges |
| approve appears only on `awaiting_second_approval` state | status panel shows Approve button only when state matches |

### `tests/e2e/whatsapp/share.spec.ts` — ShareDialog flow

| Test | Asserts |
|---|---|
| **NEW (batch 160)** button absent without `whatsapp.share` | PermissionGate hides — Share2 button NOT rendered for user with only `whatsapp.access` |
| button present with permission | user with `whatsapp.share` sees Share2 button on owned chat detail |
| dialog lists active shares | shares exist → renders rows with recipient names |
| recipient typeahead requires 2 chars | typing 1 char → no API call; 2+ chars → list |
| recipient already-shared is disabled | options with `id` in active shares show "alreadyShared" badge, button disabled |
| share creation triggers audit emit | mock audit log gains `whatsapp.share.created` entry |
| revoke removes share from list | click trash icon → row disappears, audit `whatsapp.share.revoked` |

### `tests/e2e/security/whatsapp-tenant-isolation.spec.ts` — cross-org

Status: **scaffolded only, BE-blocked.** Requires 2 real test orgs.

| Test | Asserts |
|---|---|
| Org B cannot fetch Org A chats | login as Org B user, hit `/api/proxy/whatsapp/api/chats` → returns Org B's chats only |
| Org B cannot share to Org A user | POST share with cross-org `shared_with_user_id` → 404 `recipient_not_found` |
| Org B cannot read Org A chat by ID | direct GET to `/api/proxy/whatsapp/api/chats/{org_A_chat_id}/messages` → 404 `not_found` (not 403; ambiguity rule) |
| Webhook from bridge missing HMAC rejected | POST `/api/whatsapp/webhook/ingest` without signature → 401 |
| Bridge HMAC valid but timestamp stale → 400 | timestamp drift > 300s → rejected |

---

## Browser-error capture (required by testing-standard.md)

Every spec listed above runs `aggregate-e2e-errors.mjs` post-pass.
Acceptance criteria: 0 console errors with severity ≥ warn, 0 page errors,
0 5xx responses to the FE.

---

## Mobile / RTL

| Viewport | Status |
|---|---|
| 320×568 (mobile S) — RTL Hebrew | required: `dir="rtl"`, no horizontal scroll, search field full-width, bottom-nav clear |
| 768×1024 (tablet) | grid switches from single-col to `lg:grid-cols-[1fr_320px]` (sessions page) |
| 1280×720 (desktop) | full layout, ShareDialog opens in centered modal |

Each spec MUST include `await page.setViewportSize({ width: 320, height: 568 })` for one assertion verifying no overflow.

---

## Action items (post Phase 5A.WA flip)

When BE lands (`NEXT_PUBLIC_MOCK_API=false`):

- [ ] Unskip `tests/e2e/security/whatsapp-tenant-isolation.spec.ts`
- [ ] Add real-fetch tests to `lib/api/real-fetch.test.ts` covering all 19 WhatsApp endpoints (batch 154 pattern)
- [ ] Verify Playwright HAR captures match BE response shapes
- [ ] Run k6 load test for `GET /api/search` p95 < 400ms (spec §13)
