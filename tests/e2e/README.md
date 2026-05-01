# platform-ui E2E test suite

Strategic layout designed to scale to full system coverage. Every new module
adds a folder under [`modules/`](modules/) and reuses the shared fixture.

## Layout

```
tests/e2e/
  fixtures/
    base.ts                — extended Playwright `test` with:
                              · mock NextAuth session injection
                              · feature-flag endpoint mock (configurable)
                              · ErrorCapture attached to page
  helpers/
    auth.ts                — REAL Flask login (use when RBAC must be real)
    mock-session.ts        — mints NextAuth JWE cookie locally (offline demo)
    error-capture.ts       — captures console/pageerror/network failures
  modules/                 — one folder per module
    ai-shell/
    helpdesk/
    users/
    organizations/
    roles/
    ...
  smoke/                   — cross-cutting golden-path + redirect tests
    dashboard.spec.ts
    golden-path.spec.ts
  security/                — RBAC + cross-tenant isolation specs
```

## Convention

Every spec **must** import from the base fixture:

```ts
import { test, expect } from "../fixtures/base";
//                          ^^^^^^^^^^^^^^^
//                          NOT "@playwright/test"
```

That single import gives you:

1. A logged-in admin session (mock JWE, no Flask required for MOCK_MODE clients).
2. Open feature flags (override via `flagOverrides` fixture if needed).
3. Browser error capture — console errors, page errors, failed requests, 4xx/5xx
   responses. Captured errors are persisted per test under
   `test-results/error-capture/*.json` and surfaced in HTML reports.

When real Flask + real RBAC is required (full integration tests, audit, billing),
import directly from `@playwright/test` and use `helpers/auth.ts` `login()` instead.

## Running

```bash
# Headed (watch browser) — for demos / debugging
npx playwright test --headed --workers=1

# Headless (CI default)
npx playwright test

# Single module
npx playwright test tests/e2e/modules/helpdesk/

# UI mode (interactive)
npx playwright test --ui
```

The Next.js dev server must already be running on the URL configured in
`playwright.config.ts` (`http://localhost:3001` by default). The config does
NOT auto-start it.

## Error report

After any run with the base fixture, generate an aggregated report:

```bash
node scripts/aggregate-e2e-errors.mjs
```

Output: `planning-artifacts/reviews/<YYYY-MM-DD>-e2e-error-report.md` —
sorted by frequency, grouped by module/route. Use this as the source of truth
for browser-side defects discovered during E2E.

## Adding a new module

1. Create `tests/e2e/modules/<module>/` (e.g. `agents/`).
2. (Optional) `fixtures.ts` — extend the base fixture with module-specific
   data (seeded entity ids, etc.).
3. Add `*.spec.ts` files. Always import from `fixtures/base`.
4. Skip a spec when prerequisites missing — never `test.fail()` for env gaps.
5. Update `docs/system-upgrade/02-rules/testing-standard.md` if a new pattern
   is introduced (cross-tenant, time-mocking, ws-mocking).

## What the base fixture intentionally does NOT do

- It does NOT log into real Flask. Add `helpers/auth.ts` `login()` per-test
  for that — the mock session is purely for offline UI iteration.
- It does NOT seed database state. Add a per-module setup spec or use
  Flask's seed scripts for live integration runs.
- It does NOT run performance assertions. Use `tests/e2e/performance/`
  (future) with separate budgets.
