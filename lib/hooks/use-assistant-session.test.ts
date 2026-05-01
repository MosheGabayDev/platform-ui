import { describe, it, expect, beforeEach } from "vitest";
import { useAssistantSession } from "./use-assistant-session";

// Reset store between tests by re-initializing state via setState
const resetStore = () =>
  useAssistantSession.setState({
    state: { kind: "closed" },
    drawerOpen: false,
    transcript: [],
    inFlightDraft: "",
    pendingConfirmationTokenId: null,
  });

describe("useAssistantSession — initial state (AC #1)", () => {
  beforeEach(resetStore);

  it("starts in closed state with empty fields", () => {
    const s = useAssistantSession.getState();
    expect(s.state).toEqual({ kind: "closed" });
    expect(s.drawerOpen).toBe(false);
    expect(s.transcript).toEqual([]);
    expect(s.inFlightDraft).toBe("");
    expect(s.pendingConfirmationTokenId).toBeNull();
  });
});

describe("useAssistantSession — open transition (AC #2)", () => {
  beforeEach(resetStore);

  it("openDrawer from closed → chatting_idle, drawerOpen=true", () => {
    useAssistantSession.getState().openDrawer();
    const s = useAssistantSession.getState();
    expect(s.state).toEqual({ kind: "chatting_idle" });
    expect(s.drawerOpen).toBe(true);
  });

  it("openDrawer is idempotent when already open", () => {
    useAssistantSession.getState().openDrawer();
    const before = useAssistantSession.getState();
    useAssistantSession.getState().openDrawer();
    const after = useAssistantSession.getState();
    expect(after.state).toEqual(before.state);
    expect(after.drawerOpen).toBe(true);
  });
});

describe("useAssistantSession — close transition (AC #3)", () => {
  beforeEach(resetStore);

  it("closeDrawer from chatting_idle → closed, clears transcript + draft", () => {
    useAssistantSession.setState({
      state: { kind: "chatting_idle" },
      drawerOpen: true,
      transcript: [
        { id: "1", role: "user", content: "hi", timestamp: 1 },
      ],
      inFlightDraft: "draft text",
      pendingConfirmationTokenId: null,
    });
    useAssistantSession.getState().closeDrawer();
    const s = useAssistantSession.getState();
    expect(s.state).toEqual({ kind: "closed" });
    expect(s.drawerOpen).toBe(false);
    expect(s.transcript).toEqual([]);
    expect(s.inFlightDraft).toBe("");
  });

  it("closeDrawer preserves pendingConfirmationTokenId for AI-shell-C", () => {
    useAssistantSession.setState({
      state: { kind: "chatting_idle" },
      drawerOpen: true,
      transcript: [],
      inFlightDraft: "",
      pendingConfirmationTokenId: "tok-abc-123",
    });
    useAssistantSession.getState().closeDrawer();
    expect(useAssistantSession.getState().pendingConfirmationTokenId).toBe("tok-abc-123");
  });
});

describe("useAssistantSession — error trap + dismissal (AC #4, #5)", () => {
  beforeEach(resetStore);

  it("setError(network) from non-error → error state with subtype", () => {
    useAssistantSession.getState().openDrawer();
    useAssistantSession.getState().setError("network");
    const s = useAssistantSession.getState();
    expect(s.state).toEqual({ kind: "error", subtype: "network" });
  });

  it("setError preserves existing error (does not overwrite subtype on second call)", () => {
    useAssistantSession.getState().openDrawer();
    useAssistantSession.getState().setError("network");
    useAssistantSession.getState().setError("llm");
    const s = useAssistantSession.getState();
    // First error wins; second is ignored. This documents intentional behavior:
    // errors are surfaced once; subsequent issues require the user to dismiss first.
    expect(s.state).toEqual({ kind: "error", subtype: "network" });
  });

  it("dismissError from error[network] → chatting_idle", () => {
    useAssistantSession.getState().openDrawer();
    useAssistantSession.getState().setError("network");
    useAssistantSession.getState().dismissError();
    const s = useAssistantSession.getState();
    expect(s.state).toEqual({ kind: "chatting_idle" });
  });

  it("dismissError no-op when not in error state", () => {
    useAssistantSession.getState().openDrawer();
    const before = useAssistantSession.getState().state;
    useAssistantSession.getState().dismissError();
    const after = useAssistantSession.getState().state;
    expect(after).toEqual(before);
  });
});

describe("useAssistantSession — transcript management", () => {
  beforeEach(resetStore);

  it("appendMessage adds to transcript", () => {
    const m: import("./use-assistant-session").Message = {
      id: "1",
      role: "user",
      content: "hello",
      timestamp: 100,
    };
    useAssistantSession.getState().appendMessage(m);
    expect(useAssistantSession.getState().transcript).toEqual([m]);
  });

  it("appendMessage caps transcript at 50 (FIFO)", () => {
    for (let i = 0; i < 55; i++) {
      useAssistantSession.getState().appendMessage({
        id: `${i}`,
        role: "user",
        content: `msg ${i}`,
        timestamp: i,
      });
    }
    const t = useAssistantSession.getState().transcript;
    expect(t.length).toBe(50);
    expect(t[0].id).toBe("5"); // first 5 dropped
    expect(t[49].id).toBe("54");
  });

  it("clearTranscript empties the array", () => {
    useAssistantSession.getState().appendMessage({
      id: "1",
      role: "user",
      content: "hi",
      timestamp: 1,
    });
    useAssistantSession.getState().clearTranscript();
    expect(useAssistantSession.getState().transcript).toEqual([]);
  });
});

describe("useAssistantSession — draft + persistence (AC #6 partial)", () => {
  beforeEach(resetStore);

  it("setDraft updates inFlightDraft", () => {
    useAssistantSession.getState().setDraft("hello world");
    expect(useAssistantSession.getState().inFlightDraft).toBe("hello world");
  });

  // Cross-page persistence (AC #6 full) is verified at the integration level
  // in Story 1.5 — the store is a singleton so its state survives Next.js
  // route changes by design (no per-route reset).
});

describe("useAssistantSession — AI-shell-B/C transitions NOT yet wired (AC #7)", () => {
  it("store does not expose sendMessage / proposeAction / voice actions", () => {
    const actions = useAssistantSession.getState();
    // These actions land in subsequent rounds. Asserting their absence
    // protects against accidental over-eager implementation.
    expect((actions as unknown as Record<string, unknown>).sendMessage).toBeUndefined();
    expect((actions as unknown as Record<string, unknown>).receiveResponse).toBeUndefined();
    expect((actions as unknown as Record<string, unknown>).proposeAction).toBeUndefined();
    expect((actions as unknown as Record<string, unknown>).confirmAction).toBeUndefined();
    expect((actions as unknown as Record<string, unknown>).rejectAction).toBeUndefined();
    expect((actions as unknown as Record<string, unknown>).expireConfirmation).toBeUndefined();
    expect((actions as unknown as Record<string, unknown>).startVoiceListening).toBeUndefined();
  });
});
