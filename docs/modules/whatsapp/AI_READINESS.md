# whatsapp — AI Readiness

> Standard: `docs/system-upgrade/05-ai/assistant-runtime.md §14`
> Last updated: 2026-05-14 (batch 160)

---

## Declared level

**Level 3 — Action Proposal.**

Assistant can propose 3 specific session-lifecycle actions; user must
confirm each via the action preview card; backend executes after
confirmation and emits audit. Read-only chat archive (chats, messages,
search) is **deliberately not exposed** to AI until per-message
redaction is available via the AIProviderGateway (cap 5A.16+).

---

## Page contexts registered

Every WhatsApp page calls `useRegisterPageContext` so the chat assistant
can surface page-aware suggestions (Level 1 explanation support):

| `pageKey` | route | available actions advertised |
|---|---|---|
| `whatsapp.archive` | `/whatsapp` | `search_whatsapp_chats`, `filter_whatsapp_chats` |
| `whatsapp.chat.detail` | `/whatsapp/chats/[id]` | `view_whatsapp_message_media`, `load_older_whatsapp_messages`, `share_whatsapp_chat` |
| `whatsapp.search` | `/whatsapp/search` | `search_whatsapp_messages`, `open_whatsapp_chat` |
| `whatsapp.sessions` | `/whatsapp/sessions` | `link_whatsapp`, `relink_whatsapp`, `unlink_whatsapp` |
| `whatsapp.dsr` | `/whatsapp/admin/dsr` | `preview_whatsapp_subject_erasure`, `delete_whatsapp_subject` |

---

## AI skills (executable via assistant)

All three are `ai_callable: true, default_enabled: false` — org admin
must enable per organization via `/admin/ai-skills` (cap 5A.18).

| Skill ID | Risk | Capability level (mock LLM emits) | Grammar phrase (mock) | Executor |
|---|---|---|---|---|
| `whatsapp.session.link` | low | `WRITE_LOW` | "link whatsapp" | `lib/platform/ai-actions/executors.ts` |
| `whatsapp.session.relink` | low | `WRITE_LOW` | "relink whatsapp NNNN" | `executors.ts` |
| `whatsapp.session.unlink` | medium | `DESTRUCTIVE` | "unlink whatsapp session NNNN" | `executors.ts` |

End-to-end demo-slice test: `lib/platform/ai-actions/demo-slice.test.tsx`
batch 142 — covers `link` ↔ `relink` ↔ audit chain.

---

## Read paths intentionally excluded from AI

- `fetchWhatsappChats` / `fetchWhatsappChatMessages` / `searchWhatsappMessages`
- `fetchWhatsappSharedWithMe` / `fetchWhatsappChatShares`

**Why excluded:**
- Message bodies contain raw, unfiltered PII (phone numbers, names,
  arbitrary user-supplied text from any conversation partner).
- AI gateway lacks per-message redaction policies (planned cap; not
  yet in scope).
- Surfacing search results into an LLM prompt would mean OpenAI/
  Anthropic see private third-party messages — incompatible with the
  user-owned archive promise.

These can be re-evaluated when:
1. `AIProviderGateway` (5A.16) ships with per-call PII scrubbing
2. `whatsapp.delete_by_subject` is the only path that touches phone
   data in any AI prompt context
3. Org admin explicitly opts in via a new feature flag
   `whatsapp.ai.read_access` (not yet defined)

---

## Mutation paths intentionally excluded

- `shareWhatsappChat` / `revokeWhatsappShare` — share creates a
  privilege grant; admin or owner intent should be explicit, not
  inferable from chat.
- `previewWhatsappDsr` / `deleteWhatsappDsr` / `approveWhatsappDsr` —
  DSR jobs require deliberate UI confirmation and 2-person approval;
  cannot be safely chat-driven.
- `eraseMyWhatsappData` — irreversible; UI confirm dialog is the
  safety pattern, not an AI proposal flow.

---

## Voice readiness

**Not applicable.** WhatsApp module is not voice-enabled (no skills
declared for voice). When voice agent lands (cap roadmap TBD):

- Session link via voice → potentially OK for low-risk users (with
  read-back confirmation)
- Session unlink via voice → ALWAYS routed to UI approval (per
  `assistant-runtime.md §14 level 6` — high/critical via UI only)
- All DSR + share + erase → UI only

---

## Compliance posture

- AI assistant text rendered in chat **never** contains a raw phone
  number, message body, or media URL from the user's WhatsApp
  archive — only metadata (chat count, status, session state).
- Audit emissions for AI-proposed actions go to category `ai` (cap
  10), tagging `via_assistant=true` in metadata.
- AI execution path goes through `runActionExecutor` which writes the
  same audit entries as direct UI actions — no separate audit channel.

---

## Open issues

- **Level 4 (Chat Action Ready) gating** — requires BE to verify
  proposed action token + permission + policy_engine evaluation
  before executing. Today the mock executor bypasses this. After
  cap 5A.16, the gateway round-trips a confirmation token.
- **Skill cost class** — all 3 marked `free`; should be `cheap` once
  the BE includes a Baileys/Meta API call cost. Update when 5A.20
  AI Usage lands.
- **`default_enabled: false`** — currently org admin must turn each
  skill on. Should this be wired to `whatsapp.enabled` feature flag
  so when WhatsApp itself is enabled, the 3 skills auto-enable?
  Decision deferred to BE team.
