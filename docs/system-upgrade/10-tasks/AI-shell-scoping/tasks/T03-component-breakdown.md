# T03 — Component breakdown + line budgets

**Estimate:** 30 min
**Status:** ⬜ todo
**Depends on:** T02
**Touches:** `05-ai/floating-assistant.md §Components` section

## Goal
List every component, its file path, line budget (≤200 lines TS), and one-line responsibility. Enables the build round to be split into atomic component-per-task work.

## Acceptance Criteria
Components covered (minimum):
- [ ] `FloatingAIButton` — idle FAB at bottom-end
- [ ] `AIDrawer` — slide-in panel container
- [ ] `ChatTranscript` — scrollable message list
- [ ] `Message` — single chat bubble (user / assistant / action proposal)
- [ ] `MessageInput` — textarea + send + voice toggle
- [ ] `ActionPreviewCard` — confirmation UI for proposed action
- [ ] `VoiceModeToggle` — switch + active visual state
- [ ] `VoiceWaveform` — visual indicator when listening/speaking
- [ ] `ContextDebugPanel` — dev-only, shows current page context payload
- [ ] `useAssistantSession` (Zustand store, not component) — state + actions
- [ ] `useRegisterPageContext()` (hook) — page-side registration

For each:
- [ ] File path under `components/shell/ai-assistant/` or `components/shared/ai-assistant/`
- [ ] Line budget (≤200 TS, smaller for leaves)
- [ ] One-line responsibility
- [ ] Props contract sketch (incoming/outgoing)

## Implementation Notes
- Keep components dumb where possible; state lives in the Zustand store
- `useRegisterPageContext` runs on the consuming page, not in the assistant — it's the contract surface

## Definition of Done
- [ ] All components listed in spec
- [ ] No component without responsibility
- [ ] Total line budget ≤ 1500 across the assistant feature (sanity check)
- [ ] `epic.md` Tasks: `[x] T03`
