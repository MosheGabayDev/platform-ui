/**
 * Tests for the Flask-backed auth paths in lib/auth/options.ts.
 *
 * Complements `options.test.ts` (which covers AUTH_MOCK_MODE + the mock
 * authorize path). Here we drive the AUTH_MOCK_MODE=false code path:
 * - authorizeWithFlask happy/error paths
 * - refreshAccessToken happy/error paths
 * - jwt() callback first sign-in vs. token reuse vs. forced refresh
 * - session() callback shape (and refreshToken NOT leaking to client)
 * - signOut event Flask logout call + error swallowing
 *
 * lib/auth/ has an ADR-042 95% coverage floor. This file climbs the gap.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { JWT } from "next-auth/jwt";
import type { NormalizedAuthUser } from "@/lib/auth/types";

const ORIG_NODE_ENV = process.env.NODE_ENV;
const ORIG_AUTH_MOCK_MODE = process.env.AUTH_MOCK_MODE;

function makeFlaskUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    email: "real@platform.local",
    name: "Real User",
    roles: ["technician"],
    permissions: ["helpdesk.view", "helpdesk.assign"],
    org_id: 1,
    is_admin: false,
    is_system_admin: false,
    ...overrides,
  };
}

async function loadModule() {
  vi.resetModules();
  Object.assign(process.env, { NODE_ENV: "development" });
  process.env.AUTH_MOCK_MODE = "false"; // force Flask path
  return import("./options");
}

afterEach(() => {
  if (ORIG_NODE_ENV === undefined) {
    delete (process.env as Record<string, string | undefined>).NODE_ENV;
  } else {
    Object.assign(process.env, { NODE_ENV: ORIG_NODE_ENV });
  }
  if (ORIG_AUTH_MOCK_MODE === undefined) {
    delete process.env.AUTH_MOCK_MODE;
  } else {
    process.env.AUTH_MOCK_MODE = ORIG_AUTH_MOCK_MODE;
  }
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// authorizeWithFlask — via the Credentials provider's authorize()
// ---------------------------------------------------------------------------

async function callAuthorize(
  authOptions: import("next-auth").NextAuthOptions,
  email: string,
  password: string,
) {
  const provider = authOptions.providers[0] as {
    options: {
      authorize: (
        credentials: { email: string; password: string } | undefined,
      ) => Promise<unknown>;
    };
  };
  return provider.options.authorize({ email, password });
}

describe("authorizeWithFlask (mock_mode=false)", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch");
  });

  it("returns a User with normalizedUser when Flask returns 200 with token+user", async () => {
    const flaskUser = makeFlaskUser();
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: { token: "real-access", refresh_token: "real-refresh", user: flaskUser },
        }),
        { status: 200 },
      ),
    );
    const { authOptions } = await loadModule();
    const result = (await callAuthorize(
      authOptions,
      "real@platform.local",
      "pw",
    )) as {
      accessToken: string;
      refreshToken: string;
      normalizedUser: NormalizedAuthUser;
    } | null;
    expect(result).not.toBeNull();
    expect(result!.accessToken).toBe("real-access");
    expect(result!.refreshToken).toBe("real-refresh");
    expect(result!.normalizedUser.role).toBe("technician");
    expect(result!.normalizedUser.org_id).toBe(1);
  });

  it("derives username from email local part when Flask user.name is missing", async () => {
    const flaskUser = makeFlaskUser({ name: undefined });
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: { token: "t", refresh_token: "rt", user: flaskUser },
        }),
        { status: 200 },
      ),
    );
    const { authOptions } = await loadModule();
    const result = (await callAuthorize(authOptions, "real@platform.local", "pw")) as {
      normalizedUser: NormalizedAuthUser;
    };
    expect(result.normalizedUser.username).toBe("real");
  });

  it("falls back to role 'user' when Flask returns empty roles[]", async () => {
    const flaskUser = makeFlaskUser({ roles: [] });
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: { token: "t", refresh_token: "rt", user: flaskUser },
        }),
        { status: 200 },
      ),
    );
    const { authOptions } = await loadModule();
    const result = (await callAuthorize(authOptions, "x@y.z", "pw")) as {
      normalizedUser: NormalizedAuthUser;
    };
    expect(result.normalizedUser.role).toBe("user");
  });

  it("returns null when Flask returns non-2xx", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response("unauthorized", { status: 401 }),
    );
    const { authOptions } = await loadModule();
    const result = await callAuthorize(authOptions, "x@y.z", "pw");
    expect(result).toBeNull();
  });

  it("returns null when fetch throws (network error / timeout)", async () => {
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error("ECONNRESET"));
    const { authOptions } = await loadModule();
    const result = await callAuthorize(authOptions, "x@y.z", "pw");
    expect(result).toBeNull();
  });

  it("returns null when Flask response body is not valid JSON", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response("<html>500</html>", { status: 200 }),
    );
    const { authOptions } = await loadModule();
    const result = await callAuthorize(authOptions, "x@y.z", "pw");
    expect(result).toBeNull();
  });

  it("returns null when response is shaped { error: ... } (no data.token)", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "bad creds" }), { status: 200 }),
    );
    const { authOptions } = await loadModule();
    const result = await callAuthorize(authOptions, "x@y.z", "pw");
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// jwt() + session() callbacks
// ---------------------------------------------------------------------------

describe("authOptions.callbacks.jwt", () => {
  it("on first sign-in, merges Flask auth fields into the JWT", async () => {
    const { authOptions } = await loadModule();
    const userObj = {
      id: "42",
      email: "x@y.z",
      name: "X",
      accessToken: "first-access",
      refreshToken: "first-refresh",
      expiresAt: Math.floor(Date.now() / 1000) + 900,
      normalizedUser: makeFlaskUser() as unknown as NormalizedAuthUser,
    };
    const out = await authOptions.callbacks!.jwt!({
      token: {} as JWT,
      user: userObj as unknown as Parameters<typeof authOptions.callbacks.jwt>[0]["user"],
      account: null,
      profile: undefined,
      trigger: "signIn",
      isNewUser: false,
      session: undefined,
    });
    expect((out as JWT).accessToken).toBe("first-access");
    expect((out as JWT).refreshToken).toBe("first-refresh");
  });

  it("returns existing token unchanged when not near expiry", async () => {
    const { authOptions } = await loadModule();
    const future = Math.floor(Date.now() / 1000) + 60 * 60; // 1h away
    const existing = {
      accessToken: "still-good",
      refreshToken: "rt",
      expiresAt: future,
      user: makeFlaskUser() as unknown as NormalizedAuthUser,
    } as JWT;
    const out = await authOptions.callbacks!.jwt!({
      token: existing,
      user: undefined,
      account: null,
    });
    expect(out).toBe(existing);
  });

  it("triggers refreshAccessToken when token is near expiry — Flask refresh OK", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: { token: "fresh-access", refresh_token: "fresh-refresh" },
        }),
        { status: 200 },
      ),
    );
    const { authOptions } = await loadModule();
    const expired = {
      accessToken: "stale",
      refreshToken: "rt",
      expiresAt: Math.floor(Date.now() / 1000) - 1, // expired
      user: makeFlaskUser() as unknown as NormalizedAuthUser,
    } as JWT;
    const out = (await authOptions.callbacks!.jwt!({
      token: expired,
      user: undefined,
      account: null,
    })) as JWT;
    expect(out.accessToken).toBe("fresh-access");
    expect(out.refreshToken).toBe("fresh-refresh");
    expect(out.error).toBeUndefined();
  });

  it("sets error='RefreshTokenError' when Flask refresh fails (non-2xx)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("revoked", { status: 401 }),
    );
    const { authOptions } = await loadModule();
    const expired = {
      accessToken: "stale",
      refreshToken: "rt",
      expiresAt: Math.floor(Date.now() / 1000) - 1,
      user: makeFlaskUser() as unknown as NormalizedAuthUser,
    } as JWT;
    const out = (await authOptions.callbacks!.jwt!({
      token: expired,
      user: undefined,
      account: null,
    })) as JWT;
    expect(out.error).toBe("RefreshTokenError");
  });

  it("sets error='RefreshTokenError' when refresh response lacks data.token", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "bad" }), { status: 200 }),
    );
    const { authOptions } = await loadModule();
    const expired = {
      accessToken: "stale",
      refreshToken: "rt",
      expiresAt: Math.floor(Date.now() / 1000) - 1,
      user: makeFlaskUser() as unknown as NormalizedAuthUser,
    } as JWT;
    const out = (await authOptions.callbacks!.jwt!({
      token: expired,
      user: undefined,
      account: null,
    })) as JWT;
    expect(out.error).toBe("RefreshTokenError");
  });

  it("preserves old refreshToken when Flask refresh response omits a new one", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({ data: { token: "fresh" } }), // no refresh_token
        { status: 200 },
      ),
    );
    const { authOptions } = await loadModule();
    const expired = {
      accessToken: "stale",
      refreshToken: "old-refresh",
      expiresAt: Math.floor(Date.now() / 1000) - 1,
      user: makeFlaskUser() as unknown as NormalizedAuthUser,
    } as JWT;
    const out = (await authOptions.callbacks!.jwt!({
      token: expired,
      user: undefined,
      account: null,
    })) as JWT;
    expect(out.refreshToken).toBe("old-refresh");
  });
});

describe("authOptions.callbacks.session", () => {
  it("copies user + expiresAt from JWT — DOES NOT expose refreshToken", async () => {
    const { authOptions } = await loadModule();
    const token = {
      accessToken: "access",
      refreshToken: "SECRET-refresh",
      expiresAt: 1234567890,
      user: makeFlaskUser() as unknown as NormalizedAuthUser,
    } as JWT;
    const out = await authOptions.callbacks!.session!({
      session: { user: undefined, expires: "" } as unknown as Parameters<typeof authOptions.callbacks.session>[0]["session"],
      token,
      user: undefined as unknown as Parameters<typeof authOptions.callbacks.session>[0]["user"],
      newSession: undefined,
      trigger: "update",
    });
    const session = out as { user?: unknown; expiresAt?: number; refreshToken?: string };
    expect(session.user).toEqual(token.user);
    expect(session.expiresAt).toBe(1234567890);
    // CRITICAL: refresh token must never reach the client.
    expect(JSON.stringify(out)).not.toContain("SECRET-refresh");
  });

  it("propagates error flag when token has one (RefreshTokenError)", async () => {
    const { authOptions } = await loadModule();
    const token = {
      accessToken: "access",
      refreshToken: "rt",
      expiresAt: 1,
      user: makeFlaskUser() as unknown as NormalizedAuthUser,
      error: "RefreshTokenError",
    } as JWT;
    const out = (await authOptions.callbacks!.session!({
      session: { user: undefined, expires: "" } as unknown as Parameters<typeof authOptions.callbacks.session>[0]["session"],
      token,
      user: undefined as unknown as Parameters<typeof authOptions.callbacks.session>[0]["user"],
      newSession: undefined,
      trigger: "update",
    })) as { error?: string };
    expect(out.error).toBe("RefreshTokenError");
  });
});

// ---------------------------------------------------------------------------
// signOut event
// ---------------------------------------------------------------------------

describe("authOptions.events.signOut", () => {
  it("calls Flask /api/auth/logout with bearer token", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));
    const { authOptions } = await loadModule();
    await authOptions.events!.signOut!({
      token: { accessToken: "ax-tok-1" } as JWT,
      session: undefined as unknown as Parameters<typeof authOptions.events.signOut>[0]["session"],
    });
    expect(fetchSpy).toHaveBeenCalled();
    const [, init] = fetchSpy.mock.calls[0]!;
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: "Bearer ax-tok-1",
    });
  });

  it("swallows errors from Flask logout (local session destruction must still proceed)", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("flask down"));
    const { authOptions } = await loadModule();
    await expect(
      authOptions.events!.signOut!({
        token: { accessToken: "ax" } as JWT,
        session: undefined as unknown as Parameters<typeof authOptions.events.signOut>[0]["session"],
      }),
    ).resolves.toBeUndefined();
  });

  it("does not call Flask when there is no accessToken on the token", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { authOptions } = await loadModule();
    await authOptions.events!.signOut!({
      token: {} as JWT,
      session: undefined as unknown as Parameters<typeof authOptions.events.signOut>[0]["session"],
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Mock-mode refresh path (covers the AUTH_MOCK_MODE branch in refreshAccessToken)
// ---------------------------------------------------------------------------

describe("refreshAccessToken — mock mode branch", () => {
  it("returns a fresh mock token without calling Flask", async () => {
    // Re-load WITH mock mode on
    vi.resetModules();
    Object.assign(process.env, { NODE_ENV: "development" });
    delete process.env.AUTH_MOCK_MODE; // mock mode default
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { authOptions } = await import("./options");
    const expired = {
      accessToken: "old",
      refreshToken: "rt",
      expiresAt: Math.floor(Date.now() / 1000) - 10,
      user: makeFlaskUser() as unknown as NormalizedAuthUser,
    } as JWT;
    const out = (await authOptions.callbacks!.jwt!({
      token: expired,
      user: undefined,
      account: null,
    })) as JWT;
    expect(out.accessToken).toBe("mock-access-token");
    expect(out.error).toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
