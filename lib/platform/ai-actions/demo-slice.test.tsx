/**
 * AI demo slice — end-to-end smoke (Phase 2.5, ADR-038).
 *
 * Asserts the chain works without React rendering:
 *   sendChatMessage → extractIntent → proposeAction → confirmAction
 *   → runActionExecutor → emitExecutorRun → AuditLog (category=ai)
 *
 * Component-level confirmation UX is covered by
 * components/shell/ai-assistant/action-preview-card.test.tsx; this
 * test focuses on the wiring contract.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { sendChatMessage } from "@/lib/api/ai";
import { useAssistantSession } from "@/lib/hooks/use-assistant-session";
import { runActionExecutor } from "@/lib/platform/ai-actions/executors";
import { fetchAuditLog } from "@/lib/api/audit";

async function flush() {
  await new Promise((r) => setTimeout(r, 50));
}

function resetSession() {
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
  resetSession();
});

describe("AI demo slice — end-to-end (ADR-038)", () => {
  it("recognized phrase produces a chat reply + action proposal", async () => {
    const res = await sendChatMessage({
      message: "take ticket 1002",
      context: null,
    });
    expect(res.text).toMatch(/take ticket #1002/i);
    expect(res.actionProposal).not.toBeNull();
    expect(res.actionProposal!.actionId).toBe("helpdesk.ticket.take");
    expect(res.actionProposal!.params).toEqual({ ticketId: 1002 });
  });

  it("unrecognized text returns plain reply with no proposal", async () => {
    const res = await sendChatMessage({
      message: "hello there",
      context: null,
    });
    expect(res.actionProposal).toBeNull();
    expect(res.text.length).toBeGreaterThan(0);
  });

  it("propose → confirm → execute → audit chain runs end-to-end", async () => {
    // 1. Open drawer + send recognized message — store transitions
    useAssistantSession.getState().openDrawer();
    useAssistantSession.getState().sendMessage("take ticket 1003");
    expect(useAssistantSession.getState().state.kind).toBe("chatting_sending");

    const chat = await sendChatMessage({
      message: "take ticket 1003",
      context: null,
    });
    expect(chat.actionProposal).not.toBeNull();

    // 2. Mock the LLM responding + proposing
    useAssistantSession.getState().receiveResponse(chat.text);
    useAssistantSession.getState().proposeAction(chat.actionProposal!);
    expect(useAssistantSession.getState().state.kind).toBe("awaiting_action_confirmation");
    expect(useAssistantSession.getState().pendingProposal?.actionId).toBe(
      "helpdesk.ticket.take",
    );

    // 3. User confirms — store transitions to executing_action
    const proposal = useAssistantSession.getState().pendingProposal!;
    useAssistantSession.getState().confirmAction(proposal.tokenId);
    expect(useAssistantSession.getState().state.kind).toBe("executing_action");

    // 4. Run the executor with audit emission
    const qc = new QueryClient();
    const auditBefore = await fetchAuditLog({
      page: 1,
      per_page: 1000,
      category: "ai",
    });
    const result = await runActionExecutor(
      proposal.actionId,
      proposal.params,
      qc,
    );
    expect(result.message).toMatch(/took ticket|assigned/i);
    await flush();

    // 5. Audit log received the entry
    const auditAfter = await fetchAuditLog({
      page: 1,
      per_page: 1000,
      category: "ai",
    });
    expect(auditAfter.data.total).toBeGreaterThan(auditBefore.data.total);
    const exec = auditAfter.data.entries.find(
      (e) =>
        e.action === "helpdesk.ticket.take" &&
        e.metadata.outcome === "success" &&
        e.resource_id === "1003",
    );
    expect(exec).toBeDefined();
  });

  it("rejected proposal does NOT run the executor", async () => {
    useAssistantSession.getState().openDrawer();
    const chat = await sendChatMessage({
      message: "resolve ticket 1004",
      context: null,
    });
    useAssistantSession.getState().sendMessage("resolve ticket 1004");
    useAssistantSession.getState().receiveResponse(chat.text);
    useAssistantSession.getState().proposeAction(chat.actionProposal!);

    const proposal = useAssistantSession.getState().pendingProposal!;
    useAssistantSession.getState().rejectAction(proposal.tokenId);
    expect(useAssistantSession.getState().state.kind).toBe("chatting_idle");
    expect(useAssistantSession.getState().pendingProposal).toBeNull();
  });

  it("destructive intent (cancel maintenance) maps to DESTRUCTIVE capability", async () => {
    const res = await sendChatMessage({
      message: "cancel maintenance 9001",
      context: null,
    });
    expect(res.actionProposal!.capabilityLevel).toBe("DESTRUCTIVE");
    expect(res.actionProposal!.actionId).toBe("helpdesk.maintenance.cancel");
  });

  it("read intent (search users) maps to READ capability", async () => {
    const res = await sendChatMessage({
      message: "search users for tim",
      context: null,
    });
    expect(res.actionProposal!.actionId).toBe("users.search");
    expect(res.actionProposal!.capabilityLevel).toBe("READ");
    expect(res.actionProposal!.params).toEqual({ query: "tim" });
  });

  it("executor failure surfaces audit entry with outcome=error", async () => {
    const qc = new QueryClient();
    const auditBefore = await fetchAuditLog({
      page: 1,
      per_page: 1000,
      category: "ai",
    });
    await expect(
      runActionExecutor("helpdesk.ticket.take", { ticketId: "bad" }, qc),
    ).rejects.toBeTruthy();
    await flush();
    const auditAfter = await fetchAuditLog({
      page: 1,
      per_page: 1000,
      category: "ai",
    });
    expect(auditAfter.data.total).toBeGreaterThan(auditBefore.data.total);
    const errored = auditAfter.data.entries.find(
      (e) =>
        e.action === "helpdesk.ticket.take" && e.metadata.outcome === "error",
    );
    expect(errored).toBeDefined();
  });
});
