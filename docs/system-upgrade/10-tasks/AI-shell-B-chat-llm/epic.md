# AI-shell-B — Chat + LLM Context (read-only "Ask the Dashboard")

**Phase:** P2 demo slice (per ADR-038)
**Track:** platform-ui + platformengineer
**Status:** 🔴 blocked on AI-shell-A + R048 (P0 cleanup of `apps/dashboard/`)
**Depends on:** AI-shell-A, R048 partial (dashboard module migrated to gateway)
**Estimate:** ~6 hours

## Scope
First user-visible AI surface. Drawer renders a chat transcript; user can send a message; message is sent to a backend route that calls `AIProviderGateway`; response renders. NO action proposals — text replies only.

- `ChatTranscript` component — scrollable list of `Message` bubbles (user / assistant)
- `Message` component — single bubble with sender role, content, timestamp
- `MessageInput` component — textarea + send button + voice toggle (voice toggle disabled this round)
- Backend: `POST /api/proxy/ai/chat` route (Flask side: new endpoint that wraps `AIProviderGateway.call(service="chat", ...)`)
- Backend: `GET /api/proxy/ai/context` endpoint that returns the user's `AIUserCapabilityContext` (per `05-ai/capability-kb.md`)
- First message includes full `PageContext + UserContext`; subsequent messages send `PageContextDiff`
- Session store transitions wired: `chatting_idle → chatting_sending → chatting_idle | error`
- Read-only enforcement: backend refuses any tool/action invocation in this round (returns text replies only)

## Out of scope (deferred to AI-shell-C)
- Action proposals (`AIActionDescriptor`)
- Confirmation tokens
- Voice mode (toggle visible but disabled)
- Streaming responses (SSE) — wait for `Polling before SSE` exit criterion (review H-07)

## Why now
ADR-038 P2 demo slice. Validates the gateway end-to-end with real users before AI-shell-C ships write-tier capabilities. De-risks billing / latency / context-payload-shape concerns.

## Tasks (to be split when round is next-up)
- [ ] T01 — Backend: `POST /api/ai/chat` route + `AIProviderGateway.call(service="chat", ...)` integration + `AIUsageLog` write
- [ ] T02 — Backend: `GET /api/ai/context` route returning `AIUserCapabilityContext` (filtered to read-only actions)
- [ ] T03 — Frontend: `lib/api/ai.ts` client — `sendChatMessage()`, `fetchAIContext()`, query keys
- [ ] T04 — `ChatTranscript` + `Message` components
- [ ] T05 — `MessageInput` component (textarea, char limit, enter-to-send, shift-enter for newline, voice toggle disabled)
- [ ] T06 — Session store: chat states + transitions + transcript array (capped at 50 messages, FIFO)
- [ ] T07 — `PageContextDiff` algorithm + integration with first-message vs subsequent-message flow
- [ ] T08 — HTTP 409 stale-context handling: re-emit full context, retry once
- [ ] T09 — Tests: backend unit (gateway invoked, usage logged), frontend unit (store transitions), E2E (send message → receive response)

## Acceptance Criteria
- [ ] User sends "What's on this page?" from `/dashboard` → receives a sensible text reply within 5s
- [ ] First message body contains full `PageContext + UserContext`; second message body contains `PageContextDiff` only
- [ ] Backend returns 409 if frontend's `context_version` is stale → frontend re-emits + retries → succeeds
- [ ] Every chat message produces an `AIUsageLog` row with `service_id="chat"` + `org_id` + `actor_id`
- [ ] User without `ai.chat.use` permission cannot send (frontend gates + backend re-checks)
- [ ] Cross-tenant: org A user cannot see org B's chat history (each session is per-user, not per-org-shared)
- [ ] No tool / action invocation possible in this round — backend rejects with 403 if LLM proposes one
- [ ] Coverage gate does not regress

## Definition of Done
- [ ] AC met
- [ ] AIUsageLog accuracy verified for the chat flow (sample 20 calls, count rows, match within ±0)
- [ ] `09-history/rounds-index.md` + `change-log.md` entries
- [ ] G-Billing gate moves toward 🟢 (chat-only) with note "AI chat metered; other modules still pending R048 full"

## Final commit
SHA: `<filled on close>`
Date: `<YYYY-MM-DD>`
