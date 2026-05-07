import { describe, it, expect } from "vitest";
import { generateRequestId, buildAuditHeaders } from "./context";

describe("generateRequestId", () => {
  it("returns pui-prefixed id with timestamp + random suffix", () => {
    const id = generateRequestId();
    expect(id).toMatch(/^pui-[a-z0-9]+-[a-z0-9]{6}$/);
  });

  it("generates unique ids across calls", () => {
    const ids = new Set(Array.from({ length: 50 }, generateRequestId));
    expect(ids.size).toBe(50);
  });
});

describe("buildAuditHeaders", () => {
  it("always includes X-Request-ID and X-Client-Source", () => {
    const h = buildAuditHeaders({});
    expect(h["X-Request-ID"]).toMatch(/^pui-/);
    expect(h["X-Client-Source"]).toBe("platform-ui");
  });

  it("includes user/org/route/action when provided", () => {
    const h = buildAuditHeaders({
      userId: 7,
      orgId: 3,
      route: "/users",
      action: "users.deactivate",
    });
    expect(h["X-Client-User-Id"]).toBe("7");
    expect(h["X-Client-Org-Id"]).toBe("3");
    expect(h["X-Client-Route"]).toBe("/users");
    expect(h["X-Client-Action"]).toBe("users.deactivate");
  });

  it("omits null/undefined fields", () => {
    const h = buildAuditHeaders({ userId: null, orgId: undefined, route: null, action: null });
    expect(h["X-Client-User-Id"]).toBeUndefined();
    expect(h["X-Client-Org-Id"]).toBeUndefined();
    expect(h["X-Client-Route"]).toBeUndefined();
    expect(h["X-Client-Action"]).toBeUndefined();
  });

  it("truncates route to 100 chars and action to 50 chars", () => {
    const longRoute = "/x".repeat(200);
    const longAction = "y".repeat(200);
    const h = buildAuditHeaders({ route: longRoute, action: longAction });
    expect(h["X-Client-Route"]).toHaveLength(100);
    expect(h["X-Client-Action"]).toHaveLength(50);
  });

  it("treats userId 0 as a real id (not falsy-skipped)", () => {
    const h = buildAuditHeaders({ userId: 0, orgId: 0 });
    expect(h["X-Client-User-Id"]).toBe("0");
    expect(h["X-Client-Org-Id"]).toBe("0");
  });
});
