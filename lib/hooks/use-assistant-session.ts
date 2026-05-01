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

/**
 * AIActionDescriptor v1 minimal shape (per 05-ai/canonical-terms.md).
 * Backend wires the full schema in AI-shell-C live mode (R051).
 */
export type CapabilityLevel = "READ" | "WRITE_LOW" | "WRITE_HIGH" | "DESTRUCTIVE";

export interface ActionProposal {
  /** Server-issued confirmation token; mock uses a UUID-ish string. */
  tokenId: string;
  /** Stable action identifier — e.g. "users.deactivate". */
  actionId: string;
  /** Human-readable action label for the preview card. */
  label: string;
  /** What entity the action targets (free-form summary). */
  targetSummary: string;
  capabilityLevel: CapabilityLevel;
  /** Absolute token expiry time (ms epoch). */
  expiresAt: number;
  /** Parameters echoed back to the user for confirmation. */
  params: Record<string, unknown>;
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

  // Chat actions (AI-shell-B Story 2.1) — wired to mock client until R048 partial completes
  sendMessage: (text: string) => void;
  receiveResponse: (text: string) => void;
  failChat: (subtype: ErrorSubtype) => void;

  // Active action proposal (AI-shell-C scaffold) — null when no proposal pending
  pendingProposal: ActionProposal | null;

  // Action proposal flow (AI-shell-C scaffold) — mock until R051 AIActionRegistry lands
  proposeAction: (proposal: ActionProposal) => void;
  confirmAction: (tokenId: string) => void;
  rejectAction: (tokenId: string, reason?: string) => void;
  expireConfirmation: () => void;

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
  pendingProposal: null,

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

  /**
   * Transition to `error[subtype]` from any non-error state.
   *
   * **First-error-wins:** if already in `error`, this is a no-op. The caller
   * must `dismissError()` before a new error can surface. Documented in tests
   * (use-assistant-session.test.ts "preserves existing error").
   */
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

  sendMessage: (text) =>
    set((s) => {
      // Only valid from a chat-idle state (open, ready to send)
      if (s.state.kind !== "chatting_idle") return s;
      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: "user",
        content: text,
        timestamp: Date.now(),
      };
      return {
        ...s,
        state: { kind: "chatting_sending" },
        transcript: [...s.transcript, userMsg].slice(-50),
        inFlightDraft: "",
      };
    }),

  receiveResponse: (text) =>
    set((s) => {
      if (s.state.kind !== "chatting_sending") return s;
      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: text,
        timestamp: Date.now(),
      };
      return {
        ...s,
        state: { kind: "chatting_idle" },
        transcript: [...s.transcript, assistantMsg].slice(-50),
      };
    }),

  failChat: (subtype) =>
    set((s) => {
      if (s.state.kind !== "chatting_sending") return s;
      return { ...s, state: { kind: "error", subtype } };
    }),

  proposeAction: (proposal) =>
    set((s) => {
      // Accepts proposals from chatting_sending (LLM responded with an action)
      // or chatting_idle (test/programmatic injection).
      if (s.state.kind !== "chatting_sending" && s.state.kind !== "chatting_idle") return s;
      return {
        ...s,
        state: {
          kind: "awaiting_action_confirmation",
          tokenId: proposal.tokenId,
          expiresAt: proposal.expiresAt,
        },
        pendingProposal: proposal,
        pendingConfirmationTokenId: proposal.tokenId,
      };
    }),

  confirmAction: (tokenId) =>
    set((s) => {
      if (s.state.kind !== "awaiting_action_confirmation") return s;
      if (s.state.tokenId !== tokenId) return s;
      return { ...s, state: { kind: "executing_action" } };
    }),

  rejectAction: (tokenId) =>
    set((s) => {
      if (s.state.kind !== "awaiting_action_confirmation") return s;
      if (s.state.tokenId !== tokenId) return s;
      return {
        ...s,
        state: { kind: "chatting_idle" },
        pendingProposal: null,
        pendingConfirmationTokenId: null,
      };
    }),

  expireConfirmation: () =>
    set((s) => {
      if (s.state.kind !== "awaiting_action_confirmation") return s;
      return {
        ...s,
        state: { kind: "error", subtype: "confirmation_expired" },
        pendingProposal: null,
        pendingConfirmationTokenId: null,
      };
    }),
}));
