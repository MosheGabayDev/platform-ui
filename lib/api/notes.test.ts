/**
 * Notes client (mock mode) — list + add + delete round-trip via localStorage.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { fetchNotes, addNote, deleteNote, MOCK_MODE } from "./notes";
import { clearMockState } from "@/lib/api/_mock-storage";

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
});
