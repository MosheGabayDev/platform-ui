# PlatformOnboardingFinish — Spec

> **Status:** drafted 2026-05-06 (Phase 3.1 of GENERIC_AI_PLATFORM_PROGRESS).
> Frontend-only consumer of caps 16 (Settings), 18 (Module Registry), 10 (Audit Log), AI-shell-A (assistant drawer).

---

## 1. Why this matters

Phase 1.3 shipped `/onboarding` (cap 15 Wizard). It currently writes settings + toggles modules and redirects to `/`. To close Phase 3.1 the platform must take the new tenant from "configured" to "first value" without leaving them on a blank dashboard.

Two missing pieces:

1. **Sample data seeding** — per-module fixtures so the dashboard, helpdesk, audit log all show realistic content the first time a tenant visits.
2. **First-AI-conversation guided tour** — a one-time prompt that opens the AI drawer, suggests a sample command (e.g. `take ticket 1001`), and walks the user through the propose → confirm → audit chain end-to-end.

---

## 2. Scope

In scope:
- New mock client `lib/api/sample-data.ts` with `seedSampleData({ modules })` + `getSampleDataStatus()`.
- New optional 5th wizard step "Sample data" defaulting to seed for the modules the user just enabled.
- One-time `OnboardingTour` overlay triggered by `?tour=first-ai` query param. Reads/writes `onboarding.first_ai_tour_completed` setting (cap 16) so it never re-shows.
- Audit emission: each seed call writes one `category=admin` entry per module (`onboarding.sample_data.seed`).

Out of scope:
- Real backend seeding — mock-only. Backend builds idempotent endpoints in Phase 5.
- Customizing fixture quantities (always the spec's defaults below).
- Multi-tenant fixture isolation — mock returns same counts regardless of org.

---

## 3. Sample data fixtures (mock-only)

Per module the seed call returns deterministic counts. Real backend will materialize rows; mock just records that seeding "happened" via a setting marker plus an audit entry.

| Module key | Sample resources | Count |
|---|---|---|
| `helpdesk` | tickets, technicians, KB articles | 8, 3, 4 |
| `users` | demo users, roles | 5, 2 |
| `audit-log` | replays existing fixture entries — count returned | (existing) |
| `monitoring` | demo health probes | 4 |
| `knowledge` | demo KB articles | 6 |

Other modules return `{ count: 0 }` and a flag `not_seedable: true`.

---

## 4. API surface

```ts
type SeedSampleDataInput = { modules: string[] };
type SeededModule = { module_key: string; count: number; not_seedable?: boolean };
type SeedSampleDataResponse = {
  success: boolean;
  data: { seeded: SeededModule[]; total_resources: number };
};

type SampleDataStatus = {
  module_key: string;
  seeded_at: string | null; // ISO timestamp from cap 16 marker setting
};
```

Endpoints (when MOCK_MODE flips):
- `POST /api/proxy/onboarding/sample-data` — body `{ modules: string[] }`
- `GET  /api/proxy/onboarding/sample-data/status` — returns array of `SampleDataStatus`

The mock client persists markers to `onboarding.sample_data.<module_key>` settings (cap 16) at scope=org with the seed timestamp ISO string. Idempotent: seeding a module twice updates the marker but does not duplicate fixtures.

---

## 5. First-AI-conversation tour

Triggered by `?tour=first-ai` in the URL (set by `/onboarding` on Finish). Component `OnboardingTour` is mounted in `(dashboard)/layout.tsx` and behaves as follows:

1. On mount, check `useSetting("onboarding.first_ai_tour_completed")`. If `true`, render nothing (defensive — wizard sets it after dismissal anyway).
2. If query param is present AND setting is false, render a centered `Dialog` with:
   - Title: "Try your first AI command"
   - Body: explanation of the propose-confirm-audit chain (3 short bullets) + suggested phrase `take ticket 1001`.
   - Primary button: "Open AI assistant" — calls `useAssistantSession.openDrawer()`, sets the marker setting via `setSetting()`, then strips `?tour=first-ai` from the URL via `router.replace`.
   - Secondary button: "Skip" — sets the marker, strips the query param.
3. The dialog never re-shows after dismissal.

### RBAC

No additional gate; any authenticated user who lands on `/?tour=first-ai` sees it. The seed step in the wizard is gated by the wizard's existing org_admin permissions.

---

## 6. Tests

- **Unit** (`lib/api/sample-data.test.ts`):
  - `seedSampleData` returns expected counts for known modules
  - unknown module → `not_seedable: true, count: 0`
  - seeding writes a setting marker (verify via `getSampleDataStatus()`)
  - audit entry written with `category=admin`, `action=onboarding.sample_data.seed`
  - idempotent: second call updates timestamp not count
- **Component** (`components/shell/onboarding-tour.test.tsx`):
  - renders dialog when `?tour=first-ai` query and marker absent
  - hidden when marker present
  - "Skip" sets marker; "Open AI assistant" sets marker + opens drawer
- **E2E** (`tests/e2e/smoke/onboarding-tour.spec.ts`):
  - visiting `/?tour=first-ai` shows the dialog
  - "Skip" closes it and removes the query param

---

## 7. Frontend wiring (this commit)

- `lib/api/sample-data.ts` — mock client (new)
- `lib/modules/onboarding/types.ts` — types (new)
- `lib/api/sample-data.test.ts` — unit tests (new)
- `app/(dashboard)/onboarding/page.tsx` — new `seed_sample_data` flag + 5th wizard step + redirect to `/?tour=first-ai`
- `components/shell/onboarding-tour.tsx` — new tour overlay
- `components/shell/onboarding-tour.test.tsx` — tests
- `app/(dashboard)/layout.tsx` — mount the tour
- `lib/api/settings.ts` — add `onboarding.first_ai_tour_completed` definition (bool)

---

## 8. MOCK_MODE flip checklist (for backend)

- [ ] Backend implements `POST /api/proxy/onboarding/sample-data` with idempotent seeding per module, body `{ modules: string[] }`, returns the response shape in §4.
- [ ] Backend implements `GET /api/proxy/onboarding/sample-data/status` returning the marker timestamps from `Setting`.
- [ ] Backend writes one `category=admin` audit entry per seed call.
- [ ] Marker settings (`onboarding.sample_data.<module_key>`) registered in cap 16 catalog with `is_sensitive: false`, `type: string`, scope=org.
- [ ] `MOCK_MODE` flipped to `false` in `lib/api/sample-data.ts`.

---

## 9. Open questions

- **Q-OBF-1** — should sample-data seeding be re-runnable via admin UI? Out of scope here; defer.
- **Q-OBF-2** — should the tour replay if the user explicitly resets onboarding? Defer; today, the marker is permanent post-dismissal.
- **Q-OBF-3** — multi-language tour copy: included in Hebrew + English; Arabic deferred.
