# PlatformHelpSurface — Spec

> **Status:** drafted 2026-05-06 (Phase 3.3 of GENERIC_AI_PLATFORM_PROGRESS).
> Frontend-only. No backend contract; content is shipped as a typed catalog so
> writers can update copy without a deploy of the backend.

---

## 1. Why this matters

A new tenant who finished `/onboarding` (Phase 3.1) reaches `/` with sample
data and the first-AI tour. The next question is: "what else can this thing
do, and how do I learn it without leaving the app?". `/help` is that surface.

It is **not** a full docs site. It surfaces three artifacts only:

1. **Per-module quick-start** — 1 paragraph + 3-5 numbered steps per module.
2. **AI shortcuts cheatsheet** — every recognized AI phrase + what it does +
   capability level.
3. **Keyboard shortcuts cheatsheet** — mirrored from `ShortcutsDialog`.

Everything else (deep API docs, integration walkthroughs) lives in
`docs/` in the repo and is out of scope here.

---

## 2. Scope

In scope:
- `lib/docs/types.ts` — typed catalog shape.
- `lib/docs/content.ts` — the catalog itself (quick-starts + AI cheatsheet
  + keyboard shortcuts), Hebrew + English bodies.
- `app/(dashboard)/help/page.tsx` — search input + tab filter (All / Quick
  starts / AI / Shortcuts) + per-section rendering.
- Nav entry under "הגדרות" group.

Out of scope:
- Markdown rendering (content is a structured tree of titles + bullets).
- Backend mutability (catalog is static at build time).
- Localized Arabic copy (deferred — Hebrew + English only for now).
- AI-search over docs (defer — plain substring filter).

---

## 3. Catalog shape

```ts
type DocCategory = "quick-start" | "ai-cheatsheet" | "shortcuts" | "platform";

type DocStep = { text: string; text_he?: string };

type DocArticle = {
  id: string;            // stable, kebab-case, e.g. "quick-start-helpdesk"
  category: DocCategory;
  title: string;
  title_he?: string;
  summary: string;
  summary_he?: string;
  body?: string;          // single paragraph, plain text
  body_he?: string;
  steps?: DocStep[];      // optional numbered steps
  tags?: string[];        // free-form, used for search
  module_key?: string;    // present for category=quick-start
};

type AIShortcut = {
  phrase: string;          // e.g. "take ticket NNNN"
  action_id: string;       // matches a skill in cap 2.2
  description: string;
  description_he?: string;
  capability_level: "READ" | "WRITE_LOW" | "WRITE_HIGH" | "DESTRUCTIVE";
};

type KeyboardShortcut = {
  keys: string[];
  label: string;
  label_he?: string;
};
```

Catalog is a single exported object with three arrays: `articles`, `aiShortcuts`,
`keyboardShortcuts`.

Invariants enforced by tests:
- All article ids are unique.
- Every module key registered in `lib/platform/module-registry/manifests.ts`
  has at least one `category=quick-start` article.
- Every `AIShortcut.action_id` matches a skill id from
  `lib/platform/ai-skills/registry.ts`.

---

## 4. Page UX

```
┌────────────────────────────────────────────────────────┐
│  Help & documentation                                   │
│  Search the docs, browse module quick-starts, find AI   │
│  shortcuts and keyboard shortcuts.                       │
├────────────────────────────────────────────────────────┤
│  [Search box (filters all sections)]                     │
│                                                          │
│  [All] [Quick starts] [AI shortcuts] [Keyboard]          │
│                                                          │
│  ┌─── Quick starts ──────────────────────────────┐      │
│  │ Helpdesk                                       │      │
│  │ Manage tickets, technicians, SLA…              │      │
│  │ 1. Open /helpdesk/tickets                      │      │
│  │ 2. Use Ctrl+K to jump…                         │      │
│  │ 3. Try the AI: "take ticket 1001"              │      │
│  └────────────────────────────────────────────────┘      │
│  …                                                        │
│                                                          │
│  ┌─── AI shortcuts ──────────────────────────────┐      │
│  │ "take ticket NNNN" → helpdesk.ticket.take      │      │
│  │   Capability: WRITE_HIGH                       │      │
│  │ …                                              │      │
│  └────────────────────────────────────────────────┘      │
│                                                          │
│  ┌─── Keyboard shortcuts ─────────────────────────┐      │
│  │ g d  → Dashboard                                │      │
│  │ ⌘ K  → Command palette                          │      │
│  └────────────────────────────────────────────────┘      │
└────────────────────────────────────────────────────────┘
```

Search filters every section by case-insensitive substring across title,
summary, body, tags, AI phrase, action_id, shortcut label.

---

## 5. Tests

- **Unit** (`lib/docs/content.test.ts`):
  - all article ids unique
  - every module manifest has ≥1 quick-start
  - every `aiShortcut.action_id` is a valid skill id
  - article counts non-zero per category
- **E2E** (`tests/e2e/smoke/help-page.spec.ts`):
  - `/help` renders header + tabs
  - search filters down to a known phrase
  - clicking a tab toggles the visible section

---

## 6. Frontend wiring (this commit)

- `lib/docs/types.ts` (new)
- `lib/docs/content.ts` (new)
- `lib/docs/content.test.ts` (new)
- `app/(dashboard)/help/page.tsx` (new)
- `components/shell/nav-items.ts` — add `/help` under "הגדרות"
- `tests/e2e/smoke/help-page.spec.ts` (new)

---

## 7. Open questions

- **Q-HELP-1** — should articles be authorable per tenant via Settings? Defer
  to a later release; static catalog is enough for the generic platform.
- **Q-HELP-2** — should the AI assistant index this catalog as a tool? Defer;
  out of scope for 3.3.
