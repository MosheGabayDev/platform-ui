/**
 * AI Assistant session store — finite state machine for the floating assistant.
 *
 * Story 1.1 (AI-shell-A) — idle-path transitions only. LLM-related transitions
 * (sending, awaiting confirmation, executing, voice) are declared in the type
 * union but NOT yet wired. They land in:
 *
 *   AI-shell-B: sendMessage(text), receiveResponse(message)
 *   AI-shell-C: proposeAction(descriptor), confirmAction(tokenId),
 *               rejectAction(tokenId, reason), expireConfirmation()
 *   AI-shell-D: voice mode actions
 *
 * No persist middleware — drawer survives in-session navigation but resets
 * on full reload (per Story 1.5 AC).
 *
 * Spec: docs/system-upgrade/10-tasks/AI-shell-A-fab-drawer/epic.md
 *       implementation-artifacts/stories/AI-shell-A-1.1.md
 *       docs/system-upgrade/10-tasks/AI-shell-scoping/scoping-output.md (state machine)
 */
import { create } from "zustand";

export type ErrorSubtype =
  | "network"
  | "llm"
  | "confirmation_expired"
  | "backend_recheck_failed";

export type AssistantState =
  | { kind: "closed" }
  | { kind: "chatting_idle" }
  | { kind: "chatting_sending" }
  | { kind: "awaiting_action_confirmation"; expiresAt: number; tokenId: string }
  | { kind: "executing_action" }
  | { kind: "voice_idle" }
  | { kind: "voice_listening" }
  | { kind: "voice_speaking" }
  | { kind: "error"; subtype: ErrorSubtype };

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

/**
 * Page-AI context payload registered by `useRegisterPageContext()`.
 *
 * Note on `dataSamples`: callers are responsible for redacting PII before
 * passing values here. The store does not transform or filter the payload.
 */
export interface PageContext {
  pageKey: string;
  route: string;
  entityType?: string;
  entityId?: string;
  summary: string;
  availableActions: string[];
  dataSamples?: Record<string, unknown>;
  voiceEligible?: boolean;
}

export interface AssistantSessionStore {
  // State
  state: AssistantState;
  drawerOpen: boolean;
  transcript: Message[];
  inFlightDraft: string;
  pendingConfirmationTokenId: string | null;
  currentPageContext: PageContext | null;

  // Idle-path actions (Story 1.1)
  openDrawer: () => void;
  closeDrawer: () => void;
  setError: (subtype: ErrorSubtype) => void;
  dismissError: () => void;
  appendMessage: (message: Message) => void;
  clearTranscript: () => void;
  setDraft: (draft: string) => void;

  // Page context actions (Story 1.2)
  setPageContext: (context: PageContext) => void;
  clearPageContext: () => void;

  // TODO(AI-shell-B): sendMessage, receiveResponse
  // TODO(AI-shell-C): proposeAction, confirmAction, rejectAction, expireConfirmation
  // TODO(AI-shell-D): startVoiceListening, voiceTranscriptReceived, etc.
}

const isOpenState = (state: AssistantState): boolean =>
  state.kind !== "closed";

export const useAssistantSession = create<AssistantSessionStore>()((set) => ({
  state: { kind: "closed" },
  drawerOpen: false,
  transcript: [],
  inFlightDraft: "",
  pendingConfirmationTokenId: null,
  currentPageContext: null,

  openDrawer: () =>
    set((s) => {
      if (isOpenState(s.state)) return s; // idempotent
      return {
        ...s,
        state: { kind: "chatting_idle" },
        drawerOpen: true,
      };
    }),

  closeDrawer: () =>
    set((s) => ({
      ...s,
      state: { kind: "closed" },
      drawerOpen: false,
      transcript: [],
      inFlightDraft: "",
      // pendingConfirmationTokenId preserved across close — used by AI-shell-C
    })),

  setError: (subtype) =>
    set((s) => {
      if (s.state.kind === "error") return s; // already in error
      return { ...s, state: { kind: "error", subtype } };
    }),

  dismissError: () =>
    set((s) => {
      if (s.state.kind !== "error") return s;
      return { ...s, state: { kind: "chatting_idle" } };
    }),

  appendMessage: (message) =>
    set((s) => ({
      ...s,
      transcript: [...s.transcript, message].slice(-50), // FIFO cap at 50
    })),

  clearTranscript: () => set((s) => ({ ...s, transcript: [] })),

  setDraft: (draft) => set((s) => ({ ...s, inFlightDraft: draft })),

  setPageContext: (context) => set((s) => ({ ...s, currentPageContext: context })),

  clearPageContext: () => set((s) => ({ ...s, currentPageContext: null })),
}));
