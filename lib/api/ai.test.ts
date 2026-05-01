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
});
