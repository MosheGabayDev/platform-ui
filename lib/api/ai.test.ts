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

  it("'cancel maintenance NNNN' → DESTRUCTIVE proposal", async () => {
    const res = await sendChatMessage({ message: "cancel maintenance 5511", context: null });
    expect(res.actionProposal?.actionId).toBe("helpdesk.maintenance.cancel");
    expect(res.actionProposal?.capabilityLevel).toBe("DESTRUCTIVE");
    expect(res.actionProposal?.params).toMatchObject({ windowId: 5511 });
  });

  it("'cancel batch NNNN' → WRITE_HIGH proposal", async () => {
    const res = await sendChatMessage({ message: "cancel batch 7788", context: null });
    expect(res.actionProposal?.actionId).toBe("helpdesk.batch.cancel");
    expect(res.actionProposal?.capabilityLevel).toBe("WRITE_HIGH");
    expect(res.actionProposal?.params).toMatchObject({ taskId: 7788 });
  });

  it("'search users for <query>' → READ proposal with the query echoed", async () => {
    const res = await sendChatMessage({ message: 'search users for "alice"', context: null });
    expect(res.actionProposal?.actionId).toBe("users.search");
    expect(res.actionProposal?.capabilityLevel).toBe("READ");
    expect(res.actionProposal?.params).toMatchObject({ query: "alice" });
  });

  it("contextVersion defaults to 1 when not provided", async () => {
    const res = await sendChatMessage({ message: "hi", context: null });
    expect(res.contextVersion).toBe(1);
  });

  it("hash-prefixed ticket ids are accepted (e.g. #1002)", async () => {
    const res = await sendChatMessage({ message: "take ticket #1002", context: null });
    expect(res.actionProposal?.params).toMatchObject({ ticketId: 1002 });
  });

  it("token id is unique across two consecutive proposals", async () => {
    // Ticket id must be 3-6 digits per the TAKE_TICKET_RE grammar.
    const a = await sendChatMessage({ message: "take ticket 1001", context: null });
    const b = await sendChatMessage({ message: "take ticket 1002", context: null });
    expect(a.actionProposal!.tokenId).not.toBe(b.actionProposal!.tokenId);
  });

  it("expiresAt is in the future at response time", async () => {
    const before = Date.now();
    const res = await sendChatMessage({ message: "take ticket 1099", context: null });
    expect(res.actionProposal!.expiresAt).toBeGreaterThan(before);
  });

  it("ticket ids shorter than 3 digits do NOT match (regex-grammar boundary)", async () => {
    const res = await sendChatMessage({ message: "take ticket 99", context: null });
    expect(res.actionProposal).toBeNull();
  });

  it("every recognized intent.actionId maps to a registered skill (batch 87)", async () => {
    // Cross-cut: the mock LLM grammar in lib/api/ai.ts proposes
    // action_ids. Each MUST be a real entry in the AI skill registry.
    // Typo here → user confirms → validateInvocation can't find the
    // skill → confusing "skill not registered" error in the UI.
    const { getAllSkills } = await import("@/lib/platform/ai-skills/registry");
    const skillIds = new Set(getAllSkills().map((s) => s.id));
    const phrases = [
      "take ticket 1001",
      "resolve ticket 1002",
      "cancel maintenance 1003",
      "cancel batch 1004",
      "search users for alice",
      "deactivate user 7",
      "reset password for user 9",
      "create note Standup recap | We discussed Q2 priorities.",
      "add bookmark Postmortem template https://wiki.example/pm-template",
    ];
    const seen = new Set<string>();
    for (const phrase of phrases) {
      const res = await sendChatMessage({ message: phrase, context: null });
      expect(res.actionProposal, `phrase "${phrase}" must propose`).toBeTruthy();
      seen.add(res.actionProposal!.actionId);
    }
    const orphans = [...seen].filter((id) => !skillIds.has(id));
    expect(orphans).toEqual([]);
    expect(seen.size).toBe(9);
  });
});
