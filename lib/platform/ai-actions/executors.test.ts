import { describe, it, expect } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { getActionExecutor, _registeredActions, inferResourceHint } from "./executors";

describe("AI action executors", () => {
  it("every registered executor has an inferResourceHint mapping (batch 140)", () => {
    // Invariant: a new executor whose actionId prefix doesn't appear
    // in inferResourceHint() will silently emit audit entries with
    // resource_type=undefined. That breaks the audit log filter UI
    // and the bidirectional resource-hint ↔ skill parity invariant
    // in batch 135. Lock it here so the next executor added forces
    // an inferResourceHint() update.
    const missing: string[] = [];
    for (const actionId of _registeredActions()) {
      const hint = inferResourceHint(actionId, {});
      if (!hint.resource_type) missing.push(actionId);
    }
    expect(missing).toEqual([]);
  });

  it("registers helpdesk.ticket.take and helpdesk.ticket.resolve", () => {
    const ids = _registeredActions();
    expect(ids).toContain("helpdesk.ticket.take");
    expect(ids).toContain("helpdesk.ticket.resolve");
  });

  it("registers helpdesk.maintenance.cancel and helpdesk.batch.cancel (Round 2 HIGH #2)", () => {
    const ids = _registeredActions();
    expect(ids).toContain("helpdesk.maintenance.cancel");
    expect(ids).toContain("helpdesk.batch.cancel");
  });

  it("helpdesk.maintenance.cancel executes against mock client", async () => {
    const exec = getActionExecutor("helpdesk.maintenance.cancel")!;
    const qc = new QueryClient();
    const result = await exec({ windowId: 9001 }, qc);
    expect(result.message).toContain("(mock)");
  });

  it("helpdesk.batch.cancel executes against mock client", async () => {
    const exec = getActionExecutor("helpdesk.batch.cancel")!;
    const qc = new QueryClient();
    const result = await exec({ taskId: 7002 }, qc);
    expect(result.message).toContain("(mock)");
  });

  it("returns null for unregistered action id", () => {
    expect(getActionExecutor("users.delete")).toBeNull();
  });

  it("helpdesk.ticket.take executes against mock client", async () => {
    const exec = getActionExecutor("helpdesk.ticket.take");
    expect(exec).not.toBeNull();
    const qc = new QueryClient();
    const result = await exec!({ ticketId: 1002 }, qc);
    expect(result.message).toContain("(mock)");
  });

  it("helpdesk.ticket.take rejects when ticketId is not a number", async () => {
    const exec = getActionExecutor("helpdesk.ticket.take")!;
    const qc = new QueryClient();
    await expect(exec({ ticketId: "abc" }, qc)).rejects.toThrow(/must be a number/);
  });

  it("helpdesk.ticket.resolve uses fallback resolution string when missing", async () => {
    const exec = getActionExecutor("helpdesk.ticket.resolve")!;
    const qc = new QueryClient();
    const result = await exec({ ticketId: 1002 }, qc);
    expect(result.message).toContain("(mock)");
  });

  // Batches 130-134 added the non-helpdesk executors. Smoke-tests
  // confirm each runs against its mock client without throwing.

  it("users.search executes and reports a count", async () => {
    const exec = getActionExecutor("users.search")!;
    const qc = new QueryClient();
    const result = await exec({ query: "admin" }, qc);
    expect(result.message).toMatch(/Found \d+ user/);
  });

  it("users.deactivate executes and labels the user id", async () => {
    const exec = getActionExecutor("users.deactivate")!;
    const qc = new QueryClient();
    const result = await exec({ userId: 7, reason: "test" }, qc);
    expect(result.message).toContain("#7");
  });

  it("users.reset_password executes via mock client", async () => {
    const exec = getActionExecutor("users.reset_password")!;
    const qc = new QueryClient();
    const result = await exec({ userId: 9 }, qc);
    expect(result.message).toContain("(mock)");
  });

  it("notes.create executes with title + body", async () => {
    const exec = getActionExecutor("notes.create")!;
    const qc = new QueryClient();
    const result = await exec(
      { title: "Smoke title", body: "Smoke body" },
      qc,
    );
    expect(result.message).toContain("Smoke title");
  });

  it("bookmarks.create executes with title + url", async () => {
    const exec = getActionExecutor("bookmarks.create")!;
    const qc = new QueryClient();
    const result = await exec(
      { title: "Smoke bookmark", url: "https://example.com" },
      qc,
    );
    expect(result.message).toContain("Smoke bookmark");
  });

  // WhatsApp executors share mock-storage state (cap-A shim). The mock
  // client only allows one active session at a time, so we link once,
  // capture the id, then exercise relink + unlink on that session.
  describe("whatsapp.session.* executors", () => {
    let sessionId: number | null = null;

    it("link creates a fresh session", async () => {
      // Some earlier suite may have left a session in storage. Clear it
      // via unlink-then-link is messy; easier: import the storage shim
      // and reset. But the cleanest is to read state and link only when
      // empty.
      const { fetchWhatsappSessions } = await import("@/lib/api/whatsapp");
      const existing = await fetchWhatsappSessions();
      const active = existing.data.find(
        (s) => s.session_state !== "unlinked",
      );
      if (active) {
        sessionId = active.id;
        return; // reuse the existing session for subsequent tests
      }
      const exec = getActionExecutor("whatsapp.session.link")!;
      const result = await exec({}, new QueryClient());
      expect(result.message).toMatch(/linking started/i);
      const after = await fetchWhatsappSessions();
      const fresh = after.data.find((s) => s.session_state !== "unlinked");
      expect(fresh).toBeDefined();
      sessionId = fresh!.id;
    });

    it("relink generates a fresh QR for the same session", async () => {
      expect(sessionId).not.toBeNull();
      const exec = getActionExecutor("whatsapp.session.relink")!;
      const result = await exec({ sessionId: sessionId! }, new QueryClient());
      expect(result.message).toMatch(/Re-link requested/i);
    });

    it("unlink severs the live link", async () => {
      expect(sessionId).not.toBeNull();
      const exec = getActionExecutor("whatsapp.session.unlink")!;
      const result = await exec({ sessionId: sessionId! }, new QueryClient());
      expect(result.message).toMatch(/unlinked/i);
    });
  });
});
