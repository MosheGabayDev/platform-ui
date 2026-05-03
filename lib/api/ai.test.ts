import { describe, it, expect, beforeEach } from "vitest";
import { sendChatMessage, _resetMockState, MOCK_MODE } from "./ai";

describe("sendChatMessage (mock mode)", () => {
  beforeEach(() => _resetMockState());

  it("MOCK_MODE is enabled until R048 partial cleanup lands", () => {
    expect(MOCK_MODE).toBe(true);
  });

  it("returns a mock response that echoes the user message", async () => {
    const res = await sendChatMessage({
      message: "hello",
      context: null,
    });
    expect(res.text).toContain("hello");
    expect(res.actionProposal).toBeNull();
    expect(typeof res.contextVersion).toBe("number");
  });

  it("includes pageKey in response when context is provided", async () => {
    const res = await sendChatMessage({
      message: "what's here",
      context: {
        pageKey: "users.list",
        route: "/users",
        summary: "Users list",
        availableActions: [],
      },
    });
    expect(res.text).toContain("users.list");
  });

  it("returns sequential canned responses (mocks rotate)", async () => {
    const a = await sendChatMessage({ message: "a", context: null });
    const b = await sendChatMessage({ message: "b", context: null });
    expect(a.text).not.toBe(b.text);
  });

  it("echoes contextVersion when provided", async () => {
    const res = await sendChatMessage({
      message: "hi",
      context: null,
      contextVersion: 7,
    });
    expect(res.contextVersion).toBe(7);
  });

  // ----- AI-shell-C intent extraction (mock LLM grammar) -----------

  it("'take ticket NNNN' → returns helpdesk.ticket.take proposal (WRITE_LOW)", async () => {
    const res = await sendChatMessage({
      message: "take ticket 1002",
      context: null,
    });
    expect(res.actionProposal).not.toBeNull();
    expect(res.actionProposal?.actionId).toBe("helpdesk.ticket.take");
    expect(res.actionProposal?.capabilityLevel).toBe("WRITE_LOW");
    expect(res.actionProposal?.params.ticketId).toBe(1002);
    expect(res.actionProposal?.tokenId).toMatch(/^tok-mock-/);
  });

  it("'resolve ticket NNNN' → returns helpdesk.ticket.resolve proposal (WRITE_HIGH)", async () => {
    const res = await sendChatMessage({
      message: "resolve ticket 1004",
      context: null,
    });
    expect(res.actionProposal).not.toBeNull();
    expect(res.actionProposal?.actionId).toBe("helpdesk.ticket.resolve");
    expect(res.actionProposal?.capabilityLevel).toBe("WRITE_HIGH");
    expect(res.actionProposal?.params.ticketId).toBe(1004);
  });

  it("WRITE_HIGH proposal has shorter TTL than WRITE_LOW", async () => {
    const low = await sendChatMessage({ message: "take ticket 1001", context: null });
    const high = await sendChatMessage({ message: "resolve ticket 1002", context: null });
    expect(low.actionProposal).not.toBeNull();
    expect(high.actionProposal).not.toBeNull();
    expect(high.actionProposal!.expiresAt - Date.now()).toBeLessThan(
      low.actionProposal!.expiresAt - Date.now(),
    );
  });

  it("plain text message returns no actionProposal", async () => {
    const res = await sendChatMessage({
      message: "hello there",
      context: null,
    });
    expect(res.actionProposal).toBeNull();
  });
});
