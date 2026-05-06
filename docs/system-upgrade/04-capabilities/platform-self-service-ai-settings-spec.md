# PlatformSelfServiceAISettings — Spec

> **Status:** drafted 2026-05-06 (Phase 3.2 of GENERIC_AI_PLATFORM_PROGRESS).
> Frontend-only consumer of caps 16 (Settings Engine) + 2.1 (AI Provider Gateway). No new backend contract required.

---

## 1. Why this matters

`/admin/settings` (Phase 1.2) is the **comprehensive** settings tree — every key in every category, raw type-aware editors. Powerful but overwhelming for the first-time tenant who just wants their AI to behave the right way.

`/settings/ai` is **opinionated and focused**: the four most important AI knobs in one card-based form, with previews and friendly guidance. Targets:

- The owner who just finished `/onboarding` and wants to refine.
- The team admin who wants to update the persona without learning the settings tree.
- The post-purchase user evaluating the platform.

---

## 2. Scope

In scope:
- **Persona** — `ai.persona_name`, `ai.system_prompt`
- **Model** — `ai.default_model` (from cap 2.1 catalog), `ai.max_tokens_per_message`
- **Tone preview** — show how the AI will introduce itself given the current persona/model

Out of scope (these stay in `/admin/settings` or `/admin/ai-providers`):
- API keys / credentials (sensitive — stay in the admin gate)
- Routing rules (advanced)
- Per-skill enablement (covered by `/admin/ai-skills`)
- Tools allowlist (technical — stays in admin)

---

## 3. UX sketch

```
┌────────────────────────────────────────────────────────┐
│  AI configuration                                       │
│  Configure how your AI assistant behaves for your org.  │
├────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐  │
│  │ Persona                                          │  │
│  │ ┌────────────────────────────────────────────┐   │  │
│  │ │ Name:     [Acme Helper                  ]  │   │  │
│  │ │ Prompt:   [You are a friendly assistant…]  │   │  │
│  │ │           (textarea, max 4000)              │   │  │
│  │ └────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Model                                            │  │
│  │ ┌────────────────────────────────────────────┐   │  │
│  │ │ Default model: [Claude Sonnet 4.6      ▼]  │   │  │
│  │ │  → cost: $3/M in / $15/M out               │   │  │
│  │ │ Max tokens per response: [2048    ]         │   │  │
│  │ └────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Preview                                          │  │
│  │ "Hello, I'm Acme Helper. I'll use Claude Sonnet  │  │
│  │  4.6 to help with your operations questions."    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│             [Reset to defaults]  [Save changes]          │
└────────────────────────────────────────────────────────┘
```

---

## 4. Data binding

Each form field reads from `useSetting(<key>)` and writes via `setSetting()` at scope `org`. The page batches all four mutations on Save with `Promise.all`. On error: rollback by re-fetching.

| Field | Setting key | Validation |
|---|---|---|
| Persona name | `ai.persona_name` | min 2, max 60 chars |
| System prompt | `ai.system_prompt` | min 10, max 4000 chars |
| Default model | `ai.default_model` | enum from cap 2.1 catalog |
| Max tokens | `ai.max_tokens_per_message` | int 256–16000 |

The model dropdown is sourced from `useProviderCatalog()` — flat list across all providers (each option labelled `"<provider> · <model>"`). Disabled providers show their models too but with a "(provider not enabled)" hint.

---

## 5. RBAC

- Role required: `org_admin` or `system_admin`. Backend re-checks via Settings Engine cap 16.
- Page is gated by `<PermissionGate role={["org_admin", "system_admin"]}>`.

---

## 6. Tests

- Unit (`/lib/.../`): N/A — no new client; consumers of existing.
- Component render: page-level E2E covers it.
- E2E (`tests/e2e/smoke/admin-pages.spec.ts`): page renders, model dropdown populated, Save flow flips the underlying setting (assertable via `useSetting("ai.persona_name")` after Save).

---

## 7. Frontend wiring (this commit)

- `app/(dashboard)/settings/ai/page.tsx` — the new page
- Nav: `/settings/ai` added under "הגדרות" group (replacing the dead `/settings/ai-providers` link that points to admin)
- E2E spec extension
