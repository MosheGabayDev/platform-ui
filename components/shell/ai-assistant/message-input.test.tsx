/**
 * MessageInput — textarea + send button. Covers:
 *   - draft binding to the assistant session store
 *   - send button enable/disable based on draft + state
 *   - Enter to submit, Shift+Enter to newline
 *   - 2000-char limit
 *   - retry contract on StaleContextError (HTTP 409)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { renderWithIntl } from "@/lib/test-utils/intl";
import type { ReactElement } from "react";

function render(ui: ReactElement) {
  return renderWithIntl(ui, { locale: "en" });
}

const aiMocks = vi.hoisted(() => {
  class StaleErr extends Error {}
  return { sendChatMessage: vi.fn(), StaleContextError: StaleErr };
});
const sendChatMessageMock = aiMocks.sendChatMessage;
const StaleContextErrorMock = aiMocks.StaleContextError;
vi.mock("@/lib/api/ai", () => ({
  sendChatMessage: aiMocks.sendChatMessage,
  StaleContextError: aiMocks.StaleContextError,
}));

import { MessageInput } from "./message-input";
import { useAssistantSession } from "@/lib/hooks/use-assistant-session";

function resetStore() {
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

beforeEach(() => {
  resetStore();
  sendChatMessageMock.mockReset();
});
afterEach(cleanup);

describe("MessageInput", () => {
  it("renders the textarea + send + voice (disabled) buttons", () => {
    render(<MessageInput />);
    expect(screen.getByLabelText(/Message input/i)).toBeTruthy();
    expect(screen.getByLabelText(/Send message/i)).toBeTruthy();
    expect(screen.getByLabelText(/Voice mode/i)).toBeTruthy();
  });

  it("voice button is disabled (rolls out in AI-shell-D)", () => {
    render(<MessageInput />);
    const voice = screen.getByLabelText(/Voice mode/i) as HTMLButtonElement;
    expect(voice.disabled).toBe(true);
  });

  it("send button is disabled when draft is empty", () => {
    render(<MessageInput />);
    const send = screen.getByLabelText(/Send message/i) as HTMLButtonElement;
    expect(send.disabled).toBe(true);
  });

  it("typing in the textarea updates the assistant-session draft", () => {
    render(<MessageInput />);
    const ta = screen.getByLabelText(/Message input/i) as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: "hello world" } });
    expect(useAssistantSession.getState().inFlightDraft).toBe("hello world");
  });

  it("send button enables once draft has non-whitespace", () => {
    render(<MessageInput />);
    const ta = screen.getByLabelText(/Message input/i);
    const send = screen.getByLabelText(/Send message/i) as HTMLButtonElement;
    fireEvent.change(ta, { target: { value: "x" } });
    expect(send.disabled).toBe(false);
  });

  it("send button stays disabled when draft is whitespace-only", () => {
    render(<MessageInput />);
    const ta = screen.getByLabelText(/Message input/i);
    const send = screen.getByLabelText(/Send message/i) as HTMLButtonElement;
    fireEvent.change(ta, { target: { value: "   " } });
    expect(send.disabled).toBe(true);
  });

  it("Enter submits; sendChatMessage is called with the trimmed text", async () => {
    sendChatMessageMock.mockResolvedValue({
      text: "ok",
      contextVersion: 2,
      actionProposal: null,
    });
    render(<MessageInput />);
    const ta = screen.getByLabelText(/Message input/i);
    fireEvent.change(ta, { target: { value: "ping" } });
    fireEvent.keyDown(ta, { key: "Enter" });
    await waitFor(() => expect(sendChatMessageMock).toHaveBeenCalled());
    expect(sendChatMessageMock.mock.calls[0]![0]!.message).toBe("ping");
  });

  it("Shift+Enter does NOT submit (newline path)", () => {
    render(<MessageInput />);
    const ta = screen.getByLabelText(/Message input/i);
    fireEvent.change(ta, { target: { value: "draft" } });
    fireEvent.keyDown(ta, { key: "Enter", shiftKey: true });
    expect(sendChatMessageMock).not.toHaveBeenCalled();
  });

  it("clamps draft input to the 2000-char limit", () => {
    render(<MessageInput />);
    const ta = screen.getByLabelText(/Message input/i);
    fireEvent.change(ta, { target: { value: "x".repeat(3000) } });
    expect(useAssistantSession.getState().inFlightDraft.length).toBe(2000);
  });

  it("retries with bumped contextVersion on StaleContextError", async () => {
    sendChatMessageMock.mockImplementationOnce(async () => {
      throw new StaleContextErrorMock("stale");
    });
    sendChatMessageMock.mockResolvedValueOnce({
      text: "after retry",
      contextVersion: 7,
      actionProposal: null,
    });
    render(<MessageInput />);
    const ta = screen.getByLabelText(/Message input/i);
    fireEvent.change(ta, { target: { value: "ping" } });
    fireEvent.click(screen.getByLabelText(/Send message/i));
    await waitFor(() => expect(sendChatMessageMock).toHaveBeenCalledTimes(2));
    // First call uses contextVersion 1 (initial); second call bumps to 2.
    expect(sendChatMessageMock.mock.calls[0]![0]!.contextVersion).toBe(1);
    expect(sendChatMessageMock.mock.calls[1]![0]!.contextVersion).toBe(2);
  });
});
