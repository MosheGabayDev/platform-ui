import { describe, it, expect } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { getActionExecutor, _registeredActions } from "./executors";

describe("AI action executors", () => {
  it("registers helpdesk.ticket.take and helpdesk.ticket.resolve", () => {
    const ids = _registeredActions();
    expect(ids).toContain("helpdesk.ticket.take");
    expect(ids).toContain("helpdesk.ticket.resolve");
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
});
