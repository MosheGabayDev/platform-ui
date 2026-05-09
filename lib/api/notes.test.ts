/**
 * Notes client (mock mode) — list + add + delete round-trip via localStorage.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { fetchNotes, addNote, deleteNote, MOCK_MODE } from "./notes";
import { clearMockState } from "@/lib/api/_mock-storage";
import * as auditModule from "@/lib/api/audit";

beforeEach(() => {
  clearMockState("notes:");
  localStorage.clear();
});

describe("notes client (mock mode)", () => {
  it("MOCK_MODE is true until backend lands", () => {
    expect(MOCK_MODE).toBe(true);
  });

  it("fetchNotes returns the 3 seeded fixture items", async () => {
    const res = await fetchNotes();
    expect(res.success).toBe(true);
    expect(res.data.items.length).toBe(3);
    expect(res.data.total).toBe(3);
  });

  it("addNote prepends and persists; created_at and updated_at match", async () => {
    await addNote({ title: "Standup", body: "Daily roll-up", tags: ["meeting"] });
    const res = await fetchNotes();
    expect(res.data.items.length).toBe(4);
    const note = res.data.items[0]!;
    expect(note.title).toBe("Standup");
    expect(note.tags).toEqual(["meeting"]);
    expect(note.id).toMatch(/^n-/);
    expect(note.author_id).toBe(1);
    expect(note.created_at).toBe(note.updated_at);
  });

  it("addNote defaults tags to empty array when omitted", async () => {
    await addNote({ title: "no-tags", body: "x" });
    const res = await fetchNotes();
    expect(res.data.items[0]!.tags).toEqual([]);
  });

  it("deleteNote removes and persists", async () => {
    const before = await fetchNotes();
    const targetId = before.data.items[0]!.id;
    const after = await deleteNote(targetId);
    expect(after.data.items.find((n) => n.id === targetId)).toBeUndefined();
    expect(after.data.items.length).toBe(2);
    // Confirm via fresh load (round-trip through storage).
    const reload = await fetchNotes();
    expect(reload.data.items.length).toBe(2);
  });

  it("deleteNote on missing id is a no-op (idempotent)", async () => {
    const before = await fetchNotes();
    const after = await deleteNote("does-not-exist");
    expect(after.data.items.length).toBe(before.data.items.length);
  });

  it("multiple addNote calls preserve newest-first order", async () => {
    await addNote({ title: "A", body: "a" });
    await addNote({ title: "B", body: "b" });
    const res = await fetchNotes();
    expect(res.data.items[0]!.title).toBe("B");
    expect(res.data.items[1]!.title).toBe("A");
  });

  it("addNote emits a notes.created audit event", async () => {
    const spy = vi.spyOn(auditModule, "recordAuditEntry").mockResolvedValue({
      success: true,
    } as never);
    await addNote({ title: "Audit me", body: "x", tags: ["t1"] });
    // Audit is fire-and-forget; resolve a microtask before asserting.
    await Promise.resolve();
    expect(spy).toHaveBeenCalledOnce();
    const arg = spy.mock.calls[0]![0];
    expect(arg.action).toBe("notes.created");
    expect(arg.category).toBe("create");
    expect(arg.resource_type).toBe("note");
    expect(arg.metadata).toMatchObject({ title: "Audit me", tag_count: 1 });
    spy.mockRestore();
  });

  it("deleteNote emits notes.deleted only when an item was actually removed", async () => {
    const spy = vi.spyOn(auditModule, "recordAuditEntry").mockResolvedValue({
      success: true,
    } as never);
    const before = await fetchNotes();
    const id = before.data.items[0]!.id;
    await deleteNote(id);
    await Promise.resolve();
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0]![0].action).toBe("notes.deleted");

    spy.mockClear();
    await deleteNote("does-not-exist");
    await Promise.resolve();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
