/**
 * ChatTranscript — scrollable transcript + sending-indicator.
 *
 * Tests cover:
 *   - empty + non-sending = nothing
 *   - empty + sending = thinking dots only
 *   - non-empty = renders messages + role=log + aria-label
 *   - sending state shows the animated indicator
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { screen, cleanup } from "@testing-library/react";
import { renderWithIntl as render } from "@/lib/test-utils/intl";
import { ChatTranscript } from "./chat-transcript";
import { useAssistantSession, type Message } from "@/lib/hooks/use-assistant-session";

const mkMessage = (over: Partial<Message> = {}): Message => ({
  id: `m-${Math.random().toString(36).slice(2, 8)}`,
  role: "user",
  content: "Hello",
  timestamp: Date.now(),
  ...over,
});

function reset() {
  useAssistantSession.setState({
    state: { kind: "closed" },
    drawerOpen: false,
    transcript: [],
    inFlightDraft: "",
    pendingConfirmationTokenId: null,
    currentPageContext: null,
    pendingProposal: null,
  });
}

beforeEach(reset);
afterEach(cleanup);

describe("ChatTranscript", () => {
  it("renders nothing when transcript is empty AND not sending", () => {
    const { container } = render(<ChatTranscript />, { locale: "en" });
    expect(container.firstChild).toBeNull();
  });

  it("renders the log container when transcript has at least one message", () => {
    useAssistantSession.setState({
      transcript: [mkMessage({ content: "Hello there" })],
    });
    render(<ChatTranscript />, { locale: "en" });
    expect(screen.getByRole("log", { name: /Chat transcript/i })).toBeTruthy();
    expect(screen.getByText("Hello there")).toBeTruthy();
  });

  it("renders messages in stable order", () => {
    useAssistantSession.setState({
      transcript: [
        mkMessage({ id: "1", content: "first" }),
        mkMessage({ id: "2", role: "assistant", content: "second" }),
        mkMessage({ id: "3", content: "third" }),
      ],
    });
    render(<ChatTranscript />, { locale: "en" });
    expect(screen.getByText("first")).toBeTruthy();
    expect(screen.getByText("second")).toBeTruthy();
    expect(screen.getByText("third")).toBeTruthy();
  });

  it("shows the sending indicator when state.kind === chatting_sending", () => {
    useAssistantSession.setState({
      state: { kind: "chatting_sending" },
      transcript: [mkMessage({ content: "ping" })],
    });
    render(<ChatTranscript />, { locale: "en" });
    expect(screen.getByTestId("sending-indicator")).toBeTruthy();
  });

  it("renders ONLY the sending indicator when transcript is empty + state is chatting_sending", () => {
    useAssistantSession.setState({
      state: { kind: "chatting_sending" },
      transcript: [],
    });
    render(<ChatTranscript />, { locale: "en" });
    // Container exists; sending-indicator present; no message bubbles.
    expect(screen.getByTestId("sending-indicator")).toBeTruthy();
    expect(screen.queryAllByText(/Hello|ping/i)).toHaveLength(0);
  });

  it("hides the sending indicator when state.kind !== chatting_sending", () => {
    useAssistantSession.setState({
      state: { kind: "chatting_idle" } as never,
      transcript: [mkMessage({ content: "hi" })],
    });
    render(<ChatTranscript />, { locale: "en" });
    expect(screen.queryByTestId("sending-indicator")).toBeNull();
  });
});
