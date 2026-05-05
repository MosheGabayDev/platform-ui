# PlatformWizard — Frontend Primitive Spec (cap 15)

> **Status:** spec drafted 2026-05-05 (Phase 1.5 of GENERIC_AI_PLATFORM_PROGRESS).
>
> **Why this matters:** every "first-touch" surface in a multi-tenant SaaS is a wizard — onboarding, integration setup, AI provider configuration, data migration. Without a shared primitive each module reinvents step navigation, validation gates, and resume-after-refresh. Building it once means every cap that needs guided setup gets it for free.
>
> **Scope:** this is primarily a **frontend primitive**. The backend involvement is limited to:
> - PlatformAuditLog entry on completion (`category=admin`, `action=wizard.complete`)
> - Optional: server-side `WizardCompletion` table to persist completion state across devices (deferred to v2 — local resume is enough for v1)

---

## 1. Concept

A **wizard** is a sequence of typed steps over a shared mutable state. Each step renders a UI, may declare a validator, and may opt out of forward navigation until validation passes. Backward navigation is always allowed. The user can leave and resume — state is persisted in localStorage under a stable key.

```
┌──────────────────────────────────────┐
│ Wizard<TState>                       │
│ ┌──────────────────────────────────┐ │
│ │ StepIndicator (compact / full)   │ │
│ ├──────────────────────────────────┤ │
│ │ Active step body (consumer)      │ │
│ │  - reads useWizardState<TState>  │ │
│ │  - calls update() on changes     │ │
│ │  - optionally exposes validator  │ │
│ ├──────────────────────────────────┤ │
│ │ Footer: Back / Next / Skip / End │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

---

## 2. Types

```ts
interface WizardStep<TState> {
  id: string;                            // stable, used in URL & persist
  label: string;
  label_he?: string;
  description?: string;
  /** Render the step body. Receives state + update fn. */
  render: (props: WizardStepProps<TState>) => React.ReactNode;
  /**
   * Returns null when the step is valid (allows Next), else an error message.
   * If omitted, the step is always valid.
   */
  validate?: (state: TState) => string | null;
  /** When true, Next is replaced by Skip — step doesn't have to be completed. */
  optional?: boolean;
  /** Hide the step entirely based on accumulated state. */
  hideWhen?: (state: TState) => boolean;
}

interface WizardStepProps<TState> {
  state: TState;
  update: (patch: Partial<TState>) => void;
  goNext: () => void;
  goBack: () => void;
}

interface WizardConfig<TState> {
  /** Stable key for localStorage persistence. Pattern: `wizard:<area>:<v>`. */
  storageKey: string;
  steps: WizardStep<TState>[];
  initialState: TState;
  /** Called when user clicks Finish on the last step. Returns a promise — wizard shows loading until it resolves. */
  onComplete: (state: TState) => Promise<void> | void;
  /** Called when user explicitly cancels. Defaults to clearing storage + redirect. */
  onCancel?: () => void;
}
```

---

## 3. Component API

```tsx
<Wizard<OnboardingState> config={onboardingConfig} />
```

The component handles:
- Step navigation (Back / Next / Skip / Finish)
- Validation gating (Next disabled until validator returns null)
- localStorage persist of the full state + current step index
- Step indicator render (compact pills on mobile, numbered list on desktop)
- Loading state during `onComplete` async resolve
- Confirm-on-cancel if user has made progress

---

## 4. Hook API

```tsx
const { state, update, currentIndex, goNext, goBack, reset } = useWizardState<TState>({
  storageKey: "wizard:onboarding:v1",
  initialState: { ... },
  totalSteps: 4,
});
```

The hook is exported separately so step bodies (which are NOT direct children of `<Wizard>` due to React composition) can read state without prop drilling.

---

## 5. Persistence

- Full `state` + `currentIndex` written to `localStorage[storageKey]` on every change (debounced 300ms).
- On mount, hydrate from storage if present and `currentIndex < totalSteps`.
- On completion or cancel, `localStorage.removeItem(storageKey)`.
- Storage key MUST include a version suffix (`:v1`) so schema evolution doesn't break old user state.

---

## 6. Accessibility

- StepIndicator MUST mark current step with `aria-current="step"`.
- Back / Next buttons MUST have plain English labels (i18n via `label_he` etc).
- Validation errors are exposed via `aria-describedby` on the step body container.
- Focus moves to the step heading on transition (so screen readers announce change).

---

## 7. Audit & analytics

- On completion: emit PlatformAuditLog `category=admin`, `action=wizard.complete`, `metadata={ wizard_id, completed_at, duration_ms }`.
- (Optional) per-step transitions tracked client-side to PostHog as `wizard.step_advance` events. Out of scope for this commit.

---

## 8. First consumer — `/onboarding` wizard

To prove the primitive works, this commit ships an onboarding wizard for new tenants:

| Step | Purpose | Validator |
|---|---|---|
| 1. Organization | Set `branding.org_name` + accent color | name min 2 chars |
| 2. AI configuration | Pick default model + persona name | persona min 2 chars |
| 3. Modules | Toggle which modules to enable for this org | none (skip allowed) |
| 4. Done | Summary + "Open dashboard" CTA | n/a |

On Finish:
1. Calls `setSetting()` to write `branding.org_name`, `branding.accent_color`, `ai.default_model`, `ai.persona_name` at scope=org.
2. Calls `setModuleEnablement()` for each toggled module.
3. Redirects to `/`.

This single flow exercises caps 16, 17, 18 — a smoke test for the whole foundation.

---

## 9. Open questions (Q-WZ-*)

- **Q-WZ-1** — Should wizards support branching (step B only after step A.choice = X)? Recommendation: defer. `hideWhen` covers most cases. Branching trees can be modeled as multiple wizards composed externally.
- **Q-WZ-2** — Server-side completion persistence? Recommendation: defer to v2. Local resume + `metadata` on the audit entry is sufficient for the demo. v2 adds `WizardCompletion` table and a "/onboarding/resume" endpoint that hydrates from server.
- **Q-WZ-3** — Skip vs Optional — same UX or different? Recommendation: **Skip** = "advance without completing this step", **Optional** = "Next-button label changes to Skip" — same primitive, different label. Codify in the step config.
- **Q-WZ-4** — Multi-tab safety: two tabs open same wizard, race on state. Recommendation: last-write-wins via `storage` event listener; show a small "another tab updated this wizard" toast on conflict. Defer to v2.

---

## 10. MOCK_MODE flip checklist

This is a frontend primitive — no MOCK flip needed for the wizard itself. Consumers (like `/onboarding`) call other clients (`setSetting`, `setModuleEnablement`) which have their own MOCK_MODE flags.

Backend involvement when those clients flip:
- [ ] PlatformAuditLog records wizard.complete events
- [ ] (v2) WizardCompletion table for server-side resume

---

## 11. Frontend wiring (this commit)

- `lib/modules/wizard/types.ts` — types.
- `lib/hooks/use-wizard-state.ts` — state + persist hook.
- `components/shared/wizard/wizard.tsx` — primitive + step indicator + nav.
- `app/(dashboard)/onboarding/page.tsx` — first consumer (org config, AI config, module enablement, summary).
- Tests: hook (persist, hydrate, reset), wizard navigation (back/next, validation gating, validator block), onboarding completion flow.
