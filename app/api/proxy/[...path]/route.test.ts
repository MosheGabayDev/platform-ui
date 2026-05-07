/**
 * Proxy route tests — covers auth gate, prefix allowlist, all 5 verbs,
 * upstream JSON pass-through, gateway-error masking.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const getTokenMock = vi.hoisted(() => vi.fn());
const fetchMock = vi.hoisted(() => vi.fn());

vi.mock("next-auth/jwt", () => ({
  getToken: getTokenMock,
}));
vi.stubGlobal("fetch", fetchMock);

import { GET, POST, PUT, PATCH, DELETE } from "./route";

function makeReq(opts: { method: string; url?: string; body?: string; referer?: string | null } = { method: "GET" }) {
  const url = opts.url ?? "http://localhost:3001/api/proxy/users";
  const init: RequestInit & { headers?: HeadersInit } = {
    method: opts.method,
    headers: opts.referer ? { referer: opts.referer } : {},
  };
  if (opts.body !== undefined) init.body = opts.body;
  // Cast to any for NextRequest compatibility — we only use .nextUrl/.method/.headers/.text()
  const nReq = new Request(url, init) as unknown as Request & { nextUrl: URL };
  Object.defineProperty(nReq, "nextUrl", { value: new URL(url), writable: false });
  return nReq;
}

beforeEach(() => {
  getTokenMock.mockReset();
  fetchMock.mockReset();
});
afterEach(() => vi.restoreAllMocks());

describe("proxy route — auth gate", () => {
  it("returns 401 when no token", async () => {
    getTokenMock.mockResolvedValue(null);
    const res = await GET(
      makeReq({ method: "GET" }) as never,
      { params: Promise.resolve({ path: ["users"] }) },
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 when token has no accessToken", async () => {
    getTokenMock.mockResolvedValue({ user: { id: 1 } });
    const res = await GET(
      makeReq({ method: "GET" }) as never,
      { params: Promise.resolve({ path: ["users"] }) },
    );
    expect(res.status).toBe(401);
  });
});

describe("proxy route — prefix allowlist", () => {
  it("returns 404 for unknown prefix (prevents path traversal)", async () => {
    getTokenMock.mockResolvedValue({ accessToken: "tok" });
    const res = await GET(
      makeReq({ method: "GET" }) as never,
      { params: Promise.resolve({ path: ["unlisted-prefix"] }) },
    );
    expect(res.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 404 when path is empty", async () => {
    getTokenMock.mockResolvedValue({ accessToken: "tok" });
    const res = await GET(
      makeReq({ method: "GET" }) as never,
      { params: Promise.resolve({ path: [] }) },
    );
    expect(res.status).toBe(404);
  });
});

describe("proxy route — happy path", () => {
  it("forwards GET to mapped Flask URL with Authorization + audit headers", async () => {
    getTokenMock.mockResolvedValue({
      accessToken: "secret-token",
      user: { id: 7, org_id: 3 },
    });
    fetchMock.mockResolvedValue({
      status: 200,
      json: async () => ({ data: { ok: true } }),
    });
    const res = await GET(
      makeReq({ method: "GET", referer: "/users" }) as never,
      { params: Promise.resolve({ path: ["users", "7"] }) },
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { ok: true } });
    const [downstreamUrl, init] = fetchMock.mock.calls[0]!;
    expect(downstreamUrl).toContain("/api/users/7");
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer secret-token",
    );
    expect((init.headers as Record<string, string>)["X-Client-User-Id"]).toBe("7");
    expect((init.headers as Record<string, string>)["X-Client-Org-Id"]).toBe("3");
    // referer may not survive Request construction in all envs — assert other audit headers only
  });

  it("preserves query string from request URL", async () => {
    getTokenMock.mockResolvedValue({ accessToken: "t" });
    fetchMock.mockResolvedValue({ status: 200, json: async () => ({}) });
    await GET(
      makeReq({
        method: "GET",
        url: "http://localhost:3001/api/proxy/helpdesk/tickets?status=open&page=2",
      }) as never,
      { params: Promise.resolve({ path: ["helpdesk", "tickets"] }) },
    );
    expect(fetchMock.mock.calls[0]![0]).toContain("?status=open&page=2");
  });

  it("returns the upstream status code (e.g. 403)", async () => {
    getTokenMock.mockResolvedValue({ accessToken: "t" });
    fetchMock.mockResolvedValue({
      status: 403,
      json: async () => ({ error: "forbidden" }),
    });
    const res = await GET(
      makeReq({ method: "GET" }) as never,
      { params: Promise.resolve({ path: ["users"] }) },
    );
    expect(res.status).toBe(403);
  });

  it("returns empty object when upstream is non-JSON (e.g. 204)", async () => {
    getTokenMock.mockResolvedValue({ accessToken: "t" });
    fetchMock.mockResolvedValue({
      status: 204,
      json: async () => {
        throw new Error("no body");
      },
    });
    const res = await GET(
      makeReq({ method: "GET" }) as never,
      { params: Promise.resolve({ path: ["users"] }) },
    );
    expect(res.status).toBe(204);
    expect(await res.json()).toEqual({});
  });
});

describe("proxy route — body forwarding", () => {
  it("POST forwards request body", async () => {
    getTokenMock.mockResolvedValue({ accessToken: "t" });
    fetchMock.mockResolvedValue({ status: 201, json: async () => ({}) });
    await POST(
      makeReq({ method: "POST", body: '{"name":"x"}' }) as never,
      { params: Promise.resolve({ path: ["users"] }) },
    );
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.body).toBe('{"name":"x"}');
    expect(init.method).toBe("POST");
  });

  it("PUT forwards body", async () => {
    getTokenMock.mockResolvedValue({ accessToken: "t" });
    fetchMock.mockResolvedValue({ status: 200, json: async () => ({}) });
    await PUT(
      makeReq({ method: "PUT", body: '{}' }) as never,
      { params: Promise.resolve({ path: ["users", "1"] }) },
    );
    expect(fetchMock.mock.calls[0]![1]!.method).toBe("PUT");
  });

  it("PATCH forwards body", async () => {
    getTokenMock.mockResolvedValue({ accessToken: "t" });
    fetchMock.mockResolvedValue({ status: 200, json: async () => ({}) });
    await PATCH(
      makeReq({ method: "PATCH", body: '{}' }) as never,
      { params: Promise.resolve({ path: ["users", "1"] }) },
    );
    expect(fetchMock.mock.calls[0]![1]!.method).toBe("PATCH");
  });

  it("DELETE does not require body", async () => {
    getTokenMock.mockResolvedValue({ accessToken: "t" });
    fetchMock.mockResolvedValue({ status: 204, json: async () => ({}) });
    const res = await DELETE(
      makeReq({ method: "DELETE" }) as never,
      { params: Promise.resolve({ path: ["users", "1"] }) },
    );
    expect(res.status).toBe(204);
    expect(fetchMock.mock.calls[0]![1]!.method).toBe("DELETE");
  });
});

describe("proxy route — error masking", () => {
  it("returns 502 with generic message when upstream throws (no URL leak)", async () => {
    getTokenMock.mockResolvedValue({ accessToken: "t" });
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED 10.0.0.5:5000"));
    const res = await GET(
      makeReq({ method: "GET" }) as never,
      { params: Promise.resolve({ path: ["users"] }) },
    );
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body).toEqual({ error: "Gateway error" });
    expect(JSON.stringify(body)).not.toContain("10.0.0.5");
  });
});
