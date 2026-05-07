/**
 * Feedback client (mock mode) — list + add round-trip via localStorage.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { fetchFeedback, addFeedback, MOCK_MODE } from "./feedback";
import { clearMockState } from "@/lib/api/_mock-storage";

beforeEach(() => {
  clearMockState("feedback:");
  localStorage.clear();
});

describe("feedback client (mock mode)", () => {
  it("MOCK_MODE is true until backend lands", () => {
    expect(MOCK_MODE).toBe(true);
  });

  it("fetchFeedback returns the seeded fixture (3 items)", async () => {
    const res = await fetchFeedback();
    expect(res.success).toBe(true);
    expect(res.data.items.length).toBe(3);
    const types = res.data.items.map((i) => i.type).sort();
    expect(types).toEqual(["bug", "feature", "insight"]);
  });

  it("addFeedback prepends a new item and persists", async () => {
    await addFeedback({
      source: "test",
      type: "feature",
      content: "Need dark-mode for the upgrade banner",
      reporter: "tester@test.com",
    });
    const res = await fetchFeedback();
    expect(res.data.items.length).toBe(4);
    expect(res.data.items[0]!.content).toContain("dark-mode");
    expect(res.data.items[0]!.status).toBe("new");
    expect(res.data.items[0]!.id).toMatch(/^fb-/);
  });

  it("addFeedback accepts null reporter", async () => {
    await addFeedback({
      source: "anon",
      type: "bug",
      content: "Anonymous bug report",
    });
    const res = await fetchFeedback();
    expect(res.data.items[0]!.reporter).toBeNull();
  });

  it("multiple addFeedback calls accumulate", async () => {
    await addFeedback({ source: "x", type: "bug", content: "A" });
    await addFeedback({ source: "x", type: "feature", content: "B" });
    const res = await fetchFeedback();
    expect(res.data.items.length).toBe(5); // 3 fixture + 2 added
    // Newest-first: B before A.
    expect(res.data.items[0]!.content).toBe("B");
    expect(res.data.items[1]!.content).toBe("A");
  });
});
